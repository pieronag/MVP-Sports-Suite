"use client";
import React, { useState, useEffect } from 'react';
import {
    ChartPieIcon,
    CalendarDaysIcon,
    ArrowPathIcon,
    TrophyIcon,
    ArchiveBoxIcon,
    ArrowUpRightIcon,
    ChartBarIcon,
    ReceiptPercentIcon,
    RocketLaunchIcon,
    UserPlusIcon,
    SparklesIcon,
    BoltIcon,
    ShieldCheckIcon
} from '@heroicons/react/24/outline';
import AdminKpiSection from './AdminKpiSection';
import RevenueChart from './RevenueChart';
import {
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer
} from 'recharts';
import { collection, query, orderBy, limit, where, onSnapshot, Timestamp, doc } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { PanelGlass, TarjetaKpi, SystemStatusRow, BotonAccion } from '@/components/ui/DashboardWidgets';

// --- COLORES POR PLAN ---
const COLORS_MAP: Record<string, string> = {
    'Free': '#64748b',
    'Básico': '#6366f1',
    'Pro': '#8b5cf6',
    'Elite': '#10b981'
};

const formatCLP = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0
    }).format(amount);
};

const getRelativeTime = (timestamp: any) => {
    if (!timestamp) return 'RECIENTE';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const diff = Math.max(0, Math.floor((new Date().getTime() - date.getTime()) / 60000)); // en minutos
    
    if (diff < 1) return 'AHORA';
    if (diff < 60) return `HACE ${diff} MIN`;
    if (diff < 1440) return `HACE ${Math.floor(diff / 60)} HORAS`;
    if (diff < 10080) return `HACE ${Math.floor(diff / 1440)} DÍAS`;
    return `HACE ${Math.floor(diff / 10080)} SEMANAS`;
};

export default function AdminDashboard() {
    const [kpis, setKpis] = useState({
        revenue: 0,
        tenants: 0,
        totalTenants: 0,
        users: 0,
        churn: 0,
        ltv: 0,
        mrrGrowth: 0,
        usageDensity: 0,
        conversionRate: 0
    });
    const [chartData, setChartData] = useState<any[]>([]);
    const [plansData, setPlansData] = useState<any[]>([]);
    const [topTenants, setTopTenants] = useState<any[]>([]);
    const [newTenantsList, setNewTenantsList] = useState<any[]>([]);
    const [topOccupancy, setTopOccupancy] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [tenantsMap, setTenantsMap] = useState<Record<string, string>>({});
    const [rawBookings, setRawBookings] = useState<any[]>([]);
    const [rawInvoices, setRawInvoices] = useState<any[]>([]);
    const [recentActivity, setRecentActivity] = useState<any[]>([]);
    const [recentBookings, setRecentBookings] = useState<any[]>([]);
    const [commissionRate, setCommissionRate] = useState(8);

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
            const paidTenants = tenants.filter((t: any) => t.plan !== 'Free' && t.status === 'Activo').length;
            const conversionRate = activeTenants > 0 ? (paidTenants / activeTenants) * 100 : 0;
            const totalTenantsCount = tenants.length;
            const inactiveRate = totalTenantsCount > 0 ? ((totalTenantsCount - activeTenants) / totalTenantsCount) * 100 : 0;

            const plansCount: any = { 'Free': 0, 'Básico': 0, 'Pro': 0, 'Elite': 0 };
            tenants.forEach((t) => {
                const rawPlan = (t.planId || t.plan || 'free').toString().toLowerCase();
                if (rawPlan.includes('free')) plansCount['Free']++;
                else if (rawPlan.includes('basic') || rawPlan.includes('basico')) plansCount['Básico']++;
                else if (rawPlan.includes('pro')) plansCount['Pro']++;
                else if (rawPlan.includes('elite')) plansCount['Elite']++;
                else plansCount['Free']++;
            });
            setPlansData(Object.keys(plansCount).map(key => ({ name: key, value: plansCount[key] })));

            setKpis(prev => ({
                ...prev,
                tenants: activeTenants,
                totalTenants: totalTenantsCount,
                churn: isNaN(inactiveRate) ? 0 : inactiveRate,
                conversionRate: isNaN(conversionRate) ? 0 : conversionRate
            }));

            const newMap: Record<string, string> = {};
            tenants.forEach(t => { newMap[t.id] = t.name; });
            setTenantsMap(newMap);

            setNewTenantsList(tenants
                .sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
                .slice(0, 5)
                .map((t: any) => {
                    const rawPlan = (t.planId || t.plan || 'Free').toString().toLowerCase();
                    let displayPlan = 'Free';
                    if (rawPlan.includes('basic') || rawPlan.includes('basico')) displayPlan = 'Básico';
                    else if (rawPlan.includes('pro')) displayPlan = 'Pro';
                    else if (rawPlan.includes('elite')) displayPlan = 'Elite';
                    return { id: t.id, name: t.name, plan: displayPlan, status: t.status, date: t.createdAt?.toDate().toLocaleDateString('es-CL') || 'Reciente' };
                }));
        }, (error: any) => {
            console.error("Error tenants snapshot:", error);
        });

        const unsubscribeInvoices = onSnapshot(query(collection(db, "invoices"), orderBy("issueDate", "desc")), (invoicesSnap: any) => {
            setRawInvoices(invoicesSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
        }, (error: any) => {
            console.error("Error invoices snapshot:", error);
        });

        const qBookings = query(collection(db, "bookings"), orderBy("date", "desc"), limit(100));
        const unsubscribeBookings = onSnapshot(qBookings, (bookingsSnap: any) => {
            setRawBookings(bookingsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
        }, (error: any) => {
            console.error("Error bookings snapshot:", error);
        });

        const unsubUsers = onSnapshot(collection(db, "users"), (s: any) => setKpis(prev => ({ ...prev, users: s.size })), (error: any) => {
            console.error("Error users snapshot:", error);
        });
        const qAudit = query(collection(db, "audit"), orderBy("timestamp", "desc"), limit(10));
        const unsubAudit = onSnapshot(qAudit, (auditSnap: any) => {
            setRecentActivity(auditSnap.docs.map((d: any) => {
                const data = d.data();
                const diff = Math.floor((new Date().getTime() - (data.timestamp?.toDate().getTime() || 0)) / 60000);
                return {
                    id: d.id,
                    tipo: data.status === 'Success' ? 'exito' : 'error',
                    msj: `${data.action}: ${data.module}`,
                    tiempo: diff < 60 ? `HACE ${diff}M` : diff < 1440 ? `HACE ${Math.floor(diff / 60)}H` : `HACE ${Math.floor(diff / 1440)}D`
                };
            }));
            setLoading(false);
        }, (error: any) => {
            console.error("Error audit snapshot:", error);
            setLoading(false);
        });

        const unsubSettings = onSnapshot(doc(db, "settings", "global"), (snap: any) => {
            if (snap.exists()) setCommissionRate(snap.data().commissionRate || 8);
        }, (error: any) => {
            console.error("Error settings snapshot:", error);
        });

        return () => {
            unsubscribeTenants(); unsubscribeInvoices(); unsubscribeBookings();
            unsubUsers(); unsubAudit(); unsubSettings();
        };
    }, [selectedMonth]);

    useEffect(() => {
        if (rawInvoices.length === 0 && rawBookings.length === 0) return;
        const [year, month] = selectedMonth.split('-').map(Number);
        const startOfMonth = new Date(year, month - 1, 1);
        const endOfMonth = new Date(year, month, 0, 23, 59, 59);
        const prevMonthDate = new Date(year, month - 2, 1);

        let calculatedRevenue = 0;
        let totalRevenueAllTime = 0;
        const tenantRevenueMap: any = {};
        const monthlyRevenueMap: any = {};

        const prevMonth = new Date(year, month - 2, 1);
        const prevMonthEnd = new Date(year, month - 1, 0, 23, 59, 59);

        // 1. Ingresos por Invoices (Histórico/Pagado)
        rawInvoices.forEach(inv => {
            const amt = Number(inv.amount || inv.total || 0);
            totalRevenueAllTime += amt;
            const date = inv.issueDate?.toDate ? inv.issueDate.toDate() : (inv.issueDate ? new Date(inv.issueDate) : new Date());
            const monthKey = date.toLocaleDateString('es-CL', { month: 'short', year: '2-digit' });
            const sortKey = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (!monthlyRevenueMap[sortKey]) monthlyRevenueMap[sortKey] = { name: monthKey, valor: 0, sort: sortKey, bookings: 0 };
            
            if (inv.status === 'Pagada' || inv.status === 'paid') {
                monthlyRevenueMap[sortKey].valor += amt;
                if (isHistorical) {
                    calculatedRevenue += amt;
                } else {
                    if ((date.getMonth() + 1) === month && date.getFullYear() === year) calculatedRevenue += amt;
                }
            }
        });

        // 2. Filtrado de Bookings (Tiempo Real)
        const filteredBookings = rawBookings.filter(b => {
            if (isHistorical) return (b.status === 'confirmed' || b.status === 'completed');
            const bDate = b.date?.toDate ? b.date.toDate() : new Date(b.date);
            return bDate >= startOfMonth && bDate <= endOfMonth && (b.status === 'confirmed' || b.status === 'completed');
        });

        const monthBookingsRevenue = filteredBookings.reduce((acc, b) => acc + (Number(b.totalPrice || b.price || 0) * (commissionRate / 100)), 0);
        
        // Si no hay facturas para el periodo y no es histórico, usamos proyección de bookings
        if (!isHistorical && calculatedRevenue === 0) {
            calculatedRevenue = Math.round(monthBookingsRevenue);
        }

        const prevMonthRevenue = rawInvoices
            .filter(inv => {
                const date = inv.issueDate?.toDate ? inv.issueDate.toDate() : (inv.issueDate ? new Date(inv.issueDate) : new Date());
                return date >= prevMonth && date <= prevMonthEnd && (inv.status === 'Pagada' || inv.status === 'paid');
            })
            .reduce((acc, inv) => acc + Number(inv.amount || inv.total || 0), 0);

        const mrrGrowth = prevMonthRevenue > 0 ? ((calculatedRevenue - prevMonthRevenue) / prevMonthRevenue) * 100 : 0;
        setChartData(Object.values(monthlyRevenueMap).sort((a: any, b: any) => a.sort - b.sort));
        
        // Top Tenants por Booking Revenue (Filtrado por periodo)
        const tRev: any = {};
        filteredBookings.forEach(b => {
            const tid = b.tenantId || 'desconocido';
            tRev[tid] = (tRev[tid] || 0) + (Number(b.totalPrice || b.price || 0));
        });
        setTopTenants(Object.keys(tRev).map(tid => {
            const name = tenantsMap[tid] || filteredBookings.find(b => b.tenantId === tid)?.tenantName || 'Recinto Externo';
            return { name, value: tRev[tid] };
        }).sort((a,b) => b.value - a.value).slice(0, 5));

        setRecentBookings(filteredBookings.slice(0, 8));
        const usageDensity = kpis.tenants > 0 ? filteredBookings.length / kpis.tenants : 0;
        const bookingsByTenant: any = {};
        filteredBookings.forEach(b => {
            const tid = b.tenantId || 'desconocido';
            bookingsByTenant[tid] = (bookingsByTenant[tid] || 0) + 1;
        });
        setTopOccupancy(Object.keys(bookingsByTenant).map(tid => {
            const name = tenantsMap[tid] || filteredBookings.find(b => b.tenantId === tid)?.tenantName || 'Recinto Externo';
            return { name, value: bookingsByTenant[tid] };
        }).sort((a, b) => b.value - a.value).slice(0, 5));
        
        setKpis(prev => ({
            ...prev,
            revenue: calculatedRevenue,
            ltv: totalRevenueAllTime > 0 && prev.totalTenants > 0 ? Math.round(totalRevenueAllTime / prev.totalTenants) : 0,
            mrrGrowth,
            usageDensity
        }));
    }, [rawInvoices, rawBookings, tenantsMap, selectedMonth, commissionRate, isHistorical]);

    return (
        <div className="w-full space-y-5 pb-10 text-left relative animate-fadeIn">
            {/* CABECERA ADN FINANCE STYLE */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-6 relative z-10">
                <div>
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="w-6 h-[2px] bg-emerald-500 rounded-full"></span>
                        <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 tracking-[0.2em] uppercase">
                            {isHistorical ? 'Archivo Histórico de Operaciones' : 'Monitoreo Global de Reservas'}
                        </p>
                    </div>
                    <h1 className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none">
                        Ecosistema <span className="text-emerald-500 dark:text-emerald-400">MVP</span>
                    </h1>
                </div>

                <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-[#0B0F19] p-1.5 rounded-xl border border-slate-200 dark:border-white/5 shadow-lg shadow-slate-200/20 dark:shadow-none">
                    <button
                        onClick={() => setIsHistorical(!isHistorical)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${isHistorical ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-slate-50 dark:bg-white/5 text-slate-400 hover:text-slate-600 dark:hover:text-white'}`}
                    >
                        <ArchiveBoxIcon className="w-3.5 h-3.5" />
                        {isHistorical ? 'Histórico' : 'Ver Histórico'}
                    </button>

                    <div className="flex items-center gap-2 px-3 border-l border-slate-100 dark:border-white/5">
                        <div className="relative group">
                            <CalendarDaysIcon className="absolute left-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-emerald-500 pointer-events-none" />
                            <input
                                type="month"
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="pl-5 bg-transparent text-[10px] font-black uppercase outline-none text-slate-700 dark:text-white cursor-pointer appearance-none"
                            />
                        </div>
                    </div>
                    
                    <button
                        onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 600); }}
                        className="p-2 bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-950 rounded-lg shadow-lg active:scale-90 transition-all"
                    >
                        <ArrowPathIcon className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* KPI GRID - COMPACT DNA */}
            <AdminKpiSection kpis={kpis} formatCLP={formatCLP} />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* GRAFICO Y SECCIONES IZQUIERDAS */}
                <div className="lg:col-span-12 space-y-5">
                    <RevenueChart data={chartData} isHistorical={isHistorical} revenue={kpis.revenue} formatCLP={formatCLP} />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <PanelGlass className="h-[300px] flex flex-col p-6 border-none shadow-xl shadow-slate-200/20">
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                                    <TrophyIcon className="w-4 h-4 text-amber-500" /> Top Facturación
                                </h3>
                                <ArrowUpRightIcon className="w-3.5 h-3.5 text-slate-300" />
                            </div>
                            <div className="flex-1 overflow-y-auto pr-2 space-y-4 no-scrollbar">
                                {topTenants.map((t, i) => (
                                    <div key={i} className="group">
                                        <div className="flex justify-between items-end mb-1.5">
                                            <span className="text-[9px] font-black text-slate-500 uppercase truncate max-w-[150px]">{i + 1}. {t.name}</span>
                                            <span className="text-[10px] font-black text-slate-900 dark:text-white">{formatCLP(t.value)}</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-slate-50 dark:bg-white/5 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-300 rounded-full transition-all duration-1000"
                                                style={{ width: `${(t.value / (topTenants[0]?.value || 1)) * 100}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </PanelGlass>

                        <PanelGlass className="h-[300px] flex flex-col p-6 border-none shadow-xl shadow-slate-200/20">
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                                    <ChartBarIcon className="w-4 h-4 text-emerald-500" /> Ocupación del Mes
                                </h3>
                                <RocketLaunchIcon className="w-3.5 h-3.5 text-slate-300" />
                            </div>
                            <div className="flex-1 overflow-y-auto pr-2 space-y-3 no-scrollbar">
                                {topOccupancy.length > 0 ? topOccupancy.map((t, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-transparent hover:border-emerald-500/20 transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 flex items-center justify-center text-[10px] font-black text-emerald-600 shadow-sm">
                                                {i + 1}
                                            </div>
                                            <span className="text-[9px] font-black text-slate-700 dark:text-slate-300 uppercase truncate max-w-[120px]">{t.name}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-sm font-black text-slate-900 dark:text-white leading-none">{t.value}</span>
                                            <p className="text-[7px] text-slate-400 uppercase font-black tracking-widest">Reservas</p>
                                        </div>
                                    </div>
                                )) : <p className="text-[9px] text-slate-400 text-center mt-20 font-black uppercase">Sin datos de ocupación</p>}
                            </div>
                        </PanelGlass>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <PanelGlass className="h-[280px] flex flex-col p-6 border-none shadow-xl shadow-slate-200/20">
                            <h3 className="text-[10px] font-black text-slate-900 dark:text-white uppercase mb-6 flex items-center gap-2">
                                <ReceiptPercentIcon className="w-4 h-4 text-emerald-500" /> Distribución de Planes
                            </h3>
                            <div className="flex-1 flex items-center gap-6">
                                <div className="w-1/2 h-full relative">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={plansData} innerRadius={40} outerRadius={60} paddingAngle={8} dataKey="value" stroke="none">
                                                {plansData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS_MAP[entry.name] || '#cbd5e1'} />)}
                                            </Pie>
                                            <Tooltip contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '9px', fontWeight: '900', textTransform: 'uppercase' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                        <span className="text-2xl font-black text-slate-900 dark:text-white leading-none">{kpis.totalTenants}</span>
                                        <span className="text-[7px] text-slate-400 uppercase font-black tracking-widest mt-0.5">Total</span>
                                    </div>
                                </div>
                                <div className="w-1/2 space-y-3">
                                    {plansData.map((plan, i) => (
                                        <div key={i} className="flex flex-col gap-1">
                                            <div className="flex items-center justify-between text-[8px] font-black uppercase">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: COLORS_MAP[plan.name] || '#cbd5e1' }}></div>
                                                    <span className="text-slate-500 dark:text-slate-400">{plan.name}</span>
                                                </div>
                                                <span className="text-slate-900 dark:text-white">{plan.value}</span>
                                            </div>
                                            <div className="h-1 w-full bg-slate-50 dark:bg-white/5 rounded-full overflow-hidden">
                                                <div className="h-full bg-slate-200 dark:bg-slate-700 rounded-full" style={{ width: `${kpis.totalTenants > 0 ? (plan.value / kpis.totalTenants) * 100 : 0}%` }}></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </PanelGlass>

                        <PanelGlass className="h-[280px] flex flex-col p-6 border-none shadow-xl shadow-slate-200/20">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-[10px] font-black text-slate-900 dark:text-white uppercase flex items-center gap-2">
                                    <UserPlusIcon className="w-4 h-4 text-emerald-500" /> Recintos Recientes
                                </h3>
                                <span className="text-[7px] bg-emerald-500 text-white px-3 py-1 rounded-full font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20">Nuevos</span>
                            </div>
                            <div className="flex-1 space-y-3 overflow-y-auto no-scrollbar">
                                {newTenantsList.map((t) => (
                                    <div key={t.id} className="flex justify-between items-center p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-transparent hover:border-emerald-500/20 transition-all group">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-slate-900 dark:text-white uppercase truncate max-w-[130px]">{t.name}</span>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[7px] text-emerald-500 font-black uppercase tracking-widest">{t.plan}</span>
                                                <div className={`w-1.5 h-1.5 rounded-full ${t.status === 'Activo' ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                                            </div>
                                        </div>
                                        <span className="text-[8px] font-black text-slate-400 uppercase">{t.date}</span>
                                    </div>
                                ))}
                            </div>
                        </PanelGlass>
                    </div>
                             {/* LISTADO DE RESERVAS GLOBALES (FULL WIDTH) */}
                <div className="lg:col-span-12 space-y-5">
                    <PanelGlass className="flex flex-col p-8 border-none shadow-xl shadow-slate-200/20 overflow-hidden">
                        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-6 border-b border-slate-50 dark:border-white/5 gap-4">
                            <div>
                                <h3 className="text-[10px] font-black text-slate-900 dark:text-white uppercase flex items-center gap-2 mb-1">
                                    <CalendarDaysIcon className="w-4 h-4 text-emerald-500" /> Detalle de Reservas Globales
                                </h3>
                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Actividad en tiempo real de todos los recintos</p>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="text-right">
                                    <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Generado Mes</p>
                                    <p className="text-lg font-black text-emerald-500">{formatCLP(kpis.revenue)}</p>
                                </div>
                                <div className="w-px h-8 bg-slate-100 dark:bg-white/5"></div>
                                <div className="text-right">
                                    <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1">Reservas Activas</p>
                                    <p className="text-lg font-black text-slate-900 dark:text-white">{recentBookings.length}</p>
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/5">
                                        <th className="px-6 py-4 text-[8px] font-black uppercase tracking-widest text-slate-400">FECHA / HORA</th>
                                        <th className="px-6 py-4 text-[8px] font-black uppercase tracking-widest text-slate-400">CLIENTE / ARRIENDA</th>
                                        <th className="px-6 py-4 text-[8px] font-black uppercase tracking-widest text-slate-400">RECINTO / PARTNER</th>
                                        <th className="px-6 py-4 text-[8px] font-black uppercase tracking-widest text-slate-400 text-center">MÉTODO</th>
                                        <th className="px-6 py-4 text-[8px] font-black uppercase tracking-widest text-slate-400 text-center">MONTO</th>
                                        <th className="px-6 py-4 text-[8px] font-black uppercase tracking-widest text-slate-400 text-right">ESTADO</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                    {recentBookings.length > 0 ? recentBookings.map((b: any) => (
                                        <tr key={b.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors group">
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black text-slate-700 dark:text-white font-mono uppercase">{getRelativeTime(b.createdAt || b.date)}</span>
                                                    <span className="text-[8px] font-bold text-slate-400 mt-0.5">{b.date?.toDate ? b.date.toDate().toLocaleDateString('es-CL') : 'RECIENTE'} · {b.startTime || '--:--'} HRS</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-[10px] font-black text-emerald-600 border border-emerald-500/20 uppercase">{b.clientName?.charAt(0) || 'U'}</div>
                                                    <span className="text-[9px] font-black text-slate-900 dark:text-white uppercase truncate max-w-[150px]">{b.clientName || 'Usuario MVP'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div>
                                                    <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase truncate max-w-[180px]">{tenantsMap[b.tenantId] || b.tenantName || 'Recinto Externo'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                {(() => {
                                                    const method = (b.paymentMethod || '').toLowerCase();
                                                    const source = (b.source || '').toLowerCase();
                                                    
                                                    const isNoShow = b.status === 'no-show' || 
                                                                     b.paymentStatus === 'no-show' || 
                                                                     (b.notes && (b.notes.toLowerCase().includes('no-show') || b.notes.toLowerCase().includes('inasistencia')));
                                                    
                                                    let label = 'Sin Info';
                                                    let style = 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400';
                                                    
                                                    if (isNoShow) {
                                                        label = 'No-Show';
                                                        style = 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400';
                                                    } else if (method === 'card' || method === 'webpay' || method === 'oneclick') {
                                                        label = method === 'oneclick' ? 'Oneclick' : 'Webpay';
                                                        style = 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400';
                                                    } else if (method === 'cash' || method === 'efectivo') {
                                                        label = 'Efectivo';
                                                        style = 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400';
                                                    } else if (method === 'transfer' || method === 'transferencia') {
                                                        label = 'Transferencia';
                                                        style = 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400';
                                                    } else if (source === 'mobile_app' && b.paymentStatus === 'paid') {
                                                        label = 'Online App';
                                                        style = 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400';
                                                    } else if (source === 'manual' || source === 'web_dashboard') {
                                                        label = 'Manual';
                                                        style = 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400';
                                                    }
                                                    
                                                    return (
                                                        <span className={`text-[8px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider ${style}`}>
                                                            {label}
                                                        </span>
                                                    );
                                                })()}
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 font-mono">{formatCLP(b.totalPrice || b.price || 0)}</span>
                                                    {b.deposit && b.paymentStatus === 'partial' && (
                                                        <span className="text-[7px] font-bold text-amber-500 uppercase">Seña: {formatCLP(b.deposit)}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                {(() => {
                                                    const isNoShow = b.status === 'no-show' || 
                                                                     b.paymentStatus === 'no-show' || 
                                                                     (b.notes && (b.notes.toLowerCase().includes('no-show') || b.notes.toLowerCase().includes('inasistencia')));
                                                    
                                                    const ps = isNoShow ? 'no-show' : (b.paymentStatus || 'pending').toLowerCase();
                                                    
                                                    let statusLabel = 'Pendiente';
                                                    let statusStyle = 'bg-amber-50 border-amber-100 text-amber-600 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-400';
                                                    let dotColor = 'bg-amber-500';

                                                    if (ps === 'paid') {
                                                        statusLabel = 'Pagado';
                                                        statusStyle = 'bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400';
                                                        dotColor = 'bg-emerald-500';
                                                    } else if (ps === 'partial') {
                                                        statusLabel = 'Parcial';
                                                        statusStyle = 'bg-sky-50 border-sky-100 text-sky-600 dark:bg-sky-500/10 dark:border-sky-500/20 dark:text-sky-400';
                                                        dotColor = 'bg-sky-500';
                                                    } else if (ps === 'refunded') {
                                                        statusLabel = 'Reembolsado';
                                                        statusStyle = 'bg-rose-50 border-rose-100 text-rose-600 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-400';
                                                        dotColor = 'bg-rose-500';
                                                    } else if (ps === 'no-show') {
                                                        statusLabel = 'No-Show';
                                                        statusStyle = 'bg-red-50 border-red-100 text-red-600 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400';
                                                        dotColor = 'bg-red-500';
                                                    }

                                                    return (
                                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[8px] font-black uppercase tracking-widest shadow-sm ${statusStyle}`}>
                                                            <div className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></div>
                                                            {statusLabel}
                                                        </span>
                                                    );
                                                })()}
                                            </td>
                                        </tr>

                                    )) : (
                                        <tr>
                                            <td colSpan={6} className="py-20 text-center">
                                                <CalendarDaysIcon className="w-12 h-12 text-slate-100 dark:text-white/5 mx-auto mb-4" />
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Sin reservas registradas hoy</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </PanelGlass>
                </div>
            </div>
        </div>
    </div>
    );
}
