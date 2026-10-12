"use client";
import React from 'react';
import { HugeiconsIcon } from "@hugeicons/react";
import {
    Wrench01Icon,
    Cancel01Icon,
    RefreshIcon,
    Calendar03Icon,
    Alert02Icon,
    CheckmarkCircle02Icon,
} from '@hugeicons/core-free-icons';

interface MaintenanceModalProps {
    isOpen: boolean;
    court: any;
    form: any;
    conflicts: any[];
    onClose: () => void;
    onFormChange: (field: string, value: any) => void;
    onCheckConflicts: () => void;
    onConfirm: () => void;
}

const inputCls = "w-full mt-1.5 px-3 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md text-[11px] font-black text-slate-900 dark:text-white outline-hidden focus:border-amber-500 focus:ring-1 ring-amber-500 transition-all";
const labelCls = "block text-xs md:text-[10px] font-black uppercase tracking-widest text-slate-400";

export default function MaintenanceModal({
    isOpen,
    court,
    form,
    conflicts,
    onClose,
    onFormChange,
    onCheckConflicts,
    onConfirm
}: MaintenanceModalProps) {
    if (!isOpen || !court) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs" onClick={onClose}>
            <div className="bg-white dark:bg-[#0B0F19] rounded-md shadow-2xl border border-slate-200 dark:border-white/10 w-full max-w-md max-h-[90vh] overflow-y-auto custom-scrollbar animate-fadeIn" onClick={e => e.stopPropagation()}>
                {/* HEADER */}
                <div className="flex items-center justify-between gap-3 px-6 pt-6 pb-5 border-b border-slate-100 dark:border-white/5">
                    <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
                            <HugeiconsIcon icon={Wrench01Icon} className="w-5 h-5" strokeWidth={1.8} />
                        </div>
                        <div>
                            <p className="text-[11px] md:text-[9px] font-black uppercase tracking-[0.2em] text-amber-500 mb-0.5">Pausa programada</p>
                            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none font-heading">{court.name}</h3>
                        </div>
                    </div>
                    <button aria-label="Cerrar" onClick={onClose} className="p-2 bg-slate-100 dark:bg-white/5 rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all shrink-0">
                        <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" strokeWidth={2} />
                    </button>
                </div>

                {/* BODY */}
                <div className="p-6 space-y-5">
                    <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-md border border-slate-200 dark:border-white/10">
                        <button
                            onClick={() => onFormChange('type', 'hours')}
                            className={`flex-1 py-2.5 text-xs md:text-[10px] font-black uppercase rounded-md transition-all ${form.type === 'hours' ? 'bg-white dark:bg-slate-800 shadow-sm text-slate-900 dark:text-white' : 'text-slate-400'}`}
                        >
                            Por Horas
                        </button>
                        <button
                            onClick={() => onFormChange('type', 'days')}
                            className={`flex-1 py-2.5 text-xs md:text-[10px] font-black uppercase rounded-md transition-all ${form.type === 'days' ? 'bg-white dark:bg-slate-800 shadow-sm text-slate-900 dark:text-white' : 'text-slate-400'}`}
                        >
                            Por Días
                        </button>
                    </div>

                    {form.type === 'hours' ? (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className={labelCls}>Fecha</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 dark:text-white/20 pointer-events-none"><HugeiconsIcon icon={Calendar03Icon} className="w-4 h-4" strokeWidth={1.8} /></span>
                                    <input
                                        type="date"
                                        value={form.date}
                                        onChange={e => onFormChange('date', e.target.value)}
                                        className={`${inputCls} pl-9`}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className={labelCls}>Inicio</label>
                                <input
                                    type="time"
                                    value={form.startTime}
                                    onChange={e => onFormChange('startTime', e.target.value)}
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label className={labelCls}>Fin</label>
                                <input
                                    type="time"
                                    value={form.endTime}
                                    onChange={e => onFormChange('endTime', e.target.value)}
                                    className={inputCls}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelCls}>Desde</label>
                                <input
                                    type="date"
                                    value={form.date}
                                    onChange={e => onFormChange('date', e.target.value)}
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label className={labelCls}>Hasta</label>
                                <input
                                    type="date"
                                    value={form.endDate}
                                    onChange={e => onFormChange('endDate', e.target.value)}
                                    className={inputCls}
                                />
                            </div>
                        </div>
                    )}

                    <button
                        onClick={onCheckConflicts}
                        className="w-full py-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-xs md:text-[10px] font-black uppercase tracking-widest rounded-md transition-all flex items-center justify-center gap-2 border border-slate-200 dark:border-white/10"
                    >
                        <HugeiconsIcon icon={RefreshIcon} className="w-3.5 h-3.5" strokeWidth={2} /> Verificar Conflictos
                    </button>

                    {conflicts.length > 0 && (
                        <div className="p-3.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-md">
                            <p className="text-[11px] md:text-[9px] font-black text-red-600 dark:text-red-400 uppercase flex items-center gap-1.5 mb-2">
                                <HugeiconsIcon icon={Alert02Icon} className="w-3.5 h-3.5" strokeWidth={2} /> {conflicts.length} {conflicts.length === 1 ? "reserva pagada afectada" : "reservas pagadas afectadas"}
                            </p>
                            <div className="max-h-28 overflow-y-auto custom-scrollbar space-y-1.5">
                                {conflicts.map(c => (
                                    <div key={c.id} className="flex items-center justify-between px-2.5 py-1.5 bg-white/60 dark:bg-black/20 rounded-md border border-red-100 dark:border-red-500/10">
                                        <p className="text-[11px] md:text-[9px] text-slate-600 dark:text-slate-300 font-mono font-black">{String(c.clientName || 'Cliente').toUpperCase()}</p>
                                        <p className="text-[11px] md:text-[9px] text-red-500 font-mono font-black">{c.displayTime || c.startTime || '—'}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {conflicts.length === 0 && (
                        <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/15 rounded-md text-[11px] md:text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-[#00df82]">
                            <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-3.5 h-3.5" strokeWidth={2} /> Sin reservas en el periodo
                        </div>
                    )}
                </div>

                {/* FOOTER */}
                <div className="px-6 pb-6 pt-1 flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 text-xs md:text-[10px] font-black uppercase tracking-widest rounded-md hover:bg-slate-200 dark:hover:bg-white/10 transition-all">
                        Cancelar
                    </button>
                    <button onClick={onConfirm} className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white text-xs md:text-[10px] font-black uppercase tracking-widest rounded-md shadow-xl shadow-amber-500/25 transition-all flex items-center justify-center gap-2">
                        <HugeiconsIcon icon={Wrench01Icon} className="w-4 h-4" strokeWidth={2} /> Confirmar
                    </button>
                </div>
            </div>
        </div>
    );
}