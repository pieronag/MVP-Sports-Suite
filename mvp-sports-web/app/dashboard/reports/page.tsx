"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { HugeiconsIcon } from "@hugeicons/react";
import {
    Search01Icon,
    Ticket01Icon,
    Clock01Icon,
    Alert02Icon,
    Message02Icon,
    MoneyBag01Icon,
    CodeIcon,
    UserCircleIcon,
    RefreshIcon,
    Wrench01Icon,
    Bug01Icon,
    Settings01Icon,
    Download01Icon,
    Cancel01Icon,
    FilterIcon,
    CheckmarkCircle02Icon,
    ArrowUpRight01Icon,
ViewIcon, } from '@hugeicons/core-free-icons';
import { collection, getDocs, query, orderBy, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/services/client/firebase';
import { useAuth } from '@/context/AuthContext';
import { auditService } from '@/services/client/auditService';
import { TarjetaKpi, SectionCard } from '@/components/ui/DashboardWidgets';

const ic = "w-6 h-6";

interface Ticket {
    id: string;
    subject: string;
    desc: string;
    tenant: string;
    user: string;
    userEmail?: string;
    userName?: string;
    category: string;
    priority: string;
    status: string;
    assignee: string;
    createdRaw: Date;
    created: string;
    sla: number;
    response?: string;
    repliedAt?: any;
    repliedBy?: string;
    stepsToReproduce?: string;
    screen?: string;
    userAgent?: string;
    browser?: string;
    os?: string;
}

export default function Page() {
    const { user, firestoreUser, role } = useAuth();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [filter, setFilter] = useState('Todos');
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('Todos');
    const [priorityFilter, setPriorityFilter] = useState('Todas');
    const [loading, setLoading] = useState(true);

    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [adminResponse, setAdminResponse] = useState('');
    const [ticketStatus, setTicketStatus] = useState('Abierto');
    const [saving, setSaving] = useState(false);

    const getRelativeTime = (date: Date) => {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        if (diffMins < 1) return 'Ahora';
        if (diffMins < 60) return `Hace ${diffMins}m`;
        if (diffHours < 24) return `Hace ${diffHours}h`;
        if (diffDays < 7) return `Hace ${diffDays}d`;
        return date.toLocaleDateString('es-CL');
    };

    const fetchTickets = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, "reports"), orderBy("createdAt", "desc"));
            const snapshot = await getDocs(q);

            const loadedTickets: Ticket[] = snapshot.docs.map(doc => {
                const data = doc.data();
                const createdDate = data.createdAt ? new Date(data.createdAt.seconds * 1000) : new Date();
                return {
                    id: doc.id,
                    subject: data.subject || "Sin Asunto",
                    desc: data.description || "Sin descripción",
                    tenant: data.tenantName || "Desconocido",
                    user: data.userId || "Anonimo",
                    userEmail: data.userEmail || "",
                    userName: data.userName || "",
                    category: data.category || "Support",
                    priority: data.priority || "Media",
                    status: data.status || "Abierto",
                    assignee: data.repliedBy || "Soporte N1",
                    createdRaw: createdDate,
                    created: getRelativeTime(createdDate),
                    sla: data.sla || 0,
                    response: data.response || "",
                    repliedAt: data.repliedAt || null,
                    repliedBy: data.repliedBy || "",
                    stepsToReproduce: data.stepsToReproduce || "No especificados",
                    screen: data.screen || "No especificada",
                    userAgent: data.userAgent || "",
                    browser: data.browser || "",
                    os: data.os || ""
                };
            });

            setTickets(loadedTickets);
        } catch (error) {
            console.error("Error cargando tickets:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchTickets(); }, []);

    const categories = useMemo(() => ['Todos', ...Array.from(new Set(tickets.map(t => t.category)))], [tickets]);
    const priorities = useMemo(() => ['Todas', ...Array.from(new Set(tickets.map(t => t.priority)))], [tickets]);

    const handleOpenManageModal = (ticket: Ticket) => {
        setSelectedTicket(ticket);
        setAdminResponse(ticket.response || '');
        setTicketStatus(ticket.status || 'Abierto');
        setModalOpen(true);
    };

    const handleSaveManagement = async () => {
        if (!selectedTicket) return;
        setSaving(true);
        try {
            const docRef = doc(db, "reports", selectedTicket.id);
            const operatorName = firestoreUser?.fullName || firestoreUser?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Soporte MVP';

            await updateDoc(docRef, {
                status: ticketStatus,
                response: adminResponse.trim(),
                repliedAt: serverTimestamp(),
                repliedBy: operatorName
            });

            await auditService.logAuditEvent({
                action: 'REPORTE_INCIDENCIA_GESTIONADO',
                module: 'Soporte Técnico',
                details: `Ticket N° ${selectedTicket.id} gestionado por ${operatorName}. Estado: "${ticketStatus}". Respuesta: "${adminResponse.trim().slice(0, 60)}..."`,
                severity: selectedTicket.priority === 'Crítica' ? 'HIGH' : 'LOW',
                status: 'SUCCESS',
                actor: operatorName,
                role: role || 'sin-rol',
                email: user?.email || 'anonimo@mvpsports.cl'
            });

            setModalOpen(false);
            setSelectedTicket(null);
            fetchTickets();
        } catch (err) {
            console.error("Error al gestionar el reporte:", err);
            alert("Error al guardar cambios: " + (err as any).message);
        } finally {
            setSaving(false);
        }
    };

    const filteredTickets = useMemo(() => {
        return tickets.filter(t => {
            const matchesSearch =
                !searchTerm ||
                t.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.tenant.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (t.userEmail || '').toLowerCase().includes(searchTerm.toLowerCase());

            if (!matchesSearch) return false;
            if (filter === 'Abiertos' && t.status !== 'Abierto' && t.status !== 'En Proceso') return false;
            if (filter === 'Críticos' && t.priority !== 'Crítica') return false;
            if (filter === 'Resueltos' && t.status !== 'Resuelto') return false;
            if (categoryFilter !== 'Todos' && t.category !== categoryFilter) return false;
            if (priorityFilter !== 'Todas' && t.priority !== priorityFilter) return false;
            return true;
        });
    }, [tickets, searchTerm, filter, categoryFilter, priorityFilter]);

    const kpis = useMemo(() => {
        const open = tickets.filter(t => t.status === 'Abierto' || t.status === 'En Proceso').length;
        const critical = tickets.filter(t => t.priority === 'Crítica' && t.status !== 'Resuelto').length;
        const resolved = tickets.filter(t => t.status === 'Resuelto').length;
        return { open, critical, resolved, total: tickets.length };
    }, [tickets]);

    const exportCSV = () => {
        const sep = ';';
        const esc = (v: any) => {
            const s = String(v ?? '');
            return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        };
        const line = (cells: any[]) => cells.map(esc).join(sep);
        const headers = ['ID', 'Asunto', 'Descripción', 'Recinto', 'Usuario', 'Email', 'Categoría', 'Prioridad', 'Estado', 'Creado', 'Respuesta'];
        const body = filteredTickets.map(t => line([
            t.id, t.subject, t.desc, t.tenant, t.userName || t.user, t.userEmail, t.category, t.priority, t.status,
            t.createdRaw.toISOString(), t.response || '',
        ]));
        const blob = new Blob(["\ufeff" + [line(headers)].concat(body).join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `reportes_mvp_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click(); URL.revokeObjectURL(url);
    };

    const getPriorityStyle = (p: string) => {
        switch (p) {
            case 'Crítica': return 'text-red-600 bg-red-50 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30';
            case 'Alta': return 'text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/30';
            case 'Media': return 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/30';
            default: return 'text-slate-500 bg-slate-100 border-slate-200 dark:bg-white/5 dark:text-slate-400 dark:border-white/10';
        }
    };
    const getCategoryIcon = (c: string) => {
        switch (c) {
            case 'Bug': return <HugeiconsIcon icon={Bug01Icon} className="w-4 h-4 text-red-500" strokeWidth={1.8} />;
            case 'Billing':
            case 'Facturación': return <HugeiconsIcon icon={MoneyBag01Icon} className="w-4 h-4 text-emerald-500" strokeWidth={1.8} />;
            case 'Feature': return <HugeiconsIcon icon={Settings01Icon} className="w-4 h-4 text-purple-500" strokeWidth={1.8} />;
            default: return <HugeiconsIcon icon={Message02Icon} className="w-4 h-4 text-blue-500" strokeWidth={1.8} />;
        }
    };
    const getStatusBadge = (s: string) => {
        switch (s) {
            case 'Abierto': return 'bg-white border-slate-300 text-slate-600 dark:bg-transparent dark:border-white/20 dark:text-slate-300';
            case 'En Proceso': return 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-500/10 dark:border-blue-500/30 dark:text-blue-400';
            case 'Resuelto': return 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-400';
            default: return 'bg-white border-slate-300 text-slate-600 dark:bg-transparent dark:border-white/20 dark:text-slate-300';
        }
    };
    const statusDot = (s: string) => {
        if (s === 'Resuelto') return 'bg-emerald-500';
        if (s === 'En Proceso') return 'bg-blue-500';
        return 'bg-amber-500';
    };

    return (
        <div className="w-full space-y-6 pb-12 animate-fadeIn relative">
            {/* CABECERA */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="w-6 h-[2px] bg-emerald-500 rounded-md" />
                        <p className="text-[11px] font-black text-emerald-600 dark:text-[#00df82] tracking-[0.2em] uppercase">Monitor de incidencias & feedback</p>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none font-heading">
                        Centro de <span className="text-emerald-500 dark:text-[#00df82]">Soporte Técnico</span>
                    </h1>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={exportCSV}
                        disabled={filteredTickets.length === 0}
                        className="flex items-center gap-2 px-3.5 py-2.5 rounded-md bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 text-[11px] font-black uppercase tracking-wider hover:border-emerald-400 dark:hover:border-[#00df82]/40 hover:text-emerald-600 dark:hover:text-[#00df82] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <HugeiconsIcon icon={Download01Icon} className="w-4 h-4" strokeWidth={2} />
                        Exportar
                    </button>
                    <button
                        onClick={fetchTickets}
                        aria-label="Refrescar datos"
                        title="Refrescar datos"
                        className="p-2.5 rounded-md border bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-emerald-600 hover:border-emerald-300 active:scale-95 transition-all dark:bg-white/5 dark:border-white/10 dark:text-slate-300 dark:hover:border-[#00df82]/40 dark:hover:text-[#00df82]"
                    >
                        <HugeiconsIcon icon={RefreshIcon} className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} strokeWidth={2} />
                    </button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <TarjetaKpi titulo="Tickets pendientes" valor={kpis.open} sub="Abiertos y en proceso" icono={<HugeiconsIcon icon={Ticket01Icon} className={ic} strokeWidth={1.6} />} brillo />
                <TarjetaKpi titulo="Alertas críticas" valor={kpis.critical} sub="Sin resolver" icono={<HugeiconsIcon icon={Alert02Icon} className={ic} strokeWidth={1.6} />} />
                <TarjetaKpi titulo="Resueltos" valor={kpis.resolved} sub="Cerraron el ciclo" icono={<HugeiconsIcon icon={CheckmarkCircle02Icon} className={ic} strokeWidth={1.6} />} />
                <TarjetaKpi titulo="Total reportes" valor={kpis.total} sub="Histórico completo" icono={<HugeiconsIcon icon={CodeIcon} className={ic} strokeWidth={1.6} />} />
            </div>

            {/* FILTROS */}
            <div className="flex flex-col lg:flex-row gap-3 justify-between items-start lg:items-center p-4 rounded-md bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5">
                <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                    <div className="relative w-full sm:w-72">
                        <HugeiconsIcon icon={Search01Icon} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" strokeWidth={1.8} />
                        <input
                            type="text"
                            placeholder="Buscar ticket, recinto, email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-emerald-500/40 dark:focus:border-[#00df82]/40 rounded-md text-[10px] font-black outline-hidden text-slate-700 dark:text-white placeholder:text-slate-400 transition-all"
                        />
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10">
                        <HugeiconsIcon icon={FilterIcon} className="w-3.5 h-3.5 text-slate-400 shrink-0" strokeWidth={2} />
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="bg-transparent text-[10px] font-black uppercase outline-hidden text-slate-700 dark:text-white"
                        >
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <select
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value)}
                        className="px-2.5 py-2 rounded-md bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[10px] font-black uppercase outline-hidden text-slate-700 dark:text-white"
                    >
                        {priorities.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>
                <div className="flex bg-white dark:bg-white/5 p-1 rounded-md border border-slate-200 dark:border-white/10">
                    {["Todos", "Abiertos", "Críticos", "Resueltos"].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-1.5 text-[9px] font-black uppercase rounded-md transition-all ${filter === f ? "bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black" : "text-slate-400 hover:text-slate-700 dark:hover:text-white"}`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {/* LISTADO */}
            <SectionCard
                title="Reportes e incidencias"
                subtitle={`${filteredTickets.length} ticket(s) en la vista`}
                icon={<HugeiconsIcon icon={Ticket01Icon} className="w-5 h-5" strokeWidth={1.8} />}
                bodyClassName="p-0"
                action={
                    <span className="text-[9px] bg-emerald-500/15 text-emerald-600 dark:text-[#00df82] px-2.5 py-1 rounded-md font-black uppercase tracking-wider">Tickets</span>
                }
            >
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left min-w-[1080px]">
                        <thead>
                            <tr className="bg-slate-50/60 dark:bg-white/2 border-b border-slate-100 dark:border-white/5">
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Ticket</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Asunto</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Cliente</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">Prioridad</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">Estado</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Asignado a</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Creado</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {filteredTickets.length > 0 ? filteredTickets.map((t) => (
                                <tr key={t.id} className="hover:bg-slate-50/60 dark:hover:bg-white/2 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2.5">
                                            <div className="flex items-center gap-1.5">
                                                {getCategoryIcon(t.category)}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-mono font-black text-slate-900 dark:text-white text-[10px]">#{t.id.slice(0, 8)}</span>
                                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">{t.category}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col max-w-[300px]">
                                            <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase leading-snug">{t.subject}</p>
                                            <p className="text-[9px] text-slate-400 line-clamp-1 mt-0.5">{t.desc}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <p className="text-[10px] font-bold text-slate-900 dark:text-white uppercase">{t.tenant}</p>
                                            <p className="text-[8px] text-slate-400 uppercase truncate max-w-[140px]">{t.userEmail || t.userName || t.user}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase border ${getPriorityStyle(t.priority)}`}>
                                            {t.priority}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-black uppercase border ${getStatusBadge(t.status)}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${statusDot(t.status)}`} />
                                            {t.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex flex-col items-center gap-1">
                                            <HugeiconsIcon icon={UserCircleIcon} className="w-5 h-5 text-slate-300 dark:text-slate-600" strokeWidth={1.6} />
                                            <span className="text-[8px] text-slate-500 dark:text-slate-400 font-bold uppercase">{t.assignee}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase font-mono">{t.created}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {t.status !== 'Resuelto' ? (
                                            <button
                                                onClick={() => handleOpenManageModal(t)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black text-[9px] font-black uppercase tracking-wider shadow-lg shadow-emerald-500/20 hover:brightness-110 active:scale-95 transition-all"
                                            >
                                                <HugeiconsIcon icon={Wrench01Icon} className="w-3.5 h-3.5" strokeWidth={2} />
                                                Gestionar
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleOpenManageModal(t)}
                                                title="Ver detalle"
                                                className="p-2 text-slate-400 hover:text-emerald-600 dark:hover:text-[#00df82] hover:bg-slate-100 dark:hover:bg-white/5 rounded-md transition-all"
                                            >
                                                <HugeiconsIcon icon={ViewIcon} className="w-4 h-4" strokeWidth={1.8} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={8} className="px-6 py-16 text-center">
                                        <HugeiconsIcon icon={Ticket01Icon} className="w-10 h-10 text-slate-200 dark:text-white/10 mx-auto mb-3" strokeWidth={1.6} />
                                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Sin reportes en la vista seleccionada</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </SectionCard>

            {/* MODAL DE GESTIÓN */}
            {modalOpen && selectedTicket && (
                <div className="fixed inset-0 z-400 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn" onClick={() => setModalOpen(false)}>
                    <div className="bg-white dark:bg-[#0B0F19] rounded-md shadow-2xl border border-slate-200 dark:border-white/10 w-full max-w-2xl overflow-hidden animate-fadeIn text-left" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-500/10 dark:bg-[#00df82]/10 rounded-md text-emerald-600 dark:text-[#00df82] border border-emerald-500/20">
                                    <HugeiconsIcon icon={Wrench01Icon} className="w-5 h-5" strokeWidth={1.8} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase leading-none font-heading">Gestionar ticket</h3>
                                    <p className="text-[10px] font-mono text-slate-400 mt-1 uppercase font-black tracking-widest">ID: #{selectedTicket.id.slice(0, 8).toUpperCase()}</p>
                                </div>
                            </div>
                            <button onClick={() => setModalOpen(false)} aria-label="Cerrar" className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-md transition-all">
                                <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" strokeWidth={2} />
                            </button>
                        </div>

                        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            {/* info reportante / recinto */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2 p-4 rounded-md bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5">
                                    <h4 className="text-[9px] font-black uppercase tracking-wider text-slate-400">Información del cliente</h4>
                                    <div className="text-[11px] space-y-1.5">
                                        <p className="text-slate-800 dark:text-slate-200 font-bold"><span className="text-slate-400 uppercase font-semibold">Usuario:</span> {selectedTicket.userName || 'No especificado'}</p>
                                        <p className="text-slate-800 dark:text-slate-200 font-bold"><span className="text-slate-400 uppercase font-semibold">Email:</span> {selectedTicket.userEmail || 'No especificado'}</p>
                                        <p className="text-slate-800 dark:text-slate-200 font-bold"><span className="text-slate-400 uppercase font-semibold">ID:</span> <span className="font-mono">{selectedTicket.user}</span></p>
                                    </div>
                                </div>
                                <div className="space-y-2 p-4 rounded-md bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5">
                                    <h4 className="text-[9px] font-black uppercase tracking-wider text-slate-400">Recinto & SLA</h4>
                                    <div className="text-[11px] space-y-1.5">
                                        <p className="text-slate-800 dark:text-slate-200 font-bold"><span className="text-slate-400 uppercase font-semibold">Complejo:</span> {selectedTicket.tenant}</p>
                                        <p className="text-slate-800 dark:text-slate-200 font-bold"><span className="text-slate-400 uppercase font-semibold">Enviado:</span> {selectedTicket.createdRaw.toLocaleString('es-CL', { timeZone: 'America/Santiago' })}</p>
                                        <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                                            <span className="text-slate-400 uppercase font-semibold">SLA restante:</span>
                                            <span className={selectedTicket.status === 'Resuelto' ? 'text-emerald-500' : selectedTicket.sla > 90 ? 'text-red-500' : 'text-blue-500'}>
                                                {selectedTicket.status === 'Resuelto' ? '100% (Resuelto)' : `${100 - selectedTicket.sla}%`}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* asunto y descripción */}
                            <div className="space-y-3">
                                <div>
                                    <h4 className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">Asunto</h4>
                                    <p className="text-sm font-black text-slate-900 dark:text-white uppercase">{selectedTicket.subject}</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <h4 className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">Descripción del problema</h4>
                                        <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-md p-3.5 text-xs text-slate-700 dark:text-slate-300 font-medium whitespace-pre-line leading-relaxed max-h-32 overflow-y-auto">
                                            {selectedTicket.desc}
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">Pasos para reproducir</h4>
                                        <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-md p-3.5 text-xs text-slate-500 dark:text-slate-400 font-medium whitespace-pre-line leading-relaxed max-h-32 overflow-y-auto">
                                            {selectedTicket.stepsToReproduce}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* entorno técnico */}
                            <div className="space-y-2">
                                <h4 className="text-[9px] font-black uppercase tracking-wider text-slate-400">Entorno técnico</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                                    <div className="bg-white dark:bg-slate-900/50 p-2.5 rounded-md border border-slate-200 dark:border-white/5 text-center">
                                        <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest leading-none mb-1">Sistema operativo</p>
                                        <p className="text-[10px] font-bold text-slate-800 dark:text-slate-200 uppercase">{selectedTicket.os || 'Desconocido'}</p>
                                    </div>
                                    <div className="bg-white dark:bg-slate-900/50 p-2.5 rounded-md border border-slate-200 dark:border-white/5 text-center">
                                        <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest leading-none mb-1">Navegador</p>
                                        <p className="text-[10px] font-bold text-slate-800 dark:text-slate-200 uppercase truncate" title={selectedTicket.browser}>{selectedTicket.browser || 'Desconocido'}</p>
                                    </div>
                                    <div className="bg-white dark:bg-slate-900/50 p-2.5 rounded-md border border-slate-200 dark:border-white/5 text-center">
                                        <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest leading-none mb-1">Módulo / pantalla</p>
                                        <p className="text-[10px] font-bold text-slate-800 dark:text-slate-200 uppercase truncate" title={selectedTicket.screen}>{selectedTicket.screen || 'No especificada'}</p>
                                    </div>
                                    <div className="bg-white dark:bg-slate-900/50 p-2.5 rounded-md border border-slate-200 dark:border-white/5 text-center">
                                        <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest leading-none mb-1">Categoría</p>
                                        <p className="text-[10px] font-bold text-slate-800 dark:text-slate-200 uppercase">{selectedTicket.category}</p>
                                    </div>
                                </div>
                                {selectedTicket.userAgent && (
                                    <div className="p-2 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-md text-[9px] font-mono text-slate-400 dark:text-slate-500 break-all select-all">
                                        UserAgent: {selectedTicket.userAgent}
                                    </div>
                                )}
                            </div>

                            {/* formulario gestión */}
                            <div className="space-y-4 border-t border-slate-100 dark:border-white/5 pt-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                                    <div className="md:col-span-1">
                                        <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-2">Estado del ticket</label>
                                        <select
                                            value={ticketStatus}
                                            onChange={(e) => setTicketStatus(e.target.value)}
                                            className="w-full px-4 py-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md text-xs font-bold outline-hidden text-slate-800 dark:text-white focus:border-emerald-500/40 transition-all"
                                        >
                                            <option value="Abierto">Abierto</option>
                                            <option value="En Proceso">En Proceso</option>
                                            <option value="Resuelto">Resuelto</option>
                                        </select>
                                    </div>
                                    {selectedTicket.repliedBy && (
                                        <div className="md:col-span-2 text-right">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Última gestión</p>
                                            <p className="text-[11px] font-bold text-emerald-600 dark:text-[#00df82] mt-1 uppercase">Por: {selectedTicket.repliedBy}</p>
                                            {selectedTicket.repliedAt && (
                                                <p className="text-[8px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                                                    {new Date(selectedTicket.repliedAt.seconds * 1000).toLocaleString('es-CL', { timeZone: 'America/Santiago' })}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-2">Respuesta oficial / solución</label>
                                    <textarea
                                        rows={4}
                                        value={adminResponse}
                                        onChange={(e) => setAdminResponse(e.target.value)}
                                        placeholder="Escribe la respuesta de soporte que se mostrará al cliente..."
                                        className="w-full px-4 py-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md text-xs font-bold outline-hidden text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-emerald-500/40 transition-all"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 dark:bg-white/5 border-t border-slate-100 dark:border-white/5">
                            <button
                                onClick={() => setModalOpen(false)}
                                disabled={saving}
                                className="px-5 py-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 text-[10px] font-black uppercase tracking-wider rounded-md transition-all disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveManagement}
                                disabled={saving || !adminResponse.trim()}
                                className="px-6 py-2.5 bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black font-black text-[10px] uppercase rounded-md tracking-wider transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-emerald-500/20 hover:brightness-110 active:scale-95"
                            >
                                {saving ? (
                                    <>
                                        <HugeiconsIcon icon={RefreshIcon} className="w-3.5 h-3.5 animate-spin" strokeWidth={2} />
                                        Guardando...
                                    </>
                                ) : (
                                    <>
                                        <HugeiconsIcon icon={Wrench01Icon} className="w-3.5 h-3.5" strokeWidth={2} />
                                        Aplicar resolución
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}