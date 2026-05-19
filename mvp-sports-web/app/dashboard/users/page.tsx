"use client";
import React, { useState, useEffect, useMemo } from 'react';
import {
  MagnifyingGlassIcon, NoSymbolIcon, CheckCircleIcon, TrophyIcon,
  EnvelopeIcon, UserGroupIcon, ArrowPathIcon, UserCircleIcon,
  ArrowTrendingUpIcon, SparklesIcon, ChartBarIcon,
  ArrowRightCircleIcon, PresentationChartLineIcon, FireIcon,
  AcademicCapIcon, ClockIcon, InformationCircleIcon,
  ExclamationTriangleIcon, PlusIcon, ChevronDownIcon,
  ShieldCheckIcon, XMarkIcon, ListBulletIcon, Squares2X2Icon
} from '@heroicons/react/24/outline';
import { collection, getDocs, doc, updateDoc, query, orderBy, where, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/services/firebase';
import UserProfileModal from '@/components/ui/UserProfileModal';
import UserHistoryModal from '@/components/ui/UserHistoryModal';
import { PanelGlass, TarjetaKpi, BotonAccion } from '@/components/ui/DashboardWidgets';
import BadgesConfigModal from '@/components/dashboard/BadgesConfigModal';

// --- INTERFACES ---
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  ovr: number;
  xp: number;
  tier: string;
  form: string[];
  stats: { 
    played: number; won: number; lost: number; goals: number;
    assists?: number; clean_sheets?: number; mvp?: number;
    captain_matches?: number; precision_matches?: number;
    clutch_goals?: number; interceptions?: number;
    minutes_played?: number; sports_played?: number;
    comebacks?: number; tournaments_played?: number;
    longest_win_streak?: number; rivalries_won?: number;
    morning_matches?: number; night_matches?: number;
    weekend_matches?: number; invited_players?: number;
  };
  photoURL?: string;
  team: string;
  teamList: string[];
  joined: string;
  rawJoined: Date;
  efficiency: number;
  growthRate: number;
  projections: {
    m3: number;
    m6: number;
    m12: number;
  };
  badges: any[];
  strikes?: number;
  lastStrikeAt?: any;
  raw?: any;
}

interface Toast {
  id: number;
  type: "success" | "error" | "info";
  message: string;
}

const normalizeBadgeId = (id: string): string => {
  const normMap: Record<string, string> = {
    goals: 'scorer',
    assists: 'playmaker',
    clean_sheets: 'defender',
    won: 'wins',
    played: 'experience',
    sports_played: 'multi_sport',
    loyalty: 'loyal'
  };
  return normMap[id] || id;
};

export default function Page() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [gamificationConfig, setGamificationConfig] = useState<any>(null);

  const [filter, setFilter] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [notification, setNotification] = useState<{ msg: string, type: 'success' | 'error' | 'info' } | null>(null);
  
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    msg: string;
    onConfirm: () => void;
    type: 'danger' | 'info';
  }>({ isOpen: false, title: '', msg: '', onConfirm: () => { }, type: 'info' });
  
  const [isBadgesModalOpen, setIsBadgesModalOpen] = useState(false);

  const addToast = (msg: string, type: "success" | "error" | "info" = "success") => {
    setNotification({ msg, type: type === 'info' ? 'success' : type as any });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const settingsSnap = await getDoc(doc(db, 'settings', 'global'));
      let gamification = settingsSnap.exists() ? settingsSnap.data().gamification : { tiers: { legend: 25000 } };
      if (settingsSnap.exists()) {
        const rootBadges = settingsSnap.data().badges;
        if (rootBadges) {
          gamification = { ...gamification, badges: rootBadges };
        }
      }
      setGamificationConfig(gamification);
      const maxXP = gamification?.tiers?.legend || 25000;

      const teamsSnap = await getDocs(collection(db, "teams"));
      const allTeams = teamsSnap.docs.map(d => ({
        id: d.id, name: d.data().name, members: d.data().members || [], ownerId: d.data().ownerId
      }));

      const q = query(collection(db, "users"));
      const querySnapshot = await getDocs(q);

      const loadedUsers: User[] = querySnapshot.docs.reduce((acc: User[], doc) => {
        try {
          const data = doc.data();
          const userId = doc.id;
          const rawRole = (data.role || '').toLowerCase();
          
          // Excluir roles administrativos
          if (['admin', 'owner', 'manager', 'gestor', 'dueño'].includes(rawRole)) return acc;

          const userTeamsRaw = allTeams.filter(t => t.ownerId === userId || (Array.isArray(t.members) && t.members.includes(userId)));
          const userTeams = userTeamsRaw.map(t => t.name);
          const isCaptain = allTeams.some(t => t.ownerId === userId);

          const realOvr = Number(data.ovr || data.elo || 0);
          const xp = Number(data.xp || 0);
          let realTier = String(data.tier || data.level || 'Bronce').toUpperCase();

          // Manejo robusto de fechas
          let rawJoined: Date;
          if (data.createdAt?.toDate) {
            rawJoined = data.createdAt.toDate();
          } else if (data.createdAt?.seconds) {
            rawJoined = new Date(data.createdAt.seconds * 1000);
          } else if (data.createdAt) {
            rawJoined = new Date(data.createdAt);
          } else if (data.joinedDate) {
            rawJoined = new Date(data.joinedDate);
          } else {
            rawJoined = new Date();
          }
          
          // Validar que la fecha sea válida
          if (isNaN(rawJoined.getTime())) {
            rawJoined = new Date();
          }

          const daysActive = Math.max(1, (new Date().getTime() - rawJoined.getTime()) / (1000 * 60 * 60 * 24));
          const growthRate = xp / daysActive;
          const efficiency = (data.stats?.played || 0) > 0 ? xp / data.stats.played : 0;

          const calcOvr = (xpVal: number) => {
            const progress = Math.min(1, Math.sqrt(Math.max(0, xpVal) / maxXP));
            return Math.floor(40 + (progress * 59));
          };

          const projections = {
            m3: calcOvr(xp + (growthRate * 90)),
            m6: calcOvr(xp + (growthRate * 180)),
            m12: calcOvr(xp + (growthRate * 365)),
          };

          const earnedBadges: any[] = [];
          const settingsData = settingsSnap.exists() ? settingsSnap.data() || {} : {};
          const gamificationData = settingsData.gamification || {};
          const badgeConfigs = gamificationData.badges || settingsData.badges || {};
          const statsMap: Record<string, number> = {
            scorer: data.stats?.goals || 0,
            goals: data.stats?.goals || 0,
            
            playmaker: data.stats?.assists || 0,
            assists: data.stats?.assists || 0,
            
            defender: data.stats?.clean_sheets || data.stats?.interceptions || 0,
            clean_sheets: data.stats?.clean_sheets || data.stats?.interceptions || 0,
            
            wins: data.stats?.won || 0,
            won: data.stats?.won || 0,
            
            mvp: data.stats?.mvp || data.stats?.mvps || 0,
            mvps: data.stats?.mvp || data.stats?.mvps || 0,
            
            experience: data.stats?.played || 0,
            played: data.stats?.played || 0,
            
            multi_sport: data.stats?.sports_played || 1,
            sports_played: data.stats?.sports_played || 1,
            
            captaincy: data.stats?.captain_matches || 0,
            captain_matches: data.stats?.captain_matches || 0,
            
            comeback: data.stats?.comebacks || 0,
            comebacks: data.stats?.comebacks || 0,
            
            precision: data.stats?.precision_matches || 0,
            precision_matches: data.stats?.precision_matches || 0,
            
            clutch: data.stats?.clutch_goals || 0,
            clutch_goals: data.stats?.clutch_goals || 0,
            
            tournaments: data.stats?.tournaments_played || 0,
            tournaments_played: data.stats?.tournaments_played || 0,
            
            invictus: data.stats?.longest_win_streak || 0,
            longest_win_streak: data.stats?.longest_win_streak || 0,
            
            rivalry: data.stats?.rivalries_won || 0,
            rivalries_won: data.stats?.rivalries_won || 0,
            
            morning_player: data.stats?.morning_matches || 0,
            morning_matches: data.stats?.morning_matches || 0,
            
            night_player: data.stats?.night_matches || 0,
            night_matches: data.stats?.night_matches || 0,
            
            loyal: Math.floor(daysActive / 30),
            loyalty: Math.floor(daysActive / 30),
            
            weekend_warrior: data.stats?.weekend_matches || 0,
            weekend_matches: data.stats?.weekend_matches || 0,
            
            stamina: data.stats?.minutes_played || (data.stats?.played || 0) * 60,
            minutes_played: data.stats?.minutes_played || (data.stats?.played || 0) * 60,
            
            social: data.stats?.invited_players || 0,
            invited_players: data.stats?.invited_players || 0
          };

          Object.keys(badgeConfigs).forEach(badgeId => {
            const config = badgeConfigs[badgeId] || { bronze: 5, silver: 15, gold: 30 };
            const userVal = statsMap[badgeId] || 0;
            let tier = null;

            const goldVal = Number(config.gold || 0);
            const silverVal = Number(config.silver || 0);
            const bronzeVal = Number(config.bronze || 0);

            if (userVal > 0) {
              if (goldVal > 0 && userVal >= goldVal) tier = 'gold';
              else if (silverVal > 0 && userVal >= silverVal) tier = 'silver';
              else if (bronzeVal > 0 && userVal >= bronzeVal) tier = 'bronze';
            }
            if (tier) {
              const normId = normalizeBadgeId(badgeId);
              if (!earnedBadges.some(b => b.id === normId)) {
                earnedBadges.push({ id: normId, tier });
              }
            }
          });

          acc.push({
            id: userId, name: data.displayName || data.name || "Usuario Sin Nombre",
            email: data.email || "---", role: isCaptain ? 'Capitán' : 'Jugador',
            status: data.status === 'suspended' ? 'Suspendido' : 'Activo',
            ovr: isNaN(realOvr) ? 0 : realOvr, 
            xp: isNaN(xp) ? 0 : xp, 
            photoURL: data.photoURL || data.imageUrl || "",
            tier: realTier, form: data.form || [], stats: data.stats || { played: 0, won: 0, lost: 0, goals: 0 },
            team: userTeams.length > 0 ? userTeams.join(', ') : "Sin Equipo",
            teamList: userTeams, 
            joined: rawJoined.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' }), 
            rawJoined,
            efficiency: isNaN(efficiency) ? 0 : efficiency, 
            growthRate: isNaN(growthRate) ? 0 : growthRate, 
            projections, 
            badges: earnedBadges, 
            strikes: data.strikes || 0,
            raw: data
          });
        } catch (innerError) {
          console.error("Error procesando usuario indvidual:", doc.id, innerError);
        }
        return acc;
      }, []);

      setUsers(loadedUsers.sort((a, b) => b.ovr - a.ovr));
    } catch (error) { 
      console.error("Error al cargar jugadores:", error);
      addToast("Error al cargar jugadores. Revisa la consola.", "error"); 
    } finally { 
      setLoading(false); 
    }
  };


  useEffect(() => { fetchUsers(); }, []);

  const toggleUserStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Activo' ? 'suspended' : 'active';
    try {
      await updateDoc(doc(db, "users", id), { status: newStatus });
      addToast(`Jugador ${newStatus === 'active' ? 'habilitado' : 'suspendido'}`, "info");
      fetchUsers();
    } catch (error) { addToast("Error al cambiar estado", "error"); }
  };

  const handleBulkRecalculate = async () => {
    setConfirmModal({
      isOpen: true, title: 'Sincronizar ELO', type: 'info',
      msg: '¿Quieres actualizar el nivel y valoración de todos los jugadores según el algoritmo oficial?',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setIsBulkLoading(true);
        try {
          const settingsSnap = await getDoc(doc(db, 'settings', 'global'));
          const settingsData = settingsSnap.exists() ? settingsSnap.data() || {} : {};
          const gamification = settingsData.gamification || {
            xpPerCheckin: 50,
            xpPerMatch: 100,
            xpPerWin: 150,
            xpPerMvp: 200,
            xpPerGoal: 25,
            xpPerAssist: 15,
            xpPerLoss: 50,
            xpPerNoShow: 150,
            tiers: { bronze: 0, silver: 1000, gold: 3000, platinum: 6000, diamond: 10000, elite: 15000, legend: 25000 }
          };
          const badgeConfigs = gamification.badges || settingsData.badges || {};
          const BADGE_XP = gamification.badgeXpValues || { bronze: 50, silver: 150, gold: 500 };
          const maxXP = gamification.tiers?.legend || 25000;
          const batch = users.map(async (user) => {
            const existingStats = user.raw?.stats || {};
            // 1. Obtener bookings solo donde el usuario es el que reserva (para checkin, noshow, partido jugado base)
            const queries = [
              getDocs(query(collection(db, "bookings"), where("userId", "==", user.id))).catch(() => ({ docs: [] as any[] }))
            ];
            if (user.email && user.email !== '---') {
              queries.push(getDocs(query(collection(db, "bookings"), where("createdBy", "==", user.email))).catch(() => ({ docs: [] as any[] })));
            }
            const snaps = await Promise.all(queries);
            const allDocsMap = new Map<string, any>();
            snaps.forEach(snap => { snap.docs.forEach((d: any) => { if (!allDocsMap.has(d.id)) allDocsMap.set(d.id, d); }); });
            let totalCheckins = 0;
            let totalNoShows = 0;
            let matchesReservedAndPlayed = 0;

            Array.from(allDocsMap.values()).forEach(d => {
                const b = d.data();
                const s = b.status;
                const isNoShow = s === 'no-show' || 
                                 b.paymentStatus === 'no-show' || 
                                 b.noShow === true || 
                                 (b.notes && (b.notes.toLowerCase().includes('no-show') || b.notes.toLowerCase().includes('inasistencia')));
                
                if (isNoShow) {
                    totalNoShows++;
                } else if (s === 'completed' || s === 'confirmed' || b.checkOut === true) {
                    matchesReservedAndPlayed++;
                    if (b.checkIn) totalCheckins++;
                }
            });

            // 2. Calcular XP basado en los stats existentes en Firebase (Performance) + Reservas (Base)
            let calculatedXp = 0;
            const mainSportKey = (user.raw?.mainSport || 'Fútbol').toLowerCase();
            const defaultOverrides = { 
              winXP: gamification.xpPerWin !== undefined ? gamification.xpPerWin : 150, 
              lossXP: gamification.xpPerLoss !== undefined ? gamification.xpPerLoss : 50, 
              countGoals: true, 
              countAssists: true,
              goalXP: gamification.xpPerGoal !== undefined ? gamification.xpPerGoal : 25,
              assistXP: gamification.xpPerAssist !== undefined ? gamification.xpPerAssist : 15
            };
            const overrides = {
              ...defaultOverrides,
              ...(gamification.sportsOverrides?.[mainSportKey] || {})
            };

            const statsWins = Number(existingStats.won || existingStats.wins || 0);
            const statsLosses = Number(existingStats.lost || 0);
            const statsGoals = Number(existingStats.goals || existingStats.scorer || 0);
            const statsAssists = Number(existingStats.assists || existingStats.playmaker || 0);
            const statsMVPs = Number(existingStats.mvps || existingStats.mvp || 0);

            // XP por Performance (Ingresado por Modal de Estadísticas)
            calculatedXp += statsWins * overrides.winXP;
            calculatedXp -= statsLosses * overrides.lossXP;
            if (overrides.countGoals) calculatedXp += statsGoals * overrides.goalXP;
            if (overrides.countAssists) calculatedXp += statsAssists * overrides.assistXP;
            calculatedXp += statsMVPs * (gamification.xpPerMvp !== undefined ? gamification.xpPerMvp : 200);

            // XP por Reserva, Check-in y No-show (Solo para el que reserva)
            calculatedXp += matchesReservedAndPlayed * (gamification.xpPerMatch !== undefined ? gamification.xpPerMatch : 100);
            calculatedXp += totalCheckins * (gamification.xpPerCheckin !== undefined ? gamification.xpPerCheckin : 50);
            calculatedXp -= totalNoShows * (gamification.xpPerNoShow !== undefined ? gamification.xpPerNoShow : 150);

            calculatedXp = Math.max(0, calculatedXp);

            // === CALCULAR BADGES Y SU XP BONUS ===
            const daysActive = Math.max(1, (new Date().getTime() - user.rawJoined.getTime()) / (1000 * 60 * 60 * 24));
            const statsMap: Record<string, number> = {
              scorer: statsGoals, goals: statsGoals,
              playmaker: statsAssists, assists: statsAssists,
              defender: Number(existingStats.clean_sheets || existingStats.defender || 0), clean_sheets: Number(existingStats.clean_sheets || existingStats.defender || 0),
              wins: statsWins, won: statsWins,
              mvp: statsMVPs, mvps: statsMVPs,
              experience: Number(existingStats.played || existingStats.experience || 0), played: Number(existingStats.played || existingStats.experience || 0),
              multi_sport: Number(existingStats.sports_played || existingStats.multi_sport || 1), sports_played: Number(existingStats.sports_played || existingStats.multi_sport || 1),
              captaincy: Number(existingStats.captain_matches || existingStats.captaincy || 0), captain_matches: Number(existingStats.captain_matches || existingStats.captaincy || 0),
              comeback: Number(existingStats.comebacks || existingStats.comeback || 0), comebacks: Number(existingStats.comebacks || existingStats.comeback || 0),
              precision: Number(existingStats.precision_matches || existingStats.precision || 0), precision_matches: Number(existingStats.precision_matches || existingStats.precision || 0),
              clutch: Number(existingStats.clutch_goals || existingStats.clutch || 0), clutch_goals: Number(existingStats.clutch_goals || existingStats.clutch || 0),
              tournaments: Number(existingStats.tournaments_played || existingStats.tournaments || 0), tournaments_played: Number(existingStats.tournaments_played || existingStats.tournaments || 0),
              invictus: Number(existingStats.longest_win_streak || existingStats.invictus || 0), longest_win_streak: Number(existingStats.longest_win_streak || existingStats.invictus || 0),
              rivalry: Number(existingStats.rivalries_won || existingStats.rivalry || 0), rivalries_won: Number(existingStats.rivalries_won || existingStats.rivalry || 0),
              morning_player: Number(existingStats.morning_matches || existingStats.morning_player || 0), morning_matches: Number(existingStats.morning_matches || existingStats.morning_player || 0),
              night_player: Number(existingStats.night_matches || existingStats.night_player || 0), night_matches: Number(existingStats.night_matches || existingStats.night_player || 0),
              loyal: Math.max(Number(existingStats.loyal || existingStats.loyalty || 0), Math.floor(daysActive / 30)), loyalty: Math.max(Number(existingStats.loyal || existingStats.loyalty || 0), Math.floor(daysActive / 30)),
              weekend_warrior: Number(existingStats.weekend_matches || existingStats.weekend_warrior || 0), weekend_matches: Number(existingStats.weekend_matches || existingStats.weekend_warrior || 0),
              stamina: Number(existingStats.minutes_played || existingStats.stamina || 0), minutes_played: Number(existingStats.minutes_played || existingStats.stamina || 0),
              social: Number(existingStats.invited_players || existingStats.social || 0), invited_players: Number(existingStats.invited_players || existingStats.social || 0)
            };

            const earnedBadges: any[] = [];
            let badgeXpBonus = 0;
            Object.keys(badgeConfigs).forEach(badgeId => {
              const config = badgeConfigs[badgeId] || { bronze: 5, silver: 15, gold: 30 };
              const userVal = statsMap[badgeId] || 0;
              let tier = null;

              const goldVal = Number(config.gold || 0);
              const silverVal = Number(config.silver || 0);
              const bronzeVal = Number(config.bronze || 0);

              if (userVal > 0) {
                if (goldVal > 0 && userVal >= goldVal) { 
                  tier = 'gold'; 
                  badgeXpBonus += BADGE_XP.gold; 
                } else if (silverVal > 0 && userVal >= silverVal) { 
                  tier = 'silver'; 
                  badgeXpBonus += BADGE_XP.silver; 
                } else if (bronzeVal > 0 && userVal >= bronzeVal) { 
                  tier = 'bronze'; 
                  badgeXpBonus += BADGE_XP.bronze; 
                }
              }
              if (tier) {
                const normId = normalizeBadgeId(badgeId);
                if (!earnedBadges.some(b => b.id === normId)) {
                  earnedBadges.push({ id: normId, tier, value: userVal });
                }
              }
            });

            // Sumar XP de badges al total
            calculatedXp += badgeXpBonus;

            let projectedTier = 'BRONCE';
            if (gamification.tiers) {
              const t = gamification.tiers;
              if (calculatedXp >= t.legend) projectedTier = 'LEYENDA';
              else if (calculatedXp >= t.elite) projectedTier = 'ÉLITE';
              else if (calculatedXp >= t.diamond) projectedTier = 'DIAMANTE';
              else if (calculatedXp >= t.platinum) projectedTier = 'PLATINO';
              else if (calculatedXp >= t.gold) projectedTier = 'ORO';
              else if (calculatedXp >= t.silver) projectedTier = 'PLATA';
            }
            const progress = Math.min(1, Math.sqrt(calculatedXp / maxXP));
            const projectedOvr = Math.floor(40 + (progress * 59));
            await updateDoc(doc(db, 'users', user.id), {
              stats: { 
                ...user.stats, 
                played: statsMap.experience, 
                won: statsMap.wins, 
                lost: Math.max(0, statsMap.experience - statsMap.wins), 
                goals: statsMap.scorer, 
                assists: statsMap.playmaker, 
                mvp: statsMap.mvp, 
                minutes_played: statsMap.stamina, 
                sports_played: statsMap.multi_sport, 
                clean_sheets: statsMap.defender,
                weekend_matches: statsMap.weekend_warrior,
                morning_matches: statsMap.morning_player,
                night_matches: statsMap.night_player,
                longest_win_streak: statsMap.invictus,
                loyal: statsMap.loyal
              },
              xp: calculatedXp, ovr: projectedOvr, tier: projectedTier, 
              badges: earnedBadges, badgeXpBonus,
              lastBulkSync: new Date().toISOString()
            });
          });
          await Promise.all(batch);
          addToast("Sincronización masiva completada", "success");
          fetchUsers();
        } catch (error) { addToast("Error en sincronización", "error"); } finally { setIsBulkLoading(false); }
      }
    });
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;
      if (filter === 'Todos') return true;
      if (filter === 'Suspendidos') return u.status === 'Suspendido';
      return true;
    });
  }, [users, searchTerm, filter]);

  const getOvrColor = (tier: string) => {
    const t = tier.toUpperCase();
    if (t.includes('ÉLITE')) return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-500/20';
    if (t.includes('LEYENDA')) return 'text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 border-indigo-500/20';
    if (t.includes('DIAMANTE')) return 'text-cyan-500 bg-cyan-50 dark:bg-cyan-500/10 border-cyan-500/20';
    if (t.includes('ORO')) return 'text-amber-500 bg-amber-50 dark:bg-amber-500/10 border-amber-500/20';
    if (t.includes('PLATA')) return 'text-slate-500 bg-slate-50 dark:bg-slate-500/10 border-slate-500/20';
    return 'text-orange-500 bg-orange-50 dark:bg-orange-500/10 border-orange-500/20';
  };

  return (
    <div className="w-full space-y-6 pb-12 animate-fadeIn relative">
      {notification && (
        <div className={`fixed top-6 right-6 z-[200] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border animate-slideInRight backdrop-blur-md ${
            notification.type === 'success' ? 'bg-white/90 border-emerald-500 text-emerald-700 dark:bg-[#0B0F19]/90 dark:text-emerald-400 dark:border-emerald-500/50' : 
            'bg-white/90 border-red-500 text-red-700 dark:bg-[#0B0F19]/90 dark:text-red-400 dark:border-red-500/50'
        }`}>
            {notification.type === 'success' ? <CheckCircleIcon className="w-5 h-5" /> : <ExclamationTriangleIcon className="w-5 h-5" />}
            <span className="text-[10px] font-black uppercase tracking-wider">{notification.msg}</span>
        </div>
      )}

      {/* HEADER ADN FINANCE STYLE */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-6">
          <div>
              <div className="flex items-center gap-2 mb-0.5">
                  <span className="w-6 h-[2px] bg-emerald-500 rounded-full"></span>
                  <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 tracking-[0.2em] uppercase">Auditoría de Jugadores</p>
              </div>
              <h1 className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none">Directorio de <span className="text-emerald-500 dark:text-emerald-400">Atletas</span></h1>
          </div>
          <div className="flex items-center gap-2">
              <button onClick={() => setIsBadgesModalOpen(true)} className="p-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl hover:bg-slate-50 transition-all active:scale-95 text-amber-500 shadow-sm"><TrophyIcon className="w-4 h-4" /></button>
              <button onClick={handleBulkRecalculate} disabled={isBulkLoading || loading} className="px-6 py-2.5 bg-slate-950 dark:bg-emerald-600 text-white dark:text-slate-950 text-[10px] font-black uppercase rounded-xl shadow-xl flex items-center gap-2 active:scale-95 transition-all disabled:opacity-50">
                  <ArrowPathIcon className={`w-4 h-4 ${isBulkLoading ? 'animate-spin' : ''}`} /> Sincronizar ELO
              </button>
          </div>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <TarjetaKpi titulo="JUGADORES" valor={users.length.toString()} sub="BASE TOTAL" icono={<UserGroupIcon />} brillo />
          <TarjetaKpi titulo="CAPITANES" valor={users.filter(u => u.role === 'Capitán').length.toString()} sub="LÍDERES" icono={<AcademicCapIcon />} />
          <TarjetaKpi titulo="OVR PROMEDIO" valor={(users.length > 0 ? Math.round(users.reduce((a, b) => a + b.ovr, 0) / users.length) : 0).toString()} sub="NIVEL GLOBAL" icono={<ChartBarIcon />} brillo />
          <TarjetaKpi titulo="AGENTES LIBRES" valor={users.filter(u => u.teamList.length === 0).length.toString()} sub="SIN EQUIPO" icono={<SparklesIcon />} />
      </div>

      {/* TOOLS BAR */}
      <PanelGlass className="flex flex-col md:flex-row gap-4 justify-between items-center py-3 px-4">
          <div className="relative w-full md:w-80">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
              <input type="text" placeholder="BUSCAR JUGADOR..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-white/5 border border-transparent focus:border-emerald-500/30 rounded-xl text-[10px] font-black uppercase outline-none text-black dark:text-white transition-all shadow-sm" />
          </div>
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-white/5 p-1 rounded-xl border border-slate-100 dark:border-white/10 w-full md:w-auto overflow-x-auto no-scrollbar">
              {["Todos", "Suspendidos"].map((f) => (
                <button key={f} onClick={() => setFilter(f)} className={`px-4 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all whitespace-nowrap ${filter === f ? "bg-white dark:bg-emerald-500 text-black shadow-sm" : "text-slate-400 hover:text-black dark:hover:text-white"}`}>{f.toUpperCase()}</button>
              ))}
              <div className="h-4 w-[1px] bg-slate-200 dark:bg-white/10 mx-1 hidden md:block"></div>
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-[#0B0F19] text-emerald-500 dark:text-emerald-400 shadow-sm border border-slate-100 dark:border-white/5' : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'}`}
                  title="Vista Cuadrícula"
                >
                  <Squares2X2Icon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-[#0B0F19] text-emerald-500 dark:text-emerald-400 shadow-sm border border-slate-100 dark:border-white/5' : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'}`}
                  title="Vista Listado"
                >
                  <ListBulletIcon className="w-4 h-4" />
                </button>
              </div>
              <div className="h-4 w-[1px] bg-slate-200 dark:bg-white/10 mx-1"></div>
              <BotonAccion icon={<ArrowPathIcon className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />} onClick={fetchUsers} />
          </div>
      </PanelGlass>

      {/* LISTADO */}
      <div className="relative min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4 animate-pulse">
            <ArrowPathIcon className="w-8 h-8 text-emerald-500 animate-spin" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Analizando base de talento...</p>
          </div>
        ) : (
          viewMode === 'list' ? (
            <PanelGlass className="overflow-hidden border border-slate-100 dark:border-white/5 rounded-3xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
                      <th className="py-4 px-6 text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Jugador</th>
                      <th className="py-4 px-6 text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Valoración</th>
                      <th className="py-4 px-6 text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Partidos / Récord</th>
                      <th className="py-4 px-6 text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Goles / MVP</th>
                      <th className="py-4 px-6 text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Equipos</th>
                      <th className="py-4 px-6 text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Estado</th>
                      <th className="py-4 px-6 text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {filteredUsers.map((user) => {
                      const winRate = (user.stats.played || 0) > 0 ? Math.round(((user.stats.won || 0) / user.stats.played) * 100) : 0;
                      return (
                        <tr key={user.id} className="hover:bg-slate-50/30 dark:hover:bg-white/[0.01] transition-all group">
                          {/* JUGADOR */}
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center font-black text-slate-500 text-sm overflow-hidden border border-slate-100 dark:border-white/10 shrink-0">
                                {user.photoURL ? <img src={user.photoURL} className="w-full h-full object-cover" /> : user.name.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-black text-[11px] text-slate-900 dark:text-white uppercase truncate leading-none">{user.name}</span>
                                  {user.role === 'Capitán' && <span className="px-1.5 py-0.5 bg-amber-500 text-black rounded text-[6px] font-black uppercase tracking-tighter">CAP</span>}
                                </div>
                                <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase truncate block mt-1">{user.email}</span>
                              </div>
                            </div>
                          </td>

                          {/* VALORACIÓN (OVR) */}
                          <td className="py-4 px-6 text-center">
                            <div className="inline-flex flex-col items-center gap-1">
                              <div className={`px-2.5 py-1 rounded-xl text-[10px] font-black shadow-sm ${getOvrColor(user.tier)}`}>
                                {user.ovr} OVR
                              </div>
                              <span className="text-[6px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{user.tier}</span>
                            </div>
                          </td>

                          {/* RECORD Y RENDIMIENTO */}
                          <td className="py-4 px-6">
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 font-mono">
                                  {user.stats.played} PJ · <span className="text-emerald-500">{user.stats.won}W</span> / <span className="text-red-400">{user.stats.lost}L</span>
                                </span>
                                <span className="text-[7px] font-black text-slate-400 dark:text-slate-500 font-mono">({winRate}% WR)</span>
                              </div>
                              <div className="w-32 h-1 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${winRate}%` }}></div>
                              </div>
                            </div>
                          </td>

                          {/* GOLES / MVP */}
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-1.5">
                                <FireIcon className="w-3.5 h-3.5 text-rose-500" />
                                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 font-mono">{user.stats.goals || 0} <span className="text-[7px] font-bold text-slate-400 dark:text-slate-500 uppercase">Goles</span></span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <TrophyIcon className="w-3.5 h-3.5 text-amber-500" />
                                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 font-mono">{user.stats.mvp || 0} <span className="text-[7px] font-bold text-slate-400 dark:text-slate-500 uppercase">MVP</span></span>
                              </div>
                            </div>
                          </td>

                          {/* EQUIPOS */}
                          <td className="py-4 px-6">
                            <div className="flex flex-wrap gap-1 max-w-[150px]">
                              {user.teamList.length > 0 ? (
                                user.teamList.map((t, idx) => (
                                  <span key={idx} className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[7px] font-black rounded uppercase border border-indigo-500/10 tracking-tighter">{t}</span>
                                ))
                              ) : (
                                <span className="text-[7px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-widest italic">Libre</span>
                              )}
                            </div>
                          </td>

                          {/* ESTADO */}
                          <td className="py-4 px-6">
                            <div className="flex flex-col gap-1">
                              <span className={`px-2 py-0.5 rounded-lg text-[7px] font-black uppercase w-fit border ${user.status === 'Activo' ? 'bg-emerald-50 border-emerald-500/20 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-red-50 border-red-500/20 text-red-600 dark:bg-red-500/10 dark:text-red-400'}`}>
                                {user.status}
                              </span>
                              {(user.strikes || 0) > 0 && (
                                <span className="px-1.5 py-0.5 bg-rose-500 text-white rounded text-[6px] font-black uppercase flex items-center gap-1 w-fit">
                                  <NoSymbolIcon className="w-2.5 h-2.5" />
                                  {user.strikes} {user.strikes === 1 ? 'Strike' : 'Strikes'}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* ACCIONES */}
                          <td className="py-4 px-6 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button title="Historial" onClick={() => { setSelectedUser(user); setIsHistoryModalOpen(true); }} className="p-2 hover:bg-emerald-500 hover:text-white text-slate-400 dark:text-slate-500 rounded-xl transition-all active:scale-90"><ClockIcon className="w-4 h-4" /></button>
                              <button title="Perfil" onClick={() => { setSelectedUser(user); setIsModalOpen(true); }} className="p-2 hover:bg-slate-900 dark:hover:bg-emerald-500 text-slate-400 dark:text-slate-500 hover:text-white rounded-xl transition-all active:scale-90"><UserCircleIcon className="w-4 h-4" /></button>
                              <button onClick={() => toggleUserStatus(user.id, user.status)} className={`px-3 py-1.5 rounded-lg text-[7px] font-black uppercase transition-all active:scale-95 border ${user.status === 'Activo' ? 'border-red-200 text-red-500 hover:bg-red-500 hover:text-white hover:border-red-500 dark:border-red-500/30' : 'border-emerald-200 text-emerald-500 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 dark:border-emerald-500/30'}`}>
                                {user.status === 'Activo' ? 'Suspender' : 'Activar'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </PanelGlass>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredUsers.map((user) => (
                <div key={user.id} className={`bg-white dark:bg-[#0B0F19] rounded-3xl border transition-all flex flex-col group overflow-hidden ${user.status === 'Activo' ? 'border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/20' : 'border-red-100 opacity-70 shadow-none'}`}>
                  <div className="p-6 flex-1">
                    <div className="flex justify-between items-start mb-6">
                      <div className="relative">
                        <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 flex items-center justify-center font-black text-slate-500 text-xl shadow-inner overflow-hidden shrink-0">
                          {user.photoURL ? <img src={user.photoURL} className="w-full h-full object-cover" /> : user.name.charAt(0)}
                        </div>
                        <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-lg border-2 border-white dark:border-[#0B0F19] flex items-center justify-center font-black text-[8px] shadow-sm ${getOvrColor(user.tier)}`}>
                          {user.ovr}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`px-2.5 py-1 rounded-xl text-[8px] font-black uppercase border ${user.status === 'Activo' ? 'bg-emerald-50 border-emerald-500/20 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-red-50 border-red-500/20 text-red-600 dark:bg-red-500/10 dark:text-red-400'}`}>
                          {user.status}
                        </span>
                        <span className="px-2 py-0.5 bg-slate-50 dark:bg-white/5 rounded-lg text-[7px] font-black text-slate-400 border border-slate-100 dark:border-white/10 uppercase tracking-widest">{user.tier}</span>
                      </div>
                    </div>

                    <h3 className="font-black text-slate-900 dark:text-white text-base uppercase truncate leading-tight group-hover:text-emerald-500 transition-colors mb-1">{user.name}</h3>
                    <div className="flex items-center gap-2 mb-5">
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter truncate max-w-[150px]">{user.email}</p>
                      {user.role === 'Capitán' && <span className="px-1.5 py-0.5 bg-amber-500 text-black rounded-lg text-[7px] font-black uppercase">Capitán</span>}
                      {(user.strikes || 0) > 0 && (
                        <span className="px-1.5 py-0.5 bg-rose-500 text-white rounded-lg text-[7px] font-black uppercase flex items-center gap-1">
                          <NoSymbolIcon className="w-2.5 h-2.5" />
                          {user.strikes} {user.strikes === 1 ? 'Strike' : 'Strikes'}
                        </span>
                      )}
                    </div>

                    <div className="space-y-4">
                      {/* STATS RAPIDAS */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-3 bg-slate-50/50 dark:bg-white/[0.02] rounded-2xl border border-slate-100/50 dark:border-white/5">
                          <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1">Récord</p>
                          <div className="flex items-center gap-1.5 font-mono">
                            <span className="text-[10px] font-black text-emerald-500">{user.stats.won}W</span>
                            <span className="text-[10px] font-black text-red-400">{user.stats.lost}L</span>
                          </div>
                        </div>
                        <div className="p-3 bg-slate-50/50 dark:bg-white/[0.02] rounded-2xl border border-slate-100/50 dark:border-white/5">
                          <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1">Goles</p>
                          <div className="flex items-center gap-1.5">
                            <FireIcon className="w-3 h-3 text-rose-500" />
                            <span className="text-[10px] font-black text-slate-900 dark:text-white">{user.stats.goals}</span>
                          </div>
                        </div>
                      </div>


                      {/* EQUIPOS & BADGES */}
                      <div className="space-y-3">
                          <div className="flex flex-col gap-1.5">
                            <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Equipos Actuales</p>
                            <div className="flex flex-wrap gap-1.5">
                              {user.teamList.length > 0 ? (
                                  user.teamList.map((t, idx) => (
                                  <span key={idx} className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[7px] font-black rounded-lg uppercase border border-indigo-500/10 tracking-tighter">{t}</span>
                                  ))
                              ) : (
                                  <span className="text-[7px] font-black text-slate-300 uppercase tracking-widest italic">Agente Libre</span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-center pt-2 border-t border-slate-50 dark:border-white/5">
                            <div className="flex flex-col">
                              <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Insignias</p>
                              <div className="flex gap-1 mt-1">
                                  {user.badges.length > 0 ? user.badges.slice(0, 5).map((b: any, i: number) => (
                                      <span key={i} title={b.id} className="w-5 h-5 rounded-md bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 flex items-center justify-center text-[8px] grayscale hover:grayscale-0 transition-all cursor-help shadow-sm">
                                          {b.id === 'scorer' ? '⚽' : b.id === 'wins' ? '🏆' : '🎖️'}
                                      </span>
                                  )) : <span className="text-[7px] font-bold text-slate-300 uppercase tracking-widest">---</span>}
                                  {user.badges.length > 5 && <span className="text-[8px] font-black text-slate-400 self-center ml-1">+{user.badges.length - 5}</span>}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Miembro Desde</p>
                              <p className="text-[8px] font-black text-slate-900 dark:text-white uppercase">{user.joined}</p>
                            </div>
                          </div>
                      </div>
                    </div>
                  </div>

                  <div className="px-6 py-4 bg-slate-50/50 dark:bg-white/[0.02] border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                    <div className="flex gap-1">
                      <button title="Historial" onClick={() => { setSelectedUser(user); setIsHistoryModalOpen(true); }} className="p-2 hover:bg-emerald-500 hover:text-white text-slate-400 dark:text-slate-500 rounded-xl transition-all active:scale-90"><ClockIcon className="w-4 h-4" /></button>
                      <button title="Perfil" onClick={() => { setSelectedUser(user); setIsModalOpen(true); }} className="p-2 hover:bg-slate-900 dark:hover:bg-emerald-500 text-slate-400 dark:text-slate-500 hover:text-white rounded-xl transition-all active:scale-90"><UserCircleIcon className="w-4 h-4" /></button>
                    </div>
                    <button onClick={() => toggleUserStatus(user.id, user.status)} className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase transition-all active:scale-95 ${user.status === 'Activo' ? 'bg-red-50 text-red-600 hover:bg-red-500 hover:text-white dark:bg-red-500/10' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white dark:bg-emerald-500/10'}`}>
                      {user.status === 'Activo' ? 'Suspender' : 'Activar'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* MODALES */}
      <UserProfileModal user={selectedUser} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <UserHistoryModal user={selectedUser} isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} gamification={gamificationConfig} />
      <BadgesConfigModal isOpen={isBadgesModalOpen} onClose={() => setIsBadgesModalOpen(false)} />

      {/* CONFIRM MODAL ESTANDARIZADO (ADN VISUAL) */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setConfirmModal(p => ({ ...p, isOpen: false }))}>
          <div className="bg-white dark:bg-[#0B0F19] w-full max-w-sm rounded-[2.5rem] p-8 border border-slate-200 dark:border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.3)] text-center relative overflow-hidden animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
            <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-slate-50 dark:from-white/[0.03] to-transparent pointer-events-none"></div>
            
            <div className={`relative z-10 w-20 h-20 mx-auto mb-6 rounded-3xl flex items-center justify-center border shadow-xl ${confirmModal.type === 'danger' ? 'bg-rose-50 border-rose-100 text-rose-600 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-400' : 'bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400'}`}>
                {confirmModal.type === 'danger' ? <ExclamationTriangleIcon className="w-10 h-10" /> : <InformationCircleIcon className="w-10 h-10" />}
            </div>
            
            <h3 className="relative z-10 text-xl font-black uppercase text-slate-800 dark:text-white mb-3 tracking-tighter italic">{confirmModal.title}</h3>
            <p className="relative z-10 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-10 leading-relaxed px-2">{confirmModal.msg}</p>
            
            <div className="relative z-10 flex gap-4">
              <button onClick={() => setConfirmModal(p => ({ ...p, isOpen: false }))} className="flex-1 py-4 text-[9px] font-black uppercase rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 transition-all">CANCELAR</button>
              <button onClick={confirmModal.onConfirm} className={`flex-1 py-4 text-[9px] font-black uppercase rounded-2xl text-white shadow-2xl transition-all active:scale-95 ${confirmModal.type === 'danger' ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/30' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'}`}>CONFIRMAR</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
