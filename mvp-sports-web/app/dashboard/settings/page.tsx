"use client";
import React, { useState, useEffect } from 'react';
import { postApi } from "@/services/client/apiClient";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    Settings01Icon,
    MoneyBag01Icon,
    ServerIcon,
    UserGroupIcon,
    ScaleIcon,
    Alert02Icon,
    Database01Icon,
    StarIcon,
    MarketingIcon,
    BarChartIcon,
    LifebuoyIcon,
    Key01Icon,
    RefreshIcon,
    CheckmarkCircle02Icon,
    Add01Icon,
    UserCircleIcon,
    ShieldCheckIcon,
    Delete02Icon,
    TrophyIcon,
    BoltIcon,
    InformationCircleIcon,
    Search01Icon,
    Shield01Icon,
    CheckmarkBadge01Icon,
    CpuIcon,
    ChartIncreaseIcon,
    IdentityCardIcon,
    ArrowUpRight01Icon,
    CreditCardIcon,
    FloppyDiskIcon,
} from '@hugeicons/core-free-icons';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, getCountFromServer, serverTimestamp, writeBatch, setDoc, orderBy, limit } from 'firebase/firestore';
import { db } from '@/services/client/firebase';
import { TarjetaKpi } from '@/components/ui/DashboardWidgets';
import { useAuth } from '@/context/AuthContext';
import { auditService } from '@/services/client/auditService';

// --- INTERFACES ---
interface SettingsData {
    platformName: string; supportEmail: string; maintenanceMode: boolean;
    corporateData: { rut: string; razonSocial: string; direccion: string; giro: string; representante: string; emailFacturacion: string; };
    plans: any[]; paymentGateways: { mercadoPago: boolean }; legal: { terms: string; privacy: string };
    sii: { enabled: boolean; testMode: boolean; taxRate: number; rutEmpresa: string; enableForTenants: boolean; };
}

interface AdminUser { uid: string; fullName?: string; email: string; role: string; status: string; }
interface ModalConfig { show: boolean; title: string; message: string; type: 'confirm' | 'alert' | 'success' | 'danger'; confirmText?: string; onConfirm?: () => void; onCancel?: () => void; }

const DEFAULT_SETTINGS: SettingsData = {
    platformName: 'MVP Sports Suite', supportEmail: 'central@mvpsports.cl', maintenanceMode: false,
    corporateData: { rut: '78.392.951-1', razonSocial: 'ORION TECHNOLOGY SpA', direccion: 'San Pedro 1417, Rancagua', giro: 'Desarrollo de Software', representante: 'Representante legal', emailFacturacion: 'soporte@mvpsports.cl' },
    plans: [
        { id: 'free', name: 'Free', price: 0, commission: 4.0, priorityScore: 10, features: {} },
        { id: 'basic', name: 'Básico', price: 29990, commission: 3.0, priorityScore: 30, features: { topPosition: true } },
        { id: 'pro', name: 'Pro', price: 59990, commission: 2.0, priorityScore: 60, features: { topPosition: true, multiRecinto: true, analytics: true, marketing: true } },
        { id: 'elite', name: 'Elite', price: 99990, commission: 0, priorityScore: 100, features: { topPosition: true, multiRecinto: true, analytics: true, marketing: true, support: true } }
    ],
    paymentGateways: { mercadoPago: true },
    legal: { terms: 'Términos y condiciones de uso de la plataforma...', privacy: 'Política de privacidad y tratamiento de datos...' },
    sii: { enabled: false, testMode: true, taxRate: 19, rutEmpresa: '78.392.951-1', enableForTenants: false }
};

const benefitCatalog = [
    { key: 'topPosition', label: 'Prioridad en búsquedas', icon: <HugeiconsIcon icon={TrophyIcon} className="w-4 h-4" strokeWidth={1.8} /> },
    { key: 'multiRecinto', label: 'Multi-recinto', icon: <HugeiconsIcon icon={UserGroupIcon} className="w-4 h-4" strokeWidth={1.8} /> },
    { key: 'analytics', label: 'Análisis de datos', icon: <HugeiconsIcon icon={BarChartIcon} className="w-4 h-4" strokeWidth={1.8} /> },
    { key: 'marketing', label: 'Cupones y marketing', icon: <HugeiconsIcon icon={MarketingIcon} className="w-4 h-4" strokeWidth={1.8} /> },
    { key: 'support', label: 'Soporte 24/7', icon: <HugeiconsIcon icon={LifebuoyIcon} className="w-4 h-4" strokeWidth={1.8} /> },
];

const formatCLP = (n: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n || 0);

function HeaderSeccion({ titulo, desc }: any) {
    return (
        <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
                <span className="w-6 h-[2px] bg-emerald-500 rounded-md" />
                <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white leading-none font-heading">{titulo}</h3>
            </div>
            <p className="text-xs md:text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed pl-9">{desc}</p>
        </div>
    );
}

function Toggle({ on, onChange, color = 'bg-emerald-500 dark:bg-[#00df82]' }: { on: boolean; onChange: () => void; color?: string }) {
    return (
        <button onClick={onChange} aria-label="Alternar" className={`w-11 h-6 rounded-full relative transition-all ${on ? color : 'bg-slate-200 dark:bg-white/10'}`}>
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-md ${on ? 'right-0.5' : 'left-0.5'}`}></div>
        </button>
    );
}

export default function SettingsPage() {
    const { user, role: userRole, firestoreUser } = useAuth();
    const [activeTab, setActiveTab] = useState('plans');
    const [settings, setSettings] = useState<SettingsData>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);
    const [adminTeam, setAdminTeam] = useState<AdminUser[]>([]);
    const [isExecuting, setIsExecuting] = useState(false);
    const [promoEmail, setPromoEmail] = useState('');
    const [staffSearch, setStaffSearch] = useState('');
    const [systemStats, setSystemStats] = useState({ tenants: 0, users: 0, bookings: 0, invoices: 0, reports: 0 });
    const [recentAudit, setRecentAudit] = useState<any[]>([]);
    const [planCounts, setPlanCounts] = useState<Record<string, number>>({});
    const [realStats, setRealStats] = useState({ totalRevenue: 0, eliteCount: 0, proCount: 0, totalTenants: 0 });
    const [modal, setModal] = useState<ModalConfig>({ show: false, title: '', message: '', type: 'confirm' });
    const [confirmValue, setConfirmValue] = useState('');

    const actorName = firestoreUser?.fullName || user?.displayName || user?.email || 'Admin Sistema';
    const actorRole = userRole || 'sin-rol';
    const actorEmail = user?.email || 'admin@mvpsports.cl';
    const isSelf = (uid: string) => uid === user?.uid;

    const showModal = (config: Partial<ModalConfig>) => {
        setConfirmValue('');
        setModal({ show: true, title: config.title || 'Atención', message: config.message || '', type: config.type || 'confirm', confirmText: config.confirmText, onConfirm: config.onConfirm, onCancel: () => setModal(prev => ({ ...prev, show: false })) });
    };
    const markDirty = () => setDirty(true);

    const loadTeam = async () => {
        try {
            const teamSnap = await getDocs(query(collection(db, 'users'), where('role', 'in', ['admin', 'superadmin'])));
            setAdminTeam(teamSnap.docs.map(d => ({ uid: d.id, ...d.data() } as AdminUser)));
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const snap = await getDoc(doc(db, 'settings', 'global'));
                let activePlans = DEFAULT_SETTINGS.plans;
                if (snap.exists()) {
                    const data = snap.data();
                    setSettings({ ...DEFAULT_SETTINGS, ...data } as SettingsData);
                    if (Array.isArray(data.plans) && data.plans.length > 0) activePlans = data.plans;
                }
                const resolvePlan = (t: any) => {
                    const ref = (t.planId || t.plan || '').toString().trim().toLowerCase();
                    return ref ? activePlans.find((p: any) => (p.id || '').toLowerCase() === ref || (p.name || '').toLowerCase() === ref) : undefined;
                };
                await loadTeam();
                const tSnap = await getDocs(collection(db, 'tenants'));
                const tenants = tSnap.docs.map(d => d.data());
                const counts: Record<string, number> = {};
                tenants.forEach(t => { const p = resolvePlan(t); const key = p ? (p.id || p.name) : 'other'; counts[key] = (counts[key] || 0) + 1; });
                setPlanCounts(counts);
                const priceOf = (t: any) => { const p = resolvePlan(t); return p ? Number(p.price || 0) : 0; };
                setRealStats({
                    totalRevenue: tenants.reduce((acc, t) => acc + priceOf(t), 0),
                    eliteCount: tenants.filter(t => { const p = resolvePlan(t); return p && Number(p.price) === Math.max(...activePlans.map((x: any) => Number(x.price || 0))); }).length,
                    proCount: tenants.filter(t => { const p = resolvePlan(t); return p && Number(p.price) > 0 && Number(p.price) < Math.max(...activePlans.map((x: any) => Number(x.price || 0))); }).length,
                    totalTenants: tenants.length
                });

                // Estado del sistema (Núcleo)
                // Conteos agregados en el servidor (antes descargaba las 5 colecciones completas)
                const count = (c: string) => getCountFromServer(collection(db, c)).then(r => r.data().count);
                const [tenantsN, usersN, bookingsN, invoicesN, reportsN, aSnap] = await Promise.all([
                    count('tenants'), count('users'), count('bookings'), count('invoices'), count('reports'),
                    getDocs(query(collection(db, 'audit'), orderBy('timestamp', 'desc'), limit(6))),
                ]);
                setSystemStats({ tenants: tenantsN, users: usersN, bookings: bookingsN, invoices: invoicesN, reports: reportsN });
                setRecentAudit(aSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (e) { console.error(e); } finally { setLoading(false); }
        };
        fetchData();
    }, []);

    // Sincroniza los tenants con la configuración de planes actual (peso prioridad, comisión, precio, features)
    const syncTenantsToPlans = async (includeGlobal = false): Promise<number> => {
        const tSnap = await getDocs(collection(db, 'tenants'));
        const batch = writeBatch(db);
        let updated = 0;
        tSnap.docs.forEach(d => {
            const ref = (d.data().planId || d.data().plan || '').toString().trim().toLowerCase();
            const p = settings.plans.find(pl => (pl.id || '').toLowerCase() === ref || (pl.name || '').toLowerCase() === ref);
            if (p) {
                batch.update(d.ref, {
                    commission: p.commission,
                    priorityScore: p.priorityScore,
                    planPrice: Number(p.price || 0),
                    features: p.features,
                    ...(includeGlobal ? {
                        siiEnabled: settings.sii.enabled,
                        availableGateways: settings.paymentGateways
                    } : {})
                });
                updated++;
            }
        });
        await batch.commit();
        return updated;
    };

    const handleSyncPriorities = async () => {
        setSaving(true);
        try {
            const updated = await syncTenantsToPlans();
            await auditService.logAuditEvent({
                action: 'PLAN_SYNC_PRIORITY',
                module: 'CONFIGURACIONES',
                details: `Peso de prioridad sincronizado en ${updated} recinto(s) según el plan configurado`,
                severity: 'MEDIUM',
                status: 'SUCCESS',
                actor: actorName,
                role: actorRole,
                email: actorEmail
            });
            showModal({ title: "Prioridad sincronizada", message: `Peso de prioridad y beneficios actualizados en ${updated} recinto(s).`, type: 'success' });
            setTimeout(() => setModal(prev => ({ ...prev, show: false })), 2000);
        } catch (e) {
            await auditService.logAuditEvent({
                action: 'PLAN_SYNC_PRIORITY',
                module: 'CONFIGURACIONES',
                details: 'Falla al sincronizar peso de prioridad de los recintos',
                severity: 'MEDIUM',
                status: 'FAILED',
                actor: actorName,
                role: actorRole,
                email: actorEmail
            });
            showModal({ title: "Error", message: "No se pudo sincronizar la prioridad.", type: 'danger' });
        } finally { setSaving(false); }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateDoc(doc(db, 'settings', 'global'), { ...settings, updatedAt: serverTimestamp() });
            const updated = await syncTenantsToPlans(true);
            await auditService.logAuditEvent({
                action: 'NÚCLEO_UPDATE',
                module: 'CONFIGURACIONES',
                details: `Sincronización masiva de parámetros globales y planes de negocio (${updated} recinto(s))`,
                severity: 'HIGH',
                status: 'SUCCESS',
                actor: actorName,
                role: actorRole,
                email: actorEmail
            });
            setDirty(false);
            showModal({ title: "Núcleo sincronizado", message: "Configuración propagada exitosamente.", type: 'success' });
            setTimeout(() => setModal(prev => ({ ...prev, show: false })), 2000);
        } catch (e) {
            await auditService.logAuditEvent({
                action: 'NÚCLEO_UPDATE',
                module: 'CONFIGURACIONES',
                details: 'Falla al propagar configuraciones masivas del sistema',
                severity: 'HIGH',
                status: 'FAILED',
                actor: actorName,
                role: actorRole,
                email: actorEmail
            });
            showModal({ title: "Falla crítica", message: "Error al propagar cambios.", type: 'danger' });
        } finally { setSaving(false); }
    };

    const promoteUser = async () => {
        if (!promoEmail) return;
        setSaving(true);
        try {
            const snap = await getDocs(query(collection(db, 'users'), where('email', '==', promoEmail)));
            if (snap.empty) return showModal({ title: "Error", message: "Usuario no existe", type: 'danger' });
            await updateDoc(snap.docs[0].ref, { role: 'superadmin' });
            await auditService.logAuditEvent({
                action: 'ELEVACIÓN_RANGO',
                module: 'STAFF',
                details: `SuperAdmin asignado a ${promoEmail}`,
                severity: 'CRITICAL',
                status: 'SUCCESS',
                actor: actorName,
                role: actorRole,
                email: actorEmail
            });
            showModal({ title: "Rango elevado", message: "Privilegios asignados correctamente.", type: 'success' });
            setPromoEmail('');
            await loadTeam();
        } catch (e) {
            await auditService.logAuditEvent({
                action: 'ELEVACIÓN_RANGO',
                module: 'STAFF',
                details: `Fallo al elevar privilegios de SuperAdmin para ${promoEmail}`,
                severity: 'CRITICAL',
                status: 'FAILED',
                actor: actorName,
                role: actorRole,
                email: actorEmail
            });
            showModal({ title: "Error", message: "Falla en transacción", type: 'danger' });
        } finally { setSaving(false); }
    };

    const demoteStaff = (member: AdminUser) => {
        if (isSelf(member.uid)) return showModal({ title: "No permitido", message: "No puedes degradar tu propia cuenta.", type: 'danger' });
        showModal({
            title: "Degradar a administrador",
            message: `¿Quitar el rol Superadmin a ${member.email}? Mantendrá acceso como administrador.`,
            type: 'danger',
            confirmText: 'DEGRADAR',
            onConfirm: async () => {
                setModal(prev => ({ ...prev, show: false }));
                try {
                    await updateDoc(doc(db, 'users', member.uid), { role: 'admin' });
                    await auditService.logAuditEvent({
                        action: 'STAFF_DOWNGRADE',
                        module: 'STAFF',
                        details: `Rol Superadmin removido a ${member.email} (ahora admin)`,
                        severity: 'HIGH',
                        status: 'SUCCESS',
                        actor: actorName,
                        role: actorRole,
                        email: actorEmail
                    });
                    await loadTeam();
                    showModal({ title: "Rol actualizado", message: `${member.email} ahora es administrador.`, type: 'success' });
                } catch (e) {
                    await auditService.logAuditEvent({
                        action: 'STAFF_DOWNGRADE',
                        module: 'STAFF',
                        details: `Fallo al degradar a ${member.email}`,
                        severity: 'HIGH',
                        status: 'FAILED',
                        actor: actorName,
                        role: actorRole,
                        email: actorEmail
                    });
                    showModal({ title: "Error", message: "No se pudo degradar el rol.", type: 'danger' });
                }
            }
        });
    };

    const removeStaff = (member: AdminUser) => {
        if (isSelf(member.uid)) return showModal({ title: "No permitido", message: "No puedes quitar acceso a tu propia cuenta.", type: 'danger' });
        showModal({
            title: "Quitar acceso",
            message: `¿Quitar acceso a ${member.email}? El usuario quedará deshabilitado.`,
            type: 'danger',
            confirmText: 'QUITAR',
            onConfirm: async () => {
                setModal(prev => ({ ...prev, show: false }));
                try {
                    await postApi('/api/admin/user-status', { uid: member.uid, status: 'disabled' });
                    await updateDoc(doc(db, 'users', member.uid), { role: 'player' });
                    await auditService.logAuditEvent({
                        action: 'STAFF_ACCESS_REMOVED',
                        module: 'STAFF',
                        details: `Acceso removido a ${member.email}`,
                        severity: 'HIGH',
                        status: 'SUCCESS',
                        actor: actorName,
                        role: actorRole,
                        email: actorEmail
                    });
                    await loadTeam();
                    showModal({ title: "Acceso removido", message: "El usuario ya no tiene acceso administrativo.", type: 'success' });
                } catch (e) {
                    await auditService.logAuditEvent({
                        action: 'STAFF_ACCESS_REMOVED',
                        module: 'STAFF',
                        details: `Fallo al remover acceso a ${member.email}`,
                        severity: 'HIGH',
                        status: 'FAILED',
                        actor: actorName,
                        role: actorRole,
                        email: actorEmail
                    });
                    showModal({ title: "Error", message: "No se pudo quitar el acceso.", type: 'danger' });
                }
            }
        });
    };

    const updateNested = (parent: keyof SettingsData, key: string, val: any) => {
        setSettings(prev => {
            const parentValue = prev[parent];
            if (typeof parentValue === 'object' && parentValue !== null && !Array.isArray(parentValue)) {
                return { ...prev, [parent]: { ...parentValue, [key]: val } };
            }
            return { ...prev, [parent]: val };
        });
        markDirty();
    };
    const updatePlanFeature = (idx: number, key: string, val: boolean) => {
        const np = [...settings.plans];
        np[idx].features = { ...np[idx].features, [key]: val };
        setSettings({ ...settings, plans: np });
        markDirty();
    };
    const updatePlan = (idx: number, key: string, val: any) => {
        const np = [...settings.plans];
        np[idx][key] = val;
        setSettings({ ...settings, plans: np });
        markDirty();
    };
    const addPlan = () => {
        const np = [...settings.plans, { id: `plan_${Date.now()}`, name: 'Nuevo plan', price: 0, commission: 0, priorityScore: 0, features: {} }];
        setSettings({ ...settings, plans: np });
        markDirty();
    };
    const removePlan = (idx: number) => {
        const plan = settings.plans[idx];
        const inUse = planCounts[plan.id || plan.name] || 0;
        if (inUse > 0) return showModal({ title: "Plan en uso", message: `El plan ${plan.name} está asignado a ${inUse} recinto(s). No se puede eliminar.`, type: 'danger' });
        showModal({
            title: "Eliminar plan",
            message: `¿Eliminar el plan "${plan.name}"?`,
            type: 'danger',
            confirmText: 'ELIMINAR',
            onConfirm: () => {
                const np = [...settings.plans];
                np.splice(idx, 1);
                setSettings({ ...settings, plans: np });
                markDirty();
                setModal(prev => ({ ...prev, show: false }));
            }
        });
    };

    const tabs = [
        { id: 'plans', label: 'Comercial', icon: <HugeiconsIcon icon={ChartIncreaseIcon} className="w-4 h-4" strokeWidth={1.8} /> },
        { id: 'finance', label: 'Fiscal', icon: <HugeiconsIcon icon={MoneyBag01Icon} className="w-4 h-4" strokeWidth={1.8} /> },
        { id: 'identity', label: 'Identidad', icon: <HugeiconsIcon icon={IdentityCardIcon} className="w-4 h-4" strokeWidth={1.8} /> },
        { id: 'admin', label: 'Staff', icon: <HugeiconsIcon icon={UserGroupIcon} className="w-4 h-4" strokeWidth={1.8} /> },
        { id: 'system', label: 'Núcleo', icon: <HugeiconsIcon icon={CpuIcon} className="w-4 h-4" strokeWidth={1.8} /> },
    ];

    const inputCls = "w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md px-4 py-2.5 text-xs font-bold outline-hidden text-slate-800 dark:text-white focus:border-emerald-500/40 transition-all";
    const panelCls = "rounded-md bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 p-6";

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-5">
                <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                <p className="text-xs md:text-[10px] font-black uppercase text-slate-400 tracking-[0.3em]">Cargando configuración...</p>
            </div>
        );
    }

    return (
        <div className="w-full space-y-6 pb-10 text-left relative animate-fadeIn">
            {/* CABECERA */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="w-6 h-[2px] bg-emerald-500 rounded-md" />
                        <p className="text-[11px] font-black text-emerald-600 dark:text-[#00df82] tracking-[0.2em] uppercase">Configuración central</p>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none font-heading">
                        Núcleo <span className="text-emerald-500 dark:text-[#00df82]">Operativo</span>
                    </h1>
                </div>
                <div className="flex items-center gap-3">
                    {dirty && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[11px] md:text-[9px] font-black uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Cambios sin guardar
                        </span>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={saving || isExecuting || !dirty}
                        className="flex items-center gap-2 px-6 py-3 rounded-md bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black text-[11px] font-black uppercase tracking-wider shadow-lg shadow-emerald-500/25 hover:brightness-110 active:scale-95 transition-all disabled:opacity-40"
                    >
                        {saving ? <HugeiconsIcon icon={RefreshIcon} className="w-4 h-4 animate-spin" strokeWidth={2} /> : <HugeiconsIcon icon={FloppyDiskIcon} className="w-4 h-4" strokeWidth={2} />}
                        Guardar cambios
                    </button>
                </div>
            </div>

            {/* RESUMEN */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 [&>*:last-child:nth-child(odd)]:col-span-2 sm:[&>*:last-child:nth-child(odd)]:col-span-1">
                <TarjetaKpi titulo="Ingreso recurrente" valor={formatCLP(realStats.totalRevenue)} sub="Suma de planes activos" icono={<HugeiconsIcon icon={MoneyBag01Icon} className="w-6 h-6" strokeWidth={1.6} />} brillo />
                <TarjetaKpi titulo="Plan Elite" valor={realStats.eliteCount} sub="Recintos en nivel superior" icono={<HugeiconsIcon icon={TrophyIcon} className="w-6 h-6" strokeWidth={1.6} />} />
                <TarjetaKpi titulo="Planes pagos" valor={realStats.proCount} sub="Niveles intermedios" icono={<HugeiconsIcon icon={StarIcon} className="w-6 h-6" strokeWidth={1.6} />} />
                <TarjetaKpi titulo="Recintos" valor={realStats.totalTenants} sub="Total registrado" icono={<HugeiconsIcon icon={ServerIcon} className="w-6 h-6" strokeWidth={1.6} />} />
            </div>

            {/* TABS */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                {tabs.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id)}
                        className={`flex items-center gap-2.5 px-5 py-2.5 rounded-md border text-xs md:text-[10px] font-black uppercase transition-all shrink-0 ${
                            activeTab === t.id
                                ? 'bg-emerald-500 dark:bg-[#00df82] border-emerald-500 dark:border-[#00df82] text-white dark:text-black shadow-lg shadow-emerald-500/20'
                                : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white'
                        }`}
                    >
                        {t.icon}{t.label}
                    </button>
                ))}
            </div>

            <div className="rounded-md bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 p-6 sm:p-8 min-h-[600px]">
                {/* COMERCIAL */}
                {activeTab === 'plans' && (
                    <div className="space-y-8 animate-fadeIn">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <HeaderSeccion titulo="Modelos de monetización" desc="Gestión de planes SaaS, precios y comisiones transaccionales." />
                            <div className="flex items-center gap-2 shrink-0">
                                <button onClick={handleSyncPriorities} disabled={saving || isExecuting} title="Actualiza en Firebase el peso de prioridad y beneficios de todos los recintos según su plan" className="flex items-center gap-2 px-4 py-2.5 rounded-md bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 text-xs md:text-[10px] font-black uppercase tracking-wider hover:border-emerald-400 dark:hover:border-[#00df82]/40 hover:text-emerald-600 dark:hover:text-[#00df82] transition-all disabled:opacity-40">
                                    <HugeiconsIcon icon={RefreshIcon} className={`w-4 h-4 ${saving ? 'animate-spin' : ''}`} strokeWidth={2} />
                                    Sincronizar prioridad
                                </button>
                                <button onClick={addPlan} className="flex items-center gap-2 px-4 py-2.5 rounded-md bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black text-xs md:text-[10px] font-black uppercase tracking-wider shadow-lg shadow-emerald-500/25 hover:brightness-110 active:scale-95 transition-all shrink-0">
                                    <HugeiconsIcon icon={Add01Icon} className="w-4 h-4" strokeWidth={2} />
                                    Añadir plan
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                            {settings.plans.map((p, idx) => {
                                const used = planCounts[p.id || p.name] || 0;
                                return (
                                    <div key={p.id} className="rounded-md bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 p-6 transition-all relative overflow-hidden">
                                        <div className="flex justify-between items-start mb-6">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="w-3 h-[2px] bg-emerald-500 rounded-md"></span>
                                                    <p className="text-[11px] md:text-[8px] font-black text-emerald-600 dark:text-[#00df82] uppercase tracking-[0.2em]">Suscripción</p>
                                                </div>
                                                <h4 className="text-lg font-black uppercase text-slate-900 dark:text-white leading-none font-heading">{p.name}</h4>
                                                <span className={`inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-md text-[11px] md:text-[8px] font-black uppercase ${used > 0 ? 'bg-emerald-500/15 text-emerald-600 dark:text-[#00df82]' : 'bg-slate-100 dark:bg-white/5 text-slate-400'}`}>
                                                    <HugeiconsIcon icon={ServerIcon} className="w-3 h-3" strokeWidth={2} />
                                                    {used} recinto(s)
                                                </span>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <div className="flex items-center gap-1 bg-slate-50 dark:bg-white/5 px-3 py-1.5 rounded-md border border-slate-200 dark:border-white/10">
                                                    <span className="text-xs md:text-[10px] font-black text-emerald-600 dark:text-[#00df82]">$</span>
                                                    <input
                                                        type="number" min={0}
                                                        value={p.price}
                                                        onChange={e => updatePlan(idx, 'price', Math.max(0, parseInt(e.target.value) || 0))}
                                                        className="w-16 bg-transparent text-sm font-black outline-hidden text-slate-900 dark:text-white text-right font-mono"
                                                    />
                                                </div>
                                                <p className="text-[11px] md:text-[7px] font-black text-slate-400 uppercase mt-0.5">
                                                    {formatCLP(Number(p.price || 0))} <span className="opacity-70">· Neto {formatCLP(Math.round(Number(p.price || 0) / 1.19))}</span>
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 mb-6">
                                            <div className="p-3.5 bg-slate-50 dark:bg-white/5 rounded-md border border-slate-200 dark:border-white/10">
                                                <p className="text-[11px] md:text-[7px] font-black text-slate-400 uppercase mb-1.5 tracking-widest leading-none">Comisión %</p>
                                                <div className="flex items-center gap-1">
                                                    <span className="text-emerald-600 dark:text-[#00df82] font-black text-xs md:text-[10px]">%</span>
                                                    <input type="number" step="0.1" min={0} max={100} value={p.commission} onChange={e => updatePlan(idx, 'commission', Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))} className="w-full bg-transparent text-xs font-black outline-hidden text-slate-900 dark:text-white font-mono" />
                                                </div>
                                            </div>
                                            <div className="p-3.5 bg-slate-50 dark:bg-white/5 rounded-md border border-slate-200 dark:border-white/10">
                                                <p className="text-[11px] md:text-[7px] font-black text-slate-400 uppercase mb-1.5 tracking-widest leading-none">Peso prioridad</p>
                                                <div className="flex items-center gap-1">
                                                    <HugeiconsIcon icon={BoltIcon} className="w-3 h-3 text-indigo-500" strokeWidth={1.8} />
                                                    <input type="number" min={0} value={p.priorityScore} onChange={e => updatePlan(idx, 'priorityScore', Math.max(0, parseInt(e.target.value) || 0))} className="w-full bg-transparent text-xs font-black outline-hidden text-slate-900 dark:text-white font-mono" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-3.5 pt-6 border-t border-slate-100 dark:border-white/5">
                                            <p className="text-[11px] md:text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] mb-3 pl-1">Beneficios del plan</p>
                                            {benefitCatalog.map(b => (
                                                <div key={b.key} className="flex items-center justify-between">
                                                    <div className={`flex items-center gap-3 transition-all ${p.features?.[b.key] ? 'text-slate-900 dark:text-white' : 'text-slate-300 dark:text-white/10'}`}>
                                                        <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${p.features?.[b.key] ? 'bg-emerald-500/10 text-emerald-600 dark:text-[#00df82]' : 'bg-slate-100 dark:bg-white/5'}`}>{b.icon}</div>
                                                        <span className="text-[11px] md:text-[9px] font-black uppercase tracking-tight">{b.label}</span>
                                                    </div>
                                                    <Toggle on={!!p.features?.[b.key]} onChange={() => updatePlanFeature(idx, b.key, !p.features?.[b.key])} />
                                                </div>
                                            ))}
                                        </div>

                                        <button onClick={() => removePlan(idx)} className="mt-5 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] md:text-[8px] font-black uppercase text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all">
                                            <HugeiconsIcon icon={Delete02Icon} className="w-3.5 h-3.5" strokeWidth={2} />
                                            Eliminar plan
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                        <p className="flex items-center gap-2 text-[11px] md:text-[8px] font-bold text-slate-400 uppercase leading-relaxed">
                            <HugeiconsIcon icon={InformationCircleIcon} className="w-3.5 h-3.5 shrink-0" strokeWidth={1.8} />
                            El "peso de prioridad" ordena los recintos en el directorio del player: los planes con "Prioridad Top" aparecen primero y, dentro de estos, se ordenan por este valor (mayor = primero).
                        </p>
                    </div>
                )}

                {/* FISCAL */}
                {activeTab === 'finance' && (
                    <div className="space-y-8 animate-fadeIn">
                        <HeaderSeccion titulo="Impuestos y facturación" desc="Factura electrónica (SII) y medios de pago para tus recintos." />
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                            <div className={`${panelCls} space-y-5`}>
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-[#00df82]"><HugeiconsIcon icon={ScaleIcon} className="w-5 h-5" strokeWidth={1.6} /></div>
                                    <h4 className="text-[11px] font-black uppercase text-slate-900 dark:text-white tracking-widest leading-none font-heading">Factura electrónica (SII)</h4>
                                </div>
                                <div className="space-y-4">
                                    {[
                                        { label: 'Facturación automática', desc: 'Emitir boleta y factura electrónica (SII)', key: 'enabled', color: 'bg-emerald-500 dark:bg-[#00df82]' },
                                        { label: 'Modo de pruebas', desc: 'Usar el entorno de pruebas (sandbox) de Mercado Pago', key: 'testMode', color: 'bg-amber-500' },
                                        { label: 'Facturar a todos tus recintos', desc: 'Habilita el envío de DTE a cada sede', key: 'enableForTenants', color: 'bg-emerald-500 dark:bg-[#00df82]' },
                                    ].map(row => (
                                        <div key={row.key} className="flex items-center justify-between bg-white dark:bg-white/5 p-4 rounded-md border border-slate-200 dark:border-white/10">
                                            <div>
                                                <p className="text-xs md:text-[10px] font-black uppercase tracking-tight text-slate-900 dark:text-white">{row.label}</p>
                                                <p className="text-[11px] md:text-[8px] font-bold text-slate-400 uppercase mt-1">{row.desc}</p>
                                            </div>
                                            <Toggle on={settings.sii[row.key as keyof typeof settings.sii] as boolean} onChange={() => updateNested('sii', row.key, !settings.sii[row.key as keyof typeof settings.sii])} color={row.color} />
                                        </div>
                                    ))}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest pl-2">RUT de la empresa</label>
                                            <input type="text" value={settings.sii.rutEmpresa} onChange={e => updateNested('sii', 'rutEmpresa', e.target.value)} className={inputCls} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest pl-2">IVA (%)</label>
                                            <input type="number" min={0} max={100} value={settings.sii.taxRate} onChange={e => updateNested('sii', 'taxRate', Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))} className={inputCls} />
                                        </div>
                                    </div>
                                    <p className="text-[11px] md:text-[8px] font-bold text-slate-400 uppercase leading-relaxed">
                                        <HugeiconsIcon icon={InformationCircleIcon} className="w-3 h-3 inline mr-1" strokeWidth={1.8} />
                                        El IVA se aplica automáticamente a las liquidaciones del módulo de facturación.
                                    </p>
                                </div>
                            </div>

                            <div className={`${panelCls} space-y-5`}>
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-md bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500"><HugeiconsIcon icon={CreditCardIcon} className="w-5 h-5" strokeWidth={1.6} /></div>
                                    <h4 className="text-[11px] font-black uppercase text-slate-900 dark:text-white tracking-widest leading-none font-heading">Medios de pago</h4>
                                </div>
                                <div className="space-y-3">
                                    {[['mercadoPago', 'Mercado Pago']].map(([id, label]) => (
                                        <div key={id} className="flex items-center justify-between p-5 bg-white dark:bg-white/5 rounded-md border border-slate-200 dark:border-white/10">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-md bg-slate-100 dark:bg-white/5 flex items-center justify-center text-indigo-500"><HugeiconsIcon icon={MoneyBag01Icon} className="w-5 h-5" strokeWidth={1.6} /></div>
                                                <div>
                                                    <p className="text-xs md:text-[10px] font-black uppercase text-slate-900 dark:text-white">{label}</p>
                                                    <p className="text-[11px] md:text-[8px] font-bold text-slate-400 uppercase mt-0.5">{settings.paymentGateways[id as keyof typeof settings.paymentGateways] ? 'Activa' : 'Inactiva'}</p>
                                                </div>
                                            </div>
                                            <Toggle on={settings.paymentGateways[id as keyof typeof settings.paymentGateways]} onChange={() => updateNested('paymentGateways', id, !settings.paymentGateways[id as keyof typeof settings.paymentGateways])} color="bg-indigo-600" />
                                        </div>
                                    ))}
                                </div>
                            </div>

                        </div>
                    </div>
                )}

                {/* IDENTIDAD */}
                {activeTab === 'identity' && (
                    <div className="space-y-8 animate-fadeIn">
                        <HeaderSeccion titulo="Marca y datos de la empresa" desc="Nombre de la plataforma y datos legales que aparecen en los documentos." />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-5">
                                <div className={panelCls}>
                                    <label className="text-xs md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block pl-1">Nombre de la plataforma</label>
                                    <input type="text" value={settings.platformName} onChange={e => { setSettings({ ...settings, platformName: e.target.value }); markDirty(); }} className={inputCls} />
                                </div>
                                <div className={panelCls}>
                                    <label className="text-xs md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block pl-1">Correo de soporte</label>
                                    <input type="email" value={settings.supportEmail} onChange={e => { setSettings({ ...settings, supportEmail: e.target.value }); markDirty(); }} className={inputCls} />
                                </div>
                                <div className={panelCls}>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-xs md:text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Términos y condiciones</label>
                                        <span className="text-[11px] md:text-[8px] font-black text-slate-300 uppercase">Legal</span>
                                    </div>
                                    <textarea rows={4} value={settings.legal.terms} onChange={e => updateNested('legal', 'terms', e.target.value)} className={`${inputCls} resize-y`} />
                                </div>
                                <div className={panelCls}>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-xs md:text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Política de privacidad</label>
                                        <span className="text-[11px] md:text-[8px] font-black text-slate-300 uppercase">Legal</span>
                                    </div>
                                    <textarea rows={4} value={settings.legal.privacy} onChange={e => updateNested('legal', 'privacy', e.target.value)} className={`${inputCls} resize-y`} />
                                </div>
                            </div>
                            <div className={`${panelCls} space-y-4 h-fit`}>
                                <div className="flex items-center gap-3 mb-2">
                                    <HugeiconsIcon icon={ScaleIcon} className="w-4 h-4 text-emerald-600 dark:text-[#00df82]" strokeWidth={1.8} />
                                    <h4 className="text-[11px] font-black uppercase text-slate-900 dark:text-white tracking-widest font-heading">Datos legales</h4>
                                </div>
                                {[['razonSocial', 'Razón social'], ['rut', 'RUT'], ['direccion', 'Dirección'], ['giro', 'Giro'], ['representante', 'Representante'], ['emailFacturacion', 'Correo de facturación']].map(([key, label]) => (
                                    <div key={key}>
                                        <label className="text-[11px] md:text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1.5 block pl-1">{label}</label>
                                        <input type="text" value={settings.corporateData[key as keyof typeof settings.corporateData]} onChange={e => updateNested('corporateData', key, e.target.value)} className={inputCls} />
                                    </div>
                                ))}
                                <div className="pt-2 flex items-start gap-2 rounded-md bg-emerald-500/10 border border-emerald-500/20 p-3">
                                    <HugeiconsIcon icon={InformationCircleIcon} className="w-4 h-4 text-emerald-600 dark:text-[#00df82] shrink-0 mt-0.5" strokeWidth={1.8} />
                                    <p className="text-[11px] md:text-[8px] font-bold text-slate-500 dark:text-slate-400 uppercase leading-relaxed">
                                        Estos datos se usan como emisor en las liquidaciones PDF y en los documentos legales de la plataforma.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* STAFF */}
                {activeTab === 'admin' && (
                    <div className="space-y-8 animate-fadeIn">
                        <HeaderSeccion titulo="Staff directivo" desc="Jerarquía y privilegios de acceso al núcleo administrativo." />
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-md bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10">
                            <div className="flex items-center gap-4 text-xs md:text-[10px] font-black uppercase tracking-wider">
                                <span className="text-slate-500 dark:text-slate-300">Total: <span className="text-slate-900 dark:text-white">{adminTeam.length}</span></span>
                                <span className="text-slate-500 dark:text-slate-300">Superadmins: <span className="text-indigo-500">{adminTeam.filter(a => a.role === 'superadmin').length}</span></span>
                                <span className="text-slate-500 dark:text-slate-300">Admins: <span className="text-emerald-600 dark:text-[#00df82]">{adminTeam.filter(a => a.role !== 'superadmin').length}</span></span>
                            </div>
                            <div className="relative w-full sm:w-64">
                                <HugeiconsIcon icon={Search01Icon} className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" strokeWidth={2} />
                                <input
                                    type="text"
                                    value={staffSearch}
                                    onChange={e => setStaffSearch(e.target.value)}
                                    placeholder="Buscar por nombre o correo..."
                                    className="w-full pl-9 pr-3 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-emerald-500/40 rounded-md text-xs md:text-[10px] font-black outline-hidden text-slate-700 dark:text-white placeholder:text-slate-400"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="rounded-md bg-indigo-600 shadow-xl shadow-indigo-500/10 p-6 h-fit">
                                <div className="flex items-center gap-3 mb-4">
                                    <HugeiconsIcon icon={ShieldCheckIcon} className="w-5 h-5 text-white" strokeWidth={1.8} />
                                    <h4 className="text-[11px] font-black text-indigo-100 uppercase tracking-widest leading-none font-heading">Elevar privilegios</h4>
                                </div>
                                <div className="space-y-3">
                                    <input type="email" value={promoEmail} onChange={e => setPromoEmail(e.target.value)} className="w-full bg-white/10 border-none rounded-md px-4 py-3 text-[11px] font-black placeholder-indigo-300 text-white outline-hidden focus:ring-2 ring-white/20" placeholder="email@mvp.cl" />
                                    <button onClick={promoteUser} disabled={saving} className="w-full py-3 bg-white text-indigo-600 rounded-md text-xs md:text-[10px] font-black uppercase active:scale-95 shadow-lg hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2">
                                        Asignar rango <HugeiconsIcon icon={ArrowUpRight01Icon} className="w-3.5 h-3.5" strokeWidth={2} />
                                    </button>
                                </div>
                            </div>
                            <div className="lg:col-span-2 space-y-3">
                                {adminTeam.filter(a => !staffSearch || a.email.toLowerCase().includes(staffSearch.toLowerCase()) || (a.fullName || '').toLowerCase().includes(staffSearch.toLowerCase())).map(a => (
                                    <div key={a.uid} className="flex items-center justify-between p-5 bg-white dark:bg-white/5 rounded-md border border-slate-200 dark:border-white/10 transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-md bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400"><HugeiconsIcon icon={UserCircleIcon} className="w-6 h-6" strokeWidth={1.6} /></div>
                                            <div>
                                                <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase leading-none mb-1">{a.fullName || 'Administrador'}{isSelf(a.uid) ? ' (tú)' : ''}</p>
                                                <p className="text-[11px] md:text-[9px] font-bold text-slate-400 font-mono">{a.email}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`px-3 py-1 rounded-full text-[11px] md:text-[8px] font-black uppercase tracking-widest ${a.role === 'superadmin' ? 'bg-indigo-600 text-white' : 'bg-emerald-500 text-white'}`}>{a.role === 'superadmin' ? 'Superadmin' : 'Admin'}</span>
                                            {a.role === 'superadmin' && (
                                                <button
                                                    onClick={() => demoteStaff(a)}
                                                    disabled={isSelf(a.uid)}
                                                    title={isSelf(a.uid) ? 'No puedes degradar tu propia cuenta' : 'Degradar a administrador'}
                                                    className="p-2 text-slate-300 hover:text-amber-500 transition-colors rounded-md hover:bg-amber-50 dark:hover:bg-amber-500/10 disabled:opacity-30 disabled:hover:text-slate-300 disabled:hover:bg-transparent"
                                                >
                                                    <HugeiconsIcon icon={BoltIcon} className="w-4 h-4" strokeWidth={1.8} />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => removeStaff(a)}
                                                disabled={isSelf(a.uid)}
                                                title={isSelf(a.uid) ? 'No puedes quitarte tu propio acceso' : 'Quitar acceso'}
                                                className="p-2 text-slate-300 hover:text-red-500 transition-colors rounded-md hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-30 disabled:hover:text-slate-300 disabled:hover:bg-transparent"
                                            >
                                                <HugeiconsIcon icon={Delete02Icon} className="w-4 h-4" strokeWidth={1.8} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {adminTeam.length === 0 && (
                                    <div className="py-16 text-center">
                                        <HugeiconsIcon icon={UserGroupIcon} className="w-10 h-10 text-slate-200 dark:text-white/10 mx-auto mb-3" strokeWidth={1.6} />
                                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Sin staff registrado</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* NÚCLEO */}
                {activeTab === 'system' && (
                    <div className="space-y-8 animate-fadeIn">
                        <HeaderSeccion titulo="Estado del sistema" desc="Métricas en tiempo real del núcleo y mantenimiento de la plataforma." />

                        {/* KPIs del sistema */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                            {[
                                { label: 'Recintos', value: systemStats.tenants, icon: <HugeiconsIcon icon={ServerIcon} className="w-5 h-5" strokeWidth={1.6} /> },
                                { label: 'Usuarios', value: systemStats.users, icon: <HugeiconsIcon icon={UserGroupIcon} className="w-5 h-5" strokeWidth={1.6} /> },
                                { label: 'Reservas', value: systemStats.bookings, icon: <HugeiconsIcon icon={Database01Icon} className="w-5 h-5" strokeWidth={1.6} /> },
                                { label: 'Facturas', value: systemStats.invoices, icon: <HugeiconsIcon icon={MoneyBag01Icon} className="w-5 h-5" strokeWidth={1.6} /> },
                                { label: 'Reportes', value: systemStats.reports, icon: <HugeiconsIcon icon={Alert02Icon} className="w-5 h-5" strokeWidth={1.6} /> },
                            ].map(s => (
                                <div key={s.label} className="rounded-md bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 p-5">
                                    <div className="text-emerald-600 dark:text-[#00df82] mb-3">{s.icon}</div>
                                    <p className="text-2xl font-black text-slate-900 dark:text-white font-mono leading-none">{s.value}</p>
                                    <p className="text-[11px] md:text-[8px] font-black text-slate-400 uppercase tracking-wider mt-2">{s.label}</p>
                                </div>
                            ))}
                        </div>

                        {/* Mantenimiento */}
                        <div className="rounded-md bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-5 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className={`w-11 h-11 rounded-md flex items-center justify-center ${settings.maintenanceMode ? 'bg-amber-500/15 text-amber-500' : 'bg-emerald-500/15 text-emerald-600 dark:text-[#00df82]'}`}>
                                    <HugeiconsIcon icon={Shield01Icon} className="w-6 h-6" strokeWidth={1.6} />
                                </div>
                                <div>
                                    <p className="text-[11px] font-black uppercase text-slate-900 dark:text-white tracking-wider font-heading">Modo mantenimiento</p>
                                    <p className="text-[11px] md:text-[8px] font-bold text-slate-400 uppercase mt-1">
                                        {settings.maintenanceMode ? 'Activo: la plataforma está en mantenimiento.' : 'Inactivo: acceso normal para todos los usuarios.'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    const next = !settings.maintenanceMode;
                                    updateDoc(doc(db, 'settings', 'global'), { maintenanceMode: next }).then(() => {
                                        setSettings(s => ({ ...s, maintenanceMode: next }));
                                        showModal({ title: next ? 'Mantenimiento activado' : 'Mantenimiento finalizado', message: next ? 'La plataforma queda en modo mantenimiento.' : 'El acceso quedó restaurado.', type: 'success' });
                                    }).catch(() => showModal({ title: 'Error', message: 'No se pudo actualizar el mantenimiento.', type: 'danger' }));
                                }}
                                className={`px-6 py-3 rounded-md text-xs md:text-[10px] font-black uppercase shadow-lg active:scale-95 transition-all ${settings.maintenanceMode ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-amber-500 text-white hover:bg-amber-600'}`}
                            >
                                {settings.maintenanceMode ? 'Finalizar mantenimiento' : 'Iniciar mantenimiento'}
                            </button>
                        </div>

                        {/* Auditoría reciente */}
                        <div className={`${panelCls} space-y-4`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-md bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500"><HugeiconsIcon icon={Database01Icon} className="w-5 h-5" strokeWidth={1.6} /></div>
                                    <h4 className="text-[11px] font-black uppercase text-slate-900 dark:text-white tracking-widest leading-none font-heading">Auditoría reciente</h4>
                                </div>
                                <span className="text-[11px] md:text-[8px] font-black text-slate-400 uppercase">Últimos {recentAudit.length} eventos</span>
                            </div>
                            <div className="space-y-2.5">
                                {recentAudit.length > 0 ? recentAudit.map((log) => {
                                    const sev = (log.severity || 'LOW').toUpperCase();
                                    const sevStyle = ['CRITICAL', 'HIGH'].includes(sev) ? 'bg-red-500/15 text-red-600 border-red-500/30 dark:text-red-400' : sev === 'MEDIUM' ? 'bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400' : 'bg-slate-500/15 text-slate-600 border-slate-500/30 dark:text-slate-400';
                                    const time = log.timeStr || (log.timestamp?.seconds ? new Date(log.timestamp.seconds * 1000).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '');
                                    const date = log.dateStr || (log.timestamp?.seconds ? new Date(log.timestamp.seconds * 1000).toLocaleDateString('es-CL') : '');
                                    return (
                                        <div key={log.id || `${log.action}-${log.timestamp?.seconds}`} className="flex items-center justify-between gap-4 p-4 rounded-md bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <span className={`px-2 py-0.5 rounded-md text-[11px] md:text-[8px] font-black uppercase border shrink-0 ${sevStyle}`}>{sev === 'CRITICAL' ? 'Crítica' : sev === 'HIGH' ? 'Alta' : sev === 'MEDIUM' ? 'Media' : 'Baja'}</span>
                                                <div className="min-w-0">
                                                    <p className="text-xs md:text-[10px] font-black text-slate-900 dark:text-white uppercase truncate">{log.action || 'EVENTO'}</p>
                                                    <p className="text-[11px] md:text-[8px] font-bold text-slate-400 uppercase truncate">{log.module} · {log.actor || 'Sistema'}</p>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-[11px] md:text-[9px] font-black text-slate-500 dark:text-slate-300 font-mono">{time}</p>
                                                <p className="text-[11px] md:text-[8px] font-bold text-slate-400 uppercase">{date}</p>
                                            </div>
                                        </div>
                                    );
                                }) : (
                                    <div className="py-10 text-center">
                                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Sin eventos de auditoría</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL */}
            {modal.show && (
                <div className="fixed inset-0 z-1000 flex items-center justify-center p-6 bg-black/70 backdrop-blur-md animate-fadeIn" onClick={() => setModal(prev => ({ ...prev, show: false }))}>
                    <div className="bg-white dark:bg-[#0B0F19] w-full max-w-md rounded-md shadow-2xl border border-slate-200 dark:border-white/10 p-8 text-center relative overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className={`w-16 h-16 rounded-md mx-auto mb-6 flex items-center justify-center shadow-xl ${modal.type === 'danger' ? 'bg-red-500 text-white' : 'bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black'}`}>
                            {modal.type === 'danger' ? <HugeiconsIcon icon={Alert02Icon} className="w-8 h-8" strokeWidth={1.8} /> : <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-8 h-8" strokeWidth={1.8} />}
                        </div>
                        <h3 className="text-xl font-black uppercase text-slate-900 dark:text-white mb-3 tracking-tighter leading-none font-heading">{modal.title}</h3>
                        <p className="text-[11px] font-bold text-slate-400 uppercase mb-6 leading-relaxed tracking-widest">{modal.message}</p>
                        {modal.confirmText && (
                            <input
                                type="text"
                                value={confirmValue}
                                onChange={e => setConfirmValue(e.target.value)}
                                placeholder={`Escribe ${modal.confirmText} para confirmar`}
                                className={`${inputCls} mb-6 text-center font-mono tracking-[0.3em] ${modal.type === 'danger' ? 'border-red-500/40' : ''}`}
                            />
                        )}
                        {modal.type === 'confirm' || modal.type === 'danger' ? (
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={() => { modal.onConfirm?.(); setModal(prev => ({ ...prev, show: false })); }}
                                    disabled={!!modal.confirmText && confirmValue.trim().toUpperCase() !== modal.confirmText.toUpperCase()}
                                    className={`w-full py-3.5 text-white rounded-md text-xs md:text-[10px] font-black uppercase shadow-2xl active:scale-95 transition-all disabled:opacity-40 ${modal.type === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-500 dark:bg-[#00df82] dark:text-black hover:brightness-110'}`}
                                >
                                    Ejecutar protocolo
                                </button>
                                <button onClick={() => setModal(prev => ({ ...prev, show: false }))} className="w-full py-3.5 bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 rounded-md text-xs md:text-[10px] font-black uppercase transition-all hover:bg-slate-200 dark:hover:bg-white/10">Abortar operación</button>
                            </div>
                        ) : (
                            <button onClick={() => setModal(prev => ({ ...prev, show: false }))} className="w-full py-3.5 bg-emerald-500 dark:bg-[#00df82] dark:text-black text-white rounded-md text-xs md:text-[10px] font-black uppercase shadow-2xl active:scale-95 transition-all hover:brightness-110">Entendido</button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}