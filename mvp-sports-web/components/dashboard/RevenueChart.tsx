"use client";
import React from 'react';
import { 
    ArrowTrendingUpIcon, 
    ArrowUpRightIcon 
} from '@heroicons/react/24/outline';
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

export default function RevenueChart({ data, isHistorical, revenue, formatCLP }: RevenueChartProps) {
    return (
        <PanelGlass className="h-[320px] flex flex-col">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h3 className="text-xs font-bold text-slate-700 dark:text-white uppercase tracking-wide flex items-center gap-2">
                        <ArrowTrendingUpIcon className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                        {isHistorical ? 'EVOLUCIÓN DE VENTAS (MENSUAL)' : 'FLUJO DIARIO ESTIMADO (24H)'}
                    </h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">
                        {isHistorical ? 'COMPARATIVA MES A MES' : 'BASADO EN PROMEDIO DEL MES ACTUAL'}
                    </p>
                </div>
                <div className="text-right">
                    {!isHistorical && (
                        <>
                            <h2 className="text-xl font-mono font-black text-emerald-600 dark:text-emerald-400">
                                {formatCLP(revenue / 30)}
                            </h2>
                            <p className="text-[9px] text-slate-400 uppercase font-bold">PROMEDIO X DÍA</p>
                        </>
                    )}
                </div>
            </div>
            <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data}>
                        <defs>
                            <linearGradient id="verdeNeon" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#64748b" opacity={0.1} vertical={false} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b' }} />
                        <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b' }} />
                        <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#3b82f6' }} />
                        <Tooltip
                            formatter={(value: any, name: any) => {
                                if (name === 'valor') return [formatCLP(Number(value) || 0), 'INGRESOS'];
                                if (name === 'bookings') return [value, 'TRANSACCIONES'];
                                return [value, name ? name.toString().toUpperCase() : ''];
                            }}
                            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', color: '#000', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                        />

                        <Area
                            yAxisId="left"
                            type="monotone"
                            dataKey="valor"
                            stroke="#10b981"
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
