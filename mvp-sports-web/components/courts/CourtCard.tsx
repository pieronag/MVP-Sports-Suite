"use client";
import React from 'react';
import { 
    TrophyIcon, WrenchScrewdriverIcon, CheckCircleIcon, 
    PencilSquareIcon, TrashIcon 
} from '@heroicons/react/24/outline';

interface Court {
    id: string;
    name: string;
    sport: string;
    surface: string;
    features: string[];
    tenantId: string;
    status?: string;
}

interface CourtCardProps {
    court: Court;
    onEdit: (court: Court) => void;
    onDelete: (id: string) => void;
    onMaintenance: (court: Court) => void;
    onRestore: (id: string) => void;
}

export default function CourtCard({ 
    court, 
    onEdit, 
    onDelete, 
    onMaintenance, 
    onRestore 
}: CourtCardProps) {
    const isMaintenance = court.status === 'maintenance';

    return (
        <div className="relative group bg-white dark:bg-[#0B0F19] p-5 rounded-xl border border-slate-200 dark:border-white/5 hover:border-emerald-500 transition-all shadow-sm flex flex-col justify-between h-full">
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center border border-slate-100 dark:border-white/5 ${isMaintenance ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' : 'bg-slate-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}`}>
                            {isMaintenance ? <WrenchScrewdriverIcon className="w-5 h-5" /> : <TrophyIcon className="w-5 h-5" />}
                        </div>
                        {isMaintenance && (
                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 border-2 border-white dark:border-[#0B0F19] rounded-full"></span>
                        )}
                    </div>
                    <div>
                        <h4 className="font-bold text-sm text-slate-800 dark:text-white line-clamp-1" title={court.name}>{court.name}</h4>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wide">{court.sport}</p>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <span className="px-2 py-0.5 text-[9px] font-bold bg-slate-100 dark:bg-white/10 rounded text-slate-500 uppercase border border-slate-200 dark:border-white/5">{court.surface}</span>
                    {isMaintenance && <span className="text-[8px] font-black p-0.5 bg-amber-500 text-white rounded uppercase leading-none">Mantenimiento</span>}
                </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-4">
                {court.features.map((f, i) => (
                    <span key={i} className="px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded text-[9px] border border-emerald-100 dark:border-emerald-500/20">
                        {f}
                    </span>
                ))}
            </div>
            <div className="flex flex-col gap-2 pt-3 border-t border-slate-100 dark:border-white/5">
                <div className="flex gap-2">
                    {isMaintenance ? (
                        <button onClick={() => onRestore(court.id)} className="flex-1 py-1.5 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold uppercase transition-colors shadow-sm">
                            <CheckCircleIcon className="w-3.5 h-3.5" /> Habilitar
                        </button>
                    ) : (
                        <button onClick={() => onMaintenance(court)} className="flex-1 py-1.5 flex items-center justify-center gap-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase transition-colors">
                            <WrenchScrewdriverIcon className="w-3.5 h-3.5" /> Mantención
                        </button>
                    )}
                </div>
                <div className="flex gap-2">
                    <button onClick={() => onEdit(court)} className="flex-1 py-1.5 flex items-center justify-center gap-1.5 rounded-lg bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 text-[10px] font-bold uppercase transition-colors">
                        <PencilSquareIcon className="w-3.5 h-3.5" /> Editar
                    </button>
                    <button onClick={() => onDelete(court.id)} className="flex-1 py-1.5 flex items-center justify-center gap-1.5 rounded-lg bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 text-[10px] font-bold uppercase transition-colors">
                        <TrashIcon className="w-3.5 h-3.5" /> Eliminar
                    </button>
                </div>
            </div>
        </div>
    );
}
