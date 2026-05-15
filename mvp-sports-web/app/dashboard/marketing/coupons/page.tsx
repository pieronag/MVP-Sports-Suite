"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/services/firebase';
import { collection, query, where, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { TagIcon, PlusIcon, XMarkIcon, CheckCircleIcon, ArrowPathIcon, ExclamationTriangleIcon, PercentBadgeIcon, CalendarDaysIcon, EllipsisHorizontalCircleIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';

const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => {
    useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
    return (
        <div className={`fixed top-4 right-4 z-[150] flex items-center gap-3 px-4 py-2.5 rounded-xl shadow-2xl text-[9px] font-black uppercase tracking-widest text-white ${type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
            {type === 'success' ? <CheckCircleIcon className="w-4 h-4" /> : <ExclamationTriangleIcon className="w-4 h-4" />}
            <span>{message}</span>
        </div>
    );
};

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, isDestructive = false }: any) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn" onClick={onCancel}>
            <div className="bg-white dark:bg-[#0B0F19] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 w-full max-w-sm p-6 overflow-hidden relative" onClick={(e) => e.stopPropagation()}>
                <div className={`absolute top-0 left-0 w-full h-1 ${isDestructive ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tighter">{title}</h3>
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-8 uppercase leading-relaxed">{message}</p>
                <div className="flex gap-3 justify-end">
                    <button onClick={onCancel} className="px-5 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-200 transition-all">Cancelar</button>
                    <button onClick={onConfirm} className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl text-white shadow-lg transition-all active:scale-95 ${isDestructive ? 'bg-red-600 shadow-red-500/20' : 'bg-emerald-600 shadow-emerald-500/20'}`}>Confirmar</button>
                </div>
            </div>
        </div>
    );
};

export default function CouponsPage() {
    const { user } = useAuth();
    const [coupons, setCoupons] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [notification, setNotification] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [confirmData, setConfirmData] = useState<{ isOpen: boolean, title: string, message: string, action: () => void, isDestructive: boolean }>({ 
        isOpen: false, title: '', message: '', action: () => { }, isDestructive: false 
    });

    const [formData, setFormData] = useState({ code: '', discount: 10, limit: 100, validFrom: '', validUntil: '', minimumPurchase: 0, description: '' });

    const fetchData = async () => {
        if (!user?.uid) return;
        setLoading(true);
        try {
            const snap = await getDocs(query(collection(db, "coupons"), where("ownerId", "==", user.uid)));
            setCoupons(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, [user]);

    const handleOpenModal = (coupon?: any) => {
        if (coupon) {
            setEditingId(coupon.id);
            setFormData({
                code: coupon.code,
                discount: coupon.discount,
                limit: coupon.limit,
                validFrom: coupon.validFrom,
                validUntil: coupon.validUntil,
                minimumPurchase: coupon.minimumPurchase,
                description: coupon.description || ''
            });
        } else {
            setEditingId(null);
            setFormData({ code: '', discount: 10, limit: 100, validFrom: '', validUntil: '', minimumPurchase: 0, description: '' });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.uid) return;
        if (new Date(formData.validUntil) < new Date(formData.validFrom)) {
            setNotification({ msg: "La fecha de fin no puede ser anterior al inicio", type: 'error' });
            return;
        }
        setSaving(true);
        try {
            const payload = {
                ownerId: user.uid,
                code: formData.code.toUpperCase().replace(/\s+/g, ''),
                discount: Number(formData.discount),
                limit: Number(formData.limit),
                validFrom: formData.validFrom,
                validUntil: formData.validUntil,
                minimumPurchase: Number(formData.minimumPurchase),
                description: formData.description,
                status: 'active',
                updatedAt: Timestamp.now()
            };

            if (editingId) {
                const { doc, updateDoc } = await import('firebase/firestore');
                await updateDoc(doc(db, "coupons", editingId), payload);
                setNotification({ msg: "Cupón actualizado", type: 'success' });
            } else {
                await addDoc(collection(db, "coupons"), { ...payload, uses: 0, createdAt: Timestamp.now() });
                setNotification({ msg: "Cupón creado", type: 'success' });
            }
            setIsModalOpen(false);
            fetchData();
        } catch (e) { setNotification({ msg: "Error al procesar", type: 'error' }); } finally { setSaving(false); }
    };

    const handleDelete = async (id: string) => {
        setConfirmData({
            isOpen: true,
            title: "Eliminar Beneficio",
            message: "¿Seguro que deseas eliminar este cupón permanentemente? Esta acción no se puede deshacer.",
            isDestructive: true,
            action: async () => {
                try {
                    const { doc, deleteDoc } = await import('firebase/firestore');
                    await deleteDoc(doc(db, "coupons", id));
                    setNotification({ msg: "Cupón eliminado", type: 'success' });
                    fetchData();
                } catch (e) { setNotification({ msg: "Error al eliminar", type: 'error' }); }
                setConfirmData(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    return (
        <div className="w-full space-y-5 pb-10 text-left relative">
            {notification && <Toast message={notification.msg} type={notification.type} onClose={() => setNotification(null)} />}
            
            <ConfirmModal 
                isOpen={confirmData.isOpen} 
                title={confirmData.title} 
                message={confirmData.message} 
                onConfirm={confirmData.action} 
                onCancel={() => setConfirmData(prev => ({ ...prev, isOpen: false }))} 
                isDestructive={confirmData.isDestructive} 
            />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-8 relative z-10">
                <div>
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="w-6 h-[2px] bg-pink-500 rounded-full"></span>
                        <p className="text-[9px] font-black text-pink-600 dark:text-pink-400 tracking-[0.2em] uppercase">Estrategia de Fidelización</p>
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase leading-none tracking-tighter">Mis <span className="text-pink-500">Cupones</span></h1>
                </div>
                
                <div className="flex items-center gap-2 p-1.5 rounded-xl">
                    <button 
                        onClick={() => handleOpenModal()} 
                        className="px-6 py-2.5 bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 font-black text-[9px] uppercase tracking-[0.2em] rounded-xl transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-emerald-500/20 flex items-center gap-2 border border-emerald-400/20 dark:border-white/10"
                    >
                        <PlusIcon className="w-4 h-4" /> NUEVO BENEFICIO
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-xl border border-slate-100 dark:bg-[#0B0F19] dark:border-white/5 bg-white shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Emitidos</p>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-none tracking-tighter">{coupons.length}</h3>
                </div>
                <div className="p-5 rounded-xl border border-pink-100 bg-pink-500/[0.03] dark:bg-pink-500/5 shadow-sm">
                    <p className="text-[10px] font-black text-pink-500 uppercase tracking-widest mb-2">Activos</p>
                    <h3 className="text-2xl font-black text-pink-500 leading-none tracking-tighter">{coupons.filter(c => c.status === 'active').length}</h3>
                </div>
                <div className="p-5 rounded-xl border border-slate-100 dark:bg-[#0B0F19] dark:border-white/5 bg-white shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Usos Totales</p>
                    <h3 className="text-2xl font-black text-emerald-500 leading-none tracking-tighter">{coupons.reduce((acc, c) => acc + (c.uses || 0), 0)}</h3>
                </div>
                <div className="p-5 rounded-xl border border-slate-100 dark:bg-[#0B0F19] dark:border-white/5 bg-white shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Revenue Atribuido</p>
                    <h3 className="text-2xl font-black text-emerald-500 leading-none tracking-tighter">${coupons.reduce((acc, c) => acc + ((c.uses || 0) * (c.minimumPurchase || 0)), 0).toLocaleString()}</h3>
                </div>
            </div>

            {loading ? <div className="text-center py-20 text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">Cargando beneficios...</div> : coupons.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 opacity-60 border-2 border-dashed border-slate-200 dark:border-white/5 rounded-2xl">
                    <TagIcon className="w-12 h-12 mb-3 stroke-1" />
                    <p className="text-[10px] font-bold uppercase">Sin cupones registrados</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    {coupons.map(c => (
                        <div key={c.id} className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm hover:border-pink-500/30 transition-all flex flex-col group overflow-hidden">
                            <div className="p-6 flex-1 flex flex-col">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-10 h-10 rounded-xl bg-pink-50 dark:bg-pink-500/10 text-pink-600 flex items-center justify-center border border-pink-100 dark:border-pink-500/20"><PercentBadgeIcon className="w-5 h-5" /></div>
                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${c.status === 'active' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>{c.status === 'active' ? 'VIGENTE' : 'CADUCADO'}</span>
                                </div>
                                <h3 className="font-black text-slate-900 dark:text-white text-lg tracking-widest uppercase mb-1">{c.code}</h3>
                                <p className="text-[10px] font-black text-pink-500 uppercase mb-3">{c.discount}% DESCUENTO</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase mb-6 line-clamp-2">{c.description || 'Sin descripción.'}</p>
                                <div className="mt-auto space-y-2 pt-4 border-t border-slate-100 dark:border-white/5 text-[9px] font-bold uppercase text-slate-500">
                                    <div className="flex justify-between"><span>Vence</span><span className="text-slate-900 dark:text-white">{c.validUntil ? new Date(c.validUntil).toLocaleDateString() : '---'}</span></div>
                                    <div className="flex justify-between"><span>Mínimo</span><span className="text-emerald-600">${Number(c.minimumPurchase).toLocaleString()}</span></div>
                                    <div className="flex justify-between mb-1"><span>Uso</span><span>{c.uses} / {c.limit}</span></div>
                                    <div className="w-full bg-slate-100 dark:bg-white/5 h-1 rounded-full overflow-hidden"><div className="bg-pink-500 h-full" style={{ width: `${Math.min((c.uses / c.limit) * 100, 100)}%` }}></div></div>
                                </div>
                            </div>
                            
                            <div className="p-3 bg-slate-50 dark:bg-white/[0.02] border-t border-slate-100 dark:border-white/5 flex gap-2">
                                <button onClick={() => handleOpenModal(c)} className="flex-1 py-2.5 flex items-center justify-center bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all">
                                    <PencilSquareIcon className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDelete(c.id)} className="flex-1 py-2.5 flex items-center justify-center bg-white dark:bg-white/5 rounded-xl border border-red-100 dark:border-white/10 text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all">
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn" onClick={() => setIsModalOpen(false)}>
                    <div className="bg-white dark:bg-[#0B0F19] w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b border-slate-100 dark:border-white/5 flex justify-between items-center">
                            <h3 className="text-xs font-black uppercase text-slate-900 dark:text-white">{editingId ? 'Editar Beneficio' : 'Emitir Cupón'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400"><XMarkIcon className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Código Promocional</label>
                                <input required type="text" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-lg font-black tracking-widest outline-none uppercase" placeholder="EJ: PADEL2026" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Descripción</label>
                                <textarea required rows={2} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold outline-none uppercase resize-none" placeholder="RESTRICCIONES..." />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Descuento (%)</label>
                                    <input required type="number" value={formData.discount} onChange={e => setFormData({ ...formData, discount: Number(e.target.value) })} className="w-full px-4 py-2.5 bg-pink-50 dark:bg-pink-500/5 border border-pink-200 dark:border-pink-500/20 rounded-xl text-xs font-black outline-none" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Límite Usos</label>
                                    <input required type="number" value={formData.limit} onChange={e => setFormData({ ...formData, limit: Number(e.target.value) })} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-black outline-none" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Fecha Inicio</label>
                                    <input required type="date" value={formData.validFrom} onChange={e => setFormData({ ...formData, validFrom: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-[10px] font-black outline-none uppercase" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Fecha Fin</label>
                                    <input required type="date" value={formData.validUntil} onChange={e => setFormData({ ...formData, validUntil: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-[10px] font-black outline-none uppercase" />
                                </div>
                            </div>
                            <button 
                                type="submit" 
                                disabled={saving} 
                                className="w-full py-4 bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 active:scale-95 disabled:opacity-50 transition-all border border-emerald-400/20 dark:border-white/10"
                            >
                                {saving ? <ArrowPathIcon className="w-4 h-4 animate-spin mx-auto" /> : (editingId ? "Actualizar Beneficio" : "Crear Beneficio Activo")}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
