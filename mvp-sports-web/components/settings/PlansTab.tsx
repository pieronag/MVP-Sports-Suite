"use client";
// Pestaña Comercial: planes SaaS (precio, comisión, peso de prioridad y beneficios)
import { HugeiconsIcon } from "@hugeicons/react";
import { RefreshIcon, Add01Icon, ServerIcon, BoltIcon, Delete02Icon, InformationCircleIcon } from "@hugeicons/core-free-icons";
import { HeaderSeccion, Toggle, benefitCatalog, formatCLP, type Plan } from "./ui";

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function PlansTab({ plans, planCounts, busy, onSync, onAdd, onRemove, onUpdate, onToggleFeature }: {
    plans: Plan[];
    planCounts: Record<string, number>;
    busy: boolean;
    onSync: () => void;
    onAdd: () => void;
    onRemove: (idx: number) => void;
    onUpdate: (idx: number, key: string, val: any) => void;
    onToggleFeature: (idx: number, key: string, val: boolean) => void;
}) {
    return (
        <div className="space-y-8 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <HeaderSeccion titulo="Modelos de monetización" desc="Gestión de planes SaaS, precios y comisiones transaccionales." />
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button onClick={onSync} disabled={busy} title="Actualiza el peso de prioridad y beneficios de todos los recintos según su plan" className="flex items-center gap-2 px-4 py-2.5 rounded-md bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 text-xs md:text-[10px] font-black uppercase tracking-wider hover:border-emerald-400 dark:hover:border-[#00df82]/40 hover:text-emerald-600 dark:hover:text-[#00df82] transition-all disabled:opacity-40">
                        <HugeiconsIcon icon={RefreshIcon} className={`w-4 h-4 ${busy ? 'animate-spin' : ''}`} strokeWidth={2} />
                        Sincronizar prioridad
                    </button>
                    <button onClick={onAdd} className="flex items-center gap-2 px-4 py-2.5 rounded-md bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black text-xs md:text-[10px] font-black uppercase tracking-wider shadow-lg shadow-emerald-500/25 hover:brightness-110 active:scale-95 transition-all shrink-0">
                        <HugeiconsIcon icon={Add01Icon} className="w-4 h-4" strokeWidth={2} />
                        Añadir plan
                    </button>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {plans.map((p, idx) => {
                    const used = planCounts[p.id || p.name] || 0;
                    return (
                        <div key={p.id} data-plan={p.id} className="rounded-md bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 p-6 transition-all relative overflow-hidden">
                            <div className="flex justify-between items-start gap-3 mb-6">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="w-3 h-[2px] bg-emerald-500 rounded-md"></span>
                                        <p className="text-[11px] md:text-[8px] font-black text-emerald-600 dark:text-[#00df82] uppercase tracking-[0.2em]">Suscripción</p>
                                    </div>
                                    <input aria-label="Nombre del plan" value={p.name} maxLength={40} onChange={e => onUpdate(idx, 'name', e.target.value)}
                                        className="w-full bg-transparent text-lg font-black uppercase text-slate-900 dark:text-white leading-none font-heading outline-hidden border-b border-transparent focus:border-emerald-500/40" />
                                    <span className={`inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-md text-[11px] md:text-[8px] font-black uppercase ${used > 0 ? 'bg-emerald-500/15 text-emerald-600 dark:text-[#00df82]' : 'bg-slate-100 dark:bg-white/5 text-slate-400'}`}>
                                        <HugeiconsIcon icon={ServerIcon} className="w-3 h-3" strokeWidth={2} />
                                        {used} recinto(s)
                                    </span>
                                </div>
                                <div className="flex flex-col items-end gap-1 shrink-0">
                                    <div className="flex items-center gap-1 bg-slate-50 dark:bg-white/5 px-3 py-1.5 rounded-md border border-slate-200 dark:border-white/10">
                                        <span className="text-xs md:text-[10px] font-black text-emerald-600 dark:text-[#00df82]">$</span>
                                        <input
                                            type="number" min={0} aria-label="Precio mensual"
                                            value={p.price}
                                            onChange={e => onUpdate(idx, 'price', Math.max(0, parseInt(e.target.value) || 0))}
                                            className="w-16 bg-transparent text-sm font-black outline-hidden text-slate-900 dark:text-white text-right font-mono"
                                        />
                                    </div>
                                    <p className="text-[11px] md:text-[7px] font-black text-slate-400 uppercase mt-0.5">
                                        {formatCLP(Number(p.price || 0))} <span className="opacity-70">· Neto {formatCLP(Math.round(Number(p.price || 0) / 1.19))}</span>
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-6">
                                <div className="p-3.5 bg-slate-50 dark:bg-white/5 rounded-md border border-slate-200 dark:border-white/10">
                                    <p className="text-[11px] md:text-[7px] font-black text-slate-400 uppercase mb-1.5 tracking-widest leading-none">Comisión %</p>
                                    <div className="flex items-center gap-1">
                                        <span className="text-emerald-600 dark:text-[#00df82] font-black text-xs md:text-[10px]">%</span>
                                        <input type="number" step="0.1" min={0} max={100} aria-label="Comisión" value={p.commission} onChange={e => onUpdate(idx, 'commission', Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))} className="w-full bg-transparent text-xs font-black outline-hidden text-slate-900 dark:text-white font-mono" />
                                    </div>
                                </div>
                                <div className="p-3.5 bg-slate-50 dark:bg-white/5 rounded-md border border-slate-200 dark:border-white/10">
                                    <p className="text-[11px] md:text-[7px] font-black text-slate-400 uppercase mb-1.5 tracking-widest leading-none">Peso prioridad</p>
                                    <div className="flex items-center gap-1">
                                        <HugeiconsIcon icon={BoltIcon} className="w-3 h-3 text-indigo-500" strokeWidth={1.8} />
                                        <input type="number" min={0} aria-label="Peso de prioridad" value={p.priorityScore} onChange={e => onUpdate(idx, 'priorityScore', Math.max(0, parseInt(e.target.value) || 0))} className="w-full bg-transparent text-xs font-black outline-hidden text-slate-900 dark:text-white font-mono" />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3.5 pt-6 border-t border-slate-100 dark:border-white/5">
                                <p className="text-[11px] md:text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] mb-3 pl-1">Beneficios del plan</p>
                                {benefitCatalog.map(b => {
                                    const on = !!p.features?.[b.key];
                                    return (
                                        <div key={b.key} className="flex items-center justify-between gap-3">
                                            <div className={`flex items-center gap-3 transition-all ${on ? 'text-slate-900 dark:text-white' : 'text-slate-300 dark:text-white/20'}`}>
                                                <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${on ? 'bg-emerald-500/10 text-emerald-600 dark:text-[#00df82]' : 'bg-slate-100 dark:bg-white/5'}`}>
                                                    <HugeiconsIcon icon={b.icon} className="w-4 h-4" strokeWidth={1.8} />
                                                </div>
                                                <span className="text-[11px] md:text-[9px] font-black uppercase tracking-tight">{b.label}</span>
                                            </div>
                                            <Toggle on={on} label={`${b.label} en ${p.name}`} onChange={() => onToggleFeature(idx, b.key, !on)} />
                                        </div>
                                    );
                                })}
                            </div>

                            <button onClick={() => onRemove(idx)} className="mt-5 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] md:text-[8px] font-black uppercase text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all">
                                <HugeiconsIcon icon={Delete02Icon} className="w-3.5 h-3.5" strokeWidth={2} />
                                Eliminar plan
                            </button>
                        </div>
                    );
                })}
            </div>
            <p className="flex items-center gap-2 text-[11px] md:text-[8px] font-bold text-slate-400 uppercase leading-relaxed">
                <HugeiconsIcon icon={InformationCircleIcon} className="w-3.5 h-3.5 shrink-0" strokeWidth={1.8} />
                El «peso de prioridad» ordena los recintos en el directorio del jugador: los planes con «Prioridad en búsquedas» aparecen primero y, dentro de estos, se ordenan por este valor (mayor = primero).
            </p>
        </div>
    );
}
