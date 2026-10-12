"use client";
import { getOwnedTenantsSnap } from "@/services/client/ownedTenants";
import { HugeiconsIcon } from "@hugeicons/react";
import { DiscountTag01Icon, PercentIcon } from '@hugeicons/core-free-icons';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/services/client/firebase';
import { collection, getDocs, getDoc, query, where, orderBy, limit, doc, updateDoc, addDoc, deleteDoc, serverTimestamp, onSnapshot, Timestamp, writeBatch, setDoc, increment } from 'firebase/firestore';
import {
    Add01Icon,
    Alert02Icon,
    Calendar03Icon,
    Cancel01Icon,
    CheckmarkCircle02Icon,
    SquareLock01Icon,
    PencilEdit02Icon,
    RefreshIcon,
    SparklesIcon,
    Delete02Icon,
} from '@hugeicons/core-free-icons';
import { TarjetaKpi } from '@/components/ui/DashboardWidgets';
import { auditService } from '@/services/client/auditService';

function PanelHeader({ titulo, desc, icon: Icon, action }: any) {
    let content: React.ReactNode;
    if (React.isValidElement(Icon)) content = Icon;
    else if (Array.isArray(Icon)) content = <HugeiconsIcon icon={Icon} className="w-4 h-4" strokeWidth={1.8} />;
    else content = <Icon className="w-4 h-4" />;
    return (
        <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3 min-w-0">
                <span className="w-10 h-10 rounded-md bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-500 shrink-0">{content}</span>
                <div className="min-w-0">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-900 dark:text-white truncate font-heading">{titulo}</h3>
                    <p className="text-xs md:text-[10px] font-bold text-slate-400 truncate">{desc}</p>
                </div>
            </div>
            {action}
        </div>
    );
}

const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => {
    useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
    return (
        <div className={`fixed top-4 right-4 z-150 flex items-center gap-3 px-4 py-2.5 rounded-md shadow-2xl text-[11px] md:text-[9px] font-black uppercase tracking-widest text-white ${type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
            {type === 'success' ? <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-4 h-4" /> : <HugeiconsIcon icon={Alert02Icon} className="w-4 h-4" />}
            <span>{message}</span>
        </div>
    );
};

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, isDestructive = false }: any) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-200 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn" onClick={onCancel}>
            <div className="bg-white dark:bg-[#0B0F19] rounded-md shadow-2xl border border-slate-200 dark:border-white/10 w-full max-w-sm p-6 overflow-hidden relative" onClick={(e) => e.stopPropagation()}>
                <div className={`absolute top-0 left-0 w-full h-1 ${isDestructive ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tighter">{title}</h3>
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-8 uppercase leading-relaxed">{message}</p>
                <div className="flex gap-3 justify-end">
                    <button onClick={onCancel} className="px-5 py-2.5 text-xs md:text-[10px] font-black uppercase tracking-widest rounded-md bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-200 transition-all">Cancelar</button>
                    <button onClick={onConfirm} className={`px-6 py-2.5 text-xs md:text-[10px] font-black uppercase tracking-widest rounded-md text-white shadow-lg transition-all active:scale-95 ${isDestructive ? 'bg-red-600 shadow-red-500/20' : 'bg-emerald-600 shadow-emerald-500/20'}`}>Confirmar</button>
                </div>
            </div>
        </div>
    );
};

export default function CouponsPage() {
    const { user } = useAuth();
    const [coupons, setCoupons] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [tenants, setTenants] = useState<any[]>([]);
    const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [notification, setNotification] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [confirmData, setConfirmData] = useState<{ isOpen: boolean, title: string, message: string, action: () => void, isDestructive: boolean }>({ 
        isOpen: false, title: '', message: '', action: () => { }, isDestructive: false 
    });

    const activeTenant = tenants.find(t => t.id === selectedTenantId) || null;

    const [formData, setFormData] = useState({ code: '', discount: 10, limit: 100, validFrom: '', validUntil: '', minimumPurchase: 0, description: '' });

    const fetchData = async () => {
        if (!user?.uid) return;
        setLoading(true);
        try {
            const snap = await getDocs(query(collection(db, "coupons"), where("ownerId", "==", user.uid)));
            setCoupons(snap.docs.map(d => ({ id: d.id, ...d.data() })));

            // Cargar planes globales de settings/global para verificar las features reales de cada plan
            const { doc, getDoc } = await import('firebase/firestore');
            const globalSnap = await getDoc(doc(db, "settings", "global"));
            let loadedPlans: any[] = [];
            if (globalSnap.exists()) {
                const data = globalSnap.data();
                if (data.plans) {
                    loadedPlans = data.plans;
                }
            }

            // Cargar todos los recintos asociados del dueño para el filtro
            const snapTenants = await getOwnedTenantsSnap(user.uid);
            const tenantsList = snapTenants.docs.map(d => {
                const tenantData = d.data();
                const rawPlan = (tenantData.planId || tenantData.plan || '').toString();
                const matchedPlan = loadedPlans.find(p => p.id.toLowerCase() === rawPlan.toLowerCase() || p.name.toLowerCase() === rawPlan.toLowerCase());
                
                // Si existe el plan, extraemos sus features reales. De lo contrario, usamos las que vengan en el recinto o un valor por defecto.
                const features = matchedPlan ? matchedPlan.features : (tenantData.features || { marketing: false });

                return {
                    id: d.id,
                    ...tenantData,
                    planId: matchedPlan ? matchedPlan.id : (loadedPlans[0]?.id || ''),
                    features
                };
            });

            setTenants(tenantsList);
            if (tenantsList.length > 0) {
                setSelectedTenantId(prev => prev || tenantsList[0].id);
            }
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
        if (Number(formData.discount) < 1 || Number(formData.discount) > 100) {
            setNotification({ msg: "El descuento debe ser un porcentaje válido entre 1 y 100", type: 'error' });
            return;
        }
        if (Number(formData.minimumPurchase) < 0) {
            setNotification({ msg: "La compra mínima no puede ser negativa", type: 'error' });
            return;
        }
        setSaving(true);
        try {
            const payload = {
                ownerId: user.uid,
                tenantId: selectedTenantId,
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
                await auditService.logAuditEvent({
                    action: 'CUPÓN_EDITAR',
                    module: 'Marketing/Cupones',
                    details: `Edición del cupón con código: ${payload.code}`,
                    severity: 'LOW',
                    status: 'SUCCESS'
                });
            } else {
                await addDoc(collection(db, "coupons"), { ...payload, uses: 0, createdAt: Timestamp.now() });
                setNotification({ msg: "Cupón creado", type: 'success' });
                await auditService.logAuditEvent({
                    action: 'CUPÓN_CREAR',
                    module: 'Marketing/Cupones',
                    details: `Creación del cupón con código: ${payload.code}`,
                    severity: 'LOW',
                    status: 'SUCCESS'
                });
            }
            setIsModalOpen(false);
            fetchData();
        } catch (e: any) { 
            console.error("Error al guardar cupón:", e);
            setNotification({ msg: e?.code === 'permission-denied' ? "No tienes permisos para gestionar cupones de este recinto" : "Error al procesar", type: 'error' }); 
            await auditService.logAuditEvent({
                action: editingId ? 'CUPÓN_EDITAR' : 'CUPÓN_CREAR',
                module: 'Marketing/Cupones',
                details: `Falla al guardar cupón: ${e.message || e}`,
                severity: 'LOW',
                status: 'FAILED'
            });
        } finally { setSaving(false); }
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
                    await auditService.logAuditEvent({
                        action: 'CUPÓN_ELIMINAR',
                        module: 'Marketing/Cupones',
                        details: `Eliminación del cupón con ID: ${id}`,
                        severity: 'MEDIUM',
                        status: 'SUCCESS'
                    });
                } catch (e: any) { 
                    setNotification({ msg: "Error al eliminar", type: 'error' }); 
                    await auditService.logAuditEvent({
                        action: 'CUPÓN_ELIMINAR',
                        module: 'Marketing/Cupones',
                        details: `Falla al eliminar cupón con ID ${id}: ${e.message || e}`,
                        severity: 'MEDIUM',
                        status: 'FAILED'
                    });
                }
                setConfirmData(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const activePlanId = (activeTenant?.planId || activeTenant?.plan || '').toString().toLowerCase();
    const isMarketingLocked = activeTenant ? !(activeTenant as any).features?.marketing : false;
    const filteredCoupons = coupons.filter(c => c.tenantId === selectedTenantId || (!c.tenantId && tenants.length > 0 && selectedTenantId === tenants[0].id));

    const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    const parseDate = (d: any) => {
        if (!d) return null;
        if (d instanceof Date) return d;
        if (d.toDate) return d.toDate();
        if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
            const [y, m, day] = d.split('-').map(Number);
            return new Date(y, m - 1, day);
        }
        return new Date(d);
    };
    const fmtDate = (d: any) => { const dt = parseDate(d); return dt ? cap(dt.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })) : '—'; };
    const fmtRange = (from: any, until: any) => {
        const f = parseDate(from); const u = parseDate(until);
        if (f && u) return `${cap(f.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }))} → ${fmtDate(u)}`;
        return fmtDate(until || from);
    };
    const couponState = (c: any) => {
        const now = new Date();
        const until = parseDate(c.validUntil); const from = parseDate(c.validFrom);
        const expired = until ? until < now : false;
        const upcoming = from ? from > now : false;
        if (expired) return { label: 'Caducado', tone: 'bg-red-50 text-red-500 border-red-100 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400', dot: 'bg-red-500' };
        if (upcoming) return { label: 'Programado', tone: 'bg-sky-50 text-sky-500 border-sky-100 dark:bg-sky-500/10 dark:border-sky-500/20 dark:text-sky-400', dot: 'bg-sky-500' };
        if (c.status === 'active') return { label: 'Vigente', tone: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-[#00df82]', dot: 'bg-emerald-500 dark:bg-[#00df82]' };
        return { label: 'Inactivo', tone: 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-white/5 dark:border-white/10 dark:text-slate-400', dot: 'bg-slate-400' };
    };

    return (
        <div className="w-full space-y-5 pb-10 text-left relative animate-fadeIn">
            {notification && <Toast message={notification.msg} type={notification.type} onClose={() => setNotification(null)} />}
            
            <ConfirmModal 
                isOpen={confirmData.isOpen} 
                title={confirmData.title} 
                message={confirmData.message} 
                onConfirm={confirmData.action} 
                onCancel={() => setConfirmData(prev => ({ ...prev, isOpen: false }))} 
                isDestructive={confirmData.isDestructive} 
            />

            {/* HEADER CON FILTRO DE RECINTOS */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-white/5">
                <div>
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="w-6 h-[2px] bg-pink-500 rounded-md"></span>
                        <p className="text-[11px] font-black text-pink-600 dark:text-pink-400 tracking-[0.2em] uppercase">Estrategia de Fidelización</p>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none font-heading">Mis <span className="text-pink-500">Beneficios</span></h1>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="flex flex-col gap-1">
                        <label className="text-[11px] md:text-[7px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Filtrar Recinto</label>
                        <select 
                            value={selectedTenantId || ''} 
                            onChange={(e) => setSelectedTenantId(e.target.value)}
                            className="px-5 py-2.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[11px] md:text-[9px] font-black uppercase tracking-wider rounded-md focus:ring-1 focus:ring-pink-500 outline-hidden text-slate-700 dark:text-slate-200"
                        >
                            {tenants.map(t => {
                                const isLocked = !(t as any).features?.marketing;
                                return (
                                    <option key={t.id} value={t.id} className="dark:bg-[#0B0F19]">
                                        {t.name} {isLocked ? '🔒 [BLOQUEADO]' : ''}
                                    </option>
                                );
                            })}
                        </select>
                    </div>

                    <div className="flex items-end h-full mt-auto">
                        <button 
                            onClick={() => handleOpenModal()} 
                            disabled={isMarketingLocked || tenants.length === 0}
                            className={`w-full sm:w-auto px-6 py-3 bg-pink-500 text-white font-black text-[11px] md:text-[9px] uppercase tracking-widest rounded-md transition-all shadow-xl flex items-center justify-center gap-2 ${isMarketingLocked || tenants.length === 0 ? 'opacity-40 cursor-not-allowed shadow-none' : 'hover:brightness-110 active:scale-95 shadow-pink-500/25'}`}
                        >
                            <HugeiconsIcon icon={Add01Icon} className="w-4 h-4" /> NUEVO BENEFICIO
                        </button>
                    </div>
                </div>
            </div>

            {/* CONTENEDOR DE CONTENIDO CON SOPORTE DE CANDADO */}
            <div className="flex flex-col gap-5">
                {isMarketingLocked ? (
                    <div className="w-full bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-white/5 rounded-md p-8 text-center relative overflow-hidden shadow-xl animate-fadeIn flex flex-col items-center justify-center min-h-[250px]">
                        {/* Glow circular flotante premium de fondo */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-pink-500/5 blur-[80px] pointer-events-none z-0"></div>
                        
                        <div className="space-y-3 mb-6 z-10 max-w-md">
                            <div className="flex items-center justify-center gap-2">
                                <span className="w-6 h-[2px] bg-pink-500 rounded-full"></span>
                                <p className="text-[11px] md:text-[9px] font-black text-pink-600 dark:text-pink-400 tracking-[0.25em] uppercase">Plan de Pago Requerido</p>
                                <span className="w-6 h-[2px] bg-pink-500 rounded-full"></span>
                            </div>
                            <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">
                                HERRAMIENTAS DE <span className="text-emerald-500 dark:text-[#00df82]">MARKETING & CUPONES</span>
                            </h2>
                            <p className="text-xs md:text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase max-w-sm mx-auto leading-relaxed">
                                Fideliza a tus jugadores, crea códigos de descuento personalizados y aumenta las reservas de tus canchas. Módulo habilitado a partir del plan Básico.
                            </p>
                        </div>

                        <a 
                            href="/dashboard/billing-subscription" 
                            className="relative group px-8 py-3.5 overflow-hidden rounded-md bg-linear-to-r from-pink-500 via-rose-500 to-amber-500 font-black text-[11px] md:text-[9px] uppercase tracking-[0.2em] text-slate-950 transition-all hover:scale-[1.03] active:scale-95 shadow-xl shadow-pink-500/10 flex items-center justify-center gap-2 border border-white/20 z-10"
                        >
                            <div className="absolute inset-0 w-full h-full bg-linear-to-r from-amber-400 via-rose-400 to-pink-400 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            <HugeiconsIcon icon={SparklesIcon} className="w-4 h-4 text-slate-950" />
                            <span className="relative z-10 font-black">MEJORAR PLAN</span>
                        </a>
                    </div>
                ) : (
                    <>
                        <PanelHeader
                            titulo={activeTenant ? `Métricas de Campañas · ${activeTenant.name}` : "Estadísticas del Recinto"}
                            desc="Monitorea el rendimiento de tus códigos promocionales"
                            icon={DiscountTag01Icon}
                            action={
                                <span className="hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-md bg-pink-50 dark:bg-pink-500/10 border border-pink-100 dark:border-pink-500/20 text-pink-600 dark:text-pink-400 text-[11px] md:text-[9px] font-black uppercase tracking-widest">
                                    <HugeiconsIcon icon={DiscountTag01Icon} className="w-3.5 h-3.5" strokeWidth={2} /> {filteredCoupons.length} cupones
                                </span>
                            }
                        />

                        {/* TARJETAS DE ESTADÍSTICAS */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 [&>*:last-child:nth-child(odd)]:col-span-2 sm:[&>*:last-child:nth-child(odd)]:col-span-1">
                            <TarjetaKpi
                                titulo="Total Emitidos"
                                valor={filteredCoupons.length.toString()}
                                sub="Cupones emitidos"
                                icono={<HugeiconsIcon icon={DiscountTag01Icon} />}
                            />
                            <TarjetaKpi
                                titulo="Activos"
                                valor={filteredCoupons.filter((c: any) => {
                                    const until = parseDate(c.validUntil);
                                    return c.status === 'active' && (!until || until >= new Date());
                                }).length.toString()}
                                sub="Campañas vigentes"
                                icono={<HugeiconsIcon icon={PercentIcon} />}
                                brillo
                            />
                            <TarjetaKpi
                                titulo="Usos Totales"
                                valor={filteredCoupons.reduce((acc: number, c: any) => acc + (c.uses || 0), 0).toString()}
                                sub="Redenciones"
                                icono={<HugeiconsIcon icon={CheckmarkCircle02Icon} />}
                            />
                            <TarjetaKpi
                                titulo="Revenue Atribuido"
                                valor={`$${filteredCoupons.reduce((acc: number, c: any) => acc + ((c.uses || 0) * (c.minimumPurchase || 0)), 0).toLocaleString('es-CL')}`}
                                sub="Venta estimada"
                                icono={<HugeiconsIcon icon={SparklesIcon} />}
                                brillo
                            />
                        </div>

                        {/* LISTADO DE CUPONES */}
                        {loading ? (
                            <div className="text-center py-20 text-[11px] md:text-[9px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">Cargando beneficios...</div>
                        ) : filteredCoupons.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-24 text-center space-y-4 bg-white dark:bg-[#0B0F19] rounded-md border border-slate-200 dark:border-white/5 shadow-xs">
                                <div className="w-16 h-16 bg-pink-50 dark:bg-pink-500/10 rounded-md flex items-center justify-center text-pink-500 border border-pink-100 dark:border-pink-500/20">
                                    <HugeiconsIcon icon={DiscountTag01Icon} className="w-8 h-8" strokeWidth={1.4} />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[12px] font-black uppercase text-slate-400 tracking-widest">Sin cupones en este recinto</p>
                                    <p className="text-xs md:text-[10px] font-bold text-slate-300 uppercase tracking-wider">Crea tu primer código de descuento</p>
                                </div>
                                <button onClick={() => handleOpenModal()} className="inline-flex items-center gap-2 px-6 py-3 bg-pink-500 text-white rounded-md text-xs md:text-[10px] font-black uppercase tracking-widest shadow-xl shadow-pink-500/25 hover:brightness-110 active:scale-95 transition-all">
                                    <HugeiconsIcon icon={Add01Icon} className="w-4 h-4" /> Emitir Cupón
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                                {filteredCoupons.map((c: any) => {
                                    const state = couponState(c);
                                    const usagePct = c.limit > 0 ? Math.min(Math.round(((c.uses || 0) / c.limit) * 100), 100) : 0;
                                    return (
                                        <div key={c.id} className="bg-white dark:bg-[#0B0F19] rounded-md border border-slate-100 dark:border-white/5 shadow-xs hover:border-pink-500/30 hover:shadow-lg hover:shadow-pink-500/5 transition-all flex flex-col overflow-hidden">
                                            <div className="p-6 pb-5">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="w-11 h-11 rounded-md bg-pink-50 dark:bg-pink-500/10 text-pink-500 border border-pink-100 dark:border-pink-500/20 flex items-center justify-center">
                                                        <HugeiconsIcon icon={DiscountTag01Icon} className="w-5 h-5" strokeWidth={1.8} />
                                                    </div>
                                                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] md:text-[8px] font-black uppercase border ${state.tone}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${state.dot} ${state.label === 'Vigente' ? 'animate-pulse' : ''}`} /> {state.label}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter font-mono leading-none">{c.discount}%</span>
                                                    <span className="text-[11px] md:text-[9px] font-black text-pink-500 uppercase">descuento</span>
                                                </div>
                                                <h3 className="font-black text-slate-900 dark:text-white text-lg tracking-widest uppercase mb-2">{c.code}</h3>
                                                <p className="text-xs md:text-[10px] text-slate-400 font-bold uppercase line-clamp-2">{c.description || 'Sin descripción.'}</p>
                                            </div>

                                            <div className="relative px-6">
                                                <div className="border-t-2 border-dashed border-slate-200 dark:border-white/10"></div>
                                            </div>

                                            <div className="px-6 py-4 space-y-2 text-[11px] md:text-[9px] font-bold uppercase text-slate-500 flex-1">
                                                <div className="flex justify-between items-center gap-2">
                                                    <span className="flex items-center gap-1.5 shrink-0"><HugeiconsIcon icon={Calendar03Icon} className="w-3 h-3 text-pink-400" strokeWidth={2} /> Validez</span>
                                                    <span className="text-slate-900 dark:text-white font-mono text-right">{fmtRange(c.validFrom, c.validUntil)}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span>Compra mínima</span>
                                                    <span className="text-emerald-600 dark:text-[#00df82] font-mono">${Number(c.minimumPurchase || 0).toLocaleString('es-CL')}</span>
                                                </div>
                                                <div className="flex justify-between items-center mb-1">
                                                    <span>Usos</span>
                                                    <span className="text-slate-900 dark:text-white font-mono">{c.uses || 0} / {c.limit}</span>
                                                </div>
                                                <div className="w-full bg-slate-100 dark:bg-white/5 h-1.5 rounded-full overflow-hidden">
                                                    <div className="bg-pink-500 dark:bg-pink-400 h-full transition-all" style={{ width: `${usagePct}%` }}></div>
                                                </div>
                                                <p className="text-right text-[11px] md:text-[8px] text-slate-400 font-mono">{usagePct}% utilizado</p>
                                            </div>

                                            <div className="p-3 bg-slate-50 dark:bg-white/2 border-t border-slate-100 dark:border-white/5 flex gap-2">
                                                <button onClick={() => handleOpenModal(c)} className="flex-1 py-2.5 flex items-center justify-center bg-white dark:bg-white/5 rounded-md border border-slate-200 dark:border-white/10 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-pink-400/40 transition-all" title="Editar">
                                                    <HugeiconsIcon icon={PencilEdit02Icon} className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDelete(c.id)} className="flex-1 py-2.5 flex items-center justify-center bg-white dark:bg-white/5 rounded-md border border-red-100 dark:border-red-500/20 text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all" title="Eliminar">
                                                    <HugeiconsIcon icon={Delete02Icon} className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn" onClick={() => setIsModalOpen(false)}>
                    <div className="bg-white dark:bg-[#0B0F19] w-full max-w-md rounded-md shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between gap-3 px-6 pt-6 pb-5 border-b border-slate-100 dark:border-white/5">
                            <div className="flex items-center gap-3.5">
                                <div className="w-10 h-10 rounded-md bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-500 shrink-0">
                                    <HugeiconsIcon icon={DiscountTag01Icon} className="w-5 h-5" strokeWidth={1.8} />
                                </div>
                                <div>
                                    <p className="text-[11px] md:text-[9px] font-black uppercase tracking-[0.2em] text-pink-500 mb-0.5">{editingId ? 'Editar beneficio' : 'Nuevo beneficio'}</p>
                                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none font-heading">{editingId ? 'Editar Cupón' : 'Emitir Cupón'}</h3>
                                </div>
                            </div>
                            <button aria-label="Cerrar" onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-100 dark:bg-white/5 rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all shrink-0">
                                <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" strokeWidth={2} />
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div>
                                <label className="text-xs md:text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Código Promocional</label>
                                <input required type="text" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })} className="w-full px-3.5 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md text-lg font-black tracking-[0.2em] outline-hidden uppercase focus:border-pink-500 transition-all" placeholder="EJ: PADEL2026" />
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-xs md:text-[10px] font-black uppercase tracking-widest text-slate-400">Descuento (%)</label>
                                    <span className="text-xs md:text-[10px] font-black font-mono text-pink-500">{formData.discount}%</span>
                                </div>
                                <div className="grid grid-cols-4 gap-2 mb-2">
                                    {[10, 15, 25, 50].map(p => (
                                        <button key={p} type="button" onClick={() => setFormData({ ...formData, discount: p })} className={`py-2 rounded-md text-xs md:text-[10px] font-black uppercase transition-all ${formData.discount === p ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/25' : 'bg-slate-100 dark:bg-white/5 text-slate-400 hover:bg-pink-50 dark:hover:bg-pink-500/10 hover:text-pink-500'}`}>{p}%</button>
                                    ))}
                                </div>
                                <input required type="number" min="1" max="100" value={formData.discount} onChange={e => setFormData({ ...formData, discount: Number(e.target.value) })} className="w-full px-3.5 py-2.5 bg-pink-50 dark:bg-pink-500/5 border border-pink-200 dark:border-pink-500/20 rounded-md text-xs font-black outline-hidden" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs md:text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Límite Usos</label>
                                    <input required type="number" min="1" value={formData.limit} onChange={e => setFormData({ ...formData, limit: Number(e.target.value) })} className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md text-xs font-black outline-hidden" />
                                </div>
                                <div>
                                    <label className="text-xs md:text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Mínimo Compra ($)</label>
                                    <input required type="number" min="0" value={formData.minimumPurchase} onChange={e => setFormData({ ...formData, minimumPurchase: Number(e.target.value) })} className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md text-xs font-black outline-hidden" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs md:text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Descripción</label>
                                <textarea required rows={2} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full px-3.5 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md text-xs font-bold outline-hidden resize-none" placeholder="Restricciones..." />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs md:text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Fecha Inicio</label>
                                    <input required type="date" value={formData.validFrom} onChange={e => setFormData({ ...formData, validFrom: e.target.value })} className="w-full px-3 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md text-xs md:text-[10px] font-black outline-hidden uppercase" />
                                </div>
                                <div>
                                    <label className="text-xs md:text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Fecha Fin</label>
                                    <input required type="date" value={formData.validUntil} onChange={e => setFormData({ ...formData, validUntil: e.target.value })} className="w-full px-3 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md text-xs md:text-[10px] font-black outline-hidden uppercase" />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full py-3.5 bg-pink-500 text-white rounded-md text-xs md:text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-pink-500/25 hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                            >
                                {saving ? <HugeiconsIcon icon={RefreshIcon} className="w-4 h-4 animate-spin" /> : <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-4 h-4" />} {editingId ? "Actualizar Beneficio" : "Crear Beneficio Activo"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
