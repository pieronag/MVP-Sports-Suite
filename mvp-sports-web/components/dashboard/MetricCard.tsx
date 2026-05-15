"use client";
import React from 'react';

interface MetricCardProps {
    label: string;
    value: string;
    icon: any;
    color: 'emerald' | 'blue' | 'amber' | 'purple' | 'indigo';
    subtext?: string;
}

export default function MetricCard({ label, value, icon: Icon, color, subtext }: MetricCardProps) {
    const colors: any = {
        emerald: "text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10",
        blue: "text-blue-500 bg-blue-50 dark:bg-blue-500/10",
        amber: "text-amber-500 bg-amber-50 dark:bg-amber-500/10",
        purple: "text-purple-500 bg-purple-50 dark:bg-purple-500/10",
        indigo: "text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10",
    };

    return (
        <div className="bg-white dark:bg-[#0B0F19] p-4 rounded-xl border border-slate-200 dark:border-white/5 shadow-sm hover:border-slate-300 transition-colors">
            <div className="flex justify-between items-center mb-2">
                <p className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider truncate">{label}</p>
                <div className={`p-1.5 rounded-lg ${colors[color]}`}>
                    <Icon className="w-3.5 h-3.5" />
                </div>
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none pt-1">{value}</h3>
            {subtext && <p className="text-[8px] font-bold text-slate-400 mt-1">{subtext}</p>}
        </div>
    );
}
