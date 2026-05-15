"use client";
import React from 'react';
import { 
    WrenchScrewdriverIcon, ArrowPathIcon, ExclamationTriangleIcon 
} from '@heroicons/react/24/outline';

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-[#0B0F19] rounded-xl shadow-2xl border border-slate-200 dark:border-white/10 w-full max-w-md p-6 animate-fadeIn">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-amber-100 dark:bg-amber-500/20 rounded-lg text-amber-600"><WrenchScrewdriverIcon className="w-5 h-5" /></div>
                    <div>
                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase leading-none">Mantenimiento Cancha</h3>
                        <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-widest">{court.name}</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
                        <button 
                            onClick={() => onFormChange('type', 'hours')} 
                            className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${form.type === 'hours' ? 'bg-white dark:bg-slate-800 shadow text-slate-900 dark:text-white' : 'text-slate-400'}`}
                        >
                            Por Horas
                        </button>
                        <button 
                            onClick={() => onFormChange('type', 'days')} 
                            className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${form.type === 'days' ? 'bg-white dark:bg-slate-800 shadow text-slate-900 dark:text-white' : 'text-slate-400'}`}
                        >
                            Por Días
                        </button>
                    </div>

                    {form.type === 'hours' ? (
                        <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Fecha</label>
                                <input 
                                    type="date" 
                                    value={form.date} 
                                    onChange={e => onFormChange('date', e.target.value)} 
                                    className="w-full mt-1 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-2 text-xs" 
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Inicio</label>
                                <input 
                                    type="time" 
                                    value={form.startTime} 
                                    onChange={e => onFormChange('startTime', e.target.value)} 
                                    className="w-full mt-1 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-2 text-xs" 
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Fin</label>
                                <input 
                                    type="time" 
                                    value={form.endTime} 
                                    onChange={e => onFormChange('endTime', e.target.value)} 
                                    className="w-full mt-1 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-2 text-xs" 
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Desde</label>
                                <input 
                                    type="date" 
                                    value={form.date} 
                                    onChange={e => onFormChange('date', e.target.value)} 
                                    className="w-full mt-1 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-2 text-xs" 
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Hasta</label>
                                <input 
                                    type="date" 
                                    value={form.endDate} 
                                    onChange={e => onFormChange('endDate', e.target.value)} 
                                    className="w-full mt-1 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-2 text-xs" 
                                />
                            </div>
                        </div>
                    )}

                    <button 
                        onClick={onCheckConflicts} 
                        className="w-full py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-[10px] font-black uppercase rounded-lg transition-all flex items-center justify-center gap-2 border border-slate-200 dark:border-white/10"
                    >
                        <ArrowPathIcon className="w-3.5 h-3.5" /> Verificar Conflictos
                    </button>

                    {conflicts.length > 0 && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-lg">
                            <p className="text-[9px] font-black text-red-600 dark:text-red-400 uppercase flex items-center gap-1 mb-1">
                                <ExclamationTriangleIcon className="w-3 h-3" /> {conflicts.length} Reservas Afectadas
                            </p>
                            <div className="max-h-24 overflow-y-auto custom-scrollbar space-y-1">
                                {conflicts.map(c => (
                                    <p key={c.id} className="text-[8px] text-slate-500 dark:text-slate-400 font-mono">
                                        {c.displayTime || '??:??'} - {c.clientName}
                                    </p>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button onClick={onClose} className="flex-1 py-2.5 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase rounded-lg">Cancelar</button>
                        <button onClick={onConfirm} className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black uppercase rounded-lg shadow-lg shadow-amber-500/20">Confirmar</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
