"use client";
import React from 'react';
import { 
    ClockIcon, ServerIcon, ExclamationTriangleIcon 
} from '@heroicons/react/24/outline';
import { PanelGlass, SystemStatusRow } from '@/components/ui/DashboardWidgets';

interface Activity {
    id: string;
    tipo: 'exito' | 'error';
    msj: string;
    tiempo: string;
}

interface RecentActivitySidebarProps {
    activities: Activity[];
}

export default function RecentActivitySidebar({ activities }: RecentActivitySidebarProps) {
    return (
        <div className="lg:col-span-4 space-y-4">
            {/* SALUD SISTEMA */}
            <PanelGlass>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[10px] font-bold text-slate-700 dark:text-white uppercase flex items-center gap-1.5">
                        <ServerIcon className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                        INFRAESTRUCTURA
                    </h3>

                    <span className="text-[8px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 rounded font-bold">
                        99.9% EN LÍNEA
                    </span>
                </div>
                <div className="space-y-2">
                    <SystemStatusRow name="BASE DE DATOS" status="OPERATIVO" ping="12MS" />
                    <SystemStatusRow name="API GATEWAY" status="OPERATIVO" ping="24MS" />
                    <SystemStatusRow name="ALMACENAMIENTO" status="OPERATIVO" ping="45MS" />
                </div>

            </PanelGlass>

            {/* ALERTAS */}
            <PanelGlass className="border-amber-200 bg-amber-50/50 dark:border-amber-500/20 dark:bg-amber-900/10">
                <div className="flex items-center gap-1.5 mb-2 text-amber-600 dark:text-amber-400">
                    <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                    <h3 className="text-[10px] font-bold uppercase">Estado</h3>
                </div>
                <p className="text-[10px] text-amber-700 dark:text-amber-200 font-medium leading-relaxed uppercase font-bold">
                    EL SISTEMA ESTÁ FUNCIONANDO CORRECTAMENTE. NO SE REPORTAN INCIDENTES CRÍTICOS EN LAS ÚLTIMAS 24 HORAS.
                </p>

            </PanelGlass>

            {/* ACTIVIDAD RECIENTE */}
            <PanelGlass className="flex-1 min-h-[250px]">
                <h3 className="text-[10px] font-bold text-slate-700 dark:text-white uppercase mb-3 flex items-center gap-1.5">
                    <ClockIcon className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                    ACTIVIDAD RECIENTE
                </h3>

                <div className="space-y-4 relative pl-1.5">
                    <div className="absolute left-[5px] top-1.5 bottom-1.5 w-[1px] bg-slate-200 dark:bg-slate-700"></div>

                    {activities.length > 0 ? activities.map((evt) => (
                        <div key={evt.id} className="relative pl-5">
                            <div className={`absolute left-0 top-1 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-[#0B0F19] shadow-sm z-10
                                ${evt.tipo === 'exito' ? 'bg-emerald-500' : 'bg-red-500'}`}>
                            </div>
                            <p className="text-[10px] font-medium text-slate-700 dark:text-slate-200 leading-tight">
                                {evt.msj}
                            </p>
                            <p className="text-[9px] text-slate-400 font-mono mt-0.5">{evt.tiempo}</p>
                        </div>
                    )) : (
                        <p className="text-[10px] text-slate-400 pl-5 uppercase font-bold">CARGANDO ACTIVIDAD...</p>
                    )}

                </div>
            </PanelGlass>
        </div>
    );
}
