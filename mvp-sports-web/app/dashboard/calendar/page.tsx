"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/services/firebase';
import { collection, query, where, getDocs, Timestamp, doc, setDoc } from 'firebase/firestore';
import {
    CalendarDaysIcon, ClockIcon, BuildingStorefrontIcon,
    ChevronDownIcon, PlusIcon, XCircleIcon,
    XMarkIcon, CheckCircleIcon, UserIcon, ArrowPathIcon,
    BanknotesIcon, DevicePhoneMobileIcon, ComputerDesktopIcon,
    ExclamationCircleIcon, UserCircleIcon, ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';

const HOUR_HEIGHT = 80;
const COLUMN_WIDTH = 180;


const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, isDestructive = false, showCancel = true }: any) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn" onClick={onCancel}>
            <div className="bg-white dark:bg-[#0B0F19] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 w-full max-w-sm p-6 overflow-hidden relative" onClick={(e) => e.stopPropagation()}>
                <div className={`absolute top-0 left-0 w-full h-1 ${isDestructive ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tighter leading-none">{title}</h3>
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-8 uppercase leading-relaxed">{message}</p>
                <div className="flex gap-3 justify-end">
                    {showCancel && <button onClick={onCancel} className="px-5 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-200 transition-all">Cancelar</button>}
                    <button onClick={onConfirm} className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl text-white shadow-lg transition-all active:scale-95 ${isDestructive ? 'bg-red-600 shadow-red-500/20' : 'bg-emerald-600 shadow-emerald-500/20'}`}>{showCancel ? 'Confirmar' : 'Entendido'}</button>
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

export default function MasterCalendar() {
    const { user, firestoreUser, role } = useAuth();
    const [loading, setLoading] = useState(true);
    const [venues, setVenues] = useState<Venue[]>([]);
    const [selectedVenueId, setSelectedVenueId] = useState<string>('');
    const [dashboardCourts, setDashboardCourts] = useState<Court[]>([]);
    const [bookings, setBookings] = useState<any[]>([]);
    const [selectedDate, setSelectedDate] = useState(getChileDateISO());
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<any>(null);
    const [overlapError, setOverlapError] = useState<string | null>(null);
    const [creatingBooking, setCreatingBooking] = useState(false);
    const [priceAutoFilled, setPriceAutoFilled] = useState(false);
    const [modalCourts, setModalCourts] = useState<Court[]>([]);
    const [confirmData, setConfirmData] = useState<{ isOpen: boolean, title: string, message: string, action: () => void, isDestructive: boolean, showCancel?: boolean }>({ 
        isOpen: false, title: '', message: '', action: () => { }, isDestructive: false, showCancel: true 
    });

    const [newRes, setNewRes] = useState({ tenantId: '', date: '', courtId: '', clientName: '', clientPhone: '', startTime: '18:00', duration: '1.0', price: '', paymentStatus: 'paid', deposit: '0', paymentMethod: 'cash', notes: '' });

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
                    const tenantIds = firestoreUser?.tenantIds || [];
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
                } else {
                    const snap = await getDocs(query(collection(db, "tenants"), where("ownerId", "==", user.uid)));
                    list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Venue));
                }
                setVenues(list);
                if (list.length > 0) {
                    setSelectedVenueId(list[0].id);
                    setNewRes(prev => ({ ...prev, tenantId: list[0].id }));
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

            const baseD = new Date(selectedDate + "T00:00:00");
            const start = new Date(baseD);
            start.setHours(6, 0, 0, 0);
            const end = new Date(baseD);
            end.setDate(end.getDate() + 1);
            end.setHours(5, 59, 59, 999);
            const [snapByDate, snapByStartTime] = await Promise.all([
                getDocs(query(collection(db, "bookings"), where("tenantId", "==", selectedVenueId), where("date", ">=", Timestamp.fromDate(start)), where("date", "<=", Timestamp.fromDate(end)))).catch(() => ({ docs: [] as any[] })),
                getDocs(query(collection(db, "bookings"), where("tenantId", "==", selectedVenueId), where("startTime", ">=", Timestamp.fromDate(start)), where("startTime", "<=", Timestamp.fromDate(end)))).catch(() => ({ docs: [] as any[] }))
            ]);

            const allDocsMap = new Map<string, any>();
            [...snapByDate.docs, ...snapByStartTime.docs].forEach(d => { if (!allDocsMap.has(d.id)) allDocsMap.set(d.id, d); });

            const bookingsList = Array.from(allDocsMap.values()).map(d => {
                const data = d.data();
                const tsField = data.date || data.startTime;
                const dateObj = tsField?.toDate ? tsField.toDate() : new Date();
                
                let displayTime = typeof data.startTime === 'string' ? data.startTime : `${dateObj.getHours().toString().padStart(2, '0')}:00`;
                
                let extractedHour = dateObj.getHours() + (dateObj.getMinutes() / 60);
                if (typeof data.startTime === 'string' && data.startTime.includes(':')) {
                    const [h, m] = data.startTime.split(':').map(Number);
                    extractedHour = h + (m / 60);
                }

                // Ajuste para bloques de madrugada en la grilla visual
                if (extractedHour < 6) {
                    extractedHour += 24;
                }

                return { 
                    id: d.id, 
                    ...data, 
                    finalPrice: data.totalPrice || data.price || data.amount || 0, 
                    displayTime, 
                    extractedHour 
                };
            });
            setBookings(bookingsList);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    useEffect(() => { loadDashboardData(); }, [selectedVenueId, selectedDate]);

    useEffect(() => {
        const fetchModalCourts = async () => {
            if (!newRes.tenantId) return setModalCourts([]);
            if (newRes.tenantId === selectedVenueId) setModalCourts(dashboardCourts);
            else {
                const snap = await getDocs(query(collection(db, "courts"), where("tenantId", "==", newRes.tenantId)));
                setModalCourts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Court)).sort((a, b) => a.name.localeCompare(b.name)));
            }
        };
        if (newRes.tenantId) { setNewRes(prev => ({ ...prev, courtId: '' })); fetchModalCourts(); }
    }, [newRes.tenantId, selectedVenueId, dashboardCourts]);

    useEffect(() => {
        if (newRes.courtId && newRes.startTime && newRes.tenantId) {
            const venue = venues.find(v => v.id === newRes.tenantId);
            const court = modalCourts.find(c => c.id === newRes.courtId);
            if (venue?.pricing && court?.sport) {
                const price = venue.pricing[court.sport]?.[newRes.startTime];
                if (price) { setNewRes(prev => ({ ...prev, price: price.toString() })); setPriceAutoFilled(true); }
                else setPriceAutoFilled(false);
            } else setPriceAutoFilled(false);
        }
    }, [newRes.courtId, newRes.startTime, newRes.tenantId, venues, modalCourts]);

    const [availabilityStatus, setAvailabilityStatus] = useState<'idle' | 'checking' | 'available' | 'occupied'>('idle');
    const [occupiedBy, setOccupiedBy] = useState<string>('');

    useEffect(() => {
        if (!newRes.courtId || !newRes.startTime || !newRes.date) { setAvailabilityStatus('idle'); return; }
        if (newRes.date === selectedDate && newRes.tenantId === selectedVenueId) {
            const conflict = bookings.find(b => b.courtId === newRes.courtId && b.displayTime === newRes.startTime && b.status !== 'cancelled');
            if (conflict) { setAvailabilityStatus('occupied'); setOccupiedBy(conflict.clientName || 'Reserva existente'); }
            else { setAvailabilityStatus('available'); setOccupiedBy(''); }
        } else {
            const checkRemote = async () => {
                setAvailabilityStatus('checking');
                try {
                    const [ch, cm] = newRes.startTime.split(':').map(Number);
                    const checkDate = new Date(`${newRes.date}T00:00:00`);
                    checkDate.setHours(ch, cm, 0, 0);
                    if (ch < 6) checkDate.setDate(checkDate.getDate() + 1);
                    const snap = await getDocs(query(collection(db, "bookings"), where("tenantId", "==", newRes.tenantId), where("courtId", "==", newRes.courtId), where("date", ">=", Timestamp.fromDate(checkDate)), where("date", "<=", Timestamp.fromDate(new Date(checkDate.getTime() + 3599000)))));
                    const active = snap.docs.filter(d => d.data().status !== 'cancelled');
                    if (active.length > 0) { setAvailabilityStatus('occupied'); setOccupiedBy(active[0].data().clientName || 'Reserva existente'); }
                    else { setAvailabilityStatus('available'); setOccupiedBy(''); }
                } catch { setAvailabilityStatus('available'); }
            };
            checkRemote();
        }
    }, [newRes.courtId, newRes.startTime, newRes.date, newRes.tenantId, bookings, selectedDate, selectedVenueId]);

    const handleOpenAddModal = () => { setNewRes({ tenantId: selectedVenueId, date: selectedDate, courtId: '', clientName: '', clientPhone: '', startTime: '18:00', duration: '1.0', price: '', paymentStatus: 'paid', deposit: '0', paymentMethod: 'cash', notes: '' }); setOverlapError(null); setAvailabilityStatus('idle'); setPriceAutoFilled(false); setIsAddModalOpen(true); };

    const handleAddBooking = async (e: React.FormEvent) => {
        e.preventDefault();
        setOverlapError(null);
        if (!user || !newRes.tenantId || !newRes.courtId) return;
        if (!newRes.clientName.trim()) { setOverlapError("Falta nombre del cliente."); return; }
        if (!newRes.clientPhone.trim()) { setOverlapError("Falta teléfono."); return; }
        if (!newRes.price || Number(newRes.price) <= 0) { setOverlapError("Ingresa precio válido."); return; }
        if (availabilityStatus === 'occupied') { setOverlapError("Horario ocupado."); return; }
        const [bh, bm] = newRes.startTime.split(':').map(Number);
        const bookingDate = new Date(`${newRes.date}T00:00:00`);
        bookingDate.setHours(bh, bm, 0, 0);
        if (bh < 6) {
            bookingDate.setDate(bookingDate.getDate() + 1);
        }
        if (bookingDate < getChileNow()) { setOverlapError("No puedes reservar en el pasado."); return; }

        setCreatingBooking(true);
        try {
            const selectedCourt = modalCourts.find(c => c.id === newRes.courtId);
            const end = new Date(bookingDate.getTime() + parseFloat(newRes.duration) * 3600000);
            // Generate 6-digit custom alphanumeric ID
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            let bookingId = '';
            for (let i = 0; i < 6; i++) {
                bookingId += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            await setDoc(doc(db, "bookings", bookingId), { tenantId: newRes.tenantId, tenantName: venues.find(v => v.id === newRes.tenantId)?.name, courtId: newRes.courtId, courtName: selectedCourt?.name || 'Cancha', sport: selectedCourt?.sport || 'General', clientName: newRes.clientName, clientPhone: newRes.clientPhone, date: Timestamp.fromDate(bookingDate), startTime: newRes.startTime, endTime: `${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}`, duration: parseFloat(newRes.duration), price: Number(newRes.price), totalPrice: Number(newRes.price), deposit: Number(newRes.deposit), remainingBalance: Number(newRes.price) - Number(newRes.deposit), status: 'confirmed', paymentStatus: newRes.paymentStatus, paymentMethod: newRes.paymentMethod, notes: newRes.notes, source: 'manual_dashboard', ownerId: user.uid, createdAt: Timestamp.now(), createdBy: user.displayName || user.email });
            setIsAddModalOpen(false);
            if (newRes.date === selectedDate && newRes.tenantId === selectedVenueId) loadDashboardData();
        } catch (e) { 
            setConfirmData({
                isOpen: true,
                title: "Error al Guardar",
                message: "No pudimos sincronizar la reserva. Revisa tu conexión e intenta nuevamente.",
                isDestructive: true,
                showCancel: false,
                action: () => setConfirmData(prev => ({ ...prev, isOpen: false }))
            });
        } finally { setCreatingBooking(false); }
    };

    const getCardStyle = (paymentStatus: string, status: string) => {
        if (status === 'cancelled') return 'bg-slate-50 dark:bg-slate-900 border-slate-200 opacity-60';
        switch (paymentStatus) {
            case 'paid': return 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-500 text-emerald-800';
            case 'pending': return 'bg-sky-50 dark:bg-sky-500/10 border-sky-500 text-sky-800';
            case 'partial': return 'bg-amber-50 dark:bg-amber-500/10 border-amber-500 text-amber-800';
            default: return 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-500 text-indigo-800';
        }
    };

    if (loading && venues.length === 0) return <div className="text-center py-20 text-[10px] font-black uppercase text-slate-400 animate-pulse">Iniciando agenda...</div>;

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
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="w-6 h-[2px] bg-emerald-500 rounded-full"></span>
                        <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 tracking-wider uppercase">Operación Diaria</p>
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase leading-none">Agenda <span className="text-emerald-500">Maestra</span></h1>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase text-slate-700 dark:text-white outline-none cursor-pointer" />
                    <select value={selectedVenueId} onChange={(e) => setSelectedVenueId(e.target.value)} className="bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase text-slate-700 dark:text-white outline-none cursor-pointer appearance-none min-w-[180px]">
                        {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                    <button onClick={handleOpenAddModal} className="px-5 py-2.5 bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-900 rounded-xl text-[10px] font-black uppercase shadow-xl active:scale-95 flex items-center gap-2"><PlusIcon className="w-4 h-4" /> Nueva Reserva</button>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="p-3 rounded-xl border border-slate-100 dark:bg-[#0B0F19] dark:border-white/5 bg-white shadow-sm"><p className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">Hoy</p><h3 className="text-lg font-black text-slate-900 dark:text-white leading-none">{bookings.filter(b => b.status !== 'cancelled').length}</h3></div>
                <div className="p-3 rounded-xl border border-red-100 bg-red-50/50 dark:bg-red-500/5 shadow-sm"><p className="text-[9px] font-bold text-red-500 uppercase mb-0.5">Canceladas</p><h3 className="text-lg font-black text-red-600 leading-none">{bookings.filter(b => b.status === 'cancelled').length}</h3></div>
                <div className="p-3 rounded-xl border border-emerald-100 bg-emerald-50/50 dark:bg-emerald-500/5 shadow-sm"><p className="text-[9px] font-bold text-emerald-600 uppercase mb-0.5">Recaudado</p><h3 className="text-lg font-black text-emerald-600 leading-none">{formatCLP(bookings.filter(b => b.status !== 'cancelled').reduce((acc, b) => acc + (b.finalPrice || 0), 0))}</h3></div>
                <div className="p-3 rounded-xl border border-slate-100 dark:bg-[#0B0F19] dark:border-white/5 bg-white shadow-sm"><p className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">Ocupación</p><h3 className="text-lg font-black text-slate-900 dark:text-white leading-none">{dashboardCourts.length > 0 ? Math.round((bookings.length / (dashboardCourts.length * 14)) * 100) : 0}%</h3></div>
                <div className="p-3 rounded-xl border border-slate-100 dark:bg-[#0B0F19] dark:border-white/5 bg-white shadow-sm"><p className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">Canchas</p><h3 className="text-lg font-black text-emerald-600 leading-none">{dashboardCourts.length}</h3></div>
            </div>

            <div className="flex-1 bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden flex flex-col min-h-0 relative">
                <div className="px-5 py-2 border-b border-slate-50 dark:border-white/5 flex flex-wrap gap-4 bg-slate-50/50 dark:bg-white/[0.02]">
                    {[['bg-emerald-500', 'Pagado'], ['bg-sky-500', 'Pendiente'], ['bg-amber-500', 'Abono'], ['bg-slate-400', 'Anulado']].map(([color, label]) => (
                        <div key={label} className="flex items-center gap-1.5"><div className={`w-2 h-2 rounded-full ${color}`}></div><span className="text-[9px] font-bold text-slate-400 uppercase">{label}</span></div>
                    ))}
                </div>

                <div className="flex-1 overflow-auto custom-scrollbar relative">
                    <div className="min-w-max h-full">
                        <div className="sticky top-0 z-30 bg-white/95 dark:bg-[#0B0F19]/95 backdrop-blur-md border-b border-slate-100 dark:border-white/10 flex ml-14">
                            {dashboardCourts.map(c => (
                                <div key={c.id} style={{ width: COLUMN_WIDTH }} className="flex-shrink-0 py-3 text-center border-r border-slate-50 dark:border-white/5">
                                    <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mb-0.5">{c.sport}</p>
                                    <h4 className="text-[10px] font-black text-slate-800 dark:text-white uppercase">{c.name}</h4>
                                </div>
                            ))}
                        </div>
                        <div className="flex relative">
                            <div className="sticky left-0 z-20 w-14 bg-white dark:bg-[#0B0F19] border-r border-slate-100 dark:border-white/10">
                                {calendarConfig.timeSlots.map(h => <div key={h} style={{ height: HOUR_HEIGHT }} className="border-b border-slate-50 dark:border-white/[0.03] flex items-start justify-center pt-2.5"><span className="text-[10px] font-mono font-bold text-slate-400">{h}</span></div>)}
                            </div>
                            <div className="relative flex">
                                {dashboardCourts.map(c => <div key={c.id} style={{ width: COLUMN_WIDTH }} className="border-r border-slate-50 dark:border-white/[0.04] h-full pointer-events-none"></div>)}
                                {bookings.map(b => {
                                    const cIndex = dashboardCourts.findIndex(c => c.name === b.courtName);
                                    if (cIndex === -1) return null;
                                    return (
                                        <div key={b.id} onClick={() => setSelectedBooking(b)} className={`absolute z-10 p-2 mx-1 rounded-xl border-l-4 shadow-sm cursor-pointer flex flex-col justify-between overflow-hidden transition-all ${getCardStyle(b.paymentStatus, b.status)}`} style={{ top: (b.extractedHour - calendarConfig.startHour) * HOUR_HEIGHT + 2, height: HOUR_HEIGHT - 4, left: cIndex * COLUMN_WIDTH, width: COLUMN_WIDTH - 8 }}>
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="text-[8px] font-bold opacity-40 uppercase mb-0.5">#{b.id.toUpperCase()}</p>
                                                    <h5 className="text-[10px] font-black leading-tight uppercase truncate">{b.clientName || 'S/N'}</h5>
                                                </div>
                                                {b.paymentStatus !== 'paid' && b.status !== 'cancelled' && (
                                                    <div className="bg-white/40 dark:bg-black/20 p-1 rounded-lg">
                                                        <BanknotesIcon className="w-3 h-3 text-amber-600 animate-pulse" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex justify-between items-end pt-1 border-t border-black/5">
                                                <span className="text-[10px] font-black">{formatCLP(b.finalPrice)}</span>
                                                <CheckCircleIcon className={`w-3 h-3 ${b.paymentStatus === 'paid' ? 'opacity-40 text-emerald-600' : 'opacity-10'}`} />
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
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedBooking(null)}>
                    <div className="bg-white dark:bg-[#0B0F19] w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className={`p-4 flex justify-between items-center text-white ${selectedBooking.status === 'cancelled' ? 'bg-red-500' : 'bg-emerald-600'}`}>
                            <h3 className="text-xs font-black uppercase">Reserva #{selectedBooking.id.slice(-6)}</h3>
                            <button onClick={() => setSelectedBooking(null)} className="text-white/80 hover:text-white"><XMarkIcon className="w-5 h-5" /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="flex items-center gap-3 bg-slate-50 dark:bg-white/5 p-3 rounded-xl border border-slate-100 dark:border-white/5">
                                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500"><UserIcon className="w-5 h-5" /></div>
                                <div className="flex-1 truncate"><p className="text-sm font-black text-slate-900 dark:text-white uppercase truncate">{selectedBooking.clientName}</p><p className="text-[10px] text-emerald-500 font-bold">{selectedBooking.clientPhone}</p></div>
                                <a href={`https://wa.me/56${selectedBooking.clientPhone}`} target="_blank" rel="noreferrer" className="p-2 bg-emerald-500 text-white rounded-lg active:scale-90 transition-all"><ChatBubbleLeftRightIcon className="w-4 h-4" /></a>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-[10px] font-bold uppercase">
                                <div><p className="text-slate-400 mb-1">Responsable</p><p className="text-slate-900 dark:text-white">{selectedBooking.createdBy || 'Sistema'}</p></div>
                                <div><p className="text-slate-400 mb-1">Estado Pago</p>
                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${
                                        selectedBooking.paymentStatus === 'paid' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500' :
                                        selectedBooking.paymentStatus === 'pending' ? 'bg-sky-500/10 border-sky-500 text-sky-500' :
                                        'bg-amber-500/10 border-amber-500 text-amber-500'
                                    }`}>
                                        {selectedBooking.paymentStatus === 'paid' ? 'Pagado Total' :
                                         selectedBooking.paymentStatus === 'pending' ? 'Pago Pendiente' : 'Abono Parcial'}
                                    </span>
                                </div>
                            </div>
                            <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex justify-between items-end">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Monto Turno</p>
                                    <p className="text-xl font-black text-emerald-600">{formatCLP(selectedBooking.finalPrice)}</p>
                                    {selectedBooking.paymentStatus !== 'paid' && (
                                        <p className="text-[9px] font-black text-amber-500 mt-1 animate-pulse">POR COBRAR: {formatCLP(selectedBooking.finalPrice - (selectedBooking.deposit || 0))}</p>
                                    )}
                                </div>
                                <span className="px-3 py-1 bg-slate-100 dark:bg-white/5 rounded text-[10px] font-black text-slate-700 dark:text-white uppercase border border-slate-200 dark:border-white/10">{selectedBooking.displayTime} Hrs</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isAddModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={() => setIsAddModalOpen(false)}>
                    <div className="bg-white dark:bg-[#0B0F19] w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b border-slate-50 dark:border-white/5 flex justify-between items-center">
                            <h3 className="text-xs font-black uppercase text-slate-900 dark:text-white">Nueva Reserva Manual</h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400"><XMarkIcon className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleAddBooking} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest border-b border-slate-100 dark:border-white/5 pb-2">Información de Sesión</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Recinto</label><select required value={newRes.tenantId} onChange={e => setNewRes({ ...newRes, tenantId: e.target.value })} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-[10px] font-black uppercase outline-none">{venues.map(v => <option key={v.id} value={v.id} className="dark:bg-black">{v.name}</option>)}</select></div>
                                    <div><label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Fecha</label><input type="date" required value={newRes.date} onChange={e => setNewRes({ ...newRes, date: e.target.value })} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-[10px] font-black outline-none" /></div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Cancha</label><select required value={newRes.courtId} onChange={e => setNewRes({ ...newRes, courtId: e.target.value })} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-[10px] font-black uppercase outline-none"><option value="">Cancha...</option>{modalCourts.map(c => <option key={c.id} value={c.id} className="dark:bg-black">{c.name} ({c.sport})</option>)}</select></div>
                                    <div><label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Hora Inicio</label><select required value={newRes.startTime} onChange={e => setNewRes({ ...newRes, startTime: e.target.value })} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-[10px] font-black outline-none">{calendarConfig.timeSlots.map(t => <option key={t} value={t} className="dark:bg-black">{t}</option>)}</select></div>
                                </div>
                                <div className="pt-4 space-y-4">
                                    <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest border-b border-slate-100 dark:border-white/5 pb-2">Cliente</h4>
                                    <div><label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Nombre</label><input required type="text" value={newRes.clientName} onChange={e => setNewRes({ ...newRes, clientName: e.target.value })} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-[10px] font-black uppercase outline-none" /></div>
                                    <div><label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Teléfono</label><input required type="tel" value={newRes.clientPhone} onChange={e => setNewRes({ ...newRes, clientPhone: e.target.value })} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-[10px] font-black outline-none" /></div>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest border-b border-slate-100 dark:border-white/5 pb-2">Cobro y Pago</h4>
                                <div className="bg-slate-50 dark:bg-white/5 p-5 rounded-2xl border border-slate-100 dark:border-white/10 space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Monto (CLP)</label><input required type="number" value={newRes.price} onChange={e => { setNewRes({ ...newRes, price: e.target.value }); setPriceAutoFilled(false); }} className={`w-full bg-white dark:bg-black/20 border rounded-xl px-3 py-2 text-[11px] font-black outline-none ${priceAutoFilled ? 'border-emerald-500 text-emerald-600' : 'border-slate-200 dark:border-white/10 text-slate-900 dark:text-white'}`} /></div>
                                        <div><label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Estado</label><select value={newRes.paymentStatus} onChange={e => setNewRes({ ...newRes, paymentStatus: e.target.value, deposit: e.target.value === 'paid' ? newRes.price : '0' })} className="w-full bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-[10px] font-black uppercase outline-none"><option value="paid">PAGADO TOTAL</option><option value="partial">ABONO / PARCIAL</option><option value="pending">PENDIENTE</option></select></div>
                                    </div>
                                    {newRes.paymentStatus === 'partial' && (
                                        <div className="animate-slideIn">
                                            <label className="text-[10px] font-black text-emerald-500 uppercase block mb-1">Monto Abono</label>
                                            <input required type="number" value={newRes.deposit} onChange={e => setNewRes({ ...newRes, deposit: e.target.value })} className="w-full bg-white dark:bg-black/20 border-2 border-emerald-500 rounded-xl px-3 py-2 text-[11px] font-black text-emerald-600 outline-none" />
                                        </div>
                                    )}
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase block mb-2">Método</label>
                                        <div className="flex gap-2">
                                            {[['cash', 'Efectivo'], ['transfer', 'Transf.'], ['card', 'Tarjeta']].map(([val, label]) => (
                                                <button key={val} type="button" onClick={() => setNewRes({ ...newRes, paymentMethod: val })} className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase border transition-all ${newRes.paymentMethod === val ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400'}`}>{label}</button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    {(overlapError || availabilityStatus !== 'idle') && (
                                        <div className={`p-4 rounded-xl border text-[10px] font-black uppercase flex items-center gap-2 ${overlapError || availabilityStatus === 'occupied' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                                            {overlapError ? <><ExclamationCircleIcon className="w-4 h-4" /> {overlapError}</> : availabilityStatus === 'checking' ? <><ArrowPathIcon className="w-4 h-4 animate-spin" /> Verificando...</> : availabilityStatus === 'available' ? <><CheckCircleIcon className="w-4 h-4" /> Horario Disponible</> : <><ExclamationCircleIcon className="w-4 h-4" /> Ocupado por {occupiedBy.toUpperCase()}</>}
                                        </div>
                                    )}
                                    <div className="flex gap-4">
                                        <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-3.5 bg-slate-50 dark:bg-white/5 text-slate-400 rounded-xl text-[10px] font-black uppercase active:scale-95">Cancelar</button>
                                        <button type="submit" disabled={creatingBooking || availabilityStatus === 'occupied' || availabilityStatus === 'checking'} className="flex-[2] py-3.5 bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-900 rounded-xl text-[10px] font-black uppercase shadow-xl active:scale-95 disabled:opacity-50">Confirmar Reserva</button>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
