"use client";
import { getOwnedTenantsSnap } from "@/services/ownedTenants";
import { HugeiconsIcon } from "@hugeicons/react";
import { LifebuoyIcon } from '@hugeicons/core-free-icons';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/services/firebase';
import { collection, getDocs, getDoc, query, where, orderBy, doc, updateDoc, onSnapshot, Timestamp } from 'firebase/firestore';
import {
    BarChartIcon,
    Building01Icon,
    Calendar01Icon,
    Cancel01Icon,
    CheckmarkCircle02Icon,
    DocumentCodeIcon,
    Download01Icon,
    InformationCircleIcon,
    MoneyBag01Icon,
    Rocket01Icon,
    SparklesIcon,
    TrophyIcon,
    UserGroupIcon,
    RefreshIcon,
    ArrowRight01Icon,
} from '@hugeicons/core-free-icons';
import { TarjetaKpi, PanelGlass } from '@/components/ui/DashboardWidgets';

function PanelHeader({ titulo, desc, icon: Icon, action }: any) {
    let content: React.ReactNode;
    if (React.isValidElement(Icon)) content = Icon;
    else if (Array.isArray(Icon)) content = <HugeiconsIcon icon={Icon} className="w-4 h-4" strokeWidth={1.8} />;
    else content = <Icon className="w-4 h-4" />;
    return (
        <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3 min-w-0">
                <span className="w-10 h-10 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-[#00df82] shrink-0">{content}</span>
                <div className="min-w-0">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-900 dark:text-white truncate font-heading">{titulo}</h3>
                    <p className="text-[10px] font-bold text-slate-400 truncate">{desc}</p>
                </div>
            </div>
            {action}
        </div>
    );
}

const FEATURE_LABELS: Record<string, { label: string, icon: any, color: string }> = {
    topPosition: { label: 'Prioridad en búsquedas', icon: <HugeiconsIcon icon={TrophyIcon} className="w-4 h-4" />, color: 'text-amber-500' },
    multiRecinto: { label: 'Multi-recinto', icon: <HugeiconsIcon icon={UserGroupIcon} className="w-4 h-4" />, color: 'text-slate-600 dark:text-slate-300' },
    analytics: { label: 'Análisis de datos', icon: <HugeiconsIcon icon={BarChartIcon} className="w-4 h-4" />, color: 'text-emerald-500 dark:text-[#00df82]' },
    marketing: { label: 'Cupones y marketing', icon: <HugeiconsIcon icon={Rocket01Icon} className="w-4 h-4" />, color: 'text-purple-500' },
    support: { label: 'Soporte 24/7', icon: <HugeiconsIcon icon={LifebuoyIcon} className="w-4 h-4" />, color: 'text-rose-500' },
};

const FEATURE_ORDER = ['topPosition', 'multiRecinto', 'analytics', 'marketing', 'support'];

// Conversión segura de fechas: Timestamp de Firestore, Date o string
const toDate = (d: any) => {
    if (!d) return new Date();
    if (d.toDate) return d.toDate();
    if (d instanceof Date) return d;
    return new Date(d);
};

interface Plan { id: string; name: string; price: number; commission: number; priorityScore: number; features: { [key: string]: boolean }; }
interface Tenant { id: string; name: string; planId: string; plan?: string; ownerId: string; nextBillingDate?: any; pendingPlanId?: string | null; pendingPlanName?: string | null; scheduledChangeDate?: any; billingCycle?: 'monthly' | 'annual'; }

export default function BillingPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
    const [processingPlan, setProcessingPlan] = useState<string | null>(null);
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
    const [toast, setToast] = useState<{ msg: string, type: 'success' | 'error' | 'info' } | null>(null);
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, planId: string, planName: string } | null>(null);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loadingInvoices, setLoadingInvoices] = useState(false);

    const showToast = (msg: string, type: 'success' | 'error' | 'info') => { setToast({ msg, type }); setTimeout(() => setToast(null), 4000); };

    useEffect(() => {
        const fetchData = async () => {
            if (!user?.uid) return;
            setLoading(true);
            try {
                const globalSnap = await getDoc(doc(db, "settings", "global"));
                let loadedPlans: Plan[] = [];
                if (globalSnap.exists()) {
                    const data = globalSnap.data();
                    if (data.plans) {
                        loadedPlans = data.plans.sort((a: Plan, b: Plan) => a.price - b.price);
                        setPlans(loadedPlans);
                    }
                }
                const snapTenants = await getOwnedTenantsSnap(user.uid);
                const tenantsList = snapTenants.docs.map(d => {
                    const tenantData = d.data();
                    const rawPlan = (tenantData.planId || tenantData.plan || '').toString();
                    const matchedPlan = loadedPlans.find(p => p.id.toLowerCase() === rawPlan.toLowerCase() || p.name.toLowerCase() === rawPlan.toLowerCase());
                    return {
                        id: d.id,
                        ...tenantData,
                        planId: matchedPlan ? matchedPlan.id : (loadedPlans[0]?.id || '')
                    } as Tenant;
                });

                const now = new Date();
                const processedTenants = await Promise.all(tenantsList.map(async (t) => {
                    if (t.pendingPlanId && t.scheduledChangeDate) {
                        const scheduledDate = toDate(t.scheduledChangeDate);
                        if (now >= scheduledDate) {
                            const selectedPlan = loadedPlans.find(p => p.id === t.pendingPlanId);
                            const updateData = {
                                planId: t.pendingPlanId,
                                plan: t.pendingPlanName,
                                pendingPlanId: null,
                                pendingPlanName: null,
                                pendingPlanPrice: null,
                                pendingBillingCycle: null,
                                scheduledChangeDate: null,
                                lastPlanChange: Timestamp.fromDate(now),
                                commission: selectedPlan ? selectedPlan.commission : undefined,
                                priorityScore: selectedPlan ? selectedPlan.priorityScore : undefined,
                                features: selectedPlan ? selectedPlan.features : undefined
                            };
                            await updateDoc(doc(db, "tenants", t.id), updateData);
                            return { ...t, ...updateData, plan: updateData.plan ?? undefined } as Tenant;
                        }
                    }
                    return t;
                }));

                setTenants(processedTenants);
                if (processedTenants.length > 0) setSelectedTenantId(processedTenants[0].id);
            } catch (e) { console.error(e); } finally { setLoading(false); }
        };
        fetchData();
    }, [user]);

    const executePlanChange = async () => {
        if (!confirmModal || !selectedTenantId) return;
        const { planId, planName } = confirmModal;
        setConfirmModal(null); setProcessingPlan(planId);
        try {
            const now = new Date();
            let scheduledDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            if (billingCycle === 'annual') scheduledDate = new Date(now.getFullYear() + 1, 0, 1);
            const selectedPlan = plans.find(p => p.id === planId);
            const planPrice = selectedPlan ? (billingCycle === 'annual' ? Math.round(selectedPlan.price * 0.8) : selectedPlan.price) : 0;
            await updateDoc(doc(db, "tenants", selectedTenantId), { pendingPlanId: planId, pendingPlanName: planName, pendingPlanPrice: planPrice, pendingBillingCycle: billingCycle, scheduledChangeDate: Timestamp.fromDate(scheduledDate) });
            setTenants(prev => prev.map(t => t.id === selectedTenantId ? { ...t, pendingPlanId: planId, pendingPlanName: planName, scheduledChangeDate: Timestamp.fromDate(scheduledDate) } : t));
            showToast(`Cambio agendado para el ${scheduledDate.toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })}`, 'success');
        } catch (e) { showToast("Error al procesar cambio", 'error'); } finally { setProcessingPlan(null); }
    };

    const cancelScheduledChange = async () => {
        if (!selectedTenantId) return;
        setProcessingPlan('canceling');
        try {
            await updateDoc(doc(db, "tenants", selectedTenantId), { pendingPlanId: null, pendingPlanName: null, pendingPlanPrice: null, pendingBillingCycle: null, scheduledChangeDate: null });
            setTenants(prev => prev.map(t => t.id === selectedTenantId ? { ...t, pendingPlanId: undefined, pendingPlanName: undefined, scheduledChangeDate: undefined } : t));
            showToast("Cambio cancelado", 'success');
        } catch (e) { showToast("Error", 'error'); } finally { setProcessingPlan(null); }
    };

    const fetchInvoices = async () => {
        if (!user?.uid || !selectedTenantId) return;
        setLoadingInvoices(true);
        try {
            const snap = await getDocs(query(collection(db, "invoices"), where("tenantId", "==", selectedTenantId), orderBy("date", "desc")));
            setInvoices(snap.docs.map(d => ({ id: d.id, ...d.data(), date: d.data().date?.toDate() || new Date() })));
        } catch (e) { setInvoices([]); } finally { setLoadingInvoices(false); }
    };

    useEffect(() => { if (isHistoryModalOpen) fetchInvoices(); }, [isHistoryModalOpen, selectedTenantId]);

    const activeTenant = tenants.find(t => t.id === selectedTenantId);
    const confirmPlan = plans.find(p => p.id === confirmModal?.planId);
    const recommendedId = plans.length > 2 ? plans[Math.floor(plans.length / 2)].id : (plans[plans.length - 1]?.id || '');

    const formatPrice = (price: number, showCLP = true) => {
        if (price === 0) return "GRATIS";
        const formatted = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(price);
        return showCLP ? `${formatted} CLP` : formatted;
    };

    const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    const formatFullDate = (d: Date) => cap(d.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
    const formatLongDate = (d: Date) => cap(d.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' }));
    const formatShortDate = (d: Date) => cap(d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' }));
    const weekdayShort = (d: Date) => cap(d.toLocaleDateString('es-CL', { weekday: 'short' }));
    const monthYear = (d: Date) => cap(d.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' }));

    const nextBilling = activeTenant?.nextBillingDate
        ? toDate(activeTenant.nextBillingDate)
        : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);

    if (loading) return <div className="flex flex-col items-center justify-center py-20 gap-4"><div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cargando facturación...</p></div>;

    return (
        <div className="w-full space-y-5 pb-10 text-left relative">
            {toast && <div className={`fixed top-4 right-4 px-5 py-3 rounded-md shadow-2xl text-[10px] font-black uppercase tracking-widest z-300 text-white flex items-center gap-2.5 animate-slideIn ${toast.type === 'success' ? 'bg-emerald-500 dark:bg-[#00df82] dark:text-black' : 'bg-red-600'}`}>{toast.type === 'success' ? <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-4 h-4" /> : <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" />} {toast.msg}</div>}

            {/* CABECERA */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-6">
                <div>
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="w-6 h-[2px] bg-emerald-500 rounded-md"></span>
                        <p className="text-[10px] font-bold text-emerald-600 dark:text-[#00df82] tracking-[0.2em] uppercase">Estado de cuenta</p>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none font-heading">Pagos & <span className="text-emerald-500 dark:text-[#00df82]">Planes</span></h1>
                </div>
                <button onClick={() => setIsHistoryModalOpen(true)} className="flex items-center gap-2.5 px-6 py-3 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white rounded-md text-[10px] font-black uppercase tracking-widest transition-all hover:border-emerald-500/40 active:scale-95">
                    <HugeiconsIcon icon={DocumentCodeIcon} className="w-4 h-4 text-emerald-600 dark:text-[#00df82]" /> Historial de Pagos
                </button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <TarjetaKpi titulo="Sedes" valor={tenants.length.toString()} sub="Infraestructura activa" icon={<HugeiconsIcon icon={Building01Icon} />} />
                <TarjetaKpi titulo="Costo Mensual" valor={formatPrice(tenants.reduce((acc, t) => { const p = plans.find(pl => pl.id === t.planId); return acc + (p?.price || 0); }, 0))} sub="Total de planes" icon={<HugeiconsIcon icon={MoneyBag01Icon} />} brillo />
                <TarjetaKpi titulo="Próximo Cobro" valor={String(nextBilling.getDate()).padStart(2, '0')} sub={`${monthYear(nextBilling)} · ${weekdayShort(nextBilling)}`} icon={<HugeiconsIcon icon={Calendar01Icon} />} />
            </div>

            {/* AVISO */}
            <div className="p-4 rounded-md bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/10 flex items-center gap-4">
                <HugeiconsIcon icon={InformationCircleIcon} className="w-6 h-6 text-emerald-500 shrink-0" />
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase leading-relaxed">Los cambios de plan se aplican el primer día del mes siguiente para mantener tu facturación ordenada.</p>
            </div>

            {/* RECINTOS */}
            <div className="space-y-6">
                <PanelHeader titulo="Mis Recintos" desc="Selecciona una sede para gestionar su suscripción" icon={Building01Icon} />
                {tenants.length === 0 ? (
                    <div className="py-16 text-center space-y-3">
                        <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-md flex items-center justify-center mx-auto text-slate-300 border border-slate-200 dark:border-white/10">
                            <HugeiconsIcon icon={Building01Icon} className="w-8 h-8" strokeWidth={1.4} />
                        </div>
                        <p className="text-[12px] font-black uppercase text-slate-400 tracking-widest">Sin recintos registrados</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {tenants.map((t) => {
                            const isSelected = t.id === selectedTenantId;
                            const plan = plans.find(p => p.id === t.planId);
                            const hasPending = !!t.pendingPlanId;
                            return (
                                <div key={t.id} onClick={() => setSelectedTenantId(t.id)} className={`p-5 rounded-md border cursor-pointer transition-all relative overflow-hidden ${isSelected ? 'border-emerald-500 bg-white dark:bg-[#0B0F19] shadow-lg ring-1 ring-emerald-500/20' : 'border-slate-100 dark:border-white/5 bg-white dark:bg-[#0B0F19] opacity-60 hover:opacity-100'}`}>
                                    <div className={`h-1 w-full absolute top-0 left-0 ${isSelected ? 'bg-emerald-500 dark:bg-[#00df82]' : 'bg-transparent'}`} />
                                    <div className="flex items-start justify-between mb-4">
                                        <div className={`w-10 h-10 rounded-md flex items-center justify-center ${isSelected ? 'bg-emerald-500/10 text-emerald-600 dark:text-[#00df82] border border-emerald-500/20' : 'bg-slate-50 dark:bg-white/5 text-slate-300'}`}>
                                            <HugeiconsIcon icon={Building01Icon} className="w-5 h-5" strokeWidth={1.8} />
                                        </div>
                                        {isSelected && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-[#00df82] text-[8px] font-black uppercase border border-emerald-500/20">
                                                <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-2.5 h-2.5" strokeWidth={2} /> Seleccionada
                                            </span>
                                        )}
                                    </div>
                                    <h4 className="text-sm font-black uppercase text-slate-900 dark:text-white truncate">{t.name}</h4>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[8px] font-black uppercase ${hasPending ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 border border-amber-500/20' : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-[#00df82] border border-emerald-500/20'}`}>
                                            {hasPending ? 'Cambio pendiente' : `Plan ${plan?.name || '—'}`}
                                        </span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* RESUMEN DE SUSCRIPCIÓN */}
            {activeTenant && (() => {
                const curPlan = plans.find(p => p.id === activeTenant.planId);
                const curPrice = curPlan?.price || 0;
                const featureCount = curPlan ? FEATURE_ORDER.filter(k => curPlan.features?.[k]).length : 0;
                return (
                    <PanelGlass className="p-6">
                        <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                            <div className="flex items-center gap-4 min-w-0">
                                <div className="w-12 h-12 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-[#00df82] shrink-0">
                                    <HugeiconsIcon icon={Rocket01Icon} className="w-6 h-6" strokeWidth={1.8} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Suscripción actual</p>
                                    <p className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white leading-none font-heading truncate">Plan {curPlan?.name || '—'}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{activeTenant.name}</p>
                                </div>
                            </div>
                            <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="p-3 rounded-md bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">Costo mensual</p>
                                    <p className="text-[13px] font-black text-slate-900 dark:text-white font-mono leading-none">{formatPrice(curPrice, false)}</p>
                                </div>
                                <div className="p-3 rounded-md bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">Comisión</p>
                                    <p className="text-[13px] font-black text-slate-900 dark:text-white font-mono leading-none">{curPlan?.commission ?? 0}%</p>
                                </div>
                                <div className="p-3 rounded-md bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">Funciones</p>
                                    <p className="text-[13px] font-black text-slate-900 dark:text-white font-mono leading-none">{featureCount} de {FEATURE_ORDER.length}</p>
                                </div>
                                <div className="p-3 rounded-md bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">Renovación</p>
                                    <p className="text-[13px] font-black text-slate-900 dark:text-white font-mono leading-none">{formatShortDate(nextBilling)}</p>
                                </div>
                            </div>
                        </div>
                    </PanelGlass>
                );
            })()}

            {activeTenant?.pendingPlanId && (
                <div className="p-6 rounded-md bg-slate-900 dark:bg-[#0B0F19] border border-amber-500/30 text-white flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
                    <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-md bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                            <HugeiconsIcon icon={SparklesIcon} className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-sm font-black uppercase tracking-tight">Cambio Pendiente</p>
                            <p className="text-[10px] font-bold opacity-70 uppercase">Pasarás al plan {activeTenant.pendingPlanName} el próximo mes.</p>
                            {(() => {
                                const sd = activeTenant.scheduledChangeDate ? toDate(activeTenant.scheduledChangeDate) : null;
                                return sd ? <p className="text-[10px] font-bold text-amber-300 uppercase mt-1">Aplica desde {formatLongDate(sd)}</p> : null;
                            })()}
                        </div>
                    </div>
                    <button onClick={cancelScheduledChange} disabled={processingPlan === 'canceling'} className="px-5 py-2.5 bg-white text-slate-900 rounded-md text-[10px] font-black uppercase active:scale-95 disabled:opacity-50">
                        {processingPlan === 'canceling' ? 'Cancelando...' : 'Deshacer Cambio'}
                    </button>
                </div>
            )}

            {activeTenant && (
                <div className="pt-8 space-y-8">
                    <PanelHeader
                        titulo={`Planes para ${activeTenant.name}`}
                        desc="Elige el nivel de servicio ideal para tu sede"
                        icon={Rocket01Icon}
                        action={
                            <div className="flex gap-1 p-1 bg-slate-100 dark:bg-white/5 rounded-md border border-slate-200 dark:border-white/10">
                                <button onClick={() => setBillingCycle('monthly')} className={`px-5 py-2 rounded-md text-[10px] font-black uppercase transition-all ${billingCycle === 'monthly' ? 'bg-slate-900 dark:bg-[#00df82] text-white dark:text-black shadow-md' : 'text-slate-400'}`}>Mensual</button>
                                <button onClick={() => setBillingCycle('annual')} className={`flex items-center gap-1.5 px-5 py-2 rounded-md text-[10px] font-black uppercase transition-all ${billingCycle === 'annual' ? 'bg-slate-900 dark:bg-[#00df82] text-white dark:text-black shadow-md' : 'text-slate-400'}`}>
                                    Anual <span className={`px-1.5 py-0.5 rounded-md text-[8px] ${billingCycle === 'annual' ? 'bg-emerald-500/20 dark:bg-black/20' : 'bg-emerald-500/10 text-emerald-600 dark:text-[#00df82]'}`}>-20%</span>
                                </button>
                            </div>
                        }
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                        {plans.map((p) => {
                            const isCurrent = activeTenant.planId === p.id;
                            const isRecommended = p.id === recommendedId && !isCurrent;
                            const price = billingCycle === 'annual' ? Math.round(p.price * 0.8) : p.price;
                            return (
                                <div key={p.id} className={`relative flex flex-col bg-white dark:bg-[#0B0F19] rounded-md border p-6 transition-all overflow-hidden ${isCurrent ? 'border-emerald-500 ring-1 ring-emerald-500/20 shadow-lg' : 'border-slate-100 dark:border-white/5 shadow-xs hover:border-emerald-500/30 hover:shadow-md'}`}>
                                    {isRecommended && (
                                        <span className="absolute top-0 right-0 px-3 py-1 bg-[#00df82] dark:bg-[#00df82] text-black text-[8px] font-black uppercase tracking-widest rounded-bl-md">
                                            Recomendado
                                        </span>
                                    )}
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{p.name}</h4>
                                        {isCurrent && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-[#00df82] text-[8px] font-black uppercase border border-emerald-500/20">
                                                <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-2.5 h-2.5" strokeWidth={2} /> Actual
                                            </span>
                                        )}
                                    </div>

                                    <div className="mb-4">
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">{formatPrice(price, false)}</span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">/MES</span>
                                        </div>
                                        {billingCycle === 'annual' && p.price > 0 && (
                                            <p className="text-[9px] font-black text-slate-300 dark:text-white/30 uppercase line-through mt-1">{formatPrice(p.price, false)} /mes</p>
                                        )}
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-300 text-[8px] font-black uppercase font-mono">
                                                {p.commission}% comisión
                                            </span>
                                            {billingCycle === 'annual' && p.price > 0 && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-[#00df82] text-[8px] font-black uppercase border border-emerald-500/20">
                                                    Ahorra {formatPrice(p.price - price, false)}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex-1 space-y-3 mb-8">
                                        {FEATURE_ORDER.map(key => {
                                            const active = p.features?.[key];
                                            const meta = FEATURE_LABELS[key];
                                            return (
                                                <div key={key} className={`flex items-center gap-2.5 ${active ? 'text-slate-700 dark:text-slate-200' : 'text-slate-300 dark:text-white/15'}`}>
                                                    <span className={active ? meta.color : 'opacity-30'}>{meta.icon}</span>
                                                    <span className="text-[9px] font-bold uppercase truncate">{meta.label}</span>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <button
                                        onClick={() => !isCurrent && setConfirmModal({ isOpen: true, planId: p.id, planName: p.name })}
                                        disabled={isCurrent || processingPlan !== null}
                                        className={`w-full py-3.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 ${isCurrent ? 'bg-slate-50 dark:bg-white/5 text-slate-400 border border-slate-100 dark:border-white/5' : 'bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black shadow-lg shadow-emerald-500/25 hover:brightness-110'}`}
                                    >
                                        {isCurrent ? 'Plan Actual' : (processingPlan === p.id ? <HugeiconsIcon icon={RefreshIcon} className="w-4 h-4 animate-spin" /> : <><span>Cambiar Plan</span><HugeiconsIcon icon={ArrowRight01Icon} className="w-3.5 h-3.5" strokeWidth={2} /></>)}
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* HISTORIAL */}
            {isHistoryModalOpen && (
                <div className="fixed inset-0 z-200 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn" onClick={() => setIsHistoryModalOpen(false)}>
                    <div className="bg-white dark:bg-[#0B0F19] w-full max-w-3xl rounded-md shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between gap-3 px-6 pt-6 pb-5 border-b border-slate-100 dark:border-white/5">
                            <div className="flex items-center gap-3.5">
                                <div className="w-10 h-10 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-[#00df82] shrink-0">
                                    <HugeiconsIcon icon={DocumentCodeIcon} className="w-5 h-5" strokeWidth={1.8} />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-[#00df82] mb-0.5">Registro financiero</p>
                                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none font-heading">Historial de Pagos</h3>
                                </div>
                            </div>
                            <button aria-label="Cerrar" onClick={() => setIsHistoryModalOpen(false)} className="p-2 bg-slate-100 dark:bg-white/5 rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all shrink-0">
                                <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" strokeWidth={2} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto custom-scrollbar">
                            {loadingInvoices ? <div className="text-center py-10 animate-pulse text-[10px] font-bold uppercase text-slate-400">Consultando registros...</div> : invoices.length === 0 ? (
                                <div className="py-14 text-center space-y-3">
                                    <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-md flex items-center justify-center mx-auto text-slate-300 border border-slate-200 dark:border-white/10">
                                        <HugeiconsIcon icon={DocumentCodeIcon} className="w-8 h-8" strokeWidth={1.4} />
                                    </div>
                                    <p className="text-[12px] font-black uppercase text-slate-400 tracking-widest">Sin pagos registrados</p>
                                </div>
                            ) : (
                                <table className="w-full text-left">
                                    <thead className="text-[9px] font-black uppercase text-slate-400 border-b border-slate-100 dark:border-white/5">
                                        <tr><th className="py-4">Fecha</th><th className="py-4">Plan</th><th className="py-4">Periodo</th><th className="py-4">Monto</th><th className="py-4 text-center">Estado</th><th className="py-4 text-center">Boleta</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-[10px] font-bold uppercase">
                                        {invoices.map(inv => (
                                            <tr key={inv.id} className="text-slate-600 dark:text-slate-300">
                                                <td className="py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-slate-900 dark:text-white">{weekdayShort(toDate(inv.date))} {inv.date.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}</span>
                                                        <span className="text-[9px] text-slate-400 font-mono">{inv.date.toLocaleDateString('es-CL', { year: 'numeric' })}</span>
                                                    </div>
                                                </td>
                                                <td className="py-4">{inv.planName || '—'}</td>
                                                <td className="py-4 text-slate-400">{inv.period ? monthYear(toDate(inv.period)) : '—'}</td>
                                                <td className="py-4 text-emerald-600 dark:text-[#00df82]">{formatPrice(inv.amount)}</td>
                                                <td className="py-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-black uppercase border ${inv.status === 'paid' || !inv.status ? 'bg-emerald-500/10 text-emerald-600 dark:text-[#00df82] border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${inv.status === 'paid' || !inv.status ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                                        {inv.status === 'paid' || !inv.status ? 'Pagado' : inv.status}
                                                    </span>
                                                </td>
                                                <td className="py-4 text-center">
                                                    <button className="p-2 bg-slate-50 dark:bg-white/5 rounded-md border border-slate-200 dark:border-white/10 text-slate-400 hover:text-emerald-600 dark:hover:text-[#00df82] hover:border-emerald-400/40 transition-all" title="Descargar boleta">
                                                        <HugeiconsIcon icon={Download01Icon} className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* CONFIRMACIÓN */}
            {confirmModal?.isOpen && (
                <div className="fixed inset-0 z-250 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn" onClick={() => setConfirmModal(null)}>
                    <div className="bg-white dark:bg-[#0B0F19] w-full max-w-sm rounded-md shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-6 pb-5 border-b border-slate-100 dark:border-white/5">
                            <div className="w-11 h-11 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-[#00df82] mb-3">
                                <HugeiconsIcon icon={Rocket01Icon} className="w-5 h-5" strokeWidth={1.8} />
                            </div>
                            <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white tracking-tight font-heading">Cambiar Suscripción</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 leading-relaxed">¿Deseas pasar al plan <span className="text-emerald-600 dark:text-[#00df82]">{confirmModal.planName}</span>?</p>
                        </div>
                        <div className="p-6 space-y-3">
                            <div className="flex items-center justify-between text-[10px] font-bold uppercase">
                                <span className="text-slate-400">Precio {billingCycle === 'annual' ? 'anual' : 'mensual'}</span>
                                <span className="text-slate-900 dark:text-white font-mono">{formatPrice(confirmPlan ? (billingCycle === 'annual' ? Math.round(confirmPlan.price * 0.8) : confirmPlan.price) : 0, false)}</span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] font-bold uppercase">
                                <span className="text-slate-400">Comisión</span>
                                <span className="text-slate-900 dark:text-white font-mono">{confirmPlan?.commission ?? 0}%</span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] font-bold uppercase">
                                <span className="text-slate-400">Aplica desde</span>
                                <span className="text-emerald-600 dark:text-[#00df82] font-mono">{formatShortDate(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1))}</span>
                            </div>
                            <div className="pt-3 flex flex-col gap-2.5">
                                <button onClick={executePlanChange} disabled={processingPlan !== null} className="w-full py-3.5 bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black rounded-md text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/25 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2">
                                    {processingPlan === confirmModal.planId ? <HugeiconsIcon icon={RefreshIcon} className="w-4 h-4 animate-spin" /> : <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-4 h-4" />} Confirmar Cambio
                                </button>
                                <button onClick={() => setConfirmModal(null)} className="w-full py-3 bg-slate-50 dark:bg-white/5 text-slate-400 rounded-md text-[10px] font-black uppercase">Cancelar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}