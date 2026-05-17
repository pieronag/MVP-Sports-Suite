"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/services/firebase';
import { collection, query, where, orderBy, limit, doc, getDoc, addDoc, Timestamp, onSnapshot, getDocs } from 'firebase/firestore';
import {
    CalendarDaysIcon,
    ClipboardDocumentCheckIcon,
    PencilSquareIcon,
    ClockIcon,
    UserGroupIcon,
    ExclamationCircleIcon,
    ArrowPathIcon,
    MapPinIcon,
    CurrencyDollarIcon,
    Squares2X2Icon,
    UserIcon,
    ChartBarIcon,
    BoltIcon,
    SparklesIcon,
    TicketIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import MetricCard from './MetricCard';
import ManualBookingModal from './ManualBookingModal';
import { PanelGlass, TarjetaKpi } from '@/components/ui/DashboardWidgets';

// --- INTERFACES ---
interface Booking {
    id: string;
    courtId: string;
    courtName: string;
    clientName: string;
    date: Timestamp;
    startTime: string;
    endTime?: string;
    duration?: number;
    status: string;
    paymentStatus: string;
    price: number;
    totalPrice?: number;
    deposit?: number;
    sport?: string;
}

interface CourtStatus {
    id: string;
    name: string;
    sport?: string;
    isOccupied: boolean;
    currentBooking?: string;
    endTime?: Date;
}

export default function ManagerDashboard() {
    const { user, firestoreUser } = useAuth();

    // ESTADOS
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [myVenues, setMyVenues] = useState<{ id: string, name: string }[]>([]);
    const [selectedTenantId, setSelectedTenantId] = useState<string>('');
    const [selectedTenantName, setSelectedTenantName] = useState<string>('Cargando...');

    // Métricas
    const [stats, setStats] = useState({
        todayCount: 0,
        activeNow: 0,
        revenueToday: 0,
        pendingRevenue: 0,
        occupancyRate: 0,
        avgTicket: 0
    });

    const [nextBookings, setNextBookings] = useState<Booking[]>([]);
    const [courtStatuses, setCourtStatuses] = useState<CourtStatus[]>([]);
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);



    useEffect(() => {
        const fetchVenues = async () => {
            if (!user?.uid) return;
            try {
                const tenantIds = firestoreUser?.tenantIds || [];
                if (tenantIds.length > 0) {
                    const chunkArray = (arr: any[], size: number) =>
                        Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));

                    const promises = chunkArray(tenantIds, 10).map(async (chunk) => {
                        const q = query(collection(db, "tenants"), where("__name__", "in", chunk));
                        const snap = await getDocs(q);
                        return snap.docs.map(d => ({ id: d.id, name: d.data().name }));
                    });

                    const results = await Promise.all(promises);
                    const list = results.flat();
                    setMyVenues(list);
                    if (list.length > 0 && !selectedTenantId) {
                        setSelectedTenantId(list[0].id);
                        setSelectedTenantName(list[0].name);
                    }
                } else {
                    setErrorMsg("Sin recintos asignados.");
                }
            } catch (error) { console.error("Error venues:", error); }
        };
        fetchVenues();
    }, [user, firestoreUser]);

    useEffect(() => {
        if (!selectedTenantId) return;
        setLoading(true);
        setErrorMsg(null);

        const courtsQ = query(collection(db, "courts"), where("tenantId", "==", selectedTenantId));
        const unsubscribeCourts = onSnapshot(courtsQ, (courtsSnap) => {
            const courtsList = courtsSnap.docs.map(d => ({
                id: d.id,
                name: d.data().name,
                sport: d.data().sport || d.data().category || '',
                isOccupied: false
            } as CourtStatus));

            const [y, m, d] = selectedDate.split('-').map(Number);
            const startOfDay = new Date(y, m - 1, d, 0, 0, 0);
            const endOfDay = new Date(y, m - 1, d, 23, 59, 59);

            const qBookings = query(
                collection(db, "bookings"),
                where("tenantId", "==", selectedTenantId),
                where("date", ">=", Timestamp.fromDate(startOfDay)),
                where("date", "<=", Timestamp.fromDate(endOfDay))
            );

            const unsubscribeBookings = onSnapshot(qBookings, (bSnap) => {
                const todayDocs = bSnap.docs.map(doc => {
                    const data = doc.data();
                    const dateTs = data.date || data.startTime || Timestamp.now();
                    const startStr = typeof data.startTime === 'string' ? data.startTime : (dateTs ? `${dateTs.toDate().getHours().toString().padStart(2, '0')}:${dateTs.toDate().getMinutes().toString().padStart(2, '0')}` : '00:00');
                    return { id: doc.id, ...data, date: dateTs, startTime: startStr } as Booking;
                });

                const nowTime = new Date();
                let activeNowCount = 0;

                const updatedCourtStatus = courtsList.map(court => {
                    const activeBooking = todayDocs.find(b => {
                        if (b.courtId !== court.id || b.status === 'cancelled') return false;
                        const hourStart = parseInt(b.startTime.split(':')[0]) || 0;
                        const start = new Date(startOfDay.getTime());
                        start.setHours(hourStart, 0, 0);
                        const end = new Date(start.getTime() + (b.duration || 60) * 60000);
                        return nowTime >= start && nowTime < end;
                    });
                    if (activeBooking) {
                        activeNowCount++;
                        const hourStart = parseInt(activeBooking.startTime.split(':')[0]) || 0;
                        const bookingEnd = new Date(startOfDay.getTime());
                        bookingEnd.setHours(hourStart + 1, 0, 0);
                        return { ...court, isOccupied: true, currentBooking: activeBooking.clientName, endTime: bookingEnd };
                    }
                    return court;
                });

                const revenue = todayDocs.reduce((acc, curr) => {
                    if (curr.status === 'cancelled') return acc;
                    if (curr.paymentStatus === 'paid') return acc + (Number(curr.totalPrice || curr.price) || 0);
                    if (curr.paymentStatus === 'partial') return acc + (Number(curr.deposit) || 0);
                    return acc;
                }, 0);

                const pending = todayDocs.reduce((acc, curr) => {
                    if (curr.status === 'cancelled' || curr.paymentStatus === 'paid') return acc;
                    const total = Number(curr.totalPrice || curr.price) || 0;
                    if (curr.paymentStatus === 'pending') return acc + total;
                    if (curr.paymentStatus === 'partial') return acc + (total - (Number(curr.deposit) || 0));
                    return acc;
                }, 0);

                const totalHoursBooked = todayDocs.reduce((acc, curr) => acc + (curr.status !== 'cancelled' ? (curr.duration || 60) / 60 : 0), 0);
                const totalCapacityHours = Math.max(1, courtsList.length * 12);
                const occupancy = Math.round((totalHoursBooked / totalCapacityHours) * 100);

                setStats({
                    todayCount: todayDocs.filter(b => b.status !== 'cancelled').length,
                    activeNow: activeNowCount,
                    revenueToday: revenue,
                    pendingRevenue: pending,
                    occupancyRate: occupancy,
                    avgTicket: todayDocs.filter(b => b.status !== 'cancelled' && b.paymentStatus !== 'pending').length > 0 
                        ? Math.round(revenue / todayDocs.filter(b => b.status !== 'cancelled' && b.paymentStatus !== 'pending').length) 
                        : 0
                });
                setCourtStatuses(updatedCourtStatus);
                setNextBookings(todayDocs.filter(b => {
                    if (b.status === 'cancelled') return false;
                    const h = parseInt(b.startTime.split(':')[0]) || 0;
                    const end = new Date(startOfDay.getTime());
                    end.setHours(h + 1, 0, 0);
                    return end > nowTime;
                }).sort((a,b) => {
                    const hourA = parseInt(a.startTime.split(':')[0]) || 0;
                    const hourB = parseInt(b.startTime.split(':')[0]) || 0;
                    return hourB - hourA;
                }).slice(0, 5));
                setLoading(false);
            }, (err) => {
                console.error("Error bookings snapshot:", err);
                setLoading(false);
            });

            return () => unsubscribeBookings();
        }, (err) => {
            console.error("Error courts snapshot:", err);
            setLoading(false);
        });

        return () => unsubscribeCourts();
    }, [selectedTenantId, selectedDate, refreshTrigger]);

    const formatMoney = (amount: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(amount);
    const formatTime = (ts: Timestamp | Date | string) => {
        if (typeof ts === 'string') return ts;
        const date = ts instanceof Timestamp ? ts.toDate() : ts;
        return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    };

    return (
        <div className="w-full space-y-5 pb-10 text-left relative animate-fadeIn">
            <ManualBookingModal
                isOpen={isBookingModalOpen}
                onClose={() => setIsBookingModalOpen(false)}
                tenantId={selectedTenantId}
                onSuccess={() => setRefreshTrigger(prev => prev + 1)}
            />

            {/* CABECERA ADN FINANCE STYLE */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-6 relative z-10">
                <div>
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="w-6 h-[2px] bg-emerald-500 rounded-full"></span>
                        <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 tracking-[0.2em] uppercase">
                            Centro de Control Operativo
                        </p>
                    </div>
                    <h1 className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none">
                        Gestión <span className="text-emerald-500 dark:text-emerald-400">En Vivo</span>
                    </h1>
                </div>

                <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-[#0B0F19] p-1.5 rounded-xl border border-slate-200 dark:border-white/5 shadow-lg shadow-slate-200/20 dark:shadow-none">
                    <select
                        value={selectedTenantId}
                        onChange={(e) => {
                            setSelectedTenantId(e.target.value);
                            const name = myVenues.find(v => v.id === e.target.value)?.name || '';
                            setSelectedTenantName(name);
                        }}
                        className="pl-4 pr-2 py-1.5 bg-transparent text-[10px] font-black uppercase text-slate-700 dark:text-white outline-none cursor-pointer appearance-none"
                    >
                        {myVenues.map(v => <option key={v.id} value={v.id} className="dark:bg-[#0B0F19]">{v.name}</option>)}
                    </select>

                    <div className="flex items-center gap-2 px-3 border-l border-slate-100 dark:border-white/5">
                        <div className="relative group">
                            <CalendarDaysIcon className="absolute left-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-emerald-500 pointer-events-none" />
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="pl-5 bg-transparent text-[10px] font-black uppercase outline-none text-slate-700 dark:text-white cursor-pointer appearance-none"
                            />
                        </div>
                    </div>
                    
                    <button onClick={() => setRefreshTrigger(p => p + 1)} className="p-2 bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-950 rounded-lg shadow-lg active:scale-90 transition-all">
                        <ArrowPathIcon className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* KPI GRID - COMPACT DNA */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <TarjetaKpi label="Reservas Hoy" value={stats.todayCount} sub="Reservas" icon={<TicketIcon />} />
                <TarjetaKpi label="En Uso" value={stats.activeNow} sub="Ocupación" icon={<UserGroupIcon />} />
                <TarjetaKpi label="Caja Hoy" value={formatMoney(stats.revenueToday)} sub="Venta" icon={<CurrencyDollarIcon />} brillo />
                <TarjetaKpi label="Pendiente Cobro" value={formatMoney(stats.pendingRevenue)} sub="Por Cobrar" icon={<ExclamationCircleIcon />} className="border-amber-500/20" />
                <TarjetaKpi label="Ocupación" value={`${stats.occupancyRate}%`} sub="Rendimiento" icon={<Squares2X2Icon />} />
                <TarjetaKpi label="Ticket Prom." value={formatMoney(stats.avgTicket)} sub="Promedio" icon={<SparklesIcon />} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 space-y-5">
                    {/* ESTADO DE CANCHAS - COMPACT STYLE */}
                    <PanelGlass className="p-6 flex flex-col border-none shadow-xl shadow-slate-200/20">
                        <div className="flex justify-between items-center mb-6">
                            <h4 className="text-[10px] font-black uppercase text-slate-900 dark:text-white flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Estatus de Campo
                            </h4>
                            <span className="text-[8px] font-black bg-emerald-500/10 text-emerald-600 px-3 py-1 rounded-full uppercase tracking-widest">Live</span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {courtStatuses.map(court => (
                                <div key={court.id} className={`p-4 rounded-2xl border transition-all flex flex-col justify-between h-32 relative overflow-hidden group ${
                                    court.isOccupied ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-slate-50 dark:border-white/5 bg-white dark:bg-[#0B0F19] hover:border-emerald-500/30'
                                }`}>
                                    <div className={`absolute top-0 left-0 right-0 h-1 ${court.isOccupied ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
                                    <div className="mb-1">
                                        <div className="text-[10px] font-black uppercase text-slate-900 dark:text-white truncate">{court.name}</div>
                                        {court.sport && <div className="text-[7px] font-bold text-slate-400 capitalize tracking-widest">{court.sport.toLowerCase()}</div>}
                                    </div>
                                    
                                    <div className="flex-1 flex flex-col justify-center">
                                        {court.isOccupied ? (
                                            <>
                                                <p className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase truncate leading-none mb-1">{court.currentBooking}</p>
                                                <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">Fin: {court.endTime ? formatTime(court.endTime) : '--:--'}</span>
                                            </>
                                        ) : (
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-1 h-1 rounded-full bg-emerald-500"></div>
                                                <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Disponible</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="absolute -bottom-2 -right-2 opacity-5 group-hover:opacity-10 transition-opacity">
                                        <BoltIcon className="w-12 h-12" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </PanelGlass>

                    {/* TABLA DE RESERVAS - COMPACT ADN */}
                    <PanelGlass className="overflow-hidden border-none shadow-xl shadow-slate-200/20">
                        <div className="px-6 py-4 border-b border-slate-50 dark:border-white/5 flex justify-between items-center">
                            <h3 className="text-[10px] font-black uppercase text-slate-900 dark:text-white tracking-widest">Próximas Reservas</h3>
                            <Link href="/dashboard/calendar" className="text-[8px] font-black text-emerald-600 hover:text-emerald-500 uppercase tracking-widest transition-colors">Calendario →</Link>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50/30 dark:bg-white/[0.01] text-[8px] font-black text-slate-400 uppercase tracking-wider">
                                        <th className="px-6 py-4">Fecha / Hora</th>
                                        <th className="px-6 py-4">Recinto / Deporte</th>
                                        <th className="px-6 py-4">Cliente / Campo</th>
                                        <th className="px-6 py-4 text-right">Valor Total</th>
                                        <th className="px-6 py-4 text-right">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                                    {nextBookings.length > 0 ? nextBookings.map((b) => (
                                        <tr key={b.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-black text-slate-900 dark:text-white font-mono text-xs">{formatTime(b.startTime)}</span>
                                                    <span className="text-[7px] font-bold text-slate-400 uppercase">{b.date?.toDate ? b.date.toDate().toLocaleDateString('es-CL') : 'HOY'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-black text-slate-900 dark:text-white uppercase text-[9px] tracking-tighter truncate max-w-[120px]">{selectedTenantName}</span>
                                                    <span className="text-[7px] font-black text-emerald-500 uppercase tracking-widest">{b.sport || 'MULTICANCHA'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-black text-slate-900 dark:text-white uppercase text-[9px]">{b.clientName}</span>
                                                    <span className="text-[7px] font-bold text-slate-400 uppercase">{b.courtName}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex flex-col items-end">
                                                    <span className="font-black text-slate-900 dark:text-white text-xs">{formatMoney(b.totalPrice || b.price || 0)}</span>
                                                    {b.deposit && b.paymentStatus === 'partial' && (
                                                        <span className="text-[7px] font-bold text-amber-500 uppercase">Seña: {formatMoney(b.deposit)}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={`px-2.5 py-0.5 rounded-lg text-[7px] font-black uppercase tracking-widest ${b.paymentStatus === 'paid' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'}`}>
                                                    {b.paymentStatus === 'paid' ? 'PAGADO' : b.paymentStatus === 'partial' ? 'PARCIAL' : 'PENDIENTE'}
                                                </span>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan={5} className="py-16 text-center text-slate-400 uppercase font-black text-[9px] tracking-widest italic opacity-50">Sin reservas</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </PanelGlass>
                </div>

                <div className="space-y-5">
                    {/* RESUMEN FINANCIERO - COMPACT STYLE */}
                    <PanelGlass className="p-6 border-none shadow-xl shadow-slate-200/20">
                        <h3 className="text-[10px] font-black uppercase text-slate-400 mb-6 flex items-center gap-2 tracking-widest">
                            <ChartBarIcon className="w-4 h-4 text-emerald-500" /> Caja Hoy
                        </h3>
                        <div className="space-y-6">
                            <div>
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Liquidación</span>
                                    <span className="text-[10px] font-black text-emerald-600">{nextBookings.filter(b => b.paymentStatus === 'paid').length}/{nextBookings.length}</span>
                                </div>
                                <div className="w-full h-1.5 bg-slate-50 dark:bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${nextBookings.length > 0 ? (nextBookings.filter(b => b.paymentStatus === 'paid').length / nextBookings.length * 100) : 0}%` }}></div>
                                </div>
                            </div>
                            
                            <div className="pt-5 border-t border-slate-50 dark:border-white/5 space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400 uppercase font-black text-[9px] tracking-widest">Recaudado</span>
                                    <span className="text-sm font-black text-slate-900 dark:text-white font-mono">{formatMoney(stats.revenueToday)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400 uppercase font-black text-[9px] tracking-widest">Promedio</span>
                                    <span className="text-sm font-black text-emerald-500 font-mono">{formatMoney(stats.avgTicket)}</span>
                                </div>
                            </div>
                        </div>
                    </PanelGlass>

                    {/* MEDIDOR OCUPACION - COMPACT STYLE */}
                    <div className="p-6 rounded-[2rem] bg-slate-900 shadow-xl shadow-slate-900/40 relative overflow-hidden group">
                        <div className="relative z-10">
                            <p className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-2">Ocupación</p>
                            <h4 className="text-4xl font-black text-white leading-none mb-6 tracking-tighter italic">{stats.occupancyRate}%</h4>
                            <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden backdrop-blur-md">
                                <div className="h-full bg-emerald-500 rounded-full transition-all duration-1500" style={{ width: `${stats.occupancyRate}%` }}></div>
                            </div>
                            <p className="text-[9px] text-slate-400 font-black uppercase mt-4 tracking-widest">Optimización</p>
                        </div>
                        <SparklesIcon className="absolute -bottom-2 -right-2 w-24 h-24 text-emerald-500/10 group-hover:scale-110 transition-transform duration-700" />
                    </div>
                </div>
            </div>
        </div>
    );
}
