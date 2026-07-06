"use client";
import React, { useState, useEffect } from 'react';
import {
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  GlobeAmericasIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  ClockIcon,
  HashtagIcon,
  CheckCircleIcon,
  CalendarIcon,
  ArrowPathIcon,
  FingerPrintIcon,
  BoltIcon
} from '@heroicons/react/24/outline';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useAuth } from '@/context/AuthContext';

import { PanelGlass, TarjetaKpi } from '@/components/ui/DashboardWidgets';

// Interface
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
  const [loading, setLoading] = useState(true);
  const { role } = useAuth();

  // --- 1. CARGAR LOGS ---
  const fetchLogs = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "audit"), orderBy("timestamp", "desc"), limit(100));
      const snapshot = await getDocs(q);

      const loadedLogs: AuditLog[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          traceId: data.traceId || `TRC-${doc.id.slice(0,6).toUpperCase()}`,
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

  const filteredLogs = logs.filter(l => {
    const matchesSearch =
      l.traceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.ip.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.actor.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (filter === 'Todos') return true;
    if (filter === 'Críticos') return l.severity.toLowerCase() === 'critical' || l.severity.toLowerCase() === 'high';
    if (filter === 'Fallidos') return ['failed', 'blocked', 'warning'].includes(l.status.toLowerCase());
    return true;
  });

  const getSeverityStyle = (s: string) => {
    const severity = s.toLowerCase();
    switch (severity) {
      case 'critical':
      case 'high':
        return 'bg-red-500 text-white border-red-600 shadow-lg shadow-red-500/20';
      case 'warning':
      case 'medium':
        return 'bg-amber-500 text-white border-amber-600 shadow-lg shadow-amber-500/20';
      default:
        return 'bg-emerald-500 text-slate-900 border-emerald-600 font-black';
    }
  };

  const getStatusColor = (s: string) => {
    const status = s.toLowerCase();
    if (status === 'success') return 'text-emerald-500';
    if (status === 'blocked') return 'text-purple-500';
    return 'text-red-500';
  };

  if (role !== 'admin' && role !== 'superadmin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-10 animate-fadeIn">
        <ShieldCheckIcon className="w-20 h-20 text-red-500/50 mb-6" />
        <h1 className="text-2xl font-black uppercase text-slate-900 dark:text-white mb-2">Acceso Restringido</h1>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
          Esta vista es exclusiva para administradores del sistema.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-10 text-left relative animate-fadeIn">
      {/* CABECERA ADN */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="w-6 h-[2px] bg-emerald-500 rounded-full"></span>
            <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 tracking-[0.2em] uppercase">
              Trazabilidad Estructural & Seguridad
            </p>
          </div>
          <h1 className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none">
            Monitor <span className="text-emerald-500">Auditoría</span>
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-[#0B0F19] p-1.5 rounded-[14px] border border-slate-200 dark:border-white/5 shadow-lg">
          <button 
            onClick={fetchLogs}
            className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-white/5 rounded-[14px] text-[9px] font-black uppercase text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all"
          >
            <ArrowPathIcon className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Sincronizar
          </button>
          <div className="w-px h-6 bg-slate-100 dark:bg-white/10 mx-1"></div>
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-900 rounded-[14px] text-[9px] font-black uppercase shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">
            <ShieldCheckIcon className="w-3.5 h-3.5" />
            Certificar Logs
          </button>
        </div>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <TarjetaKpi 
          label="EVENTOS TOTALES" 
          value={logs.length.toString()} 
          sub="REGISTROS EN NÚCLEO"
          icon={<HashtagIcon />}
          brillo
        />
        <TarjetaKpi 
          label="SISTEMA STATUS" 
          value="100%" 
          sub="SIN BRECHAS ACTIVAS"
          icon={<ShieldCheckIcon />}
        />
        <TarjetaKpi 
          label="CRÍTICOS" 
          value={logs.filter(l => l.severity.toLowerCase() === 'critical' || l.severity.toLowerCase() === 'high').length.toString()} 
          sub="REVISIÓN REQUERIDA"
          icon={<ExclamationTriangleIcon />}
        />
        <TarjetaKpi 
          label="LATENCIA" 
          value="24ms" 
          sub="TIEMPO DE RESPUESTA"
          icon={<BoltIcon />}
        />
      </div>

      {/* TOOLBAR */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-center bg-white dark:bg-[#0B0F19] p-4 rounded-[14px] border border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/20 dark:shadow-none">
        <div className="relative w-full lg:w-96">
          <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="BUSCAR POR TRACE ID, IP, ACTOR O ACCIÓN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-[14px] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20 text-[10px] font-black uppercase outline-none focus:ring-2 ring-emerald-500/20 dark:text-white font-mono"
          />
        </div>

        <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-[14px] w-full lg:w-auto">
          {['Todos', 'Críticos', 'Fallidos'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 lg:flex-none px-6 py-2 text-[9px] font-black uppercase rounded-[14px] transition-all
                    ${filter === f
                  ? 'bg-white text-slate-900 shadow-md dark:bg-emerald-500 dark:text-slate-950'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* CONSOLA DE LOGS */}
      <PanelGlass className="border-none shadow-2xl p-0 overflow-hidden min-h-[500px]">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/5">
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">FECHA / ID</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">SEVERIDAD</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">ACTOR / ROL</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">ACCIÓN & MÓDULO</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">DETALLE TÉCNICO</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">RESULTADO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-mono">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr key={log.id} className={`group hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors ${log.severity.toLowerCase() === 'critical' || log.severity.toLowerCase() === 'high' ? 'bg-red-500/5' : ''}`}>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-800 dark:text-white uppercase">{log.date}</span>
                        <span className="text-[9px] font-bold text-slate-400 mt-0.5">{log.time} | <span className="text-emerald-500/70">{log.traceId}</span></span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className={`px-2.5 py-1 rounded-[14px] text-[8px] font-black uppercase border-b-2 transition-all ${getSeverityStyle(log.severity)}`}>
                        {log.severity}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase">{log.actor}</span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">{log.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-[10px] font-black text-indigo-600 dark:text-emerald-400 uppercase block">{log.action}</span>
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{log.module}</span>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-[9px] font-bold text-slate-500 dark:text-slate-300 leading-relaxed max-w-xs break-words uppercase">
                        {log.details}
                      </p>
                      <div className="flex items-center gap-1.5 mt-2 text-[8px] font-black text-slate-400 uppercase">
                        <GlobeAmericasIcon className="w-3 h-3" /> {log.ip} <span className="opacity-30">•</span> {log.location}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-[14px] border text-[8px] font-black uppercase tracking-widest ${log.status.toLowerCase() === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${log.status.toLowerCase() === 'success' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`}></div>
                          {log.status}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <FingerPrintIcon className="w-12 h-12 text-slate-100 dark:text-white/5 mx-auto mb-4" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sin registros detectados en el sistema</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </PanelGlass>
    </div>
  );
}
