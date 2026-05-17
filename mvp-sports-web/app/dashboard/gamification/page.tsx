"use client";
import React, { useState, useEffect } from 'react';
import {
    TrophyIcon,
    SparklesIcon,
    DocumentCheckIcon,
    ArrowPathIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    StarIcon,
    MinusCircleIcon,
    PresentationChartLineIcon,
    FireIcon,
    NoSymbolIcon,
    ShieldExclamationIcon,
    ShieldCheckIcon,
    CpuChipIcon,
    CircleStackIcon,
    BoltIcon,
    ChevronRightIcon,
    ChartBarIcon,
    CheckBadgeIcon,
    PlusIcon
} from '@heroicons/react/24/outline';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { PanelGlass, TarjetaKpi } from '@/components/ui/DashboardWidgets';

interface GamificationParams {
    xpPerCheckin: number;
    xpPerMatch: number;
    xpPerWin: number;
    xpPerMvp: number;
    xpPerGoal: number;
    xpPerAssist: number;
    xpPerLoss: number;
    xpPerNoShow: number;
    sportsOverrides: Record<string, { winXP: number; lossXP: number; countGoals: boolean; countAssists: boolean; goalXP?: number; assistXP?: number }>;
    badgeXpValues: {
        bronze: number;
        silver: number;
        gold: number;
    };
    tiers: {
        bronze: number;
        silver: number;
        gold: number;
        platinum: number;
        diamond: number;
        elite: number;
        legend: number;
    }
}

const DEFAULT_PARAMS: GamificationParams = {
    xpPerCheckin: 50,
    xpPerMatch: 100,
    xpPerWin: 150,
    xpPerMvp: 200,
    xpPerGoal: 25,
    xpPerAssist: 15,
    xpPerLoss: 50,
    xpPerNoShow: 150,
    sportsOverrides: {
        futbol: { winXP: 150, lossXP: 50, countGoals: true, countAssists: true, goalXP: 25, assistXP: 15 },
        futbolito: { winXP: 150, lossXP: 50, countGoals: true, countAssists: true, goalXP: 25, assistXP: 15 },
        padel: { winXP: 250, lossXP: 100, countGoals: false, countAssists: false, goalXP: 0, assistXP: 0 },
        tenis: { winXP: 250, lossXP: 100, countGoals: false, countAssists: false, goalXP: 0, assistXP: 0 },
        basquetbol: { winXP: 180, lossXP: 60, countGoals: false, countAssists: false, goalXP: 5, assistXP: 5 }
    },
    badgeXpValues: {
        bronze: 50,
        silver: 150,
        gold: 500
    },
    tiers: {
        bronze: 0,
        silver: 1000,
        gold: 3000,
        platinum: 6000,
        diamond: 10000,
        elite: 15000,
        legend: 25000
    }
};

const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className={`fixed top-5 right-5 z-[150] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border animate-slideIn 
            \${type === 'success' ? 'bg-white border-emerald-500 text-emerald-700 dark:bg-[#0B0F19] dark:text-emerald-400 dark:border-emerald-500/50' : 'bg-white border-red-500 text-red-700 dark:bg-[#0B0F19] dark:text-red-400 dark:border-red-500/50'}`}>
            {type === 'success' ? <CheckCircleIcon className="w-5 h-5 text-emerald-500" /> : <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />}
            <span className="text-[10px] font-black uppercase tracking-widest">{message}</span>
        </div>
    );
};

export default function GamificationSettingsPage() {
    const [params, setParams] = useState<GamificationParams>(DEFAULT_PARAMS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedSport, setSelectedSport] = useState<string>('futbol');
    const [notification, setNotification] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);

    const notify = (msg: string, type: 'success' | 'error') => setNotification({ msg, type });

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const docRef = doc(db, 'settings', 'global');
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    const data = snap.data();
                    if (data.gamification) {
                        setParams({
                            ...DEFAULT_PARAMS,
                            ...data.gamification,
                            sportsOverrides: {
                                ...DEFAULT_PARAMS.sportsOverrides,
                                ...(data.gamification.sportsOverrides || {})
                            },
                            badgeXpValues: {
                                ...DEFAULT_PARAMS.badgeXpValues,
                                ...(data.gamification.badgeXpValues || {})
                            },
                            tiers: {
                                ...DEFAULT_PARAMS.tiers,
                                ...(data.gamification.tiers || {})
                            }
                        } as GamificationParams);
                    }
                }
            } catch (error) {
                console.error("Error cargando gamificación:", error);
                notify("Error al cargar configuración", "error");
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            const docRef = doc(db, 'settings', 'global');
            await setDoc(docRef, { gamification: params }, { merge: true });
            notify("Reglas de gamificación actualizadas", "success");
        } catch (error) {
            console.error("Error guardando:", error);
            notify("Error al guardar reglas", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (field: keyof GamificationParams, value: number) => {
        setParams(prev => ({ ...prev, [field]: value }));
    };

    const handleTierChange = (tier: keyof GamificationParams['tiers'], value: number) => {
        setParams(prev => ({ ...prev, tiers: { ...prev.tiers, [tier]: value } }));
    };

    const handleSportOverrideChange = (sport: string, field: string, value: any) => {
        setParams(prev => ({
            ...prev,
            sportsOverrides: {
                ...prev.sportsOverrides,
                [sport]: {
                    ...prev.sportsOverrides[sport],
                    [field]: value
                }
            }
        }));
    };

    if (loading) return (
        <div className="flex h-full w-full items-center justify-center text-slate-400 text-[10px] font-bold uppercase gap-2 py-20">
            <ArrowPathIcon className="w-4 h-4 animate-spin" /> Localizando motor de mérito...
        </div>
    );

    return (
        <div className="space-y-4 pb-12 font-sans text-slate-600 dark:text-slate-300 transition-all duration-300">
            {notification && <Toast message={notification.msg} type={notification.type} onClose={() => setNotification(null)} />}

            <div className="space-y-5">
            {/* 1. CABECERA ADN PREMIUM */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 dark:border-white/5 pb-8">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="w-8 h-[2px] bg-emerald-500 rounded-full"></span>
                        <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 tracking-[0.3em] uppercase">
                            Economía del Jugador & Progresión
                        </p>
                    </div>
                    <h1 className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none">
                        Motor de <span className="text-emerald-500">Gamificación</span>
                    </h1>
                </div>

                <div className="flex items-center gap-3 p-1.5 rounded-2xl">
                    <button 
                        onClick={handleSave} 
                        disabled={saving} 
                        className="px-10 py-3 bg-emerald-500 text-white dark:text-slate-950 font-black text-[10px] uppercase tracking-[0.2em] rounded-xl transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-emerald-500/30 flex items-center gap-3 disabled:opacity-50 border-none"
                    >
                        {saving ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <CheckBadgeIcon className="w-4 h-4" />} 
                        {saving ? 'SINCRONIZANDO...' : 'GUARDAR CAMBIOS'}
                    </button>
                </div>
            </div>
            </div>

            {/* KPI RECAP */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <TarjetaKpi titulo="Check-In Base" valor={`+${params.xpPerCheckin}`} icono={<CheckCircleIcon />} sub="XP por Asistencia" brillo />
                <TarjetaKpi titulo="Bono MVP" valor={`+${params.xpPerMvp}`} icono={<SparklesIcon />} sub="Reconocimiento" />
                <TarjetaKpi titulo="Inasistencia" valor={`-${params.xpPerNoShow}`} icono={<ShieldExclamationIcon />} sub="Penalidad Crítica" />
            </div>

            <div className="flex flex-col gap-6">
                {/* REGLAS GLOBALES (Combinadas) */}
                <PanelGlass className="p-6 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-500"><FireIcon className="w-5 h-5" /></div>
                            <div>
                                <h2 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-widest leading-none">Reglas Generales de Plataforma</h2>
                                <p className="text-[9px] text-slate-400 uppercase font-bold tracking-tighter mt-1">Configuración transversal de XP (aplicable a todos los deportes)</p>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <XPInputCard label="Check-In" value={params.xpPerCheckin} onChange={(v) => handleChange('xpPerCheckin', v)} icon={<CheckCircleIcon className="w-5 h-5 text-emerald-500" />} desc="Asistencia" />
                        <XPInputCard label="Partido Jugado" value={params.xpPerMatch} onChange={(v) => handleChange('xpPerMatch', v)} icon={<PresentationChartLineIcon className="w-5 h-5 text-blue-500" />} desc="Finalización" />
                        <XPInputCard label="Bono MVP" value={params.xpPerMvp} onChange={(v) => handleChange('xpPerMvp', v)} icon={<StarIcon className="w-5 h-5 text-indigo-500" />} desc="Destacado" />
                        <XPInputCard label="Inasistencia" value={params.xpPerNoShow} onChange={(v) => handleChange('xpPerNoShow', v)} icon={<ExclamationTriangleIcon className="w-5 h-5 text-red-500" />} isNegative desc="Penalidad" />
                    </div>
                </PanelGlass>

                {/* REGLAS DE LOGROS/MEDALLAS */}
                <PanelGlass className="p-6 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-500/10 rounded-xl text-amber-500"><TrophyIcon className="w-5 h-5" /></div>
                            <div>
                                <h2 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-widest leading-none">Economía de Logros e Insignias</h2>
                                <p className="text-[9px] text-slate-400 uppercase font-bold tracking-tighter mt-1">XP otorgada por cada nivel de medalla alcanzado</p>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <XPInputCard 
                            label="Medalla Bronce" 
                            value={params.badgeXpValues?.bronze ?? 50} 
                            onChange={(v) => setParams(prev => ({ ...prev, badgeXpValues: { ...prev.badgeXpValues, bronze: v } }))} 
                            icon={<TrophyIcon className="w-5 h-5 text-amber-600" />} 
                            desc="Recompensa Bronce" 
                        />
                        <XPInputCard 
                            label="Medalla Plata" 
                            value={params.badgeXpValues?.silver ?? 150} 
                            onChange={(v) => setParams(prev => ({ ...prev, badgeXpValues: { ...prev.badgeXpValues, silver: v } }))} 
                            icon={<TrophyIcon className="w-5 h-5 text-slate-400" />} 
                            desc="Recompensa Plata" 
                        />
                        <XPInputCard 
                            label="Medalla Oro" 
                            value={params.badgeXpValues?.gold ?? 500} 
                            onChange={(v) => setParams(prev => ({ ...prev, badgeXpValues: { ...prev.badgeXpValues, gold: v } }))} 
                            icon={<TrophyIcon className="w-5 h-5 text-amber-400" />} 
                            desc="Recompensa Oro" 
                        />
                    </div>
                </PanelGlass>

                    {/* MATRIZ DE MODIFICADORES POR DEPORTE */}
                    <PanelGlass className="p-0 overflow-hidden border-none shadow-xl shadow-slate-200/20">
                        <div className="p-5 bg-slate-50/50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="w-1.5 h-6 bg-indigo-500 rounded-full"></div>
                                <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-900 dark:text-white">Matriz de Reglas por Deporte</h2>
                            </div>
                        </div>
                        <div className="p-6 space-y-3">
                            {Object.entries(params.sportsOverrides || {}).map(([sport, config]) => (
                                <div key={sport} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-[#0B0F19] rounded-2xl border border-slate-200 dark:border-white/10 hover:border-indigo-500/30 transition-all group">
                                    <div className="flex items-center gap-3 w-40 shrink-0">
                                        <div className="w-8 h-8 rounded-xl bg-white dark:bg-white/5 flex items-center justify-center border border-slate-200 dark:border-white/10 shadow-sm group-hover:scale-110 transition-transform">
                                            <TrophyIcon className="w-4 h-4 text-indigo-500" />
                                        </div>
                                        <h3 className="text-[10px] font-black uppercase text-slate-800 dark:text-white tracking-widest">{sport}</h3>
                                    </div>

                                    <div className="flex flex-1 flex-wrap items-center gap-3">
                                        {[
                                            { label: 'Victoria', value: config.winXP, field: 'winXP', color: 'text-emerald-500' },
                                            { label: 'Derrota', value: config.lossXP, field: 'lossXP', color: 'text-rose-500' },
                                            { label: 'Gol', value: config.goalXP ?? (config.countGoals ? 25 : 0), field: 'goalXP', color: 'text-indigo-500' },
                                            { label: 'Asist', value: config.assistXP ?? (config.countAssists ? 15 : 0), field: 'assistXP', color: 'text-sky-500' }
                                        ].map(input => (
                                            <div key={input.field} className="flex items-center gap-2 bg-white dark:bg-[#131A2B] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/5 shadow-sm">
                                                <span className="text-[7px] font-black uppercase text-slate-400 tracking-widest">{input.label}</span>
                                                <input 
                                                    type="number" 
                                                    className={`w-12 bg-transparent outline-none text-[11px] font-black ${input.color} text-right`} 
                                                    value={input.value} 
                                                    onChange={(e) => handleSportOverrideChange(sport, input.field, Number(e.target.value))} 
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </PanelGlass>
                </div>

                {/* ESCALAFÓN GLOBAL */}
                <PanelGlass className="p-0 overflow-hidden border-none shadow-xl shadow-slate-200/20">
                    <div className="p-5 bg-slate-50/50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-6 bg-emerald-500 rounded-full"></div>
                            <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-900 dark:text-white">Escalafón Global</h2>
                        </div>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                            {params.tiers && (
                                <>
                                    <TierCard label="Bronce" value={params.tiers.bronze} onChange={(v) => handleTierChange('bronze', v)} color="orange" icon={<ShieldExclamationIcon className="w-4 h-4" />} />
                                    <TierCard label="Plata" value={params.tiers.silver} onChange={(v) => handleTierChange('silver', v)} color="slate" icon={<ShieldCheckIcon className="w-4 h-4" />} />
                                    <TierCard label="Oro" value={params.tiers.gold} onChange={(v) => handleTierChange('gold', v)} color="yellow" icon={<CpuChipIcon className="w-4 h-4" />} />
                                    <TierCard label="Platino" value={params.tiers.platinum} onChange={(v) => handleTierChange('platinum', v)} color="blue" icon={<CircleStackIcon className="w-4 h-4" />} />
                                    <TierCard label="Diamante" value={params.tiers.diamond} onChange={(v) => handleTierChange('diamond', v)} color="indigo" icon={<BoltIcon className="w-4 h-4" />} />
                                    <TierCard label="Elite" value={params.tiers.elite} onChange={(v) => handleTierChange('elite', v)} color="emerald" icon={<SparklesIcon className="w-4 h-4" />} highlight />
                                    <TierCard label="Leyenda" value={params.tiers.legend} onChange={(v) => handleTierChange('legend', v)} color="rose" icon={<TrophyIcon className="w-4 h-4" />} highlight />
                                </>
                            )}
                        </div>
                    </div>
                </PanelGlass>

            <div className="mt-4">
                <OverallEngine tiers={params.tiers} />
            </div>
        </div>
    );
}

function OverallEngine({ tiers }: { tiers: any }) {
    const [testXP, setTestXP] = useState(5000);
    const calculateOverall = (xp: number) => {
        const base = 40;
        const maxXP = tiers?.legend || 25000;
        const range = 99 - base;
        const progress = Math.min(1, Math.sqrt(xp / maxXP));
        return Math.floor(base + (progress * range));
    };
    const overall = calculateOverall(testXP);
    
    const maxXP = tiers?.legend || 25000;
    const activeStars = Math.round(Math.min(1, testXP / maxXP) * 5);

    return (
        <PanelGlass className="p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/[0.05] blur-[120px] rounded-full -mr-40 -mt-40" />

            <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
                <div className="relative group">
                    <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full scale-0 group-hover:scale-150 transition-transform duration-1000"></div>
                    <div className="w-36 h-36 rounded-full border-[10px] border-slate-900/5 dark:border-white/5 flex items-center justify-center relative shadow-2xl bg-white dark:bg-slate-900">
                        <div className="text-center">
                            <p className="text-[8px] font-black uppercase text-slate-400 tracking-tighter">NIVEL GENERAL</p>
                            <p className="text-5xl font-black text-slate-900 dark:text-white leading-none tracking-tighter">{overall}</p>
                            <div className="flex items-center justify-center gap-0.5 mt-1">
                                {[...Array(5)].map((_, i) => (
                                    <StarIcon key={i} className={`w-2 h-2 ${i < activeStars ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 space-y-6 w-full">
                    <div className="space-y-1">
                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                            <CpuChipIcon className="w-5 h-5 text-emerald-500" />
                            SIMULADOR DE ALGORITMO ELO
                        </h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Valida la progresión del jugador en tiempo real</p>
                    </div>

                    <div className="space-y-4 bg-slate-50 dark:bg-white/[0.02] p-6 rounded-xl border border-slate-200 dark:border-white/5 shadow-inner">
                        <div className="flex justify-between items-center px-1">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Experiencia Acumulada</span>
                            <span className="text-lg font-black text-black dark:text-emerald-500 font-mono tracking-tighter">{testXP.toLocaleString()} <span className="text-[10px] text-slate-400">XP</span></span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max={maxXP}
                            value={testXP}
                            onChange={(e) => setTestXP(Number(e.target.value))}
                            className="w-full h-1.5 bg-slate-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                        />
                        <div className="flex justify-between text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">
                            <span>0 XP (BRONCE)</span>
                            <span>{maxXP.toLocaleString()} XP (LEYENDA)</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-white dark:bg-[#0B0F19] rounded-xl border border-slate-200 dark:border-white/10 shadow-sm group hover:border-emerald-500/30 transition-all">
                            <div className="flex items-center gap-2 mb-1">
                                < BoltIcon className="w-3 h-3 text-emerald-500" />
                                <p className="text-[9px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Motor Lógico</p>
                            </div>
                            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tighter">Escalado de Raíz Cuadrada</p>
                        </div>
                        <div className="p-4 bg-white dark:bg-[#0B0F19] rounded-xl border border-slate-200 dark:border-white/10 shadow-sm group hover:border-amber-500/30 transition-all">
                            <div className="flex items-center gap-2 mb-1">
                                <SparklesIcon className="w-3 h-3 text-amber-500" />
                                <p className="text-[9px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Curva de Esfuerzo</p>
                            </div>
                            <p className="text-[10px] font-bold text-amber-500/80 uppercase tracking-tighter">Objetivo de Eficiencia</p>
                        </div>
                    </div>
                </div>
            </div>
        </PanelGlass>
    );
}

function XPInputCard({ label, value, onChange, icon, isNegative = false, desc }: { label: string, value: number, onChange: (v: number) => void, icon: React.ReactNode, isNegative?: boolean, desc?: string }) {
    return (
        <div className="bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-white/10 p-4 rounded-2xl flex flex-col justify-between transition-all hover:border-emerald-500/30 hover:shadow-xl shadow-sm group">
            <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-[#131A2B] shadow-sm flex items-center justify-center border border-slate-100 dark:border-white/5 text-slate-700 dark:text-white group-hover:scale-110 transition-transform">
                    {icon}
                </div>
                <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white leading-none block mb-1">{label}</label>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">{desc}</p>
                </div>
            </div>
            <div className="flex items-center justify-between bg-slate-50 dark:bg-black/40 px-3 py-2 rounded-xl border border-slate-100 dark:border-white/5">
                <span className="text-[7px] text-slate-400 uppercase font-black tracking-widest">Valor XP</span>
                <div className="flex items-center">
                    {isNegative && <span className="text-rose-500 text-xs font-black mr-1">-</span>}
                    <input
                        type="number"
                        value={value}
                        onChange={(e) => onChange(Number(e.target.value))}
                        className={`w-14 text-right bg-transparent text-[11px] font-black outline-none transition-colors font-mono ${isNegative ? 'text-rose-500' : 'text-emerald-500'}`}
                    />
                </div>
            </div>
        </div>
    );
}

function TierCard({ label, value, onChange, color, icon, highlight = false }: { label: string, value: number, onChange: (v: number) => void, color: string, icon: React.ReactNode, highlight?: boolean }) {
    const colorClasses: any = {
        orange: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
        slate: 'text-slate-500 bg-slate-500/10 border-slate-500/20',
        yellow: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
        blue: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
        indigo: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
        emerald: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
        rose: 'text-rose-500 bg-rose-500/10 border-rose-500/20'
    };

    return (
        <div className={`p-4 rounded-2xl border flex flex-col justify-between items-center transition-all hover:-translate-y-1 bg-slate-50 dark:bg-[#0B0F19] border-slate-200 dark:border-white/10 ${highlight ? 'shadow-[0_0_15px_rgba(var(--color),0.05)] ring-1 ring-white/5' : ''}`}>
            <div className="flex flex-col items-center gap-2 mb-3">
                <div className={`p-2 rounded-xl border shadow-sm ${colorClasses[color]}`}>{icon}</div>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-800 dark:text-white">{label}</h3>
            </div>
            <div className="flex items-center justify-between w-full bg-white dark:bg-[#131A2B] px-2 py-1.5 rounded-xl border border-slate-200 dark:border-white/5 shadow-sm">
                <span className="text-[7px] text-slate-400 uppercase font-black tracking-widest ml-1">XP</span>
                <input
                    type="number"
                    value={value}
                    onChange={(e) => onChange(Number(e.target.value))}
                    className="w-14 text-right bg-transparent text-[10px] font-black text-slate-700 dark:text-white outline-none font-mono focus:text-indigo-500"
                />
            </div>
        </div>
    );
}
