"use client";
import React, { useState, useEffect } from 'react';
import { watchBookings } from "@/services/client/data/bookings";
import { isReal, bookingLabel } from "@/utils/bookingModel";
import { chileDateTime, operatingDay } from "@/utils/chileTime";
import { summarizeDay, type CourtRef } from "@/utils/daySummary";
import type { Booking } from "@/types/booking";
import { useAuth } from '@/context/AuthContext';
import { db } from '@/services/client/firebase';
import { collection, query, where, Timestamp, onSnapshot, getDocs } from 'firebase/firestore';
import { HugeiconsIcon } from "@hugeicons/react";
import {
    AlertCircleIcon,
    BarChartIcon,
    Calendar03Icon,
    DashboardSquare01Icon,
    Dollar01Icon,
    FlashIcon,
    RefreshIcon,
    SparklesIcon as SparklesIconHi,
    Ticket01Icon,
    UserGroupIcon as UserGroupIconHi,
} from "@hugeicons/core-free-icons";


// Adaptadores: mantienen los nombres usados en el JSX sobre Hugeicons
const CalendarDaysIcon = ({ className }: { className?: string }) => <HugeiconsIcon icon={Calendar03Icon} className={className} strokeWidth={1.6} />;
const UserGroupIcon = ({ className }: { className?: string }) => <HugeiconsIcon icon={UserGroupIconHi} className={className} strokeWidth={1.6} />;
const ExclamationCircleIcon = ({ className }: { className?: string }) => <HugeiconsIcon icon={AlertCircleIcon} className={className} strokeWidth={1.6} />;
const ArrowPathIcon = ({ className }: { className?: string }) => <HugeiconsIcon icon={RefreshIcon} className={className} strokeWidth={1.6} />;
const CurrencyDollarIcon = ({ className }: { className?: string }) => <HugeiconsIcon icon={Dollar01Icon} className={className} strokeWidth={1.6} />;
const Squares2X2Icon = ({ className }: { className?: string }) => <HugeiconsIcon icon={DashboardSquare01Icon} className={className} strokeWidth={1.6} />;
const ChartBarIcon = ({ className }: { className?: string }) => <HugeiconsIcon icon={BarChartIcon} className={className} strokeWidth={1.6} />;
const BoltIcon = ({ className }: { className?: string }) => <HugeiconsIcon icon={FlashIcon} className={className} strokeWidth={1.6} />;
const SparklesIcon = ({ className }: { className?: string }) => <HugeiconsIcon icon={SparklesIconHi} className={className} strokeWidth={1.6} />;
const TicketIcon = ({ className }: { className?: string }) => <HugeiconsIcon icon={Ticket01Icon} className={className} strokeWidth={1.6} />;
import { dayOpenHours } from '@/utils/bookingMath';
import Link from 'next/link';
import MetricCard from './MetricCard';
import { PanelGlass, TarjetaKpi } from '@/components/ui/DashboardWidgets';

// --- INTERFACES ---

export default function ManagerDashboard() {
    const { user, firestoreUser } = useAuth();

    // ESTADOS
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [myVenues, setMyVenues] = useState<{ id: string, name: string, [k: string]: any }[]>([]);
    const [selectedTenantId, setSelectedTenantId] = useState<string>('');
    const [selectedTenantName, setSelectedTenantName] = useState<string>('Cargando...');

    const [courts, setCourts] = useState<CourtRef[]>([]);
    const [dayBookings, setDayBookings] = useState<Booking[]>([]);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    // Día operativo en hora de Chile (antes con toISOString(), que después de las 21:00 mostraba el día siguiente)
    const [selectedDate, setSelectedDate] = useState<string>(operatingDay().day);
    const [now, setNow] = useState(() => new Date());
    useEffect(() => { const t = setInterval(() => setNow(new Date()), 60_000); return () => clearInterval(t); }, []);



    useEffect(() => {
        const fetchVenues = async () => {
            if (!user?.uid) return;
            try {
                const tenantIds = firestoreUser?.tenantIds || (firestoreUser?.tenantId ? [firestoreUser.tenantId] : []);
                if (tenantIds.length > 0) {
                    const chunkArray = (arr: any[], size: number) =>
                        Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));

                    const promises = chunkArray(tenantIds, 10).map(async (chunk) => {
                        const q = query(collection(db, "tenants"), where("__name__", "in", chunk));
                        const snap = await getDocs(q);
                        return snap.docs.map(d => ({ id: d.id, ...d.data(), name: d.data().name }));
                    });

                    const results = await Promise.all(promises);
                    const list = results.flat();
                    setMyVenues(list);
                    if (list.length > 0) {
                        if (!selectedTenantId) {
                            setSelectedTenantId(list[0].id);
                            setSelectedTenantName(list[0].name);
                        }
                    } else {
                        setErrorMsg("Sin recintos asignados.");
                        setLoading(false);
                    }
                } else {
                    setErrorMsg("Sin recintos asignados.");
                    setLoading(false);
                }
            } catch (error) { 
                console.error("Error venues:", error); 
                setErrorMsg("Error al cargar recintos.");
                setLoading(false);
            }
        };
        fetchVenues();
    }, [user, firestoreUser, selectedTenantId]);

    useEffect(() => {
        if (!selectedTenantId) return;
        const onErr = (e: Error & { code?: string }) => {
            console.error(e);
            setErrorMsg(e.code === 'permission-denied' ? 'Tu cuenta no tiene permisos sobre este recinto.' : 'No se pudieron cargar los datos del recinto.');
            setLoading(false);
        };
        const unsubCourts = onSnapshot(query(collection(db, "courts"), where("tenantId", "==", selectedTenantId)), (snap) => {
            setCourts(snap.docs.map(d => ({ id: d.id, name: d.data().name || 'Cancha', sport: d.data().sport || d.data().category || '' }))
                .sort((x, y) => x.name.localeCompare(y.name)));
        }, onErr);
        const from = chileDateTime(selectedDate, 6, 0);
        const to = new Date(chileDateTime(selectedDate, 6, 0, 1).getTime() - 1);
        const unsubBookings = watchBookings([selectedTenantId], { from, to }, (list) => {
            setDayBookings(list.filter(isReal));
            setErrorMsg(null);
            setLoading(false);
        }, onErr);
        return () => { unsubCourts(); unsubBookings(); };
    }, [selectedTenantId, selectedDate, refreshTrigger]);

    const venue = myVenues.find(v => v.id === selectedTenantId);
    const summary = summarizeDay(dayBookings, courts, dayOpenHours(venue, selectedDate).slots.length, now);
    const stats = summary;
    const courtStatuses = summary.courtStatuses;
    const nextBookings = summary.nextBookings;
    const BADGE: Record<string, string> = { 'Pagado': 'bg-emerald-500 text-white', 'Inasistencia': 'bg-red-500 text-white', 'Reembolsado': 'bg-rose-500 text-white', 'Anulada': 'bg-slate-500 text-white', 'Error en reembolso': 'bg-amber-500 text-white' };

    const formatMoney = (amount: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(amount);
    const formatTime = (ts: Timestamp | Date | string) => {
        if (typeof ts === 'string') return ts;
        const date = ts instanceof Date ? ts : ts.toDate();
        return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    };
    if (loading && myVenues.length === 0) {
        return (
            <div className="h-96 flex flex-col items-center justify-center text-slate-400 gap-2">
                <ArrowPathIcon className="w-6 h-6 animate-spin text-emerald-500" />
                <span className="text-[10px] font-black uppercase tracking-widest">Escaneando Datos del Recinto...</span>
            </div>
        );
    }

    if (errorMsg) {
        return (
            <div className="h-96 flex flex-col items-center justify-center text-slate-400 gap-2 text-center p-6 bg-slate-50 dark:bg-white/5 rounded-md border border-dashed border-slate-200 dark:border-white/10">
                <ExclamationCircleIcon className="w-8 h-8 text-amber-500 animate-pulse" />
                <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white mt-2">Acceso Limitado</h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{errorMsg}</p>
            </div>
        );
    }

    return (
        <div className="w-full space-y-5 pb-10 text-left relative animate-fadeIn">
            {/* CABECERA ADN FINANCE STYLE */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-6 relative z-10">
                <div>
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="w-6 h-[2px] bg-emerald-500 rounded-md"></span>
                        <p className="text-[11px] font-black text-emerald-600 dark:text-[#00df82] tracking-[0.2em] uppercase">
                            Centro de Control Operativo
                        </p>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none font-heading">
                        Gestión <span className="text-emerald-500 dark:text-[#00df82]">En Vivo</span>
                    </h1>
                </div>

                <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-slate-900/50 p-1.5 rounded-md border border-slate-200 dark:border-white/5">
                    <select
                        value={selectedTenantId}
                        onChange={(e) => {
                            setSelectedTenantId(e.target.value);
                            const name = myVenues.find(v => v.id === e.target.value)?.name || '';
                            setSelectedTenantName(name);
                        }}
                        className="pl-4 pr-2 py-1.5 bg-transparent text-[10px] font-black uppercase text-slate-700 dark:text-white outline-hidden cursor-pointer appearance-none"
                    >
                        {myVenues.map(v => <option key={v.id} value={v.id} >{v.name}</option>)}
                    </select>

                    <div className="flex items-center gap-2 px-3 border-l border-slate-100 dark:border-white/5">
                        <div className="relative group">
                            <CalendarDaysIcon className="absolute left-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-emerald-500 pointer-events-none" />
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="pl-5 bg-transparent text-[10px] font-black uppercase outline-hidden text-slate-700 dark:text-white cursor-pointer appearance-none"
                            />
                        </div>
                    </div>
                    
                    <button aria-label="Actualizar" onClick={() => setRefreshTrigger(p => p + 1)} className="p-2 bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-950 rounded-md active:scale-90 transition-all">
                        <ArrowPathIcon className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* KPI GRID - COMPACT DNA */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <TarjetaKpi label="Reservas Hoy" value={stats.todayCount} sub="Reservas" icon={<TicketIcon />} />
                <TarjetaKpi label="En Uso" value={stats.activeNow} sub="Ocupación" icon={<UserGroupIcon />} />
                <TarjetaKpi label="Caja Hoy" value={formatMoney(stats.revenueToday)} sub="Venta" icon={<CurrencyDollarIcon />} brillo />
                <TarjetaKpi label="Ocupación" value={`${stats.occupancyRate}%`} sub="Rendimiento" icon={<Squares2X2Icon />} />
                <TarjetaKpi label="Ticket Prom." value={formatMoney(stats.avgTicket)} sub="Promedio" icon={<SparklesIcon />} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 space-y-5">
                    {/* ESTADO DE CANCHAS - COMPACT STYLE */}
                    <PanelGlass className="p-6 flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <h4 className="text-[10px] font-black uppercase text-slate-900 dark:text-white flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Estatus de Campo
                            </h4>
                            <span className="text-[8px] font-black bg-emerald-500/10 text-emerald-600 px-3 py-1 rounded-full uppercase tracking-widest">Live</span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {courtStatuses.map(court => (
                                <div key={court.id} className={`p-4 rounded-md border transition-all flex flex-col justify-between h-32 relative overflow-hidden group ${
                                    court.isOccupied ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-slate-50 dark:border-white/5 bg-white dark:bg-slate-900/50 hover:border-emerald-500/30'
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
                    <PanelGlass className="overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-50 dark:border-white/5 flex justify-between items-center">
                            <h3 className="text-[10px] font-black uppercase text-slate-900 dark:text-white tracking-widest">Próximas Reservas</h3>
                            <Link href="/dashboard/calendar" className="text-[8px] font-black text-emerald-600 hover:text-emerald-500 uppercase tracking-widest transition-colors">Calendario →</Link>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50/30 dark:bg-white/1 text-[8px] font-black text-slate-400 uppercase tracking-wider">
                                        <th className="px-6 py-4">Fecha / Hora</th>
                                        <th className="px-6 py-4">Recinto / Deporte</th>
                                        <th className="px-6 py-4">Cliente / Campo</th>
                                        <th className="px-6 py-4 text-right">Valor Total</th>
                                        <th className="px-6 py-4 text-right">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                                    {nextBookings.length > 0 ? nextBookings.map((b) => (
                                        <tr key={b.id} className="hover:bg-slate-50/50 dark:hover:bg-white/2 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-black text-slate-900 dark:text-white font-mono text-xs">{formatTime(b.startTime)}</span>
                                                    <span className="text-[7px] font-bold text-slate-400 uppercase">{b.start ? b.start.toLocaleDateString('es-CL') : 'HOY'}</span>
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
                                                    <span className="font-black text-slate-900 dark:text-white text-xs">{formatMoney(b.price)}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={`px-2.5 py-0.5 rounded-md text-[7px] font-black uppercase tracking-widest ${BADGE[bookingLabel(b)] || 'bg-slate-500 text-white'}`}>
                                                    {bookingLabel(b)}
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
                    <PanelGlass className="p-6">
                        <h3 className="text-[10px] font-black uppercase text-slate-400 mb-6 flex items-center gap-2 tracking-widest">
                            <ChartBarIcon className="w-4 h-4 text-emerald-500" /> Caja Hoy
                        </h3>
                        <div className="space-y-6">
                            <div>
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Liquidación</span>
                                    <span className="text-[10px] font-black text-emerald-600">{nextBookings.filter(b => b.payment === 'paid').length}/{nextBookings.length}</span>
                                </div>
                                <div className="w-full h-1.5 bg-slate-50 dark:bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${nextBookings.length > 0 ? (nextBookings.filter(b => b.payment === 'paid').length / nextBookings.length * 100) : 0}%` }}></div>
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
                    <div className="p-6 rounded-md bg-slate-900 relative overflow-hidden group">
                        <div className="relative z-10">
                            <p className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-2">Ocupación</p>
                            <h4 className="text-4xl font-black text-white leading-none mb-6 tracking-tighter font-mono">{stats.occupancyRate}%</h4>
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
