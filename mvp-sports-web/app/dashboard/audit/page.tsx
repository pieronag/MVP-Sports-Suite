"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { HugeiconsIcon } from "@hugeicons/react";
import {
    Search01Icon,
    ShieldCheckIcon,
    Alert02Icon,
    GlobeIcon,
    Clock01Icon,
    HashtagIcon,
    CheckmarkCircle02Icon,
    RefreshIcon,
    FingerPrintIcon,
    BoltIcon,
    Download01Icon,
    FilterIcon,
    Activity01Icon,
    Database01Icon,
    Cancel01Icon,
} from '@hugeicons/core-free-icons';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/services/client/firebase';
import { useAuth } from '@/context/AuthContext';

import { TarjetaKpi, SectionCard } from '@/components/ui/DashboardWidgets';

const ic = "w-6 h-6";

interface AuditLog {
    id: string;
    traceId: string;
    severity: string;
    action: string;
    module: string;
    actor: string;
    role: string;
    email: string;
    ip: string;
    location: string;
    device: string;
    status: string;
    details: string;
    date: string;
    time: string;
}

export default function Page() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [filter, setFilter] = useState('Todos');
    const [searchTerm, setSearchTerm] = useState('');
    const [moduleFilter, setModuleFilter] = useState('Todos');
    const [loading, setLoading] = useState(true);
    const { role } = useAuth();

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, "audit"), orderBy("timestamp", "desc"), limit(500));
            const snapshot = await getDocs(q);

            const loadedLogs: AuditLog[] = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    traceId: data.traceId || `TRC-${doc.id.slice(0, 6).toUpperCase()}`,
                    severity: data.severity || "info",
                    action: data.action || "SISTEMA_LOG",
                    module: data.module || "Core",
                    actor: data.actor || "Automated System",
                    role: data.role || "System",
                    email: data.email || "internal@mvp.cl",
                    ip: data.ip || "127.0.0.1",
                    location: data.location || "Central Cloud",
                    device: data.device || "Server",
                    status: data.status || "Success",
                    details: data.details || "Operación registrada correctamente.",
                    date: data.dateStr || new Date().toLocaleDateString('es-CL'),
                    time: data.timeStr || new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
                };
            });

            setLogs(loadedLogs);
        } catch (error) {
            console.error("Error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchLogs(); }, []);

    const modules = useMemo(() => ['Todos', ...Array.from(new Set(logs.map(l => l.module)))], [logs]);

    const filteredLogs = useMemo(() => {
        return logs.filter(l => {
            const matchesSearch =
                !searchTerm ||
                l.traceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                l.ip.toLowerCase().includes(searchTerm.toLowerCase()) ||
                l.actor.toLowerCase().includes(searchTerm.toLowerCase()) ||
                l.email.toLowerCase().includes(searchTerm.toLowerCase());
            if (!matchesSearch) return false;
            if (filter === 'Críticos' && !['critical', 'high'].includes(l.severity.toLowerCase())) return false;
            if (filter === 'Advertencias' && !['warning', 'medium'].includes(l.severity.toLowerCase())) return false;
            if (filter === 'Fallidos' && !['failed', 'blocked', 'error'].includes(l.status.toLowerCase())) return false;
            if (moduleFilter !== 'Todos' && l.module !== moduleFilter) return false;
            return true;
        });
    }, [logs, searchTerm, filter, moduleFilter]);

    const kpis = useMemo(() => {
        const critical = logs.filter(l => ['critical', 'high'].includes(l.severity.toLowerCase())).length;
        const failed = logs.filter(l => ['failed', 'blocked', 'warning'].includes(l.status.toLowerCase())).length;
        const success = logs.filter(l => l.status.toLowerCase() === 'success').length;
        const successRate = logs.length > 0 ? Math.round((success / logs.length) * 100) : 0;
        return { total: logs.length, critical, failed, successRate };
    }, [logs]);

    const exportCSV = () => {
        const sep = ';';
        const esc = (v: any) => {
            const s = String(v ?? '');
            return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        };
        const line = (cells: any[]) => cells.map(esc).join(sep);
        const headers = ['Fecha', 'Hora', 'TraceId', 'Severidad', 'Acción', 'Módulo', 'Actor', 'Rol', 'Email', 'IP', 'Ubicación', 'Dispositivo', 'Resultado', 'Detalle'];
        const body = filteredLogs.map(l => line([
            l.date, l.time, l.traceId, l.severity, l.action, l.module, l.actor, l.role, l.email, l.ip, l.location, l.device, l.status, l.details,
        ]));
        const blob = new Blob(["\ufeff" + [line(headers)].concat(body).join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `auditoria_mvp_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click(); URL.revokeObjectURL(url);
    };

    const getSeverityStyle = (s: string) => {
        const severity = s.toLowerCase();
        if (severity === 'critical' || severity === 'high') return 'bg-red-500/15 text-red-600 border-red-500/30 dark:text-red-400';
        if (severity === 'warning' || severity === 'medium') return 'bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400';
        return 'bg-slate-500/15 text-slate-600 border-slate-500/30 dark:text-slate-400';
    };
    const getSeverityDot = (s: string) => {
        const severity = s.toLowerCase();
        if (severity === 'critical' || severity === 'high') return 'bg-red-500';
        if (severity === 'warning' || severity === 'medium') return 'bg-amber-500';
        return 'bg-slate-400';
    };
    const getStatusBadge = (s: string) => {
        const status = s.toLowerCase();
        if (status === 'success') return 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:text-[#00df82]';
        if (status === 'blocked') return 'bg-purple-500/15 text-purple-600 border-purple-500/30 dark:text-purple-400';
        return 'bg-red-500/15 text-red-600 border-red-500/30 dark:text-red-400';
    };
    const getStatusDot = (s: string) => {
        const status = s.toLowerCase();
        if (status === 'success') return 'bg-emerald-500';
        if (status === 'blocked') return 'bg-purple-500';
        return 'bg-red-500';
    };
    const sevLabel = (s: string) => {
        const v = s.toLowerCase();
        if (v === 'critical') return 'Crítica';
        if (v === 'high') return 'Alta';
        if (v === 'warning') return 'Advertencia';
        if (v === 'medium') return 'Media';
        if (v === 'error') return 'Error';
        if (v === 'info') return 'Info';
        return s;
    };
    const statusLabel = (s: string) => {
        const v = s.toLowerCase();
        if (v === 'success') return 'Éxito';
        if (v === 'failed') return 'Fallido';
        if (v === 'blocked') return 'Bloqueado';
        if (v === 'warning') return 'Advertencia';
        if (v === 'error') return 'Error';
        if (v === 'pending') return 'Pendiente';
        return s;
    };

    if (role !== 'admin' && role !== 'superadmin') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-10 animate-fadeIn">
                <span className="flex items-center justify-center w-20 h-20 rounded-md bg-red-500/10 border border-red-500/20 mb-6">
                    <HugeiconsIcon icon={ShieldCheckIcon} className="w-10 h-10 text-red-500/70" strokeWidth={1.6} />
                </span>
                <h1 className="text-2xl font-black uppercase text-slate-900 dark:text-white mb-2 font-heading">Acceso restringido</h1>
                <p className="text-xs md:text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    Esta vista es exclusiva para administradores del sistema.
                </p>
            </div>
        );
    }

    return (
        <div className="w-full space-y-6 pb-10 text-left relative animate-fadeIn">
            {/* CABECERA */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="w-6 h-[2px] bg-emerald-500 rounded-md" />
                        <p className="text-[11px] font-black text-emerald-600 dark:text-[#00df82] tracking-[0.2em] uppercase">Trazabilidad estructural & seguridad</p>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none font-heading">
                        Monitor de <span className="text-emerald-500 dark:text-[#00df82]">Auditoría</span>
                    </h1>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={exportCSV}
                        disabled={filteredLogs.length === 0}
                        className="flex items-center gap-2 px-3.5 py-2.5 rounded-md bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 text-[11px] font-black uppercase tracking-wider hover:border-emerald-400 dark:hover:border-[#00df82]/40 hover:text-emerald-600 dark:hover:text-[#00df82] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <HugeiconsIcon icon={Download01Icon} className="w-4 h-4" strokeWidth={2} />
                        Exportar
                    </button>
                    <button
                        onClick={fetchLogs}
                        className="flex items-center gap-2 px-3.5 py-2.5 rounded-md bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black text-[11px] font-black uppercase tracking-wider shadow-lg shadow-emerald-500/25 hover:brightness-110 active:scale-95 transition-all"
                    >
                        <HugeiconsIcon icon={RefreshIcon} className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} strokeWidth={2} />
                        Sincronizar
                    </button>
                </div>
            </div>

            {/* KPIs reales */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 [&>*:last-child:nth-child(odd)]:col-span-2 sm:[&>*:last-child:nth-child(odd)]:col-span-1">
                <TarjetaKpi titulo="Eventos totales" valor={kpis.total} sub="Registros en el núcleo" icono={<HugeiconsIcon icon={Database01Icon} className={ic} strokeWidth={1.6} />} brillo />
                <TarjetaKpi titulo="Críticos" valor={kpis.critical} sub="Revisión requerida" icono={<HugeiconsIcon icon={Alert02Icon} className={ic} strokeWidth={1.6} />} />
                <TarjetaKpi titulo="Fallidos" valor={kpis.failed} sub="Acciones rechazadas" icono={<HugeiconsIcon icon={Cancel01Icon} className={ic} strokeWidth={1.6} />} />
                <TarjetaKpi titulo="Tasa de éxito" valor={`${kpis.successRate}%`} sub="Operaciones correctas" icono={<HugeiconsIcon icon={CheckmarkCircle02Icon} className={ic} strokeWidth={1.6} />} />
            </div>

            {/* FILTROS */}
            <div className="flex flex-col lg:flex-row gap-3 justify-between items-start lg:items-center p-4 rounded-md bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5">
                <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                    <div className="relative w-full sm:w-80">
                        <HugeiconsIcon icon={Search01Icon} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" strokeWidth={1.8} />
                        <input
                            type="text"
                            placeholder="Buscar por ID de trazabilidad, IP, actor o acción..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-emerald-500/40 dark:focus:border-[#00df82]/40 rounded-md text-xs md:text-[10px] font-black outline-hidden text-slate-700 dark:text-white placeholder:text-slate-400 transition-all"
                        />
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10">
                        <HugeiconsIcon icon={FilterIcon} className="w-3.5 h-3.5 text-slate-400 shrink-0" strokeWidth={2} />
                        <select
                            value={moduleFilter}
                            onChange={(e) => setModuleFilter(e.target.value)}
                            className="bg-transparent text-xs md:text-[10px] font-black uppercase outline-hidden text-slate-700 dark:text-white"
                        >
                            {modules.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                </div>
                <div className="flex bg-white dark:bg-white/5 p-1 rounded-md border border-slate-200 dark:border-white/10">
                    {["Todos", "Críticos", "Advertencias", "Fallidos"].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-5 py-1.5 text-[11px] md:text-[9px] font-black uppercase rounded-md transition-all ${filter === f ? "bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black" : "text-slate-400 hover:text-slate-700 dark:hover:text-white"}`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {/* CONSOLA DE LOGS */}
            <SectionCard
                title="Consola de auditoría"
                subtitle={`${filteredLogs.length} registro(s) en la vista`}
                icon={<HugeiconsIcon icon={FingerPrintIcon} className="w-5 h-5" strokeWidth={1.8} />}
                bodyClassName="p-0"
                action={
                    <span className="text-[11px] md:text-[9px] bg-emerald-500/15 text-emerald-600 dark:text-[#00df82] px-2.5 py-1 rounded-md font-black uppercase tracking-wider">Trazabilidad</span>
                }
            >
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left min-w-[1080px]">
                        <thead>
                            <tr className="bg-slate-50/60 dark:bg-white/2 border-b border-slate-100 dark:border-white/5">
                                <th className="px-6 py-4 text-xs md:text-[10px] font-black text-slate-400 uppercase tracking-wider">Fecha / ID</th>
                                <th className="px-6 py-4 text-xs md:text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">Severidad</th>
                                <th className="px-6 py-4 text-xs md:text-[10px] font-black text-slate-400 uppercase tracking-wider">Actor / Rol</th>
                                <th className="px-6 py-4 text-xs md:text-[10px] font-black text-slate-400 uppercase tracking-wider">Acción & módulo</th>
                                <th className="px-6 py-4 text-xs md:text-[10px] font-black text-slate-400 uppercase tracking-wider">Detalle técnico</th>
                                <th className="px-6 py-4 text-xs md:text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Resultado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {filteredLogs.length > 0 ? filteredLogs.map((log) => (
                                <tr key={log.id} className={`group hover:bg-slate-50/60 dark:hover:bg-white/2 transition-colors ${['critical', 'high'].includes(log.severity.toLowerCase()) ? 'bg-red-500/3' : ''}`}>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-xs md:text-[10px] font-black text-slate-900 dark:text-white uppercase">{log.date}</span>
                                            <span className="text-[11px] md:text-[9px] font-bold text-slate-400 mt-0.5">{log.time} · <span className="text-emerald-600 dark:text-[#00df82] font-mono">{log.traceId}</span></span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] md:text-[8px] font-black uppercase border ${getSeverityStyle(log.severity)}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${getSeverityDot(log.severity)}`} />
                                            {sevLabel(log.severity)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-xs md:text-[10px] font-black text-slate-900 dark:text-white uppercase">{log.actor}</span>
                                            <span className="text-[11px] md:text-[8px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">{log.role} · {log.email}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-xs md:text-[10px] font-black text-indigo-600 dark:text-[#00df82] uppercase block">{log.action}</span>
                                        <span className="text-[11px] md:text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{log.module}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-[11px] md:text-[9px] font-bold text-slate-500 dark:text-slate-300 leading-relaxed max-w-xs wrap-break-word uppercase">{log.details}</p>
                                        <div className="flex items-center gap-1.5 mt-2 text-[11px] md:text-[8px] font-black text-slate-400 uppercase">
                                            <HugeiconsIcon icon={GlobeIcon} className="w-3 h-3" strokeWidth={1.8} />
                                            {log.ip} <span className="opacity-30">·</span> {log.location} <span className="opacity-30">·</span> {log.device}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] md:text-[8px] font-black uppercase border ${getStatusBadge(log.status)}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(log.status)}`} />
                                            {statusLabel(log.status)}
                                        </span>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center">
                                        <HugeiconsIcon icon={FingerPrintIcon} className="w-12 h-12 text-slate-200 dark:text-white/10 mx-auto mb-4" strokeWidth={1.6} />
                                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Sin registros en la vista seleccionada</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </SectionCard>
        </div>
    );
}