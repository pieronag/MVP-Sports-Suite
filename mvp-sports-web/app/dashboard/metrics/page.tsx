"use client";
import React, { useState, useEffect } from 'react';
import { HugeiconsIcon } from "@hugeicons/react";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import {
    MoneyBag01Icon, ChartIncreaseIcon, CreditCardIcon, GlobalIcon,
    Clock01Icon, Calendar03Icon, Wallet01Icon, ChartLineData01Icon,
    Alert02Icon, BarChartIcon, Store01Icon,
    ArrowUpRight01Icon, ArrowDownRight01Icon, Download01Icon, CreditCardPosIcon,
    ArrowLeft01Icon, ArrowRight01Icon,
} from '@hugeicons/core-free-icons';
import { collection, query, orderBy, limit, onSnapshot, doc } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { TarjetaKpi, SectionCard } from '@/components/ui/DashboardWidgets';

const formatCLP = (amount: number) =>
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(amount);

const ic = "w-6 h-6";

export default function MetricsPage() {
    const [loading, setLoading] = useState(true);
    const [commissionRate, setCommissionRate] = useState<number | null>(null);
    const [planPrices, setPlanPrices] = useState<Record<string, number>>({});
    const [planCommissions, setPlanCommissions] = useState<Record<string, number>>({});
    const [rawInvoices, setRawInvoices] = useState<any[]>([]);
    const [rawBookings, setRawBookings] = useState<any[]>([]);
    const [rawTenants, setRawTenants] = useState<any[]>([]);
    const [financialData, setFinancialData] = useState<any[]>([]);
    const [tenantsDebt, setTenantsDebt] = useState<any[]>([]);
    const [liveTransactions, setLiveTransactions] = useState<any[]>([]);
    const [collectionStats, setCollectionStats] = useState<any[]>([]);
    const [kpis, setKpis] = useState({ gmv: 0, commission: 0, plans: 0, pending: 0 });
    const [prevKpis, setPrevKpis] = useState({ gmv: 0, commission: 0, plans: 0, pending: 0 });
    const [methodBreakdown, setMethodBreakdown] = useState<{ label: string; value: number; method: string }[]>([]);
    const [topTenants, setTopTenants] = useState<{ name: string; value: number; count: number }[]>([]);

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
        const unsubBookings = onSnapshot(query(collection(db, "bookings"), orderBy("date", "desc"), limit(1000)), (snap: any) => {
            setRawBookings(snap.docs.map((d: any) => ({ ...d.data(), id: d.id })));
        });
        const unsubSettings = onSnapshot(doc(db, "settings", "global"), (snap: any) => {
            if (!snap.exists()) return;
            const data = snap.data();
            setCommissionRate(typeof data.commissionRate === 'number' ? data.commissionRate : null);
            const prices: Record<string, number> = {};
            const comms: Record<string, number> = {};
            (data.plans || []).forEach((p: any) => {
                const price = Number(p.price || 0);
                const comm = typeof p.commission === 'number' ? p.commission : undefined;
                if (p.name) { prices[p.name.trim().toLowerCase()] = price; if (comm !== undefined) comms[p.name.trim().toLowerCase()] = comm; }
                if (p.id) { prices[p.id.trim().toLowerCase()] = price; if (comm !== undefined) comms[p.id.trim().toLowerCase()] = comm; }
            });
            setPlanPrices(prices);
            setPlanCommissions(comms);
        });
        const unsubTenants = onSnapshot(collection(db, "tenants"), (snap: any) => {
            setRawTenants(snap.docs.map((d: any) => ({ ...d.data(), id: d.id })));
        });
        return () => { unsubInvoices(); unsubBookings(); unsubSettings(); unsubTenants(); };
    }, [selectedMonth]);

    const globalRate = commissionRate;
    const planKeyOf = (t: any): string =>
        (t.planId || t.plan || '').toString().trim().toLowerCase();
    const feeFor = (booking: any, tenantId?: string): number => {
        const p = Number(booking.totalPrice || booking.price || booking.amount || 0);
        if (booking.commissionFee) return Number(booking.commissionFee);
        const planKey = (booking.plan || booking.planName || '').toString().trim().toLowerCase();
        const planComm = planKey && planCommissions[planKey] !== undefined ? planCommissions[planKey] : undefined;
        const rate = planComm !== undefined ? planComm : globalRate;
        return rate !== null ? p * (rate / 100) : 0;
    };
    // El precio siempre se resuelve contra los planes de la BD (fuente de verdad),
    // nunca contra un `planPrice` suelto que pueda estar desactualizado.
    const tenantMrrOf = (t: any): number => {
        const key = planKeyOf(t);
        if (key && planPrices[key] !== undefined) return planPrices[key];
        return 0;
    };

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
                const fee = feeFor(b, b.tenantId);
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
            rawTenants.forEach(t => { if (t.status === 'Activo') projected += tenantMrrOf(t); });
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
            estimatedCommission += feeFor(b, b.tenantId);
        });

        setLiveTransactions(filteredBookings.sort((a, b) => {
            const tsA = a.createdAt || a.date;
            const tsB = b.createdAt || b.date;
            const dateA = tsA?.toDate ? tsA.toDate() : (tsA?.seconds ? new Date(tsA.seconds * 1000) : new Date(0));
            const dateB = tsB?.toDate ? tsB.toDate() : (tsB?.seconds ? new Date(tsB.seconds * 1000) : new Date(0));
            return dateB.getTime() - dateA.getTime();
        }).slice(0, 8).map(b => {
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
            const rawMethod = (b.paymentMethod || '').toLowerCase();
            const rawSource = (b.source || '').toLowerCase();

            const isNoShow = b.status === 'no-show' ||
                b.paymentStatus === 'no-show' ||
                (b.notes && (b.notes.toLowerCase().includes('no-show') || b.notes.toLowerCase().includes('inasistencia')));

            let method = 'unknown';
            let methodLabel = 'Sin Info';

            if (isNoShow) { method = 'noshow'; methodLabel = 'No-Show'; }
            else if (rawMethod === 'card' || rawMethod === 'webpay') { method = 'webpay'; methodLabel = 'Webpay'; }
            else if (rawMethod === 'oneclick') { method = 'oneclick'; methodLabel = 'Oneclick'; }
            else if (rawMethod === 'cash' || rawMethod === 'efectivo') { method = 'cash'; methodLabel = 'Efectivo'; }
            else if (rawMethod === 'transfer' || rawMethod === 'transferencia') { method = 'transfer'; methodLabel = 'Transferencia'; }
            else if (rawSource === 'mobile_app' && b.paymentStatus === 'paid') { method = 'online'; methodLabel = 'Online App'; }
            else if (rawSource === 'manual' || rawSource === 'web_dashboard' || rawSource === 'manual_manager' || rawSource === 'manual_dashboard') { method = 'manual'; methodLabel = 'Manual'; }

            return { id: b.id, bookingId: b.transactionId || `#RES-${b.id.slice(0, 4)}`, venue: b.tenantName || '---', amount: p, fee: feeFor(b, b.tenantId), time: relativeTime, method, methodLabel, paymentStatus: b.paymentStatus || 'pending' };
        }));

        const currentComm = isCurrentMonth ? (estimatedCommission || monthlyCommissions) : monthlyCommissions;
        const totalPot = (monthlyPending + currentComm + monthlyPlans);
        const paidPct = totalPot > 0 ? Math.round(((currentComm + monthlyPlans) / totalPot) * 100) : 0;

        // --- Desglose por método de pago ---
        const methodMap: Record<string, { label: string; value: number; method: string }> = {};
        filteredBookings.forEach((b: any) => {
            const rawMethod = (b.paymentMethod || '').toLowerCase();
            const rawSource = (b.source || '').toLowerCase();
            const isNoShow = b.status === 'no-show' || b.paymentStatus === 'no-show' ||
                (b.notes && (b.notes.toLowerCase().includes('no-show') || b.notes.toLowerCase().includes('inasistencia')));
            let method = 'otro', label = 'Otros';
            if (isNoShow) { method = 'noshow'; label = 'No-Show'; }
            else if (rawMethod === 'card' || rawMethod === 'webpay') { method = 'webpay'; label = 'Webpay'; }
            else if (rawMethod === 'oneclick') { method = 'oneclick'; label = 'Oneclick'; }
            else if (rawMethod === 'cash' || rawMethod === 'efectivo') { method = 'cash'; label = 'Efectivo'; }
            else if (rawMethod === 'transfer' || rawMethod === 'transferencia') { method = 'transfer'; label = 'Transferencia'; }
            else if (rawSource === 'mobile_app') { method = 'online'; label = 'Online App'; }
            const p = Number(b.totalPrice || b.price || b.amount || 0);
            if (!methodMap[method]) methodMap[method] = { label, value: 0, method };
            methodMap[method].value += p;
        });
        setMethodBreakdown(Object.values(methodMap).sort((a, b) => b.value - a.value));

        // --- Top recintos por ingresos (GMV) ---
        const tenantMap: Record<string, { name: string; value: number; count: number }> = {};
        filteredBookings.forEach((b: any) => {
            const key = b.tenantId || b.tenantName || 'externo';
            const name = b.tenantName || 'Recinto externo';
            const p = Number(b.totalPrice || b.price || b.amount || 0);
            if (!tenantMap[key]) tenantMap[key] = { name, value: 0, count: 0 };
            tenantMap[key].value += p;
            tenantMap[key].count += 1;
        });
        setTopTenants(Object.values(tenantMap).sort((a, b) => b.value - a.value).slice(0, 5));

        // --- KPIs del mes anterior (para tendencias) ---
        const prevDate = new Date(selYear, selMonth - 2, 1);
        const prevYear = prevDate.getFullYear();
        const prevMonth = prevDate.getMonth() + 1;
        let prevGmv = 0, prevCommission = 0, prevPlans = 0, prevPending = 0;
        rawBookings.forEach((b: any) => {
            const bDate = b.date?.toDate ? b.date.toDate() : (b.date?.seconds ? new Date(b.date.seconds * 1000) : new Date());
            if (bDate.getFullYear() === prevYear && (bDate.getMonth() + 1) === prevMonth) {
                const p = Number(b.totalPrice || b.price || b.amount || 0);
                prevGmv += p;
                prevCommission += feeFor(b, b.tenantId);
            }
        });
        rawInvoices.forEach((inv: any) => {
            const date = inv.issueDate?.toDate ? inv.issueDate.toDate() : (inv.issueDate?.seconds ? new Date(inv.issueDate.seconds * 1000) : new Date());
            if (date.getFullYear() === prevYear && (date.getMonth() + 1) === prevMonth) {
                const planAmount = inv.breakdown?.planCost || (inv.breakdown ? 0 : inv.amount) || 0;
                if (inv.status === 'Pagada' || inv.status === 'paid') { prevPlans += planAmount; prevCommission += (inv.breakdown?.commissionTotal || 0); }
                else prevPending += (inv.amount || 0);
            }
        });
        setPrevKpis({ gmv: prevGmv, commission: prevCommission, plans: prevPlans, pending: prevPending });

        setCollectionStats([{ name: 'Cobrado', value: paidPct, color: '#00df82' }, { name: 'Pendiente', value: 100 - paidPct, color: '#f59e0b' }]);
        setKpis({ gmv: estimatedGMV, commission: currentComm, plans: isCurrentMonth ? (rawTenants.reduce((acc, t) => acc + (t.status === 'Activo' ? tenantMrrOf(t) : 0), 0)) : monthlyPlans, pending: monthlyPending });
        setLoading(false);
    }, [rawInvoices, rawBookings, rawTenants, commissionRate, planPrices, planCommissions, selectedMonth]);

    const methodStyle = (m: string) =>
        m === 'noshow' ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'
            : m === 'webpay' || m === 'oneclick' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400'
                : m === 'cash' ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'
                    : m === 'transfer' ? 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400'
                        : m === 'online' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                            : 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400';

    const trendBadge = (current: number, prev: number) => {
        if (prev === 0 && current === 0) return null;
        if (prev === 0) return (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-black text-emerald-600 dark:text-[#00df82]">
                <HugeiconsIcon icon={ArrowUpRight01Icon} className="w-3 h-3" strokeWidth={2.4} />NUEVO
            </span>
        );
        const diff = ((current - prev) / prev) * 100;
        const up = diff >= 0;
        return (
            <span className={`inline-flex items-center gap-0.5 text-[10px] font-black font-mono ${up ? 'text-emerald-600 dark:text-[#00df82]' : 'text-rose-600 dark:text-rose-400'}`}>
                <HugeiconsIcon icon={up ? ArrowUpRight01Icon : ArrowDownRight01Icon} className="w-3 h-3" strokeWidth={2.4} />
                {up ? '+' : ''}{diff.toFixed(0)}%
            </span>
        );
    };

    const exportTransactionsCSV = () => {
        const rows = [['Recinto', 'Monto', 'Comisión', 'Método', 'Estado']];
        liveTransactions.forEach((tx: any) => rows.push([tx.venue, String(tx.amount), String(tx.fee), tx.methodLabel, tx.paymentStatus]));
        const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `metricas_${selectedMonth}.csv`;
        a.click(); URL.revokeObjectURL(url);
    };

    const shiftMonth = (delta: number) => () => {
        const [y, m] = selectedMonth.split('-').map(Number);
        const d = new Date(y, m - 1 + delta, 1);
        const now = new Date();
        // No permitir navegar al futuro
        if (d.getFullYear() > now.getFullYear() || (d.getFullYear() === now.getFullYear() && d.getMonth() > now.getMonth())) return;
        setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    };
    const monthLabel = (() => {
        const [y, m] = selectedMonth.split('-').map(Number);
        const label = new Date(y, m - 1, 1).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
        return label.charAt(0).toUpperCase() + label.slice(1);
    })();
    const isCurrentMonthSelected = (() => {
        const [y, m] = selectedMonth.split('-').map(Number);
        const now = new Date();
        return y === now.getFullYear() && m === now.getMonth() + 1;
    })();

    return (
        <div className="w-full space-y-6 pb-12 animate-fadeIn relative">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="w-6 h-[2px] bg-emerald-500 rounded-md" />
                        <p className="text-[11px] font-black text-emerald-600 dark:text-[#00df82] tracking-[0.2em] uppercase">Auditoría ejecutiva</p>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none font-heading">
                        Métricas de <span className="text-emerald-500 dark:text-[#00df82]">Desempeño</span>
                    </h1>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center rounded-md bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 overflow-hidden">
                        <button
                            onClick={shiftMonth(-1)}
                            aria-label="Mes anterior"
                            className="p-2.5 text-slate-400 hover:text-emerald-600 dark:hover:text-[#00df82] hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                        >
                            <HugeiconsIcon icon={ArrowLeft01Icon} className="w-4 h-4" strokeWidth={2.2} />
                        </button>
                        <div className="flex items-center gap-2 px-2 min-w-[150px] justify-center border-x border-slate-200 dark:border-white/10">
                            <HugeiconsIcon icon={Calendar03Icon} className="w-4 h-4 text-emerald-500 shrink-0" strokeWidth={1.8} />
                            <span className="text-[11px] font-black uppercase text-slate-700 dark:text-white whitespace-nowrap">
                                {monthLabel}
                            </span>
                        </div>
                        <button
                            onClick={shiftMonth(1)}
                            aria-label="Mes siguiente"
                            disabled={isCurrentMonthSelected}
                            className="p-2.5 text-slate-400 hover:text-emerald-600 dark:hover:text-[#00df82] hover:bg-slate-50 dark:hover:bg-white/5 transition-colors disabled:opacity-30 disabled:hover:text-slate-400 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                        >
                            <HugeiconsIcon icon={ArrowRight01Icon} className="w-4 h-4" strokeWidth={2.2} />
                        </button>
                    </div>
                    <button
                        onClick={exportTransactionsCSV}
                        className="flex items-center gap-2 px-3.5 py-2.5 rounded-md bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black text-[11px] font-black uppercase tracking-wider hover:opacity-90 transition-opacity"
                    >
                        <HugeiconsIcon icon={Download01Icon} className="w-4 h-4" strokeWidth={2} />
                        Exportar
                    </button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <TarjetaKpi
                    titulo="Clientes (GMV)"
                    valor={formatCLP(kpis.gmv)}
                    sub="Procesado"
                    icono={<HugeiconsIcon icon={GlobalIcon} className={ic} strokeWidth={1.6} />}
                    brillo
                    trend={prevKpis.gmv > 0 ? { value: `${kpis.gmv >= prevKpis.gmv ? '+' : ''}${Math.round(((kpis.gmv - prevKpis.gmv) / prevKpis.gmv) * 100)}%`, isUp: kpis.gmv >= prevKpis.gmv } : undefined}
                />
                <TarjetaKpi
                    titulo={globalRate !== null ? `Comisión (${globalRate}%)` : 'Comisión'}
                    valor={formatCLP(kpis.commission)}
                    sub="Recaudación"
                    icono={<HugeiconsIcon icon={ChartIncreaseIcon} className={ic} strokeWidth={1.6} />}
                    trend={prevKpis.commission > 0 ? { value: `${kpis.commission >= prevKpis.commission ? '+' : ''}${Math.round(((kpis.commission - prevKpis.commission) / prevKpis.commission) * 100)}%`, isUp: kpis.commission >= prevKpis.commission } : undefined}
                />
                <TarjetaKpi
                    titulo="Planes (MRR)"
                    valor={formatCLP(kpis.plans)}
                    sub="Cartera fija"
                    icono={<HugeiconsIcon icon={CreditCardIcon} className={ic} strokeWidth={1.6} />}
                    brillo
                    trend={prevKpis.plans > 0 ? { value: `${kpis.plans >= prevKpis.plans ? '+' : ''}${Math.round(((kpis.plans - prevKpis.plans) / prevKpis.plans) * 100)}%`, isUp: kpis.plans >= prevKpis.plans } : undefined}
                />
                <TarjetaKpi
                    titulo="Por cobrar"
                    valor={formatCLP(kpis.pending)}
                    sub="Deuda activa"
                    icono={<HugeiconsIcon icon={Wallet01Icon} className={ic} strokeWidth={1.6} />}
                    trend={prevKpis.pending > 0 ? { value: `${kpis.pending >= prevKpis.pending ? '+' : ''}${Math.round(((kpis.pending - prevKpis.pending) / prevKpis.pending) * 100)}%`, isUp: kpis.pending < prevKpis.pending } : undefined}
                />
            </div>

            {/* CHARTS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <SectionCard
                    title="Evolución semanal de ingresos"
                    subtitle="Desglose acumulado de operaciones"
                    icon={<HugeiconsIcon icon={ChartLineData01Icon} className="w-5 h-5" strokeWidth={1.8} />}
                    className="lg:col-span-2 h-[380px]"
                    bodyClassName="p-5"
                    action={
                        <div className="flex gap-4">
                            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-[#00df82]" /><span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-300">Comisiones</span></div>
                            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-600" /><span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-300">Planes</span></div>
                        </div>
                    }
                >
                    <div className="w-full h-full min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={financialData}>
                                <defs>
                                    <linearGradient id="colorCom" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00df82" stopOpacity={0.2} /><stop offset="95%" stopColor="#00df82" stopOpacity={0} /></linearGradient>
                                    <linearGradient id="colorSub" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2} /><stop offset="95%" stopColor="#4f46e5" stopOpacity={0} /></linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" opacity={0.1} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(v) => v >= 1000000 ? `$${(v / 1000000).toFixed(1)}M` : `$${(v / 1000).toFixed(0)}k`} />
                                <Tooltip contentStyle={{ backgroundColor: '#020617', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '5px', fontSize: '11px', color: '#fff', fontWeight: 700, textTransform: 'uppercase' }} />
                                <Area type="monotone" dataKey="comisiones" stackId="1" stroke="#00df82" strokeWidth={2.5} fill="url(#colorCom)" />
                                <Area type="monotone" dataKey="planes" stackId="1" stroke="#4f46e5" strokeWidth={2.5} fill="url(#colorSub)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </SectionCard>

                <SectionCard
                    title="Efectividad de cobro"
                    subtitle="Ratio de recaudo mensual"
                    icon={<HugeiconsIcon icon={BarChartIcon} className="w-5 h-5" strokeWidth={1.8} />}
                    className="h-[380px]"
                    bodyClassName="p-5 flex flex-col"
                >
                    <div className="flex-1 w-full relative flex items-center justify-center min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={collectionStats} innerRadius="70%" outerRadius="90%" paddingAngle={8} dataKey="value">
                                    {collectionStats.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />)}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#020617', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '5px', fontSize: '11px', color: '#fff' }} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cobrado</span>
                            <span className="text-3xl font-black text-slate-900 dark:text-white leading-none font-mono">{collectionStats[0]?.value ?? 0}%</span>
                        </div>
                    </div>
                    <div className="w-full mt-5 flex justify-between items-center px-4 py-3 bg-slate-50 dark:bg-white/5 rounded-md border border-slate-100 dark:border-white/5">
                        <span className="text-[11px] font-bold text-slate-400 uppercase">Saldo pendiente</span>
                        <span className="text-sm font-black text-amber-500 font-mono">{collectionStats[1]?.value ?? 0}%</span>
                    </div>
                </SectionCard>
            </div>

            {/* BREAKDOWN: MÉTODOS + TOP RECINTOS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <SectionCard
                    title="Métodos de pago"
                    subtitle="Distribución del GMV por canal"
                    icon={<HugeiconsIcon icon={CreditCardPosIcon} className="w-5 h-5" strokeWidth={1.8} />}
                    bodyClassName="p-5 space-y-3"
                >
                    {methodBreakdown.length > 0 ? (() => {
                        const total = methodBreakdown.reduce((s, m) => s + m.value, 0) || 1;
                        return methodBreakdown.map((m) => (
                            <div key={m.method} className="space-y-1.5">
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">{m.label}</span>
                                    <span className="text-[11px] font-black font-mono text-slate-900 dark:text-white">
                                        {formatCLP(m.value)} <span className="text-slate-400 font-bold">· {Math.round((m.value / total) * 100)}%</span>
                                    </span>
                                </div>
                                <div className="h-1.5 w-full rounded-md bg-slate-100 dark:bg-white/5 overflow-hidden">
                                    <div className="h-full rounded-md bg-emerald-500 dark:bg-[#00df82]" style={{ width: `${Math.max(2, (m.value / total) * 100)}%` }} />
                                </div>
                            </div>
                        ));
                    })() : (
                        <div className="py-14 text-center">
                            <HugeiconsIcon icon={CreditCardPosIcon} className="w-9 h-9 text-slate-200 dark:text-white/10 mx-auto mb-3" strokeWidth={1.6} />
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Sin pagos en el periodo</p>
                        </div>
                    )}
                </SectionCard>

                <SectionCard
                    title="Top recintos"
                    subtitle="Mayor GMV generado"
                    icon={<HugeiconsIcon icon={Store01Icon} className="w-5 h-5" strokeWidth={1.8} />}
                    bodyClassName="p-5 space-y-3"
                >
                    {topTenants.length > 0 ? (() => {
                        const max = topTenants[0].value || 1;
                        return topTenants.map((t, i) => (
                            <div key={t.name + i} className="space-y-1.5">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-[10px] font-black text-slate-400 font-mono w-4 shrink-0">#{i + 1}</span>
                                        <span className="text-[11px] font-bold uppercase truncate text-slate-900 dark:text-white">{t.name}</span>
                                    </div>
                                    <span className="text-[11px] font-black font-mono text-slate-900 dark:text-white shrink-0">
                                        {formatCLP(t.value)} <span className="text-slate-400 font-bold">· {t.count}</span>
                                    </span>
                                </div>
                                <div className="h-1.5 w-full rounded-md bg-slate-100 dark:bg-white/5 overflow-hidden">
                                    <div className="h-full rounded-md bg-indigo-500" style={{ width: `${Math.max(2, (t.value / max) * 100)}%` }} />
                                </div>
                            </div>
                        ));
                    })() : (
                        <div className="py-14 text-center">
                            <HugeiconsIcon icon={Store01Icon} className="w-9 h-9 text-slate-200 dark:text-white/10 mx-auto mb-3" strokeWidth={1.6} />
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Sin operaciones en el periodo</p>
                        </div>
                    )}
                </SectionCard>
            </div>

            {/* TABLES */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <SectionCard
                    title="Transacciones en línea"
                    subtitle="Últimas reservas del periodo"
                    icon={<HugeiconsIcon icon={Clock01Icon} className="w-5 h-5" strokeWidth={1.8} />}
                    bodyClassName="p-0"
                >
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left min-w-[640px]">
                            <thead>
                                <tr className="bg-slate-50/60 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/5">
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Recinto</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Monto</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-emerald-500 uppercase tracking-wider text-right">Comisión</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">Método</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Hace</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                {liveTransactions.length > 0 ? liveTransactions.map((tx: any) => (
                                    <tr key={tx.id} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors">
                                        <td className="px-6 py-4 text-[11px] font-bold text-slate-900 dark:text-white uppercase truncate max-w-[160px]">{tx.venue}</td>
                                        <td className="px-6 py-4 text-right text-[11px] font-bold text-slate-500 dark:text-slate-400 font-mono">{formatCLP(tx.amount)}</td>
                                        <td className="px-6 py-4 text-right text-[11px] font-black text-emerald-600 dark:text-[#00df82] font-mono">{formatCLP(tx.fee)}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider ${methodStyle(tx.method)}`}>
                                                {tx.methodLabel}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right text-[10px] text-slate-400 uppercase font-medium font-mono">{tx.time}</td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={5} className="py-14 text-center">
                                            <HugeiconsIcon icon={Clock01Icon} className="w-9 h-9 text-slate-200 dark:text-white/10 mx-auto mb-3" strokeWidth={1.6} />
                                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Sin transacciones en el periodo</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </SectionCard>

                <SectionCard
                    title="Cuentas por cobrar (Top 10)"
                    subtitle="Deuda activa por recinto"
                    icon={<HugeiconsIcon icon={Alert02Icon} className="w-5 h-5" strokeWidth={1.8} />}
                    bodyClassName="p-0"
                >
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left min-w-[560px]">
                            <thead>
                                <tr className="bg-slate-50/60 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/5">
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Centro operativo</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Comisión</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Total</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                {tenantsDebt.length > 0 ? tenantsDebt.map((t: any) => (
                                    <tr key={t.id} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors">
                                        <td className="px-6 py-4 text-[11px] font-bold text-slate-900 dark:text-white uppercase truncate max-w-[160px]">{t.name}</td>
                                        <td className="px-6 py-4 text-right text-[11px] font-bold text-emerald-500 font-mono">{formatCLP(t.commission)}</td>
                                        <td className="px-6 py-4 text-right text-[11px] font-black text-slate-900 dark:text-white font-mono">{formatCLP(t.totalDebt)}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${t.status === 'Pendiente' ? 'bg-amber-50 border-amber-500/30 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' : 'bg-red-50 border-red-500/30 text-red-600 dark:bg-red-500/10 dark:text-red-400'}`}>
                                                {t.status}
                                            </span>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={4} className="py-14 text-center">
                                            <HugeiconsIcon icon={Store01Icon} className="w-9 h-9 text-slate-200 dark:text-white/10 mx-auto mb-3" strokeWidth={1.6} />
                                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Sin deudas pendientes</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </SectionCard>
            </div>
        </div>
    );
}
