import React from 'react';
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDownRight01Icon, ArrowUpRight01Icon } from "@hugeicons/core-free-icons";

// Adaptadores: conservan los nombres del JSX sobre Hugeicons
const ArrowTrendingUpIcon = ({ className }: { className?: string }) => <HugeiconsIcon icon={ArrowUpRight01Icon} className={className} strokeWidth={1.6} />;
const ArrowTrendingDownIcon = ({ className }: { className?: string }) => <HugeiconsIcon icon={ArrowDownRight01Icon} className={className} strokeWidth={1.6} />;

interface TarjetaKpiProps {
    titulo?: string;
    label?: string;
    valor?: string | number;
    value?: string | number;
    sub?: string;
    tendencia?: string;
    trend?: { value: string; isUp?: boolean };
    icono?: React.ReactNode;
    icon?: React.ReactNode;
    tendenciaPositiva?: boolean;
    isUp?: boolean;
    brillo?: boolean;
    className?: string;
    valueClassName?: string;
}

export function PanelGlass({ children, className = "", id }: { children: React.ReactNode, className?: string, id?: string }) {
    return (
        <div id={id} className={`
            rounded-md border transition-all duration-300
            bg-white border-slate-200 shadow-xs shadow-slate-200/50
            dark:bg-slate-900/50 dark:border-white/5 dark:shadow-none
            ${className}
        `}>
            {children}
        </div>
    )
}

export function SectionCard({
    title,
    subtitle,
    icon,
    action,
    children,
    className = "",
    bodyClassName = "p-5",
}: {
    title: string;
    subtitle?: string;
    icon?: React.ReactNode;
    action?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
    bodyClassName?: string;
}) {
    return (
        <div className={`rounded-md border bg-white border-slate-200 shadow-xs shadow-slate-200/50 dark:bg-slate-900/50 dark:border-white/5 dark:shadow-none flex flex-col ${className}`}>
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 dark:border-white/5 shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                    {icon && (
                        <span className="text-emerald-600 dark:text-[#00df82] shrink-0 [&>svg]:w-5 [&>svg]:h-5">
                            {icon}
                        </span>
                    )}
                    <div className="min-w-0">
                        <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-900 dark:text-white truncate font-heading">
                            {title}
                        </h3>
                        {subtitle && (
                            <p className="text-[10px] font-medium text-slate-400 truncate">{subtitle}</p>
                        )}
                    </div>
                </div>
                {action}
            </div>
            <div className={`flex-1 min-h-0 ${bodyClassName}`}>{children}</div>
        </div>
    );
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
    valueClassName = "text-2xl"
}: TarjetaKpiProps) {
    const displayTitulo = titulo || label;
    const displayValor = valor ?? value ?? '';
    const displayIcono = icono || icon;
    const displayTrend = tendencia || (trend?.value);
    const displayIsUp = tendenciaPositiva && (trend?.isUp !== false);

    return (
        <div className={`
            relative p-5 rounded-md border transition-all duration-300 group overflow-hidden
            bg-white border-slate-200 hover:border-emerald-400/60 hover:shadow-md hover:shadow-slate-200/50
            dark:bg-slate-900/50 dark:border-white/5 dark:hover:border-[#00df82]/40 dark:hover:shadow-none
            ${brillo ? 'dark:shadow-[0_0_25px_-10px_rgba(0,223,130,0.4)]' : ''}
            ${className}
        `}>
            <div className="flex items-start justify-between gap-3 mb-3">
                {displayIcono && (
                    <span className="text-emerald-600 dark:text-[#00df82] [&>svg]:w-6 [&>svg]:h-6">
                        {displayIcono}
                    </span>
                )}
                {displayTrend && (
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1
                        ${displayIsUp
                            ? 'text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-400/10'
                            : 'text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-400/10'}`}>
                        {displayIsUp ? <ArrowTrendingUpIcon className="w-3 h-3" /> : <ArrowTrendingDownIcon className="w-3 h-3" />}
                        {displayTrend}
                    </span>
                )}
            </div>
            <h3 className={`${valueClassName} font-black text-slate-900 dark:text-white tracking-tight leading-none font-mono`}>
                {displayValor}
            </h3>
            <p className="text-[11px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider mt-2.5">
                {displayTitulo}
            </p>
            {sub && (
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-1">{sub}</p>
            )}
        </div>
    )
}

export function SystemStatusRow({ name, status, ping }: { name: string; status: string; ping?: string }) {
    return (
        <div className="flex items-center justify-between text-[11px] p-2.5 rounded-md bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
            <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${status === 'OPERATIVO' || status === 'Operativo' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></div>
                <span className="text-slate-700 dark:text-slate-300 font-bold uppercase">{name}</span>
            </div>
            <span className="font-mono text-slate-500 text-[10px]">{ping}</span>
        </div>
    )
}

export function BotonAccion({ icon, etiqueta, onClick }: { icon?: React.ReactNode; etiqueta?: string; onClick?: () => void }) {
    return (
        <button
            onClick={onClick}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md border text-[10px] font-black uppercase tracking-wider transition-all
                       bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-emerald-600 hover:border-emerald-300
                       dark:bg-white/5 dark:border-white/10 dark:text-slate-300 dark:hover:border-[#00df82]/40 dark:hover:text-[#00df82]"
        >
            {icon && <span className="[&>svg]:w-3.5 [&>svg]:h-3.5">{icon}</span>}
            {etiqueta && <span className="hidden sm:inline">{etiqueta}</span>}
        </button>
    )
}
