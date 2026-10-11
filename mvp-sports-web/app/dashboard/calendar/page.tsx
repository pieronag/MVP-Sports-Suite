"use client";
import { postApi } from "@/services/client/apiClient";
import { listBookings } from "@/services/client/data/bookings";
import { isReal } from "@/utils/bookingModel";
import { chileDateTime } from "@/utils/chileTime";
import { HugeiconsIcon } from "@hugeicons/react";
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/services/client/firebase';
import { collection, getDocs, getDoc, query, where, orderBy, limit, doc, updateDoc, addDoc, deleteDoc, serverTimestamp, onSnapshot, Timestamp, writeBatch, setDoc } from 'firebase/firestore';
import { collectedAmount, durationHours } from '@/utils/bookingMath';
import { auditService } from '@/services/client/auditService';
import {
    Add01Icon,
    Alert02Icon,
    Building01Icon,
    Calendar03Icon,
    Cancel01Icon,
    CheckmarkCircle02Icon,
    ArrowDown01Icon,
    Clock01Icon,
    ComputerIcon,
    Message02Icon,
    MoneyBag01Icon,
    RefreshIcon,
    SmartPhone01Icon,
    UserCircleIcon,
    UserIcon,
    ArrowLeft01Icon,
    ArrowRight01Icon,
} from '@hugeicons/core-free-icons';

const HOUR_HEIGHT = 80;
const COLUMN_WIDTH = 180;


const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, isDestructive = false, showCancel = true }: any) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-200 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn" onClick={onCancel}>
            <div className="bg-white dark:bg-[#0B0F19] rounded-md shadow-2xl border border-slate-200 dark:border-white/10 w-full max-w-sm p-6 overflow-hidden relative" onClick={(e) => e.stopPropagation()}>
                <div className={`absolute top-0 left-0 w-full h-1 ${isDestructive ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tighter leading-none">{title}</h3>
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-8 uppercase leading-relaxed">{message}</p>
                <div className="flex gap-3 justify-end">
                    {showCancel && <button onClick={onCancel} className="px-5 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-md bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-200 transition-all">Cancelar</button>}
                    <button onClick={onConfirm} className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-md text-white shadow-lg transition-all active:scale-95 ${isDestructive ? 'bg-red-600 shadow-red-500/20' : 'bg-emerald-600 shadow-emerald-500/20'}`}>{showCancel ? 'Confirmar' : 'Entendido'}</button>
                </div>
            </div>
        </div>
    );
};


const formatCLP = (amount: any) => {
    const value = Number(amount) || 0;
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(value);
};

interface Venue { id: string; name: string; pricing?: { [sport: string]: { [hour: string]: number } }; }
interface Court { id: string; name: string; sport: string; }

const getChileNow = () => new Date(new Date().toLocaleString("en-US", { timeZone: "America/Santiago" }));
const getChileDateISO = () => {
    const now = getChileNow();
    if (now.getHours() < 6) now.setDate(now.getDate() - 1);
    return now.getFullYear() + '-' + (now.getMonth() + 1).toString().padStart(2, '0') + '-' + now.getDate().toString().padStart(2, '0');
};

// Teléfono chileno a formato wa.me (solo dígitos, con prefijo 56 una sola vez)
const toWhatsAppNumber = (phone: string = ''): string => {
    const digits = String(phone).replace(/\D/g, '');
    return digits.startsWith('56') ? digits : `56${digits}`;
};


export default function MasterCalendar() {
    const { user, firestoreUser, role } = useAuth();
    const [loading, setLoading] = useState(true);
    const [venues, setVenues] = useState<Venue[]>([]);
    const [selectedVenueId, setSelectedVenueId] = useState<string>('');
    const [dashboardCourts, setDashboardCourts] = useState<Court[]>([]);
    const [bookings, setBookings] = useState<any[]>([]);
    const [selectedDate, setSelectedDate] = useState(getChileDateISO());
    const [selectedBooking, setSelectedBooking] = useState<any>(null);
    const [confirmData, setConfirmData] = useState<{ isOpen: boolean, title: string, message: string, action: () => void, isDestructive: boolean, showCancel?: boolean }>({ 
        isOpen: false, title: '', message: '', action: () => { }, isDestructive: false, showCancel: true 
    });


    const calendarConfig = React.useMemo(() => {
        let openHour = 8;
        let closeHour = 23;
        
        if (selectedVenueId && venues.length > 0) {
            const venue = venues.find(v => v.id === selectedVenueId) as any;
            if (venue) {
                if (venue.openTime) openHour = parseInt(venue.openTime.split(':')[0]);
                if (venue.closeTime) closeHour = parseInt(venue.closeTime.split(':')[0]);

                if (venue.schedule && selectedDate) {
                    const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                    const d = new Date(selectedDate + "T12:00:00");
                    const dayName = daysOfWeek[d.getDay()];
                    const dayConfig = venue.schedule[dayName];
                    if (dayConfig && dayConfig.isOpen !== false) {
                        if (dayConfig.open) openHour = parseInt(dayConfig.open.split(':')[0]);
                        if (dayConfig.close) closeHour = parseInt(dayConfig.close.split(':')[0]);
                    }
                }
            }
        }
        
        if (isNaN(openHour)) openHour = 8;
        if (isNaN(closeHour)) closeHour = 23;

        if (closeHour < openHour) {
            closeHour += 24;
        }
        if (closeHour === 0) {
            closeHour = 24;
        }

        const slots = [];
        for (let i = openHour; i < closeHour; i++) {
            slots.push(`${(i % 24).toString().padStart(2, '0')}:00`);
        }
        
        return { startHour: openHour, endHour: closeHour, timeSlots: slots };
    }, [selectedVenueId, venues, selectedDate]);

    useEffect(() => {
        const fetchVenues = async () => {
            if (!user?.uid) return;
            try {
                let list: Venue[] = [];
                if (role === 'manager' || role === 'staff') {
                    const tenantIds = firestoreUser?.tenantIds || (firestoreUser?.tenantId ? [firestoreUser.tenantId] : []);
                    if (tenantIds.length > 0) {
                        const chunkArray = (arr: any[], size: number) => Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));
                        const promises = chunkArray(tenantIds, 10).map(async (chunk) => {
                            const q = query(collection(db, "tenants"), where("__name__", "in", chunk));
                            const snap = await getDocs(q);
                            return snap.docs.map(d => ({ id: d.id, ...d.data() } as Venue));
                        });
                        const results = await Promise.all(promises);
                        list = results.flat();
                    }
                } else if (role === 'admin' || role === 'superadmin') {
                    // Superadmin: todos los recintos (antes buscaba por ownerId y quedaba cargando)
                    const snap = await getDocs(query(collection(db, "tenants"), orderBy("name")));
                    list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Venue));
                } else {
                    // Owner: dueño principal (ownerId) o co-dueño (ownerIds)
                    const [byOwner, byOwners] = await Promise.all([
                        getDocs(query(collection(db, "tenants"), where("ownerId", "==", user.uid))),
                        getDocs(query(collection(db, "tenants"), where("ownerIds", "array-contains", user.uid))),
                    ]);
                    const map = new Map<string, Venue>();
                    [...byOwner.docs, ...byOwners.docs].forEach(d => map.set(d.id, { id: d.id, ...d.data() } as Venue));
                    list = Array.from(map.values());
                }
                setVenues(list);
                if (list.length === 0) setLoading(false);
                if (list.length > 0) {
                    setSelectedVenueId(list[0].id);
                }
            } catch (e) { console.error(e); }
        };
        fetchVenues();
    }, [user, role, firestoreUser]);

    const loadDashboardData = async () => {
        if (!selectedVenueId) return;
        setLoading(true);
        try {
            const snapCourts = await getDocs(query(collection(db, "courts"), where("tenantId", "==", selectedVenueId)));
            const courtsList = snapCourts.docs.map(d => ({ id: d.id, ...d.data() } as Court));
            setDashboardCourts(courtsList.sort((a, b) => a.name.localeCompare(b.name)));

            // Día operativo del recinto: de 06:00 a 05:59 del día siguiente (hora de Chile)
            const start = chileDateTime(selectedDate, 6, 0);
            const end = new Date(chileDateTime(selectedDate, 6, 0, 1).getTime() - 1);
            const list = await listBookings([selectedVenueId], { from: start, to: end });
            const bookingsList = list.filter(isReal).map(b => {
                const [h, m] = (b.startTime || '00:00').split(':').map(Number);
                return {
                    ...b.raw,
                    id: b.id,
                    clientName: b.clientName,
                    courtName: b.courtName,
                    startTime: b.startTime,
                    paymentStatus: b.payment,
                    status: b.state === 'cancelled' ? 'cancelled' : b.raw.status,
                    finalPrice: b.price,
                    displayTime: b.startTime,
                    // Bloques de madrugada van al final de la grilla
                    extractedHour: (h < 6 ? h + 24 : h) + (m || 0) / 60,
                };
            });
            setBookings(bookingsList);
        } catch (e: any) {
            console.error(e);
            setConfirmData({ isOpen: true, title: 'No se pudo cargar la agenda', message: e?.code === 'permission-denied' ? 'Tu cuenta no tiene permisos sobre este recinto.' : 'Revisa tu conexión e inténtalo nuevamente.', isDestructive: false, showCancel: false, action: () => setConfirmData(prev => ({ ...prev, isOpen: false })) });
        } finally { setLoading(false); }
    };

    useEffect(() => { loadDashboardData(); }, [selectedVenueId, selectedDate]);

    // Anular una reserva (cliente cancela o ingreso por error). Libera el horario
    // sin marcar inasistencia ni penalizar al jugador.
    const requestCancelBooking = (b: any) => {
        const paid = b.paymentStatus === 'paid' ? Number(b.finalPrice || 0) : 0;
        setConfirmData({
            isOpen: true,
            title: "Anular reserva",
            message: `¿Anular la reserva #${b.id} de ${b.clientName || 'cliente'} (${b.startTime})? El horario quedará disponible` +
                (paid > 0 ? ` y se devolverán ${formatCLP(paid)} (100%) al cliente por Mercado Pago.` : '.'),
            isDestructive: true,
            showCancel: true,
            action: async () => {
                setConfirmData(prev => ({ ...prev, isOpen: false }));
                const done = (title: string, message: string) => setConfirmData({ isOpen: true, title, message, isDestructive: false, showCancel: false, action: () => setConfirmData(prev => ({ ...prev, isOpen: false })) });
                try {
                    const r = await postApi<{ success: boolean; refundAmount: number; error: string | null }>('/api/bookings/cancel', { bookingId: b.id });
                    await auditService.logAuditEvent({ action: 'RESERVA_ANULAR', module: 'Operación/Agenda', details: `Reserva ${b.id} anulada por personal (${b.clientName || ''} ${b.startTime}); devuelto ${r.refundAmount}`, severity: 'MEDIUM', status: r.success ? 'SUCCESS' : 'FAILED' });
                    setSelectedBooking(null);
                    loadDashboardData();
                    if (r.success) done("Reserva anulada", r.refundAmount > 0 ? `Se devolvieron ${formatCLP(r.refundAmount)} al cliente.` : 'El horario quedó disponible.');
                    else done("Reserva anulada, reembolso pendiente", `La reserva se anuló, pero Mercado Pago no confirmó la devolución (${r.error || 'sin detalle'}). Quedó marcada como "Error en reembolso" para revisarla.`);
                } catch (e: any) {
                    done("No se pudo anular", e?.message || 'Inténtalo nuevamente.');
                }
            },
        });
    };


    const getCardStyle = (paymentStatus: string, status: string) => {
        if (status === 'cancelled') return 'bg-slate-50 dark:bg-slate-800/60 border-slate-300 dark:border-white/10 text-slate-500 dark:text-slate-400 opacity-60';
        switch (paymentStatus) {
            case 'paid': return 'bg-emerald-50 dark:bg-emerald-500/15 border-emerald-500/40 dark:border-[#00df82]/40 text-emerald-800 dark:text-emerald-300';
            case 'pending': return 'bg-sky-50 dark:bg-sky-500/15 border-sky-500/40 text-sky-800 dark:text-sky-300';
            default: return 'bg-slate-50 dark:bg-white/5 border-slate-300 dark:border-white/15 text-slate-700 dark:text-slate-200';
        }
    };

    const shiftDay = (delta: number) => {
        const d = new Date(selectedDate + "T12:00:00");
        d.setDate(d.getDate() + delta);
        setSelectedDate(d.getFullYear() + '-' + (d.getMonth() + 1).toString().padStart(2, '0') + '-' + d.getDate().toString().padStart(2, '0'));
    };

    if (loading && venues.length === 0) return <div className="text-center py-20 text-[10px] font-black uppercase text-slate-400 animate-pulse">Iniciando agenda...</div>;
    if (!loading && venues.length === 0) return <div className="text-center py-20 text-[10px] font-black uppercase text-slate-400">No tienes recintos asignados. Pide al administrador que te asigne uno.</div>;

    return (
        <div className="flex flex-col h-[calc(100vh-2rem)] w-full gap-4 text-left relative">
            <ConfirmModal 
                isOpen={confirmData.isOpen} 
                title={confirmData.title} 
                message={confirmData.message} 
                onConfirm={confirmData.action} 
                onCancel={() => setConfirmData(prev => ({ ...prev, isOpen: false }))} 
                isDestructive={confirmData.isDestructive} 
                showCancel={confirmData.showCancel}
            />
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-white/5">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="w-6 h-[2px] bg-emerald-500 rounded-md"></span>
                        <p className="text-[11px] font-black text-emerald-600 dark:text-[#00df82] tracking-[0.2em] uppercase">Operación diaria</p>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none font-heading">Agenda <span className="text-emerald-500 dark:text-[#00df82]">de Canchas</span></h1>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md overflow-hidden">
                        <button onClick={() => shiftDay(-1)} aria-label="Día anterior" className="p-2.5 text-slate-400 hover:text-emerald-600 dark:hover:text-[#00df82] hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                            <HugeiconsIcon icon={ArrowLeft01Icon} className="w-4 h-4" strokeWidth={2.2} />
                        </button>
                        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent px-2 text-[10px] font-black uppercase text-slate-700 dark:text-white outline-hidden cursor-pointer" />
                        <button onClick={() => shiftDay(1)} aria-label="Día siguiente" className="p-2.5 text-slate-400 hover:text-emerald-600 dark:hover:text-[#00df82] hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                            <HugeiconsIcon icon={ArrowRight01Icon} className="w-4 h-4" strokeWidth={2.2} />
                        </button>
                    </div>
                    <select value={selectedVenueId} onChange={(e) => setSelectedVenueId(e.target.value)} className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md px-3 py-2.5 text-[10px] font-black uppercase text-slate-700 dark:text-white outline-hidden cursor-pointer appearance-none min-w-[180px]">
                        {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="p-3 rounded-md bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5"><p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Hoy</p><h3 className="text-lg font-black text-slate-900 dark:text-white leading-none font-mono">{bookings.filter(b => b.status !== 'cancelled').length}</h3></div>
                <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20"><p className="text-[9px] font-black text-red-500 uppercase mb-0.5">Canceladas</p><h3 className="text-lg font-black text-red-600 dark:text-red-400 leading-none font-mono">{bookings.filter(b => b.status === 'cancelled').length}</h3></div>
                <div className="p-3 rounded-md bg-emerald-500/10 border border-emerald-500/20"><p className="text-[9px] font-black text-emerald-600 dark:text-[#00df82] uppercase mb-0.5">Recaudado</p><h3 className="text-lg font-black text-emerald-600 dark:text-[#00df82] leading-none font-mono">{formatCLP(bookings.reduce((acc, b) => acc + collectedAmount(b), 0))}</h3></div>
                <div className="p-3 rounded-md bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5"><p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Ocupación</p><h3 className="text-lg font-black text-slate-900 dark:text-white leading-none font-mono">{dashboardCourts.length > 0 ? Math.round((bookings.filter(b => b.status !== 'cancelled').reduce((a, b) => a + durationHours(b), 0) / (dashboardCourts.length * Math.max(1, calendarConfig.timeSlots.length))) * 100) : 0}%</h3></div>
                <div className="p-3 rounded-md bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5"><p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Canchas</p><h3 className="text-lg font-black text-emerald-600 dark:text-[#00df82] leading-none font-mono">{dashboardCourts.length}</h3></div>
            </div>

            <div className="flex-1 bg-white dark:bg-[#0B0F19] rounded-md border border-slate-100 dark:border-white/5 shadow-xs overflow-hidden flex flex-col min-h-0 relative">
                <div className="px-5 py-2 border-b border-slate-50 dark:border-white/5 flex flex-wrap gap-4 bg-slate-50/50 dark:bg-white/2">
                    {[['bg-emerald-500', 'Pagado'], ['bg-slate-400', 'Anulado']].map(([color, label]) => (
                        <div key={label} className="flex items-center gap-1.5"><div className={`w-2 h-2 rounded-full ${color}`}></div><span className="text-[9px] font-bold text-slate-400 uppercase">{label}</span></div>
                    ))}
                </div>

                <div className="flex-1 overflow-auto custom-scrollbar relative">
                    <div className="min-w-max h-full">
                        <div className="sticky top-0 z-30 bg-white/95 dark:bg-[#0B0F19]/95 backdrop-blur-md border-b border-slate-100 dark:border-white/10 flex ml-14">
                            {dashboardCourts.map(c => (
                                <div key={c.id} style={{ width: COLUMN_WIDTH }} className="shrink-0 py-3 text-center border-r border-slate-50 dark:border-white/5">
                                    <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mb-0.5">{c.sport}</p>
                                    <h4 className="text-[10px] font-black text-slate-800 dark:text-white uppercase">{c.name}</h4>
                                </div>
                            ))}
                        </div>
                        <div className="flex relative">
                            <div className="sticky left-0 z-20 w-14 bg-white dark:bg-[#0B0F19] border-r border-slate-100 dark:border-white/10">
                                {calendarConfig.timeSlots.map(h => <div key={h} style={{ height: HOUR_HEIGHT }} className="border-b border-slate-50 dark:border-white/3 flex items-start justify-center pt-2.5"><span className="text-[10px] font-mono font-bold text-slate-400">{h}</span></div>)}
                            </div>
                            <div className="relative flex">
                                {dashboardCourts.map(c => <div key={c.id} style={{ width: COLUMN_WIDTH }} className="border-r border-slate-50 dark:border-white/4 h-full pointer-events-none"></div>)}
                                {bookings.map(b => {
                                    const cIndex = dashboardCourts.findIndex(c => c.name === b.courtName);
                                    if (cIndex === -1) return null;
                                    return (
                                        <div key={b.id} onClick={() => setSelectedBooking(b)} className={`absolute z-10 p-2 mx-1 rounded-md border shadow-xs cursor-pointer flex flex-col justify-between overflow-hidden transition-all hover:brightness-95 ${getCardStyle(b.paymentStatus, b.status)}`} style={{ top: (b.extractedHour - calendarConfig.startHour) * HOUR_HEIGHT + 2, height: HOUR_HEIGHT - 4, left: cIndex * COLUMN_WIDTH, width: COLUMN_WIDTH - 8 }}>
                                            <div className="flex justify-between items-start gap-1">
                                                <div className="min-w-0">
                                                    <p className="text-[7px] font-black uppercase opacity-40 mb-0.5">#{b.id.slice(-4).toUpperCase()}</p>
                                                    <h5 className="text-[10px] font-black leading-tight uppercase truncate">{b.clientName || 'S/N'}</h5>
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-end pt-1 border-t border-black/10 dark:border-white/10">
                                                <span className="text-[8px] font-black opacity-70">{b.displayTime}</span>
                                                <span className="text-[9px] font-black">{formatCLP(b.finalPrice)}</span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {selectedBooking && (
                <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={() => setSelectedBooking(null)}>
                    <div className="bg-white dark:bg-[#0B0F19] w-full max-w-md rounded-md shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden max-h-[95vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className={`flex items-center justify-between px-6 py-4 text-white ${selectedBooking.status === 'cancelled' ? 'bg-red-500' : 'bg-emerald-500 dark:bg-[#00df82] dark:text-black'}`}>
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-md bg-white/20 flex items-center justify-center">
                                    <HugeiconsIcon icon={UserIcon} className="w-5 h-5" strokeWidth={1.8} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black uppercase font-heading">Reserva #{selectedBooking.id.slice(-6)}</h3>
                                    <p className="text-[9px] font-bold uppercase opacity-80 tracking-wider">{selectedBooking.status === 'cancelled' ? 'Anulada' : 'Confirmada'}</p>
                                </div>
                            </div>
                            <button aria-label="Cerrar" onClick={() => setSelectedBooking(null)} className="p-1.5 text-white/80 hover:text-white dark:text-black/60 hover:bg-white/10 rounded-md transition-all"><HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" strokeWidth={2} /></button>
                        </div>

                        <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
                            {/* CLIENTE */}
                            <div className="flex items-center gap-3 bg-slate-50 dark:bg-white/5 p-4 rounded-md border border-slate-200 dark:border-white/5">
                                <div className="w-11 h-11 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-[#00df82] shrink-0">
                                    <HugeiconsIcon icon={UserIcon} className="w-5 h-5" strokeWidth={1.6} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-black text-slate-900 dark:text-white uppercase truncate">{selectedBooking.clientName}</p>
                                    <p className="text-[10px] text-emerald-600 dark:text-[#00df82] font-bold">{selectedBooking.clientPhone}</p>
                                </div>
                                <a href={`https://wa.me/${toWhatsAppNumber(selectedBooking.clientPhone)}`} target="_blank" rel="noreferrer" className="p-2.5 bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black rounded-md active:scale-90 transition-all hover:brightness-110" title="Contactar por WhatsApp">
                                    <HugeiconsIcon icon={Message02Icon} className="w-4 h-4" strokeWidth={2} />
                                </a>
                            </div>

                            {/* DETALLE DE LA RESERVA */}
                            <div className="rounded-md bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 p-4 space-y-3">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <HugeiconsIcon icon={Calendar03Icon} className="w-3.5 h-3.5 text-emerald-600 dark:text-[#00df82]" strokeWidth={1.8} /> Detalle de la reserva
                                </p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <p className="text-[8px] font-black text-slate-400 uppercase mb-0.5">Cancha</p>
                                        <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase truncate">{selectedBooking.courtName || '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[8px] font-black text-slate-400 uppercase mb-0.5">Deporte</p>
                                        <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase truncate">{selectedBooking.sport || '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[8px] font-black text-slate-400 uppercase mb-0.5">Fecha</p>
                                        <p className="text-[10px] font-black text-slate-900 dark:text-white">{selectedBooking.date?.toDate ? selectedBooking.date.toDate().toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[8px] font-black text-slate-400 uppercase mb-0.5">Horario</p>
                                        <p className="text-[10px] font-black text-slate-900 dark:text-white">{selectedBooking.displayTime}{selectedBooking.endTime ? ` - ${selectedBooking.endTime}` : ''}</p>
                                    </div>
                                </div>
                                <div className="flex justify-between pt-2 border-t border-slate-100 dark:border-white/5">
                                    <p className="text-[8px] font-black text-slate-400 uppercase">Código</p>
                                    <p className="text-[10px] font-black text-emerald-600 dark:text-[#00df82] uppercase font-mono">#{selectedBooking.id.toUpperCase()}</p>
                                </div>
                            </div>

                            {/* PAGO */}
                            <div className="rounded-md bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 p-4 space-y-3">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <HugeiconsIcon icon={MoneyBag01Icon} className="w-3.5 h-3.5 text-emerald-600 dark:text-[#00df82]" strokeWidth={1.8} /> Estado de pago
                                </p>
                                <div className="flex items-center justify-between">
                                    <span className={`px-2.5 py-1 rounded-md text-[8px] font-black uppercase border ${
                                        selectedBooking.paymentStatus === 'paid' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-[#00df82]' :
                                        selectedBooking.paymentStatus === 'refunded' ? 'bg-sky-500/10 border-sky-500 text-sky-600 dark:text-sky-400' :
                                        'bg-red-500/10 border-red-500 text-red-600 dark:text-red-400'
                                    }`}>
                                        {selectedBooking.paymentStatus === 'paid' ? 'Pagado online' :
                                         selectedBooking.paymentStatus === 'refunded' ? 'Reembolsado' : 'Inasistencia'}
                                    </span>
                                    <span className="text-[9px] font-black text-slate-400 uppercase">Mercado Pago</span>
                                </div>
                                <div className="grid grid-cols-2 gap-3 pt-1">
                                    <div>
                                        <p className="text-[8px] font-black text-slate-400 uppercase mb-0.5">Monto del turno</p>
                                        <p className="text-base font-black text-slate-900 dark:text-white font-mono">{formatCLP(selectedBooking.finalPrice)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[8px] font-black text-slate-400 uppercase mb-0.5">Cobrado</p>
                                        <p className="text-base font-black text-slate-900 dark:text-white font-mono">{formatCLP(selectedBooking.paymentStatus === 'refunded' ? 0 : selectedBooking.finalPrice)}</p>
                                    </div>
                                </div>
                            </div>

                            {/* NOTAS */}
                            {selectedBooking.notes && (
                                <div className="rounded-md bg-amber-500/5 border border-amber-500/15 p-4">
                                    <p className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-1">Notas</p>
                                    <p className="text-[10px] text-slate-700 dark:text-slate-300">{selectedBooking.notes}</p>
                                </div>
                            )}

                            {/* RESPONSABLE */}
                            <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-white/5">
                                <p className="text-[8px] font-black text-slate-400 uppercase">Registrado por</p>
                                <p className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase">{selectedBooking.createdBy || 'Sistema'}</p>
                            </div>

                            {selectedBooking.status !== 'cancelled' && (
                                <button onClick={() => requestCancelBooking(selectedBooking)}
                                    className="w-full py-3 rounded-md border border-red-500/30 text-red-600 dark:text-red-400 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/5 transition-all">
                                    Anular reserva
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
