"use client";
import React, { useState, useEffect } from 'react';
import { HugeiconsIcon } from "@hugeicons/react";
import {
    TrophyIcon,
    SparklesIcon,
    CheckmarkCircle02Icon,
    RefreshIcon,
    Alert02Icon,
    StarIcon,
    ChartLineData01Icon,
    FireIcon,
    Shield01Icon,
    ShieldCheckIcon,
    CpuIcon,
    Database01Icon,
    BoltIcon,
    BarChartIcon,
    CheckmarkBadge01Icon,
    InformationCircleIcon,
    ArrowRight01Icon,
    FloppyDiskIcon,
} from '@hugeicons/core-free-icons';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/services/client/firebase';
import { TarjetaKpi, SectionCard } from '@/components/ui/DashboardWidgets';

const ic = "w-6 h-6";
const fmt = (n: number) => n.toLocaleString('es-CL');

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
    badgeXpValues: { bronze: number; silver: number; gold: number };
    tiers: { bronze: number; silver: number; gold: number; platinum: number; diamond: number; elite: number; legend: number };
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
    badgeXpValues: { bronze: 50, silver: 150, gold: 500 },
    tiers: { bronze: 0, silver: 1000, gold: 3000, platinum: 6000, diamond: 10000, elite: 15000, legend: 25000 }
};

const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className={`fixed top-5 right-5 z-150 flex items-center gap-3 px-4 py-3 rounded-md shadow-2xl border animate-slideIn ${type === 'success' ? 'bg-white border-emerald-500 text-emerald-700 dark:bg-[#0B0F19] dark:text-emerald-400 dark:border-emerald-500/50' : 'bg-white border-red-500 text-red-700 dark:bg-[#0B0F19] dark:text-red-400 dark:border-red-500/50'}`}>
            {type === 'success' ? <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-5 h-5 text-emerald-500" strokeWidth={2} /> : <HugeiconsIcon icon={Alert02Icon} className="w-5 h-5 text-red-500" strokeWidth={2} />}
            <span className="text-xs md:text-[10px] font-black uppercase tracking-widest">{message}</span>
        </div>
    );
};

const TIER_META: { key: keyof GamificationParams['tiers']; label: string; color: string; text: string; icon: any; dot: string }[] = [
    { key: 'bronze', label: 'Bronce', color: 'text-orange-500 bg-orange-500/10 border-orange-500/25', text: '#b45309', icon: Shield01Icon, dot: 'bg-orange-500' },
    { key: 'silver', label: 'Plata', color: 'text-slate-500 bg-slate-500/10 border-slate-500/25', text: '#64748b', icon: ShieldCheckIcon, dot: 'bg-slate-400' },
    { key: 'gold', label: 'Oro', color: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/25', text: '#f59e0b', icon: CpuIcon, dot: 'bg-amber-500' },
    { key: 'platinum', label: 'Platino', color: 'text-blue-500 bg-blue-500/10 border-blue-500/25', text: '#3b82f6', icon: Database01Icon, dot: 'bg-blue-500' },
    { key: 'diamond', label: 'Diamante', color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/25', text: '#6366f1', icon: BoltIcon, dot: 'bg-indigo-500' },
    { key: 'elite', label: 'Elite', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/25', text: '#10b981', icon: SparklesIcon, dot: 'bg-emerald-500' },
    { key: 'legend', label: 'Leyenda', color: 'text-rose-500 bg-rose-500/10 border-rose-500/25', text: '#e11d48', icon: TrophyIcon, dot: 'bg-rose-500' },
];

export default function GamificationSettingsPage() {
    const [params, setParams] = useState<GamificationParams>(DEFAULT_PARAMS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);
    const [tab, setTab] = useState<'general' | 'sports' | 'ranks' | 'sim'>('general');
    const [notification, setNotification] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);

    const notify = (msg: string, type: 'success' | 'error') => setNotification({ msg, type });
    const markDirty = () => setDirty(true);

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
                            sportsOverrides: { ...DEFAULT_PARAMS.sportsOverrides, ...(data.gamification.sportsOverrides || {}) },
                            badgeXpValues: { ...DEFAULT_PARAMS.badgeXpValues, ...(data.gamification.badgeXpValues || {}) },
                            tiers: { ...DEFAULT_PARAMS.tiers, ...(data.gamification.tiers || {}) }
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
            setDirty(false);
            notify("Reglas de gamificación actualizadas", "success");
        } catch (error) {
            console.error("Error guardando:", error);
            notify("Error al guardar reglas", "error");
        } finally {
            setSaving(false);
        }
    };

    const setXP = (field: keyof GamificationParams, value: number) => {
        setParams(prev => ({ ...prev, [field]: Math.max(0, value) }));
        markDirty();
    };
    const setTier = (tier: keyof GamificationParams['tiers'], value: number) => {
        setParams(prev => ({ ...prev, tiers: { ...prev.tiers, [tier]: Math.max(0, value) } }));
        markDirty();
    };
    const setSport = (sport: string, field: string, value: any) => {
        setParams(prev => ({ ...prev, sportsOverrides: { ...prev.sportsOverrides, [sport]: { ...prev.sportsOverrides[sport], [field]: value } } }));
        markDirty();
    };
    const setBadge = (key: 'bronze' | 'silver' | 'gold', value: number) => {
        setParams(prev => ({ ...prev, badgeXpValues: { ...prev.badgeXpValues, [key]: Math.max(0, value) } }));
        markDirty();
    };

    const tabs = [
        { id: 'general' as const, label: 'Reglas generales', icon: <HugeiconsIcon icon={FireIcon} className="w-4 h-4" strokeWidth={1.8} /> },
        { id: 'sports' as const, label: 'Por deporte', icon: <HugeiconsIcon icon={BarChartIcon} className="w-4 h-4" strokeWidth={1.8} /> },
        { id: 'ranks' as const, label: 'Rangos', icon: <HugeiconsIcon icon={TrophyIcon} className="w-4 h-4" strokeWidth={1.8} /> },
        { id: 'sim' as const, label: 'Simulador', icon: <HugeiconsIcon icon={CpuIcon} className="w-4 h-4" strokeWidth={1.8} /> },
    ];

    if (loading) return (
        <div className="flex h-full w-full items-center justify-center text-slate-400 text-xs md:text-[10px] font-bold uppercase gap-2 py-20">
            <HugeiconsIcon icon={RefreshIcon} className="w-4 h-4 animate-spin" strokeWidth={2} /> Localizando motor de mérito...
        </div>
    );

    return (
        <div className="w-full space-y-6 pb-12 animate-fadeIn relative">
            {notification && <Toast message={notification.msg} type={notification.type} onClose={() => setNotification(null)} />}

            {/* CABECERA */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="w-6 h-[2px] bg-emerald-500 rounded-md" />
                        <p className="text-[11px] font-black text-emerald-600 dark:text-[#00df82] tracking-[0.2em] uppercase">Economía del jugador & progresión</p>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none font-heading">
                        Motor de <span className="text-emerald-500 dark:text-[#00df82]">Gamificación</span>
                    </h1>
                </div>
                <div className="flex items-center gap-3">
                    {dirty && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[11px] md:text-[9px] font-black uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Cambios sin guardar
                        </span>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={saving || !dirty}
                        className="flex items-center gap-2 px-6 py-3 rounded-md bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black text-[11px] font-black uppercase tracking-wider shadow-lg shadow-emerald-500/25 hover:brightness-110 active:scale-95 transition-all disabled:opacity-40"
                    >
                        {saving ? <HugeiconsIcon icon={RefreshIcon} className="w-4 h-4 animate-spin" strokeWidth={2} /> : <HugeiconsIcon icon={FloppyDiskIcon} className="w-4 h-4" strokeWidth={2} />}
                        Guardar cambios
                    </button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 [&>*:last-child:nth-child(odd)]:col-span-2 sm:[&>*:last-child:nth-child(odd)]:col-span-1">
                <TarjetaKpi titulo="Check-in base" valor={`+${params.xpPerCheckin}`} icono={<HugeiconsIcon icon={CheckmarkCircle02Icon} className={ic} strokeWidth={1.6} />} sub="XP por asistencia" brillo />
                <TarjetaKpi titulo="Bono MVP" valor={`+${params.xpPerMvp}`} icono={<HugeiconsIcon icon={SparklesIcon} className={ic} strokeWidth={1.6} />} sub="Reconocimiento" />
                <TarjetaKpi titulo="Inasistencia" valor={`-${params.xpPerNoShow}`} icono={<HugeiconsIcon icon={Alert02Icon} className={ic} strokeWidth={1.6} />} sub="Penalidad" />
            </div>

            {/* TABS */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                {tabs.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-md border text-xs md:text-[10px] font-black uppercase transition-all shrink-0 ${
                            tab === t.id ? 'bg-emerald-500 dark:bg-[#00df82] border-emerald-500 dark:border-[#00df82] text-white dark:text-black shadow-lg shadow-emerald-500/20' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white'
                        }`}
                    >
                        {t.icon}{t.label}
                    </button>
                ))}
            </div>

            {/* REGLAS GENERALES */}
            {tab === 'general' && (
                <div className="space-y-6 animate-fadeIn">
                    <SectionCard
                        title="Reglas generales"
                        subtitle="XP transversal que aplica a todos los deportes"
                        icon={<HugeiconsIcon icon={FireIcon} className="w-5 h-5" strokeWidth={1.8} />}
                        bodyClassName="p-6"
                    >
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <StepperCard label="Check-in" desc="Por asistencia" value={params.xpPerCheckin} onChange={(v) => setXP('xpPerCheckin', v)} icon={<HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-5 h-5 text-emerald-600 dark:text-[#00df82]" strokeWidth={1.8} />} />
                            <StepperCard label="Partido jugado" desc="Por finalización" value={params.xpPerMatch} onChange={(v) => setXP('xpPerMatch', v)} icon={<HugeiconsIcon icon={ChartLineData01Icon} className="w-5 h-5 text-blue-500" strokeWidth={1.8} />} />
                            <StepperCard label="Bono MVP" desc="Por destacado" value={params.xpPerMvp} onChange={(v) => setXP('xpPerMvp', v)} icon={<HugeiconsIcon icon={StarIcon} className="w-5 h-5 text-indigo-500" strokeWidth={1.8} />} />
                            <StepperCard label="Inasistencia" desc="Penalidad" value={params.xpPerNoShow} onChange={(v) => setXP('xpPerNoShow', v)} negative icon={<HugeiconsIcon icon={Alert02Icon} className="w-5 h-5 text-red-500" strokeWidth={1.8} />} />
                        </div>
                        <div className="pt-5 mt-5 border-t border-slate-100 dark:border-white/5">
                            <p className="text-[11px] md:text-[8px] font-black text-slate-400 uppercase tracking-widest mb-3">Reglas de partido</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <StepperCard label="Victoria" desc="Por partido ganado" value={params.xpPerWin} onChange={(v) => setXP('xpPerWin', v)} icon={<HugeiconsIcon icon={TrophyIcon} className="w-5 h-5 text-amber-500" strokeWidth={1.8} />} />
                                <StepperCard label="Derrota" desc="Por partido perdido" value={params.xpPerLoss} onChange={(v) => setXP('xpPerLoss', v)} icon={<HugeiconsIcon icon={ArrowRight01Icon} className="w-5 h-5 text-rose-500" strokeWidth={1.8} />} />
                                <StepperCard label="Gol" desc="Por gol anotado" value={params.xpPerGoal} onChange={(v) => setXP('xpPerGoal', v)} icon={<HugeiconsIcon icon={FireIcon} className="w-5 h-5 text-indigo-500" strokeWidth={1.8} />} />
                                <StepperCard label="Asistencia (pase)" desc="Por asistencia de gol" value={params.xpPerAssist} onChange={(v) => setXP('xpPerAssist', v)} icon={<HugeiconsIcon icon={SparklesIcon} className="w-5 h-5 text-sky-500" strokeWidth={1.8} />} />
                            </div>
                        </div>
                    </SectionCard>

                    <SectionCard
                        title="Economía de logros e insignias"
                        subtitle="XP otorgada por cada nivel de medalla alcanzado"
                        icon={<HugeiconsIcon icon={TrophyIcon} className="w-5 h-5" strokeWidth={1.8} />}
                        bodyClassName="p-6"
                    >
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <StepperCard label="Medalla bronce" desc="Recompensa bronce" value={params.badgeXpValues?.bronze ?? 50} onChange={(v) => setBadge('bronze', v)} step={50} icon={<HugeiconsIcon icon={TrophyIcon} className="w-5 h-5 text-amber-600" strokeWidth={1.8} />} />
                            <StepperCard label="Medalla plata" desc="Recompensa plata" value={params.badgeXpValues?.silver ?? 150} onChange={(v) => setBadge('silver', v)} step={50} icon={<HugeiconsIcon icon={TrophyIcon} className="w-5 h-5 text-slate-400" strokeWidth={1.8} />} />
                            <StepperCard label="Medalla oro" desc="Recompensa oro" value={params.badgeXpValues?.gold ?? 500} onChange={(v) => setBadge('gold', v)} step={50} icon={<HugeiconsIcon icon={TrophyIcon} className="w-5 h-5 text-amber-400" strokeWidth={1.8} />} />
                        </div>
                    </SectionCard>
                </div>
            )}

            {/* POR DEPORTE */}
            {tab === 'sports' && (
                <SectionCard
                    title="Matriz de reglas por deporte"
                    subtitle="Ajusta la XP de cada disciplina y qué estadísticas se contabilizan"
                    icon={<HugeiconsIcon icon={BarChartIcon} className="w-5 h-5" strokeWidth={1.8} />}
                    bodyClassName="p-6 space-y-4"
                >
                    {Object.entries(params.sportsOverrides || {}).map(([sport, config]) => (
                        <div key={sport} className="rounded-md bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 p-5">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-md bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center">
                                        <HugeiconsIcon icon={TrophyIcon} className="w-4 h-4 text-indigo-500" strokeWidth={1.8} />
                                    </div>
                                    <h3 className="text-[11px] font-black uppercase text-slate-800 dark:text-white tracking-widest">{sport}</h3>
                                </div>
                                <div className="flex items-center gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer text-[11px] md:text-[8px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                                        <button
                                            onClick={() => setSport(sport, 'countGoals', !config.countGoals)}
                                            className={`w-9 h-5 rounded-full relative transition-all ${config.countGoals ? 'bg-emerald-500 dark:bg-[#00df82]' : 'bg-slate-200 dark:bg-white/10'}`}
                                        >
                                            <span className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${config.countGoals ? 'right-1' : 'left-1'}`} />
                                        </button>
                                        Cuenta goles
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer text-[11px] md:text-[8px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                                        <button
                                            onClick={() => setSport(sport, 'countAssists', !config.countAssists)}
                                            className={`w-9 h-5 rounded-full relative transition-all ${config.countAssists ? 'bg-emerald-500 dark:bg-[#00df82]' : 'bg-slate-200 dark:bg-white/10'}`}
                                        >
                                            <span className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${config.countAssists ? 'right-1' : 'left-1'}`} />
                                        </button>
                                        Cuenta asistencias
                                    </label>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                <InlineStepper label="Victoria" value={config.winXP} onChange={(v) => setSport(sport, 'winXP', v)} color="text-emerald-600 dark:text-[#00df82]"  />
                                <InlineStepper label="Derrota" value={config.lossXP} onChange={(v) => setSport(sport, 'lossXP', v)} color="text-rose-500"  />
                                <InlineStepper label="Gol" value={config.goalXP ?? (config.countGoals ? 25 : 0)} onChange={(v) => setSport(sport, 'goalXP', v)} color="text-indigo-500" disabled={!config.countGoals} />
                                <InlineStepper label="Asist." value={config.assistXP ?? (config.countAssists ? 15 : 0)} onChange={(v) => setSport(sport, 'assistXP', v)} color="text-sky-500" disabled={!config.countAssists} />
                            </div>
                        </div>
                    ))}
                </SectionCard>
            )}

            {/* RANGOS */}
            {tab === 'ranks' && (
                <SectionCard
                    title="Escalafón global"
                    subtitle="Umbrales de XP que definen el rango del jugador (de menor a mayor)"
                    icon={<HugeiconsIcon icon={TrophyIcon} className="w-5 h-5" strokeWidth={1.8} />}
                    bodyClassName="p-6"
                >
                    <div className="flex items-center gap-1.5 mb-6 px-1">
                        <HugeiconsIcon icon={InformationCircleIcon} className="w-3.5 h-3.5 text-slate-400 shrink-0" strokeWidth={2} />
                        <p className="text-[11px] md:text-[8px] font-bold text-slate-400 uppercase tracking-wide">El jugador alcanza cada rango al superar su umbral mínimo de XP.</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                        {TIER_META.map(tm => (
                            <div key={tm.key} className={`relative rounded-md border p-4 flex flex-col items-center gap-3 ${tm.color}`}>
                                <span className={`absolute top-2 right-2 w-2 h-2 rounded-full ${tm.dot}`} />
                                <div className={`p-2 rounded-md border bg-white/60 dark:bg-white/10 ${tm.color}`}>
                                    <HugeiconsIcon icon={tm.icon} className="w-4 h-4" strokeWidth={1.8} />
                                </div>
                                <h3 className="text-xs md:text-[10px] font-black uppercase tracking-widest text-slate-800 dark:text-white">{tm.label}</h3>
                                <div className="w-full flex items-center justify-between bg-white/70 dark:bg-slate-900/60 px-2 py-1.5 rounded-md border border-white/40 dark:border-white/10">
                                    <span className="text-[11px] md:text-[7px] font-black uppercase tracking-widest text-slate-400">Min XP</span>
                                    <input
                                        type="number"
                                        value={params.tiers[tm.key]}
                                        onChange={(e) => setTier(tm.key, Number(e.target.value))}
                                        className="w-16 text-right bg-transparent text-xs md:text-[10px] font-black text-slate-700 dark:text-white outline-hidden font-mono"
                                    />
                                </div>
                                <p className="text-[11px] md:text-[8px] font-bold text-slate-500 dark:text-slate-400 font-mono">{fmt(Number(params.tiers[tm.key]) || 0)}</p>
                            </div>
                        ))}
                    </div>
                </SectionCard>
            )}

            {/* SIMULADOR */}
            {tab === 'sim' && (
                <Simulator tiers={params.tiers} />
            )}
        </div>
    );
}

function Simulator({ tiers }: { tiers: any }) {
    const [testXP, setTestXP] = useState(5000);
    const maxXP = tiers?.legend || 25000;
    const overall = Math.floor(40 + ((99 - 40) * Math.min(1, Math.sqrt(testXP / maxXP))));
    const activeStars = Math.round(Math.min(1, testXP / maxXP) * 5);
    const currentTier = TIER_META.slice().reverse().find(t => testXP >= (Number(tiers?.[t.key]) || 0));

    return (
        <SectionCard
            title="Simulador de progresión"
            subtitle="Valida cómo escala el nivel general y el rango según la XP acumulada"
            icon={<HugeiconsIcon icon={CpuIcon} className="w-5 h-5" strokeWidth={1.8} />}
            bodyClassName="p-8"
        >
            <div className="flex flex-col md:flex-row items-center gap-10">
                <div className="relative shrink-0">
                    <div className="w-36 h-36 rounded-full border-10 border-slate-100 dark:border-white/5 flex items-center justify-center relative shadow-2xl bg-white dark:bg-slate-900">
                        <div className="text-center">
                            <p className="text-[11px] md:text-[8px] font-black uppercase text-slate-400 tracking-tighter">Nivel general</p>
                            <p className="text-5xl font-black text-slate-900 dark:text-white leading-none tracking-tighter font-mono">{overall}</p>
                            <div className="flex items-center justify-center gap-0.5 mt-1">
                                {[...Array(5)].map((_, i) => (
                                    <HugeiconsIcon key={i} icon={StarIcon} className={`w-2 h-2 ${i < activeStars ? 'text-amber-400' : 'text-slate-200 dark:text-white/10'}`} strokeWidth={2} />
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="mt-3 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] md:text-[8px] font-black uppercase border ${currentTier?.color || 'bg-slate-100 border-slate-200 text-slate-500'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${currentTier?.dot || 'bg-slate-400'}`} />
                            {currentTier?.label || 'Sin rango'}
                        </span>
                    </div>
                </div>

                <div className="flex-1 space-y-6 w-full">
                    <div className="space-y-4 bg-slate-50 dark:bg-white/5 p-6 rounded-md border border-slate-200 dark:border-white/5">
                        <div className="flex justify-between items-center px-1">
                            <span className="text-xs md:text-[10px] font-black text-slate-500 uppercase tracking-widest">Experiencia acumulada</span>
                            <span className="text-lg font-black text-slate-900 dark:text-emerald-500 font-mono tracking-tighter">{fmt(testXP)} <span className="text-xs md:text-[10px] text-slate-400">XP</span></span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max={maxXP}
                            value={testXP}
                            onChange={(e) => setTestXP(Number(e.target.value))}
                            className="w-full h-1.5 bg-slate-200 dark:bg-white/10 rounded-md appearance-none cursor-pointer accent-emerald-500"
                        />
                        <div className="flex justify-between text-[11px] md:text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">
                            <span>0 XP</span>
                            <span>{fmt(maxXP)} XP</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-md bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5">
                            <div className="flex items-center gap-2 mb-1">
                                <HugeiconsIcon icon={BoltIcon} className="w-3 h-3 text-emerald-600 dark:text-[#00df82]" strokeWidth={2} />
                                <p className="text-[11px] md:text-[9px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Motor lógico</p>
                            </div>
                            <p className="text-xs md:text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tighter">Escalado de raíz cuadrada</p>
                        </div>
                        <div className="p-4 rounded-md bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5">
                            <div className="flex items-center gap-2 mb-1">
                                <HugeiconsIcon icon={SparklesIcon} className="w-3 h-3 text-amber-500" strokeWidth={2} />
                                <p className="text-[11px] md:text-[9px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Curva de esfuerzo</p>
                            </div>
                            <p className="text-xs md:text-[10px] font-bold text-amber-500/80 uppercase tracking-tighter">Objetivo de eficiencia</p>
                        </div>
                    </div>
                </div>
            </div>
        </SectionCard>
    );
}

function StepperCard({ label, desc, value, onChange, icon, negative = false, step = 50 }: { label: string, desc: string, value: number, onChange: (v: number) => void, icon: React.ReactNode, negative?: boolean, step?: number }) {
    return (
        <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 p-4 rounded-md flex flex-col justify-between transition-all hover:border-emerald-400/40">
            <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-md bg-slate-100 dark:bg-white/5 flex items-center justify-center border border-slate-200 dark:border-white/10">
                    {icon}
                </div>
                <div>
                    <label className="text-xs md:text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white leading-none block mb-1">{label}</label>
                    <p className="text-[11px] md:text-[8px] font-bold text-slate-400 uppercase tracking-tighter">{desc}</p>
                </div>
            </div>
            <div className="flex items-center justify-between bg-slate-50 dark:bg-white/5 px-2 py-1.5 rounded-md border border-slate-200 dark:border-white/10">
                <span className="text-[11px] md:text-[7px] text-slate-400 uppercase font-black tracking-widest ml-1">XP</span>
                <div className="flex items-center gap-1.5">
                    <button onClick={() => onChange(Math.max(0, value - step))} aria-label="Disminuir" className="w-8 h-8 rounded-md bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-500 hover:border-emerald-400 dark:hover:border-[#00df82]/40 hover:text-emerald-600 dark:hover:text-[#00df82] font-black text-base transition-all active:scale-90">−</button>
                    <input
                        type="number"
                        value={value}
                        onChange={(e) => onChange(Number(e.target.value))}
                        className={`w-16 text-center bg-transparent text-[11px] font-black outline-hidden font-mono ${negative ? 'text-rose-500' : 'text-emerald-600 dark:text-[#00df82]'}`}
                    />
                    <button onClick={() => onChange(value + step)} aria-label="Aumentar" className="w-8 h-8 rounded-md bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-500 hover:border-emerald-400 dark:hover:border-[#00df82]/40 hover:text-emerald-600 dark:hover:text-[#00df82] font-black text-base transition-all active:scale-90">+</button>
                </div>
            </div>
        </div>
    );
}

function InlineStepper({ label, value, onChange, color, disabled = false, step = 50 }: { label: string, value: number, onChange: (v: number) => void, color: string, disabled?: boolean, step?: number }) {
    return (
        <div className={`flex items-center justify-between gap-2 bg-white dark:bg-slate-900/50 px-3 py-2 rounded-md border border-slate-200 dark:border-white/10 ${disabled ? 'opacity-40' : ''}`}>
            <span className="text-[11px] md:text-[8px] font-black uppercase text-slate-400 tracking-widest">{label}</span>
            <div className="flex items-center gap-1.5">
                <button onClick={() => !disabled && onChange(Math.max(0, value - step))} aria-label={`Disminuir ${label}`} disabled={disabled} className="w-7 h-7 rounded-md bg-slate-100 dark:bg-white/10 text-slate-500 hover:text-emerald-600 dark:hover:text-[#00df82] font-black text-base transition-all active:scale-90 disabled:opacity-40">−</button>
                <input
                    type="number"
                    value={value}
                    disabled={disabled}
                    onChange={(e) => onChange(Number(e.target.value))}
                    className={`w-14 text-right bg-transparent outline-hidden text-[11px] font-black ${color} font-mono disabled:cursor-not-allowed`}
                />
                <button onClick={() => !disabled && onChange(value + step)} aria-label={`Aumentar ${label}`} disabled={disabled} className="w-7 h-7 rounded-md bg-slate-100 dark:bg-white/10 text-slate-500 hover:text-emerald-600 dark:hover:text-[#00df82] font-black text-base transition-all active:scale-90 disabled:opacity-40">+</button>
            </div>
        </div>
    );
}