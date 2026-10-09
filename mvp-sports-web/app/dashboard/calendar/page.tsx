"use client";
import { HugeiconsIcon } from "@hugeicons/react";
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/services/firebase';
import { collection, getDocs, getDoc, query, where, orderBy, limit, doc, updateDoc, addDoc, deleteDoc, serverTimestamp, onSnapshot, Timestamp, writeBatch, setDoc } from 'firebase/firestore';
import { collectedAmount } from '@/utils/bookingMath';
import { auditService } from '@/services/auditService';
import {
    Add01Icon,
    Alert01Icon,
    Building01Icon,
    Calendar03Icon,
    Cancel01Icon,
    CheckmarkCircle02Icon,
    ChevronDownIcon,
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
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn" onClick={onCancel}>
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

    // Anular una reserva (cliente cancela o ingreso por error). Libera el horario
    // sin marcar inasistencia ni penalizar al jugador.
    const requestCancelBooking = (b: any) => {
        setConfirmData({
            isOpen: true,
            title: "Anular reserva",
            message: `¿Anular la reserva #${b.id} de ${b.clientName || 'cliente'} (${b.startTime})? El horario quedará disponible.` +
                (collectedAmount(b) > 0 ? ` Ya se cobraron ${formatCLP(collectedAmount(b))}: la devolución al cliente se gestiona aparte.` : ''),
            isDestructive: true,
            showCancel: true,
            action: async () => {
                setConfirmData(prev => ({ ...prev, isOpen: false }));
                try {
                    await updateDoc(doc(db, "bookings", b.id), {
                        status: 'cancelled',
                        cancelledBy: 'staff',
                        cancelledByUser: user?.email || user?.uid || null,
                        cancelledAt: Timestamp.now(),
                        updatedAt: Timestamp.now(),
                    });
                    await auditService.logAuditEvent({ action: 'RESERVA_ANULAR', module: 'Operación/Agenda', details: `Reserva ${b.id} anulada por personal (${b.clientName || ''} ${b.startTime})`, severity: 'MEDIUM', status: 'SUCCESS' });
                    setSelectedBooking(null);
                    loadDashboardData();
                } catch (e: any) {
                    setConfirmData({ isOpen: true, title: "No se pudo anular", message: e?.code === 'permission-denied' ? 'Tu cuenta no tiene permisos sobre esta reserva.' : 'Inténtalo nuevamente.', isDestructive: false, showCancel: false, action: () => setConfirmData(prev => ({ ...prev, isOpen: false })) });
                }
            },
        });
    };

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
        if (newRes.courtId && newRes.startTime && newRes.tenantId && newRes.date) {
            const venue = venues.find(v => v.id === newRes.tenantId);
            const court = modalCourts.find(c => c.id === newRes.courtId);
            if (venue?.pricing && court?.sport) {
                const day = new Date(newRes.date + "T12:00:00").getDay();
                const dayType = (day === 0 || day === 6) ? 'weekend' : 'weekday';
                const sportPricing: any = venue.pricing[court.sport] || {};
                const priceMap = sportPricing[dayType] || sportPricing;
                const price = Number(priceMap?.[newRes.startTime] || 0);
                if (price > 0) { setNewRes(prev => ({ ...prev, price: price.toString() })); setPriceAutoFilled(true); }
                else setPriceAutoFilled(false);
            } else setPriceAutoFilled(false);
        } else setPriceAutoFilled(false);
    }, [newRes.courtId, newRes.startTime, newRes.tenantId, newRes.date, venues, modalCourts]);

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
        // Se permite el bloque en curso (cliente que llega a jugar ahora); solo se
        // bloquean bloques que ya terminaron.
        const blockEnd = new Date(bookingDate.getTime() + (parseFloat(newRes.duration) || 1) * 3600000);
        if (blockEnd <= getChileNow()) { setOverlapError("Ese horario ya terminó."); return; }

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
            // Coherencia del cobro: pagado = total, pendiente = 0, abono = lo ingresado
            const paidNow = newRes.paymentStatus === 'paid' ? Number(newRes.price) : newRes.paymentStatus === 'pending' ? 0 : Number(newRes.deposit) || 0;
            await setDoc(doc(db, "bookings", bookingId), { tenantId: newRes.tenantId, tenantName: venues.find(v => v.id === newRes.tenantId)?.name, courtId: newRes.courtId, courtName: selectedCourt?.name || 'Cancha', sport: selectedCourt?.sport || 'General', clientName: newRes.clientName, clientPhone: newRes.clientPhone, date: Timestamp.fromDate(bookingDate), startTime: newRes.startTime, endTime: `${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}`, duration: parseFloat(newRes.duration), price: Number(newRes.price), totalPrice: Number(newRes.price), deposit: paidNow, remainingBalance: Math.max(0, Number(newRes.price) - paidNow), status: 'confirmed', paymentStatus: newRes.paymentStatus, paymentMethod: newRes.paymentMethod, notes: newRes.notes, source: 'manual_dashboard', ownerId: user.uid, createdAt: Timestamp.now(), createdBy: user.displayName || user.email });
            setIsAddModalOpen(false);
            if (newRes.date === selectedDate && newRes.tenantId === selectedVenueId) loadDashboardData();
            await auditService.logAuditEvent({
                action: 'RESERVA_CREAR_MANUAL',
                module: 'Operación/Agenda',
                details: `Reserva manual creada exitosamente. Código: ${bookingId} para ${newRes.clientName} (${newRes.date} ${newRes.startTime})`,
                severity: 'LOW',
                status: 'SUCCESS'
            });
        } catch (e: any) { 
            await auditService.logAuditEvent({
                action: 'RESERVA_CREAR_MANUAL',
                module: 'Operación/Agenda',
                details: `Falla al registrar reserva manual para ${newRes.clientName}: ${e.message || e}`,
                severity: 'LOW',
                status: 'FAILED'
            });
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
        if (status === 'cancelled') return 'bg-slate-50 dark:bg-slate-800/60 border-slate-300 dark:border-white/10 text-slate-500 dark:text-slate-400 opacity-60';
        switch (paymentStatus) {
            case 'paid': return 'bg-emerald-50 dark:bg-emerald-500/15 border-emerald-500 dark:border-[#00df82] text-emerald-800 dark:text-emerald-300';
            case 'pending': return 'bg-sky-50 dark:bg-sky-500/15 border-sky-500 text-sky-800 dark:text-sky-300';
            case 'partial': return 'bg-amber-50 dark:bg-amber-500/15 border-amber-500 text-amber-800 dark:text-amber-300';
            default: return 'bg-indigo-50 dark:bg-indigo-500/15 border-indigo-500 text-indigo-800 dark:text-indigo-300';
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
                        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent px-2 text-[10px] font-black uppercase text-slate-700 dark:text-white outline-none cursor-pointer" />
                        <button onClick={() => shiftDay(1)} aria-label="Día siguiente" className="p-2.5 text-slate-400 hover:text-emerald-600 dark:hover:text-[#00df82] hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                            <HugeiconsIcon icon={ArrowRight01Icon} className="w-4 h-4" strokeWidth={2.2} />
                        </button>
                    </div>
                    <select value={selectedVenueId} onChange={(e) => setSelectedVenueId(e.target.value)} className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md px-3 py-2.5 text-[10px] font-black uppercase text-slate-700 dark:text-white outline-none cursor-pointer appearance-none min-w-[180px]">
                        {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                    <button onClick={handleOpenAddModal} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black rounded-md text-[10px] font-black uppercase tracking-wider shadow-lg shadow-emerald-500/25 hover:brightness-110 active:scale-95 transition-all"><HugeiconsIcon icon={Add01Icon} className="w-4 h-4" strokeWidth={2} /> Nueva reserva</button>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="p-3 rounded-md bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5"><p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Hoy</p><h3 className="text-lg font-black text-slate-900 dark:text-white leading-none font-mono">{bookings.filter(b => b.status !== 'cancelled').length}</h3></div>
                <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20"><p className="text-[9px] font-black text-red-500 uppercase mb-0.5">Canceladas</p><h3 className="text-lg font-black text-red-600 dark:text-red-400 leading-none font-mono">{bookings.filter(b => b.status === 'cancelled').length}</h3></div>
                <div className="p-3 rounded-md bg-emerald-500/10 border border-emerald-500/20"><p className="text-[9px] font-black text-emerald-600 dark:text-[#00df82] uppercase mb-0.5">Recaudado</p><h3 className="text-lg font-black text-emerald-600 dark:text-[#00df82] leading-none font-mono">{formatCLP(bookings.reduce((acc, b) => acc + collectedAmount(b), 0))}</h3></div>
                <div className="p-3 rounded-md bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5"><p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Ocupación</p><h3 className="text-lg font-black text-slate-900 dark:text-white leading-none font-mono">{dashboardCourts.length > 0 ? Math.round((bookings.filter(b => b.status !== 'cancelled').length / (dashboardCourts.length * 14)) * 100) : 0}%</h3></div>
                <div className="p-3 rounded-md bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5"><p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Canchas</p><h3 className="text-lg font-black text-emerald-600 dark:text-[#00df82] leading-none font-mono">{dashboardCourts.length}</h3></div>
            </div>

            <div className="flex-1 bg-white dark:bg-[#0B0F19] rounded-md border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden flex flex-col min-h-0 relative">
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
                                        <div key={b.id} onClick={() => setSelectedBooking(b)} className={`absolute z-10 p-2 mx-1 rounded-md border-l-4 shadow-sm cursor-pointer flex flex-col justify-between overflow-hidden transition-all hover:brightness-95 ${getCardStyle(b.paymentStatus, b.status)}`} style={{ top: (b.extractedHour - calendarConfig.startHour) * HOUR_HEIGHT + 2, height: HOUR_HEIGHT - 4, left: cIndex * COLUMN_WIDTH, width: COLUMN_WIDTH - 8 }}>
                                            <div className="flex justify-between items-start gap-1">
                                                <div className="min-w-0">
                                                    <p className="text-[7px] font-black uppercase opacity-40 mb-0.5">#{b.id.slice(-4).toUpperCase()}</p>
                                                    <h5 className="text-[10px] font-black leading-tight uppercase truncate">{b.clientName || 'S/N'}</h5>
                                                </div>
                                                {b.paymentStatus !== 'paid' && b.status !== 'cancelled' && (
                                                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0 mt-0.5" />
                                                )}
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
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={() => setSelectedBooking(null)}>
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
                            <button onClick={() => setSelectedBooking(null)} className="p-1.5 text-white/80 hover:text-white dark:text-black/60 hover:bg-white/10 rounded-md transition-all"><HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" strokeWidth={2} /></button>
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
                                        selectedBooking.paymentStatus === 'pending' ? 'bg-sky-500/10 border-sky-500 text-sky-600 dark:text-sky-400' :
                                        'bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400'
                                    }`}>
                                        {selectedBooking.paymentStatus === 'paid' ? 'Pagado total' :
                                         selectedBooking.paymentStatus === 'pending' ? 'Pago pendiente' : 'Abono parcial'}
                                    </span>
                                    <span className="text-[9px] font-black text-slate-400 uppercase">{selectedBooking.paymentMethod || '—'}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-3 pt-1">
                                    <div>
                                        <p className="text-[8px] font-black text-slate-400 uppercase mb-0.5">Monto del turno</p>
                                        <p className="text-base font-black text-slate-900 dark:text-white font-mono">{formatCLP(selectedBooking.finalPrice)}</p>
                                    </div>
                                    {selectedBooking.paymentStatus !== 'paid' && (
                                        <div>
                                            <p className="text-[8px] font-black text-slate-400 uppercase mb-0.5">Por cobrar</p>
                                            <p className="text-base font-black text-amber-600 dark:text-amber-400 font-mono animate-pulse">{formatCLP(selectedBooking.finalPrice - (selectedBooking.deposit || 0))}</p>
                                        </div>
                                    )}
                                    {selectedBooking.paymentStatus === 'paid' && (
                                        <div>
                                            <p className="text-[8px] font-black text-slate-400 uppercase mb-0.5">Abono</p>
                                            <p className="text-base font-black text-slate-900 dark:text-white font-mono">{formatCLP(selectedBooking.deposit || selectedBooking.finalPrice)}</p>
                                        </div>
                                    )}
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

            {isAddModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={() => setIsAddModalOpen(false)}>
                    <div className="bg-white dark:bg-[#0B0F19] w-full max-w-4xl rounded-md shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden max-h-[95vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-[#00df82]">
                                    <HugeiconsIcon icon={Add01Icon} className="w-5 h-5" strokeWidth={2} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white font-heading">Nueva reserva manual</h3>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Registro directo en la agenda</p>
                                </div>
                            </div>
                            <button onClick={() => setIsAddModalOpen(false)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-all"><HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" strokeWidth={2} /></button>
                        </div>

                        <form onSubmit={handleAddBooking} className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-y-auto custom-scrollbar">
                            {/* COLUMNA IZQUIERDA */}
                            <div className="space-y-5">
                                <div className="rounded-md bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 p-5 space-y-4">
                                    <div className="flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-3">
                                        <HugeiconsIcon icon={Calendar03Icon} className="w-4 h-4 text-emerald-600 dark:text-[#00df82]" strokeWidth={1.8} />
                                        <h4 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest font-heading">Información de sesión</h4>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">Recinto</label>
                                            <select required value={newRes.tenantId} onChange={e => setNewRes({ ...newRes, tenantId: e.target.value })} className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md px-3 py-2.5 text-[10px] font-black uppercase outline-none focus:border-emerald-500/40 transition-all">
                                                {venues.map(v => <option key={v.id} value={v.id} className="dark:bg-black">{v.name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">Fecha</label>
                                            <input type="date" required value={newRes.date} onChange={e => setNewRes({ ...newRes, date: e.target.value })} className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md px-3 py-2.5 text-[10px] font-black outline-none focus:border-emerald-500/40 transition-all" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">Cancha</label>
                                            <select required value={newRes.courtId} onChange={e => setNewRes({ ...newRes, courtId: e.target.value })} className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md px-3 py-2.5 text-[10px] font-black uppercase outline-none focus:border-emerald-500/40 transition-all">
                                                <option value="">Selecciona...</option>
                                                {modalCourts.map(c => <option key={c.id} value={c.id} className="dark:bg-black">{c.name} ({c.sport})</option>)}
                                            </select>
                                        </div>
<div>
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">Hora inicio</label>
                                        <select required value={newRes.startTime} onChange={e => setNewRes({ ...newRes, startTime: e.target.value })} className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md px-3 py-2.5 text-[10px] font-black outline-none focus:border-emerald-500/40 transition-all">
                                            {calendarConfig.timeSlots.map(t => <option key={t} value={t} className="dark:bg-black">{t}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                                <div className="rounded-md bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 p-5 space-y-4">
                                    <div className="flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-3">
                                        <HugeiconsIcon icon={UserCircleIcon} className="w-4 h-4 text-emerald-600 dark:text-[#00df82]" strokeWidth={1.8} />
                                        <h4 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest font-heading">Cliente</h4>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">Nombre</label>
                                            <input required type="text" value={newRes.clientName} onChange={e => setNewRes({ ...newRes, clientName: e.target.value })} placeholder="Nombre del jugador" className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md px-3 py-2.5 text-[10px] font-black uppercase outline-none focus:border-emerald-500/40 transition-all" />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">Teléfono</label>
                                            <input required type="tel" value={newRes.clientPhone} onChange={e => setNewRes({ ...newRes, clientPhone: e.target.value })} placeholder="+56 9..." className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md px-3 py-2.5 text-[10px] font-black outline-none focus:border-emerald-500/40 transition-all" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">Notas (opcional)</label>
                                        <textarea rows={2} value={newRes.notes} onChange={e => setNewRes({ ...newRes, notes: e.target.value })} placeholder="Comentarios para el recinto..." className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md px-3 py-2.5 text-[10px] font-black uppercase outline-none focus:border-emerald-500/40 transition-all resize-none" />
                                    </div>
                                </div>
                            </div>

                            {/* COLUMNA DERECHA */}
                            <div className="space-y-5">
                                <div className="rounded-md bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 p-5 space-y-4">
                                    <div className="flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-3">
                                        <HugeiconsIcon icon={MoneyBag01Icon} className="w-4 h-4 text-emerald-600 dark:text-[#00df82]" strokeWidth={1.8} />
                                        <h4 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest font-heading">Cobro y pago</h4>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">Monto (CLP)</label>
                                            <input required type="number" value={newRes.price} onChange={e => { setNewRes({ ...newRes, price: e.target.value }); setPriceAutoFilled(false); }} className={`w-full bg-white dark:bg-white/5 border rounded-md px-3 py-2.5 text-[11px] font-black outline-none transition-all ${priceAutoFilled ? 'border-emerald-500 text-emerald-600 dark:text-[#00df82]' : 'border-slate-200 dark:border-white/10 text-slate-900 dark:text-white'}`} />
                                            {priceAutoFilled && <p className="text-[8px] font-black text-emerald-600 dark:text-[#00df82] uppercase mt-1">Auto-completado según tarifa</p>}
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">Estado de pago</label>
                                            <select value={newRes.paymentStatus} onChange={e => setNewRes({ ...newRes, paymentStatus: e.target.value, deposit: e.target.value === 'paid' ? newRes.price : '0' })} className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md px-3 py-2.5 text-[10px] font-black uppercase outline-none focus:border-emerald-500/40 transition-all">
                                                <option value="paid">Pagado total</option>
                                                <option value="partial">Abono / parcial</option>
                                                <option value="pending">Pendiente</option>
                                            </select>
                                        </div>
                                    </div>
                                    {newRes.paymentStatus === 'partial' && (
                                        <div className="animate-slideIn">
                                            <label className="text-[9px] font-black text-emerald-600 dark:text-[#00df82] uppercase tracking-wider block mb-1.5">Monto abono</label>
                                            <input required type="number" value={newRes.deposit} onChange={e => setNewRes({ ...newRes, deposit: e.target.value })} className="w-full bg-white dark:bg-white/5 border-2 border-emerald-500 dark:border-[#00df82] rounded-md px-3 py-2.5 text-[11px] font-black text-emerald-600 dark:text-[#00df82] outline-none" />
                                        </div>
                                    )}
                                    <div>
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-2">Método de pago</label>
                                        <div className="flex gap-2">
                                            {[['cash', 'Efectivo'], ['transfer', 'Transferencia'], ['card', 'Tarjeta']].map(([val, label]) => (
                                                <button key={val} type="button" onClick={() => setNewRes({ ...newRes, paymentMethod: val })} className={`flex-1 py-2 rounded-md text-[9px] font-black uppercase border transition-all ${newRes.paymentMethod === val ? 'bg-emerald-500 dark:bg-[#00df82] border-emerald-500 dark:border-[#00df82] text-white dark:text-black shadow-lg shadow-emerald-500/20' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 hover:border-emerald-400/40'}`}>{label}</button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* DISPONIBILIDAD */}
                                <div className={`rounded-md border p-4 text-[10px] font-black uppercase flex items-center gap-2.5 ${overlapError || availabilityStatus === 'occupied' ? 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400' : availabilityStatus === 'checking' ? 'bg-sky-500/10 border-sky-500/30 text-sky-600 dark:text-sky-400' : availabilityStatus === 'available' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-[#00df82]' : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500'}`}>
                                    {overlapError ? <><HugeiconsIcon icon={Alert01Icon} className="w-4 h-4" strokeWidth={2} /> {overlapError}</> : availabilityStatus === 'checking' ? <><HugeiconsIcon icon={RefreshIcon} className="w-4 h-4 animate-spin" strokeWidth={2} /> Verificando disponibilidad...</> : availabilityStatus === 'available' ? <><HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-4 h-4" strokeWidth={2} /> Horario disponible</> : availabilityStatus === 'occupied' ? <><HugeiconsIcon icon={Alert01Icon} className="w-4 h-4" strokeWidth={2} /> Ocupado por {occupiedBy.toUpperCase()}</> : <><HugeiconsIcon icon={Clock01Icon} className="w-4 h-4" strokeWidth={2} /> Completa los datos para verificar</>}
                                </div>

                                {/* RESUMEN */}
                                <div className="rounded-md bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 p-5 space-y-2.5">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Resumen de la reserva</p>
                                    <div className="flex justify-between text-[10px] font-black uppercase">
                                        <span className="text-slate-400">Cancha</span>
                                        <span className="text-slate-900 dark:text-white truncate max-w-[60%]">{modalCourts.find(c => c.id === newRes.courtId)?.name || '—'}</span>
                                    </div>
                                    <div className="flex justify-between text-[10px] font-black uppercase">
                                        <span className="text-slate-400">Fecha</span>
                                        <span className="text-slate-900 dark:text-white">{newRes.date ? new Date(newRes.date + "T12:00:00").toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }) : '—'}</span>
                                    </div>
                                    <div className="flex justify-between text-[10px] font-black uppercase">
                                        <span className="text-slate-400">Horario</span>
                                        <span className="text-slate-900 dark:text-white">{newRes.startTime}</span>
                                    </div>
                                    <div className="flex justify-between text-[10px] font-black uppercase">
                                        <span className="text-slate-400">Cliente</span>
                                        <span className="text-slate-900 dark:text-white truncate max-w-[60%]">{newRes.clientName || '—'}</span>
                                    </div>
                                    <div className="pt-2 mt-1 border-t border-slate-200 dark:border-white/10 space-y-1.5">
                                        <div className="flex justify-between text-[10px] font-black uppercase">
                                            <span className="text-slate-400">Monto</span>
                                            <span className="text-slate-900 dark:text-white font-mono">{formatCLP(newRes.price)}</span>
                                        </div>
                                        {newRes.paymentStatus === 'partial' && (
                                            <div className="flex justify-between text-[10px] font-black uppercase">
                                                <span className="text-slate-400">Abono</span>
                                                <span className="text-emerald-600 dark:text-[#00df82] font-mono">{formatCLP(newRes.deposit)}</span>
                                            </div>
                                        )}
                                        {newRes.paymentStatus !== 'paid' && (
                                            <div className="flex justify-between text-[10px] font-black uppercase">
                                                <span className="text-slate-400">Por cobrar</span>
                                                <span className="text-amber-600 dark:text-amber-400 font-mono">{formatCLP(Number(newRes.price || 0) - Number(newRes.deposit || 0))}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-3.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 rounded-md text-[10px] font-black uppercase tracking-wider active:scale-95 transition-all">Cancelar</button>
                                    <button type="submit" disabled={creatingBooking || availabilityStatus === 'occupied' || availabilityStatus === 'checking'} className="flex-[2] py-3.5 bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black rounded-md text-[10px] font-black uppercase tracking-wider shadow-xl active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">{creatingBooking ? <><HugeiconsIcon icon={RefreshIcon} className="w-4 h-4 animate-spin" strokeWidth={2} /> Guardando...</> : <><HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-4 h-4" strokeWidth={2} /> Confirmar reserva</>}</button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
