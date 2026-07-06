"use client";
import React, { useState, useEffect, useMemo } from 'react';
import {
    ChartBarIcon,
    ArrowTrendingUpIcon,
    ShieldExclamationIcon,
    UserGroupIcon,
    ArrowPathIcon,
    MagnifyingGlassIcon,
    TrophyIcon,
    FireIcon,
    StarIcon,
    AcademicCapIcon,
    PresentationChartLineIcon
} from '@heroicons/react/24/outline';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { PanelGlass, TarjetaKpi, BotonAccion } from '@/components/ui/DashboardWidgets';

import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area, ScatterChart, Scatter, ZAxis
} from 'recharts';

export default function PlayerAnalyticsPage() {
    const [players, setPlayers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchPlayers = async () => {
        setLoading(true);
        try {
            const querySnapshot = await getDocs(collection(db, "users"));
            const loadedPlayers: any[] = querySnapshot.docs.reduce((acc: any[], doc) => {
                const data = doc.data();
                const role = (data.role || '').toLowerCase();
                if (['admin', 'owner', 'manager', 'gestor', 'dueño'].includes(role)) return acc;

                acc.push({
                    id: doc.id,
                    name: data.displayName || 'Sin Nombre',
                    email: data.email || 'sin-email@ejemplo.com',
                    level: data.tier || 'Bronce',
                    ovr: data.ovr || 50,
                    xp: data.xp || 0,
                    goals: data.stats?.goals || 0,
                    assists: data.stats?.assists || 0,
                    wins: data.stats?.won || 0,
                    played: data.stats?.played || 0,
                    fairPlay: data.stats?.fair_play_matches !== undefined ? data.stats?.fair_play_matches : 100,
                    badgesCount: data.badges?.length || 0,
                    growthRate: data.growthRate || 0,
                    raw: data
                });
                return acc;
            }, []);

            loadedPlayers.sort((a, b) => b.ovr - a.ovr);
            setPlayers(loadedPlayers);
        } catch (error) { console.error("Error:", error); } finally { setLoading(false); }
    };

    useEffect(() => { fetchPlayers(); }, []);

    const chartData = useMemo(() => {
        if (players.length === 0) return { tiers: [], scorers: [], performance: [], improvement: [] };
        const tierMap: Record<string, number> = {};
        players.forEach(p => { tierMap[p.level] = (tierMap[p.level] || 0) + 1; });
        const tiers = Object.keys(tierMap).map(name => ({ name: name.toUpperCase(), value: tierMap[name] }));
        const scorers = [...players].sort((a, b) => b.goals - a.goals).slice(0, 8).map(p => ({ name: p.name.toUpperCase(), goles: p.goals, asistencias: p.assists }));
        const performanceData = players.map(p => ({ x: p.ovr, y: p.wins, z: p.played, name: p.name }));
        const improvement = [...players].sort((a, b) => b.growthRate - a.growthRate).slice(0, 5).map(p => ({ name: p.name.toUpperCase(), crecimiento: p.growthRate }));
        return { tiers, scorers, performance: performanceData, improvement };
    }, [players]);

    const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

    const stats = useMemo(() => {
        const total = players.length;
        if (total === 0) return { avgOvr: 0, totalGoals: 0, topScorer: '---', bestWinRate: 0 };
        const avgOvr = Math.round(players.reduce((acc, p) => acc + p.ovr, 0) / total);
        const totalGoals = players.reduce((acc, p) => acc + p.goals, 0);
        const topScorerObj = [...players].sort((a, b) => b.goals - a.goals)[0];
        const bestWR = Math.max(...players.map(p => p.played > 0 ? (p.wins / p.played) : 0));
        return { avgOvr, totalGoals, topScorer: topScorerObj?.name || '---', bestWinRate: Math.round(bestWR * 100) };
    }, [players]);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white dark:bg-black p-3 border border-slate-200 dark:border-white/10 rounded-[14px] shadow-2xl backdrop-blur-md">
                    {label && <p className="text-[10px] font-black text-emerald-500 uppercase mb-1.5 tracking-tighter border-b border-slate-100 dark:border-white/5 pb-1">{label}</p>}
                    <div className="space-y-1">
                        {payload.map((entry: any, index: number) => (
                            <p key={index} className="text-[10px] font-bold text-slate-700 dark:text-slate-200 uppercase flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
                                {entry.name}: <span className="font-black text-black dark:text-white">{entry.value}</span>
                            </p>
                        ))}
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="w-full space-y-6 pb-12 animate-fadeIn relative">
            {/* CABECERA */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-6">
                <div>
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="w-6 h-[2px] bg-emerald-500 rounded-full"></span>
                        <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 tracking-[0.2em] uppercase">Inteligencia de Datos</p>
                    </div>
                    <h1 className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none">Analítica de <span className="text-emerald-500 dark:text-emerald-400">Atletas</span></h1>
                </div>
                <button onClick={fetchPlayers} className="p-2.5 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-[14px] hover:bg-emerald-500 dark:hover:bg-emerald-600 hover:text-white transition-all active:scale-90"><ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} /></button>
            </div>

            {/* KPI INDICADORES */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <TarjetaKpi titulo="NIVEL PROMEDIO" valor={stats.avgOvr.toString()} sub="VALORACIÓN COLECTIVA" icono={<StarIcon className="text-amber-500" />} brillo />
                <TarjetaKpi titulo="GOLES TOTALES" valor={stats.totalGoals.toString()} sub="TEMPORADA ACTUAL" icono={<FireIcon className="text-rose-500" />} />
                <TarjetaKpi 
                    titulo="MÁXIMO GOLEADOR" 
                    valor={stats.topScorer.toUpperCase()} 
                    sub="LÍDER DE OFENSIVA" 
                    icono={<TrophyIcon className="text-yellow-500" />} 
                    className="overflow-hidden"
                    valueClassName={stats.topScorer.length > 15 ? "text-base" : "text-xl"}
                />
                <TarjetaKpi titulo="TASA DE VICTORIAS" valor={`${stats.bestWinRate}%`} sub="RATIO DE ÉXITO" icono={<ArrowTrendingUpIcon className="text-emerald-500" />} />
            </div>

            {/* GRILLA DE GRÁFICOS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <PanelGlass className="min-h-[400px]">
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Distribución</p>
                            <h3 className="text-sm font-black text-black dark:text-white uppercase">Rangos de Talento</h3>
                        </div>
                        <AcademicCapIcon className="w-5 h-5 text-slate-300" />
                    </div>
                    <div className="h-64 flex flex-col md:flex-row items-center gap-6">
                        <div className="flex-1 h-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={chartData.tiers} innerRadius={60} outerRadius={85} paddingAngle={5} dataKey="value">
                                        {chartData.tiers.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex flex-col gap-2 shrink-0">
                            {chartData.tiers.map((t, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{t.name}: {t.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </PanelGlass>

                <PanelGlass className="min-h-[400px]">
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Productividad</p>
                            <h3 className="text-sm font-black text-black dark:text-white uppercase">Líderes de Goles</h3>
                        </div>
                        <FireIcon className="w-5 h-5 text-rose-500 opacity-50" />
                    </div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData.scorers} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} strokeOpacity={0.05} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" tick={{ fontSize: 8, fontWeight: '900', fill: '#94a3b8' }} width={120} />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                                <Bar name="GOLES" dataKey="goles" fill="#10b981" radius={[0, 4, 4, 0]} barSize={10} />
                                <Bar name="ASISTENCIAS" dataKey="asistencias" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={10} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </PanelGlass>

                <PanelGlass className="min-h-[400px]">
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Rendimiento</p>
                            <h3 className="text-sm font-black text-black dark:text-white uppercase">Matriz Nivel vs Victorias</h3>
                        </div>
                        <PresentationChartLineIcon className="w-5 h-5 text-indigo-500 opacity-50" />
                    </div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart>
                                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.05} />
                                <XAxis type="number" dataKey="x" name="NIVEL" tick={{ fontSize: 8, fontWeight: 'bold' }} strokeOpacity={0.1} />
                                <YAxis type="number" dataKey="y" name="VICTORIAS" tick={{ fontSize: 8, fontWeight: 'bold' }} strokeOpacity={0.1} />
                                <ZAxis type="number" dataKey="z" range={[50, 400]} />
                                <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const d = payload[0].payload;
                                        return (
                                            <div className="bg-white dark:bg-black p-3 border border-slate-200 dark:border-white/10 rounded-[14px] shadow-2xl backdrop-blur-md">
                                                <p className="text-[10px] font-black text-emerald-500 uppercase mb-1.5 tracking-tighter border-b border-slate-100 dark:border-white/5 pb-1">{d.name}</p>
                                                <p className="text-[10px] font-bold text-slate-700 dark:text-slate-200 uppercase">NIVEL: <span className="font-black text-black dark:text-white">{d.x}</span></p>
                                                <p className="text-[10px] font-bold text-slate-700 dark:text-slate-200 uppercase">VICTORIAS: <span className="font-black text-black dark:text-white">{d.y}</span></p>
                                            </div>
                                        );
                                    }
                                    return null;
                                }} />
                                <Scatter name="Atletas" data={chartData.performance} fill="#10b981" />
                            </ScatterChart>
                        </ResponsiveContainer>
                    </div>
                </PanelGlass>

                <PanelGlass className="min-h-[400px]">
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Crecimiento</p>
                            <h3 className="text-sm font-black text-black dark:text-white uppercase">Talento Emergente</h3>
                        </div>
                        <ArrowTrendingUpIcon className="w-5 h-5 text-emerald-500 opacity-50" />
                    </div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData.improvement}>
                                <defs>
                                    <linearGradient id="colorCrec" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="name" tick={{ fontSize: 8, fontWeight: '900' }} strokeOpacity={0.1} />
                                <YAxis tick={{ fontSize: 8, fontWeight: 'bold' }} strokeOpacity={0.1} />
                                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.05} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="crecimiento" name="CRECIMIENTO" stroke="#10b981" strokeWidth={3} fill="url(#colorCrec)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </PanelGlass>
            </div>
        </div>
    );
}
