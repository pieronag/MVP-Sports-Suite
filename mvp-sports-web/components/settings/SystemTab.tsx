"use client";
// Pestaña Núcleo: conteos de la plataforma, modo mantenimiento y últimos eventos de auditoría
import { HugeiconsIcon } from "@hugeicons/react";
import { ServerIcon, UserGroupIcon, Database01Icon, MoneyBag01Icon, Alert02Icon, Shield01Icon } from "@hugeicons/core-free-icons";
import { HeaderSeccion, panelCls } from "./ui";

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface SystemStats { tenants: number; users: number; bookings: number; invoices: number; reports: number }

const SEVERITY: Record<string, { label: string; cls: string }> = {
    CRITICAL: { label: 'Crítica', cls: 'bg-red-500/15 text-red-600 border-red-500/30 dark:text-red-400' },
    HIGH: { label: 'Alta', cls: 'bg-red-500/15 text-red-600 border-red-500/30 dark:text-red-400' },
    MEDIUM: { label: 'Media', cls: 'bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400' },
    LOW: { label: 'Baja', cls: 'bg-slate-500/15 text-slate-600 border-slate-500/30 dark:text-slate-400' },
};

export default function SystemTab({ stats, maintenance, maintenanceBusy, onToggleMaintenance, audit }: {
    stats: SystemStats;
    maintenance: boolean;
    maintenanceBusy: boolean;
    onToggleMaintenance: () => void;
    audit: any[];
}) {
    const kpis = [
        { label: 'Recintos', value: stats.tenants, icon: ServerIcon },
        { label: 'Usuarios', value: stats.users, icon: UserGroupIcon },
        { label: 'Reservas', value: stats.bookings, icon: Database01Icon },
        { label: 'Facturas', value: stats.invoices, icon: MoneyBag01Icon },
        { label: 'Reportes', value: stats.reports, icon: Alert02Icon },
    ];
    return (
        <div className="space-y-8 animate-fadeIn">
            <HeaderSeccion titulo="Estado del sistema" desc="Métricas en tiempo real del núcleo y mantenimiento de la plataforma." />

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 [&>*:last-child:nth-child(odd)]:col-span-2 sm:[&>*:last-child:nth-child(odd)]:col-span-1">
                {kpis.map(s => (
                    <div key={s.label} className="rounded-md bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 p-5">
                        <div className="text-emerald-600 dark:text-[#00df82] mb-3"><HugeiconsIcon icon={s.icon} className="w-5 h-5" strokeWidth={1.6} /></div>
                        <p className="text-2xl font-black text-slate-900 dark:text-white font-mono leading-none tabular-nums">{s.value}</p>
                        <p className="text-[11px] md:text-[8px] font-black text-slate-400 uppercase tracking-wider mt-2">{s.label}</p>
                    </div>
                ))}
            </div>

            <div className="rounded-md bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className={`w-11 h-11 rounded-md flex items-center justify-center shrink-0 ${maintenance ? 'bg-amber-500/15 text-amber-500' : 'bg-emerald-500/15 text-emerald-600 dark:text-[#00df82]'}`}>
                        <HugeiconsIcon icon={Shield01Icon} className="w-6 h-6" strokeWidth={1.6} />
                    </div>
                    <div>
                        <p className="text-[11px] font-black uppercase text-slate-900 dark:text-white tracking-wider font-heading">Modo mantenimiento</p>
                        <p className="text-[11px] md:text-[8px] font-bold text-slate-400 uppercase mt-1">
                            {maintenance ? 'Activo: la plataforma está en mantenimiento.' : 'Inactivo: acceso normal para todos los usuarios.'}
                        </p>
                    </div>
                </div>
                <button
                    onClick={onToggleMaintenance}
                    disabled={maintenanceBusy}
                    className={`px-6 py-3 rounded-md text-xs md:text-[10px] font-black uppercase shadow-lg active:scale-95 transition-all disabled:opacity-50 ${maintenance ? 'bg-slate-900 dark:bg-white/10 text-white hover:bg-slate-800' : 'bg-amber-500 text-white hover:bg-amber-600'}`}
                >
                    {maintenance ? 'Finalizar mantenimiento' : 'Iniciar mantenimiento'}
                </button>
            </div>

            <div className={`${panelCls} space-y-4`}>
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-md bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500"><HugeiconsIcon icon={Database01Icon} className="w-5 h-5" strokeWidth={1.6} /></div>
                        <h4 className="text-[11px] font-black uppercase text-slate-900 dark:text-white tracking-widest leading-none font-heading">Auditoría reciente</h4>
                    </div>
                    <span className="text-[11px] md:text-[8px] font-black text-slate-400 uppercase">Últimos {audit.length} eventos</span>
                </div>
                <div className="space-y-2.5">
                    {audit.length > 0 ? audit.map((log) => {
                        const sev = SEVERITY[(log.severity || 'LOW').toUpperCase()] || SEVERITY.LOW;
                        const at = log.timestamp?.seconds ? new Date(log.timestamp.seconds * 1000) : null;
                        const time = log.timeStr || (at ? at.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '');
                        const date = log.dateStr || (at ? at.toLocaleDateString('es-CL') : '');
                        return (
                            <div key={log.id} className="flex items-center justify-between gap-4 p-4 rounded-md bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10">
                                <div className="flex items-center gap-3 min-w-0">
                                    <span className={`px-2 py-0.5 rounded-md text-[11px] md:text-[8px] font-black uppercase border shrink-0 ${sev.cls}`}>{sev.label}</span>
                                    <div className="min-w-0">
                                        <p className="text-xs md:text-[10px] font-black text-slate-900 dark:text-white uppercase truncate">{log.action || 'EVENTO'}</p>
                                        <p className="text-[11px] md:text-[8px] font-bold text-slate-400 uppercase truncate">{log.module} · {log.actor || 'Sistema'}</p>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-[11px] md:text-[9px] font-black text-slate-500 dark:text-slate-300 font-mono">{time}</p>
                                    <p className="text-[11px] md:text-[8px] font-bold text-slate-400 uppercase">{date}</p>
                                </div>
                            </div>
                        );
                    }) : (
                        <div className="py-10 text-center">
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Sin eventos de auditoría</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
