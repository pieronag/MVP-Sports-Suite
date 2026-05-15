"use client";
import React, { useState, useEffect } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import {
    CurrencyDollarIcon, ArrowTrendingUpIcon, CreditCardIcon, GlobeAmericasIcon,
    DocumentCheckIcon, HashtagIcon, ClockIcon, ArrowDownTrayIcon,
    CalendarDaysIcon, BuildingStorefrontIcon, UserGroupIcon, ChartBarIcon,
    PresentationChartLineIcon, WalletIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { collection, query, orderBy, limit, where, onSnapshot, doc } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { PanelGlass, TarjetaKpi } from '@/components/ui/DashboardWidgets';

// --- UTILIDAD DE FORMATO CLP ---
const formatCLP = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
        style: 'currency', currency: 'CLP', minimumFractionDigits: 0
    }).format(amount);
};

export default function MetricsPage() {
    const [loading, setLoading] = useState(true);
    const [commissionRate, setCommissionRate] = useState(8);
    const [rawInvoices, setRawInvoices] = useState<any[]>([]);
    const [rawBookings, setRawBookings] = useState<any[]>([]);
    const [rawTenants, setRawTenants] = useState<any[]>([]);
    const [financialData, setFinancialData] = useState<any[]>([]);
    const [tenantsDebt, setTenantsDebt] = useState<any[]>([]);
    const [liveTransactions, setLiveTransactions] = useState<any[]>([]);
    const [collectionStats, setCollectionStats] = useState<any[]>([]);
    const [kpis, setKpis] = useState({ gmv: 0, commission: 0, plans: 0, pending: 0 });

    const getCurrentMonth = () => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    };
    const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());

    useEffect(() => {
        setLoading(true);
        const unsubInvoices = onSnapshot(query(collection(db, "invoices"), orderBy("issueDate", "desc")), (snap: any) => {
            setRawInvoices(snap.docs.map((d: any) => ({ ...d.data(), id: d.id })));
        });
        const unsubBookings = onSnapshot(query(collection(db, "bookings"), orderBy("date", "desc"), limit(100)), (snap: any) => {
            setRawBookings(snap.docs.map((d: any) => ({ ...d.data(), id: d.id })));
        });
        const unsubSettings = onSnapshot(doc(db, "settings", "global"), (snap: any) => {
            if (snap.exists()) setCommissionRate(snap.data().commissionRate || 8);
        });
        const unsubTenants = onSnapshot(collection(db, "tenants"), (snap: any) => {
            setRawTenants(snap.docs.map((d: any) => ({ ...d.data(), id: d.id })));
        });
        return () => { unsubInvoices(); unsubBookings(); unsubSettings(); unsubTenants(); };
    }, [selectedMonth]);

    useEffect(() => {
        if (rawInvoices.length === 0 && rawBookings.length === 0 && rawTenants.length === 0) return;
        const [selYear, selMonth] = selectedMonth.split('-').map(Number);
        const isCurrentMonth = selYear === new Date().getFullYear() && selMonth === (new Date().getMonth() + 1);

        const weeklyData = [
            { name: 'Semana 1', planes: 0, comisiones: 0 },
            { name: 'Semana 2', planes: 0, comisiones: 0 },
            { name: 'Semana 3', planes: 0, comisiones: 0 },
            { name: 'Semana 4', planes: 0, comisiones: 0 },
        ];

        let monthlyCommissions = 0;
        let monthlyPlans = 0;
        let monthlyPending = 0;

        rawBookings.forEach((b: any) => {
            const bDate = b.date?.toDate ? b.date.toDate() : (b.date?.seconds ? new Date(b.date.seconds * 1000) : new Date());
            if (bDate.getFullYear() === selYear && (bDate.getMonth() + 1) === selMonth) {
                const price = Number(b.totalPrice || b.price || b.amount || 0);
                const fee = b.commissionFee || (price * (commissionRate / 100));
                const bDay = bDate.getDate();
                const weekIndex = Math.min(3, Math.floor((bDay - 1) / 7));
                weeklyData[weekIndex].comisiones += Number(fee || 0);
            }
        });

        rawInvoices.forEach((inv: any) => {
            const date = inv.issueDate?.toDate ? inv.issueDate.toDate() : (inv.issueDate?.seconds ? new Date(inv.issueDate.seconds * 1000) : new Date());
            if (date.getFullYear() === selYear && (date.getMonth() + 1) === selMonth) {
                const planAmount = inv.breakdown?.planCost || (inv.breakdown ? 0 : inv.amount) || 0;
                const weekIndex = Math.min(3, Math.floor((date.getDate() - 1) / 7));
                weeklyData[weekIndex].planes += planAmount;
                if (inv.status === 'Pagada' || inv.status === 'paid') {
                    monthlyPlans += planAmount;
                    monthlyCommissions += (inv.breakdown?.commissionTotal || 0);
                } else monthlyPending += (inv.amount || 0);
            }
        });

        if (isCurrentMonth && !weeklyData.some(w => w.planes > 0)) {
            let projected = 0;
            rawTenants.forEach(t => { if (t.status === 'Activo') projected += Number(t.planPrice || t.mrr || 40000); });
            weeklyData[0].planes = projected;
        }

        setFinancialData(weeklyData);
        const debtMap = new Map();
        rawInvoices.forEach((inv: any) => {
            const date = inv.issueDate?.toDate ? inv.issueDate.toDate() : (inv.issueDate?.seconds ? new Date(inv.issueDate.seconds * 1000) : new Date());
            if ((inv.status === 'Pendiente' || inv.status === 'Vencida' || inv.status === 'pending') &&
                date.getFullYear() === selYear && (date.getMonth() + 1) === selMonth) {
                const tKey = inv.tenantId || inv.tenantName;
                if (!debtMap.has(tKey)) debtMap.set(tKey, { id: inv.tenantId, name: inv.tenantName || '---', plan: inv.breakdown?.planName || 'Base', planCost: inv.breakdown?.planCost || 0, commission: 0, totalDebt: 0, status: inv.status });
                const cur = debtMap.get(tKey);
                cur.commission += (inv.breakdown?.commissionTotal || 0);
                cur.totalDebt += (inv.amount || 0);
            }
        });
        setTenantsDebt(Array.from(debtMap.values()).sort((a: any, b: any) => b.totalDebt - a.totalDebt).slice(0, 10));

        const filteredBookings = rawBookings.filter(b => {
            const bDate = b.date?.toDate ? b.date.toDate() : (b.date?.seconds ? new Date(b.date.seconds * 1000) : new Date());
            return bDate.getFullYear() === selYear && (bDate.getMonth() + 1) === selMonth;
        });

        let estimatedGMV = 0; let estimatedCommission = 0;
        filteredBookings.forEach(b => {
            const p = Number(b.totalPrice || b.price || b.amount || 0);
            estimatedGMV += p;
            estimatedCommission += b.commissionFee || (p * (commissionRate / 100));
        });

        setLiveTransactions(filteredBookings.sort((a, b) => {
            const tsA = a.createdAt || a.date;
            const tsB = b.createdAt || b.date;
            const dateA = tsA?.toDate ? tsA.toDate() : (tsA?.seconds ? new Date(tsA.seconds * 1000) : new Date(0));
            const dateB = tsB?.toDate ? tsB.toDate() : (tsB?.seconds ? new Date(tsB.seconds * 1000) : new Date(0));
            return dateB.getTime() - dateA.getTime();
        }).slice(0, 8).map(b => {
            // Usar createdAt (cuando se hizo la reserva), NO date (fecha del partido)
            const createdTs = b.createdAt || b.date;
            const createdDate = createdTs?.toDate ? createdTs.toDate() : (createdTs?.seconds ? new Date(createdTs.seconds * 1000) : new Date());
            const diff = Math.max(0, Math.floor((new Date().getTime() - createdDate.getTime()) / 60000));
            const p = b.totalPrice || b.price || b.amount || 0;
            let relativeTime = 'AHORA';
            if (diff >= 1 && diff < 60) relativeTime = `${diff} MIN`;
            else if (diff >= 60 && diff < 1440) {
                const hrs = Math.floor(diff / 60);
                const mins = diff % 60;
                relativeTime = mins > 0 ? `${hrs}H ${mins}MIN` : `${hrs}H`;
            }
            else if (diff >= 1440 && diff < 10080) {
                const days = Math.floor(diff / 1440);
                const hrs = Math.floor((diff % 1440) / 60);
                relativeTime = hrs > 0 ? `${days}D ${hrs}H` : `${days}D`;
            }
            else if (diff >= 10080) {
                const weeks = Math.floor(diff / 10080);
                const days = Math.floor((diff % 10080) / 1440);
                relativeTime = days > 0 ? `${weeks}SEM ${days}D` : `${weeks} SEM`;
            }
            // Detectar método de pago: card = Online, cash/transfer/sin campo = Recinto
            let method = 'venue';
            if (b.paymentMethod === 'card') method = 'card';
            else if (b.paymentMethod === 'cash' || b.paymentMethod === 'transfer') method = 'venue';
            else if (b.source === 'mobile_app' && b.paymentStatus === 'paid') method = 'card';
            else if (b.source === 'manual_manager') method = 'venue';
            return { id: b.id, bookingId: b.transactionId || `#RES-${b.id.slice(0, 4)}`, venue: b.tenantName || '---', amount: p, fee: b.commissionFee || (p * (commissionRate / 100)), time: relativeTime, method };
        }));

        const currentComm = isCurrentMonth ? (estimatedCommission || monthlyCommissions) : monthlyCommissions;
        const totalPot = (monthlyPending + currentComm + monthlyPlans);
        const paidPct = totalPot > 0 ? Math.round(((currentComm + monthlyPlans) / totalPot) * 100) : 0;

        setCollectionStats([{ name: 'Cobrado', value: paidPct, color: '#10b981' }, { name: 'Pendiente', value: 100 - paidPct, color: '#f59e0b' }]);
        setKpis({ gmv: estimatedGMV, commission: currentComm, plans: isCurrentMonth ? (rawTenants.reduce((acc, t) => acc + (t.status === 'Activo' ? Number(t.planPrice || t.mrr || 40000) : 0), 0)) : monthlyPlans, pending: monthlyPending });
        setLoading(false);
    }, [rawInvoices, rawBookings, rawTenants, commissionRate, selectedMonth]);

    return (
        <div className="w-full space-y-6 pb-12 animate-fadeIn relative">
            {/* HEADER ADN FINANCE STYLE */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-6">
                <div>
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="w-6 h-[2px] bg-emerald-500 rounded-full"></span>
                        <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 tracking-[0.2em] uppercase">Auditoría Ejecutiva</p>
                    </div>
                    <h1 className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none">Métricas de <span className="text-emerald-500 dark:text-emerald-400">Desempeño</span></h1>
                </div>
                <div className="relative group">
                    <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="pl-4 pr-10 py-2.5 bg-white dark:bg-[#0B0F19] border border-slate-100 dark:border-white/5 rounded-xl text-[10px] font-black uppercase text-black dark:text-white outline-none focus:border-emerald-500 transition-all cursor-pointer shadow-xl" />
                    <CalendarDaysIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
            </div>

            {/* KPI GRID */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <TarjetaKpi titulo="CLIENTES (GMV)" valor={formatCLP(kpis.gmv)} sub="PROCESADO" icono={<GlobeAmericasIcon />} brillo />
                <TarjetaKpi titulo={`COMISIÓN (${commissionRate}%)`} valor={formatCLP(kpis.commission)} sub="RECAUDACIÓN" icono={<ArrowTrendingUpIcon />} />
                <TarjetaKpi titulo="PLANES (MRR)" valor={formatCLP(kpis.plans)} sub="CARTERA FIJA" icono={<CreditCardIcon />} brillo />
                <TarjetaKpi titulo="POR COBRAR" valor={formatCLP(kpis.pending)} sub="DEUDA ACTIVA" icono={<WalletIcon />} />
            </div>

            {/* CHARTS SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <PanelGlass className="lg:col-span-2 p-6 flex flex-col h-[400px]">
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <h3 className="text-[10px] font-black text-black dark:text-white uppercase tracking-[0.2em]">Evolución Semanal de Ingresos</h3>
                            <p className="text-[8px] font-black text-slate-400 uppercase mt-1">Desglose acumulado de operaciones</p>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-[9px] font-black uppercase text-black dark:text-white">Comisiones</span></div>
                            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-600" /><span className="text-[9px] font-black uppercase text-black dark:text-white">Planes</span></div>
                        </div>
                    </div>
                    <div className="flex-1 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={financialData}>
                                <defs>
                                    <linearGradient id="colorCom" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.1} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                                    <linearGradient id="colorSub" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1} /><stop offset="95%" stopColor="#4f46e5" stopOpacity={0} /></linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" opacity={0.1} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#64748b', fontWeight: '900' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#64748b', fontWeight: '900' }} tickFormatter={(v) => v >= 1000000 ? `$${(v / 1000000).toFixed(1)}M` : `$${(v / 1000).toFixed(0)}k`} />
                                <Tooltip contentStyle={{ backgroundColor: '#000', border: 'none', borderRadius: '12px', fontSize: '10px', color: '#fff', fontWeight: 'bold', textTransform: 'uppercase' }} />
                                <Area type="monotone" dataKey="comisiones" stackId="1" stroke="#10b981" strokeWidth={3} fill="url(#colorCom)" />
                                <Area type="monotone" dataKey="planes" stackId="1" stroke="#4f46e5" strokeWidth={3} fill="url(#colorSub)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </PanelGlass>

                <PanelGlass className="p-6 flex flex-col items-center">
                    <h3 className="text-[10px] font-black text-black dark:text-white uppercase tracking-[0.2em] mb-1 text-center">Efectividad de Cobro</h3>
                    <p className="text-[8px] font-black text-slate-400 uppercase mb-8 text-center">Ratio de recaudo mensual</p>
                    <div className="flex-1 w-full relative flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={collectionStats} innerRadius="70%" outerRadius="90%" paddingAngle={8} dataKey="value">
                                    {collectionStats.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />)}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#000', border: 'none', borderRadius: '12px', fontSize: '10px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-[8px] font-black text-slate-400 uppercase">Cobrado</span>
                            <span className="text-3xl font-black text-black dark:text-white leading-none">{collectionStats[0]?.value}%</span>
                        </div>
                    </div>
                    <div className="w-full mt-6 flex justify-between items-center px-4 py-3 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5">
                        <span className="text-[9px] font-black text-slate-400 uppercase">Saldo Pendiente</span>
                        <span className="text-[10px] font-black text-amber-500">{collectionStats[1]?.value}%</span>
                    </div>
                </PanelGlass>
            </div>

            {/* TABLES SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="rounded-2xl border border-slate-100 dark:border-white/5 overflow-hidden bg-white dark:bg-[#0B0F19] shadow-xl shadow-slate-200/20">
                    <div className="p-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] flex justify-between items-center">
                        <h3 className="text-[10px] font-black text-black dark:text-white uppercase tracking-widest flex items-center gap-3"><div className="p-2 bg-emerald-500 rounded-lg shadow-lg shadow-emerald-500/20"><ClockIcon className="w-4 h-4 text-white" /></div> Transacciones en Línea</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50/50 dark:bg-white/[0.02] text-[8px] font-black text-slate-400 uppercase border-b border-slate-100 dark:border-white/5 tracking-widest">
                                    <th className="px-6 py-4">Recinto</th>
                                    <th className="px-6 py-4 text-right">Monto</th>
                                    <th className="px-6 py-4 text-right text-emerald-500">Comisión</th>
                                    <th className="px-6 py-4 text-center">Método</th>
                                    <th className="px-6 py-4 text-right">Hace</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-white/5 text-[10px] font-black text-black dark:text-white">
                                {liveTransactions.map((tx: any) => (
                                    <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                                        <td className="px-6 py-4 uppercase truncate max-w-[150px]">{tx.venue}</td>
                                        <td className="px-6 py-4 text-right font-black text-slate-400">{formatCLP(tx.amount)}</td>
                                        <td className="px-6 py-4 text-right font-black text-emerald-600">{formatCLP(tx.fee)}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`text-[8px] font-black px-2 py-0.5 rounded-md uppercase ${tx.method === 'card' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400'}`}>
                                                {tx.method === 'card' ? 'Online' : 'Recinto'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right text-slate-400 uppercase font-medium text-[9px]">{tx.time}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-100 dark:border-white/5 overflow-hidden bg-white dark:bg-[#0B0F19] shadow-xl shadow-slate-200/20">
                    <div className="p-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] flex justify-between items-center">
                        <h3 className="text-[10px] font-black text-black dark:text-white uppercase tracking-widest flex items-center gap-3"><div className="p-2 bg-amber-500 rounded-lg shadow-lg shadow-amber-500/20"><ExclamationTriangleIcon className="w-4 h-4 text-white" /></div> Cuentas por Cobrar (Top 10)</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50/50 dark:bg-white/[0.02] text-[8px] font-black text-slate-400 uppercase border-b border-slate-100 dark:border-white/5 tracking-widest">
                                    <th className="px-6 py-4">Centro Operativo</th>
                                    <th className="px-6 py-4 text-right">Comisión</th>
                                    <th className="px-6 py-4 text-right">Total</th>
                                    <th className="px-6 py-4 text-center">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-white/5 text-[10px] font-black text-black dark:text-white">
                                {tenantsDebt.map((t: any) => (
                                    <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-all">
                                        <td className="px-6 py-4 uppercase truncate max-w-[150px]">{t.name}</td>
                                        <td className="px-6 py-4 text-right text-emerald-500">{formatCLP(t.commission)}</td>
                                        <td className="px-6 py-4 text-right font-black">{formatCLP(t.totalDebt)}</td>
                                        <td className="px-6 py-4 text-center"><span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase border ${t.status === 'Pendiente' ? 'bg-amber-50 border-amber-500/30 text-amber-600' : 'bg-red-50 border-red-500/30 text-red-600'}`}>{t.status}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
