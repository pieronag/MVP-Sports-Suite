"use client";
// Configuración central (superadmin): planes, fiscal, identidad, staff y estado del núcleo.
// Cada pestaña vive en components/settings; aquí quedan la carga, el guardado y las acciones con auditoría.
import PageTitle, { Accent } from "@/components/dashboard/PageTitle";
import { useState, useEffect } from 'react';
import { postApi } from "@/services/client/apiClient";
import { HugeiconsIcon } from "@hugeicons/react";
import { MoneyBag01Icon, ServerIcon, UserGroupIcon, StarIcon, RefreshIcon, TrophyIcon, CpuIcon, ChartIncreaseIcon, IdentityCardIcon, FloppyDiskIcon } from '@hugeicons/core-free-icons';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, getCountFromServer, serverTimestamp, writeBatch, orderBy, limit } from 'firebase/firestore';
import { db } from '@/services/client/firebase';
import { TarjetaKpi } from '@/components/ui/DashboardWidgets';
import { useAuth } from '@/context/AuthContext';
import { useFeedback } from '@/components/ui/Feedback';
import { auditService } from '@/services/client/auditService';
import { DEFAULT_SETTINGS, resolvePlan, formatCLP, type SettingsData, type AdminUser, type Plan } from '@/components/settings/ui';
import PlansTab from '@/components/settings/PlansTab';
import FinanceTab from '@/components/settings/FinanceTab';
import IdentityTab from '@/components/settings/IdentityTab';
import StaffTab from '@/components/settings/StaffTab';
import SystemTab, { type SystemStats } from '@/components/settings/SystemTab';

/* eslint-disable @typescript-eslint/no-explicit-any */
type TabId = 'plans' | 'finance' | 'identity' | 'admin' | 'system';
const TABS: { id: TabId; label: string; icon: typeof CpuIcon }[] = [
    { id: 'plans', label: 'Comercial', icon: ChartIncreaseIcon },
    { id: 'finance', label: 'Fiscal', icon: MoneyBag01Icon },
    { id: 'identity', label: 'Identidad', icon: IdentityCardIcon },
    { id: 'admin', label: 'Staff', icon: UserGroupIcon },
    { id: 'system', label: 'Núcleo', icon: CpuIcon },
];

export default function SettingsPage() {
    const { user, role: userRole, firestoreUser } = useAuth();
    const { toast, confirm, alert } = useFeedback();
    const [activeTab, setActiveTab] = useState<TabId>('plans');
    const [settings, setSettings] = useState<SettingsData>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [togglingMaintenance, setTogglingMaintenance] = useState(false);
    const [dirty, setDirty] = useState(false);
    const [adminTeam, setAdminTeam] = useState<AdminUser[]>([]);
    const [systemStats, setSystemStats] = useState<SystemStats>({ tenants: 0, users: 0, bookings: 0, invoices: 0, reports: 0 });
    const [recentAudit, setRecentAudit] = useState<any[]>([]);
    const [planCounts, setPlanCounts] = useState<Record<string, number>>({});
    const [realStats, setRealStats] = useState({ totalRevenue: 0, eliteCount: 0, proCount: 0, totalTenants: 0 });

    // Registro de auditoría con el actor actual
    const audit = (action: string, module: string, details: string, severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW", ok: boolean) =>
        auditService.logAuditEvent({
            action, module, details, severity, status: ok ? 'SUCCESS' : 'FAILED',
            actor: firestoreUser?.fullName || user?.displayName || user?.email || 'Admin Sistema',
            role: userRole || 'sin-rol',
            email: user?.email || '',
        });

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
                let activePlans: Plan[] = DEFAULT_SETTINGS.plans;
                if (snap.exists()) {
                    const data = snap.data();
                    setSettings({ ...DEFAULT_SETTINGS, ...data } as SettingsData);
                    if (Array.isArray(data.plans) && data.plans.length > 0) activePlans = data.plans;
                }
                await loadTeam();
                const tenants = (await getDocs(collection(db, 'tenants'))).docs.map(d => d.data());
                const counts: Record<string, number> = {};
                tenants.forEach(t => { const p = resolvePlan(activePlans, t); const key = p ? (p.id || p.name) : 'other'; counts[key] = (counts[key] || 0) + 1; });
                setPlanCounts(counts);
                const top = Math.max(...activePlans.map(x => Number(x.price || 0)));
                const priceOf = (t: any) => Number(resolvePlan(activePlans, t)?.price || 0);
                setRealStats({
                    totalRevenue: tenants.reduce((acc, t) => acc + priceOf(t), 0),
                    eliteCount: tenants.filter(t => { const p = resolvePlan(activePlans, t); return !!p && Number(p.price) === top; }).length,
                    proCount: tenants.filter(t => { const pr = priceOf(t); return pr > 0 && pr < top; }).length,
                    totalTenants: tenants.length,
                });

                // Conteos agregados en el servidor
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

    // Aviso del navegador si se sale con cambios sin guardar
    useEffect(() => {
        if (!dirty) return;
        const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
        window.addEventListener('beforeunload', warn);
        return () => window.removeEventListener('beforeunload', warn);
    }, [dirty]);

    // ---- Edición local (queda pendiente hasta Guardar) ----
    const edit = (fn: (s: SettingsData) => SettingsData) => { setSettings(fn); setDirty(true); };
    const updateNested = (parent: 'sii' | 'paymentGateways' | 'legal' | 'corporateData', key: string, val: any) =>
        edit(s => ({ ...s, [parent]: { ...s[parent], [key]: val } }));
    const updatePlan = (idx: number, key: string, val: any) =>
        edit(s => ({ ...s, plans: s.plans.map((p, i) => i === idx ? { ...p, [key]: val } : p) }));
    const updatePlanFeature = (idx: number, key: string, val: boolean) =>
        edit(s => ({ ...s, plans: s.plans.map((p, i) => i === idx ? { ...p, features: { ...p.features, [key]: val } } : p) }));
    const addPlan = () =>
        edit(s => ({ ...s, plans: [...s.plans, { id: `plan_${Date.now()}`, name: 'Nuevo plan', price: 0, commission: 0, priorityScore: 0, features: {} }] }));
    const removePlan = async (idx: number) => {
        const plan = settings.plans[idx];
        const inUse = planCounts[plan.id || plan.name] || 0;
        if (inUse > 0) return alert('Plan en uso', `El plan ${plan.name} está asignado a ${inUse} recinto(s). Cámbialos de plan antes de eliminarlo.`);
        if (!await confirm({ title: 'Eliminar plan', message: `¿Eliminar el plan «${plan.name}»? El cambio se aplica al guardar.`, tone: 'danger', confirmLabel: 'Eliminar' })) return;
        edit(s => ({ ...s, plans: s.plans.filter((_, i) => i !== idx) }));
    };

    // Aplica a cada recinto lo que define su plan (prioridad, comisión, precio y beneficios)
    const syncTenantsToPlans = async (includeGlobal = false): Promise<number> => {
        const tSnap = await getDocs(collection(db, 'tenants'));
        const batch = writeBatch(db);
        let updated = 0;
        tSnap.docs.forEach(d => {
            const p = resolvePlan(settings.plans, d.data());
            if (!p) return;
            batch.update(d.ref, {
                commission: p.commission,
                priorityScore: p.priorityScore,
                planPrice: Number(p.price || 0),
                features: p.features,
                ...(includeGlobal ? { siiEnabled: settings.sii.enabled, availableGateways: settings.paymentGateways } : {}),
            });
            updated++;
        });
        await batch.commit();
        return updated;
    };

    const handleSyncPriorities = async () => {
        setSaving(true);
        try {
            const updated = await syncTenantsToPlans();
            await audit('PLAN_SYNC_PRIORITY', 'CONFIGURACIONES', `Peso de prioridad sincronizado en ${updated} recinto(s) según el plan configurado`, 'MEDIUM', true);
            toast(`Prioridad y beneficios actualizados en ${updated} recinto(s)`);
        } catch {
            await audit('PLAN_SYNC_PRIORITY', 'CONFIGURACIONES', 'Falla al sincronizar peso de prioridad de los recintos', 'MEDIUM', false);
            toast('No se pudo sincronizar la prioridad', 'error');
        } finally { setSaving(false); }
    };

    const validate = (): string | null => {
        const ids = new Set<string>();
        for (const p of settings.plans) {
            if (!p.name?.trim()) return 'Hay un plan sin nombre.';
            const key = (p.id || '').toLowerCase();
            if (ids.has(key)) return `El plan «${p.name}» está repetido.`;
            ids.add(key);
        }
        if (!/^\S+@\S+\.\S+$/.test(settings.supportEmail || '')) return 'El correo de soporte no es válido.';
        return null;
    };

    const handleSave = async () => {
        const problem = validate();
        if (problem) return alert('Revisa la configuración', problem);
        setSaving(true);
        try {
            await setDoc(doc(db, 'settings', 'global'), { ...settings, updatedAt: serverTimestamp() }, { merge: true });
            const updated = await syncTenantsToPlans(true);
            await audit('NÚCLEO_UPDATE', 'CONFIGURACIONES', `Sincronización masiva de parámetros globales y planes de negocio (${updated} recinto(s))`, 'HIGH', true);
            setDirty(false);
            toast(`Configuración guardada y aplicada a ${updated} recinto(s)`);
        } catch {
            await audit('NÚCLEO_UPDATE', 'CONFIGURACIONES', 'Falla al propagar configuraciones masivas del sistema', 'HIGH', false);
            toast('No se pudieron guardar los cambios', 'error');
        } finally { setSaving(false); }
    };

    // ---- Staff ----
    const promoteUser = async (email: string): Promise<boolean> => {
        if (!email) return false;
        setSaving(true);
        try {
            const snap = await getDocs(query(collection(db, 'users'), where('email', '==', email)));
            if (snap.empty) { await alert('Usuario no encontrado', `No hay una cuenta registrada con ${email}.`); return false; }
            const target = snap.docs[0];
            if (target.data().role === 'superadmin') { toast(`${email} ya es superadmin`, 'info'); return true; }
            if (!await confirm({ title: 'Elevar a superadmin', message: `${email} tendrá control total de la plataforma: planes, recintos, usuarios y staff.`, tone: 'warning', confirmLabel: 'Elevar' })) return false;
            await updateDoc(target.ref, { role: 'superadmin' });
            await audit('ELEVACIÓN_RANGO', 'STAFF', `SuperAdmin asignado a ${email}`, 'CRITICAL', true);
            toast(`${email} ahora es superadmin`);
            await loadTeam();
            return true;
        } catch {
            await audit('ELEVACIÓN_RANGO', 'STAFF', `Fallo al elevar privilegios de SuperAdmin para ${email}`, 'CRITICAL', false);
            toast('No se pudo asignar el rango', 'error');
            return false;
        } finally { setSaving(false); }
    };

    const demoteStaff = async (member: AdminUser) => {
        if (member.uid === user?.uid) return;
        if (!await confirm({ title: 'Degradar a administrador', message: `¿Quitar el rol Superadmin a ${member.email}? Mantendrá acceso como administrador.`, tone: 'warning', confirmLabel: 'Degradar' })) return;
        try {
            await updateDoc(doc(db, 'users', member.uid), { role: 'admin' });
            await audit('STAFF_DOWNGRADE', 'STAFF', `Rol Superadmin removido a ${member.email} (ahora admin)`, 'HIGH', true);
            await loadTeam();
            toast(`${member.email} ahora es administrador`);
        } catch {
            await audit('STAFF_DOWNGRADE', 'STAFF', `Fallo al degradar a ${member.email}`, 'HIGH', false);
            toast('No se pudo degradar el rol', 'error');
        }
    };

    const removeStaff = async (member: AdminUser) => {
        if (member.uid === user?.uid) return;
        if (!await confirm({ title: 'Quitar acceso', message: `¿Quitar acceso a ${member.email}? La cuenta quedará deshabilitada.`, tone: 'danger', confirmLabel: 'Quitar acceso' })) return;
        try {
            await postApi('/api/admin/user-status', { uid: member.uid, status: 'disabled' });
            await updateDoc(doc(db, 'users', member.uid), { role: 'player' });
            await audit('STAFF_ACCESS_REMOVED', 'STAFF', `Acceso removido a ${member.email}`, 'HIGH', true);
            await loadTeam();
            toast('El usuario ya no tiene acceso administrativo');
        } catch {
            await audit('STAFF_ACCESS_REMOVED', 'STAFF', `Fallo al remover acceso a ${member.email}`, 'HIGH', false);
            toast('No se pudo quitar el acceso', 'error');
        }
    };

    // ---- Mantenimiento (se aplica al instante, no espera a Guardar) ----
    const toggleMaintenance = async () => {
        const next = !settings.maintenanceMode;
        if (next && !await confirm({ title: 'Iniciar mantenimiento', message: 'La plataforma quedará en modo mantenimiento para todos los usuarios hasta que lo finalices.', tone: 'warning', confirmLabel: 'Iniciar' })) return;
        setTogglingMaintenance(true);
        try {
            await setDoc(doc(db, 'settings', 'global'), { maintenanceMode: next }, { merge: true });
            setSettings(s => ({ ...s, maintenanceMode: next }));
            await audit(next ? 'MAINTENANCE_ON' : 'MAINTENANCE_OFF', 'CONFIGURACIONES', next ? 'Modo mantenimiento activado' : 'Modo mantenimiento finalizado', 'HIGH', true);
            toast(next ? 'Mantenimiento activado' : 'Acceso restaurado');
        } catch {
            toast('No se pudo actualizar el mantenimiento', 'error');
        } finally { setTogglingMaintenance(false); }
    };

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
                <PageTitle eyebrow="Configuración central">Núcleo <Accent>Operativo</Accent></PageTitle>
                <div className="flex flex-wrap items-center gap-3">
                    {dirty && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[11px] md:text-[9px] font-black uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Cambios sin guardar
                        </span>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={saving || !dirty}
                        className="flex items-center gap-2 px-6 py-3 rounded-md bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black text-[11px] font-black uppercase tracking-wider shadow-lg shadow-emerald-500/25 hover:brightness-110 active:scale-95 transition-all disabled:opacity-40"
                    >
                        <HugeiconsIcon icon={saving ? RefreshIcon : FloppyDiskIcon} className={`w-4 h-4 ${saving ? 'animate-spin' : ''}`} strokeWidth={2} />
                        Guardar cambios
                    </button>
                </div>
            </div>

            {/* RESUMEN */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <TarjetaKpi titulo="Ingreso recurrente" valor={formatCLP(realStats.totalRevenue)} sub="Suma de planes activos" icono={<HugeiconsIcon icon={MoneyBag01Icon} className="w-6 h-6" strokeWidth={1.6} />} brillo />
                <TarjetaKpi titulo="Plan superior" valor={realStats.eliteCount} sub="Recintos en el plan más alto" icono={<HugeiconsIcon icon={TrophyIcon} className="w-6 h-6" strokeWidth={1.6} />} />
                <TarjetaKpi titulo="Planes pagos" valor={realStats.proCount} sub="Niveles intermedios" icono={<HugeiconsIcon icon={StarIcon} className="w-6 h-6" strokeWidth={1.6} />} />
                <TarjetaKpi titulo="Recintos" valor={realStats.totalTenants} sub="Total registrado" icono={<HugeiconsIcon icon={ServerIcon} className="w-6 h-6" strokeWidth={1.6} />} />
            </div>

            {/* TABS */}
            <div role="tablist" className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                {TABS.map(t => (
                    <button
                        key={t.id}
                        role="tab"
                        aria-selected={activeTab === t.id}
                        onClick={() => setActiveTab(t.id)}
                        className={`flex items-center gap-2.5 px-5 py-2.5 rounded-md border text-xs md:text-[10px] font-black uppercase transition-all shrink-0 ${
                            activeTab === t.id
                                ? 'bg-emerald-500 dark:bg-[#00df82] border-emerald-500 dark:border-[#00df82] text-white dark:text-black shadow-lg shadow-emerald-500/20'
                                : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white'
                        }`}
                    >
                        <HugeiconsIcon icon={t.icon} className="w-4 h-4" strokeWidth={1.8} />{t.label}
                    </button>
                ))}
            </div>

            <div className="rounded-md bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 p-4 sm:p-8 min-h-[600px]">
                {activeTab === 'plans' && (
                    <PlansTab plans={settings.plans} planCounts={planCounts} busy={saving}
                        onSync={handleSyncPriorities} onAdd={addPlan} onRemove={removePlan} onUpdate={updatePlan} onToggleFeature={updatePlanFeature} />
                )}
                {activeTab === 'finance' && (
                    <FinanceTab sii={settings.sii} gateways={settings.paymentGateways} onChange={updateNested} />
                )}
                {activeTab === 'identity' && (
                    <IdentityTab settings={settings} onNested={updateNested} onRoot={(key, val) => edit(s => ({ ...s, [key]: val }))} />
                )}
                {activeTab === 'admin' && (
                    <StaffTab team={adminTeam} selfUid={user?.uid} busy={saving} onPromote={promoteUser} onDemote={demoteStaff} onRemove={removeStaff} />
                )}
                {activeTab === 'system' && (
                    <SystemTab stats={systemStats} maintenance={settings.maintenanceMode} maintenanceBusy={togglingMaintenance} onToggleMaintenance={toggleMaintenance} audit={recentAudit} />
                )}
            </div>
        </div>
    );
}
