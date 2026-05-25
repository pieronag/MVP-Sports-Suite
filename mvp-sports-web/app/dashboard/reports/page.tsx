"use client";
import React, { useState, useEffect } from 'react';
import {
  MagnifyingGlassIcon,
  TicketIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ChatBubbleLeftRightIcon,
  CurrencyDollarIcon,
  CodeBracketIcon,
  UserCircleIcon,
  ArrowPathIcon,
  WrenchIcon
} from '@heroicons/react/24/outline';
import { collection, getDocs, query, orderBy, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useAuth } from '@/context/AuthContext';
import { auditService } from '@/services/auditService';
import { PanelGlass, TarjetaKpi, BotonAccion } from '@/components/ui/DashboardWidgets';

// Interface
interface Ticket {
  id: string;
  subject: string;
  desc: string;
  tenant: string;
  user: string; // ID del usuario que reportó
  userEmail?: string;
  userName?: string;
  category: string;
  priority: string;
  status: string;
  assignee: string;
  createdRaw: Date;
  created: string; // Formateada
  sla: number; // 0-100
  // Nuevos campos
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
  const [filter, setFilter] = useState('Abiertos');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Estados para la gestión
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [adminResponse, setAdminResponse] = useState('');
  const [ticketStatus, setTicketStatus] = useState('Abierto');
  const [saving, setSaving] = useState(false);

  // --- HELPER: TIEMPO RELATIVO ---
  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `Hace ${diffMins}m`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    return `Hace ${diffDays}d`;
  };

  // --- 1. CARGAR DATOS ---
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

  useEffect(() => {
    fetchTickets();
  }, []);

  // Abrir Modal de Gestión
  const handleOpenManageModal = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setAdminResponse(ticket.response || '');
    setTicketStatus(ticket.status || 'Abierto');
    setModalOpen(true);
  };

  // Guardar Cambios del Ticket
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

      // Registrar auditoría
      await auditService.logAuditEvent({
        action: 'REPORTE_INCIDENCIA_GESTIONADO',
        module: 'Soporte Técnico',
        details: `Ticket N° ${selectedTicket.id} gestionado por ${operatorName}. Estado: "${ticketStatus}". Respuesta: "${adminResponse.trim().slice(0, 60)}..."`,
        severity: selectedTicket.priority === 'Crítica' ? 'HIGH' : 'LOW',
        status: 'SUCCESS',
        actor: operatorName,
        role: role || 'admin',
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

  // --- 2. FILTROS ---
  const filteredTickets = tickets.filter(t => {
    // Texto
    const matchesSearch =
      t.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.tenant.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.id.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    // Categoría
    if (filter === 'Todos') return true;
    if (filter === 'Abiertos') return t.status === 'Abierto' || t.status === 'En Proceso';
    if (filter === 'Críticos') return t.priority === 'Crítica';
    if (filter === 'Resueltos') return t.status === 'Resuelto';

    return true;
  });

  // KPIs Rápidos (Sobre total cargado)
  const openCount = tickets.filter(t => t.status === 'Abierto' || t.status === 'En Proceso').length;
  const criticalCount = tickets.filter(t => t.priority === 'Crítica' && t.status !== 'Resuelto').length;

  // Helpers UI
  const getPriorityStyle = (p: string) => {
    switch (p) {
      case 'Crítica': return 'text-red-600 bg-red-50 border-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20';
      case 'Alta': return 'text-orange-600 bg-orange-50 border-orange-100 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20';
      case 'Media': return 'text-blue-600 bg-blue-50 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20';
      default: return 'text-slate-500 bg-slate-100 border-slate-200 dark:bg-white/5 dark:text-slate-400 dark:border-white/10';
    }
  };

  const getCategoryIcon = (c: string) => {
    switch (c) {
      case 'Bug': return <CodeBracketIcon className="w-4 h-4 text-red-500" />;
      case 'Billing': case 'Facturación': return <CurrencyDollarIcon className="w-4 h-4 text-emerald-500" />;
      case 'Feature': return <TicketIcon className="w-4 h-4 text-purple-500" />;
      default: return <ChatBubbleLeftRightIcon className="w-4 h-4 text-blue-500" />;
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'Abierto': return 'bg-white border-slate-300 text-slate-600 dark:bg-transparent dark:border-white/20 dark:text-slate-300';
      case 'En Proceso': return 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-500/10 dark:border-blue-500/30 dark:text-blue-400';
      case 'Resuelto': return 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-400';
      default: return '';
    }
  };

  return (
    <div className="w-full space-y-4 pb-12 font-sans transition-all duration-300 text-left">

      <div className="space-y-5">
        {/* CABECERA ADN FINANCE STYLE */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="w-6 h-[2px] bg-emerald-500 rounded-full"></span>
              <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 tracking-[0.2em] uppercase">
                Monitor de Incidencias & Feedback
              </p>
            </div>
            <h1 className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none">
              Centro de <span className="text-emerald-500 dark:text-emerald-400">Soporte Técnico</span>
            </h1>
          </div>

          <div className="flex items-center gap-2 bg-white dark:bg-white/5 p-1.5 rounded-xl border border-slate-200 dark:border-white/5 shadow-sm">
            <BotonAccion 
              icon={<ArrowPathIcon className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />} 
              onClick={fetchTickets} 
            />
          </div>
        </div>
      </div>

      {/* 2. KPI GRID - FINANCE COMPACT */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <TarjetaKpi titulo="TICKETS" valor={openCount || 0} sub="PENDIENTES" icono={<TicketIcon />} brillo />
        <TarjetaKpi titulo="ALERTA" valor={criticalCount > 0 ? "CRÍTICA" : "NORMAL"} sub="NIVEL DE RIESGO" icono={<ExclamationTriangleIcon />} />
        <TarjetaKpi titulo="RESOLUCIÓN" valor={tickets.length > 0 ? "4.2H" : "0"} sub="TIEMPO MEDIO" icono={<ClockIcon />} brillo />
        <TarjetaKpi titulo="SATISFACCIÓN" valor={tickets.length > 0 ? "98%" : "0"} sub="RETROALIMENTACIÓN" icono={<ChatBubbleLeftRightIcon />} />
      </div>

      {/* 3. BARRA DE CONTROL GLASS */}
      {/* 3. BARRA DE HERRAMIENTAS - FINANCE STYLE */}
      <PanelGlass className="flex flex-col md:flex-row gap-4 justify-between items-center py-3 px-4">
        <div className="relative w-full md:w-80">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-emerald-500" />
          <input
            type="text"
            placeholder="BUSCAR TICKET..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 dark:bg-white/5 border border-transparent focus:border-emerald-500/30 rounded-lg text-[10px] font-black uppercase outline-none text-slate-700 dark:text-white placeholder:text-slate-400 transition-all"
          />
        </div>

        <div className="flex bg-slate-50 dark:bg-white/5 p-1 rounded-xl">
          {['Abiertos', 'Críticos', 'Resueltos', 'Todos'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all ${filter === f ? "bg-white dark:bg-emerald-500 text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600 dark:hover:text-white"}`}
            >
              {f}
            </button>
          ))}
        </div>
      </PanelGlass>

      {/* 3. LISTA DE TICKETS - MODO CARDS PARA MOBILE/TABLET, TABLA PARA XL */}
      <div className="relative min-h-[400px]">
        {loading && (
          <div className="absolute inset-0 bg-white/60 dark:bg-[#0B0F19]/60 z-30 flex flex-col items-center justify-center backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-white/5">
            <ArrowPathIcon className="w-8 h-8 text-emerald-500 animate-spin mb-4" />
            <p className="text-[10px] font-black uppercase text-slate-500 animate-pulse">Sincronizando reportes...</p>
          </div>
        )}

        {filteredTickets.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-32 text-slate-400 opacity-60 border-2 border-dashed border-slate-200 dark:border-white/5 rounded-2xl bg-slate-50/50 dark:bg-white/[0.02]">
            <TicketIcon className="w-16 h-16 mx-auto mb-4 stroke-1" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em]">Sín reportes registrados</p>
          </div>
        )}

        {/* VISTA CARDS (IPAD / MOBILE) */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:hidden gap-4">
          {filteredTickets.map(t => (
            <div key={t.id} className="bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between group">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <span className="text-[9px] font-black font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-100 dark:border-emerald-500/20">#{t.id.slice(0, 8)}</span>
                  <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase border ${getStatusBadge(t.status)}`}>{t.status}</span>
                </div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase leading-tight mb-1 group-hover:text-emerald-500 transition-colors">{t.subject}</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 leading-relaxed font-medium">{t.desc}</p>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-50 dark:border-white/5 mt-auto">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserCircleIcon className="w-4 h-4 text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase">{t.tenant}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase border ${getPriorityStyle(t.priority)}`}>{t.priority}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ClockIcon className="w-4 h-4 text-slate-400" />
                    <span className="text-[10px] text-slate-400 font-bold uppercase">{t.created}</span>
                  </div>
                  {t.status !== 'Resuelto' && (
                    <button 
                      onClick={() => handleOpenManageModal(t)}
                      className="px-5 py-2 bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-900 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 shadow-xl"
                    >
                      Gestionar
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* VISTA TABLA (XL+ DESKTOP) */}
        <div className="hidden xl:block rounded-2xl border border-slate-200 dark:border-white/5 overflow-hidden bg-white dark:bg-[#0B0F19] shadow-sm relative">
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5">
            <h3 className="text-[10px] font-black text-slate-700 dark:text-white uppercase tracking-widest flex items-center gap-2">
              <TicketIcon className="w-3.5 h-3.5 text-emerald-500" />
              Monitor Global de Incidencias
            </h3>
            <span className="text-[8px] font-black text-slate-400 uppercase bg-white dark:bg-white/5 px-2 py-0.5 rounded border border-slate-200 dark:border-white/10">Priority Routing</span>
          </div>
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400 font-black uppercase text-[9px] tracking-[0.1em] border-b border-slate-100 dark:border-white/5">
              <tr>
                <th className="px-4 py-3 w-24">ID / Cat.</th>
                <th className="px-4 py-3">Asunto & Descripción</th>
                <th className="px-4 py-3">Cliente (Tenant)</th>
                <th className="px-4 py-3 text-center">Prioridad</th>
                <th className="px-4 py-3 text-center">Asignado a</th>
                <th className="px-4 py-3 w-32">SLA (Tiempo)</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs">
              {filteredTickets.length > 0 ? (
                filteredTickets.map((t) => (
                  <tr key={t.id} className="group hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">

                    {/* 1. ID & CATEGORIA */}
                    <td className="px-4 py-3 align-top">
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-300 block mb-1.5 text-[10px]">
                        #{t.id.slice(0, 6)}...
                      </span>
                      <div className="flex items-center gap-1.5 text-[9px] text-slate-500 dark:text-slate-400">
                        {getCategoryIcon(t.category)}
                        <span>{t.category}</span>
                      </div>
                    </td>

                    {/* 2. ASUNTO */}
                    <td className="px-4 py-3 align-top">
                      <p className="font-bold text-slate-800 dark:text-white text-sm mb-0.5">{t.subject}</p>
                      <p className="text-slate-500 dark:text-slate-400 line-clamp-1 text-[11px]">{t.desc}</p>
                      <p className="text-[9px] text-slate-400 mt-1 flex items-center gap-1">
                        <ClockIcon className="w-3 h-3" /> {t.created}
                      </p>
                    </td>

                    {/* 3. CLIENTE */}
                    <td className="px-4 py-3 align-top">
                      <p className="font-medium text-slate-700 dark:text-slate-300">{t.tenant}</p>
                      <p className="text-[10px] text-slate-400 truncate max-w-[120px]">ID: {t.user.slice(0, 8)}</p>
                    </td>

                    {/* 4. PRIORIDAD */}
                    <td className="px-4 py-3 align-top text-center">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${getPriorityStyle(t.priority)}`}>
                        {t.priority}
                      </span>
                    </td>

                    {/* 5. ASIGNADO */}
                    <td className="px-4 py-3 align-top text-center">
                      <div className="flex flex-col items-center gap-1">
                        <UserCircleIcon className="w-6 h-6 text-slate-300 dark:text-slate-600" />
                        <span className="text-[9px] text-slate-500 dark:text-slate-400 font-medium">
                          {t.assignee}
                        </span>
                      </div>
                    </td>

                    {/* 6. SLA (BARRA DE TIEMPO) */}
                    <td className="px-4 py-3 align-top">
                      <div className="flex justify-between text-[9px] font-bold text-slate-500 mb-1">
                        <span>Vence en:</span>
                        <span>{t.status === 'Resuelto' ? 'OK' : `${100 - t.sla}%`}</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${t.status === 'Resuelto' ? 100 : t.sla}%` }}
                          className={`h-full rounded-full ${t.status === 'Resuelto' ? 'bg-emerald-500' :
                            t.sla > 90 ? 'bg-red-500 animate-pulse' :
                              t.sla > 60 ? 'bg-amber-500' : 'bg-blue-500'
                            }`}
                        ></div>
                      </div>
                    </td>

                    {/* 7. ESTADO */}
                    <td className="px-4 py-3 align-top text-center">
                      <span className={`px-2 py-1 rounded text-[9px] font-bold uppercase border ${getStatusBadge(t.status)}`}>
                        {t.status}
                      </span>
                    </td>

                    {/* 8. ACCIONES */}
                    <td className="px-4 py-3 text-right align-top">
                      {t.status !== 'Resuelto' && (
                        <button 
                          onClick={() => handleOpenManageModal(t)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-black dark:hover:bg-emerald-400 text-[10px] font-bold uppercase transition-all shadow-sm"
                        >
                          Gestionar
                        </button>
                      )}
                    </td>

                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400 text-xs">
                    No se encontraron tickets con los filtros actuales.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE GESTIÓN */}
      {modalOpen && selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0B0F19] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 w-full max-w-2xl overflow-hidden animate-fadeIn text-left">
            
            {/* Cabecera del Modal */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400">
                  <WrenchIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase leading-none">Gestionar Ticket</h3>
                  <p className="text-[10px] font-mono text-slate-400 mt-1 uppercase font-bold tracking-widest">
                    ID: #{selectedTicket.id.toUpperCase()}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs uppercase font-black"
              >
                ✕
              </button>
            </div>

            {/* Contenido del Modal */}
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              
              {/* Información del Reportante y Recinto */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-white/[0.02] p-4 rounded-xl border border-slate-100 dark:border-white/5">
                <div className="space-y-2">
                  <h4 className="text-[9px] font-black uppercase tracking-wider text-slate-400 font-bold">Información del Cliente</h4>
                  <div className="text-[11px] space-y-1">
                    <p className="text-slate-800 dark:text-slate-200 font-bold">
                      <span className="text-slate-400 uppercase font-semibold">Usuario:</span> {selectedTicket.userName || 'No especificado'}
                    </p>
                    <p className="text-slate-800 dark:text-slate-200 font-bold">
                      <span className="text-slate-400 uppercase font-semibold">Email:</span> {selectedTicket.userEmail || 'No especificado'}
                    </p>
                    <p className="text-slate-800 dark:text-slate-200 font-bold">
                      <span className="text-slate-400 uppercase font-semibold">ID Usuario:</span> <span className="font-mono">{selectedTicket.user}</span>
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-[9px] font-black uppercase tracking-wider text-slate-400 font-bold">Recinto & SLA</h4>
                  <div className="text-[11px] space-y-1">
                    <p className="text-slate-800 dark:text-slate-200 font-bold">
                      <span className="text-slate-400 uppercase font-semibold">Complejo:</span> {selectedTicket.tenant}
                    </p>
                    <p className="text-slate-800 dark:text-slate-200 font-bold">
                      <span className="text-slate-400 uppercase font-semibold">Enviado:</span> {selectedTicket.createdRaw.toLocaleString('es-CL', { timeZone: 'America/Santiago' })}
                    </p>
                    <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                      <span className="text-slate-400 uppercase font-semibold">SLA Restante:</span> 
                      <span className={`${selectedTicket.status === 'Resuelto' ? 'text-emerald-500' : selectedTicket.sla > 90 ? 'text-red-500' : 'text-blue-500'}`}>
                        {selectedTicket.status === 'Resuelto' ? '100% (Resuelto)' : `${100 - selectedTicket.sla}%`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Asunto y Descripción de la Incidencia */}
              <div className="space-y-3">
                <div>
                  <h4 className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">Asunto</h4>
                  <p className="text-sm font-black text-slate-800 dark:text-white uppercase">
                    {selectedTicket.subject}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">Descripción del Problema</h4>
                    <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3.5 text-xs text-slate-700 dark:text-slate-300 font-medium whitespace-pre-line leading-relaxed max-h-32 overflow-y-auto">
                      {selectedTicket.desc}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">Pasos para Reproducir</h4>
                    <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3.5 text-xs text-slate-500 dark:text-slate-400 font-medium whitespace-pre-line leading-relaxed max-h-32 overflow-y-auto">
                      {selectedTicket.stepsToReproduce}
                    </div>
                  </div>
                </div>
              </div>

              {/* Detalle Técnico */}
              <div className="space-y-2">
                <h4 className="text-[9px] font-black uppercase tracking-wider text-slate-400">Detalles del Entorno Técnico</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                  <div className="bg-slate-50 dark:bg-[#0E1322] p-2.5 rounded-lg border border-slate-200 dark:border-white/5 text-center">
                    <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest leading-none mb-1">Sistema Operativo</p>
                    <p className="text-[10px] font-bold text-slate-800 dark:text-slate-200 uppercase">{selectedTicket.os || 'Desconocido'}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-[#0E1322] p-2.5 rounded-lg border border-slate-200 dark:border-white/5 text-center">
                    <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest leading-none mb-1">Navegador Web</p>
                    <p className="text-[10px] font-bold text-slate-800 dark:text-slate-200 uppercase truncate" title={selectedTicket.browser}>{selectedTicket.browser || 'Desconocido'}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-[#0E1322] p-2.5 rounded-lg border border-slate-200 dark:border-white/5 text-center">
                    <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest leading-none mb-1">Módulo / Pantalla</p>
                    <p className="text-[10px] font-bold text-slate-800 dark:text-slate-200 uppercase truncate" title={selectedTicket.screen}>{selectedTicket.screen || 'No especificada'}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-[#0E1322] p-2.5 rounded-lg border border-slate-200 dark:border-white/5 text-center">
                    <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest leading-none mb-1">Tipo de Cliente</p>
                    <p className="text-[10px] font-bold text-slate-800 dark:text-slate-200 uppercase">Web Console</p>
                  </div>
                </div>
                {selectedTicket.userAgent && (
                  <div className="p-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-[9px] font-mono text-slate-400 dark:text-slate-500 break-all select-all">
                    UserAgent: {selectedTicket.userAgent}
                  </div>
                )}
              </div>

              {/* Formulario de Gestión */}
              <div className="space-y-4 border-t border-slate-100 dark:border-white/5 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                  <div className="md:col-span-1">
                    <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-2">Estado del Ticket</label>
                    <select
                      value={ticketStatus}
                      onChange={(e) => setTicketStatus(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold outline-none text-slate-800 dark:text-white focus:border-emerald-500/50 transition-all font-bold"
                    >
                      <option value="Abierto">Abierto</option>
                      <option value="En Proceso">En Proceso</option>
                      <option value="Resuelto">Resuelto</option>
                    </select>
                  </div>

                  {selectedTicket.repliedBy && (
                    <div className="md:col-span-2 text-right">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Última Gestión</p>
                      <p className="text-[11px] font-bold text-emerald-500 mt-1 uppercase">
                        Por: {selectedTicket.repliedBy}
                      </p>
                      {selectedTicket.repliedAt && (
                        <p className="text-[8px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                          {new Date(selectedTicket.repliedAt.seconds * 1000).toLocaleString('es-CL', { timeZone: 'America/Santiago' })}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-2 font-bold">
                    Respuesta Oficial / Solución para el Usuario
                  </label>
                  <textarea
                    rows={4}
                    value={adminResponse}
                    onChange={(e) => setAdminResponse(e.target.value)}
                    placeholder="ESCRIBE LA RESPUESTA U OFICIO DE SOPORTE QUE SE MOSTRARÁ AL CLIENTE..."
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold outline-none text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-emerald-500/50 transition-all"
                    required
                  />
                </div>
              </div>

            </div>

            {/* Acciones del Modal */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 dark:bg-white/5 border-t border-slate-100 dark:border-white/5">
              <button
                onClick={() => setModalOpen(false)}
                disabled={saving}
                className="px-5 py-2.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveManagement}
                disabled={saving || !adminResponse.trim()}
                className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[10px] uppercase rounded-xl tracking-wider transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                {saving ? (
                  <>
                    <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                    Guardando Cambios...
                  </>
                ) : (
                  <>
                    <WrenchIcon className="w-3.5 h-3.5" />
                    Aplicar Resolución
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
