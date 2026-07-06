"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/services/firebase';
import { collection, query, where, getDocs, doc, setDoc, Timestamp } from 'firebase/firestore';
import { PencilSquareIcon, CheckCircleIcon, UsersIcon, MapPinIcon, CalendarDaysIcon, ClockIcon, BuildingOfficeIcon, UserCircleIcon, PhoneIcon, ArrowPathIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => {
    useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
    return (
        <div className={`fixed top-4 right-4 z-[150] flex items-center gap-3 px-4 py-2.5 rounded-[14px] shadow-2xl text-[9px] font-black uppercase tracking-widest text-white ${type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
            {type === 'success' ? <CheckCircleIcon className="w-4 h-4" /> : <ExclamationTriangleIcon className="w-4 h-4" />}
            <span>{message}</span>
        </div>
    );
};

const getChileNow = () => new Date(new Date().toLocaleString("en-US", { timeZone: "America/Santiago" }));

export default function ManualBookingPage() {
    const { user } = useAuth();
    const [tenants, setTenants] = useState<any[]>([]);
    const [courts, setCourts] = useState<any[]>([]);
    const [formData, setFormData] = useState({ tenantId: '', courtId: '', date: '', time: '', clientName: '', clientPhone: '', paymentStatus: 'pending' });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [notification, setNotification] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);

    const fetchTenants = async () => {
        if (!user?.uid) return;
        setLoading(true);
        try {
            const snap = await getDocs(query(collection(db, "tenants"), where("ownerId", "==", user.uid)));
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setTenants(list);
            if (list.length > 0) setFormData(prev => ({ ...prev, tenantId: list[0].id }));
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const fetchCourts = async (tenantId: string) => {
        if (!tenantId) return;
        try {
            const snap = await getDocs(query(collection(db, "courts"), where("tenantId", "==", tenantId)));
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setCourts(list);
            if (list.length > 0) setFormData(prev => ({ ...prev, courtId: list[0].id }));
            else setFormData(prev => ({ ...prev, courtId: '' }));
        } catch (e) { console.error(e); }
    };

    useEffect(() => { fetchTenants(); }, [user]);
    useEffect(() => { if (formData.tenantId) fetchCourts(formData.tenantId); }, [formData.tenantId]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.tenantId || !formData.courtId || !formData.date || !formData.time || !formData.clientName) {
            setNotification({ msg: "Faltan campos", type: 'error' });
            return;
        }
        setSaving(true);
        try {
            const bookingDate = new Date(`${formData.date}T${formData.time}:00`);
            if (bookingDate < getChileNow()) {
                setNotification({ msg: "Fecha pasada", type: 'error' });
                setSaving(false);
                return;
            }
            // Generate 6-digit custom alphanumeric ID
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            let bookingId = '';
            for (let i = 0; i < 6; i++) {
                bookingId += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            await setDoc(doc(db, "bookings", bookingId), { tenantId: formData.tenantId, courtId: formData.courtId, clientName: formData.clientName.toUpperCase(), clientPhone: formData.clientPhone, date: formData.date, time: formData.time, datetime: Timestamp.fromDate(bookingDate), paymentStatus: formData.paymentStatus, status: 'confirmed', type: 'manual', createdAt: Timestamp.now(), createdBy: user?.uid });
            setNotification({ msg: "Reserva Confirmada", type: 'success' });
            setFormData(prev => ({ ...prev, date: '', time: '', clientName: '', clientPhone: '', paymentStatus: 'pending' }));
        } catch (e) { setNotification({ msg: "Error al crear", type: 'error' }); } finally { setSaving(false); }
    };

    return (
        <div className="w-full space-y-5 pb-10 text-left relative">
            {notification && <Toast message={notification.msg} type={notification.type} onClose={() => setNotification(null)} />}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-white/5">
                <div>
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="w-6 h-[2px] bg-teal-500 rounded-full"></span>
                        <p className="text-[10px] font-bold text-teal-600 dark:text-teal-400 tracking-wider uppercase">Recepción y Call Center</p>
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase leading-none">Agendar <span className="text-teal-500">Manual</span></h1>
                </div>
            </div>

            {loading ? <div className="text-center py-20 text-[10px] font-black uppercase text-slate-400 animate-pulse">Cargando parámetros...</div> : tenants.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 opacity-60 border-2 border-dashed border-slate-200 dark:border-white/5 rounded-[14px]">
                    <BuildingOfficeIcon className="w-12 h-12 mb-3 stroke-1" />
                    <p className="text-[10px] font-bold uppercase">Sin recintos registrados</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl">
                    <div className="p-6 rounded-[14px] border border-slate-100 dark:bg-[#0B0F19] dark:border-white/5 bg-white shadow-sm space-y-6">
                        <h2 className="text-[10px] font-black text-teal-600 uppercase tracking-widest border-b border-slate-50 dark:border-white/5 pb-3">Detalles de la Reserva</h2>
                        <form onSubmit={handleSave} className="space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Recinto</label><select value={formData.tenantId} onChange={e => setFormData({ ...formData, tenantId: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[14px] text-[10px] font-black uppercase outline-none focus:border-teal-500">{tenants.map(t => <option key={t.id} value={t.id} className="dark:bg-black">{t.name}</option>)}</select></div>
                                <div><label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Cancha</label><select required value={formData.courtId} onChange={e => setFormData({ ...formData, courtId: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[14px] text-[10px] font-black uppercase outline-none focus:border-teal-500 disabled:opacity-50" disabled={courts.length === 0}>{courts.length === 0 ? <option value="">Sin canchas</option> : null}{courts.map(c => <option key={c.id} value={c.id} className="dark:bg-black">{c.name}</option>)}</select></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Fecha</label><input required type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[14px] text-[10px] font-black outline-none focus:border-teal-500 uppercase" /></div>
                                <div><label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Hora Inicio</label><input required type="time" value={formData.time} onChange={e => setFormData({ ...formData, time: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[14px] text-[10px] font-black outline-none focus:border-teal-500 uppercase" /></div>
                            </div>
                            <div className="space-y-4 pt-2 border-t border-slate-50 dark:border-white/5">
                                <div><label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Cliente</label><input required type="text" value={formData.clientName} onChange={e => setFormData({ ...formData, clientName: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[14px] text-[10px] font-black uppercase outline-none focus:border-teal-500" placeholder="NOMBRE COMPLETO" /></div>
                                <div><label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Teléfono</label><input type="tel" value={formData.clientPhone} onChange={e => setFormData({ ...formData, clientPhone: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[14px] text-[10px] font-black outline-none focus:border-teal-500" placeholder="+56 9..." /></div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase block mb-2">Estado Inicial del Pago</label>
                                <div className="flex gap-3">
                                    {[['pending', 'Pendiente', 'amber'], ['paid', 'Pagado', 'emerald']].map(([val, label, color]) => (
                                        <button key={val} type="button" onClick={() => setFormData({ ...formData, paymentStatus: val })} className={`flex-1 py-3 rounded-[14px] border text-[10px] font-black uppercase transition-all ${formData.paymentStatus === val ? `bg-${color}-50 border-${color}-500 text-${color}-700` : 'bg-slate-50 border-slate-200 text-slate-400 dark:bg-white/5 dark:border-white/10'}`}>{label}</button>
                                    ))}
                                </div>
                            </div>
                            <button type="submit" disabled={saving || courts.length === 0} className="w-full py-4 bg-slate-900 dark:bg-teal-600 text-white rounded-[14px] text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">{saving ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <CheckCircleIcon className="w-4 h-4" />} Confirmar Agendamiento</button>
                        </form>
                    </div>

                    <div className="hidden lg:flex flex-col items-center justify-center p-12 bg-teal-50/50 dark:bg-teal-900/10 rounded-[14px] border border-dashed border-teal-200 dark:border-teal-900/50 text-center">
                        <UsersIcon className="w-16 h-16 text-teal-500 mb-6" />
                        <h3 className="text-xl font-black text-teal-800 dark:text-teal-300 uppercase leading-none mb-4">Registro Inmediato</h3>
                        <p className="text-[10px] font-bold text-teal-600 uppercase mb-8 leading-relaxed max-w-xs">Ideal para reservas presenciales, vía WhatsApp o convenios directos con empresas.</p>
                        <div className="bg-white dark:bg-[#0B0F19] p-5 rounded-[14px] border border-teal-100 dark:border-teal-500/20 shadow-sm w-full text-left">
                            <h4 className="text-[9px] font-black text-teal-600 uppercase tracking-widest mb-3 flex items-center gap-2"><CheckCircleIcon className="w-4 h-4" /> REGLAS OPERATIVAS</h4>
                            <ul className="text-[9px] font-bold text-slate-500 dark:text-slate-400 space-y-2 uppercase">
                                <li className="flex gap-2"><span>•</span> <span>Se etiqueta automáticamente como origen manual</span></li>
                                <li className="flex gap-2"><span>•</span> <span>Afecta la ocupación en tiempo real</span></li>
                                <li className="flex gap-2"><span>•</span> <span>Visible instantáneamente en la agenda maestra</span></li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
