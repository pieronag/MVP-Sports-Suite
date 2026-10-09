"use client";
import React, { useState, useEffect } from 'react';
import { HugeiconsIcon } from "@hugeicons/react";
import {
    Calendar03Icon,
    RefreshIcon,
    Archive01Icon,
    TrophyIcon,
    BarChartIcon,
    PieChartIcon,
    UserAdd01Icon,
    ArrowUpRight01Icon,
    Store01Icon,
    ArrowLeft01Icon,
    ArrowRight01Icon,
} from "@hugeicons/core-free-icons";
import AdminKpiSection from './AdminKpiSection';
import RevenueChart from './RevenueChart';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { collection, query, orderBy, limit, onSnapshot, doc } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { SectionCard } from '@/components/ui/DashboardWidgets';

const formatCLP = (amount: number) =>
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(amount);

// Paleta para los planes; se asigna por índice de orden de precio (BD) con fallback.
const PLAN_PALETTE = ['#64748b', '#6366f1', '#8b5cf6', '#00df82', '#f59e0b', '#ec4899'];

const getRelativeTime = (timestamp: any) => {
    if (!timestamp) return 'RECIENTE';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const diff = Math.max(0, Math.floor((new Date().getTime() - date.getTime()) / 60000));
    if (diff < 1) return 'AHORA';
    if (diff < 60) return `HACE ${diff} MIN`;
    if (diff < 1440) return `HACE ${Math.floor(diff / 60)} H`;
    if (diff < 10080) return `HACE ${Math.floor(diff / 1440)} D`;
    return `HACE ${Math.floor(diff / 10080)} SEM`;
};

const isNoShowBooking = (b: any) =>
    b.status === 'no-show' ||
    b.paymentStatus === 'no-show' ||
    (b.notes && (b.notes.toLowerCase().includes('no-show') || b.notes.toLowerCase().includes('inasistencia')));

interface PlanItem { id: string; name: string; price: number; commission: number; color: string }

// Resuelve el plan de un tenant contra la lista real de planes (BD).
// Acepta match por id o por nombre, sin asumir nomenclatura.
const resolvePlanRef = (planList: PlanItem[]) => (t: any): PlanItem | undefined => {
    const ref = (t?.planId || t?.plan || '').toString().trim().toLowerCase();
    if (!ref) return undefined;
    return planList.find(p => p.id.toLowerCase() === ref || p.name.toLowerCase() === ref);
};

function getMethodBadge(b: any) {
    const method = (b.paymentMethod || '').toLowerCase();
    const source = (b.source || '').toLowerCase();

    if (isNoShowBooking(b)) return { label: 'No-Show', style: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' };
    if (method === 'card' || method === 'webpay' || method === 'oneclick')
        return { label: method === 'oneclick' ? 'Oneclick (hist.)' : 'Webpay (hist.)', style: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400' };
    if (method === 'cash' || method === 'efectivo') return { label: 'Efectivo', style: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' };
    if (method === 'transfer' || method === 'transferencia') return { label: 'Transferencia', style: 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400' };
    if (source === 'mobile_app' && b.paymentStatus === 'paid') return { label: 'Online App', style: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' };
    if (source === 'manual' || source === 'web_dashboard') return { label: 'Manual', style: 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400' };
    return { label: 'Sin info', style: 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400' };
}

function getStatusBadge(b: any) {
    const ps = isNoShowBooking(b) ? 'no-show' : (b.paymentStatus || 'pending').toLowerCase();
    if (ps === 'paid') return { label: 'Pagado', style: 'bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400', dot: 'bg-emerald-500' };
    if (ps === 'partial') return { label: 'Parcial', style: 'bg-sky-50 border-sky-100 text-sky-600 dark:bg-sky-500/10 dark:border-sky-500/20 dark:text-sky-400', dot: 'bg-sky-500' };
    if (ps === 'refunded') return { label: 'Reembolsado', style: 'bg-rose-50 border-rose-100 text-rose-600 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-400', dot: 'bg-rose-500' };
    if (ps === 'no-show') return { label: 'No-Show', style: 'bg-red-50 border-red-100 text-red-600 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400', dot: 'bg-red-500' };
    return { label: 'Pendiente', style: 'bg-amber-50 border-amber-100 text-amber-600 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-400', dot: 'bg-amber-500' };
}

export default function AdminDashboard() {
    const [kpis, setKpis] = useState({
        revenue: 0, tenants: 0, totalTenants: 0, users: 0, churn: 0, ltv: 0,
        mrrGrowth: 0, usageDensity: 0, conversionRate: 0
    });
    const [chartData, setChartData] = useState<any[]>([]);
    const [plansData, setPlansData] = useState<any[]>([]);
    const [topTenants, setTopTenants] = useState<any[]>([]);
    const [newTenantsList, setNewTenantsList] = useState<any[]>([]);
    const [topOccupancy, setTopOccupancy] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [tenantsMap, setTenantsMap] = useState<Record<string, string>>({});
    const [tenantPlanMap, setTenantPlanMap] = useState<Record<string, string>>({});
    const [rawBookings, setRawBookings] = useState<any[]>([]);
    const [rawInvoices, setRawInvoices] = useState<any[]>([]);
    const [recentBookings, setRecentBookings] = useState<any[]>([]);
    const [commissionRate, setCommissionRate] = useState(8);
    const [planList, setPlanList] = useState<{ id: string; name: string; price: number; commission: number; color: string }[]>([]);
    const [refreshKey, setRefreshKey] = useState(0);

    const getCurrentMonth = () => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    };
    const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
    const [isHistorical, setIsHistorical] = useState(false);

    useEffect(() => {
        setLoading(true);
        const unsubscribeTenants = onSnapshot(collection(db, "tenants"), (tenantsSnap: any) => {
            const tenants = tenantsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })) as any[];
            const activeTenants = tenants.filter((t: any) => t.status === 'Activo').length;
            const resolvePlan = resolvePlanRef(planList);

            const paidTenants = tenants.filter((t: any) => {
                const p = resolvePlan(t);
                return p && Number(p.price) > 0 && t.status === 'Activo';
            }).length;
            const conversionRate = activeTenants > 0 ? (paidTenants / activeTenants) * 100 : 0;
            const totalTenantsCount = tenants.length;
            const inactiveRate = totalTenantsCount > 0 ? ((totalTenantsCount - activeTenants) / totalTenantsCount) * 100 : 0;

            // Distribución de planes derivada 100% de la BD (no nombres hardcodeados)
            const plansCount: Record<string, number> = {};
            planList.forEach(p => { plansCount[p.name] = 0; });
            tenants.forEach((t) => {
                const p = resolvePlan(t);
                const key = p ? p.name : (planList[0]?.name || 'Free');
                plansCount[key] = (plansCount[key] || 0) + 1;
            });
            setPlansData(Object.keys(plansCount).map(key => ({
                name: key,
                value: plansCount[key],
                color: planList.find(p => p.name === key)?.color || '#cbd5e1'
            })));

            setKpis(prev => ({
                ...prev,
                tenants: activeTenants,
                totalTenants: totalTenantsCount,
                churn: isNaN(inactiveRate) ? 0 : inactiveRate,
                conversionRate: isNaN(conversionRate) ? 0 : conversionRate
            }));

            const newMap: Record<string, string> = {};
            const planMap: Record<string, string> = {};
            tenants.forEach(t => {
                newMap[t.id] = t.name;
                const p = resolvePlan(t);
                if (p) planMap[t.id] = p.id || p.name;
            });
            setTenantsMap(newMap);
            setTenantPlanMap(planMap);

            setNewTenantsList(tenants
                .sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
                .slice(0, 5)
                .map((t: any) => {
                    const p = resolvePlan(t);
                    return { id: t.id, name: t.name, plan: p?.name || '—', status: t.status, date: t.createdAt?.toDate().toLocaleDateString('es-CL') || 'Reciente' };
                }));
        }, (error: any) => console.error("Error tenants snapshot:", error));

        const unsubscribeInvoices = onSnapshot(query(collection(db, "invoices"), orderBy("issueDate", "desc")), (invoicesSnap: any) => {
            setRawInvoices(invoicesSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
        }, (error: any) => console.error("Error invoices snapshot:", error));

        const qBookings = query(collection(db, "bookings"), orderBy("date", "desc"), limit(1000));
        const unsubscribeBookings = onSnapshot(qBookings, (bookingsSnap: any) => {
            setRawBookings(bookingsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
        }, (error: any) => console.error("Error bookings snapshot:", error));

        const unsubUsers = onSnapshot(collection(db, "users"), (s: any) => setKpis(prev => ({ ...prev, users: s.size })), (error: any) => console.error("Error users snapshot:", error));

        const qAudit = query(collection(db, "audit"), orderBy("timestamp", "desc"), limit(10));
        const unsubAudit = onSnapshot(qAudit, (auditSnap: any) => {
            auditSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
            setLoading(false);
        }, (error: any) => {
            console.error("Error audit snapshot:", error);
            setLoading(false);
        });

        const unsubSettings = onSnapshot(doc(db, "settings", "global"), (snap: any) => {
            if (!snap.exists()) return;
            const data = snap.data();
            const cr = data.commissionRate;
            setCommissionRate(typeof cr === 'number' ? cr : 8);
            const rawPlans = Array.isArray(data.plans) ? data.plans : [];
            const sorted = [...rawPlans].sort((a: any, b: any) => Number(a.price || 0) - Number(b.price || 0));
            setPlanList(sorted.map((p: any, i: number) => ({
                id: (p.id || '').toString(),
                name: (p.name || p.id || 'Plan').toString(),
                price: Number(p.price || 0),
                commission: typeof p.commission === 'number' ? p.commission : (typeof cr === 'number' ? cr : 8),
                color: PLAN_PALETTE[i % PLAN_PALETTE.length],
            })));
        }, (error: any) => console.error("Error settings snapshot:", error));

        return () => {
            unsubscribeTenants(); unsubscribeInvoices(); unsubscribeBookings();
            unsubUsers(); unsubAudit(); unsubSettings();
        };
    }, [selectedMonth, refreshKey, planList]);

    useEffect(() => {
        if (rawInvoices.length === 0 && rawBookings.length === 0) return;
        const [year, month] = selectedMonth.split('-').map(Number);
        const startOfMonth = new Date(year, month - 1, 1);
        const endOfMonth = new Date(year, month, 0, 23, 59, 59);

        let calculatedRevenue = 0;
        let totalRevenueAllTime = 0;
        const monthlyRevenueMap: any = {};

        const prevMonth = new Date(year, month - 2, 1);
        const prevMonthEnd = new Date(year, month - 1, 0, 23, 59, 59);

        rawInvoices.forEach(inv => {
            const amt = Number(inv.amount || inv.total || 0);
            totalRevenueAllTime += amt;
            const date = inv.issueDate?.toDate ? inv.issueDate.toDate() : (inv.issueDate ? new Date(inv.issueDate) : new Date());
            const monthKey = date.toLocaleDateString('es-CL', { month: 'short', year: '2-digit' });
            const sortKey = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (!monthlyRevenueMap[sortKey]) monthlyRevenueMap[sortKey] = { name: monthKey, valor: 0, sort: sortKey, bookings: 0 };

            if (inv.status === 'Pagada' || inv.status === 'paid') {
                monthlyRevenueMap[sortKey].valor += amt;
                if (isHistorical) calculatedRevenue += amt;
                else if ((date.getMonth() + 1) === month && date.getFullYear() === year) calculatedRevenue += amt;
            }
        });

        const filteredBookings = rawBookings.filter(b => {
            if (isHistorical) return (b.status === 'confirmed' || b.status === 'completed');
            const bDate = b.date?.toDate ? b.date.toDate() : new Date(b.date);
            return bDate >= startOfMonth && bDate <= endOfMonth && (b.status === 'confirmed' || b.status === 'completed');
        });

        const monthBookingsRevenue = filteredBookings.reduce((acc, b) => {
            const p = Number(b.totalPrice || b.price || 0);
            if (b.commissionFee) return acc + Number(b.commissionFee);
            const planRef = (tenantPlanMap[b.tenantId] || '').toLowerCase();
            const plan = planList.find(pl => pl.id.toLowerCase() === planRef || pl.name.toLowerCase() === planRef);
            const rate = plan ? plan.commission : commissionRate;
            return acc + (p * (rate / 100));
        }, 0);
        if (!isHistorical && calculatedRevenue === 0) calculatedRevenue = Math.round(monthBookingsRevenue);

        const prevMonthRevenue = rawInvoices
            .filter(inv => {
                const date = inv.issueDate?.toDate ? inv.issueDate.toDate() : (inv.issueDate ? new Date(inv.issueDate) : new Date());
                return date >= prevMonth && date <= prevMonthEnd && (inv.status === 'Pagada' || inv.status === 'paid');
            })
            .reduce((acc, inv) => acc + Number(inv.amount || inv.total || 0), 0);

        const mrrGrowth = prevMonthRevenue > 0 ? ((calculatedRevenue - prevMonthRevenue) / prevMonthRevenue) * 100 : 0;
        setChartData(Object.values(monthlyRevenueMap).sort((a: any, b: any) => a.sort - b.sort));

        const tRev: any = {};
        filteredBookings.forEach(b => {
            const tid = b.tenantId || 'desconocido';
            tRev[tid] = (tRev[tid] || 0) + (Number(b.totalPrice || b.price || 0));
        });
        setTopTenants(Object.keys(tRev).map(tid => {
            const name = tenantsMap[tid] || filteredBookings.find(b => b.tenantId === tid)?.tenantName || 'Recinto externo';
            return { name, value: tRev[tid] };
        }).sort((a, b) => b.value - a.value).slice(0, 5));

        setRecentBookings(filteredBookings.slice(0, 8));
        const usageDensity = kpis.tenants > 0 ? filteredBookings.length / kpis.tenants : 0;
        const bookingsByTenant: any = {};
        filteredBookings.forEach(b => {
            const tid = b.tenantId || 'desconocido';
            bookingsByTenant[tid] = (bookingsByTenant[tid] || 0) + 1;
        });
        setTopOccupancy(Object.keys(bookingsByTenant).map(tid => {
            const name = tenantsMap[tid] || filteredBookings.find(b => b.tenantId === tid)?.tenantName || 'Recinto externo';
            return { name, value: bookingsByTenant[tid] };
        }).sort((a, b) => b.value - a.value).slice(0, 5));

        setKpis(prev => ({
            ...prev,
            revenue: calculatedRevenue,
            ltv: totalRevenueAllTime > 0 && prev.totalTenants > 0 ? Math.round(totalRevenueAllTime / prev.totalTenants) : 0,
            mrrGrowth,
            usageDensity
        }));
    }, [rawInvoices, rawBookings, tenantsMap, tenantPlanMap, planList, selectedMonth, commissionRate, isHistorical]);

    const shiftMonth = (delta: number) => () => {
        const [y, m] = selectedMonth.split('-').map(Number);
        const d = new Date(y, m - 1 + delta, 1);
        const now = new Date();
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
        <div className="w-full space-y-6 pb-10 text-left relative animate-fadeIn">
            {/* CABECERA */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="w-6 h-[2px] bg-emerald-500 rounded-md" />
                        <p className="text-[11px] font-black text-emerald-600 dark:text-[#00df82] tracking-[0.2em] uppercase">
                            {isHistorical ? 'Archivo histórico de operaciones' : 'Monitoreo global de reservas'}
                        </p>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none font-heading">
                        Ecosistema <span className="text-emerald-500 dark:text-[#00df82]">MVP</span>
                    </h1>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={() => setIsHistorical(!isHistorical)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                            isHistorical
                                ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                                : 'bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        <HugeiconsIcon icon={Archive01Icon} className="w-4 h-4" strokeWidth={1.8} />
                        {isHistorical ? 'Histórico' : 'Ver histórico'}
                    </button>

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
                                {isHistorical ? 'Histórico completo' : monthLabel}
                            </span>
                        </div>
                        <button
                            onClick={shiftMonth(1)}
                            disabled={isCurrentMonthSelected || isHistorical}
                            aria-label="Mes siguiente"
                            className="p-2.5 text-slate-400 hover:text-emerald-600 dark:hover:text-[#00df82] hover:bg-slate-50 dark:hover:bg-white/5 transition-colors disabled:opacity-30 disabled:hover:text-slate-400 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                        >
                            <HugeiconsIcon icon={ArrowRight01Icon} className="w-4 h-4" strokeWidth={2.2} />
                        </button>
                    </div>

                    <button
                        onClick={() => setRefreshKey(k => k + 1)}
                        aria-label="Refrescar datos"
                        className="p-2.5 bg-slate-900 dark:bg-[#00df82] text-white dark:text-slate-950 rounded-md shadow-lg active:scale-90 transition-all cursor-pointer"
                    >
                        <HugeiconsIcon icon={RefreshIcon} className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} strokeWidth={2} />
                    </button>
                </div>
            </div>

            {/* KPIs */}
            <AdminKpiSection kpis={kpis} formatCLP={formatCLP} />

            {/* CHART */}
            <RevenueChart data={chartData} isHistorical={isHistorical} revenue={kpis.revenue} formatCLP={formatCLP} />

            {/* TOP FACTURACIÓN + OCUPACIÓN */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <SectionCard
                    title="Top facturación"
                    subtitle="Recintos con mayor volumen"
                    icon={<HugeiconsIcon icon={TrophyIcon} className="w-5 h-5" strokeWidth={1.8} />}
                    action={<HugeiconsIcon icon={ArrowUpRight01Icon} className="w-4 h-4 text-slate-300" strokeWidth={1.8} />}
                    className="h-[320px]"
                    bodyClassName="p-5 overflow-y-auto no-scrollbar"
                >
                    {topTenants.length > 0 ? (
                        <div className="space-y-4">
                            {topTenants.map((t, i) => (
                                <div key={i} className="group">
                                    <div className="flex justify-between items-end mb-1.5 gap-3">
                                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase truncate">{i + 1}. {t.name}</span>
                                        <span className="text-[11px] font-black text-slate-900 dark:text-white font-mono shrink-0">{formatCLP(t.value)}</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-100 dark:bg-white/5 rounded-md overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-emerald-500 to-[#00df82] rounded-md transition-all duration-1000"
                                            style={{ width: `${(t.value / (topTenants[0]?.value || 1)) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <EmptyState icon={TrophyIcon} label="Sin facturación en el periodo" />
                    )}
                </SectionCard>

                <SectionCard
                    title="Ocupación del mes"
                    subtitle="Reservas por recinto"
                    icon={<HugeiconsIcon icon={BarChartIcon} className="w-5 h-5" strokeWidth={1.8} />}
                    className="h-[320px]"
                    bodyClassName="p-5 overflow-y-auto no-scrollbar"
                >
                    {topOccupancy.length > 0 ? (
                        <div className="space-y-2.5">
                            {topOccupancy.map((t, i) => (
                                <div key={i} className="flex items-center justify-between p-3.5 rounded-md bg-slate-50 dark:bg-white/5 border border-transparent hover:border-emerald-500/30 transition-all">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-8 h-8 rounded-md bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 flex items-center justify-center text-[11px] font-black text-emerald-600 dark:text-[#00df82] shrink-0">
                                            {i + 1}
                                        </div>
                                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase truncate">{t.name}</span>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <span className="text-base font-black text-slate-900 dark:text-white leading-none font-mono">{t.value}</span>
                                        <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Reservas</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <EmptyState icon={BarChartIcon} label="Sin datos de ocupación" />
                    )}
                </SectionCard>
            </div>

            {/* PLANES + RECINTOS RECIENTES */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <SectionCard
                    title="Distribución de planes"
                    subtitle="Recintos por plan contratado"
                    icon={<HugeiconsIcon icon={PieChartIcon} className="w-5 h-5" strokeWidth={1.8} />}
                    className="h-[300px]"
                >
                    <div className="flex items-center gap-6 h-full">
                        <div className="w-1/2 h-full relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={plansData} innerRadius={44} outerRadius={64} paddingAngle={8} dataKey="value" stroke="none">
                                        {plansData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color || '#cbd5e1'} />)}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: '5px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.15)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-2xl font-black text-slate-900 dark:text-white leading-none font-mono">{kpis.totalTenants}</span>
                                <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mt-1">Total</span>
                            </div>
                        </div>
                        <div className="w-1/2 space-y-3.5">
                            {plansData.map((plan, i) => (
                                <div key={i} className="flex flex-col gap-1.5">
                                    <div className="flex items-center justify-between text-[11px] font-bold uppercase">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: plan.color || '#cbd5e1' }} />
                                            <span className="text-slate-500 dark:text-slate-400">{plan.name}</span>
                                        </div>
                                        <span className="text-slate-900 dark:text-white font-mono">{plan.value}</span>
                                    </div>
                                    <div className="h-1 w-full bg-slate-100 dark:bg-white/5 rounded-md overflow-hidden">
                                        <div className="h-full bg-slate-300 dark:bg-slate-600 rounded-md" style={{ width: `${kpis.totalTenants > 0 ? (plan.value / kpis.totalTenants) * 100 : 0}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </SectionCard>

                <SectionCard
                    title="Recintos recientes"
                    subtitle="Últimos en sumarse"
                    icon={<HugeiconsIcon icon={UserAdd01Icon} className="w-5 h-5" strokeWidth={1.8} />}
                    action={<span className="text-[9px] bg-emerald-500 text-white px-2.5 py-1 rounded-md font-black uppercase tracking-wider">Nuevos</span>}
                    className="h-[300px]"
                    bodyClassName="p-5 overflow-y-auto no-scrollbar"
                >
                    {newTenantsList.length > 0 ? (
                        <div className="space-y-2.5">
                            {newTenantsList.map((t) => (
                                <div key={t.id} className="flex justify-between items-center p-3.5 rounded-md bg-slate-50 dark:bg-white/5 border border-transparent hover:border-emerald-500/30 transition-all">
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-[11px] font-bold text-slate-900 dark:text-white uppercase truncate">{t.name}</span>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[9px] text-emerald-600 dark:text-[#00df82] font-black uppercase tracking-wider">{t.plan}</span>
                                            <div className={`w-1.5 h-1.5 rounded-full ${t.status === 'Activo' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">{t.date}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <EmptyState icon={Store01Icon} label="Sin recintos registrados" />
                    )}
                </SectionCard>
            </div>

            {/* DETALLE DE RESERVAS GLOBALES */}
            <SectionCard
                title="Detalle de reservas globales"
                subtitle="Actividad en tiempo real de todos los recintos"
                icon={<HugeiconsIcon icon={Calendar03Icon} className="w-5 h-5" strokeWidth={1.8} />}
                bodyClassName="p-0"
                action={
                    <div className="flex items-center gap-5">
                        <div className="text-right">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total generado mes</p>
                            <p className="text-base font-black text-emerald-600 dark:text-[#00df82] font-mono leading-none mt-0.5">{formatCLP(kpis.revenue)}</p>
                        </div>
                        <div className="w-px h-8 bg-slate-100 dark:bg-white/5" />
                        <div className="text-right">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Reservas activas</p>
                            <p className="text-base font-black text-slate-900 dark:text-white font-mono leading-none mt-0.5">{recentBookings.length}</p>
                        </div>
                    </div>
                }
            >
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[900px]">
                        <thead>
                            <tr className="bg-slate-50/60 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/5">
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-slate-400">Fecha / hora</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-slate-400">Cliente</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-slate-400">Recinto</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-slate-400 text-center">Método</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-slate-400 text-center">Monto</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-slate-400 text-right">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {recentBookings.length > 0 ? recentBookings.map((b: any) => {
                                const method = getMethodBadge(b);
                                const status = getStatusBadge(b);
                                return (
                                    <tr key={b.id} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-[11px] font-black text-slate-700 dark:text-white font-mono uppercase">{getRelativeTime(b.createdAt || b.date)}</span>
                                                <span className="text-[10px] font-medium text-slate-400 mt-0.5">
                                                    {b.date?.toDate ? b.date.toDate().toLocaleDateString('es-CL') : 'Reciente'} · {b.startTime || '--:--'} hrs
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-md bg-emerald-500/10 flex items-center justify-center text-[11px] font-black text-emerald-600 dark:text-[#00df82] border border-emerald-500/20 uppercase shrink-0">
                                                    {b.clientName?.charAt(0) || 'U'}
                                                </div>
                                                <span className="text-[11px] font-bold text-slate-900 dark:text-white uppercase truncate max-w-[150px]">{b.clientName || 'Usuario MVP'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(0,223,130,0.5)] shrink-0" />
                                                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase truncate max-w-[180px]">{tenantsMap[b.tenantId] || b.tenantName || 'Recinto externo'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider ${method.style}`}>
                                                {method.label}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                <span className="text-[11px] font-black text-emerald-600 dark:text-[#00df82] font-mono">{formatCLP(b.totalPrice || b.price || 0)}</span>
                                                {b.deposit && b.paymentStatus === 'partial' && (
                                                    <span className="text-[9px] font-bold text-amber-500 uppercase">Seña: {formatCLP(b.deposit)}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-[10px] font-black uppercase tracking-wider ${status.style}`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                                                {status.label}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={6} className="py-16 text-center">
                                        <HugeiconsIcon icon={Calendar03Icon} className="w-10 h-10 text-slate-200 dark:text-white/10 mx-auto mb-3" strokeWidth={1.6} />
                                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Sin reservas registradas en el periodo</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </SectionCard>
        </div>
    );
}

function EmptyState({ icon, label }: { icon: any; label: string }) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center gap-3">
            <HugeiconsIcon icon={icon} className="w-9 h-9 text-slate-200 dark:text-white/10" strokeWidth={1.6} />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{label}</p>
        </div>
    );
}
