"use client";
import React from 'react';
import { HugeiconsIcon } from "@hugeicons/react";
import { ChartIncreaseIcon } from "@hugeicons/core-free-icons";
import {
    ResponsiveContainer, ComposedChart, CartesianGrid, XAxis, YAxis,
    Tooltip, Area, Line
} from 'recharts';
import { PanelGlass } from '@/components/ui/DashboardWidgets';

interface RevenueChartProps {
    data: any[];
    isHistorical: boolean;
    revenue: number;
    formatCLP: (amount: number) => string;
}

function getDaysInCurrentMonth(): number {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
}

export default function RevenueChart({ data, isHistorical, revenue, formatCLP }: RevenueChartProps) {
    return (
        <PanelGlass className="h-[340px] flex flex-col p-5">
            <div className="flex justify-between items-start mb-3 gap-4">
                <div className="flex items-start gap-2.5 min-w-0">
                    <HugeiconsIcon icon={ChartIncreaseIcon} className="w-5 h-5 text-emerald-600 dark:text-[#00df82] shrink-0 mt-0.5" strokeWidth={1.8} />
                    <div className="min-w-0">
                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight truncate font-heading">
                            {isHistorical ? 'Evolución de ventas (mensual)' : 'Flujo diario estimado (24h)'}
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                            {isHistorical ? 'Comparativa mes a mes' : 'Basado en el promedio del mes actual'}
                        </p>
                    </div>
                </div>
                <div className="text-right shrink-0">
                    {!isHistorical && (
                        <>
                            <h2 className="text-xl font-mono font-black text-emerald-600 dark:text-[#00df82]">
                                {formatCLP(revenue / getDaysInCurrentMonth())}
                            </h2>
                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Promedio por día</p>
                        </>
                    )}
                </div>
            </div>
            <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data}>
                        <defs>
                            <linearGradient id="verdeNeon" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#00df82" stopOpacity={0.25} />
                                <stop offset="95%" stopColor="#00df82" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#64748b" opacity={0.1} vertical={false} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                        <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                        <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#3b82f6' }} />
                        <Tooltip
                            formatter={(value: any, name: any) => {
                                if (name === 'valor') return [formatCLP(Number(value) || 0), 'INGRESOS'];
                                if (name === 'bookings') return [value, 'RESERVAS'];
                                return [value, name ? name.toString().toUpperCase() : ''];
                            }}
                            contentStyle={{ backgroundColor: '#020617', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '5px', color: '#fff', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.4)' }}
                        />

                        <Area
                            yAxisId="left"
                            type="monotone"
                            dataKey="valor"
                            stroke="#00df82"
                            strokeWidth={2}
                            fill="url(#verdeNeon)"
                        />
                        <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="bookings"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </PanelGlass>
    );
}
