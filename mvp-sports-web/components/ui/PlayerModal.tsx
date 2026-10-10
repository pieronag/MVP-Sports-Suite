"use client";
import React, { useEffect, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
    UserCircleIcon, Clock01Icon, Certificate01Icon, Mail01Icon,
    UserGroupIcon, TrophyIcon, Shield01Icon, StarIcon, FireIcon,
    SparklesIcon, BoltIcon, Target01Icon, RefreshIcon, VariableIcon,
    HeartIcon, CpuIcon, Mortarboard01Icon, Cancel01Icon, Award01Icon,
    CrownIcon, Calendar03Icon, MapPinIcon,
    BlockedIcon, CheckmarkCircle02Icon, GlobeIcon, BarChartIcon,
} from '@hugeicons/core-free-icons';
import { db } from '@/services/firebase';
import { doc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import ModalPortal from './ModalPortal';

interface PlayerModalProps {
    user: any;
    isOpen: boolean;
    onClose: () => void;
    gamification?: any;
    initialTab?: 'perfil' | 'historial' | 'logros';
    onToggleStatus?: (user: any) => void;
}

const BADGE_META: Record<string, { name: string; icon: any; desc: string }> = {
    scorer: { name: 'Artillero', icon: FireIcon, desc: 'Goles anotados' },
    playmaker: { name: 'Maestro', icon: SparklesIcon, desc: 'Asistencias acumuladas' },
    defender: { name: 'Muralla', icon: Shield01Icon, desc: 'Vallas invictas' },
    wins: { name: 'Ganador', icon: TrophyIcon, desc: 'Partidos ganados' },
    mvp: { name: 'Estrella', icon: StarIcon, desc: 'Elegido mejor jugador' },
    experience: { name: 'Leyenda', icon: UserGroupIcon, desc: 'Partidos disputados' },
    invictus: { name: 'Invicto', icon: CrownIcon, desc: 'Mejor racha de victorias' },
    stamina: { name: 'Motor', icon: CpuIcon, desc: 'Minutos jugados' },
    weekend_warrior: { name: 'Guerrero FDS', icon: UserGroupIcon, desc: 'Partidos de fin de semana' },
    morning_player: { name: 'Madrugador', icon: SparklesIcon, desc: 'Partidos de mañana' },
    night_player: { name: 'Nocturno', icon: StarIcon, desc: 'Partidos de noche' },
    loyal: { name: 'Fiel', icon: HeartIcon, desc: 'Meses de permanencia' },
    multi_sport: { name: 'Atleta Total', icon: VariableIcon, desc: 'Deportes distintos jugados' },
    scout: { name: 'Explorador', icon: GlobeIcon, desc: 'Recintos distintos visitados' },
    streak: { name: 'En Racha', icon: BoltIcon, desc: 'Mejor racha de partidos seguidos' },
    consistent: { name: 'Constante', icon: BarChartIcon, desc: 'Partidos en un mismo mes' },
    veteran: { name: 'Veterano', icon: Award01Icon, desc: 'Meses consecutivos jugando' },
    socializer: { name: 'Compañero', icon: Mortarboard01Icon, desc: 'Partidos con distintos compañeros' },
};

const ALL_BADGE_IDS = Object.keys(BADGE_META);

const TIER_ORDER: Record<string, number> = { gold: 3, silver: 2, bronze: 1 };

// Umbrales por defecto (deben coincidir con INITIAL_BADGES del BadgesConfigModal).
const DEFAULT_THRESHOLDS: Record<string, { bronze: number; silver: number; gold: number }> = {
    scorer: { bronze: 1, silver: 10, gold: 30 },
    playmaker: { bronze: 1, silver: 8, gold: 25 },
    defender: { bronze: 1, silver: 5, gold: 15 },
    wins: { bronze: 1, silver: 5, gold: 15 },
    mvp: { bronze: 1, silver: 3, gold: 8 },
    experience: { bronze: 1, silver: 10, gold: 30 },
    invictus: { bronze: 2, silver: 4, gold: 8 },
    stamina: { bronze: 60, silver: 300, gold: 900 },
    weekend_warrior: { bronze: 1, silver: 8, gold: 20 },
    morning_player: { bronze: 1, silver: 5, gold: 15 },
    night_player: { bronze: 1, silver: 5, gold: 15 },
    loyal: { bronze: 1, silver: 3, gold: 6 },
    multi_sport: { bronze: 2, silver: 3, gold: 5 },
    scout: { bronze: 2, silver: 5, gold: 10 },
    streak: { bronze: 3, silver: 6, gold: 10 },
    consistent: { bronze: 4, silver: 8, gold: 16 },
    veteran: { bronze: 2, silver: 4, gold: 8 },
    socializer: { bronze: 3, silver: 8, gold: 20 },
};

function resolveDate(candidates: any[]): Date | null {
    for (const c of candidates) {
        if (!c) continue;
        let d: Date;
        if (c instanceof Date) d = c;
        else if (typeof c?.toDate === 'function') d = c.toDate();
        else if (typeof c?.seconds === 'number') d = new Date(c.seconds * 1000);
        else if (typeof c?._seconds === 'number') d = new Date(c._seconds * 1000);
        else d = new Date(c);
        if (!isNaN(d.getTime())) return d;
    }
    return null;
}

export default function PlayerModal({ user, isOpen, onClose, gamification, initialTab = 'perfil', onToggleStatus }: PlayerModalProps) {
    const [tab, setTab] = useState<'perfil' | 'historial' | 'logros'>(initialTab);
    const [gamificationLocal, setGamificationLocal] = useState<any>(gamification || null);
    const [history, setHistory] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setTab(initialTab);
    }, [isOpen, initialTab, user?.id]);

    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        document.body.classList.add('overflow-hidden');
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.classList.remove('overflow-hidden');
        };
    }, [isOpen, onClose]);

    useEffect(() => {
        if (!isOpen) return;
        if (!gamificationLocal) {
            (async () => {
                try {
                    const snap = await getDoc(doc(db, 'settings', 'global'));
                    if (snap.exists()) {
                        const data = snap.data();
                        setGamificationLocal({
                            ...data.gamification,
                            badges: data.badges || data.gamification?.badges || {}
                        });
                    }
                } catch (e) { console.error('Error gamification:', e); }
            })();
        }
    }, [isOpen, gamificationLocal]);

    useEffect(() => {
        if (!isOpen || !user?.id) return;
        // Se carga el historial al abrir: Historial y Logros lo necesitan.
        if (history.length === 0) fetchHistory();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, user?.id]);

    const fetchHistory = async () => {
        setLoadingHistory(true);
        try {
            const queries: any[] = [query(collection(db, "bookings"), where("userId", "==", user.id), limit(200))];
            queries.push(query(collection(db, "bookings"), where("playerId", "==", user.id), limit(200)));
            if (user.email) queries.push(query(collection(db, "bookings"), where("createdBy", "==", user.email), limit(200)));
            if (user.name) queries.push(query(collection(db, "bookings"), where("clientName", "==", user.name), limit(200)));

            const snapshots = await Promise.all(queries.map(q => getDocs(q).catch(() => ({ docs: [] as any[] }))));
            const map = new Map<string, any>();
            snapshots.forEach(snap => snap.docs.forEach((d: any) => { if (!map.has(d.id)) map.set(d.id, d); }));

            const matches = Array.from(map.values()).map(d => {
                const data = d.data();
                const dateObj = data.date?.seconds ? new Date(data.date.seconds * 1000) : (data.date?.toDate ? data.date.toDate() : new Date());
                const isNoShow = data.status === 'no-show' || data.paymentStatus === 'no-show' || data.noShow === true ||
                    (data.notes && (data.notes.toLowerCase().includes('no-show') || data.notes.toLowerCase().includes('inasistencia')));
                let displayStatus = 'pending';
                if (isNoShow) displayStatus = 'no-show';
                else if (data.status === 'completed' || data.checkIn || data.checkOut === true) displayStatus = 'completed';
                else if (data.status === 'confirmed') displayStatus = 'confirmed';
                else if (data.status === 'cancelled') displayStatus = 'cancelled';
                return { id: d.id, ...data, displayStatus, dateObj, formattedDate: dateObj.toLocaleDateString('es-CL') };
            }).filter(m => ['completed', 'cancelled', 'no-show'].includes(m.displayStatus));

            setHistory(matches.sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime()));
        } catch (e) {
            console.error("Error historial:", e);
        } finally {
            setLoadingHistory(false);
        }
    };

    if (!isOpen || !user) return null;

    const name = user.name || user.displayName || 'Jugador';
    const email = user.email || '';
    const role = user.role || 'Jugador';
    const xp = user.xp || 0;
    const stats = user.stats || { played: 0, won: 0, lost: 0, goals: 0 };
    const photoURL = user.photoURL || '';
    const teamList = user.teamList || [];
    const mainSport = user.mainSport || user.raw?.mainSport || '';
    const position = user.position || user.raw?.position || '';

    const rawJoined = resolveDate([user.rawJoined, user.raw?.createdAt, user.createdAt, user.raw?.joinedDate, user.joinedDate]);
    let joinedStr = '—';
    if (rawJoined) joinedStr = rawJoined.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    else if (typeof user.joined === 'string' && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(user.joined.trim())) joinedStr = user.joined;
    const daysActive = rawJoined ? Math.max(1, (Date.now() - rawJoined.getTime()) / 86400000) : 1;

    const tiers = gamificationLocal?.tiers || { bronze: 0, silver: 1000, gold: 3000, platinum: 6000, diamond: 10000, elite: 15000, legend: 25000 };
    const RANGOS = [
        { id: 'bronze', name: 'BRONCE', min: tiers.bronze || 0, color: 'text-amber-700 bg-amber-700/10' },
        { id: 'silver', name: 'PLATA', min: tiers.silver || 1000, color: 'text-slate-400 bg-slate-400/10' },
        { id: 'gold', name: 'ORO', min: tiers.gold || 3000, color: 'text-amber-500 bg-amber-500/10' },
        { id: 'platinum', name: 'PLATINO', min: tiers.platinum || 6000, color: 'text-blue-500 bg-blue-500/10' },
        { id: 'diamond', name: 'DIAMANTE', min: tiers.diamond || 10000, color: 'text-cyan-500 bg-cyan-500/10' },
        { id: 'elite', name: 'ELITE', min: tiers.elite || 15000, color: 'text-emerald-500 bg-emerald-500/10' },
        { id: 'legend', name: 'LEYENDA', min: tiers.legend || 25000, color: 'text-purple-500 bg-purple-500/10' },
    ];
    let rangoActual = RANGOS[0], siguienteRango = RANGOS[1];
    for (let i = 0; i < RANGOS.length; i++) if (xp >= RANGOS[i].min) { rangoActual = RANGOS[i]; siguienteRango = RANGOS[i + 1] || RANGOS[i]; }
    const progreso = siguienteRango.id === rangoActual.id ? 100 : Math.min(100, Math.round(((xp - rangoActual.min) / (siguienteRango.min - rangoActual.min)) * 100));

    // Datos derivados de los partidos reales (history)
    const completedMatches = history.filter(h => !h.isBadge && h.displayStatus === 'completed');
    const distinctVenues = new Set(completedMatches.map(m => m.tenantId || m.tenantName).filter(Boolean)).size;
    const distinctPartners = new Set(completedMatches.map(m => m.clientName || m.userId).filter(Boolean)).size;
    const distinctSports = new Set(completedMatches.map(m => m.sport).filter(Boolean)).size;

    // Mejor racha de partidos seguidos (por fecha)
    const sortedByDate = [...completedMatches].sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
    let bestStreak = 0, curStreak = 0, lastTime = 0;
    sortedByDate.forEach(m => {
        const t = m.dateObj.getTime();
        if (lastTime && (t - lastTime) <= 1000 * 60 * 60 * 24 * 14) curStreak += 1;
        else curStreak = 1;
        bestStreak = Math.max(bestStreak, curStreak);
        lastTime = t;
    });

    // Máximo de partidos en un mismo mes
    const monthCount: Record<string, number> = {};
    sortedByDate.forEach(m => {
        const key = `${m.dateObj.getFullYear()}-${m.dateObj.getMonth()}`;
        monthCount[key] = (monthCount[key] || 0) + 1;
    });
    const bestMonth = Object.values(monthCount).reduce((a, b) => Math.max(a, b), 0);

    // Meses consecutivos jugando (veterano)
    const monthKeys = Object.keys(monthCount).sort();
    let bestConsecutive = 0, run = 0, prev: Date | null = null;
    monthKeys.forEach(k => {
        const [y, mo] = k.split('-').map(Number);
        const d = new Date(y, mo, 1);
        if (prev) {
            const expected = new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
            run = (d.getTime() === expected.getTime()) ? run + 1 : 1;
        } else run = 1;
        bestConsecutive = Math.max(bestConsecutive, run);
        prev = d;
    });

    const statsMap: Record<string, number> = {
        scorer: stats.goals || 0,
        playmaker: stats.assists || 0,
        defender: stats.clean_sheets || 0,
        wins: stats.won || 0,
        mvp: stats.mvps || stats.mvp || 0,
        experience: stats.played || completedMatches.length || 0,
        invictus: stats.longest_win_streak || 0,
        stamina: stats.minutes_played || (stats.played || 0) * 60,
        weekend_warrior: stats.weekend_matches || 0,
        morning_player: stats.morning_matches || 0,
        night_player: stats.night_matches || 0,
        loyal: Math.floor(daysActive / 30),
        multi_sport: stats.sports_played || distinctSports || 0,
        scout: distinctVenues,
        streak: bestStreak,
        consistent: bestMonth,
        veteran: bestConsecutive,
        socializer: distinctPartners,
    };

    function getBadgeProgress() {
        const badgeConfigs = gamificationLocal?.badges || {};
        const BADGE_XP = gamificationLocal?.badgeXpValues || { bronze: 50, silver: 150, gold: 500 };
        const saved = user?.badges || [];
        const savedMap = new Map<string, string>();
        const norm = (id: string) => ({ goals: 'scorer', assists: 'playmaker', clean_sheets: 'defender', won: 'wins', played: 'experience', sports_played: 'multi_sport', loyalty: 'loyal' } as any)[id] || id;
        saved.forEach((b: any) => { if (b.tier) savedMap.set(norm(b.id), b.tier); });

        const all = ALL_BADGE_IDS.map(id => {
            const dbKey = ({ scorer: 'goals', playmaker: 'assists', defender: 'clean_sheets', wins: 'won', experience: 'played', multi_sport: 'sports_played', loyal: 'loyalty' } as any)[id] || id;
            const cfg = badgeConfigs[id] || badgeConfigs[dbKey] || DEFAULT_THRESHOLDS[id] || { bronze: 1, silver: 5, gold: 15 };
            const value = statsMap[id] || 0;
            let tier: string | null = null;
            if (value > 0) {
                if (Number(cfg.gold) > 0 && value >= Number(cfg.gold)) tier = 'gold';
                else if (Number(cfg.silver) > 0 && value >= Number(cfg.silver)) tier = 'silver';
                else if (Number(cfg.bronze) > 0 && value >= Number(cfg.bronze)) tier = 'bronze';
            }
            const savedTier = savedMap.get(id);
            if (savedTier && (!tier || TIER_ORDER[savedTier] > TIER_ORDER[tier])) tier = savedTier;

            // Progreso hacia el siguiente tier
            const nextTarget = tier === 'gold' ? null : tier === 'silver' ? Number(cfg.gold) : tier === 'bronze' ? Number(cfg.silver) : Number(cfg.bronze);
            const currentBase = tier === 'gold' ? Number(cfg.gold) : tier === 'silver' ? Number(cfg.silver) : tier === 'bronze' ? Number(cfg.bronze) : 0;
            const nextTierName = tier === 'gold' ? null : tier === 'silver' ? 'Oro' : tier === 'bronze' ? 'Plata' : 'Bronce';
            const progress = nextTarget && nextTarget > currentBase ? Math.min(100, Math.round(((value - currentBase) / (nextTarget - currentBase)) * 100)) : 100;

            return {
                id, name: BADGE_META[id].name, icon: BADGE_META[id].icon, desc: BADGE_META[id].desc,
                value, tier, xp: tier ? (BADGE_XP[tier] || 0) : 0,
                nextTarget, nextTierName, progress,
            };
        });

        const earned = all.filter(b => b.tier).sort((a, b) => TIER_ORDER[b.tier!] - TIER_ORDER[a.tier!] || b.value - a.value);
        const locked = all.filter(b => !b.tier).sort((a, b) => b.progress - a.progress);
        return { earned, locked, all };
    }

    const badgeData = getBadgeProgress();

    function calculateMatchXP(match: any) {
        if (!gamificationLocal || match.isBadge) return null;
        const sportKey = match.sport ? match.sport.toLowerCase() : 'futbol';
        const o = {
            winXP: gamificationLocal.xpPerWin || 150, lossXP: gamificationLocal.xpPerLoss || 50,
            goalXP: gamificationLocal.xpPerGoal || 25, assistXP: gamificationLocal.xpPerAssist || 15,
            ...(gamificationLocal.sportsOverrides?.[sportKey] || {})
        };
        if (match.displayStatus === 'no-show') return -(gamificationLocal.xpPerNoShow || 50);
        if (!(match.status === 'completed' || match.checkIn)) return null;
        let x = (gamificationLocal.xpPerMatch || 100);
        if (match.checkIn) x += (gamificationLocal.xpPerCheckin || 50);
        if (match.isWin === true) x += o.winXP; else if (match.isWin === false) x -= o.lossXP;
        if (match.goals) x += match.goals * o.goalXP;
        if (match.assists) x += match.assists * o.assistXP;
        if (match.isMVP) x += (gamificationLocal.xpPerMvp || 200);
        return x;
    }

    const tierBadgeStyle = (t: string | null) =>
        t === 'gold' ? 'bg-yellow-500 text-white' : t === 'silver' ? 'bg-slate-400 text-white' : t === 'bronze' ? 'bg-orange-600 text-white' : 'bg-slate-200 text-slate-500 dark:bg-white/10 dark:text-slate-400';

    return (
        <ModalPortal>
            <div className="fixed inset-0 z-400 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/80 dark:bg-black/85 backdrop-blur-xl animate-in fade-in duration-200" role="presentation" onClick={onClose}>
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="player-modal-title"
                    onClick={(e) => e.stopPropagation()}
                    className="relative w-full sm:max-w-4xl bg-white dark:bg-[#0B0F19] rounded-t-2xl sm:rounded-md border border-slate-200 dark:border-white/10 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col h-[94vh] sm:h-[90vh] animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
                >
                    {/* HEADER */}
                    <div className="relative shrink-0 border-b border-slate-100 dark:border-white/5">
                        <div aria-hidden="true" className="pointer-events-none absolute -top-16 left-6 w-40 h-40 bg-emerald-400/20 dark:bg-[#00df82]/15 blur-[70px] rounded-full" />
                        <div className="relative px-5 sm:px-6 pt-5 pb-4 flex items-start justify-between gap-3">
                            <div className="flex items-center gap-4 min-w-0">
                                <div className="relative shrink-0">
                                    <div className="w-16 h-16 rounded-md bg-slate-100 dark:bg-white/5 border border-slate-100 dark:border-white/10 overflow-hidden flex items-center justify-center">
                                        {photoURL ? <img src={photoURL} className="w-full h-full object-cover" alt={name} /> : <span className="text-2xl font-black text-slate-300 dark:text-slate-600">{name.charAt(0).toUpperCase()}</span>}
                                    </div>
                                    <div className={`absolute -bottom-1.5 -right-1.5 min-w-[30px] h-[30px] px-1 rounded-md flex items-center justify-center font-black border-[3px] border-white dark:border-[#0B0F19] shadow-lg text-[11px] ${rangoActual.color}`}>
                                        {user.ovr || 40}
                                    </div>
                                </div>
                                <div className="min-w-0">
                                    <h2 id="player-modal-title" className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white font-heading leading-none truncate">{name}</h2>
                                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${user.status === 'Activo' ? 'bg-emerald-500/10 text-emerald-700 dark:text-[#00df82] border-emerald-500/25' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25'}`}>{user.status || 'Activo'}</span>
                                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border border-transparent ${rangoActual.color}`}>{rangoActual.name}</span>
                                        <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-[#00df82] border border-emerald-500/20 font-mono">{xp.toLocaleString()} XP</span>
                                        {role === 'Capitán' && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-amber-500 text-slate-950"><HugeiconsIcon icon={CrownIcon} className="w-3 h-3" strokeWidth={2.5} />Capitán</span>}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                {onToggleStatus && (
                                    <button
                                        onClick={() => onToggleStatus(user)}
                                        aria-label={user.status === 'Activo' ? 'Suspender jugador' : 'Activar jugador'}
                                        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer border ${
                                            user.status === 'Activo'
                                                ? 'border-amber-200 text-amber-600 hover:bg-amber-50 dark:border-amber-500/30 dark:text-amber-400 dark:hover:bg-amber-500/10'
                                                : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-500/30 dark:text-[#00df82] dark:hover:bg-emerald-500/10'
                                        }`}
                                    >
                                        <HugeiconsIcon icon={user.status === 'Activo' ? BlockedIcon : CheckmarkCircle02Icon} className="w-4 h-4" strokeWidth={2} />
                                        <span className="hidden sm:inline">{user.status === 'Activo' ? 'Suspender' : 'Activar'}</span>
                                    </button>
                                )}
                                <button onClick={onClose} aria-label="Cerrar" className="p-2 rounded-md text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer shrink-0">
                                    <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" strokeWidth={1.8} />
                                </button>
                            </div>
                        </div>

                        {/* TABS */}
                        <div className="relative px-5 sm:px-6 flex items-center gap-1.5 pb-0">
                            {[
                                { id: 'perfil', label: 'Perfil', icon: UserCircleIcon },
                                { id: 'historial', label: 'Historial', icon: Clock01Icon },
                                { id: 'logros', label: 'Logros', icon: Certificate01Icon },
                            ].map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => setTab(t.id as any)}
                                    className={`inline-flex items-center gap-2 px-4 py-2.5 -mb-px text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer border-b-2 ${tab === t.id ? 'text-emerald-700 dark:text-[#00df82] border-emerald-500 dark:border-[#00df82]' : 'text-slate-400 border-transparent hover:text-slate-700 dark:hover:text-white'}`}
                                >
                                    <HugeiconsIcon icon={t.icon} className="w-4 h-4" strokeWidth={1.8} />
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* BODY */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-6">
                        {/* PERFIL */}
                        {tab === 'perfil' && (
                            <div className="space-y-5 animate-in fade-in duration-200">
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                                    {email && <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-400"><HugeiconsIcon icon={Mail01Icon} className="w-3.5 h-3.5 text-emerald-500" strokeWidth={1.8} />{email}</span>}
                                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-400"><HugeiconsIcon icon={Calendar03Icon} className="w-3.5 h-3.5 text-emerald-500" strokeWidth={1.8} />Miembro desde {joinedStr}</span>
                                    {mainSport && <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-400"><HugeiconsIcon icon={Target01Icon} className="w-3.5 h-3.5 text-emerald-500" strokeWidth={1.8} />{mainSport}{position ? ` · ${position}` : ''}</span>}
                                </div>

                                <div className="p-4 rounded-md border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/2">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Progreso a {siguienteRango.name}</span>
                                        <span className="text-[11px] font-black text-emerald-600 dark:text-[#00df82] font-mono">{progreso}%</span>
                                    </div>
                                    <div className="h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                                        <div className="h-full rounded-full bg-linear-to-r from-emerald-500 to-[#00df82]" style={{ width: `${progreso}%` }} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                                    {[
                                        { label: 'Partidos', val: stats.played || 0, color: 'text-slate-600 dark:text-slate-300', icon: UserGroupIcon },
                                        { label: 'Ganados', val: stats.won || 0, color: 'text-emerald-500', icon: TrophyIcon },
                                        { label: 'Perdidos', val: stats.lost || 0, color: 'text-rose-400', icon: Shield01Icon },
                                        { label: 'Goles', val: stats.goals || 0, color: 'text-amber-500', icon: FireIcon },
                                        { label: 'Asistencias', val: stats.assists || 0, color: 'text-teal-500', icon: SparklesIcon },
                                    ].map((s, i) => (
                                        <div key={i} className="p-3 rounded-md border border-slate-100 dark:border-white/5 bg-white dark:bg-white/2 text-center">
                                            <HugeiconsIcon icon={s.icon} className={`w-4 h-4 mx-auto mb-1.5 ${s.color}`} strokeWidth={1.8} />
                                            <span className={`block text-lg font-black leading-none font-mono ${s.color}`}>{s.val}</span>
                                            <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-1">{s.label}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="space-y-2.5">
                                    <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2"><HugeiconsIcon icon={StarIcon} className="w-3.5 h-3.5 text-emerald-500" strokeWidth={1.8} />Equipos</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {teamList.length > 0 ? teamList.map((t: string, idx: number) => (
                                            <span key={idx} className="px-3 py-1.5 bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-300 text-[10px] font-bold rounded-md uppercase border border-slate-100 dark:border-white/10 flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{t}
                                            </span>
                                        )) : <span className="text-[10px] font-bold text-slate-400 uppercase">Agente libre</span>}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* HISTORIAL */}
                        {tab === 'historial' && (() => {
                            const matches = history.filter(h => !h.isBadge);
                            const wins = matches.filter(m => m.isWin === true && m.displayStatus === 'completed').length;
                            const losses = matches.filter(m => m.isWin === false && m.displayStatus === 'completed').length;
                            const played = matches.filter(m => m.displayStatus === 'completed').length;
                            const winRate = played > 0 ? Math.round((wins / played) * 100) : 0;
                            const totalXp = matches.reduce((acc, m) => acc + (calculateMatchXP(m) || 0), 0);
                            return (
                                <div className="space-y-5 animate-in fade-in duration-200">
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                        <div className="p-3 rounded-md border border-slate-100 dark:border-white/5 bg-white dark:bg-white/2 text-center">
                                            <span className="block text-xl font-black text-slate-900 dark:text-white font-mono leading-none">{matches.length}</span>
                                            <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-1">Partidos</span>
                                        </div>
                                        <div className="p-3 rounded-md border border-emerald-500/25 bg-emerald-500/5 text-center">
                                            <span className="block text-xl font-black text-emerald-600 dark:text-[#00df82] font-mono leading-none">{winRate}%</span>
                                            <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-1">Victorias</span>
                                        </div>
                                        <div className="p-3 rounded-md border border-slate-100 dark:border-white/5 bg-white dark:bg-white/2 text-center">
                                            <span className="block text-xl font-black text-slate-900 dark:text-white font-mono leading-none">{wins}<span className="text-slate-400">/</span>{losses}</span>
                                            <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-1">V / D</span>
                                        </div>
                                        <div className="p-3 rounded-md border border-emerald-500/25 bg-emerald-500/5 text-center">
                                            <span className={`block text-xl font-black font-mono leading-none ${totalXp >= 0 ? 'text-emerald-600 dark:text-[#00df82]' : 'text-rose-500'}`}>{totalXp >= 0 ? `+${totalXp}` : totalXp}</span>
                                            <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-1">XP total</span>
                                        </div>
                                    </div>

                                    {loadingHistory ? (
                                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                                            <HugeiconsIcon icon={RefreshIcon} className="w-7 h-7 animate-spin text-emerald-500 dark:text-[#00df82]" strokeWidth={2} />
                                            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Cargando historial…</span>
                                        </div>
                                    ) : matches.length === 0 ? (
                                        <div className="py-16 flex flex-col items-center justify-center gap-3">
                                            <HugeiconsIcon icon={TrophyIcon} className="w-11 h-11 text-slate-200 dark:text-white/10" strokeWidth={1.5} />
                                            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Sin partidos registrados</p>
                                            <p className="text-[11px] text-slate-400">Aún no hay actividad para este jugador.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {matches.map((m: any) => {
                                                const isWin = m.isWin === true && m.displayStatus === 'completed';
                                                const isLoss = m.isWin === false && m.displayStatus === 'completed';
                                                const isNoShow = m.displayStatus === 'no-show';
                                                const isCancelled = m.displayStatus === 'cancelled';
                                                const rc = isWin ? 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20 dark:text-emerald-400'
                                                    : isLoss ? 'text-rose-600 bg-rose-500/10 border-rose-500/20 dark:text-rose-400'
                                                        : isNoShow ? 'text-red-600 bg-red-500/10 border-red-500/20 dark:text-red-400'
                                                            : isCancelled ? 'text-slate-500 bg-slate-100 border-slate-200 dark:bg-white/5 dark:border-white/10 dark:text-slate-400'
                                                                : 'text-slate-500 bg-slate-100 border-slate-200 dark:bg-white/5 dark:border-white/10 dark:text-slate-400';
                                                const rt = isWin ? 'Victoria' : isLoss ? 'Derrota' : isNoShow ? 'No-Show' : isCancelled ? 'Cancelado' : 'Jugado';
                                                const mXP = calculateMatchXP(m);
                                                return (
                                                    <div key={m.id} className="flex items-center gap-3 p-3.5 rounded-md border border-slate-100 dark:border-white/5 bg-white dark:bg-white/2 hover:border-emerald-300 dark:hover:border-[#00df82]/30 transition-all">
                                                        <div className={`w-10 h-10 rounded-md flex items-center justify-center shrink-0 ${isWin ? 'bg-emerald-500/10 text-emerald-600 dark:text-[#00df82]' : isLoss ? 'bg-rose-500/10 text-rose-500' : 'bg-slate-100 dark:bg-white/5 text-slate-400'}`}>
                                                            <HugeiconsIcon icon={isWin ? TrophyIcon : isLoss ? Shield01Icon : Calendar03Icon} className="w-5 h-5" strokeWidth={1.8} />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-[12px] font-bold text-slate-900 dark:text-white">{(m.sport || 'fútbol').toUpperCase()}</span>
                                                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase border ${rc}`}>{rt}</span>
                                                                {m.isMVP && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"><HugeiconsIcon icon={StarIcon} className="w-3 h-3" strokeWidth={2} />MVP</span>}
                                                            </div>
                                                            <div className="flex items-center gap-x-3 gap-y-1 flex-wrap mt-1.5 text-[10px] font-medium text-slate-400">
                                                                <span className="inline-flex items-center gap-1"><HugeiconsIcon icon={Clock01Icon} className="w-3 h-3" strokeWidth={2} />{m.formattedDate} · {m.startTime || '--:--'}</span>
                                                                <span className="inline-flex items-center gap-1 min-w-0"><HugeiconsIcon icon={MapPinIcon} className="w-3 h-3 shrink-0" strokeWidth={2} /><span className="truncate max-w-[150px]">{m.tenantName || 'MVP Center'}</span></span>
                                                                {m.goals > 0 && <span className="inline-flex items-center gap-1"><HugeiconsIcon icon={FireIcon} className="w-3 h-3 text-rose-500" strokeWidth={2} />{m.goals} goles</span>}
                                                            </div>
                                                        </div>
                                                        <div className="shrink-0 text-right">
                                                            {isCancelled ? <span className="px-2.5 py-1 rounded-md text-[10px] font-black font-mono bg-slate-100 text-slate-400 border border-slate-200 dark:bg-white/5 dark:border-white/10 dark:text-slate-500">0 XP</span>
                                                                : mXP !== null ? <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-black font-mono ${mXP >= 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-[#00df82] border border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'}`}><HugeiconsIcon icon={BoltIcon} className="w-3 h-3" strokeWidth={2} />{mXP >= 0 ? `+${mXP}` : mXP}</span>
                                                                    : <span className="text-[10px] text-slate-400 font-bold">—</span>}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })()}

                        {/* LOGROS */}
                        {tab === 'logros' && (
                            <div className="space-y-5 animate-in fade-in duration-200">
                                <div className="grid grid-cols-3 gap-2.5">
                                    <div className="p-3 rounded-md border border-amber-500/25 bg-amber-500/5 text-center">
                                        <span className="block text-xl font-black text-amber-500 font-mono leading-none">{badgeData.earned.length}</span>
                                        <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-1">Ganadas</span>
                                    </div>
                                    <div className="p-3 rounded-md border border-slate-100 dark:border-white/5 bg-white dark:bg-white/2 text-center">
                                        <span className="block text-xl font-black text-slate-900 dark:text-white font-mono leading-none">{badgeData.locked.length}</span>
                                        <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-1">Pendientes</span>
                                    </div>
                                    <div className="p-3 rounded-md border border-emerald-500/25 bg-emerald-500/5 text-center">
                                        <span className="block text-xl font-black text-emerald-600 dark:text-[#00df82] font-mono leading-none">+{badgeData.earned.reduce((a, b) => a + b.xp, 0)}</span>
                                        <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-1">XP bonus</span>
                                    </div>
                                </div>

                                {badgeData.earned.length > 0 && (
                                    <div className="space-y-2.5">
                                        <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Ganadas</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                            {badgeData.earned.map((b) => (
                                                <div key={b.id} className="flex items-center gap-3 p-3.5 rounded-md border border-slate-100 dark:border-white/5 bg-white dark:bg-white/2">
                                                    <span className={`w-10 h-10 rounded-md flex items-center justify-center shrink-0 ${tierBadgeStyle(b.tier)}`}><HugeiconsIcon icon={b.icon} className="w-5 h-5" strokeWidth={1.8} /></span>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[12px] font-black uppercase text-slate-900 dark:text-white truncate">{b.name}</span>
                                                            <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase ${tierBadgeStyle(b.tier)}`}>{b.tier === 'gold' ? 'Oro' : b.tier === 'silver' ? 'Plata' : 'Bronce'}</span>
                                                        </div>
                                                        <p className="text-[10px] text-slate-400 truncate mt-0.5">{b.value} · {b.desc}</p>
                                                    </div>
                                                    <span className="shrink-0 text-[11px] font-black text-emerald-600 dark:text-[#00df82] font-mono">+{b.xp} XP</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2.5">
                                    <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">En progreso</h3>
                                    {badgeData.locked.length === 0 ? (
                                        <p className="text-[11px] text-slate-400 py-3">¡Todas las insignias desbloqueadas!</p>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                            {badgeData.locked.slice(0, 12).map((b) => (
                                                <div key={b.id} className="flex items-center gap-3 p-3.5 rounded-md border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/2">
                                                    <span className="w-10 h-10 rounded-md bg-slate-200 dark:bg-white/10 text-slate-400 flex items-center justify-center shrink-0"><HugeiconsIcon icon={b.icon} className="w-5 h-5" strokeWidth={1.8} /></span>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <span className="text-[12px] font-bold uppercase text-slate-600 dark:text-slate-300 truncate">{b.name}</span>
                                                            <span className="text-[10px] font-mono text-slate-400 shrink-0">{b.value}/{b.nextTarget}</span>
                                                        </div>
                                                        <div className="mt-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                                                            <div className="h-full rounded-full bg-linear-to-r from-emerald-500 to-[#00df82]" style={{ width: `${b.progress}%` }} />
                                                        </div>
                                                        <p className="text-[9px] text-slate-400 mt-1">Próximo: {b.nextTierName}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
}
