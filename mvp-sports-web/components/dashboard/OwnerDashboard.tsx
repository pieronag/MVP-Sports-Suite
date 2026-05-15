"use client";
import React, { useState, useEffect } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Cell, PieChart, Pie
} from 'recharts';
import {
    ArrowTrendingUpIcon, CurrencyDollarIcon, UserGroupIcon, BuildingStorefrontIcon,
    ClockIcon, ChartPieIcon, CalendarDaysIcon, ArrowPathIcon, MapPinIcon,
    CheckCircleIcon, PlusIcon, XMarkIcon, BanknotesIcon, ExclamationTriangleIcon, InformationCircleIcon,
    WrenchScrewdriverIcon, ArrowTrendingDownIcon as ArrowDownIcon, FunnelIcon, BoltIcon,
    SparklesIcon, ArrowUpRightIcon
} from '@heroicons/react/24/outline';
import { collection, query, where, orderBy, Timestamp, onSnapshot } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useAuth } from '@/context/AuthContext';
import { PanelGlass, TarjetaKpi, BotonAccion } from '@/components/ui/DashboardWidgets';

// --- UTILIDADES ---
const formatCLP = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0
    }).format(amount);
};

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

    // ESTADOS DE DATOS
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

    // FILTROS
    const [selectedVenueId, setSelectedVenueId] = useState<string>('all');
    const [timeRange, setTimeRange] = useState<'today' | '7d' | '30d' | 'custom'>('30d');
    const [maintenanceAlerts, setMaintenanceAlerts] = useState<any[]>([]);

    // ESTADO NOTIFICACIONES (TOAST)
    const [toast, setToast] = useState<{ msg: string, type: 'success' | 'error' | 'info' } | null>(null);

    const showToast = (msg: string, type: 'success' | 'error' | 'info') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    // --- 1. CARGA DE DATOS PRINCIPAL (REAL-TIME) ---
    useEffect(() => {
        if (!user?.uid) return;

        setLoading(true);
        const qTenants = query(collection(db, "tenants"), where("ownerId", "==", user.uid));
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
                endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 23, 59, 59);
            } else {
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
            }

            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
            const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
            const venueIds = selectedVenueId === 'all' ? venuesList.map(v => v.id) : [selectedVenueId];
            
            const qBookings = query(
                collection(db, "bookings"),
                where("tenantId", "in", venueIds.slice(0, 30)),
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

    return (
        <div className="w-full space-y-5 pb-10 text-left relative animate-fadeIn">
            {toast && (
                <div className={`fixed top-6 right-6 z-[100] p-4 rounded-[1.5rem] shadow-2xl backdrop-blur-xl border border-white/10 animate-slideIn ${
                    toast.type === 'success' ? 'bg-emerald-500 text-white' : 
                    toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-slate-900 text-white'
                }`}>
                    <div className="flex items-center gap-3">
                        {toast.type === 'success' ? <CheckCircleIcon className="w-5 h-5" /> : <InformationCircleIcon className="w-5 h-5" />}
                        <p className="text-[10px] font-black uppercase tracking-widest">{toast.msg}</p>
                    </div>
                </div>
            )}

            {/* CABECERA ADN FINANCE STYLE */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-6 relative z-10">
                <div>
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="w-6 h-[2px] bg-emerald-500 rounded-full"></span>
                        <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 tracking-[0.2em] uppercase">
                            Panel de Rendimiento Estratégico
                        </p>
                    </div>
                    <h1 className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none">
                        Mi <span className="text-emerald-500 dark:text-emerald-400">Negocio</span>
                    </h1>
                </div>

                <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-[#0B0F19] p-1.5 rounded-xl border border-slate-200 dark:border-white/5 shadow-lg shadow-slate-200/20 dark:shadow-none">
                    <div className="relative group px-3">
                        <FunnelIcon className="absolute left-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-emerald-500" />
                        <select
                            value={selectedVenueId}
                            onChange={(e) => setSelectedVenueId(e.target.value)}
                            className="pl-5 bg-transparent text-[10px] font-black uppercase text-slate-700 dark:text-white outline-none cursor-pointer appearance-none"
                        >
                            <option value="all">TODOS LOS RECINTOS</option>
                            {myVenues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                        </select>
                    </div>

                    <div className="flex items-center gap-1.5 px-3 border-l border-slate-100 dark:border-white/5">
                        {(['today', '7d', '30d'] as const).map((t) => (
                            <button
                                key={t}
                                onClick={() => setTimeRange(t)}
                                className={`px-3 py-1.5 text-[8px] font-black uppercase rounded-lg transition-all ${timeRange === t ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'}`}
                            >
                                {t === 'today' ? 'Hoy' : t}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* KPI GRID - COMPACT DNA */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <TarjetaKpi label={`Ingresos (${timeRange.toUpperCase()})`} value={formatCLP(kpis.revenueMonth)} sub={`${kpis.bookingsMonth} reservas`} icon={<BoltIcon />} brillo />
                <TarjetaKpi label="Cierres Hoy" value={formatCLP(kpis.revenueToday)} sub="Venta directa" icon={<BanknotesIcon />} />
                <TarjetaKpi label="Por Cobrar" value={formatCLP(kpis.pendingPayments)} sub="Saldos" icon={<ExclamationTriangleIcon />} />
                <TarjetaKpi label="Mantenimiento" value={kpis.maintenanceCount} sub="Inactivas" icon={<WrenchScrewdriverIcon />} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <div className="lg:col-span-8 space-y-5">
                    {/* GRAFICO VENTAS - COMPACT STYLE */}
                    <PanelGlass className="h-[320px] flex flex-col p-6 border-none shadow-xl shadow-slate-200/20">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                                    <ArrowTrendingUpIcon className="w-4 h-4 text-emerald-500" /> Historial de Ventas
                                </h3>
                                <p className="text-[9px] text-slate-400 font-black uppercase mt-1 tracking-widest">Ingresos acumulados</p>
                            </div>
                            <div className="text-right">
                                <h2 className="text-2xl font-black text-emerald-500 tracking-tighter leading-none">
                                    {formatCLP(kpis.revenueMonth)}
                                </h2>
                                <p className="text-[8px] text-slate-400 uppercase font-black tracking-widest mt-1">Total Periodo</p>
                            </div>
                        </div>
                        <div className="flex-1 w-full min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={revenueHistory}>
                                    <defs>
                                        <linearGradient id="verdeNeonOwner" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#64748b" opacity={0.05} vertical={false} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#64748b', fontWeight: '900' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#64748b', fontWeight: '900' }} />
                                    <Tooltip
                                        formatter={(value: any) => formatCLP(value)}
                                        contentStyle={{ backgroundColor: '#000', border: 'none', borderRadius: '12px', fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', color: '#fff', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)' }}
                                        itemStyle={{ color: '#10b981' }}
                                    />
                                    <Area type="monotone" dataKey="valor" stroke="#10b981" strokeWidth={3} fill="url(#verdeNeonOwner)" animationDuration={1500} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </PanelGlass>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* ESTADO DE RECINTOS */}
                        <PanelGlass className="h-[280px] flex flex-col p-6 border-none shadow-xl shadow-slate-200/20">
                            <h3 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                                <BuildingStorefrontIcon className="w-4 h-4 text-amber-500" /> Estado Operativo
                            </h3>
                            <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar pr-1">
                                {myVenues.map((venue, i) => (
                                    <div key={i} className="flex flex-col gap-2 p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-transparent hover:border-emerald-500/20 transition-all group">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase truncate leading-none">{venue.name}</span>
                                            <span className={`px-3 py-1 rounded-full text-[7px] font-black uppercase tracking-widest ${venue.status === 'Activo' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>{venue.status}</span>
                                        </div>
                                        <p className="text-[8px] text-slate-400 font-black uppercase truncate flex items-center gap-2">
                                            <MapPinIcon className="w-3.5 h-3.5 text-slate-300" /> {venue.address}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </PanelGlass>

                        {/* DISTRIBUCION */}
                        <PanelGlass className="h-[280px] flex flex-col p-6 border-none shadow-xl shadow-slate-200/20">
                            <h3 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                                <ChartPieIcon className="w-4 h-4 text-emerald-500" /> Participación
                            </h3>
                            <div className="flex-1 flex items-center gap-4">
                                <div className="w-1/2 h-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={venuesDistribution} innerRadius={35} outerRadius={50} paddingAngle={8} dataKey="value" stroke="none">
                                                {venuesDistribution.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#10b981' : '#4ADE80'} />
                                                ))}
                                            </Pie>
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
                        </PanelGlass>
                    </div>
                </div>

                {/* SIDEBAR - COMPACT STYLE */}
                <div className="lg:col-span-4 space-y-5">
                    <PanelGlass className="min-h-[400px] flex flex-col p-6 border-none shadow-xl shadow-slate-200/20">
                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-50 dark:border-white/5">
                            <h3 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                                <ClockIcon className="w-4 h-4 text-emerald-500" /> Últimas Reservas
                            </h3>
                        </div>
                        <div className="space-y-3 flex-1 overflow-y-auto no-scrollbar">
                            {recentBookings.map((b) => (
                                <div key={b.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-transparent hover:border-emerald-500/20 transition-all group shadow-sm">
                                    <div className="flex justify-between items-start gap-3">
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase truncate mb-1 leading-none">{b.clientName}</p>
                                            <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                                <span className="text-[8px] text-slate-400 font-black uppercase tracking-tighter">{b.courtName}</span>
                                                <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                                                <span className="text-[8px] text-emerald-500 font-black">{b.startTime}</span>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-[10px] font-black text-slate-900 dark:text-white leading-none mb-1.5 font-mono">{formatCLP(b.totalPrice)}</p>
                                            <span className={`text-[7px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${b.checkIn ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400'}`}>
                                                {b.checkIn ? 'OK' : 'WAIT'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </PanelGlass>

                    {maintenanceAlerts.length > 0 && (
                        <div className="p-6 rounded-[2rem] bg-amber-500/5 border border-amber-500/10 animate-pulse-subtle">
                            <h3 className="text-[9px] font-black uppercase text-amber-600 dark:text-amber-400 flex items-center gap-2 mb-4 tracking-widest">
                                <ExclamationTriangleIcon className="w-5 h-5" /> Mantenimiento
                            </h3>
                            <div className="space-y-3">
                                {maintenanceAlerts.map(m => (
                                    <div key={m.id} className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                                        <span className="text-slate-700 dark:text-slate-300 truncate max-w-[100px]">{m.courtName}</span>
                                        <span className="text-amber-600 font-mono">Fin: {m.endDate.toDate().toLocaleDateString('es-CL')}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
