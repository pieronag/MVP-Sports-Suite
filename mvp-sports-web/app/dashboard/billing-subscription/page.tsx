"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/services/firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import {
    BuildingStorefrontIcon, CheckCircleIcon, MinusCircleIcon, BanknotesIcon,
    ArrowPathIcon, CurrencyDollarIcon, DocumentTextIcon, XMarkIcon,
    ArrowDownTrayIcon, SparklesIcon, InformationCircleIcon, ChevronRightIcon,
    GlobeAltIcon, TrophyIcon, MegaphoneIcon, ChartBarIcon, RocketLaunchIcon,
    LifebuoyIcon, BoltIcon, UsersIcon, CalendarIcon
} from '@heroicons/react/24/outline';
import { TarjetaKpi } from '@/components/ui/DashboardWidgets';

function HeaderSeccion({ titulo, desc }: any) {
    return (
        <div className="border-l-4 border-emerald-500 pl-4 space-y-1">
            <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white leading-none">{titulo}</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{desc}</p>
        </div>
    );
}

const FEATURE_LABELS: Record<string, { label: string, icon: any, color: string }> = {
    seo: { label: 'SEO y Google Search', icon: <GlobeAltIcon className="w-4 h-4" />, color: 'text-slate-400' },
    topPosition: { label: 'Prioridad en Búsquedas', icon: <TrophyIcon className="w-4 h-4" />, color: 'text-amber-500' },
    ads: { label: 'Publicidad en App', icon: <MegaphoneIcon className="w-4 h-4" />, color: 'text-violet-500' },
    analytics: { label: 'Métricas Avanzadas', icon: <ChartBarIcon className="w-4 h-4" />, color: 'text-emerald-500' },
    marketing: { label: 'Herramientas de Marketing', icon: <RocketLaunchIcon className="w-4 h-4" />, color: 'text-purple-500' },
    support: { label: 'Soporte VIP 24/7', icon: <LifebuoyIcon className="w-4 h-4" />, color: 'text-rose-500' },
    api: { label: 'Acceso a API', icon: <BoltIcon className="w-4 h-4" />, color: 'text-yellow-500' },
    multiRecinto: { label: 'Gestión Multi-Sede', icon: <UsersIcon className="w-4 h-4" />, color: 'text-slate-600' },
};

const FEATURE_ORDER = ['seo', 'topPosition', 'ads', 'analytics', 'marketing', 'support', 'api', 'multiRecinto'];

interface Plan { id: string; name: string; price: number; commission: number; features: { [key: string]: boolean }; }
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
                if (globalSnap.exists()) {
                    const data = globalSnap.data();
                    if (data.plans) setPlans(data.plans.sort((a: Plan, b: Plan) => a.price - b.price));
                }
                const snapTenants = await getDocs(query(collection(db, "tenants"), where("ownerId", "==", user.uid)));
                const tenantsList = snapTenants.docs.map(d => ({ id: d.id, ...d.data(), planId: d.data().planId || 'free' } as Tenant));
                
                // --- CHEQUEO DE CAMBIOS PROGRAMADOS ---
                const now = new Date();
                const processedTenants = await Promise.all(tenantsList.map(async (t) => {
                    if (t.pendingPlanId && t.scheduledChangeDate) {
                        const scheduledDate = t.scheduledChangeDate.toDate();
                        if (now >= scheduledDate) {
                            // La fecha ya pasó, ejecutar el cambio
                            const updateData = {
                                planId: t.pendingPlanId,
                                plan: t.pendingPlanName,
                                pendingPlanId: null,
                                pendingPlanName: null,
                                pendingPlanPrice: null,
                                pendingBillingCycle: null,
                                scheduledChangeDate: null,
                                lastPlanChange: Timestamp.fromDate(now)
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
            const planPrice = selectedPlan ? (billingCycle === 'annual' ? selectedPlan.price * 0.8 : selectedPlan.price) : 0;
            await updateDoc(doc(db, "tenants", selectedTenantId), { pendingPlanId: planId, pendingPlanName: planName, pendingPlanPrice: planPrice, pendingBillingCycle: billingCycle, scheduledChangeDate: Timestamp.fromDate(scheduledDate) });
            setTenants(prev => prev.map(t => t.id === selectedTenantId ? { ...t, pendingPlanId: planId, pendingPlanName: planName, scheduledChangeDate: Timestamp.fromDate(scheduledDate) } : t));
            showToast(`Cambio agendado para el ${scheduledDate.toLocaleDateString()}`, 'success');
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
    const formatPrice = (price: number, showCLP = true) => {
        if (price === 0) return "GRATIS";
        const formatted = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(price);
        return showCLP ? `${formatted} CLP` : formatted;
    };

    if (loading) return <div className="flex flex-col items-center justify-center py-20 gap-4"><div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cargando facturación...</p></div>;

    return (
        <div className="w-full space-y-5 pb-10 text-left relative">
            {toast && <div className={`fixed top-4 right-4 px-4 py-2.5 rounded-xl shadow-2xl text-[9px] font-black uppercase tracking-widest z-[300] text-white flex items-center gap-2 ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>{toast.msg}</div>}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-white/5">
                <div>
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="w-6 h-[2px] bg-emerald-500 rounded-full"></span>
                        <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 tracking-wider uppercase">Estado de cuenta</p>
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase leading-none">Pagos & <span className="text-emerald-500">Planes</span></h1>
                </div>
                <button onClick={() => setIsHistoryModalOpen(true)} className="px-6 py-2.5 bg-slate-100 dark:bg-white/5 text-slate-900 dark:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 active:scale-95"><DocumentTextIcon className="w-4 h-4 text-emerald-500" /> Historial de Pagos</button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <TarjetaKpi titulo="Sedes" valor={tenants.length.toString()} sub="INFRAESTRUCTURA" icon={<BuildingStorefrontIcon />} />
                <TarjetaKpi titulo="Costo Mensual" valor={formatPrice(tenants.reduce((acc, t) => { const p = plans.find(pl => pl.id === t.planId); return acc + (p?.price || 0); }, 0))} sub="TOTAL PLANES" icon={<CurrencyDollarIcon />} brillo />
                <TarjetaKpi titulo="Próximo Cobro" valor="Día 30" sub="FECHA ESTÁNDAR" icon={<CalendarIcon />} />
                <TarjetaKpi titulo="Ahorro Anual" valor="20% OFF" sub="PAGO ADELANTADO" icon={<SparklesIcon />} />
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/10 flex items-center gap-4">
                <InformationCircleIcon className="w-6 h-6 text-emerald-500 shrink-0" />
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase leading-relaxed">Los cambios de plan se aplican el primer día del mes siguiente para mantener tu facturación ordenada.</p>
            </div>

            <div className="space-y-6">
                <HeaderSeccion titulo="Mis Recintos" desc="Selecciona una sede para gestionar su suscripción." />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {tenants.map((t) => {
                        const isSelected = t.id === selectedTenantId;
                        const plan = plans.find(p => p.id === t.planId);
                        return (
                            <div key={t.id} onClick={() => setSelectedTenantId(t.id)} className={`p-5 rounded-2xl border cursor-pointer transition-all ${isSelected ? 'border-emerald-500 bg-white dark:bg-[#0B0F19] shadow-lg ring-1 ring-emerald-500/20' : 'border-slate-100 dark:border-white/5 bg-white dark:bg-[#0B0F19] opacity-60 hover:opacity-100'}`}>
                                <BuildingStorefrontIcon className={`w-8 h-8 mb-4 ${isSelected ? 'text-emerald-500' : 'text-slate-300'}`} />
                                <h4 className="text-sm font-black uppercase text-slate-900 dark:text-white truncate">{t.name}</h4>
                                <p className="text-[10px] font-bold text-emerald-500 uppercase mt-1">Plan {plan?.name || 'Básico'}</p>
                            </div>
                        )
                    })}
                </div>
            </div>

            {activeTenant?.pendingPlanId && (
                <div className="p-6 rounded-2xl bg-slate-900 text-white flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
                    <div className="flex items-center gap-4">
                        <SparklesIcon className="w-8 h-8 text-emerald-400" />
                        <div>
                            <p className="text-sm font-black uppercase">Cambio Pendiente</p>
                            <p className="text-[10px] font-bold opacity-70 uppercase">Pasarás al plan {activeTenant.pendingPlanName} el próximo mes.</p>
                        </div>
                    </div>
                    <button onClick={cancelScheduledChange} className="px-5 py-2.5 bg-white text-slate-900 rounded-xl text-[10px] font-black uppercase active:scale-95">Deshacer Cambio</button>
                </div>
            )}

            {activeTenant && (
                <div className="pt-10 space-y-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <HeaderSeccion titulo={`Planes para ${activeTenant.name}`} desc="Elige el nivel de servicio ideal para tu sede." />
                        <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
                            <button onClick={() => setBillingCycle('monthly')} className={`px-5 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${billingCycle === 'monthly' ? 'bg-white dark:bg-emerald-600 shadow-sm text-slate-900 dark:text-white' : 'text-slate-400'}`}>Mensual</button>
                            <button onClick={() => setBillingCycle('annual')} className={`px-5 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${billingCycle === 'annual' ? 'bg-white dark:bg-emerald-600 shadow-sm text-slate-900 dark:text-white' : 'text-slate-400'}`}>Anual -20%</button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                        {plans.map((p) => {
                            const isCurrent = activeTenant.planId === p.id;
                            return (
                                <div key={p.id} className={`flex flex-col bg-white dark:bg-[#0B0F19] rounded-3xl border p-6 transition-all ${isCurrent ? 'border-emerald-500 ring-1 ring-emerald-500/20' : 'border-slate-100 dark:border-white/5 shadow-sm'}`}>
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">{p.name}</h4>
                                    <div className="mb-6">
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">{formatPrice(billingCycle === 'annual' ? p.price * 0.8 * 12 : p.price, false)}</span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">{billingCycle === 'annual' ? '/AÑO' : '/MES'}</span>
                                        </div>
                                        <p className="text-[9px] font-black text-emerald-500 uppercase mt-1">+ {p.commission}% de comisión</p>
                                    </div>
                                    <div className="flex-1 space-y-3 mb-8">
                                        {FEATURE_ORDER.map(key => {
                                            const active = p.features?.[key];
                                            return <div key={key} className={`flex items-center gap-2 ${active ? 'text-slate-700 dark:text-slate-200' : 'text-slate-300 dark:text-slate-800'}`}><CheckCircleIcon className={`w-3.5 h-3.5 ${active ? 'text-emerald-500' : 'opacity-20'}`} /><span className="text-[9px] font-bold uppercase truncate">{FEATURE_LABELS[key].label}</span></div>
                                        })}
                                    </div>
                                    <button onClick={() => !isCurrent && setConfirmModal({ isOpen: true, planId: p.id, planName: p.name })} disabled={isCurrent || processingPlan !== null} className={`w-full py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${isCurrent ? 'bg-slate-50 dark:bg-white/5 text-slate-400 border border-slate-100 dark:border-white/5' : 'bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-900 shadow-lg'}`}>{isCurrent ? 'Plan Actual' : 'Cambiar Plan'}</button>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {isHistoryModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={() => setIsHistoryModalOpen(false)}>
                    <div className="bg-white dark:bg-[#0B0F19] w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center">
                            <h3 className="text-xs font-black uppercase text-slate-900 dark:text-white">Historial de Pagos</h3>
                            <button onClick={() => setIsHistoryModalOpen(false)} className="text-slate-400"><XMarkIcon className="w-6 h-6" /></button>
                        </div>
                        <div className="p-6 overflow-y-auto custom-scrollbar">
                            {loadingInvoices ? <div className="text-center py-10 animate-pulse text-[10px] font-bold uppercase text-slate-400">Consultando registros...</div> : invoices.length === 0 ? <div className="text-center py-10 text-[10px] font-bold uppercase text-slate-400">Sin pagos registrados</div> : (
                                <table className="w-full text-left">
                                    <thead className="text-[9px] font-black uppercase text-slate-400 border-b border-slate-100 dark:border-white/5">
                                        <tr><th className="py-4">Fecha</th><th className="py-4">Plan</th><th className="py-4">Monto</th><th className="py-4 text-center">Boleta</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-[10px] font-bold uppercase">
                                        {invoices.map(inv => (
                                            <tr key={inv.id} className="text-slate-600 dark:text-slate-300"><td className="py-4">{inv.date.toLocaleDateString()}</td><td className="py-4">{inv.planName || 'Básico'}</td><td className="py-4 text-emerald-600">{formatPrice(inv.amount)}</td><td className="py-4 text-center"><button className="p-2 bg-slate-50 dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10 text-slate-400 hover:text-slate-900 transition-all"><ArrowDownTrayIcon className="w-4 h-4" /></button></td></tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {confirmModal?.isOpen && (
                <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={() => setConfirmModal(null)}>
                    <div className="bg-white dark:bg-[#0B0F19] w-full max-w-sm rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 p-8 text-center" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-black uppercase text-slate-900 dark:text-white mb-2">Cambiar Suscripción</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-8 leading-relaxed">¿Deseas pasar al plan {confirmModal.planName}? El cambio se aplicará al inicio del próximo ciclo.</p>
                        <div className="flex flex-col gap-3">
                            <button onClick={executePlanChange} className="w-full py-3.5 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-emerald-600/20 active:scale-95">Confirmar Cambio</button>
                            <button onClick={() => setConfirmModal(null)} className="w-full py-3.5 bg-slate-50 dark:bg-white/5 text-slate-400 rounded-xl text-[10px] font-black uppercase">Cancelar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
