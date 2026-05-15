"use client";
import React, { useEffect, useState } from 'react';
import { db } from '@/services/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
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
                
                // Determinar estado legible
                let displayStatus = 'pending';
                if (data.status === 'completed' || data.checkIn) displayStatus = 'completed';
                else if (data.status === 'confirmed') displayStatus = 'confirmed';
                else if (data.status === 'cancelled') displayStatus = 'cancelled';
                else if (data.status === 'pending') displayStatus = 'pending';

                return {
                    id: doc.id,
                    ...data,
                    displayStatus,
                    dateObj,
                    formattedDate: dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
                };
            }).sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());

            setHistory(matches);
        } catch (error) {
            console.error("Error al cargar historial completo:", error);
        } finally {
            setLoadingHistory(false);
        }
    };

    const calculateMatchXP = (match: any) => {
        if (!gamification) return null;
        let matchXp = 0;
        const sportKey = match.sport ? match.sport.toLowerCase() : 'futbol';
        const overrides = gamification.sportsOverrides?.[sportKey] || { 
            winXP: gamification.xpPerWin || 150, 
            lossXP: gamification.xpPerLoss || 50, 
            countGoals: true, 
            countAssists: true,
            goalXP: gamification.xpPerGoal || 25,
            assistXP: gamification.xpPerAssist || 15
        };
        
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
                                <span className="text-emerald-600 dark:text-emerald-400">{name.toUpperCase()}</span> • {history.length} RESERVAS TOTALES
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

                {/* Contenedor del Historial */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10 bg-white dark:bg-[#0B0F19]">
                    {history.length > 0 ? (
                        <div className="rounded-3xl border border-slate-100 dark:border-white/5 overflow-hidden shadow-sm bg-slate-50/30 dark:bg-white/[0.01]">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5">
                                        <th className="px-6 py-4 text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">FECHA / HORA</th>
                                        <th className="px-6 py-4 text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">DISCIPLINA</th>
                                        <th className="px-6 py-4 text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">UBICACIÓN</th>
                                        <th className="px-6 py-4 text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 text-center">RESULTADO</th>
                                        <th className="px-6 py-4 text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 text-center">PERFORMANCE</th>
                                        <th className="px-6 py-4 text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 text-right">RATING</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                    {history.map((match: any, idx: number) => {
                                        const isCompleted = match.displayStatus === 'completed';
                                        const isConfirmed = match.displayStatus === 'confirmed';
                                        const isCancelled = match.displayStatus === 'cancelled';
                                        const isPending = match.displayStatus === 'pending';
                                        const isWin = match.isWin === true && isCompleted;
                                        const isLoss = match.isWin === false && isCompleted;
                                        
                                        const resultColor = isWin ? 'text-emerald-600 bg-emerald-50 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' : 
                                                            isLoss ? 'text-rose-600 bg-rose-50 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20' : 
                                                            isCancelled ? 'text-slate-500 bg-slate-50 border-slate-200 dark:bg-white/5 dark:border-white/10 dark:text-slate-500' : 
                                                            isConfirmed ? 'text-blue-600 bg-blue-50 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20' :
                                                            isPending ? 'text-amber-600 bg-amber-50 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' :
                                                            'text-indigo-600 bg-indigo-50 border-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20';
                                        
                                        const resultText = isWin ? 'VICTORIA' : isLoss ? 'DERROTA' : isCancelled ? 'CANCELADO' : isConfirmed ? 'CONFIRMADO' : isPending ? 'PENDIENTE' : 'EN PROCESO';
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
                                                            <p className="text-[6px] font-black text-slate-400 dark:text-slate-600 uppercase mt-0.5 tracking-widest">CANCELADO</p>
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
                                    <p className="text-base font-black uppercase tracking-widest">SIN ACTIVIDAD REGISTRADA</p>
                                    <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase">Comienza a jugar para desbloquear tu historial</p>
                                </div>
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}
