"use client";
// Piezas visuales compartidas de la pantalla de canchas
import { HugeiconsIcon } from "@hugeicons/react";
import React from 'react';

/* eslint-disable @typescript-eslint/no-explicit-any */

export function PanelHeader({ titulo, desc, icon: Icon, action }: any) {
    let content: React.ReactNode;
    if (React.isValidElement(Icon)) {
        content = Icon;
    } else if (Array.isArray(Icon)) {
        content = <HugeiconsIcon icon={Icon} className="w-4 h-4" strokeWidth={1.8} />;
    } else {
        content = <Icon className="w-4 h-4" />;
    }
    return (
        <div className="flex items-center justify-between gap-4 px-6 lg:px-7 py-4 border-b border-slate-100 dark:border-white/5">
            <div className="flex items-center gap-3 min-w-0">
                <span className="text-emerald-600 dark:text-[#00df82] shrink-0">{content}</span>
                <div className="min-w-0">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-900 dark:text-white truncate font-heading">{titulo}</h3>
                    <p className="text-xs md:text-[10px] font-bold text-slate-400 truncate">{desc}</p>
                </div>
            </div>
            {action}
        </div>
    );
}

export function StatMini({ label, value }: { label: string; value: number }) {
    return (
        <div className="p-3 rounded-md bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
            <p className="text-[11px] md:text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">{label}</p>
            <p className="text-lg font-black text-slate-900 dark:text-white font-mono leading-none">{value}</p>
        </div>
    );
}
