import React from 'react';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline';

export function PanelGlass({ children, className = "" }: { children: React.ReactNode, className?: string }) {
    return (
        <div className={`
            p-4 rounded-xl border transition-all duration-300
            bg-white border-slate-200 shadow-sm
            dark:bg-[#0B0F19] dark:border-white/5 dark:shadow-none
            ${className}
        `}>
            {children}
        </div>
    )
}

export function TarjetaKpi({ 
    titulo, label, 
    valor, value, 
    sub, 
    tendencia, trend, 
    icono, icon, 
    tendenciaPositiva = true, isUp = true,
    brillo = false,
    className = "",
    valueClassName = "text-xl"
}: any) {
    const displayTitulo = titulo || label;
    const displayValor = valor ?? value ?? '';
    const displayIcono = icono || icon;
    const displayTrend = tendencia || (trend?.value);
    const displayIsUp = tendenciaPositiva && (trend?.isUp !== false);

    return (
        <div className={`
            p-3.5 rounded-lg border transition-all group relative overflow-hidden
            bg-white border-slate-200 hover:border-emerald-500/50 hover:shadow-sm
            dark:bg-[#0B0F19] dark:border-white/5 dark:hover:border-emerald-500/40
            ${brillo ? 'dark:shadow-[0_0_15px_rgba(16,185,129,0.05)]' : ''}
            ${className}
        `}>
            <div className="flex justify-between items-start mb-1.5 relative z-10">
                <div className="p-1.5 rounded-md bg-slate-50 text-slate-500 group-hover:text-emerald-600 dark:bg-white/5 dark:text-slate-400 dark:group-hover:text-emerald-400 transition-colors">
                    <div className="w-4 h-4">{displayIcono}</div>
                </div>
                {displayTrend && (
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5
                        ${displayIsUp
                            ? 'text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-400/10'
                            : 'text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-400/10'}`}>
                        {displayIsUp ? <ArrowTrendingUpIcon className="w-2.5 h-2.5" /> : <ArrowTrendingDownIcon className="w-2.5 h-2.5" />}
                        {displayTrend}
                    </span>
                )}
            </div>
            <div className="relative z-10">
                <h3 className={`${valueClassName} font-black text-slate-800 dark:text-white tracking-tight leading-none`}>{displayValor}</h3>
                <p className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider mt-1 mb-0.5">{displayTitulo}</p>
                <p className="text-[9px] text-slate-500 dark:text-slate-400 font-mono leading-none opacity-80">{sub}</p>
            </div>
        </div>
    )
}

export function SystemStatusRow({ name, status, ping }: any) {
    return (
        <div className="flex items-center justify-between text-[10px] p-1.5 rounded bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
            <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${status === 'OPERATIVO' || status === 'Operativo' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></div>
                <span className="text-slate-700 dark:text-slate-300 font-bold uppercase">{name}</span>
            </div>

            <span className="font-mono text-slate-500 text-[9px]">{ping}</span>
        </div>
    )
}

export function BotonAccion({ icon, etiqueta, onClick }: any) {
    return (
        <button
            onClick={onClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[9px] font-bold uppercase tracking-wider transition-all
                       bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-emerald-600 hover:border-emerald-200
                       dark:bg-white/5 dark:border-white/10 dark:text-slate-300 dark:hover:border-emerald-500/30 dark:hover:text-emerald-400"
        >
            <div className="w-3 h-3">{icon}</div>
            {etiqueta && <span className="hidden sm:inline">{etiqueta}</span>}
        </button>
    )
}
