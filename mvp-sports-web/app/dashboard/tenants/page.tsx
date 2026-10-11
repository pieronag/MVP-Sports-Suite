"use client";
import React, { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    RefreshIcon,
    Building01Icon,
    CheckmarkBadge01Icon,
    CheckmarkCircle02Icon,
    Clock01Icon,
    MoneyBag01Icon,
    Alert02Icon,
    Search01Icon,
    MapPinIcon,
    BlockedIcon,
    PencilEdit02Icon,
    Add01Icon,
    Delete02Icon,
    UserGroupIcon,
    Store01Icon,
    GlobeIcon,
    StarIcon,
    ArrowDown01Icon,
    Cancel01Icon,
    Grid02Icon,
    ListViewIcon,
    UserCircleIcon,
    Download01Icon,
    ArrowDownRight01Icon,
    ChartIncreaseIcon,
} from "@hugeicons/core-free-icons";
import {
    collection, getDocs, doc, updateDoc, addDoc, deleteDoc,
    query, orderBy, where, serverTimestamp
} from "firebase/firestore";
import { db } from "@/services/client/firebase";
import { TarjetaKpi, SectionCard } from "@/components/ui/DashboardWidgets";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import TenantWizard, { EMPTY_TENANT_FORM, TenantFormState, OwnerOption } from "@/components/dashboard/TenantWizard";
import TenantProfileModal from "@/components/dashboard/TenantProfileModal";
import { usePlans } from "@/components/landing/usePlans";

interface Tenant {
    id: string; name: string;
    ownerIds: string[];
    owners: string[];
    ownerEmails?: string[];
    address: string; commune?: string; region?: string; city: string;
    coordinates?: { lat: number; lng: number }; imageURL?: string; imageUrl?: string;
    plan: string; mrr: number; status: string;
    infra: { courts: number; staff: number; sports: string[]; scheduleSummary: string; };
    todayStats: { bookings: number; capacity: number }; debt: number;
    lastSync: string; staffMembers: any[];
    rating?: number;
    totalFeedbacks?: number;
}

const ic = "w-6 h-6";

export default function Page() {
    const { plans } = usePlans();
    const resolvePlanPrice = (planRef?: string): number => {
        if (!planRef) return 0;
        const raw = planRef.trim().toLowerCase();
        const match = plans.find(p => p.name.toLowerCase() === raw || p.id.toLowerCase() === raw);
        return match ? Number(match.price || 0) : 0;
    };
    // Estilo del badge de plan derivado del precio real (BD), no de nombres hardcodeados.
    const planStyleOf = (planRef?: string): string => {
        const price = resolvePlanPrice(planRef);
        const prices = plans.map(p => Number(p.price || 0)).sort((a, b) => a - b);
        const max = prices[prices.length - 1] || 0;
        const paidPrices = prices.filter(p => p > 0);
        if (price <= 0) return 'bg-slate-800/90 text-white border-white/15';
        if (price >= max) return 'bg-amber-400/95 text-amber-950 border-amber-300';
        if (paidPrices.length >= 2 && price >= paidPrices[paidPrices.length - 2]) return 'bg-indigo-500/95 text-white border-indigo-400';
        return 'bg-sky-500/95 text-white border-sky-400';
    };
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("Todos");
    const [searchTerm, setSearchTerm] = useState("");

    const [wizardOpen, setWizardOpen] = useState(false);
    const [wizardMode, setWizardMode] = useState<"create" | "edit">("create");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [wizardInitial, setWizardInitial] = useState<TenantFormState>(EMPTY_TENANT_FORM);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [ownersList, setOwnersList] = useState<OwnerOption[]>([]);
    const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [tenantToToggle, setTenantToToggle] = useState<Tenant | null>(null);
    const [isToggling, setIsToggling] = useState(false);

    const [regionFilter, setRegionFilter] = useState("Todas");
    const [communeFilter, setCommuneFilter] = useState("Todas");
    const [viewMode, setViewMode] = useState<"grid" | "list">("list");
    const [profileTenant, setProfileTenant] = useState<Tenant | null>(null);
    const [sortBy, setSortBy] = useState<'name' | 'mrr' | 'rating'>('name');
    const [visibleCount, setVisibleCount] = useState(12);

    const [notification, setNotification] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);

    const addToast = (msg: string, type: "success" | "error" = "success") => {
        setNotification({ msg, type });
        setTimeout(() => setNotification(null), 4000);
    };

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            // Cargar todas las colecciones relacionadas una sola vez (evita N+1)
            const [snap, courtsSnap, staffSnap, reviewsSnap, bookingsSnap] = await Promise.all([
                getDocs(query(collection(db, "tenants"), orderBy("name"))),
                getDocs(collection(db, "courts")),
                getDocs(collection(db, "staff")),
                getDocs(collection(db, "reviews")),
                // Solo reservas calificadas (antes: toda la colección de reservas)
                getDocs(query(collection(db, "bookings"), where("rating", ">", 0))),
            ]);

            // Agrupar por tenantId
            const courtsByTenant = new Map<string, number>();
            courtsSnap.docs.forEach(d => {
                const tid = d.data().tenantId;
                if (tid) courtsByTenant.set(tid, (courtsByTenant.get(tid) || 0) + 1);
            });

            const staffByTenant = new Map<string, Map<string, any>>();
            staffSnap.docs.forEach(s => {
                const sd = s.data();
                const ids: string[] = sd.tenantIds || (sd.tenantId ? [sd.tenantId] : []);
                ids.forEach(tid => {
                    if (!staffByTenant.has(tid)) staffByTenant.set(tid, new Map());
                    staffByTenant.get(tid)!.set(s.id, { id: s.id, fullName: sd.fullName, jobTitle: sd.jobTitle || "Staff" });
                });
            });

            const reviewsByTenant = new Map<string, any[]>();
            reviewsSnap.docs.forEach(d => {
                const tid = d.data().venueId;
                if (tid) {
                    if (!reviewsByTenant.has(tid)) reviewsByTenant.set(tid, []);
                    reviewsByTenant.get(tid)!.push(d.data());
                }
            });

            const bookingsByTenant = new Map<string, any[]>();
            bookingsSnap.docs.forEach(d => {
                const b = d.data();
                const tid = b.tenantId;
                if (tid && b.rating > 0) {
                    if (!bookingsByTenant.has(tid)) bookingsByTenant.set(tid, []);
                    bookingsByTenant.get(tid)!.push(b);
                }
            });

            const tenantsList = snap.docs.map((d) => {
                const data = d.data();
                const tenantId = d.id;

                const staffList = Array.from((staffByTenant.get(tenantId) || new Map()).values());

                const schedule = data.schedule || {};
                let scheduleStr = "No definido";
                const sampleDay = Object.values(schedule)[0] as any;
                if (sampleDay?.isOpen) scheduleStr = `${sampleDay.open} - ${sampleDay.close}`;

                const revs = reviewsByTenant.get(tenantId) || [];
                const books = bookingsByTenant.get(tenantId) || [];

                const fMap = new Map();
                const gck = (item: any) => {
                    const commentNorm = (item.comment || item.feedback || '').trim().toLowerCase().substring(0, 30);
                    const timeStr = item.date?.seconds || item.date?.toString() || '';
                    return `${item.userId || item.createdBy || 'anon'}_${tenantId}_${item.rating}_${commentNorm}_${timeStr}`;
                };
                revs.forEach((r: any) => fMap.set(r.bookingId || gck(r), r));
                books.forEach((b: any) => {
                    const k = b.id;
                    const ck = gck(b);
                    if (!fMap.has(k) && !fMap.has(ck)) fMap.set(k, b);
                });

                const allEvals = Array.from(fMap.values());
                const rawAvg = allEvals.length > 0
                    ? (allEvals.reduce((acc, e) => acc + (e.rating || 0), 0) / allEvals.length)
                    : 0;
                const realRating = Math.round(rawAvg * 10) / 10;

                // Sincronizar solo si cambió (una escritura puntual, no en cada listado)
                if (data.rating !== realRating || data.totalFeedbacks !== allEvals.length) {
                    updateDoc(doc(db, "tenants", tenantId), { rating: realRating, totalFeedbacks: allEvals.length }).catch(e => console.error(e));
                }

                const ownerIds = data.ownerIds || (data.ownerId ? [data.ownerId] : []);
                const ownerNames = data.ownerNames || (data.ownerName ? [data.ownerName] : (data.owner ? [data.owner] : []));
                const ownerEmails = data.ownerEmails || (data.ownerEmail ? [data.ownerEmail] : []);

                return {
                    id: tenantId, name: data.name,
                    ownerIds, owners: ownerNames, ownerEmails,
                    address: data.address || "", commune: data.commune || "",
                    region: data.region || "", city: data.commune || data.city || "---",
                    coordinates: data.coordinates || { lat: 0, lng: 0 },
                    imageUrl: data.imageURL || data.imageUrl || "",
                    imageURL: data.imageURL || data.imageUrl || "",
                    plan: data.planId || data.plan || "",
                    mrr: resolvePlanPrice(data.planId || data.plan), status: data.status,
                    infra: { courts: courtsByTenant.get(tenantId) || 0, staff: staffList.length, sports: data.sports || [], scheduleSummary: scheduleStr },
                    todayStats: { bookings: 0, capacity: 0 }, debt: data.debtStatus === "Vencido" ? resolvePlanPrice(data.planId || data.plan) : 0,
                    lastSync: "En línea", staffMembers: staffList,
                    transbankConfig: data.transbankConfig || { commerceCode: "", apiKey: "" },
                    rating: Number(realRating.toFixed(1)),
                    totalFeedbacks: allEvals.length,
                } as Tenant;
            });
            setTenants(tenantsList);
        } catch (error) { addToast("Error al cargar recintos", "error"); } finally { setLoading(false); }
    };

    useEffect(() => {
        fetchInitialData();
        const fetchOwners = async () => {
            const qOwners = query(collection(db, "users"), where("role", "in", ["owner", "dueño"]));
            const ownersSnap = await getDocs(qOwners);
            setOwnersList(ownersSnap.docs.map(d => ({
                id: d.id,
                name: d.data().displayName || d.data().name || "Sin nombre",
                email: d.data().email || "Sin email"
            })));
        };
        fetchOwners();
    }, []);

    const handleDeleteTenant = async () => {
        if (!tenantToDelete) return;
        setIsDeleting(true);
        try {
            await deleteDoc(doc(db, "tenants", tenantToDelete.id));
            setTenantToDelete(null);
            addToast("Recinto eliminado", "success");
            fetchInitialData();
        } catch (error) { addToast("Error al eliminar", "error"); } finally { setIsDeleting(false); }
    };

    const handleToggleStatus = async () => {
        if (!tenantToToggle) return;
        setIsToggling(true);
        const next = tenantToToggle.status === "Suspendido" ? "Activo" : "Suspendido";
        try {
            await updateDoc(doc(db, "tenants", tenantToToggle.id), { status: next });
            setTenantToToggle(null);
            addToast(`Recinto ${next.toLowerCase()}`, "success");
            fetchInitialData();
        } catch (e) { addToast("Error al cambiar el estado", "error"); } finally { setIsToggling(false); }
    };

    const openCreate = () => {
        setWizardMode("create");
        setEditingId(null);
        setWizardInitial(EMPTY_TENANT_FORM);
        setWizardOpen(true);
    };

    const openEdit = (tenant: Tenant) => {
        setWizardMode("edit");
        setEditingId(tenant.id);
        // Resolver el plan contra la config real de la BD (por nombre o id).
        const raw = (tenant.plan || "").toLowerCase();
        const match = plans.find(p => p.name.toLowerCase() === raw || p.id.toLowerCase() === raw);
        setWizardInitial({
            name: tenant.name,
            selectedOwners: tenant.ownerIds.map((id, index) => ({
                id,
                name: tenant.owners[index] || "Dueño",
                email: tenant.ownerEmails?.[index] || ""
            })),
            plan: match?.name || (tenant.plan ? tenant.plan.charAt(0).toUpperCase() + tenant.plan.slice(1).toLowerCase() : EMPTY_TENANT_FORM.plan),
            region: tenant.region || "Metropolitana",
            commune: tenant.commune || "",
            address: tenant.address || "",
            lat: tenant.coordinates?.lat || 0,
            lng: tenant.coordinates?.lng || 0,
            imagePreview: tenant.imageURL || tenant.imageUrl || "",
        });
        setWizardOpen(true);
    };

    const handleSubmit = async (form: TenantFormState) => {
        setIsSubmitting(true);
        try {
            const ownerIds = form.selectedOwners.map(o => o.id);
            const ownerNames = form.selectedOwners.map(o => o.name);
            const ownerEmails = form.selectedOwners.map(o => o.email);

            // Precio y plan resueltos desde la configuración de la BD.
            const planConfig = plans.find(p => p.name === form.plan || p.id === form.plan);
            const planId = planConfig?.id || form.plan.toLowerCase();
            const price = planConfig?.price ?? 0;

            const data = {
                name: form.name,
                ownerIds, ownerNames, ownerEmails,
                ownerId: ownerIds[0], ownerName: ownerNames[0], ownerEmail: ownerEmails[0],
                region: form.region, commune: form.commune, address: form.address,
                fullAddress: `${form.address}, ${form.commune}, ${form.region}`,
                coordinates: { lat: form.lat, lng: form.lng },
                imageURL: form.imagePreview || "https://placehold.co/600x400/10b981/ffffff?text=Club+Sport",
                imageUrl: form.imagePreview || "https://placehold.co/600x400/10b981/ffffff?text=Club+Sport",
                plan: form.plan, planId, planPrice: price,
            };

            if (wizardMode === "edit" && editingId) {
                await updateDoc(doc(db, "tenants", editingId), data);
                addToast("Recinto actualizado", "success");
            } else {
                await addDoc(collection(db, "tenants"), { ...data, status: "Activo", debtStatus: "Al Día", createdAt: serverTimestamp() });
                addToast("Recinto creado", "success");
            }
            setWizardOpen(false);
            fetchInitialData();
        } catch (e: any) {
            addToast(e.message || "Ocurrió un error", "error");
        } finally { setIsSubmitting(false); }
    };

    const regions = React.useMemo(
        () => Array.from(new Set(tenants.map(t => t.region).filter((r): r is string => !!r))).sort(),
        [tenants]
    );

    const communes = React.useMemo(() => {
        const base = regionFilter === "Todas" ? tenants : tenants.filter(t => t.region === regionFilter);
        return Array.from(new Set(base.map(t => t.commune).filter((c): c is string => !!c))).sort();
    }, [tenants, regionFilter]);

    // Si cambia la región y la comuna seleccionada ya no existe, se resetea.
    React.useEffect(() => {
        if (communeFilter !== "Todas" && !communes.includes(communeFilter)) {
            setCommuneFilter("Todas");
        }
    }, [communes, communeFilter]);

    const filteredTenants = tenants.filter(t => {
        const matches = t.name.toLowerCase().includes(searchTerm.toLowerCase()) || t.owners.some(on => on.toLowerCase().includes(searchTerm.toLowerCase()));
        if (!matches) return false;
        if (regionFilter !== "Todas" && t.region !== regionFilter) return false;
        if (communeFilter !== "Todas" && t.commune !== communeFilter) return false;
        if (filter === "Suspendidos") return t.status === "Suspendido";
        return true;
    });

    const paidCount = tenants.filter(t => resolvePlanPrice(t.plan) > 0).length;
    const totalMrr = tenants.reduce((a, t) => a + (t.mrr || 0), 0);
    const totalDebt = tenants.reduce((a, t) => a + (t.debt || 0), 0);
    const debtTenants = tenants.filter(t => (t.debt || 0) > 0).length;
    const sortedTenants = [...filteredTenants].sort((a, b) => {
        if (sortBy === 'mrr') return (b.mrr || 0) - (a.mrr || 0);
        if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
        return a.name.localeCompare(b.name);
    });
    const visibleTenants = sortedTenants.slice(0, visibleCount);

    const exportCSV = () => {
        const sep = ';';
        const esc = (v: any) => { const s = String(v ?? ''); return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
        const line = (cells: any[]) => cells.map(esc).join(sep);
        const headers = ['Recinto', 'Dueños', 'Plan', 'MRR', 'Comuna', 'Región', 'Canchas', 'Staff', 'Rating', 'Reseñas', 'Deuda', 'Estado'];
        const body = filteredTenants.map(t => line([t.name, t.owners.join(' | '), t.plan, t.mrr || 0, t.commune || '', t.region || '', t.infra.courts, t.infra.staff, t.rating || 0, t.totalFeedbacks || 0, t.debt || 0, t.status]));
        const blob = new Blob(["\ufeff" + [line(headers)].concat(body).join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `recintos_mvp_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click(); URL.revokeObjectURL(url);
    };

    return (
        <div className="w-full space-y-6 pb-12 animate-fadeIn relative">
            {notification && (
                <div className={`fixed top-6 right-6 z-420 flex items-center gap-3 px-5 py-3 rounded-md shadow-2xl border animate-slideInRight backdrop-blur-md ${
                    notification.type === 'success' ? 'bg-white/90 border-emerald-500 text-emerald-700 dark:bg-[#0B0F19]/90 dark:text-emerald-400 dark:border-emerald-500/50'
                    : 'bg-white/90 border-red-500 text-red-700 dark:bg-[#0B0F19]/90 dark:text-red-400 dark:border-red-500/50'
                }`}>
                    <HugeiconsIcon icon={notification.type === 'success' ? CheckmarkCircle02Icon : Alert02Icon} className="w-5 h-5" strokeWidth={1.8} />
                    <span className="text-[10px] font-black uppercase tracking-wider">{notification.msg}</span>
                </div>
            )}

            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="w-6 h-[2px] bg-emerald-500 rounded-md" />
                        <p className="text-[11px] font-black text-emerald-600 dark:text-[#00df82] tracking-[0.2em] uppercase">Red de infraestructura</p>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none font-heading">
                        Gestión de <span className="text-emerald-500 dark:text-[#00df82]">Recintos</span>
                    </h1>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={exportCSV} disabled={filteredTenants.length === 0} className="inline-flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 text-[11px] font-black uppercase tracking-wider rounded-md hover:border-emerald-400 dark:hover:border-[#00df82]/40 hover:text-emerald-600 dark:hover:text-[#00df82] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                        <HugeiconsIcon icon={Download01Icon} className="w-4 h-4" strokeWidth={2} />
                        Exportar
                    </button>
                    <button onClick={openCreate} className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#00df82] text-slate-950 text-[11px] font-black uppercase tracking-wider rounded-md shadow-[0_0_25px_-8px_rgba(0,223,130,0.7)] hover:bg-[#3affa0] active:scale-95 transition-all cursor-pointer">
                        <HugeiconsIcon icon={Add01Icon} className="w-4 h-4" strokeWidth={2} />
                        Nuevo recinto
                    </button>
                </div>
            </div>

            {/* KPI */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <TarjetaKpi titulo="Recintos" valor={tenants.length.toString()} sub="Global" icono={<HugeiconsIcon icon={Building01Icon} className={ic} strokeWidth={1.6} />} brillo />
                <TarjetaKpi titulo="Canchas" valor={tenants.reduce((a, t) => a + t.infra.courts, 0).toString()} sub="Operativas" icono={<HugeiconsIcon icon={CheckmarkBadge01Icon} className={ic} strokeWidth={1.6} />} />
                <TarjetaKpi titulo="Staff" valor={tenants.reduce((a, t) => a + t.infra.staff, 0).toString()} sub="Colaboradores" icono={<HugeiconsIcon icon={UserGroupIcon} className={ic} strokeWidth={1.6} />} />
                <TarjetaKpi titulo="Clientes" valor={paidCount.toString()} sub="Suscripciones" icono={<HugeiconsIcon icon={MoneyBag01Icon} className={ic} strokeWidth={1.6} />} brillo />
            </div>

            {/* RESUMEN FINANCIERO */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-md bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 px-5 py-4 flex items-center justify-between">
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">MRR total</p>
                        <p className="text-lg font-black text-slate-900 dark:text-white font-mono leading-none mt-1">{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(totalMrr)}</p>
                    </div>
                    <span className="w-10 h-10 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-[#00df82]">
                        <HugeiconsIcon icon={ChartIncreaseIcon} className="w-5 h-5" strokeWidth={1.6} />
                    </span>
                </div>
                <div className="rounded-md bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 px-5 py-4 flex items-center justify-between">
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Por cobrar</p>
                        <p className="text-lg font-black text-amber-600 dark:text-amber-400 font-mono leading-none mt-1">{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(totalDebt)}</p>
                    </div>
                    <span className="w-10 h-10 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
                        <HugeiconsIcon icon={ArrowDownRight01Icon} className="w-5 h-5" strokeWidth={1.6} />
                    </span>
                </div>
                <div className="rounded-md bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 px-5 py-4 flex items-center justify-between">
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Recintos con deuda</p>
                        <p className="text-lg font-black text-slate-900 dark:text-white font-mono leading-none mt-1">{debtTenants}</p>
                    </div>
                    <span className="w-10 h-10 rounded-md bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
                        <HugeiconsIcon icon={Alert02Icon} className="w-5 h-5" strokeWidth={1.6} />
                    </span>
                </div>
            </div>

            {/* TOOLS */}
            <div className="flex flex-col xl:flex-row gap-3 xl:items-center justify-between p-3 rounded-md border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/50">
                <div className="relative w-full xl:w-72 shrink-0">
                    <HugeiconsIcon icon={Search01Icon} className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" strokeWidth={1.8} />
                    <input
                        type="text"
                        placeholder="Buscar recinto o dueño…"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-emerald-500 rounded-md text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-hidden transition-all"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Región */}
                    <div className="relative">
                        <HugeiconsIcon icon={GlobeIcon} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" strokeWidth={1.8} />
                        <select
                            value={regionFilter}
                            onChange={(e) => setRegionFilter(e.target.value)}
                            aria-label="Filtrar por región"
                            className="pl-9 pr-8 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-emerald-500 rounded-md text-[12px] font-semibold text-slate-700 dark:text-white outline-hidden transition-all cursor-pointer appearance-none"
                        >
                            <option value="Todas" className="bg-white text-slate-900 dark:bg-[#0B0F19] dark:text-white">Todas las regiones</option>
                            {regions.map((r) => <option key={r} value={r} className="bg-white text-slate-900 dark:bg-[#0B0F19] dark:text-white">{r}</option>)}
                        </select>
                        <HugeiconsIcon icon={ArrowDown01Icon} className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" strokeWidth={2} />
                    </div>

                    {/* Comuna */}
                    <div className="relative">
                        <HugeiconsIcon icon={MapPinIcon} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" strokeWidth={1.8} />
                        <select
                            value={communeFilter}
                            onChange={(e) => setCommuneFilter(e.target.value)}
                            aria-label="Filtrar por comuna"
                            disabled={communes.length === 0}
                            className="pl-9 pr-8 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-emerald-500 rounded-md text-[12px] font-semibold text-slate-700 dark:text-white outline-hidden transition-all cursor-pointer appearance-none disabled:opacity-50 max-w-[180px]"
                        >
                            <option value="Todas" className="bg-white text-slate-900 dark:bg-[#0B0F19] dark:text-white">Todas las comunas</option>
                            {communes.map((c) => <option key={c} value={c} className="bg-white text-slate-900 dark:bg-[#0B0F19] dark:text-white">{c}</option>)}
                        </select>
                        <HugeiconsIcon icon={ArrowDown01Icon} className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" strokeWidth={2} />
                    </div>

                    {/* Estado */}
                    <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-white/5 p-1 rounded-md border border-slate-100 dark:border-white/10">
                        {["Todos", "Suspendidos"].map((f) => (
                            <button key={f} onClick={() => setFilter(f)} className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-md transition-all whitespace-nowrap cursor-pointer ${filter === f ? "bg-white dark:bg-[#00df82] text-slate-900 dark:text-slate-950 shadow-xs" : "text-slate-400 hover:text-slate-900 dark:hover:text-white"}`}>{f}</button>
                        ))}
                    </div>

                    {/* Vista */}
                    <div className="flex items-center gap-1 bg-slate-50 dark:bg-white/5 p-1 rounded-md border border-slate-100 dark:border-white/10">
                        <button onClick={() => setViewMode("grid")} aria-label="Vista cuadrícula" className={`p-2 rounded-md transition-all cursor-pointer ${viewMode === "grid" ? "bg-white dark:bg-[#00df82] text-emerald-600 dark:text-slate-950 shadow-xs" : "text-slate-400 hover:text-slate-600 dark:hover:text-white"}`}>
                            <HugeiconsIcon icon={Grid02Icon} className="w-4 h-4" strokeWidth={1.8} />
                        </button>
                        <button onClick={() => setViewMode("list")} aria-label="Vista listado" className={`p-2 rounded-md transition-all cursor-pointer ${viewMode === "list" ? "bg-white dark:bg-[#00df82] text-emerald-600 dark:text-slate-950 shadow-xs" : "text-slate-400 hover:text-slate-600 dark:hover:text-white"}`}>
                            <HugeiconsIcon icon={ListViewIcon} className="w-4 h-4" strokeWidth={1.8} />
                        </button>
                    </div>

                    {/* Ordenar */}
                    <div className="relative">
                        <HugeiconsIcon icon={ArrowDown01Icon} className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" strokeWidth={2} />
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as 'name' | 'mrr' | 'rating')}
                            aria-label="Ordenar recintos"
                            className="pl-3 pr-8 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-emerald-500 rounded-md text-[12px] font-semibold text-slate-700 dark:text-white outline-hidden transition-all cursor-pointer appearance-none"
                        >
                            <option value="name">Nombre (A-Z)</option>
                            <option value="mrr">Mayor MRR</option>
                            <option value="rating">Mejor rating</option>
                        </select>
                    </div>

                    <button onClick={fetchInitialData} aria-label="Refrescar" className="p-2.5 rounded-md text-slate-500 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-white/10 transition-all cursor-pointer border border-slate-200 dark:border-white/10">
                        <HugeiconsIcon icon={RefreshIcon} className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} strokeWidth={1.8} />
                    </button>
                </div>
            </div>

            {/* Resultados */}
            {(regionFilter !== "Todas" || communeFilter !== "Todas" || filter !== "Todos" || searchTerm) && (
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        <span className="font-mono text-slate-900 dark:text-white">{filteredTenants.length}</span> resultado{filteredTenants.length === 1 ? "" : "s"}
                        {regionFilter !== "Todas" && <> · región <span className="text-slate-900 dark:text-white">{regionFilter}</span></>}
                        {communeFilter !== "Todas" && <> · comuna <span className="text-slate-900 dark:text-white">{communeFilter}</span></>}
                    </p>
                    <button
                        onClick={() => { setRegionFilter("Todas"); setCommuneFilter("Todas"); setFilter("Todos"); setSearchTerm(""); }}
                        className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-emerald-600 dark:hover:text-[#00df82] transition-colors cursor-pointer"
                    >
                        <HugeiconsIcon icon={Cancel01Icon} className="w-3.5 h-3.5" strokeWidth={2} />
                        Limpiar filtros
                    </button>
                </div>
            )}

            {/* LIST */}
            <div className="relative min-h-[400px]">
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                            <div key={i} className="rounded-md border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/50 overflow-hidden animate-pulse">
                                <div className="h-32 bg-slate-100 dark:bg-white/5" />
                                <div className="p-4 space-y-3">
                                    <div className="h-3 w-3/4 rounded bg-slate-100 dark:bg-white/5" />
                                    <div className="h-3 w-1/2 rounded bg-slate-100 dark:bg-white/5" />
                                    <div className="grid grid-cols-3 gap-2 pt-1">
                                        <div className="h-12 rounded bg-slate-100 dark:bg-white/5" />
                                        <div className="h-12 rounded bg-slate-100 dark:bg-white/5" />
                                        <div className="h-12 rounded bg-slate-100 dark:bg-white/5" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filteredTenants.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                        <span className="w-16 h-16 rounded-md bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                            <HugeiconsIcon icon={Store01Icon} className="w-8 h-8 text-slate-300 dark:text-white/15" strokeWidth={1.5} />
                        </span>
                        <div className="text-center">
                            <p className="text-[12px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">No hay recintos que coincidan</p>
                            <p className="text-[11px] text-slate-400 mt-1">Ajusta la búsqueda o crea un nuevo recinto.</p>
                        </div>
                        <button onClick={openCreate} className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#00df82] text-slate-950 text-[11px] font-black uppercase tracking-wider rounded-md hover:bg-[#3affa0] active:scale-95 transition-all cursor-pointer">
                            <HugeiconsIcon icon={Add01Icon} className="w-4 h-4" strokeWidth={2} />
                            Nuevo recinto
                        </button>
                    </div>
                ) : viewMode === "grid" ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
                        {visibleTenants.map((t) => {
                            const isActive = t.status === 'Activo';
                            const planStyle = planStyleOf(t.plan);
                            const rating = Number(t.rating) || 0;

                            return (
                                <div
                                    key={t.id}
                                    className={`group relative flex overflow-hidden rounded-md border bg-white dark:bg-slate-900/50 transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/60 dark:hover:shadow-black/40 ${
                                        isActive ? 'border-slate-200 dark:border-white/5 hover:border-emerald-300 dark:hover:border-[#00df82]/30' : 'border-red-200 dark:border-red-500/20'
                                    }`}
                                >
                                    {/* Imagen (izquierda) */}
                                    <div className="relative w-32 sm:w-36 shrink-0 overflow-hidden">
                                        <img
                                            src={t.imageUrl || "https://placehold.co/600x800/0B0F19/ffffff?text=Recinto"}
                                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                            alt={t.name}
                                        />
                                        <div className="absolute inset-0 bg-linear-to-r from-black/40 via-black/10 to-black/50" />
                                        <div className="absolute inset-0 bg-linear-to-t from-black/70 to-transparent" />

                                        <span className={`absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border backdrop-blur-sm shadow-xs ${planStyle}`}>
                                            {t.plan}
                                        </span>

                                        {rating > 0 && (
                                            <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/55 backdrop-blur-sm border border-white/15">
                                                <HugeiconsIcon icon={StarIcon} className="w-3 h-3 text-amber-400" strokeWidth={2} />
                                                <span className="text-[10px] font-black text-white font-mono">{rating.toFixed(1)}</span>
                                            </span>
                                        )}
                                    </div>

                                    {/* Contenido (derecha) */}
                                    <div className="flex-1 min-w-0 flex flex-col">
                                        {/* Título + estado */}
                                        <div className="p-4 pb-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <h3 className="font-black text-slate-900 dark:text-white text-[15px] uppercase leading-tight truncate font-heading">
                                                        {t.name}
                                                    </h3>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1 mt-1 truncate">
                                                        <HugeiconsIcon icon={MapPinIcon} className="w-3 h-3 text-emerald-500 shrink-0" strokeWidth={2} />
                                                        {t.commune || "—"}, {t.region || "—"}
                                                    </p>
                                                </div>
                                                <span className={`shrink-0 inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border ${
                                                    isActive ? 'bg-emerald-500/10 text-emerald-700 dark:text-[#00df82] border-emerald-500/25' : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/25'
                                                }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                                    {t.status}
                                                </span>
                                            </div>

                                            {/* Dueños */}
                                            <div className="flex items-center gap-2 mt-3 min-w-0">
                                                <div className="flex -space-x-1.5 shrink-0">
                                                    {t.owners.slice(0, 3).map((on, idx) => (
                                                        <span key={idx} className="w-6 h-6 rounded-full bg-emerald-500/15 border-2 border-white dark:border-slate-900 text-emerald-700 dark:text-[#00df82] flex items-center justify-center text-[9px] font-black uppercase">
                                                            {on.charAt(0)}
                                                        </span>
                                                    ))}
                                                    {t.owners.length === 0 && (
                                                        <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-white/5 border-2 border-white dark:border-slate-900 flex items-center justify-center">
                                                            <HugeiconsIcon icon={UserGroupIcon} className="w-3 h-3 text-slate-400" strokeWidth={1.8} />
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                                                    {t.owners.length > 0
                                                        ? (t.owners.length > 1 ? `${t.owners[0]} +${t.owners.length - 1}` : t.owners[0])
                                                        : "Sin dueños"}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Métricas */}
                                        <div className="grid grid-cols-3 gap-1.5 px-4 pb-3">
                                            <div className="px-2 py-2 bg-slate-50 dark:bg-white/5 rounded-md border border-slate-100 dark:border-white/10 text-center">
                                                <span className="block text-sm font-black text-slate-900 dark:text-white leading-none font-mono">{t.infra.courts}</span>
                                                <span className="block text-[8px] font-bold text-slate-400 uppercase mt-1">Canchas</span>
                                            </div>
                                            <div className="px-2 py-2 bg-slate-50 dark:bg-white/5 rounded-md border border-slate-100 dark:border-white/10 text-center">
                                                <span className="block text-sm font-black text-slate-900 dark:text-white leading-none font-mono">{t.infra.staff}</span>
                                                <span className="block text-[8px] font-bold text-slate-400 uppercase mt-1">Staff</span>
                                            </div>
                                            <div className={`px-2 py-2 rounded-md border text-center ${(t.debt || 0) > 0 ? 'bg-amber-500/10 border-amber-500/25' : 'bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/10'}`}>
                                                <span className={`block text-sm font-black leading-none font-mono ${(t.debt || 0) > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'}`}>
                                                    {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(t.debt || 0)}
                                                </span>
                                                <span className={`block text-[8px] font-bold uppercase mt-1 ${(t.debt || 0) > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`}>Deuda</span>
                                            </div>
                                        </div>

                                        {/* Meta */}
                                        <div className="flex items-center justify-between gap-2 px-4 pb-3">
                                            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate">
                                                <HugeiconsIcon icon={Clock01Icon} className="w-3.5 h-3.5 text-slate-400 shrink-0" strokeWidth={1.8} />
                                                {t.infra.scheduleSummary}
                                            </span>
                                            <span className={`inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider shrink-0 ${t.coordinates?.lat ? "text-emerald-600 dark:text-[#00df82]" : "text-amber-500"}`}>
                                                <HugeiconsIcon icon={t.coordinates?.lat ? CheckmarkCircle02Icon : Alert02Icon} className="w-3.5 h-3.5" strokeWidth={2} />
                                                {t.coordinates?.lat ? "Geo" : "Sin geo"}
                                            </span>
                                        </div>

                                        {/* Acciones */}
                                        <div className="mt-auto p-2.5 bg-slate-50 dark:bg-white/2 border-t border-slate-100 dark:border-white/5 flex gap-1.5">
                                            <button onClick={() => openEdit(t)} aria-label="Editar recinto" className="flex-1 py-2 px-2 flex items-center justify-center gap-1.5 rounded-md border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-500 hover:text-emerald-600 hover:border-emerald-300 dark:hover:text-[#00df82] dark:hover:border-[#00df82]/30 transition-all active:scale-95 cursor-pointer">
                                                <HugeiconsIcon icon={PencilEdit02Icon} className="w-3.5 h-3.5" strokeWidth={2} />
                                                <span className="text-[9px] font-black uppercase tracking-wider hidden sm:inline">Editar</span>
                                            </button>
                                            <button onClick={() => setTenantToToggle(t)} aria-label={isActive ? 'Suspender recinto' : 'Activar recinto'} className={`flex-1 py-2 px-2 flex items-center justify-center gap-1.5 rounded-md border bg-white dark:bg-white/5 transition-all active:scale-95 cursor-pointer ${isActive ? 'border-amber-200 dark:border-amber-500/20 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10' : 'border-emerald-200 dark:border-emerald-500/20 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'}`}>
                                                <HugeiconsIcon icon={isActive ? BlockedIcon : CheckmarkCircle02Icon} className="w-3.5 h-3.5" strokeWidth={2} />
                                                <span className="text-[9px] font-black uppercase tracking-wider hidden sm:inline">{isActive ? 'Suspender' : 'Activar'}</span>
                                            </button>
                                            <button onClick={() => setTenantToDelete(t)} aria-label="Eliminar recinto" className="py-2 px-3 flex items-center justify-center rounded-md border border-red-200 dark:border-red-500/20 bg-white dark:bg-white/5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all active:scale-95 cursor-pointer">
                                                <HugeiconsIcon icon={Delete02Icon} className="w-3.5 h-3.5" strokeWidth={2} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="overflow-hidden rounded-md border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/50">
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse min-w-[820px]">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-white/5 bg-slate-50/60 dark:bg-white/2">
                                        <th className="py-4 px-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Recinto</th>
                                        <th className="py-4 px-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Plan</th>
                                        <th className="py-4 px-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider text-center">Canchas</th>
                                        <th className="py-4 px-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider text-center">Staff</th>
                                        <th className="py-4 px-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider text-center">Rating</th>
                                        <th className="py-4 px-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider text-right">MRR</th>
                                        <th className="py-4 px-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider text-right">Por cobrar</th>
                                        <th className="py-4 px-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Estado</th>
                                        <th className="py-4 px-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                    {visibleTenants.map((t) => {
                                        const isActive = t.status === 'Activo';
                                        const planStyle = planStyleOf(t.plan).replace(/border-\S+/g, '').trim();
                                        const rating = Number(t.rating) || 0;
                                        return (
                                            <tr key={t.id} className="hover:bg-slate-50/60 dark:hover:bg-white/2 transition-colors">
                                                <td className="py-4 px-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-md overflow-hidden bg-slate-100 dark:bg-white/5 border border-slate-100 dark:border-white/10 shrink-0">
                                                            {t.imageUrl ? <img src={t.imageUrl} alt={t.name} className="w-full h-full object-cover" /> : <HugeiconsIcon icon={Building01Icon} className="w-5 h-5 text-slate-300 dark:text-white/15 m-auto mt-2.5" strokeWidth={1.6} />}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <span className="font-black text-[13px] text-slate-900 dark:text-white uppercase truncate block font-heading">{t.name}</span>
                                                            <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1 mt-0.5">
                                                                <HugeiconsIcon icon={MapPinIcon} className="w-3 h-3 shrink-0" strokeWidth={2} />
                                                                {t.commune || "—"}, {t.region || "—"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${planStyle}`}>{t.plan}</span>
                                                </td>
                                                <td className="py-4 px-6 text-center font-mono text-[12px] font-black text-slate-900 dark:text-white">{t.infra.courts}</td>
                                                <td className="py-4 px-6 text-center font-mono text-[12px] font-black text-slate-900 dark:text-white">{t.infra.staff}</td>
                                                <td className="py-4 px-6 text-center">
                                                    {rating > 0 ? (
                                                        <span className="inline-flex items-center gap-1">
                                                            <HugeiconsIcon icon={StarIcon} className="w-3.5 h-3.5 text-amber-400" strokeWidth={2} />
                                                            <span className="font-mono text-[12px] font-black text-slate-900 dark:text-white">{rating.toFixed(1)}</span>
                                                        </span>
                                                    ) : <span className="text-[11px] text-slate-400">—</span>}
                                                </td>
                                                <td className="py-4 px-6 text-right font-mono text-[12px] font-black text-slate-900 dark:text-white">{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(t.mrr || 0)}</td>
                                                <td className="py-4 px-6 text-right">
                                                    {(t.debt || 0) > 0 ? (
                                                        <span className="font-mono text-[12px] font-black text-amber-600 dark:text-amber-400">{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(t.debt || 0)}</span>
                                                    ) : <span className="text-[11px] text-slate-400">—</span>}
                                                </td>
                                                <td className="py-4 px-6">
                                                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border ${isActive ? 'bg-emerald-500/10 text-emerald-700 dark:text-[#00df82] border-emerald-500/25' : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/25'}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                                        {t.status}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <div className="flex items-center justify-end">
                                                        <button onClick={() => setProfileTenant(t)} aria-label="Ver perfil" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10 hover:text-[#00df82] hover:border-emerald-300 dark:hover:border-[#00df82]/30 hover:bg-emerald-50 dark:hover:bg-[#00df82]/10 transition-all active:scale-95 cursor-pointer">
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
            </div>

            {/* MOSTRAR MÁS */}
            {sortedTenants.length > visibleCount && (
                <div className="flex justify-center pt-2">
                    <button onClick={() => setVisibleCount(c => c + 12)} className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 text-[11px] font-black uppercase tracking-wider hover:border-emerald-400 dark:hover:border-[#00df82]/40 hover:text-emerald-600 dark:hover:text-[#00df82] transition-all cursor-pointer">
                        Mostrar más ({sortedTenants.length - visibleCount} restantes)
                    </button>
                </div>
            )}

            {/* PERFIL DEL RECINTO */}
            <TenantProfileModal
                tenant={profileTenant}
                isOpen={!!profileTenant}
                onClose={() => setProfileTenant(null)}
                onEdit={(t) => openEdit(t)}
                onToggleStatus={(t) => setTenantToToggle(t)}
                onDelete={(t) => setTenantToDelete(t)}
            />

            {/* WIZARD */}
            <TenantWizard
                open={wizardOpen}
                mode={wizardMode}
                initial={wizardInitial}
                ownersList={ownersList}
                isSubmitting={isSubmitting}
                onClose={() => setWizardOpen(false)}
                onSubmit={handleSubmit}
            />

            {/* CONFIRM: ELIMINAR */}
            <ConfirmDialog
                open={!!tenantToDelete}
                tone="danger"
                title="¿Eliminar recinto?"
                message={<>Estás por borrar <strong>{tenantToDelete?.name}</strong>. Se perderán las canchas y el staff asociados. Esta acción no se puede deshacer.</>}
                confirmLabel="Eliminar"
                loading={isDeleting}
                onConfirm={handleDeleteTenant}
                onCancel={() => setTenantToDelete(null)}
            />

            {/* CONFIRM: SUSPENDER / ACTIVAR */}
            <ConfirmDialog
                open={!!tenantToToggle}
                tone="warning"
                title={tenantToToggle?.status === 'Activo' ? "¿Suspender recinto?" : "¿Activar recinto?"}
                message={tenantToToggle?.status === 'Activo'
                    ? <>El recinto <strong>{tenantToToggle?.name}</strong> dejará de estar disponible para reservas.</>
                    : <>El recinto <strong>{tenantToToggle?.name}</strong> volverá a estar disponible para reservas.</>}
                confirmLabel={tenantToToggle?.status === 'Activo' ? "Suspender" : "Activar"}
                loading={isToggling}
                onConfirm={handleToggleStatus}
                onCancel={() => setTenantToToggle(null)}
            />
        </div>
    );
}
