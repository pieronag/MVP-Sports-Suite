"use client";
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { HugeiconsIcon } from "@hugeicons/react";
import {
    RefreshIcon,
    FireIcon,
    TrophyIcon,
    CrownIcon,
    BarChartIcon,
    Download01Icon,
    UserGroupIcon,
    Search01Icon,
    ArrowDown01Icon,
    DocumentCodeIcon,
    CheckmarkCircle02Icon,
} from '@hugeicons/core-free-icons';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/services/client/firebase';
import { SectionCard } from '@/components/ui/DashboardWidgets';

import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell,
} from 'recharts';

// Colores neutrales que funcionan en light y dark mode
const GRID_STROKE = '#94a3b8';
const GRID_OPACITY = 0.18;
const AXIS_FILL = '#64748b';

export default function PlayerAnalyticsPage() {
    const [players, setPlayers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [tierFilter, setTierFilter] = useState("Todos");
    const [exportOpen, setExportOpen] = useState(false);
    const [exported, setExported] = useState<null | 'csv' | 'json'>(null);
    const exportRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const onDown = (e: MouseEvent) => {
            if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false);
        };
        window.addEventListener("mousedown", onDown);
        return () => window.removeEventListener("mousedown", onDown);
    }, []);

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
                    badgesCount: data.badges?.length || 0,
                    growthRate: data.growthRate || 0,
                });
                return acc;
            }, []);

            loadedPlayers.sort((a, b) => b.ovr - a.ovr);
            setPlayers(loadedPlayers);
        } catch (error) { console.error("Error:", error); } finally { setLoading(false); }
    };

    useEffect(() => { fetchPlayers(); }, []);

    const tiers = useMemo(() => ['Todos', ...Array.from(new Set(players.map(p => p.level)))], [players]);

    const tiersData = useMemo(() => {
        const map: Record<string, number> = {};
        players.forEach(p => { map[p.level] = (map[p.level] || 0) + 1; });
        return Object.keys(map).map(name => ({ name: name.toUpperCase(), value: map[name] }));
    }, [players]);

    const scorers = useMemo(() =>
        [...players].sort((a, b) => b.goals - a.goals).slice(0, 8).map(p => ({ name: p.name.toUpperCase(), goles: p.goals, asistencias: p.assists })),
    [players]);

    const summary = useMemo(() => {
        const total = players.length;
        if (total === 0) return { total: 0, avgOvr: 0, totalGoals: 0, topScorer: '---' };
        const avgOvr = Math.round(players.reduce((a, p) => a + p.ovr, 0) / total);
        const totalGoals = players.reduce((a, p) => a + p.goals, 0);
        const topScorerObj = [...players].sort((a, b) => b.goals - a.goals)[0];
        return { total, avgOvr, totalGoals, topScorer: topScorerObj?.name || '---' };
    }, [players]);

    const filteredRanking = useMemo(() => players.filter(p => {
        const okTier = tierFilter === "Todos" || p.level === tierFilter;
        const okSearch = !search
            || p.name.toLowerCase().includes(search.toLowerCase())
            || p.email.toLowerCase().includes(search.toLowerCase());
        return okTier && okSearch;
    }), [players, search, tierFilter]);

    const stamp = () => new Date().toISOString().slice(0, 10);
    const fileName = (ext: string) => `analitica_atletas_${stamp()}.${ext}`;

    const downloadFile = (content: string, filename: string, type: string) => {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename;
        a.click(); URL.revokeObjectURL(url);
    };

    // CSV con separador ';' (compatible con Excel es-CL) + bloque de metadatos
    const exportCSV = () => {
        const sep = ';';
        const esc = (v: any) => {
            const s = String(v ?? '');
            return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        };
        const line = (cells: any[]) => cells.map(esc).join(sep);
        const headers = ['Nombre', 'Email', 'Categoría', 'OVR', 'XP', 'Goles', 'Asistencias', 'Victorias', 'Partidos', 'Insignias', 'Crecimiento'];

        const meta: string[] = [];
        meta.push(line(['MVP Sports Suite']));
        meta.push(line(['Exportación analítica de atletas']));
        meta.push(line(['Fecha generación', new Date().toLocaleString('es-CL')]));
        meta.push(line(['Total atletas', players.length]));
        meta.push(line(['Nivel promedio', summary.avgOvr]));
        meta.push(line(['Goles totales', summary.totalGoals]));
        meta.push('');
        meta.push(line(headers));

        const body = players.map(p => line([
            p.name, p.email, p.level, p.ovr, p.xp, p.goals, p.assists, p.wins, p.played, p.badgesCount, p.growthRate,
        ]));

        downloadFile("\ufeff" + meta.concat(body).join('\n'), fileName('csv'), 'text/csv;charset=utf-8;');
    };

    // JSON con metadatos + datos completos
    const exportJSON = () => {
        const payload = {
            metadata: {
                plataforma: 'MVP Sports Suite',
                tipo: 'analitica_atletas',
                generado: new Date().toISOString(),
                totalAtletas: players.length,
                resumen: { nivelPromedio: summary.avgOvr, golesTotales: summary.totalGoals, maximoGoleador: summary.topScorer },
            },
            atletas: players.map(p => ({
                id: p.id, nombre: p.name, email: p.email, categoria: p.level, ovr: p.ovr, xp: p.xp,
                goles: p.goals, asistencias: p.assists, victorias: p.wins, partidos: p.played,
                insignias: p.badgesCount, crecimiento: p.growthRate,
            })),
        };
        downloadFile(JSON.stringify(payload, null, 2), fileName('json'), 'application/json;charset=utf-8;');
    };

    const handleExport = (format: 'csv' | 'json') => {
        if (players.length === 0) return;
        if (format === 'csv') exportCSV();
        else exportJSON();
        setExported(format);
        setTimeout(() => setExported(null), 2000);
        setExportOpen(false);
    };

    // Colores oficiales de niveles (coinciden con PlayerModal/BadgesConfig)
    const tierStyle = (tier: string): string => {
        const t = (tier || '').toLowerCase();
        if (t === 'bronce' || t === 'bronze') return 'text-amber-700 bg-amber-700/10';
        if (t === 'plata' || t === 'silver') return 'text-slate-400 bg-slate-400/10';
        if (t === 'oro' || t === 'gold') return 'text-amber-500 bg-amber-500/10';
        if (t === 'platino' || t === 'platinum') return 'text-blue-500 bg-blue-500/10';
        if (t === 'diamante' || t === 'diamond') return 'text-cyan-500 bg-cyan-500/10';
        if (t === 'élite' || t === 'elite') return 'text-emerald-500 bg-emerald-500/10';
        if (t === 'leyenda' || t === 'legend') return 'text-purple-500 bg-purple-500/10';
        return 'text-slate-500 bg-slate-500/10';
    };

    // Hex de cada nivel para el gráfico (misma paleta oficial)
    const tierHex = (tier: string): string => {
        const t = (tier || '').toLowerCase();
        if (t === 'bronce' || t === 'bronze') return '#b45309';
        if (t === 'plata' || t === 'silver') return '#94a3b8';
        if (t === 'oro' || t === 'gold') return '#f59e0b';
        if (t === 'platino' || t === 'platinum') return '#3b82f6';
        if (t === 'diamante' || t === 'diamond') return '#06b6d4';
        if (t === 'élite' || t === 'elite') return '#10b981';
        if (t === 'leyenda' || t === 'legend') return '#a855f7';
        return '#64748b';
    };

    // Tooltip adaptativo: blanco en light, oscuro en dark
    const TooltipBox = ({ active, payload, label }: any) => {
        if (!active || !payload?.length) return null;
        return (
            <div className="bg-white dark:bg-[#020617] border border-slate-200 dark:border-white/10 rounded-md px-3.5 py-3 shadow-2xl backdrop-blur-md">
                {label && <p className="text-xs md:text-[10px] font-black text-emerald-600 dark:text-[#00df82] uppercase mb-1.5 tracking-tighter border-b border-slate-100 dark:border-white/10 pb-1">{label}</p>}
                <div className="space-y-1">
                    {payload.map((entry: any, index: number) => (
                        <p key={index} className="text-xs md:text-[10px] font-bold text-slate-600 dark:text-slate-200 uppercase flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
                            {entry.name}: <span className="font-black text-slate-900 dark:text-white font-mono">{entry.value}</span>
                        </p>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="w-full space-y-6 pb-12 animate-fadeIn relative">
            {/* CABECERA */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="w-6 h-[2px] bg-emerald-500 rounded-md" />
                        <p className="text-[11px] font-black text-emerald-600 dark:text-[#00df82] tracking-[0.2em] uppercase">Inteligencia de datos</p>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none font-heading">
                        Analítica de <span className="text-emerald-500 dark:text-[#00df82]">Atletas</span>
                    </h1>
                </div>
                <div className="flex items-center gap-2.5">
                    <div className="relative" ref={exportRef}>
                        <button
                            onClick={() => setExportOpen(o => !o)}
                            disabled={players.length === 0}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-md bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black text-[11px] font-black uppercase tracking-wider shadow-lg shadow-emerald-500/25 hover:brightness-110 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500/50"
                        >
                            {exported
                                ? <><HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-4 h-4" strokeWidth={2} /> Exportado</>
                                : <><HugeiconsIcon icon={Download01Icon} className="w-4 h-4" strokeWidth={2} /> Exportar</>}
                            <HugeiconsIcon icon={ArrowDown01Icon} className={`w-3.5 h-3.5 transition-transform ${exportOpen ? 'rotate-180' : ''}`} strokeWidth={2} />
                        </button>
                        {exportOpen && (
                            <div className="absolute right-0 top-[calc(100%+6px)] z-30 w-52 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl shadow-slate-200/60 dark:shadow-black/40 p-1.5 animate-fadeIn">
                                <button
                                    onClick={() => handleExport('csv')}
                                    className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-md text-left hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                                >
                                    <span className="flex items-center justify-center w-8 h-8 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-[#00df82] border border-emerald-500/20 shrink-0">
                                        <HugeiconsIcon icon={Download01Icon} className="w-4 h-4" strokeWidth={1.8} />
                                    </span>
                                    <span className="flex flex-col min-w-0">
                                        <span className="text-xs md:text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-wider">CSV (Excel)</span>
                                        <span className="text-[11px] md:text-[9px] text-slate-400">Formato es-CL con ';'</span>
                                    </span>
                                </button>
                                <button
                                    onClick={() => handleExport('json')}
                                    className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-md text-left hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                                >
                                    <span className="flex items-center justify-center w-8 h-8 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shrink-0">
                                        <HugeiconsIcon icon={DocumentCodeIcon} className="w-4 h-4" strokeWidth={1.8} />
                                    </span>
                                    <span className="flex flex-col min-w-0">
                                        <span className="text-xs md:text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-wider">JSON</span>
                                        <span className="text-[11px] md:text-[9px] text-slate-400">Datos estructurados</span>
                                    </span>
                                </button>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={fetchPlayers}
                        aria-label="Refrescar datos"
                        title="Refrescar datos"
                        className="p-2.5 rounded-md border bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-emerald-600 hover:border-emerald-300 active:scale-95 transition-all dark:bg-white/5 dark:border-white/10 dark:text-slate-300 dark:hover:border-[#00df82]/40 dark:hover:text-[#00df82] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500/40"
                    >
                        <HugeiconsIcon icon={RefreshIcon} className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} strokeWidth={2} />
                    </button>
                </div>
            </div>

            {/* RESUMEN */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-md bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 p-5">
                    <p className="text-xs md:text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Atletas</p>
                    <p className="text-3xl font-black text-slate-900 dark:text-white font-mono leading-none">{summary.total}</p>
                </div>
                <div className="rounded-md bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 p-5">
                    <p className="text-xs md:text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Nivel promedio</p>
                    <p className="text-3xl font-black text-slate-900 dark:text-white font-mono leading-none">{summary.avgOvr}</p>
                </div>
                <div className="rounded-md bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 p-5">
                    <p className="text-xs md:text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Goles totales</p>
                    <p className="text-3xl font-black text-emerald-600 dark:text-[#00df82] font-mono leading-none">{summary.totalGoals}</p>
                </div>
                <div className="rounded-md bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 p-5">
                    <p className="text-xs md:text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Máximo goleador</p>
                    <p className="text-lg font-black text-slate-900 dark:text-white uppercase leading-none truncate">{summary.topScorer}</p>
                </div>
            </div>

            {/* DISTRIBUCIÓN + GOLEADORES */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <SectionCard
                    title="Rangos de talento"
                    subtitle="Distribución por categoría"
                    icon={<HugeiconsIcon icon={CrownIcon} className="w-5 h-5" strokeWidth={1.8} />}
                    className="min-h-[340px]"
                    bodyClassName="p-5"
                >
                    {tiersData.length > 0 ? (
                        <div className="h-56 flex flex-col md:flex-row items-center gap-6">
                            <div className="flex-1 h-full relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={tiersData} innerRadius={58} outerRadius={80} paddingAngle={4} dataKey="value" stroke="rgba(255,255,255,0.4)" strokeWidth={1}>
                                            {tiersData.map((t, i) => <Cell key={i} fill={tierHex(t.name)} />)}
                                        </Pie>
                                        <Tooltip content={<TooltipBox />} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-3xl font-black text-slate-900 dark:text-white font-mono leading-none">{summary.total}</span>
                                    <span className="text-[11px] md:text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">Atletas</span>
                                </div>
                            </div>
                            <div className="flex flex-col gap-2 shrink-0">
                                {tiersData.map((t, i) => {
                                    const pct = summary.total ? Math.round((t.value / summary.total) * 100) : 0;
                                    return (
                                        <div key={i} className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tierHex(t.name) }} />
                                            <span className="text-[11px] md:text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                                                {t.name}: <span className="text-slate-900 dark:text-white font-mono">{t.value}</span>
                                                <span className="opacity-60 ml-1">· {pct}%</span>
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="py-14 text-center">
                            <HugeiconsIcon icon={CrownIcon} className="w-9 h-9 text-slate-200 dark:text-white/10 mx-auto mb-3" strokeWidth={1.6} />
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Sin atletas registrados</p>
                        </div>
                    )}
                </SectionCard>

                <SectionCard
                    title="Máximos goleadores"
                    subtitle="Top 8 por goles"
                    icon={<HugeiconsIcon icon={TrophyIcon} className="w-5 h-5" strokeWidth={1.8} />}
                    className="min-h-[340px]"
                    bodyClassName="p-5"
                    action={
                        <div className="flex gap-4">
                            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-[#00df82]" /><span className="text-xs md:text-[10px] font-bold uppercase text-slate-500 dark:text-slate-300">Goles</span></div>
                            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-600" /><span className="text-xs md:text-[10px] font-bold uppercase text-slate-500 dark:text-slate-300">Asist.</span></div>
                        </div>
                    }
                >
                    {scorers.length > 0 ? (
                        <div className="h-56">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={scorers} layout="vertical" barCategoryGap={4}>
                                    <defs>
                                        <linearGradient id="barGoles" x1="0" y1="0" x2="1" y2="0">
                                            <stop offset="0%" stopColor="#00df82" stopOpacity={0.55} />
                                            <stop offset="100%" stopColor="#00df82" stopOpacity={1} />
                                        </linearGradient>
                                        <linearGradient id="barAsist" x1="0" y1="0" x2="1" y2="0">
                                            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.55} />
                                            <stop offset="100%" stopColor="#6366f1" stopOpacity={1} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={GRID_STROKE} strokeOpacity={GRID_OPACITY} />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" tick={{ fontSize: 8, fontWeight: '900', fill: AXIS_FILL }} width={120} axisLine={false} tickLine={false} />
                                    <Tooltip content={<TooltipBox />} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
                                    <Bar name="GOLES" dataKey="goles" fill="url(#barGoles)" radius={[0, 4, 4, 0]} barSize={10} />
                                    <Bar name="ASISTENCIAS" dataKey="asistencias" fill="url(#barAsist)" radius={[0, 4, 4, 0]} barSize={10} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="py-14 text-center">
                            <HugeiconsIcon icon={FireIcon} className="w-9 h-9 text-slate-200 dark:text-white/10 mx-auto mb-3" strokeWidth={1.6} />
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Sin datos de goles</p>
                        </div>
                    )}
                </SectionCard>
            </div>

            {/* RANKING */}
            <SectionCard
                title="Ranking global"
                subtitle="Atletas por valoración (OVR)"
                icon={<HugeiconsIcon icon={UserGroupIcon} className="w-5 h-5" strokeWidth={1.8} />}
                bodyClassName="p-0"
                action={
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 focus-within:border-emerald-400 dark:focus-within:border-[#00df82]/40 transition-colors">
                            <HugeiconsIcon icon={Search01Icon} className="w-3.5 h-3.5 text-slate-400 shrink-0" strokeWidth={2} />
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Buscar..."
                                className="w-28 bg-transparent text-xs md:text-[10px] font-black outline-hidden text-slate-700 dark:text-white placeholder:text-slate-400"
                            />
                        </div>
                        <select
                            value={tierFilter}
                            onChange={(e) => setTierFilter(e.target.value)}
                            className="px-3 py-1.5 rounded-md bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs md:text-[10px] font-black uppercase outline-hidden text-slate-700 dark:text-white focus:border-emerald-400 dark:focus:border-[#00df82]/40 transition-colors"
                        >
                            {tiers.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                }
            >
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left min-w-[680px]">
                        <thead>
                            <tr className="bg-slate-50/60 dark:bg-white/2 border-b border-slate-100 dark:border-white/5">
                                <th className="px-6 py-4 text-xs md:text-[10px] font-black text-slate-400 uppercase tracking-wider">#</th>
                                <th className="px-6 py-4 text-xs md:text-[10px] font-black text-slate-400 uppercase tracking-wider">Atleta</th>
                                <th className="px-6 py-4 text-xs md:text-[10px] font-black text-slate-400 uppercase tracking-wider">Categoría</th>
                                <th className="px-6 py-4 text-xs md:text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">OVR</th>
                                <th className="px-6 py-4 text-xs md:text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Goles</th>
                                <th className="px-6 py-4 text-xs md:text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Victorias</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {filteredRanking.slice(0, 10).map((p, i) => (
                                <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-white/2 transition-colors">
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-md font-black font-mono text-[11px] ${i < 3 ? 'bg-emerald-500 text-white dark:bg-[#00df82] dark:text-black' : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400'}`}>
                                            {i + 1}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[11px] font-black text-emerald-600 dark:text-[#00df82] uppercase shrink-0">
                                                {p.name.charAt(0)}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-[11px] font-bold text-slate-900 dark:text-white uppercase truncate max-w-[180px]">{p.name}</span>
                                                <span className="text-xs md:text-[10px] text-slate-400 truncate max-w-[180px]">{p.email}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`text-xs md:text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider ${tierStyle(p.level)}`}>
                                            {p.level}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right text-[11px] font-black text-slate-900 dark:text-white font-mono">{p.ovr}</td>
                                    <td className="px-6 py-4 text-right text-[11px] font-bold text-slate-500 dark:text-slate-400 font-mono">{p.goals}</td>
                                    <td className="px-6 py-4 text-right text-[11px] font-bold text-emerald-600 dark:text-[#00df82] font-mono">{p.wins}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredRanking.length === 0 && (
                        <div className="py-14 text-center">
                            <HugeiconsIcon icon={UserGroupIcon} className="w-9 h-9 text-slate-200 dark:text-white/10 mx-auto mb-3" strokeWidth={1.6} />
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Sin atletas para mostrar</p>
                        </div>
                    )}
                    {filteredRanking.length > 10 && (
                        <div className="px-6 py-3 border-t border-slate-100 dark:border-white/5 text-xs md:text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Mostrando 10 de {filteredRanking.length} atletas
                        </div>
                    )}
                </div>
            </SectionCard>
        </div>
    );
}