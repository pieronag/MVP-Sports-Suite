"use client";
import React, { useState, useEffect } from 'react';
import { 
    XMarkIcon, ExclamationCircleIcon, ArrowPathIcon, CheckCircleIcon 
} from '@heroicons/react/24/outline';
import { 
    collection, query, where, getDocs, doc, getDoc, addDoc, Timestamp 
} from 'firebase/firestore';
import { db } from '@/services/firebase';

interface Court {
    id: string;
    name: string;
    sport: string;
}

interface ManualBookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    tenantId: string;
    onSuccess: () => void;
}

export default function ManualBookingModal({ isOpen, onClose, tenantId, onSuccess }: ManualBookingModalProps) {
    const [loading, setLoading] = useState(false);
    const [courts, setCourts] = useState<Court[]>([]);
    const [tenantPricing, setTenantPricing] = useState<Record<string, Record<string, number>>>({});
    const [formData, setFormData] = useState({
        clientName: '',
        clientPhone: '',
        date: new Date().toISOString().split('T')[0],
        time: '18:00',
        courtId: '',
        duration: '1.0', // Duración en horas
        price: '',
        paymentStatus: 'paid', // paid, pending, partial
        deposit: '0',
        paymentMethod: 'cash', // cash, transfer, card
        notes: ''
    });
    const [availStatus, setAvailStatus] = useState<'idle' | 'checking' | 'available' | 'occupied'>('idle');
    const [occupiedBy, setOccupiedBy] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [priceAutoFilled, setPriceAutoFilled] = useState(false);

    const TIME_SLOTS = Array.from({ length: 32 }, (_, i) => {
        const totalMinutes = 8 * 60 + i * 30; // Empezar a las 08:00
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    });

    const formatCLP = (amount: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(amount);

    // Load courts + tenant pricing
    useEffect(() => {
        if (isOpen && tenantId) {
            const loadData = async () => {
                const cq = query(collection(db, "courts"), where("tenantId", "==", tenantId));
                const cSnap = await getDocs(cq);
                const list = cSnap.docs.map(d => ({ id: d.id, name: d.data().name, sport: d.data().sport || '' } as Court));
                setCourts(list);

                const tDoc = await getDoc(doc(db, "tenants", tenantId));
                if (tDoc.exists()) {
                    setTenantPricing(tDoc.data().pricing || {});
                }
            };
            loadData();
            setFormData({ 
                clientName: '', 
                clientPhone: '', 
                date: new Date().toISOString().split('T')[0], 
                time: '18:00', 
                courtId: '', 
                duration: '1.0',
                price: '', 
                paymentStatus: 'paid',
                deposit: '0',
                paymentMethod: 'cash',
                notes: ''
            });
            setAvailStatus('idle');
            setOccupiedBy('');
            setErrorMsg('');
            setPriceAutoFilled(false);
        }
    }, [isOpen, tenantId]);

    // Auto-fill price when court + time change
    useEffect(() => {
        if (!formData.courtId || !formData.time) return;
        const court = courts.find(c => c.id === formData.courtId);
        if (!court || !court.sport) return;
        const sportPricing = tenantPricing[court.sport];
        if (sportPricing && sportPricing[formData.time] !== undefined) {
            setFormData(prev => ({ ...prev, price: String(sportPricing[formData.time]) }));
            setPriceAutoFilled(true);
        } else {
            setPriceAutoFilled(false);
        }
    }, [formData.courtId, formData.time, courts, tenantPricing]);

    // Live availability check
    useEffect(() => {
        if (!formData.courtId || !formData.time || !formData.date || !tenantId) {
            setAvailStatus('idle');
            return;
        }
        const check = async () => {
            setAvailStatus('checking');
            try {
                const checkDate = new Date(`${formData.date}T${formData.time}`);
                const startOfHour = Timestamp.fromDate(checkDate);
                const endOfHour = Timestamp.fromDate(new Date(checkDate.getTime() + 3599000));

                const q1 = query(
                    collection(db, "bookings"),
                    where("tenantId", "==", tenantId),
                    where("courtId", "==", formData.courtId),
                    where("date", ">=", startOfHour),
                    where("date", "<=", endOfHour)
                );
                const q2 = query(
                    collection(db, "bookings"),
                    where("tenantId", "==", tenantId),
                    where("courtId", "==", formData.courtId),
                    where("startTime", ">=", startOfHour),
                    where("startTime", "<=", endOfHour)
                );

                const [snap1, snap2] = await Promise.all([
                    getDocs(q1).catch(() => ({ docs: [] as any[] })),
                    getDocs(q2).catch(() => ({ docs: [] as any[] }))
                ]);

                const allDocsMap = new Map<string, any>();
                [...snap1.docs, ...snap2.docs].forEach(d => { if (!allDocsMap.has(d.id)) allDocsMap.set(d.id, d); });

                const active = Array.from(allDocsMap.values()).filter(d => d.data().status !== 'cancelled');
                if (active.length > 0) {
                    setAvailStatus('occupied');
                    setOccupiedBy(active[0].data().clientName || 'Reserva existente');
                } else {
                    setAvailStatus('available');
                    setOccupiedBy('');
                }
            } catch {
                setAvailStatus('available');
            }
        };
        check();
    }, [formData.courtId, formData.time, formData.date, tenantId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        if (!formData.clientName.trim()) { setErrorMsg('Ingresa el nombre del cliente.'); return; }
        if (!formData.clientPhone.trim()) { setErrorMsg('Ingresa el teléfono del cliente.'); return; }
        if (!formData.courtId) { setErrorMsg('Selecciona una cancha.'); return; }
        if (!formData.price || Number(formData.price) <= 0) { setErrorMsg('Ingresa un precio válido.'); return; }
        if (availStatus === 'occupied') { setErrorMsg('Horario ocupado por: ' + occupiedBy); return; }

        setLoading(true);
        try {
            const [y, m, d] = formData.date.split('-').map(Number);
            const [hr, min] = formData.time.split(':').map(Number);
            const start = new Date(y, m - 1, d, hr, min);
            const durationHrs = parseFloat(formData.duration);
            const end = new Date(start.getTime() + durationHrs * 3600000);
            
            const selectedCourt = courts.find(c => c.id === formData.courtId);

            await addDoc(collection(db, "bookings"), {
                tenantId,
                courtId: formData.courtId,
                courtName: selectedCourt?.name || 'Cancha',
                sport: selectedCourt?.sport || 'General',
                clientName: formData.clientName,
                clientPhone: formData.clientPhone,
                date: Timestamp.fromDate(start),
                startTime: formData.time,
                endTime: `${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}`,
                duration: durationHrs,
                price: Number(formData.price),
                totalPrice: Number(formData.price),
                deposit: Number(formData.deposit),
                remainingBalance: Number(formData.price) - Number(formData.deposit),
                paymentStatus: formData.paymentStatus,
                paymentMethod: formData.paymentMethod,
                notes: formData.notes,
                status: formData.paymentStatus === 'paid' ? 'confirmed' : 'pending',
                source: 'manual_manager',
                createdAt: new Date()
            });
            onSuccess();
            onClose();
        } catch (e) { alert("Error al guardar reserva."); }
        finally { setLoading(false); }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn" onClick={onClose}>
            <div className="bg-white dark:bg-[#0B0F19] w-full max-w-3xl rounded-[32px] shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
                    <div>
                        <h3 className="text-xs font-black uppercase text-slate-900 dark:text-white">RESERVA MANUAL</h3>
                        <p className="text-[9px] text-slate-400 mt-0.5 uppercase font-bold">COMPLETA LOS DATOS — EL PRECIO SE ASIGNA AUTOMÁTICAMENTE</p>
                    </div>
                    <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"><XMarkIcon className="w-5 h-5" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* COLUMNA IZQUIERDA: DATOS DE RESERVA */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em] mb-2">Datos de la Sesión</h4>
                            
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Cancha</label>
                                    <select required className="w-full mt-1.5 px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-[11px] font-semibold uppercase outline-none focus:border-emerald-500 transition-all shadow-sm"
                                        value={formData.courtId} onChange={e => setFormData({ ...formData, courtId: e.target.value })}>
                                        <option value="">Cancha...</option>
                                        {courts.map(c => <option key={c.id} value={c.id} className="uppercase">{c.name} ({c.sport})</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Hora</label>
                                    <select required className="w-full mt-1.5 px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-[11px] font-semibold outline-none focus:border-emerald-500 transition-all shadow-sm"
                                        value={formData.time} onChange={e => setFormData({ ...formData, time: e.target.value })}>
                                        {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Fecha de Reserva</label>
                                <input type="date" required className="w-full mt-1.5 px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-[11px] font-semibold outline-none focus:border-emerald-500 transition-all shadow-sm uppercase"
                                    value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                            </div>

                            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-white/5">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Nombre del Cliente</label>
                                    <input type="text" required className="w-full mt-1.5 px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-[11px] font-semibold outline-none placeholder:normal-case focus:border-emerald-500 transition-all shadow-sm"
                                        value={formData.clientName} onChange={e => setFormData({ ...formData, clientName: e.target.value })} placeholder="EJ: JUAN PÉREZ" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Teléfono Móvil</label>
                                    <input type="tel" required className="w-full mt-1.5 px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-[11px] font-semibold outline-none focus:border-emerald-500 transition-all shadow-sm font-mono"
                                        value={formData.clientPhone} onChange={e => setFormData({ ...formData, clientPhone: e.target.value })} placeholder="+569 1234 5678" />
                                </div>
                            </div>
                        </div>

                        {/* COLUMNA DERECHA: FINANZAS Y CONTROL */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em] mb-2">Administración Financiera</h4>
                            
                            <div className="bg-slate-50 dark:bg-white/[0.02] p-4 rounded-[24px] border border-slate-200 dark:border-white/10 space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Valor Total</label>
                                        <input type="number" required className={`w-full mt-1.5 px-4 py-2 bg-white dark:bg-black/20 border rounded-xl text-[11px] font-bold outline-none font-mono transition-all ${priceAutoFilled ? 'border-emerald-300 dark:border-emerald-500/40 text-emerald-600' : 'border-slate-200 dark:border-white/10'}`}
                                            value={formData.price} onChange={e => { setFormData({ ...formData, price: e.target.value }); setPriceAutoFilled(false); }} placeholder="0" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Estado de Pago</label>
                                        <select required className="w-full mt-1.5 px-4 py-2 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-[11px] font-semibold outline-none focus:border-emerald-500 transition-all"
                                            value={formData.paymentStatus} onChange={e => setFormData({ ...formData, paymentStatus: e.target.value, deposit: e.target.value === 'paid' ? formData.price : e.target.value === 'pending' ? '0' : formData.deposit })}>
                                            <option value="paid">PAGADO TOTAL</option>
                                            <option value="partial">ABONO / PARCIAL</option>
                                            <option value="pending">PENDIENTE</option>
                                        </select>
                                    </div>
                                </div>

                                {formData.paymentStatus === 'partial' && (
                                    <div className="animate-slideIn">
                                        <label className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Monto del Abono</label>
                                        <div className="relative mt-1.5">
                                            <input type="number" required className="w-full pl-10 pr-4 py-2 bg-white dark:bg-black/20 border-2 border-emerald-500 rounded-xl text-[11px] font-bold outline-none font-mono text-emerald-600 shadow-[0_0_15px_-3px_rgba(16,185,129,0.2)]"
                                                value={formData.deposit} onChange={e => setFormData({ ...formData, deposit: e.target.value })} />
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-emerald-500">$</span>
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Método de Operación</label>
                                    <div className="flex gap-2 mt-2">
                                        {['cash', 'transfer', 'card'].map(m => (
                                            <button key={m} type="button" onClick={() => setFormData({ ...formData, paymentMethod: m })}
                                                className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase transition-all border ${formData.paymentMethod === m ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400'}`}>
                                                {m === 'cash' ? 'Efectivo' : m === 'transfer' ? 'Transf.' : 'Tarjeta'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {availStatus !== 'idle' && (
                        <div className={`mt-6 flex items-center gap-3 px-5 py-3 rounded-[20px] border text-[11px] font-black transition-all uppercase tracking-widest ${availStatus === 'checking' ? 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500' :
                            availStatus === 'available' ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400' :
                                'bg-red-50 dark:bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400 animate-pulse'
                            }`}>
                            {availStatus === 'checking' && <><ArrowPathIcon className="w-4 h-4 animate-spin" /> Verificando integridad de agenda...</>}
                            {availStatus === 'available' && <><CheckCircleIcon className="w-4 h-4" /> Horario 100% Disponible</>}
                            {availStatus === 'occupied' && <><ExclamationCircleIcon className="w-4 h-4" /> Alerta: Ocupado por {occupiedBy.toUpperCase()}</>}
                        </div>
                    )}

                    <div className="pt-8 flex gap-4">
                        <button type="button" onClick={onClose} className="flex-1 py-3 bg-white dark:bg-white/5 text-slate-500 border-2 border-slate-100 dark:border-white/5 text-[10px] font-black uppercase rounded-2xl hover:bg-slate-50 transition-all active:scale-95">CANCELAR OPERACIÓN</button>
                        <button type="submit" disabled={loading || availStatus === 'occupied'} className="flex-[2] py-3 bg-emerald-600 text-white text-[10px] font-black uppercase rounded-2xl shadow-2xl shadow-emerald-500/30 flex items-center justify-center gap-3 hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale">
                            {loading ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <CheckCircleIcon className="w-4 h-4" />}
                            {loading ? 'Sincronizando...' : 'Confirmar y Guardar Reserva'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
