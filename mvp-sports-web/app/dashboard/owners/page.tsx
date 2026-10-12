"use client";
import React, { useState, useEffect } from 'react';
import { postApi } from "@/services/client/apiClient";
import { HugeiconsIcon } from '@hugeicons/react';
import {
    Search01Icon,
    CallIcon,
    Mail01Icon,
    CheckmarkCircle02Icon,
    Alert02Icon,
    Add01Icon,
    PencilEdit02Icon,
    Cancel01Icon,
    IdentityCardIcon,
    InformationCircleIcon,
    Key01Icon,
    RefreshIcon,
    Copy01Icon,
    MoneyBag01Icon,
    UserGroupIcon,
    CheckmarkBadge01Icon,
    Building01Icon,
    Grid02Icon,
    ListViewIcon,
    UserCircleIcon,
} from '@hugeicons/core-free-icons';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, where, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '@/services/client/firebase';
import { TarjetaKpi } from '@/components/ui/DashboardWidgets';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import ModalPortal from '@/components/ui/ModalPortal';
import OwnerWizard, { EMPTY_OWNER_FORM, OwnerFormState } from '@/components/dashboard/OwnerWizard';
import OwnerProfileModal from '@/components/dashboard/OwnerProfileModal';
import { PASSWORD_MIN, passwordIssue } from "@/utils/password";

interface Owner {
    id: string;
    name: string;
    company: string;
    email: string;
    phone: string;
    rut: string;
    billingAddress: string;
    tier: string;
    totalMrr: number;
    debt: number;
    paymentHistory: string[];
    venues: { name: string; plan: string }[];
    photoURL?: string;
    status: string;
    createdAt: any;
}

const ic = "w-6 h-6";

export default function Page() {
    const [owners, setOwners] = useState<Owner[]>([]);
    const [filter, setFilter] = useState('Todos');
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const [wizardOpen, setWizardOpen] = useState(false);
    const [wizardMode, setWizardMode] = useState<'create' | 'edit'>('create');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [wizardInitial, setWizardInitial] = useState<OwnerFormState>(EMPTY_OWNER_FORM);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [passwordOwner, setPasswordOwner] = useState<Owner | null>(null);
    const [manualPassword, setManualPassword] = useState('');

    const [createdCredentials, setCreatedCredentials] = useState<{ email: string, pass: string } | null>(null);
    const [ownerToDelete, setOwnerToDelete] = useState<Owner | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [ownerToToggle, setOwnerToToggle] = useState<Owner | null>(null);
    const [isToggling, setIsToggling] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
    const [profileOwner, setProfileOwner] = useState<Owner | null>(null);
    const [notification, setNotification] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);

    const addToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setNotification({ msg, type });
        setTimeout(() => setNotification(null), 4000);
    };

    const fetchOwners = async () => {
        setLoading(true);
        try {
            const settingsSnap = await getDoc(doc(db, "settings", "global"));
            let priceMap: Record<string, number> = {};
            let maxPlanPrice = 0;
            if (settingsSnap.exists()) {
                const plans = settingsSnap.data().plans || [];
                plans.forEach((p: any) => {
                    if (p.name) priceMap[p.name.trim().toLowerCase()] = Number(p.price || 0);
                    if (p.id) priceMap[p.id.trim().toLowerCase()] = Number(p.price || 0);
                    if (Number(p.price || 0) > maxPlanPrice) maxPlanPrice = Number(p.price);
                });
            }
            // Umbrales derivados de los planes reales de la BD (sin hardcodear):
            // ORO = 2x el plan más caro · VIP PLATINO = 4x el plan más caro.
            const goldThreshold = maxPlanPrice * 2;
            const platinumThreshold = maxPlanPrice * 4;
            const resolvePrice = (t: any): number => {
                const key = (t.planId || t.plan || '').toString().trim().toLowerCase();
                return key && priceMap[key] !== undefined ? priceMap[key] : 0;
            };

            const ownersSnapshot = await getDocs(query(collection(db, "users"), where("role", "==", "owner")));
            const tenantsSnapshot = await getDocs(query(collection(db, "tenants")));
            const allTenants = tenantsSnapshot.docs.map(d => ({ ...d.data(), id: d.id }));

            const loadedOwners: Owner[] = ownersSnapshot.docs.map(doc => {
                const data = doc.data();
                const myTenants = allTenants.filter((t: any) => t.ownerId === doc.id || (t.ownerIds && t.ownerIds.includes(doc.id)));
                const ownerVenues = myTenants.map((t: any) => ({ name: t.name, plan: t.planId || t.plan }));
                const totalMrr = myTenants.reduce((sum: number, t: any) => sum + resolvePrice(t), 0);
                const totalDebt = myTenants.filter((t: any) => t.debtStatus === 'Vencido').reduce((sum: number, t: any) => sum + resolvePrice(t), 0);

                let tier = 'ESTÁNDAR';
                if (platinumThreshold > 0 && totalMrr >= platinumThreshold) tier = 'VIP PLATINO';
                else if (goldThreshold > 0 && totalMrr >= goldThreshold) tier = 'ORO';

                return {
                    id: doc.id,
                    name: data.displayName || "Sin Nombre",
                    company: data.companyName || "Particular",
                    email: data.email || "-",
                    phone: data.phone || "+56 9 .... ....",
                    rut: data.rut || "---",
                    billingAddress: data.billingAddress || "---",
                    tier, totalMrr, debt: totalDebt,
                    paymentHistory: data.paymentHistory || [],
                    venues: ownerVenues,
                    photoURL: data.photoURL || "",
                    status: data.status === 'active' ? 'Activo' : 'Suspendido',
                    createdAt: data.createdAt
                };
            });
            setOwners(loadedOwners);
        } catch (error) { addToast("Error al cargar dueños", 'error'); } finally { setLoading(false); }
    };

    useEffect(() => { fetchOwners(); }, []);

    const handleDeleteOwner = async () => {
        if (!ownerToDelete) return;
        setIsDeleting(true);
        try {
            await fetch('/dashboard/owners/api', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${await auth.currentUser?.getIdToken()}` }, body: JSON.stringify({ action: 'delete', uid: ownerToDelete.id }) });
            await deleteDoc(doc(db, "users", ownerToDelete.id));
            setOwners(prev => prev.filter(o => o.id !== ownerToDelete.id));
            setOwnerToDelete(null);
            addToast("Dueño eliminado correctamente", 'success');
        } catch (error) { addToast("Error al eliminar dueño", 'error'); } finally { setIsDeleting(false); }
    };

    const openCreate = () => {
        setWizardMode('create');
        setEditingId(null);
        setWizardInitial(EMPTY_OWNER_FORM);
        setWizardOpen(true);
    };

    const openEdit = (owner: Owner) => {
        setWizardMode('edit');
        setEditingId(owner.id);
        setWizardInitial({
            name: owner.name,
            email: owner.email,
            phone: owner.phone,
            company: owner.company,
            rut: owner.rut,
            billingAddress: owner.billingAddress,
            password: '',
        });
        setWizardOpen(true);
    };

    const handleSubmit = async (form: OwnerFormState) => {
        setIsSubmitting(true);
        try {
            const ownerData = {
                displayName: form.name,
                email: form.email,
                phone: form.phone,
                companyName: form.company,
                rut: form.rut,
                billingAddress: form.billingAddress,
                role: 'owner',
                updatedAt: new Date()
            };

            if (wizardMode === 'edit' && editingId) {
                await updateDoc(doc(db, "users", editingId), ownerData);
                addToast("Dueño actualizado", 'success');
                setWizardOpen(false);
            } else {
                const response = await fetch('/dashboard/owners/api', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${await auth.currentUser?.getIdToken()}` },
                    body: JSON.stringify({ action: 'create', email: form.email, password: form.password, displayName: form.name, role: 'owner' })
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.error);
                await setDoc(doc(db, "users", result.uid), { ...ownerData, status: 'active', createdAt: serverTimestamp(), paymentHistory: [] });
                setCreatedCredentials({ email: form.email, pass: form.password });
                addToast("Dueño registrado", 'success');
                setWizardOpen(false);
            }
            fetchOwners();
        } catch (error: any) {
            addToast(error.message || "Ocurrió un error", 'error');
        } finally { setIsSubmitting(false); }
    };

    const handleManualPasswordUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!passwordOwner) return;
        if (passwordIssue(manualPassword)) return addToast(passwordIssue(manualPassword) as string, "error");
        setIsSubmitting(true);
        try {
            const res = await fetch('/dashboard/owners/api', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${await auth.currentUser?.getIdToken()}` },
                body: JSON.stringify({ action: 'updatePassword', uid: passwordOwner.id, password: manualPassword })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Error en el servidor");

            addToast("Contraseña actualizada", "success");
            setPasswordOwner(null);
            setManualPassword('');
        } catch (err: any) {
            addToast(err.message || "Error al actualizar", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleStatus = async () => {
        if (!ownerToToggle) return;
        setIsToggling(true);
        const next = ownerToToggle.status === 'Activo' ? 'suspended' : 'active';
        const uiNext = ownerToToggle.status === 'Activo' ? 'Suspendido' : 'Activo';
        try {
            await postApi('/api/admin/user-status', { uid: ownerToToggle.id, status: next });
            setOwners(prev => prev.map(o => o.id === ownerToToggle.id ? { ...o, status: uiNext } : o));
            setOwnerToToggle(null);
            addToast(`Dueño ${uiNext.toLowerCase()}`, 'success');
        } catch (e: any) { addToast(e?.message || "Error al cambiar el estado", 'error'); } finally { setIsToggling(false); }
    };

    const filteredOwners = owners.filter(o => {
        const matches = o.name.toLowerCase().includes(searchTerm.toLowerCase()) || o.email.toLowerCase().includes(searchTerm.toLowerCase()) || o.company.toLowerCase().includes(searchTerm.toLowerCase());
        if (!matches) return false;
        if (filter === 'Todos') return true;
        if (filter === 'Morosos') return o.debt > 0;
        if (filter === 'Suspendidos') return o.status === 'Suspendido';
        return true;
    });

    const formatCLP = (val: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(val);

    return (
        <div className="w-full space-y-6 pb-12 animate-fadeIn relative">
            {notification && (
                <div className={`fixed top-6 right-6 z-420 flex items-center gap-3 px-5 py-3 rounded-md shadow-2xl border animate-slideInRight backdrop-blur-md ${notification.type === 'success' ? 'bg-white/90 border-emerald-500 text-emerald-700 dark:bg-[#0B0F19]/90 dark:text-emerald-400 dark:border-emerald-500/50' : 'bg-white/90 border-red-500 text-red-700 dark:bg-[#0B0F19]/90 dark:text-red-400 dark:border-red-500/50'}`}>
                    <HugeiconsIcon icon={notification.type === 'success' ? CheckmarkCircle02Icon : Alert02Icon} className="w-5 h-5" strokeWidth={1.8} />
                    <span className="text-[10px] font-black uppercase tracking-wider">{notification.msg}</span>
                </div>
            )}

            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="w-6 h-[2px] bg-emerald-500 rounded-md" />
                        <p className="text-[11px] font-black text-emerald-600 dark:text-[#00df82] tracking-[0.2em] uppercase">Cartera de partners</p>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none font-heading">
                        Gestión de <span className="text-emerald-500 dark:text-[#00df82]">Dueños</span>
                    </h1>
                </div>
                <button onClick={openCreate} className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#00df82] text-slate-950 text-[11px] font-black uppercase tracking-wider rounded-md shadow-[0_0_25px_-8px_rgba(0,223,130,0.7)] hover:bg-[#3affa0] active:scale-95 transition-all cursor-pointer">
                    <HugeiconsIcon icon={Add01Icon} className="w-4 h-4" strokeWidth={2} />
                    Nuevo dueño
                </button>
            </div>

            {/* KPI */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <TarjetaKpi titulo="Total dueños" valor={owners.length.toString()} sub="Global" icono={<HugeiconsIcon icon={UserGroupIcon} className={ic} strokeWidth={1.6} />} brillo />
                <TarjetaKpi titulo="Ingresos MRR" valor={formatCLP(owners.reduce((a, o) => a + o.totalMrr, 0))} sub="Proyectado" icono={<HugeiconsIcon icon={MoneyBag01Icon} className={ic} strokeWidth={1.6} />} />
                <TarjetaKpi titulo="En mora" valor={owners.filter(o => o.debt > 0).length.toString()} sub="Requiere atención" icono={<HugeiconsIcon icon={Alert02Icon} className={`${ic} text-red-500`} strokeWidth={1.6} />} />
                <TarjetaKpi titulo="Ticket promedio" valor={formatCLP(owners.length > 0 ? owners.reduce((a, o) => a + o.totalMrr, 0) / owners.length : 0)} sub="Mensual" icono={<HugeiconsIcon icon={InformationCircleIcon} className={ic} strokeWidth={1.6} />} />
            </div>

            {/* TOOLS */}
            <div className="flex flex-col xl:flex-row gap-3 xl:items-center justify-between p-3 rounded-md border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/50">
                <div className="relative w-full xl:w-80 shrink-0">
                    <HugeiconsIcon icon={Search01Icon} className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" strokeWidth={1.8} />
                    <input type="text" placeholder="Buscar por nombre, email o empresa…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-emerald-500 rounded-md text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-hidden transition-all" />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-white/5 p-1 rounded-md border border-slate-100 dark:border-white/10">
                        {['Todos', 'Morosos', 'Suspendidos'].map(f => (
                            <button key={f} onClick={() => setFilter(f)} className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-md transition-all whitespace-nowrap cursor-pointer ${filter === f ? 'bg-white dark:bg-[#00df82] text-slate-900 dark:text-slate-950 shadow-xs' : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>{f}</button>
                        ))}
                    </div>
                    <div className="flex items-center gap-1 bg-slate-50 dark:bg-white/5 p-1 rounded-md border border-slate-100 dark:border-white/10">
                        <button onClick={() => setViewMode('grid')} aria-label="Vista cuadrícula" className={`p-2 rounded-md transition-all cursor-pointer ${viewMode === 'grid' ? 'bg-white dark:bg-[#00df82] text-emerald-600 dark:text-slate-950 shadow-xs' : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'}`}>
                            <HugeiconsIcon icon={Grid02Icon} className="w-4 h-4" strokeWidth={1.8} />
                        </button>
                        <button onClick={() => setViewMode('list')} aria-label="Vista listado" className={`p-2 rounded-md transition-all cursor-pointer ${viewMode === 'list' ? 'bg-white dark:bg-[#00df82] text-emerald-600 dark:text-slate-950 shadow-xs' : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'}`}>
                            <HugeiconsIcon icon={ListViewIcon} className="w-4 h-4" strokeWidth={1.8} />
                        </button>
                    </div>
                    <button onClick={fetchOwners} aria-label="Refrescar" className="p-2.5 rounded-md text-slate-500 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-white/10 transition-all cursor-pointer border border-slate-200 dark:border-white/10">
                        <HugeiconsIcon icon={RefreshIcon} className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} strokeWidth={1.8} />
                    </button>
                </div>
            </div>

            {/* LIST */}
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="rounded-md border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/50 p-5 animate-pulse">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-11 h-11 rounded-full bg-slate-100 dark:bg-white/5" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-3 w-2/3 rounded bg-slate-100 dark:bg-white/5" />
                                    <div className="h-3 w-1/2 rounded bg-slate-100 dark:bg-white/5" />
                                </div>
                            </div>
                            <div className="h-16 rounded bg-slate-100 dark:bg-white/5" />
                        </div>
                    ))}
                </div>
            ) : filteredOwners.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                    <span className="w-16 h-16 rounded-md bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                        <HugeiconsIcon icon={UserGroupIcon} className="w-8 h-8 text-slate-300 dark:text-white/15" strokeWidth={1.5} />
                    </span>
                    <div className="text-center">
                        <p className="text-[12px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">No hay dueños que coincidan</p>
                        <p className="text-[11px] text-slate-400 mt-1">Ajusta la búsqueda o registra un nuevo dueño.</p>
                    </div>
                    <button onClick={openCreate} className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#00df82] text-slate-950 text-[11px] font-black uppercase tracking-wider rounded-md hover:bg-[#3affa0] active:scale-95 transition-all cursor-pointer">
                        <HugeiconsIcon icon={Add01Icon} className="w-4 h-4" strokeWidth={2} />
                        Nuevo dueño
                    </button>
                </div>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
                    {filteredOwners.map((owner) => {
                        const isActive = owner.status === 'Activo';
                        const tierStyle = owner.tier === 'VIP PLATINO'
                            ? 'bg-slate-900/90 text-white border-white/15'
                            : owner.tier === 'ORO'
                                ? 'bg-amber-400/95 text-amber-950 border-amber-300'
                                : 'bg-slate-800/90 text-white border-white/15';
                        const hasDebt = owner.debt > 0;
                        return (
                            <div
                                key={owner.id}
                                className={`group relative flex flex-col overflow-hidden rounded-md border bg-white dark:bg-slate-900/50 transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/60 dark:hover:shadow-black/40 ${
                                    isActive ? 'border-slate-200 dark:border-white/5 hover:border-emerald-300 dark:hover:border-[#00df82]/30' : 'border-red-200 dark:border-red-500/20'
                                }`}
                            >
                                {/* Fila superior: imagen cuadrada + contenido */}
                                <div className="flex flex-1 min-w-0">
                                    {/* Imagen / avatar cuadrada */}
                                    <div className="relative w-32 sm:w-36 aspect-square shrink-0 overflow-hidden">
                                        {owner.photoURL ? (
                                            <img
                                                src={owner.photoURL}
                                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                                alt={owner.name}
                                            />
                                        ) : (
                                            <div className="absolute inset-0 bg-linear-to-br from-emerald-500 to-emerald-800 flex items-center justify-center">
                                                <span className="font-black text-white text-4xl uppercase">{owner.name.charAt(0)}</span>
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-linear-to-t from-black/75 via-black/10 to-black/35" />

                                        <span className={`absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border backdrop-blur-sm shadow-xs ${tierStyle}`}>
                                            {owner.tier}
                                        </span>

                                        <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-black/55 backdrop-blur-sm border border-white/15">
                                            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-red-400'}`} />
                                            <span className="text-[9px] font-black text-white uppercase tracking-wider">{owner.status}</span>
                                        </span>
                                    </div>

                                    {/* Contenido */}
                                    <div className="flex-1 min-w-0 flex flex-col p-4">
                                        <h3 className="font-black text-slate-900 dark:text-white text-[15px] uppercase leading-tight truncate font-heading">{owner.name}</h3>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1 mt-1 truncate">
                                            <HugeiconsIcon icon={Building01Icon} className="w-3 h-3 shrink-0" strokeWidth={2} />
                                            {owner.company}
                                        </p>

                                        {/* Contacto */}
                                        <div className="mt-3 space-y-1.5">
                                            <div className="flex items-center gap-2.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 min-w-0">
                                                <HugeiconsIcon icon={IdentityCardIcon} className="w-3.5 h-3.5 text-emerald-500 shrink-0" strokeWidth={1.8} />
                                                <span className="truncate font-mono">{owner.rut}</span>
                                            </div>
                                            <div className="flex items-center gap-2.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 min-w-0">
                                                <HugeiconsIcon icon={Mail01Icon} className="w-3.5 h-3.5 text-emerald-500 shrink-0" strokeWidth={1.8} />
                                                <span className="truncate">{owner.email}</span>
                                            </div>
                                            <div className="flex items-center gap-2.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 min-w-0">
                                                <HugeiconsIcon icon={CallIcon} className="w-3.5 h-3.5 text-emerald-500 shrink-0" strokeWidth={1.8} />
                                                <span className="truncate font-mono">{owner.phone}</span>
                                            </div>
                                        </div>

                                        {/* Métricas */}
                                        <div className="mt-auto pt-3 grid grid-cols-2 gap-1.5">
                                            <div className="px-2 py-2 bg-slate-50 dark:bg-white/5 rounded-md border border-slate-100 dark:border-white/10 text-center">
                                                <span className="block text-sm font-black text-slate-900 dark:text-white leading-none font-mono">{owner.venues.length}</span>
                                                <span className="block text-[8px] font-bold text-slate-400 uppercase mt-1">Recintos</span>
                                            </div>
                                            <div className={`px-2 py-2 rounded-md border text-center ${hasDebt ? 'bg-red-500/5 border-red-500/20' : 'bg-emerald-500/5 border-emerald-500/20'}`}>
                                                <span className={`block text-sm font-black leading-none font-mono truncate ${hasDebt ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-[#00df82]'}`}>
                                                    {formatCLP(owner.totalMrr)}
                                                </span>
                                                <span className={`block text-[8px] font-bold uppercase mt-1 ${hasDebt ? 'text-red-500' : 'text-emerald-600 dark:text-[#00df82]'}`}>
                                                    MRR
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Banda estado financiero */}
                                <div className="px-4 py-2.5 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-white/5">
                                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate">
                                        <HugeiconsIcon icon={MoneyBag01Icon} className="w-3.5 h-3.5 text-slate-400 shrink-0" strokeWidth={1.8} />
                                        {hasDebt ? `Deuda ${formatCLP(owner.debt)}` : "Sin deudas"}
                                    </span>
                                    <span className={`inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider shrink-0 ${hasDebt ? "text-red-500" : "text-emerald-600 dark:text-[#00df82]"}`}>
                                        <HugeiconsIcon icon={hasDebt ? Alert02Icon : CheckmarkCircle02Icon} className="w-3.5 h-3.5" strokeWidth={2} />
                                        {hasDebt ? "Con deuda" : "Al día"}
                                    </span>
                                </div>

                                {/* Acción */}
                                <div className="grid grid-cols-2 bg-slate-50 dark:bg-white/2 border-t border-slate-100 dark:border-white/5 divide-x divide-slate-100 dark:divide-white/5">
                                    <button onClick={() => setProfileOwner(owner)} className="py-2.5 flex items-center justify-center gap-1.5 bg-[#00df82] text-slate-950 hover:bg-[#3affa0] transition-all cursor-pointer">
                                        <HugeiconsIcon icon={UserCircleIcon} className="w-3.5 h-3.5" strokeWidth={2} />
                                        <span className="text-[9px] font-black uppercase tracking-wider">Perfil</span>
                                    </button>
                                    <button onClick={() => openEdit(owner)} className="py-2.5 flex items-center justify-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-[#00df82] hover:bg-emerald-50 dark:hover:bg-[#00df82]/10 transition-all cursor-pointer">
                                        <HugeiconsIcon icon={PencilEdit02Icon} className="w-3.5 h-3.5" strokeWidth={2} />
                                        <span className="text-[9px] font-black uppercase tracking-wider">Editar</span>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="overflow-hidden rounded-md border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/50">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse min-w-[860px]">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-white/5 bg-slate-50/60 dark:bg-white/2">
                                    <th className="py-4 px-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Dueño</th>
                                    <th className="py-4 px-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Tier</th>
                                    <th className="py-4 px-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider text-center">Recintos</th>
                                    <th className="py-4 px-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider text-right">MRR</th>
                                    <th className="py-4 px-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Estado</th>
                                    <th className="py-4 px-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                {filteredOwners.map((owner) => {
                                    const isActive = owner.status === 'Activo';
                                    const hasDebt = owner.debt > 0;
                                    const tierStyle = owner.tier === 'VIP PLATINO'
                                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                                        : owner.tier === 'ORO'
                                            ? 'bg-amber-400 text-amber-950'
                                            : 'bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-slate-300';
                                    return (
                                        <tr key={owner.id} className="hover:bg-slate-50/60 dark:hover:bg-white/2 transition-colors">
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-3">
                                                    {owner.photoURL ? (
                                                        <img src={owner.photoURL} alt={owner.name} className="w-10 h-10 rounded-md object-cover border border-slate-200 dark:border-white/10 shrink-0" />
                                                    ) : (
                                                        <span className="w-10 h-10 rounded-md bg-linear-to-br from-emerald-500 to-emerald-800 text-white flex items-center justify-center font-black text-sm shrink-0">{owner.name.charAt(0).toUpperCase()}</span>
                                                    )}
                                                    <div className="min-w-0">
                                                        <span className="font-black text-[13px] text-slate-900 dark:text-white uppercase truncate block font-heading">{owner.name}</span>
                                                        <span className="text-[10px] text-slate-400 font-semibold truncate block mt-0.5">{owner.company}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${tierStyle}`}>{owner.tier}</span>
                                            </td>
                                            <td className="py-4 px-6 text-center font-mono text-[12px] font-black text-slate-900 dark:text-white">{owner.venues.length}</td>
                                            <td className="py-4 px-6 text-right font-mono text-[12px] font-black text-slate-900 dark:text-white">{formatCLP(owner.totalMrr)}</td>
                                            <td className="py-4 px-6">
                                                <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border ${isActive ? 'bg-emerald-500/10 text-emerald-700 dark:text-[#00df82] border-emerald-500/25' : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/25'}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                                    {owner.status}
                                                </span>
                                                {hasDebt && <span className="block text-[9px] font-bold text-red-500 uppercase tracking-wider mt-1">Deuda {formatCLP(owner.debt)}</span>}
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex items-center justify-end">
                                                    <button onClick={() => setProfileOwner(owner)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10 hover:text-[#00df82] hover:border-emerald-300 dark:hover:border-[#00df82]/30 hover:bg-emerald-50 dark:hover:bg-[#00df82]/10 transition-all active:scale-95 cursor-pointer">
                                                        <HugeiconsIcon icon={UserCircleIcon} className="w-3.5 h-3.5" strokeWidth={1.8} />
                                                        Perfil
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* PERFIL DEL DUEÑO */}
            <OwnerProfileModal
                owner={profileOwner}
                isOpen={!!profileOwner}
                onClose={() => setProfileOwner(null)}
                onEdit={(o) => openEdit(o)}
                onChangePassword={(o) => { setPasswordOwner(o); setManualPassword(''); }}
                onToggleStatus={(o) => setOwnerToToggle(o)}
                onDelete={(o) => setOwnerToDelete(o)}
            />

            {/* WIZARD */}
            <OwnerWizard
                open={wizardOpen}
                mode={wizardMode}
                initial={wizardInitial}
                isSubmitting={isSubmitting}
                onClose={() => setWizardOpen(false)}
                onSubmit={handleSubmit}
            />

            {/* CONFIRM: ELIMINAR */}
            <ConfirmDialog
                open={!!ownerToDelete}
                tone="danger"
                title="¿Eliminar dueño?"
                message={<>Estás por eliminar a <strong>{ownerToDelete?.name}</strong> y revocar todo su acceso. Esta acción no se puede deshacer.</>}
                confirmLabel="Eliminar"
                loading={isDeleting}
                onConfirm={handleDeleteOwner}
                onCancel={() => setOwnerToDelete(null)}
            />

            {/* CONFIRM: SUSPENDER / ACTIVAR */}
            <ConfirmDialog
                open={!!ownerToToggle}
                tone="warning"
                title={ownerToToggle?.status === 'Activo' ? "¿Suspender dueño?" : "¿Activar dueño?"}
                message={ownerToToggle?.status === 'Activo'
                    ? <><strong>{ownerToToggle?.name}</strong> perderá acceso al panel hasta que lo reactives.</>
                    : <><strong>{ownerToToggle?.name}</strong> recuperará el acceso al panel.</>}
                confirmLabel={ownerToToggle?.status === 'Activo' ? "Suspender" : "Activar"}
                loading={isToggling}
                onConfirm={handleToggleStatus}
                onCancel={() => setOwnerToToggle(null)}
            />

            {/* MODAL PASSWORD */}
            {passwordOwner && (
                <ModalPortal>
                    <div className="fixed inset-0 z-500 flex items-center justify-center p-4 bg-slate-900/80 dark:bg-black/85 backdrop-blur-xl animate-in fade-in duration-200" role="presentation" onClick={() => !isSubmitting && setPasswordOwner(null)}>
                        <div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} className="relative w-full max-w-sm rounded-md border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B0F19] shadow-2xl p-6 text-center animate-in zoom-in-95 duration-200">
                            <div className="w-14 h-14 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4 text-amber-600 dark:text-amber-400">
                                <HugeiconsIcon icon={Key01Icon} className="w-7 h-7" strokeWidth={1.8} />
                            </div>
                            <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white font-heading">Nuevo acceso</h3>
                            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1 mb-5">
                                Define una nueva contraseña para <strong>{passwordOwner.name}</strong>.
                            </p>
                            <form onSubmit={handleManualPasswordUpdate} className="space-y-4 text-left">
                                <div className="space-y-1.5">
                                    <label htmlFor="manual-pass" className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Contraseña</label>
                                    <input
                                        id="manual-pass"
                                        type="text"
                                        value={manualPassword}
                                        onChange={e => setManualPassword(e.target.value)}
                                        placeholder={`Mínimo ${PASSWORD_MIN} caracteres`}
                                        className="w-full px-3.5 py-2.5 rounded-md border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15 outline-hidden transition-all"
                                    />
                                </div>
                                <div className="flex gap-3 pt-1">
                                    <button type="button" onClick={() => setPasswordOwner(null)} disabled={isSubmitting} className="flex-1 py-3 text-[11px] font-black uppercase tracking-[0.15em] rounded-md bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-all disabled:opacity-50 cursor-pointer">Cancelar</button>
                                    <button type="submit" disabled={isSubmitting} className="flex-1 py-3 text-[11px] font-black uppercase tracking-[0.15em] rounded-md text-white bg-amber-600 hover:bg-amber-700 shadow-lg shadow-amber-600/20 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer">Aplicar</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </ModalPortal>
            )}

            {/* MODAL CREDENCIALES */}
            {createdCredentials && (
                <ModalPortal>
                    <div className="fixed inset-0 z-500 flex items-center justify-center p-4 bg-slate-900/80 dark:bg-black/90 backdrop-blur-xl animate-in fade-in duration-200" role="presentation">
                        <div role="dialog" aria-modal="true" className="relative w-full max-w-sm rounded-md border-2 border-emerald-500 bg-white dark:bg-[#0B0F19] shadow-[0_0_80px_-20px_rgba(0,223,130,0.5)] p-6 text-center animate-in zoom-in-95 duration-200">
                            <div className="w-16 h-16 rounded-md bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center mx-auto mb-4 text-emerald-600 dark:text-[#00df82]">
                                <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-8 h-8" strokeWidth={1.8} />
                            </div>
                            <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white font-heading">¡Dueño registrado!</h3>
                            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1 mb-5">Comparte estas credenciales de acceso.</p>

                            <div className="rounded-md border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/2 p-4 text-left space-y-4 mb-5">
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5">Email de acceso</p>
                                    <p className="font-mono text-sm font-bold text-slate-900 dark:text-white truncate">{createdCredentials.email}</p>
                                </div>
                                <div className="pt-3 border-t border-slate-200 dark:border-white/5">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5">Contraseña temporal</p>
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="font-mono text-lg font-black text-emerald-600 dark:text-[#00df82] truncate">{createdCredentials.pass}</p>
                                        <button
                                            onClick={() => { navigator.clipboard.writeText(createdCredentials.pass); addToast("Copiado al portapapeles", 'success'); }}
                                            aria-label="Copiar contraseña"
                                            className="p-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-[#00df82] rounded-md transition-all active:scale-90 cursor-pointer shrink-0"
                                        >
                                            <HugeiconsIcon icon={Copy01Icon} className="w-5 h-5" strokeWidth={1.8} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => setCreatedCredentials(null)}
                                className="w-full py-3.5 bg-[#00df82] text-slate-950 rounded-md text-[11px] font-black uppercase tracking-[0.2em] shadow-[0_0_25px_-8px_rgba(0,223,130,0.7)] hover:bg-[#3affa0] active:scale-[0.98] transition-all cursor-pointer"
                            >
                                Concluir
                            </button>
                        </div>
                    </div>
                </ModalPortal>
            )}
        </div>
    );
}
