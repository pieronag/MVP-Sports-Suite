"use client";
import { HugeiconsIcon } from "@hugeicons/react";
import React, { useState, useEffect } from 'react';
import {
    Add01Icon,
    Alert02Icon,
    ArrowUpRight01Icon,
    BoltIcon,
    Building01Icon,
    Calendar03Icon,
    Cancel01Icon,
    ChartDecreaseIcon,
    ChartIncreaseIcon,
    CheckmarkCircle02Icon,
    Clock01Icon,
    FilterIcon,
    InformationCircleIcon,
    MapPinIcon,
    MoneyBag01Icon,
    PieChartIcon,
    RefreshIcon,
    SparklesIcon,
    UserGroupIcon,
    Wrench01Icon,
} from '@hugeicons/core-free-icons';
import { collection, query, where, orderBy, Timestamp, onSnapshot, or } from 'firebase/firestore';
import { db } from '@/services/client/firebase';
import { useAuth } from '@/context/AuthContext';
import { PanelGlass, TarjetaKpi, SectionCard } from '@/components/ui/DashboardWidgets';
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';

// --- UTILIDADES ---
const formatCLP = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0
    }).format(amount);
};

const VOLT = '#00df82';
const VOLT_DARK = '#00c16f';

// --- INTERFACES ---
interface Booking {
    id: string;
    totalPrice: number;
    date: Timestamp;
    status: string;
    paymentStatus: string;
    tenantId: string;
    tenantName?: string;
    clientName: string;
    courtName: string;
    startTime: string;
    checkIn?: boolean;
}

interface Venue {
    id: string;
    name: string;
    address: string;
    status: string;
    pricing?: {
        [sport: string]: { [hour: string]: number }
    };
}

export default function OwnerDashboard() {
    const { user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [kpis, setKpis] = useState({
        revenueMonth: 0,
        revenueToday: 0,
        bookingsMonth: 0,
        activeVenues: 0,
        pendingPayments: 0,
        maintenanceCount: 0
    });
    const [revenueHistory, setRevenueHistory] = useState<any[]>([]);
    const [venuesDistribution, setVenuesDistribution] = useState<any[]>([]);
    const [myVenues, setMyVenues] = useState<Venue[]>([]);
    const [recentBookings, setRecentBookings] = useState<Booking[]>([]);

    const [selectedVenueId, setSelectedVenueId] = useState<string>('all');
    const [timeRange, setTimeRange] = useState<'today' | '7d' | '30d' | 'month'>('month');
    const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'pending' | 'partial' | 'noshow'>('all');
    const [maintenanceAlerts, setMaintenanceAlerts] = useState<any[]>([]);
    const [toast, setToast] = useState<{ msg: string, type: 'success' | 'error' | 'info' } | null>(null);

    const showToast = (msg: string, type: 'success' | 'error' | 'info') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    // --- CARGA DE DATOS (REAL-TIME) ---
    useEffect(() => {
        if (!user?.uid) return;

        setLoading(true);
        const qTenants = query(collection(db, "tenants"), or(where("ownerId", "==", user.uid), where("ownerIds", "array-contains", user.uid)));
        const unsubscribeTenants = onSnapshot(qTenants, (snap) => {
            const venuesList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Venue));
            setMyVenues(venuesList);
            setKpis(prev => ({ ...prev, activeVenues: venuesList.filter(v => v.status === 'Activo').length }));

            if (venuesList.length === 0) {
                setLoading(false);
                return;
            }

            const now = new Date();
            let startDate: Date;
            let endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

            if (timeRange === 'today') {
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
                endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
            } else if (timeRange === '7d') {
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                endDate = now;
            } else if (timeRange === '30d') {
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                endDate = now;
            } else {
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
            }

            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
            const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
            const venueIds = selectedVenueId === 'all' ? venuesList.map(v => v.id) : [selectedVenueId];

            const limitedVenueIds = venueIds.slice(0, 30);
            if (venueIds.length > 30) {
                console.warn(`OwnerDashboard: más de 30 recintos. Mostrando datos de los primeros 30.`);
            }
            const qBookings = query(
                collection(db, "bookings"),
                where("tenantId", "in", limitedVenueIds),
                where("date", ">=", Timestamp.fromDate(startDate)),
                where("date", "<=", Timestamp.fromDate(endDate))
            );

            const unsubscribeBookings = onSnapshot(qBookings, (bSnap) => {
                const bookings: Booking[] = bSnap.docs.map(d => {
                    const data = d.data();
                    const dateTs = data.date || data.startTime || Timestamp.now();
                    return {
                        id: d.id,
                        ...data,
                        date: dateTs,
                        totalPrice: Number(data.totalPrice || data.price || 0),
                    } as Booking;
                });

                let totalRevenue = 0;
                let todayRev = 0;
                let pendingRev = 0;
                const historyMap: { [key: string]: number } = {};
                const venueRevMap: { [key: string]: number } = {};

                bookings.forEach(b => {
                    if (b.status !== 'cancelled') {
                        const amt = b.totalPrice;
                        const bDate = b.date.toDate();
                        totalRevenue += amt;
                        if (b.paymentStatus !== 'paid') pendingRev += amt;
                        if (bDate >= startOfToday && bDate <= endOfToday) todayRev += amt;
                        const dayKey = bDate.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' });
                        historyMap[dayKey] = (historyMap[dayKey] || 0) + amt;
                        const vName = venuesList.find(v => v.id === b.tenantId)?.name || 'VARIOS';
                        venueRevMap[vName] = (venueRevMap[vName] || 0) + amt;
                    }
                });

                const chartData = Object.keys(historyMap).map(k => ({ name: k, valor: historyMap[k] }));
                chartData.sort((a, b) => {
                    const [dA, mA] = a.name.split('/').map(Number);
                    const [dB, mB] = b.name.split('/').map(Number);
                    return mA !== mB ? mA - mB : dA - dB;
                });

                setKpis(prev => ({
                    ...prev,
                    revenueMonth: totalRevenue,
                    revenueToday: todayRev,
                    bookingsMonth: bookings.length,
                    pendingPayments: pendingRev,
                }));
                setRevenueHistory(chartData);
                setVenuesDistribution(Object.keys(venueRevMap).map(k => ({ name: k, value: venueRevMap[k] })));
                setRecentBookings(bookings.sort((a, b) => b.date.seconds - a.date.seconds).slice(0, 8));
                setLoading(false);
            }, (error) => {
                console.error("Error bookings snapshot:", error);
                setLoading(false);
            });

            const qM = query(collection(db, "maintenance"), where("tenantId", "in", venueIds.slice(0, 30)), where("endDate", ">=", Timestamp.now()));
            const unsubscribeM = onSnapshot(qM, (mSnap) => {
                const allMaintenance = mSnap.docs.map(d => ({
                    id: d.id,
                    ...d.data(),
                    venueName: venuesList.find(v => v.id === d.data().tenantId)?.name || 'RECINTO'
                }));
                setMaintenanceAlerts(allMaintenance);
                setKpis(prev => ({ ...prev, maintenanceCount: allMaintenance.length }));
            });

            return () => { unsubscribeBookings(); unsubscribeM(); };
        }, (error) => {
            console.error("Error tenants snapshot:", error);
            setLoading(false);
        });

        return () => unsubscribeTenants();
    }, [user, selectedVenueId, timeRange]);

    const paymentBadge = (b: Booking) => {
        const isNoShow = b.status === 'no-show' ||
            b.paymentStatus === 'no-show' ||
            ((b as any).notes && ((b as any).notes.toLowerCase().includes('no-show') || (b as any).notes.toLowerCase().includes('inasistencia')));
        const ps = isNoShow ? 'no-show' : (b.paymentStatus || 'pending').toLowerCase();
        if (ps === 'paid') return { style: 'bg-emerald-500 text-white', label: 'Pagado' };
        if (ps === 'partial') return { style: 'bg-sky-500 text-white', label: 'Parcial' };
        if (ps === 'no-show') return { style: 'bg-red-500 text-white', label: 'No-show' };
        return { style: 'bg-amber-500 text-white', label: 'Pendiente' };
    };

    const matchesPaymentFilter = (b: Booking): boolean => {
        if (paymentFilter === 'all') return true;
        const isNoShow = b.status === 'no-show' ||
            b.paymentStatus === 'no-show' ||
            ((b as any).notes && ((b as any).notes.toLowerCase().includes('no-show') || (b as any).notes.toLowerCase().includes('inasistencia')));
        const ps = isNoShow ? 'no-show' : (b.paymentStatus || 'pending').toLowerCase();
        if (paymentFilter === 'noshow') return ps === 'no-show';
        return ps === paymentFilter;
    };
    const visibleBookings = recentBookings.filter(matchesPaymentFilter);

    return (
        <div className="w-full space-y-6 pb-12 text-left relative animate-fadeIn">
            {toast && (
                <div className={`fixed top-6 right-6 z-100 p-4 rounded-md shadow-2xl backdrop-blur-xl border animate-slideIn ${toast.type === 'success' ? 'bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black' : toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-slate-900 text-white'}`}>
                    <div className="flex items-center gap-3">
                        <HugeiconsIcon icon={toast.type === 'success' ? CheckmarkCircle02Icon : InformationCircleIcon} className="w-5 h-5" strokeWidth={2} />
                        <p className="text-[10px] font-black uppercase tracking-widest">{toast.msg}</p>
                    </div>
                </div>
            )}

            {/* CABECERA */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="w-6 h-[2px] bg-emerald-500 rounded-md" />
                        <p className="text-[11px] font-black text-emerald-600 dark:text-[#00df82] tracking-[0.2em] uppercase">Panel de rendimiento estratégico</p>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none font-heading">
                        Mi <span className="text-emerald-500 dark:text-[#00df82]">Negocio</span>
                    </h1>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <div className="flex items-center bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md overflow-hidden">
                        <span className="flex items-center gap-1.5 pl-3 pr-2">
                            <HugeiconsIcon icon={FilterIcon} className="w-3.5 h-3.5 text-emerald-600 dark:text-[#00df82]" strokeWidth={1.8} />
                        </span>
                        <select
                            value={selectedVenueId}
                            onChange={(e) => setSelectedVenueId(e.target.value)}
                            className="bg-transparent text-[10px] font-black uppercase text-slate-700 dark:text-white outline-hidden cursor-pointer appearance-none pr-3 py-2"
                        >
                            <option value="all">Todos los recintos</option>
                            {myVenues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                        </select>
                    </div>
                    <div className="flex bg-white dark:bg-white/5 p-1 rounded-md border border-slate-200 dark:border-white/10">
                        {(['today', '7d', '30d', 'month'] as const).map((t) => (
                            <button
                                key={t}
                                onClick={() => setTimeRange(t)}
                                className={`px-3 py-1.5 text-[9px] font-black uppercase rounded-md transition-all ${timeRange === t ? 'bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:text-slate-700 dark:hover:text-white'}`}
                            >
                                {t === 'today' ? 'Hoy' : t === '7d' ? '7 días' : t === '30d' ? '30 días' : 'Mes'}
                            </button>
                        ))}
                    </div>
                    <div className="flex bg-white dark:bg-white/5 p-1 rounded-md border border-slate-200 dark:border-white/10">
                        {([
                            { id: 'all' as const, label: 'Todas' },
                            { id: 'paid' as const, label: 'Pagadas' },
                            { id: 'pending' as const, label: 'Pendientes' },
                            { id: 'partial' as const, label: 'Parciales' },
                            { id: 'noshow' as const, label: 'No-show' },
                        ]).map(f => (
                            <button
                                key={f.id}
                                onClick={() => setPaymentFilter(f.id)}
                                className={`px-3 py-1.5 text-[9px] font-black uppercase rounded-md transition-all ${paymentFilter === f.id ? 'bg-slate-900 dark:bg-[#00df82] text-white dark:text-black' : 'text-slate-400 hover:text-slate-700 dark:hover:text-white'}`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* KPI GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <TarjetaKpi titulo={`Ingresos (${timeRange === 'today' ? 'hoy' : timeRange === '7d' ? '7d' : 'mes'})`} valor={formatCLP(kpis.revenueMonth)} sub={`${kpis.bookingsMonth} reservas`} icono={<HugeiconsIcon icon={BoltIcon} className="w-6 h-6" strokeWidth={1.6} />} brillo />
                <TarjetaKpi titulo="Cierres hoy" valor={formatCLP(kpis.revenueToday)} sub="Venta directa" icono={<HugeiconsIcon icon={MoneyBag01Icon} className="w-6 h-6" strokeWidth={1.6} />} />
                <TarjetaKpi titulo="Mantenimiento" valor={kpis.maintenanceCount} sub="Recintos en mantención" icono={<HugeiconsIcon icon={Wrench01Icon} className="w-6 h-6" strokeWidth={1.6} />} />
            </div>

            {myVenues.length === 0 ? (
                <div className="rounded-md bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 p-16 text-center">
                    <HugeiconsIcon icon={Building01Icon} className="w-12 h-12 text-slate-200 dark:text-white/10 mx-auto mb-4" strokeWidth={1.6} />
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Aún no tienes recintos registrados</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-8 space-y-6">
                        {/* GRAFICO VENTAS */}
                        <SectionCard
                            title="Historial de ventas"
                            subtitle="Ingresos acumulados del periodo"
                            icon={<HugeiconsIcon icon={ChartIncreaseIcon} className="w-5 h-5" strokeWidth={1.8} />}
                            className="h-[320px]"
                            bodyClassName="p-5"
                            action={
                                <div className="text-right">
                                    <h2 className="text-xl font-black text-emerald-600 dark:text-[#00df82] font-mono tracking-tighter leading-none">{formatCLP(kpis.revenueMonth)}</h2>
                                    <p className="text-[8px] text-slate-400 uppercase font-black tracking-widest mt-1">Total periodo</p>
                                </div>
                            }
                        >
                            <div className="w-full h-full min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={revenueHistory}>
                                        <defs>
                                            <linearGradient id="verdeNeonOwner" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={VOLT} stopOpacity={0.25} />
                                                <stop offset="95%" stopColor={VOLT} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#64748b" opacity={0.1} vertical={false} />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b', fontWeight: '900' }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b', fontWeight: '900' }} tickFormatter={(v) => v >= 1000000 ? `$${(v / 1000000).toFixed(1)}M` : `$${(v / 1000).toFixed(0)}k`} />
                                        <Tooltip
                                            formatter={(value: any) => [formatCLP(Number(value) || 0), 'Ingresos']}
                                            contentStyle={{ backgroundColor: '#020617', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '5px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', color: '#fff' }}
                                            itemStyle={{ color: VOLT }}
                                            labelStyle={{ color: '#94a3b8' }}
                                        />
                                        <Area type="monotone" dataKey="valor" stroke={VOLT} strokeWidth={2.5} fill="url(#verdeNeonOwner)" animationDuration={1500} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </SectionCard>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* ESTADO DE RECINTOS */}
                            <SectionCard
                                title="Estado operativo"
                                subtitle="Tus recintos"
                                icon={<HugeiconsIcon icon={Building01Icon} className="w-5 h-5" strokeWidth={1.8} />}
                                className="h-[280px]"
                                bodyClassName="p-5 overflow-y-auto no-scrollbar"
                            >
                                <div className="space-y-3">
                                    {myVenues.map((venue, i) => (
                                        <div key={i} className="flex flex-col gap-2 p-4 rounded-md bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 transition-all hover:border-emerald-400/40">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase truncate leading-none">{venue.name}</span>
                                                <span className={`px-2.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${venue.status === 'Activo' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>{venue.status}</span>
                                            </div>
                                            <p className="text-[8px] text-slate-400 font-black uppercase truncate flex items-center gap-2">
                                                <HugeiconsIcon icon={MapPinIcon} className="w-3.5 h-3.5 text-slate-300" strokeWidth={1.8} /> {venue.address}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </SectionCard>

                            {/* PARTICIPACION */}
                            <SectionCard
                                title="Participación"
                                subtitle="Ingresos por recinto"
                                icon={<HugeiconsIcon icon={PieChartIcon} className="w-5 h-5" strokeWidth={1.8} />}
                                className="h-[280px]"
                                bodyClassName="p-5"
                            >
                                {venuesDistribution.length > 0 ? (
                                    <div className="flex-1 flex items-center gap-4 h-full">
                                        <div className="w-1/2 h-full relative">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie data={venuesDistribution} innerRadius={35} outerRadius={50} paddingAngle={6} dataKey="value" stroke="none">
                                                        {venuesDistribution.map((_, index) => (
                                                            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? VOLT : '#06b6d4'} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip contentStyle={{ backgroundColor: '#020617', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '5px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', color: '#fff' }} formatter={(value: any) => formatCLP(Number(value) || 0)} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="w-1/2 space-y-3 overflow-y-auto no-scrollbar pr-1">
                                            {venuesDistribution.map((v, i) => (
                                                <div key={i} className="flex flex-col gap-0.5">
                                                    <span className="text-[8px] font-black text-slate-400 uppercase truncate leading-none tracking-widest">{v.name}</span>
                                                    <span className="text-xs font-black text-slate-900 dark:text-white font-mono">{formatCLP(v.value)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-center">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Sin ingresos en el periodo</p>
                                    </div>
                                )}
                            </SectionCard>
                        </div>
                    </div>

                    {/* SIDEBAR */}
                    <div className="lg:col-span-4 space-y-6">
                        <SectionCard
                            title="Últimas reservas"
                            subtitle={`${visibleBookings.length} reserva(s)${paymentFilter !== 'all' ? ' · filtro de pago' : ''}`}
                            icon={<HugeiconsIcon icon={Clock01Icon} className="w-5 h-5" strokeWidth={1.8} />}
                            className="min-h-[400px]"
                            bodyClassName="p-5"
                        >
                            <div className="space-y-3">
                                {visibleBookings.length > 0 ? visibleBookings.map((b) => {
                                    const badge = paymentBadge(b);
                                    return (
                                        <div key={b.id} className="p-4 rounded-md bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 transition-all hover:border-emerald-400/40 shadow-xs">
                                            <div className="flex justify-between items-start gap-3">
                                                <div className="min-w-0">
                                                    <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase truncate mb-1 leading-none">{b.clientName}</p>
                                                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                                        <span className="text-[8px] text-slate-400 font-black uppercase tracking-tighter">{b.courtName}</span>
                                                        <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                                                        <span className="text-[8px] text-emerald-600 dark:text-[#00df82] font-black">{b.startTime}</span>
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className="text-[10px] font-black text-slate-900 dark:text-white leading-none mb-1.5 font-mono">{formatCLP(b.totalPrice)}</p>
                                                    <span className={`text-[7px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-md ${badge.style}`}>{badge.label}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }) : (
                                    <div className="py-12 text-center">
                                        <HugeiconsIcon icon={Clock01Icon} className="w-9 h-9 text-slate-200 dark:text-white/10 mx-auto mb-3" strokeWidth={1.6} />
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Sin reservas en el periodo</p>
                                    </div>
                                )}
                            </div>
                        </SectionCard>

                        {maintenanceAlerts.length > 0 && (
                            <div className="p-5 rounded-md bg-amber-500/10 border border-amber-500/20">
                                <h3 className="text-[9px] font-black uppercase text-amber-600 dark:text-amber-400 flex items-center gap-2 mb-4 tracking-widest">
                                    <HugeiconsIcon icon={Alert02Icon} className="w-5 h-5" strokeWidth={1.8} /> Mantenimiento
                                </h3>
                                <div className="space-y-3">
                                    {maintenanceAlerts.map(m => (
                                        <div key={m.id} className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                                            <span className="text-slate-700 dark:text-slate-300 truncate max-w-[120px]">{m.courtName}</span>
                                            <span className="text-amber-600 dark:text-amber-400 font-mono">Fin: {m.endDate.toDate().toLocaleDateString('es-CL')}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}