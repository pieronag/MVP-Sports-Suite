"use client";
import { GlowCard, SectionPill, SegmentedTabs } from "@/components/player/ui";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft, Trophy, Target, Activity, Zap, Shield, Crown, Medal, Clock,
  Ruler, Weight, Footprints, Sparkles, TrendingUp, Calendar, Drill, CircleDot,
  Sword, Star, Info, AlertCircle, Users, Crosshair, ShieldCheck, Sun, Moon,
  Heart, Share2, Timer, Plus, Minus, MapPin, ChevronDown
} from "@/components/player/icons";
import { BADGE_ICONS } from "@/components/player/badgeIcons";
import { doc, getDoc, onSnapshot, updateDoc, addDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from "@/services/firebase";
import { cached } from "@/services/player/cache";
import { usePlayer } from "@/context/PlayerContext";
import { gamificationService } from "@/services/player/gamificationService";
import { bookingService, Booking } from "@/services/player/bookingService";
import { userService } from "@/services/player/userService";
import { teamService } from "@/services/player/teamService";

const RANGOS_CONFIG = [
  { id: 'bronze', name: 'Bronce', min: 0, color: '#cd7f32' },
  { id: 'silver', name: 'Plata', min: 1000, color: '#94A3B8' },
  { id: 'gold', name: 'Oro', min: 3000, color: '#f59e0b' },
  { id: 'platinum', name: 'Platino', min: 6000, color: '#3b82f6' },
  { id: 'diamond', name: 'Diamante', min: 10000, color: '#0ea5e9' },
  { id: 'elite', name: 'Elite', min: 15000, color: '#10b981' },
  { id: 'legend', name: 'Leyenda', min: 25000, color: '#8b5cf6' }
];

const DEFAULT_BADGE_XP: Record<string, number> = { bronze: 200, silver: 500, gold: 1000 };
const BADGE_INFO: Record<string, { name: string }> = {
  scorer: { name: 'Artillero' }, playmaker: { name: 'Maestro' }, defender: { name: 'Muralla' },
  wins: { name: 'Ganador' }, mvp: { name: 'Estrella' }, experience: { name: 'Leyenda' },
  multi_sport: { name: 'Atleta Total' }, captaincy: { name: 'Capitán' }, comeback: { name: 'Ave Fénix' },
  precision: { name: 'Francotirador' }, clutch: { name: 'Clutch' }, tournaments: { name: 'Competidor' },
  invictus: { name: 'Invicto' }, rivalry: { name: 'Verdugo' }, morning_player: { name: 'Madrugador' },
  night_player: { name: 'Nocturno' }, loyal: { name: 'Fiel' }, weekend_warrior: { name: 'Guerrero FDS' },
  stamina: { name: 'Motor' }, social: { name: 'Sociable' },
};
const BADGE_DESCRIPTIONS: Record<string, string> = {
  scorer: 'Goles anotados', playmaker: 'Asistencias', defender: 'Valla invicta',
  wins: 'Victorias', mvp: 'Premios MVP', experience: 'Partidos jugados',
  multi_sport: 'Deportes probados', captaincy: 'Capitán', comeback: 'Remontadas',
  precision: 'Precisión', clutch: 'Goles decisivos', tournaments: 'Torneos',
  invictus: 'Racha invicta', rivalry: 'Clásicos ganados', morning_player: 'Matutino',
  night_player: 'Nocturno', loyal: 'Meses fidelidad', weekend_warrior: 'Finde',
  stamina: 'Minutos', social: 'Invitados'
};



export default function EstadisticasPage() {
  const router = useRouter();
  const { profile, theme } = usePlayer();
  const isDark = theme === 'dark';
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [gamification, setGamification] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'partidos' | 'logros'>('partidos');
  const [visibleCount, setVisibleCount] = useState(10);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [showTeamDetail, setShowTeamDetail] = useState(false);
  const [userTeams, setUserTeams] = useState<any[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [personalGoalsInput, setPersonalGoalsInput] = useState(0);
  const [userIsMVPInput, setUserIsMVPInput] = useState(false);
  const [memberGoals, setMemberGoals] = useState<Record<string, number>>({});
  const [teamAssignments, setTeamAssignments] = useState<Record<string, 'A' | 'B' | 'N'>>({});
  const [savingStats, setSavingStats] = useState(false);
  const [matchOutcomeInput, setMatchOutcomeInput] = useState<'win' | 'loss' | 'draw'>('win');
  const [mvpUserIdInput, setMvpUserIdInput] = useState<string | null>(null);
  const [memberAssists, setMemberAssists] = useState<Record<string, number>>({});
  const [winnerTeamInput, setWinnerTeamInput] = useState<'A' | 'B' | 'draw'>('A');

  useEffect(() => { setVisibleCount(10); }, [activeTab]);

  const loadData = useCallback(async (isRefreshing = false) => {
    const uid = (profile as any)?.uid;
    if (!uid) { setLoading(false); return; }
    if (!isRefreshing) setLoading(true);
    try { const data = await bookingService.getUserBookings(uid); setBookings(data); }
    catch (error) { console.error(error); }
    finally { setLoading(false); }
  }, [profile]);

  useEffect(() => { if (profile) loadData(); }, [profile, loadData]);
  useEffect(() => {
    // Lectura única con caché (los ajustes de XP casi nunca cambian; no hace falta un listener en vivo)
    cached('settings-global', 10 * 60_000, () => getDoc(doc(db, 'settings', 'global')))
      .then((s) => { if (s.exists()) { const d: any = s.data(); setGamification({ ...d.gamification, badges: d.badges || d.gamification?.badges || {} }); } })
      .catch(() => {});
  }, []);

  const [autoOpened, setAutoOpened] = useState(false);
  useEffect(() => {
    if (autoOpened || loading || typeof window === 'undefined') return;
    const id = new URLSearchParams(window.location.search).get('registrar');
    if (!id) return;
    const b: any = bookings.find((x: any) => x.id === id);
    if (b) { setAutoOpened(true); handleOpenStatsModal({ ...b, id: b.id }); }
  }, [bookings, loading, autoOpened]);

  const handleLoadTeamMembers = async (teamId: string, teamsList?: any[], existingStats?: any, existingAssignments?: any, existingAssists?: any) => {
    setLoadingMembers(true);
    try {
      const currentTeams = teamsList || userTeams;
      const selectedTeam = currentTeams.find((t: any) => t.id === teamId);
      if (selectedTeam) {
        const members: string[] = selectedTeam.members || [];
        const loadedMembers = [];
        for (const memberId of members) {
          const profileData = await userService.getUserProfile(memberId);
          loadedMembers.push({ uid: memberId, displayName: profileData?.displayName || 'Compañero' });
        }
        setTeamMembers(loadedMembers);
        const initialGoals = { ...existingStats };
        const initialAssists = { ...existingAssists };
        const initialAssignments = { ...existingAssignments };
        loadedMembers.forEach((m: any) => {
          if (initialGoals[m.uid] === undefined) initialGoals[m.uid] = 0;
          if (initialAssists[m.uid] === undefined) initialAssists[m.uid] = 0;
          if (initialAssignments[m.uid] === undefined) initialAssignments[m.uid] = (m.uid === (profile as any)?.uid ? 'A' as const : 'N' as const);
        });
        setMemberGoals(initialGoals); setMemberAssists(initialAssists); setTeamAssignments(initialAssignments);
      }
    } catch (error) { console.error(error); }
    finally { setLoadingMembers(false); }
  };

  const handleOpenStatsModal = async (match: any = null) => {
    setSelectedMatch(match); setPersonalGoalsInput(match ? (match.goals || 0) : 0);
    setUserIsMVPInput(match ? (match.isMVP || false) : false);
    setMatchOutcomeInput(match ? (match.isWin === true ? 'win' : (match.isWin === false ? 'loss' : 'draw')) : 'win');
    setMvpUserIdInput(match ? (match.mvpUserId || (match.isMVP ? (profile as any)?.uid : null)) : null);
    setSelectedTeamId(match ? (match.selectedTeamId || '') : '');
    setMemberGoals(match ? (match.teamStats || {}) : {});
    setMemberAssists(match ? (match.teamAssists || {}) : {});
    setWinnerTeamInput(match ? (match.winnerTeam || 'A') : 'A');
    setTeamAssignments(match ? (match.teamAssignments || {}) : {});
    setTeamMembers([]); setShowConfirmModal(false); setShowTeamDetail(!!(match && match.selectedTeamId)); setShowStatsModal(true);
    const uid = (profile as any)?.uid;
    if (uid) {
      try {
        const teams = await teamService.getUserTeams(uid); setUserTeams(teams);
        if (match && match.selectedTeamId) { await handleLoadTeamMembers(match.selectedTeamId, teams, match.teamStats || {}, match.teamAssignments || {}, match.teamAssists || {}); }
        // Modo rápido por defecto: el detalle del equipo es opcional
      } catch (error) { console.error(error); }
    }
  };

  const executeSaveMatchStats = async () => {
    setShowConfirmModal(false); setSavingStats(true);
    try {
      const computedNames: Record<string, string> = {};
      teamMembers.forEach(m => { computedNames[m.uid] = m.displayName; });
      let scoreA = 0, scoreB = 0;
      Object.entries(memberGoals).forEach(([uid, g]) => { if (teamAssignments[uid] === 'A') scoreA += g; if (teamAssignments[uid] === 'B') scoreB += g; });
      const uid = (profile as any)?.uid;
      let userGoals = personalGoalsInput;
      if (uid && memberGoals[uid] !== undefined) userGoals = memberGoals[uid];
      let userAssists = 0;
      if (uid && memberAssists[uid] !== undefined) userAssists = memberAssists[uid];
      const teamObj = userTeams.find(t => t.id === selectedTeamId);
      const teamName = teamObj ? teamObj.name : 'Mi Equipo';
      const matchSport = selectedMatch?.sport || 'futbol';
      const isScorelessSport = ['padel', 'pádel', 'tenis', 'tennis', 'basket', 'básquet', 'basquet'].some(s => matchSport.toLowerCase().includes(s));
      let activeUserOutcome = matchOutcomeInput;
      if (isScorelessSport && selectedTeamId) {
        if (winnerTeamInput === 'draw') { activeUserOutcome = 'draw'; }
        else { const activeUserAssignment = teamAssignments[uid || ''] || 'A'; activeUserOutcome = (activeUserAssignment === 'N') ? 'draw' : (winnerTeamInput === activeUserAssignment ? 'win' : 'loss'); }
      }
      const isWin = activeUserOutcome === 'win';
      const participantIds = Object.keys(teamAssignments).filter(u => teamAssignments[u] && teamAssignments[u] !== 'N');
      const matchData: any = {
        goals: userGoals, assists: userAssists, isMVP: mvpUserIdInput === uid, mvpUserId: mvpUserIdInput,
        matchOutcome: activeUserOutcome, selectedTeamId, teamStats: memberGoals, teamAssists: memberAssists,
        teamAssignments, teamMemberNames: computedNames, participantIds, scoreA, scoreB, winnerTeam: winnerTeamInput, isWin
      };
      if (selectedMatch?.id) { await updateDoc(doc(db, 'bookings', selectedMatch.id), matchData); }
      else if (uid) { await addDoc(collection(db, 'bookings'), { ...matchData, userId: uid, status: 'completed', date: new Date(), isInternalMatch: true, tenantName: `PARTIDO INTERNO: ${teamName}` }); }
      if (uid) {
        if (typeof (userService as any).awardInternalMatchXpAndStats === 'function') { await (userService as any).awardInternalMatchXpAndStats(teamAssignments, memberGoals, memberAssists, scoreA, scoreB, mvpUserIdInput, uid, activeUserOutcome); }
      }
      setShowStatsModal(false); await loadData(true);
    } catch (error) { console.error(error); }
    finally { setSavingStats(false); }
  };

  const userProfile = profile as any;
  const analytics = useMemo(() => {
    const puntosTotales = userProfile?.xp || 0;
    const tiersFromSettings = gamification?.tiers;
    // Mismos 7 rangos que Inicio y Perfil (gamificationService.calculateTier)
    const t = tiersFromSettings || {};
    const rankConfig = RANGOS_CONFIG.map((r) => ({ ...r, min: Number((t as any)[r.id] ?? r.min) || r.min }));
    rankConfig[0].min = Number((t as any).bronze) || 0;
    let rangoActual = rankConfig[0];
    let siguienteRango = rankConfig[1];
    for (let i = rankConfig.length - 1; i >= 0; i--) {
      if (puntosTotales >= rankConfig[i].min) { rangoActual = rankConfig[i]; siguienteRango = rankConfig[i + 1] || rankConfig[i]; break; }
    }
    const puntosEnEsteRango = puntosTotales - rangoActual.min;
    const puntosNecesarios = siguienteRango.min - rangoActual.min;
    const progreso = siguienteRango.id === rangoActual.id ? 100 : Math.round((puntosEnEsteRango / puntosNecesarios) * 100);
    const savedBadges = (profile as any)?.badges as any[] || [];
    const stats = (profile as any)?.stats || {};
    const rawData = profile as any;
    let rawJoined = new Date();
    if (rawData?.createdAt?.toDate) rawJoined = rawData.createdAt.toDate();
    else if (rawData?.createdAt?.seconds) rawJoined = new Date(rawData.createdAt.seconds * 1000);
    else if (rawData?.createdAt) rawJoined = new Date(rawData.createdAt);
    const daysActive = Math.max(1, (new Date().getTime() - rawJoined.getTime()) / (1000 * 60 * 60 * 24));
    const statsMap: Record<string, number> = {
      scorer: stats.goals || 0, playmaker: stats.assists || 0, defender: stats.clean_sheets || 0,
      wins: stats.won || 0, mvp: stats.mvps || stats.mvp || 0, experience: stats.played || 0,
      multi_sport: stats.sports_played || 1, captaincy: stats.captain_matches || 0,
      comeback: stats.comebacks || 0, precision: stats.precision_matches || 0,
      clutch: stats.clutch_goals || 0, tournaments: stats.tournaments_played || 0,
      invictus: stats.longest_win_streak || 0, rivalry: stats.rivalries_won || 0,
      morning_player: stats.morning_matches || 0, night_player: stats.night_matches || 0,
      loyal: Math.floor(daysActive / 30), weekend_warrior: stats.weekend_matches || 0,
      stamina: stats.minutes_played || (stats.played || 0) * 60, social: stats.invited_players || 0
    };
    const badgeConfigs = gamification?.badges || {};
    const computedBadgesMap = new Map<string, string>();
    const normalizeBadgeId = (id: string) => { const m: Record<string, string> = { goals: 'scorer', assists: 'playmaker', clean_sheets: 'defender', won: 'wins', played: 'experience', sports_played: 'multi_sport', loyalty: 'loyal' }; return m[id] || id; };
    savedBadges.forEach((b: any) => { if (b.tier) computedBadgesMap.set(normalizeBadgeId(b.id), b.tier); });
    const tierScores: Record<string, number> = { gold: 3, silver: 2, bronze: 1 };
    Object.keys(BADGE_INFO).forEach(id => {
      const dbKeys: Record<string, string> = { scorer: 'goals', playmaker: 'assists', defender: 'clean_sheets', wins: 'won', experience: 'played', multi_sport: 'sports_played', loyal: 'loyalty' };
      const dbKey = dbKeys[id] || id;
      const config = badgeConfigs[id] || badgeConfigs[dbKey] || { bronze: 5, silver: 15, gold: 30 };
      const userVal = statsMap[id] || 0;
      let computedTier: string | null = null;
      if (userVal > 0) {
        const goldVal = Number(config.gold || 0);
        const silverVal = Number(config.silver || 0);
        const bronzeVal = Number(config.bronze || 0);
        if (goldVal > 0 && userVal >= goldVal) computedTier = 'gold';
        else if (silverVal > 0 && userVal >= silverVal) computedTier = 'silver';
        else if (bronzeVal > 0 && userVal >= bronzeVal) computedTier = 'bronze';
      }
      if (computedTier) {
        const existingTier = computedBadgesMap.get(id);
        if (!existingTier || tierScores[computedTier] > tierScores[existingTier]) computedBadgesMap.set(id, computedTier);
      } else { computedBadgesMap.delete(id); }
    });
    const finalBadges = Array.from(computedBadgesMap.entries()).map(([id, tier]) => ({ id, tier })).sort((a, b) => (tierScores[b.tier] || 0) - (tierScores[a.tier] || 0));
    const badgeHistory = finalBadges.map((badge: any, idx: number) => {
      const info = BADGE_INFO[badge.id] || { name: 'Logro' };
      const xpBonus = (gamification?.badgeXpValues || DEFAULT_BADGE_XP)[badge.tier] || 0;
      const tn: Record<string, string> = { gold: 'ORO', silver: 'PLATA', bronze: 'BRONCE' };
      const tc: Record<string, string> = { gold: '#fbbf24', silver: '#94a3b8', bronze: '#b45309' };
      const dateObj = userProfile?.lastBulkSync ? new Date(userProfile.lastBulkSync) : new Date();
      dateObj.setSeconds(dateObj.getSeconds() - idx * 60);
      return { isBadge: true, id: badge.id, badgeName: info.name, badgeTier: tn[badge.tier] || 'BRONCE', badgeColor: tc[badge.tier] || '#b45309', badgeDesc: BADGE_DESCRIPTIONS[badge.id] || 'Hito superado', xpBonus, dateObj };
    });
    // Hora de término ya pasada (inicio + 1 h; los bloques antes de las 06:00 son del día siguiente)
    const hasEnded = (b: any) => {
      const raw = b.date; const d = raw?.toDate ? raw.toDate() : raw?.seconds ? new Date(raw.seconds * 1000) : /^\d{4}-\d{2}-\d{2}$/.test(String(raw)) ? new Date(`${raw}T12:00:00`) : raw ? new Date(raw) : null;
      if (!d || isNaN(d.getTime())) return false;
      const [h, m] = String(b.startTime || '00:00').split(':').map(Number);
      const st = new Date(d); st.setHours(h || 0, m || 0, 0, 0); if ((h || 0) < 6) st.setDate(st.getDate() + 1);
      return st.getTime() + 60 * 60_000 < Date.now();
    };
    const matchesList = bookings.filter(b => {
      const isCompleted = b.status === 'completed' || (b as any).checkOut === true || (b.status !== 'cancelled' && hasEnded(b));
      const isNoShow = b.status === 'no-show' || b.paymentStatus === 'no-show' || b.noShow === true;
      if (b.status === 'cancelled' && !isNoShow) return false;
      return isCompleted || isNoShow;
    }).map(b => {
      const bData = b as any;
      const dateObj = b.date?.seconds ? new Date(b.date.seconds * 1000) : (b.date?.toDate ? b.date.toDate() : new Date());
      const isCompleted = b.status === 'completed' || bData.checkOut === true || (b.status !== 'cancelled' && hasEnded(b));
      const isNoShow = b.status === 'no-show' || b.paymentStatus === 'no-show' || bData.noShow === true;
      let ds = 'pending';
      if (isNoShow) ds = 'no-show'; else if (isCompleted) ds = 'completed'; else if (b.status === 'confirmed') ds = 'confirmed'; else if (b.status === 'cancelled') ds = 'cancelled'; else if (b.status === 'pending') ds = 'pending';
      const isWin = bData.isWin === true && isCompleted;
      const isLoss = bData.isWin === false && isCompleted;
      let rt = 'EN PROCESO', rtp = 'process';
      if (isWin) { rt = 'VICTORIA'; rtp = 'win'; } else if (isLoss) { rt = 'DERROTA'; rtp = 'loss'; } else if (ds === 'completed') { rt = 'FINALIZADO'; rtp = 'completed'; } else if (ds === 'no-show') { rt = 'INASISTENCIA'; rtp = 'no-show'; } else if (ds === 'cancelled') { rt = 'CANCELADO'; rtp = 'cancelled'; } else if (ds === 'confirmed') { rt = 'CONFIRMADO'; rtp = 'confirmed'; } else if (ds === 'pending') { rt = 'PENDIENTE'; rtp = 'pending'; }
      let matchXP: number | null = null;
      if (ds === 'no-show') { matchXP = -(gamification?.xpPerNoShow || 50); } else if (isCompleted && ds !== 'cancelled') {
        matchXP = 0; const sportKey = b.sport ? b.sport.toLowerCase() : 'futbol';
        const overrides = { winXP: gamification?.xpPerWin || 150, lossXP: gamification?.xpPerLoss || 50, countGoals: true, countAssists: true, goalXP: gamification?.xpPerGoal || 25, assistXP: gamification?.xpPerAssist || 15, ...(gamification?.sportsOverrides?.[sportKey] || {}) };
        matchXP += (gamification?.xpPerMatch || 100); if (bData.checkIn) matchXP += (gamification?.xpPerCheckin || 50);
        if (isWin) matchXP += overrides.winXP; else if (isLoss) matchXP -= overrides.lossXP;
        if (overrides.countGoals && bData.goals) matchXP += bData.goals * (overrides.goalXP !== undefined ? overrides.goalXP : 25);
        if (overrides.countAssists && bData.assists) matchXP += bData.assists * (overrides.assistXP !== undefined ? overrides.assistXP : 15);
        if (bData.isMVP) matchXP += (gamification?.xpPerMvp || 200);
      }
      const perf: { text: string; color: string }[] = [];
      if (bData.goals > 0) perf.push({ text: `${bData.goals} GOLES`, color: '#ef4444' });
      if (bData.isMVP) perf.push({ text: 'MVP', color: '#f59e0b' });
      return { ...b, bData, dateObj, displayStatus: ds, resultText: rt, resultType: rtp, matchXP, performance: perf, formattedTime: b.startTime || '--:--' };
    });
    const bitacora = [...matchesList, ...badgeHistory].sort((a: any, b: any) => b.dateObj.getTime() - a.dateObj.getTime());
    return {
      nivel: userProfile?.ovr || 0, puntosTotales, progreso, rangoActual, siguienteRango, bitacora,
      checkinsCount: matchesList.filter((m: any) => (m as any).bData?.checkIn).length,
      noshowsCount: matchesList.filter((m: any) => m.displayStatus === 'no-show').length,
      partidosTotales: matchesList.filter((m: any) => m.displayStatus === 'completed').length
    };
  }, [bookings, profile, gamification]);

  const rc: Record<string, { bg: string; txt: string }> = {
    win: { bg: 'rgba(16,185,129,0.1)', txt: '#10b981' },
    loss: { bg: 'rgba(244,63,94,0.1)', txt: '#f43f5e' },
    completed: { bg: 'rgba(148,163,184,0.1)', txt: '#94a3b8' },
    'no-show': { bg: 'rgba(239,68,68,0.1)', txt: '#ef4444' },
    cancelled: { bg: 'rgba(148,163,184,0.1)', txt: '#94a3b8' },
    confirmed: { bg: 'rgba(59,130,246,0.1)', txt: '#3b82f6' },
    pending: { bg: 'rgba(245,158,11,0.1)', txt: '#f59e0b' },
    process: { bg: 'rgba(99,102,241,0.1)', txt: '#6366f1' },
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center gap-4 ${isDark ? "bg-[#020611]" : "bg-[#F8FAFC]"}`}>
        <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-emerald-400 text-[11px] font-semibold tracking-[0.06em] uppercase animate-pulse">Cargando</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? "bg-[#020611]" : "bg-[#F8FAFC]"}`}>
      {/* Header */}
      <div className={`sticky top-0 z-20 px-5 pt-12 pb-4 flex items-center justify-between gap-3 ${isDark ? "bg-[#020611]" : "bg-[#F8FAFC]"}`}>
        <button aria-label="Volver" onClick={() => router.back()} className={`w-10 h-10 rounded-md flex items-center justify-center transition-all active:scale-90 ${isDark ? "bg-white/6 hover:bg-white/10" : "bg-slate-100 hover:bg-slate-200"}`}>
          <ChevronLeft size={20} className="text-emerald-500" />
        </button>
        <h1 className="font-heading font-black text-[15px] tracking-tight uppercase flex-1 text-center">Estadísticas</h1>
        <div className="w-10" />
      </div>

      <div className="px-5 pt-3 pb-8 space-y-5">
        {/* Rank Progress */}
        <SectionPill label="Progreso" />
        <GlowCard isDark={isDark}>
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className={`text-[11px] font-semibold uppercase tracking-wide ${isDark ? "text-slate-500" : "text-slate-400"}`}>Rango Actual</p>
                <p className="text-[16px] font-semibold" style={{ color: analytics.rangoActual.color }}>{analytics.rangoActual.name}</p>
                <div className="mt-2 px-3 py-1.5 rounded-md border self-start inline-block" style={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0' }}>
                  <span className={`text-[11px] font-semibold ${isDark ? "text-slate-300" : "text-slate-700"}`}>OVR: {analytics.nivel}</span>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-[11px] font-semibold uppercase tracking-wide ${isDark ? "text-slate-500" : "text-slate-400"}`}>XP Totales</p>
                <p className={`text-[16px] font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{analytics.puntosTotales.toLocaleString()}</p>
                <p className="text-emerald-500 text-[11px] font-semibold tracking-wide uppercase">XP acumulados</p>
              </div>
            </div>
            <div className="mt-5">
              <div className="flex justify-between mb-2">
                <span className={`text-[11px] font-medium ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                  {analytics.rangoActual.id === analytics.siguienteRango.id ? 'NIVEL MÁXIMO' : `SIGUIENTE: ${analytics.siguienteRango.name}`}
                </span>
                <span className={`text-[11px] font-semibold ${isDark ? "text-slate-300" : "text-slate-700"}`}>{analytics.progreso}%</span>
              </div>
              <div className={`h-2 rounded-full overflow-hidden ${isDark ? "bg-white/6" : "bg-slate-100"}`}>
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${analytics.progreso}%`, background: `linear-gradient(90deg, ${analytics.rangoActual.color}, ${analytics.rangoActual.color}80)` }} />
              </div>
            </div>
          </div>
        </GlowCard>

        {/* Physical Stats */}
        <SectionPill label="Datos Físicos" />
        <div className="flex gap-3">
          {[
            { label: 'ALTURA', value: userProfile?.height ? `${userProfile.height} CM` : '---', icon: Ruler },
            { label: 'PESO', value: userProfile?.weight ? `${userProfile.weight} KG` : '---', icon: Weight },
            { label: 'PIE', value: userProfile?.dominantFoot || '---', icon: Footprints }
          ].map((f) => (
            <GlowCard key={f.label} isDark={isDark} className="flex-1">
              <div className="p-4 flex flex-col items-center text-center">
                <div className="w-9 h-9 rounded-md flex items-center justify-center mb-2.5 bg-emerald-500/10">
                  <f.icon size={18} className="text-emerald-500" />
                </div>
                <p className={`text-[13px] font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{f.value}</p>
                <p className={`text-[11px] font-semibold uppercase tracking-wide mt-0.5 ${isDark ? "text-slate-500" : "text-slate-400"}`}>{f.label}</p>
              </div>
            </GlowCard>
          ))}
        </div>

        {/* XP Rules */}
        <SectionPill label="Cómo ganar XP" />
        <GlowCard isDark={isDark}>
          <div className="p-5 space-y-4">
            {[
              { icon: Activity, label: 'Por jugar partido', val: `+${gamification?.xpPerMatch || 100}` },
              { icon: Zap, label: 'Asistencia (Check-In)', val: `+${gamification?.xpPerCheckin || 50}` },
              { icon: Star, label: 'Por ser MVP', val: `+${gamification?.xpPerMvp || 200}` },
              { icon: AlertCircle, label: 'Inasistencia (No-Show)', val: `-${gamification?.xpPerNoShow || 150}`, accent: true },
            ].map((r) => (
              <div key={r.label} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-md flex items-center justify-center ${isDark ? "bg-white/4" : "bg-slate-100"}`}>
                    <r.icon size={16} className={isDark ? "text-slate-400" : "text-slate-500"} />
                  </div>
                  <span className={`text-[13px] font-medium ${isDark ? "text-slate-200" : "text-slate-800"}`}>{r.label}</span>
                </div>
                <span className={`px-3 py-1 rounded-md text-[13px] font-semibold ${r.accent ? "text-red-400 bg-red-500/10" : "text-emerald-500 bg-emerald-500/10"}`}>{r.val}</span>
              </div>
            ))}
            <div className={`p-4 rounded-md flex items-center gap-3 ${isDark ? "bg-white/2" : "bg-slate-50"}`}>
              <Info size={14} className="text-emerald-500 shrink-0" />
              <p className={`text-[11px] font-medium ${isDark ? "text-slate-500" : "text-slate-400"}`}>Tus XP se actualizan automáticamente al finalizar el partido.</p>
            </div>
          </div>
        </GlowCard>

        <SegmentedTabs isDark={isDark} value={activeTab} onChange={setActiveTab} options={[
          { id: 'partidos', label: `Partidos (${analytics.bitacora.filter((h: any) => !h.isBadge).length})` },
          { id: 'logros', label: `Logros (${analytics.bitacora.filter((h: any) => h.isBadge).length})` },
        ]} />

        {activeTab === 'partidos' && (
          <button onClick={() => handleOpenStatsModal(null)}
            className="w-full h-11 rounded-md bg-emerald-500 text-white text-[13px] font-semibold flex items-center justify-center gap-2 active:scale-[0.98]">
            <Plus size={16} /> Registrar partido
          </button>
        )}

        {/* Feed */}
        <GlowCard isDark={isDark}>
          <div className="p-5">
            {(() => {
              const filtered = analytics.bitacora.filter((item: any) => activeTab === 'partidos' ? !item.isBadge : item.isBadge);
              if (activeTab === 'logros') { const to: Record<string, number> = { ORO: 3, PLATA: 2, BRONCE: 1 }; filtered.sort((a: any, b: any) => (to[b.badgeTier] || 0) - (to[a.badgeTier] || 0)); }
              if (filtered.length === 0) return (
                <div className="py-12 flex flex-col items-center">
                  <TrendingUp size={28} className={isDark ? "text-slate-600" : "text-slate-300"} />
                  <p className={`text-[13px] font-medium mt-3 text-center ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                    {activeTab === 'partidos' ? 'Sin partidos registrados' : 'Sin logros conseguidos'}
                  </p>
                </div>
              );
              const seen = new Set<string>();
              return (
                <div className="space-y-3">
                  {filtered.slice(0, visibleCount).map((item: any) => {
                    const uniqueKey = item.isBadge ? `badge-${item.id}` : `match-${item.id || item.bData?.id}`;
                    if (seen.has(uniqueKey)) return null;
                    seen.add(uniqueKey);
                    if (item.isBadge) {
                      const BIcon = BADGE_ICONS[item.id] || Trophy;
                      return (
                        <div key={uniqueKey} className={`rounded-md p-4 border`} style={{ borderColor: `${item.badgeColor}30`, backgroundColor: `${item.badgeColor}08` }}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="w-11 h-11 rounded-md flex items-center justify-center shrink-0" style={{ backgroundColor: `${item.badgeColor}15`, border: `1px solid ${item.badgeColor}25` }}>
                                <BIcon size={20} color={item.badgeColor} strokeWidth={1.25} />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={`text-[13px] font-semibold truncate ${isDark ? "text-slate-100" : "text-slate-900"}`}>{item.badgeName}</span>
                                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide uppercase" style={{ backgroundColor: `${item.badgeColor}20`, color: item.badgeColor }}>{item.badgeTier}</span>
                                </div>
                                <p className={`text-[11px] font-medium mt-0.5 ${isDark ? "text-slate-500" : "text-slate-400"}`}>{item.badgeDesc}</p>
                              </div>
                            </div>
                            <div className="text-right shrink-0 ml-3">
                              <div className="px-3 py-2 rounded-md text-center border" style={{ borderColor: `${item.badgeColor}25` }}>
                                <p className="text-[15px] font-bold" style={{ color: item.badgeColor }}>+{item.xpBonus}</p>
                                <p className="text-[11px] font-semibold tracking-wide uppercase" style={{ color: item.badgeColor }}>XP</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    const cs = rc[item.resultType] || rc.process;
                    return (
                      <div key={uniqueKey} className={`rounded-md p-4 border`} style={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0' }}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="px-2.5 py-1 rounded text-[11px] font-semibold tracking-wide uppercase" style={{ backgroundColor: cs.bg, color: cs.txt }}>{item.resultText}</span>
                              <span className={`text-[11px] font-medium ${isDark ? "text-slate-500" : "text-slate-400"}`}>{item.formattedTime}</span>
                            </div>
                            <p className={`text-[13px] font-semibold truncate ${isDark ? "text-slate-100" : "text-slate-900"}`}>{item.tenantName || item.bData?.tenantName || 'Partido'}</p>
                            <p className={`text-[11px] font-medium ${isDark ? "text-slate-500" : "text-slate-400"}`}>{item.dateObj.toLocaleDateString('es-CL')} • {item.sport || (item.bData?.sport) || 'FÚTBOL'}</p>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {(item.performance || []).map((perf: any) => (
                                <span key={perf.text} className="px-2.5 py-1 rounded-md text-[11px] font-semibold border" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0' }}>{perf.text}</span>
                              ))}
                            </div>
                            {item.displayStatus === 'completed' && !item.bData?.teamStats && (
                              <button onClick={() => handleOpenStatsModal(item.bData ? { ...item.bData, id: item.id } : item)}
                                className="mt-3 px-4 py-2 rounded-md text-[11px] font-semibold tracking-wide bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 transition-all active:scale-[0.98]">
                                REGISTRAR RESULTADO
                              </button>
                            )}
                            {item.displayStatus === 'completed' && item.bData?.teamStats && (
                              <div className={`mt-3 px-4 py-2 rounded-md text-center text-[11px] font-medium ${isDark ? "bg-white/2 text-slate-500" : "bg-slate-50 text-slate-400"}`}>
                                Estadísticas registradas
                              </div>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            {item.resultType === 'cancelled' ? (
                              <div className={`px-3 py-2 rounded-md text-center border ${isDark ? "bg-white/3" : "bg-slate-50"}`} style={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0' }}>
                                <p className={`text-[13px] font-semibold ${isDark ? "text-slate-500" : "text-slate-400"}`}>0 XP</p>
                              </div>
                            ) : item.matchXP !== null ? (
                              <div className={`px-3 py-2 rounded-md text-center border`} style={{ borderColor: item.matchXP >= 0 ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.2)', backgroundColor: item.matchXP >= 0 ? 'rgba(16,185,129,0.08)' : 'rgba(244,63,94,0.08)' }}>
                                <p className="text-[15px] font-bold" style={{ color: item.matchXP >= 0 ? '#10b981' : '#f43f5e' }}>{item.matchXP >= 0 ? `+${item.matchXP}` : item.matchXP}</p>
                                <p className="text-[11px] font-semibold tracking-wide uppercase" style={{ color: item.matchXP >= 0 ? '#10b981' : '#f43f5e' }}>XP</p>
                              </div>
                            ) : (
                              <p className={`text-[11px] font-medium ${isDark ? "text-slate-500" : "text-slate-400"}`}>Procesando</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {filtered.length > visibleCount && (
                    <button onClick={() => setVisibleCount(prev => prev + 10)}
                      className={`w-full h-12 rounded-md font-semibold text-[11px] uppercase tracking-wide transition-all active:scale-[0.98] ${isDark ? "bg-white/4 text-emerald-500 hover:bg-white/8" : "bg-slate-100 text-emerald-600 hover:bg-slate-200"}`}>
                      Cargar 10 más
                    </button>
                  )}
                </div>
              );
            })()}
          </div>
        </GlowCard>

        <p className={`text-center text-[11px] font-medium pt-2 ${isDark ? "text-slate-600" : "text-slate-400"}`}>MVP Sports &bull; 2026</p>
      </div>

      {/* Stats Modal */}
      {showStatsModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto" style={{ backgroundColor: '#020611' }}>
          <div className="min-h-screen p-5 pt-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-[15px] font-heading font-black uppercase ${isDark ? "text-slate-100" : "text-slate-900"}`}>{selectedMatch ? 'EDITAR' : 'REGISTRAR'} PARTIDO</h2>
              <button aria-label="Cerrar" onClick={() => setShowStatsModal(false)} className="w-9 h-9 rounded-md flex items-center justify-center bg-white/6">
                <ChevronLeft size={18} className="text-slate-400" style={{ transform: 'rotate(-90deg)' }} />
              </button>
            </div>

            {selectedMatch && (
              <GlowCard isDark={isDark} className="mb-5">
                <div className="p-4 flex items-center gap-3">
                  <div className="w-11 h-11 rounded-md flex items-center justify-center bg-emerald-500/10">
                    <MapPin size={20} className="text-emerald-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[13px] font-semibold truncate ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                      {selectedMatch.venueName || selectedMatch.tenantName || 'Recinto'}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold uppercase bg-emerald-500/10 text-emerald-500">{selectedMatch.sport || 'FÚTBOL'}</span>
                      <span className={`text-[11px] font-medium ${isDark ? "text-slate-500" : "text-slate-400"}`}>{selectedMatch.startTime || selectedMatch.time || '19:00'}</span>
                    </div>
                  </div>
                </div>
              </GlowCard>
            )}

            {(() => {
              const scoreA = Object.entries(memberGoals).reduce((s, [uid, g]) => teamAssignments[uid] === 'A' ? s + g : s, 0);
              const scoreB = Object.entries(memberGoals).reduce((s, [uid, g]) => teamAssignments[uid] === 'B' ? s + g : s, 0);
              const matchSport = selectedMatch?.sport || 'futbol';
              const isScorelessSport = ['padel', 'pádel', 'tenis', 'tennis', 'basket', 'básquet', 'basquet'].some(s => matchSport.toLowerCase().includes(s));

              return (
                <div className="space-y-5">
                  {selectedTeamId && (
                  <GlowCard isDark={isDark}>
                    <div className="p-4 flex items-center justify-center gap-6">
                      <div className="flex-1 text-center">
                        <p className="text-red-400 text-[11px] font-semibold tracking-wide uppercase mb-1">Equipo A</p>
                        {isScorelessSport ? (
                          winnerTeamInput === 'A' ? <span className="inline-block px-3 py-1 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-500">GANADOR</span> : <p className={`text-[11px] font-medium ${isDark ? "text-slate-500" : "text-slate-400"}`}>-</p>
                        ) : (
                          <p className={`text-[18px] font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{scoreA}</p>
                        )}
                      </div>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/6">
                        <span className="text-[11px] font-semibold text-slate-500">VS</span>
                      </div>
                      <div className="flex-1 text-center">
                        <p className="text-blue-400 text-[11px] font-semibold tracking-wide uppercase mb-1">Equipo B</p>
                        {isScorelessSport ? (
                          winnerTeamInput === 'B' ? <span className="inline-block px-3 py-1 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-500">GANADOR</span> : <p className={`text-[11px] font-medium ${isDark ? "text-slate-500" : "text-slate-400"}`}>-</p>
                        ) : (
                          <p className={`text-[18px] font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{scoreB}</p>
                        )}
                      </div>
                    </div>
                  </GlowCard>
                  )}

                  <GlowCard isDark={isDark}>
                    <div className={`p-4 space-y-4 ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                      <p className={`text-[11px] font-semibold uppercase tracking-wide ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                        {isScorelessSport && selectedTeamId ? 'Equipo ganador' : 'Resultado'}
                      </p>
                      <div className={`flex rounded-md p-1 gap-1 ${isDark ? "bg-white/4" : "bg-slate-100"}`}>
                        {(isScorelessSport && selectedTeamId ? [
                          { key: 'A', label: 'Equipo A' },
                          { key: 'B', label: 'Equipo B' },
                          { key: 'draw', label: 'Empate' }
                        ] : [
                          { key: 'win', label: 'Victoria' },
                          { key: 'loss', label: 'Derrota' },
                          { key: 'draw', label: 'Empate' }
                        ]).map((opt) => {
                          const sel = isScorelessSport && selectedTeamId ? winnerTeamInput : matchOutcomeInput;
                          const setter = isScorelessSport && selectedTeamId ? setWinnerTeamInput : setMatchOutcomeInput;
                          const colors: Record<string, string> = {
                            A: '#ef4444', B: '#3b82f6', win: '#10b981', loss: '#ef4444', draw: '#94a3b8'
                          };
                          return (
                            <button key={opt.key} onClick={() => setter(opt.key as any)}
                              className="flex-1 h-10 rounded-md text-[11px] font-semibold transition-all active:scale-[0.98]"
                              style={{
                                backgroundColor: sel === opt.key ? colors[opt.key] : 'transparent',
                                color: sel === opt.key ? 'white' : (isDark ? '#94a3b8' : '#64748b')
                              }}>
                              {opt.label.toUpperCase()}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </GlowCard>

                  {!selectedTeamId && (
                    <GlowCard isDark={isDark}>
                      <div className="p-4 space-y-4">
                        {!isScorelessSport && (
                          <div className="flex items-center justify-between">
                            <p className={`text-[13px] font-semibold ${isDark ? "text-slate-200" : "text-slate-800"}`}>Tus goles</p>
                            <div className="flex items-center gap-2">
                              <button aria-label="Restar gol" onClick={() => setPersonalGoalsInput((g) => Math.max(0, g - 1))} className={`w-10 h-10 rounded-md flex items-center justify-center ${isDark ? "bg-white/[0.06]" : "bg-slate-100"}`}><Minus size={16} /></button>
                              <span className={`w-8 text-center text-[18px] font-bold tabular-nums ${isDark ? "text-slate-100" : "text-slate-900"}`}>{personalGoalsInput}</span>
                              <button aria-label="Sumar gol" onClick={() => setPersonalGoalsInput((g) => g + 1)} className="w-10 h-10 rounded-md flex items-center justify-center bg-emerald-500 text-white"><Plus size={16} /></button>
                            </div>
                          </div>
                        )}
                        <button onClick={() => setMvpUserIdInput(mvpUserIdInput === (profile as any)?.uid ? null : (profile as any)?.uid)}
                          aria-pressed={mvpUserIdInput === (profile as any)?.uid}
                          className={`w-full h-11 rounded-md text-[13px] font-semibold flex items-center justify-center gap-2 border transition-all ${mvpUserIdInput === (profile as any)?.uid ? "bg-amber-500/15 border-amber-500/40 text-amber-500" : isDark ? "border-white/[0.08] text-slate-300" : "border-slate-200 text-slate-600"}`}>
                          <Star size={16} /> {mvpUserIdInput === (profile as any)?.uid ? "Fuiste el MVP" : "Fui el MVP"}
                        </button>
                      </div>
                    </GlowCard>
                  )}

                  {!showTeamDetail ? (
                    userTeams.length > 0 && (
                      <button onClick={() => setShowTeamDetail(true)} className="w-full text-[12px] font-semibold text-emerald-500 py-1">+ Agregar detalle del equipo (opcional)</button>
                    )
                  ) : (
                  <>
                  <GlowCard isDark={isDark}>
                    <div className="p-4">
                      <p className={`text-[11px] font-semibold uppercase tracking-wide mb-4 ${isDark ? "text-slate-500" : "text-slate-400"}`}>Equipo</p>
                      <div className={`flex rounded-md p-1 gap-1 ${isDark ? "bg-white/4" : "bg-slate-100"}`}>
                        {[{ key: '', label: 'Sin equipo' }, ...userTeams.map((t: any) => ({ key: t.id, label: t.name }))].map((opt) => (
                          <button key={opt.key} onClick={() => {
                            setSelectedTeamId(opt.key);
                            if (opt.key) handleLoadTeamMembers(opt.key);
                            else { setTeamMembers([]); setMemberGoals({}); setMemberAssists({}); setTeamAssignments({}); }
                          }}
                            className={`flex-1 h-10 rounded-md text-[11px] font-semibold transition-all active:scale-[0.98] ${selectedTeamId === opt.key ? "bg-emerald-500 text-white" : isDark ? "text-slate-400" : "text-slate-500"}`}>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </GlowCard>

                  {teamMembers.length > 0 && (
                    <GlowCard isDark={isDark}>
                      <div className="p-4">
                        <p className={`text-[11px] font-semibold uppercase tracking-wide mb-4 ${isDark ? "text-slate-500" : "text-slate-400"}`}>Jugadores</p>
                        <div className="flex gap-1.5 mb-4">
                          {['A', 'B', 'N'].map(t => (
                            <button key={t} onClick={() => setWinnerTeamInput(t as any)}
                              className={`flex-1 h-9 rounded-md text-[11px] font-semibold transition-all ${t === 'A' ? 'bg-red-500/15 text-red-400' : t === 'B' ? 'bg-blue-500/15 text-blue-400' : 'bg-slate-500/15 text-slate-400'}`}>
                              {t === 'A' ? 'Ganó A' : t === 'B' ? 'Ganó B' : 'Empate'}
                            </button>
                          ))}
                        </div>
                        {teamMembers.map((m: any) => (
                          <div key={m.uid} className={`flex items-center gap-3 py-2.5 border-t ${isDark ? "border-white/4" : "border-slate-100"}`}>
                            <span className={`flex-1 text-[13px] font-medium truncate ${isDark ? "text-slate-200" : "text-slate-800"}`}>{m.displayName}</span>
                            <div className="flex gap-1">
                              {(['A', 'B', 'N'] as const).map(t => (
                                <button key={t} onClick={() => {
                                  setTeamAssignments(prev => ({ ...prev, [m.uid]: t }));
                                  if (m.uid === (profile as any)?.uid) {
                                    if (t === 'N') setMatchOutcomeInput('draw');
                                  }
                                }}
                                  className={`w-8 h-8 rounded-md text-[11px] font-semibold transition-all active:scale-90 ${teamAssignments[m.uid] === t ? (t === 'A' ? 'bg-red-500/20 text-red-400' : t === 'B' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-500/20 text-slate-400') : isDark ? "bg-white/4 text-slate-500" : "bg-slate-50 text-slate-400"}`}>
                                  {t === 'A' ? 'A' : t === 'B' ? 'B' : '—'}
                                </button>
                              ))}
                            </div>
                            {!isScorelessSport && teamAssignments[m.uid] !== 'N' && (
                              <div className="flex items-center gap-1">
                                <button aria-label="Restar gol" onClick={() => setMemberGoals(prev => ({ ...prev, [m.uid]: Math.max(0, (prev[m.uid] || 0) - 1) }))} className="w-7 h-7 rounded-md flex items-center justify-center bg-white/6"><Minus size={12} className="text-slate-400" /></button>
                                <span className={`w-6 text-center text-[13px] font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{memberGoals[m.uid] || 0}</span>
                                <button aria-label="Sumar gol" onClick={() => setMemberGoals(prev => ({ ...prev, [m.uid]: (prev[m.uid] || 0) + 1 }))} className="w-7 h-7 rounded-md flex items-center justify-center bg-white/6"><Plus size={12} className="text-slate-400" /></button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </GlowCard>
                  )}
                  </>
                  )}

                  {(
                    <div className="flex gap-3">
                      <button disabled={savingStats} onClick={executeSaveMatchStats} className="flex-1 h-12 rounded-md bg-emerald-500 text-white font-semibold text-[11px] uppercase tracking-wide transition-all active:scale-[0.98]">
                        {savingStats ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" /> : 'Guardar'}
                      </button>
                    </div>
                  )}

                  {false && showConfirmModal && (
                    <GlowCard isDark={isDark}>
                      <div className="p-5 text-center">
                        <p className={`text-[15px] font-semibold mb-4 ${isDark ? "text-slate-100" : "text-slate-900"}`}>¿Confirmar estadísticas?</p>
                        <div className="flex gap-3">
                          <button onClick={() => setShowConfirmModal(false)} className={`flex-1 h-11 rounded-md text-[11px] font-semibold ${isDark ? "bg-white/6 text-slate-300" : "bg-slate-100 text-slate-700"}`}>Cancelar</button>
                          <button onClick={executeSaveMatchStats} className="flex-2 h-11 rounded-md bg-emerald-500 text-white text-[11px] font-semibold">Confirmar</button>
                        </div>
                      </div>
                    </GlowCard>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
