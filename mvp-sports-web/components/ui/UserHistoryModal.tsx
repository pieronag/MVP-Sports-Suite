"use client";
import React, { useEffect, useState } from 'react';
import { db } from '@/services/firebase';
import { collection, query, where, getDocs, orderBy, limit, updateDoc, doc } from 'firebase/firestore';
import {
    XMarkIcon,
    ClockIcon,
    CalendarDaysIcon,
    MapPinIcon,
    TrophyIcon,
    StarIcon,
    FireIcon,
    SparklesIcon,
    ShieldCheckIcon,
    BoltIcon
} from '@heroicons/react/24/outline';

interface UserHistoryModalProps {
    user: any;
    isOpen: boolean;
    onClose: () => void;
    gamification?: any;
}

export default function UserHistoryModal({ user, isOpen, onClose, gamification }: UserHistoryModalProps) {
    const [history, setHistory] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [activeTab, setActiveTab] = useState<'partidos' | 'logros'>('partidos');

    useEffect(() => {
        if (isOpen && user?.id) {
            fetchFullHistory();
        }
    }, [isOpen, user?.id]);

    const fetchFullHistory = async () => {
        setLoadingHistory(true);
        try {
            // Buscar por múltiples campos sin orderBy (evita necesitar índices compuestos)
            const queries: any[] = [
                query(collection(db, "bookings"), where("userId", "==", user.id), limit(200)),
            ];
            
            // También buscar por playerId si existe
            queries.push(
                query(collection(db, "bookings"), where("playerId", "==", user.id), limit(200))
            );
            
            // Si tiene email, buscar también por createdBy
            if (user.email && user.email !== '---') {
                queries.push(
                    query(collection(db, "bookings"), where("createdBy", "==", user.email), limit(200))
                );
            }

            // Buscar por clientName para reservas manuales
            if (user.name) {
                queries.push(
                    query(collection(db, "bookings"), where("clientName", "==", user.name), limit(200))
                );
            }

            const snapshots = await Promise.all(queries.map(q => getDocs(q).catch((err: any) => {
                console.warn("Query fallback:", err.message);
                return { docs: [] as any[] };
            })));
            
            // Deduplicar por ID
            const allDocsMap = new Map<string, any>();
            snapshots.forEach(snap => {
                snap.docs.forEach((d: any) => {
                    if (!allDocsMap.has(d.id)) allDocsMap.set(d.id, d);
                });
            });

            const matches = Array.from(allDocsMap.values()).map(doc => {
                const data = doc.data();
                const dateObj = data.date?.seconds 
                    ? new Date(data.date.seconds * 1000) 
                    : (data.date?.toDate ? data.date.toDate() : new Date());
                
                const isNoShow = data.status === 'no-show' || 
                                 data.paymentStatus === 'no-show' || 
                                 data.noShow === true || 
                                 (data.notes && (data.notes.toLowerCase().includes('no-show') || data.notes.toLowerCase().includes('inasistencia')));

                // Determinar estado legible
                let displayStatus = 'pending';
                if (isNoShow) displayStatus = 'no-show';
                else if (data.status === 'completed' || data.checkIn || data.checkOut === true) displayStatus = 'completed';
                else if (data.status === 'confirmed') displayStatus = 'confirmed';
                else if (data.status === 'cancelled') displayStatus = 'cancelled';
                else if (data.status === 'pending') displayStatus = 'pending';

                return {
                    id: doc.id,
                    ...data,
                    displayStatus,
                    dateObj,
                    formattedDate: dateObj.toLocaleDateString('es-CL')
                };
            }).filter(m => m.displayStatus === 'completed' || m.displayStatus === 'cancelled' || m.displayStatus === 'no-show');

            const savedBadges = user?.badges || [];
            const BADGE_XP_VALUES: Record<string, number> = gamification?.badgeXpValues || { bronze: 50, silver: 150, gold: 500 };
            const BADGE_INFO: Record<string, { name: string; color: string }> = {
                scorer: { name: 'Artillero', color: 'rose' },
                playmaker: { name: 'Maestro', color: 'blue' },
                defender: { name: 'Muralla', color: 'emerald' },
                wins: { name: 'Ganador', color: 'amber' },
                mvp: { name: 'Estrella', color: 'indigo' },
                experience: { name: 'Leyenda', color: 'slate' },
                multi_sport: { name: 'Atleta Total', color: 'teal' },
                captaincy: { name: 'Capitán', color: 'sky' },
                comeback: { name: 'Ave Fénix', color: 'yellow' },
                precision: { name: 'Francotirador', color: 'purple' },
                clutch: { name: 'Clutch', color: 'orange' },
                tournaments: { name: 'Competidor', color: 'lime' },
                invictus: { name: 'Invicto', color: 'red' },
                rivalry: { name: 'Verdugo', color: 'cyan' },
                morning_player: { name: 'Madrugador', color: 'amber' },
                night_player: { name: 'Nocturno', color: 'indigo' },
                loyal: { name: 'Fiel', color: 'rose' },
                weekend_warrior: { name: 'Guerrero FDS', color: 'gray' },
                stamina: { name: 'Motor', color: 'emerald' },
                social: { name: 'Sociable', color: 'blue' },
            };

            const BADGE_DESCRIPTIONS: Record<string, string> = {
                scorer: 'Goles anotados en la carrera deportiva',
                playmaker: 'Asistencias que terminaron en gol',
                defender: 'Partidos defendidos con valla invicta',
                wins: 'Victorias acumuladas en partidos competitivos',
                mvp: 'Premios al Jugador Más Valioso (MVP)',
                experience: 'Partidos totales completados en la plataforma',
                multi_sport: 'Complejos deportivos diferentes visitados',
                captaincy: 'Partidos oficiales liderados como capitán',
                comeback: 'Victorias épicas logradas remontando el marcador',
                precision: 'Goles convertidos con precisión milimétrica',
                clutch: 'Goles decisivos anotados en los últimos minutos',
                tournaments: 'Participaciones en campeonatos y torneos oficiales',
                invictus: 'Racha de victorias consecutivas sin perder',
                rivalry: 'Clásicos y partidos de alta rivalidad ganados',
                morning_player: 'Partidos jugados en horario de mañana',
                night_player: 'Partidos jugados en horario nocturno',
                loyal: 'Meses de constancia y fidelidad en la plataforma',
                weekend_warrior: 'Partidos jugados los sábados o domingos',
                stamina: 'Minutos de juego totales acumulados en cancha',
                social: 'Nuevos jugadores recomendados e invitados a unirse'
            };

            const stats = user?.stats || {};
            let rawJoined = new Date();
            if (user?.rawJoined) {
                rawJoined = new Date(user.rawJoined);
            } else if (user?.raw?.createdAt?.toDate) {
                rawJoined = user.raw.createdAt.toDate();
            } else if (user?.raw?.createdAt?.seconds) {
                rawJoined = new Date(user.raw.createdAt.seconds * 1000);
            } else if (user?.raw?.createdAt) {
                rawJoined = new Date(user.raw.createdAt);
            } else if (user?.createdAt?.toDate) {
                rawJoined = user.createdAt.toDate();
            } else if (user?.createdAt?.seconds) {
                rawJoined = new Date(user.createdAt.seconds * 1000);
            } else if (user?.createdAt) {
                rawJoined = new Date(user.createdAt);
            } else if (user?.joinedDate) {
                rawJoined = new Date(user.joinedDate);
            } else if (user?.joined) {
                rawJoined = new Date(user.joined);
            }
            const daysActive = Math.max(1, (new Date().getTime() - rawJoined.getTime()) / (1000 * 60 * 60 * 24));

            const statsMap: Record<string, number> = {
                scorer: stats.goals || 0, playmaker: stats.assists || 0,
                defender: stats.clean_sheets || 0, wins: stats.won || 0,
                mvp: stats.mvps || stats.mvp || 0,
                experience: stats.played || 0, multi_sport: stats.sports_played || 1,
                captaincy: stats.captain_matches || 0, comeback: stats.comebacks || 0,
                precision: stats.precision_matches || 0, clutch: stats.clutch_goals || 0,
                tournaments: stats.tournaments_played || 0, invictus: stats.longest_win_streak || 0,
                rivalry: stats.rivalries_won || 0, morning_player: stats.morning_matches || 0,
                night_player: stats.night_matches || 0, loyal: Math.floor(daysActive / 30),
                weekend_warrior: stats.weekend_matches || 0,
                stamina: stats.minutes_played || (stats.played || 0) * 60,
                social: stats.invited_players || 0
            };

            const badgeConfigs = gamification?.badges || {};
            const computedBadgesMap = new Map<string, string>(); // badgeId -> tier

            // 1. Cargar las guardadas por Bulk Sync
            const normalizeBadgeId = (id: string): string => {
                const normMap: Record<string, string> = {
                    goals: 'scorer', assists: 'playmaker', clean_sheets: 'defender',
                    won: 'wins', played: 'experience', sports_played: 'multi_sport',
                    loyalty: 'loyal'
                };
                return normMap[id] || id;
            };
            savedBadges.forEach((b: any) => {
                if (b.tier) {
                    const normId = normalizeBadgeId(b.id);
                    computedBadgesMap.set(normId, b.tier);
                }
            });

            // 2. Fusionar con cálculo local tomando el nivel más alto
            const tierScores: Record<string, number> = { gold: 3, silver: 2, bronze: 1 };
            Object.keys(BADGE_INFO).forEach(id => {
                const dbKeys: Record<string, string> = {
                    scorer: 'goals',
                    playmaker: 'assists',
                    defender: 'clean_sheets',
                    wins: 'won',
                    experience: 'played',
                    multi_sport: 'sports_played',
                    loyal: 'loyalty'
                };
                const dbKey = dbKeys[id] || id;
                const config = badgeConfigs[id] || badgeConfigs[dbKey] || { bronze: 5, silver: 15, gold: 30 };
                const userVal = statsMap[id] || 0;
                let computedTier: string | null = null;

                const goldVal = Number(config.gold || 0);
                const silverVal = Number(config.silver || 0);
                const bronzeVal = Number(config.bronze || 0);

                if (userVal > 0) {
                    if (goldVal > 0 && userVal >= goldVal) computedTier = 'gold';
                    else if (silverVal > 0 && userVal >= silverVal) computedTier = 'silver';
                    else if (bronzeVal > 0 && userVal >= bronzeVal) computedTier = 'bronze';
                }

                if (computedTier) {
                    const existingTier = computedBadgesMap.get(id);
                    if (!existingTier || (tierScores[computedTier] > tierScores[existingTier])) {
                        computedBadgesMap.set(id, computedTier);
                    }
                } else {
                    computedBadgesMap.delete(id);
                }
            });

            const finalBadges = Array.from(computedBadgesMap.entries())
                .map(([id, tier]) => ({ id, tier }))
                .sort((a, b) => (tierScores[b.tier] || 0) - (tierScores[a.tier] || 0));

            const badgeHistory = finalBadges.map((badge: any, idx: number) => {
                const info = BADGE_INFO[badge.id] || { name: 'Logro', color: 'amber' };
                const xpBonus = BADGE_XP_VALUES[badge.tier] || 0;
                const tierNames: Record<string, string> = { gold: 'ORO', silver: 'PLATA', bronze: 'BRONCE' };
                
                const dateObj = user.lastBulkSync ? new Date(user.lastBulkSync) : new Date();
                dateObj.setSeconds(dateObj.getSeconds() - idx * 60);

                return {
                    isBadge: true,
                    id: badge.id,
                    badgeName: info.name,
                    badgeTier: tierNames[badge.tier] || 'BRONCE',
                    badgeColor: info.color,
                    badgeDesc: BADGE_DESCRIPTIONS[badge.id] || 'Hito deportivo superado',
                    xpBonus,
                    dateObj,
                    formattedDate: dateObj.toLocaleDateString('es-CL')
                };
            });

            const allItems = [
                ...matches,
                ...badgeHistory
            ].sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());

            setHistory(allItems);

        } catch (error) {
            console.error("Error al cargar historial completo:", error);
        } finally {
            setLoadingHistory(false);
        }
    };

    function calculateMatchXP(match: any) {
        if (!gamification) return null;
        let matchXp = 0;
        const sportKey = match.sport ? match.sport.toLowerCase() : 'futbol';
        const defaultOverrides = { 
            winXP: gamification.xpPerWin || 150, 
            lossXP: gamification.xpPerLoss || 50, 
            countGoals: true, 
            countAssists: true,
            goalXP: gamification.xpPerGoal || 25,
            assistXP: gamification.xpPerAssist || 15
        };
        const overrides = {
            ...defaultOverrides,
            ...(gamification.sportsOverrides?.[sportKey] || {})
        };
        
        if (match.displayStatus === 'no-show') {
            return -(gamification.xpPerNoShow || 50);
        }

        const isCompleted = match.status === 'completed' || match.checkIn;
        if (!isCompleted) return null;

        const isW = match.isWin === true;
        const isL = match.isWin === false;

        matchXp += (gamification.xpPerMatch || 100);
        if (match.checkIn) matchXp += (gamification.xpPerCheckin || 50);

        if (isW) matchXp += overrides.winXP;
        else if (isL) matchXp -= overrides.lossXP;

        if (overrides.countGoals && match.goals) {
            matchXp += match.goals * (overrides.goalXP !== undefined ? overrides.goalXP : 25);
        }
        if (overrides.countAssists && match.assists) {
            matchXp += match.assists * (overrides.assistXP !== undefined ? overrides.assistXP : 15);
        }
        if (match.isMVP) matchXp += (gamification.xpPerMvp || 200);
        
        return matchXp;
    };

    if (!isOpen || !user) return null;

    const name = user.name || user.displayName || 'Jugador';
    const totalHistoryXP = history.reduce((sum, match) => {
        const xp = calculateMatchXP(match);
        return sum + (xp || 0);
    }, 0);

    const filteredHistory = history.filter(item => {
        if (activeTab === 'partidos') return !item.isBadge;
        return item.isBadge;
    });

    if (activeTab === 'logros') {
        const tierOrder: Record<string, number> = { 'ORO': 3, 'PLATA': 2, 'BRONCE': 1 };
        filteredHistory.sort((a, b) => (tierOrder[b.badgeTier] || 0) - (tierOrder[a.badgeTier] || 0));
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div
                className="bg-white dark:bg-[#0B0F19] w-full max-w-5xl rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.3)] border border-slate-100 dark:border-white/5 overflow-hidden flex flex-col relative max-h-[90vh] animate-in zoom-in duration-500"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header Fijo */}
                <div className="shrink-0 p-8 md:p-10 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] flex justify-between items-center relative z-10">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-emerald-500 dark:bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-lg shadow-emerald-500/20">
                            <ClockIcon className="w-7 h-7 text-white dark:text-emerald-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tighter uppercase leading-none mb-1">
                                HISTORIAL <span className="text-emerald-500">DEPORTIVO</span>
                            </h2>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <span className="text-emerald-600 dark:text-emerald-400">{name.toUpperCase()}</span> • {history.filter(h => !h.isBadge).length} PARTIDOS • {history.filter(h => h.isBadge).length} LOGROS
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 text-slate-300 hover:bg-white dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white rounded-2xl transition-all shadow-sm active:scale-90"
                    >
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                    {loadingHistory && (
                        <div className="absolute bottom-0 left-0 h-1 bg-emerald-500 animate-pulse w-full"></div>
                    )}
                </div>

                {/* Selector de Pestañas */}
                <div className="shrink-0 px-8 py-3 border-b border-slate-100 dark:border-white/5 bg-slate-50/20 dark:bg-white/[0.01] flex gap-4">
                    <button
                        onClick={() => setActiveTab('partidos')}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${
                            activeTab === 'partidos'
                                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                                : 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-white'
                        }`}
                    >
                        ⚽ Partidos ({history.filter(h => !h.isBadge).length})
                    </button>
                    <button
                        onClick={() => setActiveTab('logros')}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${
                            activeTab === 'logros'
                                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                                : 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-white'
                        }`}
                    >
                        🏆 Logros ({history.filter(h => h.isBadge).length})
                    </button>
                </div>

                {/* Contenedor del Historial */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10 bg-white dark:bg-[#0B0F19]">
                    {filteredHistory.length > 0 ? (
                        <div className="rounded-3xl border border-slate-100 dark:border-white/5 overflow-hidden shadow-sm bg-slate-50/30 dark:bg-white/[0.01]">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    {activeTab === 'partidos' ? (
                                        <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5">
                                            <th className="px-6 py-4 text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">FECHA / HORA</th>
                                            <th className="px-6 py-4 text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">DISCIPLINA</th>
                                            <th className="px-6 py-4 text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">UBICACIÓN</th>
                                            <th className="px-6 py-4 text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 text-center">RESULTADO</th>
                                            <th className="px-6 py-4 text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 text-center">PERFORMANCE</th>
                                            <th className="px-6 py-4 text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 text-right">RATING</th>
                                        </tr>
                                    ) : (
                                        <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5">
                                            <th className="px-6 py-4 text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">FECHA</th>
                                            <th colSpan={4} className="px-6 py-4 text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">LOGRO DESBLOQUEADO</th>
                                            <th className="px-6 py-4 text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 text-right">RECOMPENSA</th>
                                        </tr>
                                    )}
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                    {filteredHistory.map((match: any, idx: number) => {
                                        if (match.isBadge) {
                                            const tierStyles: Record<string, { text: string; bg: string; border: string }> = {
                                                'ORO': { text: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
                                                'PLATA': { text: 'text-slate-400', bg: 'bg-slate-400/10', border: 'border-slate-400/20' },
                                                'BRONCE': { text: 'text-amber-800 dark:text-amber-600', bg: 'bg-amber-900/10', border: 'border-amber-900/20' }
                                            };
                                            const tierStyle = tierStyles[match.badgeTier] || tierStyles['BRONCE'];
                                            
                                            return (
                                                <tr key={`badge-${match.id}-${idx}`} className="bg-emerald-500/[0.02] hover:bg-emerald-500/[0.04] transition-all group">
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="text-[10px] font-black text-emerald-500 dark:text-emerald-400 font-mono">{match.formattedDate}</span>
                                                            <span className="text-[8px] font-black text-slate-400 uppercase flex items-center gap-1">LOGRO</span>
                                                        </div>
                                                    </td>
                                                    <td colSpan={4} className="px-6 py-4">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-500 shadow-sm animate-pulse`}>
                                                                <TrophyIcon className="w-4 h-4" />
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-3">
                                                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-800 dark:text-white">
                                                                        {match.badgeName}
                                                                    </span>
                                                                    <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[7px] font-black uppercase tracking-widest border ${tierStyle.bg} ${tierStyle.text} ${tierStyle.border}`}>
                                                                        {match.badgeTier}
                                                                    </span>
                                                                </div>
                                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                                                    {match.badgeDesc}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex flex-col items-end">
                                                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg border text-[11px] font-black font-mono shadow-sm bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                                                                +{match.xpBonus}XP
                                                            </span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        }

                                        const isCompleted = match.displayStatus === 'completed';
                                        const isConfirmed = match.displayStatus === 'confirmed';
                                        const isCancelled = match.displayStatus === 'cancelled';
                                        const isPending = match.displayStatus === 'pending';
                                        const isNoShow = match.displayStatus === 'no-show';
                                        const isWin = match.isWin === true && isCompleted;
                                        const isLoss = match.isWin === false && isCompleted;
                                        
                                        const resultColor = isWin ? 'text-emerald-600 bg-emerald-50 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' : 
                                                            isLoss ? 'text-rose-600 bg-rose-50 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20' : 
                                                            isNoShow ? 'text-red-600 bg-red-50 border-red-200 dark:bg-red-500/10 dark:text-red-500 dark:border-red-500/20' :
                                                            isCancelled ? 'text-slate-500 bg-slate-50 border-slate-200 dark:bg-white/5 dark:border-white/10 dark:text-slate-500' :
                                                             isCompleted ? 'text-slate-600 bg-slate-50 border-slate-100 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20' : 
                                                            isConfirmed ? 'text-blue-600 bg-blue-50 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20' :
                                                            isPending ? 'text-amber-600 bg-amber-50 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' :
                                                            'text-indigo-600 bg-indigo-50 border-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20';
                                        
                                        const resultText = isWin ? 'VICTORIA' : isLoss ? 'DERROTA' : isNoShow ? 'CANCELADO POR INASISTENCIA' : isCancelled ? (match.cancelledBy ? 'CANCELADO POR JUGADOR' : 'ANULADO') : isCompleted ? 'FINALIZADO' : isConfirmed ? 'CONFIRMADO' : isPending ? 'PENDIENTE' : 'EN PROCESO';
                                        const sportName = match.sport ? match.sport.toUpperCase() : 'FÚTBOL';
                                        const matchXP = calculateMatchXP(match);

                                        return (
                                            <tr key={match.id} className="hover:bg-white dark:hover:bg-white/[0.02] transition-all group">
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-[10px] font-black text-slate-700 dark:text-white font-mono">{match.formattedDate}</span>
                                                        <span className="text-[8px] font-black text-slate-400 uppercase flex items-center gap-1"><ClockIcon className="w-3 h-3 text-emerald-500"/> {match.startTime || '--:--'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-[9px] font-black uppercase text-slate-900 dark:text-slate-300 tracking-[0.1em]">
                                                        {sportName}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                                                            <MapPinIcon className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600" />
                                                        </div>
                                                        <span className="text-[9px] font-black text-slate-600 dark:text-slate-400 uppercase truncate max-w-[120px]">{match.tenantName || 'MVP Center'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`inline-flex items-center justify-center px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border shadow-sm ${resultColor}`}>
                                                        {resultText}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                                        {match.goals !== undefined && match.goals > 0 && (
                                                            <div title="Goles / Puntos" className="flex items-center gap-1 text-[9px] font-black text-slate-700 dark:text-white bg-white dark:bg-white/5 px-2 py-0.5 rounded-lg border border-slate-100 dark:border-white/10 shadow-sm">
                                                                <FireIcon className="w-3 h-3 text-rose-500" /> {match.goals}
                                                            </div>
                                                        )}
                                                        {match.isMVP && (
                                                            <div title="Mejor Jugador" className="flex items-center gap-1 text-[9px] font-black text-amber-600 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-200/30 dark:border-amber-500/20 shadow-sm">
                                                                <StarIcon className="w-3 h-3" /> MVP
                                                            </div>
                                                        )}
                                                        {(!match.goals && !match.isMVP) && (
                                                            <span className="text-[9px] font-bold text-slate-300 dark:text-slate-800 tracking-widest">---</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {isCancelled ? (
                                                        <div className="flex flex-col items-end">
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-black font-mono shadow-sm bg-slate-100 text-slate-400 border-slate-200 dark:bg-white/5 dark:border-white/10 dark:text-slate-500">
                                                                0XP
                                                            </span>
                                                            <p className="text-[6px] font-black text-slate-400 dark:text-slate-600 uppercase mt-0.5 tracking-widest">SIN PUNTOS</p>
                                                        </div>
                                                    ) : matchXP !== null ? (
                                                        <div className="flex flex-col items-end">
                                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-black font-mono shadow-sm ${matchXP >= 0 ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-rose-500 text-white border-rose-400'}`}>
                                                                <BoltIcon className="w-3 h-3" />
                                                                {matchXP >= 0 ? `+${matchXP}` : matchXP}
                                                            </span>
                                                            <p className="text-[6px] font-black text-slate-400 dark:text-slate-600 uppercase mt-0.5 tracking-widest">Puntos ELO</p>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[9px] text-slate-300 dark:text-slate-800 font-bold">PROCESANDO</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        !loadingHistory && (
                            <div className="py-32 flex flex-col items-center justify-center text-slate-300 dark:text-slate-800 space-y-6">
                                <TrophyIcon className="w-20 h-20 opacity-10 animate-bounce" />
                                <div className="text-center">
                                    <p className="text-base font-black uppercase tracking-widest">
                                        {activeTab === 'partidos' ? 'SIN PARTIDOS REGISTRADOS' : 'SIN LOGROS CONSEGUIDOS'}
                                    </p>
                                    <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase">
                                        {activeTab === 'partidos' ? 'Comienza a jugar para desbloquear tu historial' : 'Completa hitos deportivos para ganar medallas'}
                                    </p>
                                </div>
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}
