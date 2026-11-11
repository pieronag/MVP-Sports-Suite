"use client";
// Red de recintos (superadmin): alta y edición con el asistente, suspensión, baja y perfil de cada recinto.
// La carga vive en services/client/data/tenantDirectory; la tarjeta, la tabla y los filtros en components/tenants.
import PageTitle, { Accent } from "@/components/dashboard/PageTitle";
import { useFeedback } from "@/components/ui/Feedback";
import { useState, useEffect, useMemo, useCallback } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Building01Icon, CheckmarkBadge01Icon, MoneyBag01Icon, Alert02Icon, Add01Icon, UserGroupIcon, Store01Icon, Cancel01Icon, Download01Icon, ArrowDownRight01Icon, ChartIncreaseIcon } from "@hugeicons/core-free-icons";
import { collection, getDocs, doc, updateDoc, addDoc, deleteDoc, query, where, serverTimestamp } from "firebase/firestore";
import { db } from "@/services/client/firebase";
import { uploadImage } from "@/services/client/imageUpload";
import { auditService } from "@/services/client/auditService";
import { useAuth } from "@/context/AuthContext";
import { TarjetaKpi } from "@/components/ui/DashboardWidgets";
import TenantWizard, { EMPTY_TENANT_FORM, type TenantFormState, type OwnerOption } from "@/components/dashboard/TenantWizard";
import TenantProfileModal from "@/components/dashboard/TenantProfileModal";
import { usePlans } from "@/components/landing/usePlans";
import { loadTenantDirectory, countTenantBookings, isTenantActive, type TenantRow } from "@/services/client/data/tenantDirectory";
import { TenantCard, TenantTable, formatCLP, type TenantMoney } from "@/components/tenants/TenantViews";
import TenantToolbar, { type TenantFilters } from "@/components/tenants/TenantToolbar";

const ic = "w-6 h-6";
const PAGE = 12;
const DEFAULT_FILTERS: TenantFilters = { search: "", region: "Todas", commune: "Todas", status: "Todos", view: "list", sort: "name" };

export default function Page() {
    const { plans } = usePlans();
    const { user, role, firestoreUser } = useAuth();
    const { toast, confirm, alert } = useFeedback();
    const [tenants, setTenants] = useState<TenantRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState<TenantFilters>(DEFAULT_FILTERS);
    const [visibleCount, setVisibleCount] = useState(PAGE);
    const [ownersList, setOwnersList] = useState<OwnerOption[]>([]);
    const [profileTenant, setProfileTenant] = useState<TenantRow | null>(null);
    const [wizard, setWizard] = useState<{ open: boolean; editingId: string | null; initial: TenantFormState }>({ open: false, editingId: null, initial: EMPTY_TENANT_FORM });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Precio del plan vigente (por id o nombre). Se resuelve al dibujar: los planes llegan después que los recintos.
    const planOf = useCallback((ref?: string) => {
        const raw = (ref || "").trim().toLowerCase();
        return raw ? plans.find((p) => p.name.toLowerCase() === raw || p.id.toLowerCase() === raw) : undefined;
    }, [plans]);
    const moneyOf = useCallback((t: TenantRow): TenantMoney => {
        const price = Number(planOf(t.plan)?.price || 0);
        const prices = plans.map((p) => Number(p.price || 0)).sort((a, b) => a - b);
        const paid = prices.filter((p) => p > 0);
        const top = prices[prices.length - 1] || 0;
        const planStyle = price <= 0 ? "bg-slate-800/90 text-white border-white/15"
            : price >= top ? "bg-amber-400/95 text-amber-950 border-amber-300"
            : paid.length >= 2 && price >= paid[paid.length - 2] ? "bg-indigo-500/95 text-white border-indigo-400"
            : "bg-sky-500/95 text-white border-sky-400";
        return { mrr: price, debt: t.overdue ? price : 0, planStyle };
    }, [plans, planOf]);

    const audit = (action: string, details: string, ok = true) => auditService.logAuditEvent({
        action, module: "RECINTOS", details, severity: "HIGH", status: ok ? "SUCCESS" : "FAILED",
        actor: firestoreUser?.fullName || user?.displayName || user?.email || "Admin", role: role || "sin-rol", email: user?.email || "",
    });

    const refresh = useCallback(async () => {
        setLoading(true);
        try { setTenants(await loadTenantDirectory()); }
        catch { toast("Error al cargar recintos", "error"); }
        finally { setLoading(false); }
    }, [toast]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial
        refresh();
        getDocs(query(collection(db, "users"), where("role", "in", ["owner", "dueño"])))
            .then((s) => setOwnersList(s.docs.map((d) => ({ id: d.id, name: d.data().fullName || d.data().displayName || d.data().name || "Sin nombre", email: d.data().email || "Sin email" }))))
            .catch((e) => console.error(e));
    }, [refresh]);

    // ---- Acciones ----
    const toggleStatus = async (t: TenantRow) => {
        const active = isTenantActive(t.status);
        const ok = await confirm({
            title: active ? "¿Suspender recinto?" : "¿Activar recinto?",
            message: active ? <>El recinto <strong>{t.name}</strong> dejará de estar disponible para reservas.</> : <>El recinto <strong>{t.name}</strong> volverá a estar disponible para reservas.</>,
            tone: "warning", confirmLabel: active ? "Suspender" : "Activar",
        });
        if (!ok) return;
        const next = active ? "Suspendido" : "Activo";
        try {
            await updateDoc(doc(db, "tenants", t.id), { status: next });
            await audit(active ? "RECINTO_SUSPENDIDO" : "RECINTO_ACTIVADO", `${t.name} (${t.id}) → ${next}`);
            toast(`Recinto ${next.toLowerCase()}`);
            setProfileTenant(null);
            refresh();
        } catch { toast("Error al cambiar el estado", "error"); }
    };

    // Solo se borra un recinto sin historia; con canchas, staff o reservas se suspende (borrar dejaría datos huérfanos)
    const deleteTenant = async (t: TenantRow) => {
        let bookings = 0;
        try { bookings = await countTenantBookings(t.id); } catch { bookings = -1; }
        if (t.infra.courts > 0 || t.infra.staff > 0 || bookings !== 0) {
            const parts = [t.infra.courts && `${t.infra.courts} cancha(s)`, t.infra.staff && `${t.infra.staff} persona(s) de staff`, bookings > 0 && `${bookings} reserva(s)`].filter(Boolean).join(", ");
            return alert("No se puede eliminar", <>
                <strong>{t.name}</strong> tiene {parts || "datos asociados"}. Suspéndelo para que deje de recibir reservas sin perder su historial.
            </>);
        }
        if (!await confirm({ title: "¿Eliminar recinto?", message: <>Se borrará <strong>{t.name}</strong>. Esta acción no se puede deshacer.</>, tone: "danger", confirmLabel: "Eliminar" })) return;
        try {
            await deleteDoc(doc(db, "tenants", t.id));
            await audit("RECINTO_ELIMINADO", `${t.name} (${t.id})`);
            toast("Recinto eliminado");
            setProfileTenant(null);
            refresh();
        } catch { toast("Error al eliminar", "error"); }
    };

    const openCreate = () => setWizard({ open: true, editingId: null, initial: EMPTY_TENANT_FORM });
    const openEdit = (t: TenantRow) => {
        setProfileTenant(null);
        setWizard({
            open: true, editingId: t.id,
            initial: {
                name: t.name,
                selectedOwners: t.ownerIds.map((id, i) => ({ id, name: t.owners[i] || "Dueño", email: t.ownerEmails[i] || "" })),
                plan: planOf(t.plan)?.name || EMPTY_TENANT_FORM.plan,
                region: t.region || "Metropolitana",
                commune: t.commune,
                address: t.address,
                lat: t.coordinates.lat || 0,
                lng: t.coordinates.lng || 0,
                imagePreview: t.imageUrl,
            },
        });
    };

    const handleSubmit = async (form: TenantFormState) => {
        setIsSubmitting(true);
        try {
            const plan = plans.find((p) => p.name === form.plan || p.id === form.plan);
            // La portada va a Storage; el documento guarda solo la URL (antes guardaba la foto en base64)
            const imageUrl = form.imagePreview.startsWith("data:") ? await uploadImage(form.imagePreview, { folder: "venues", maxSize: 1600 }) : form.imagePreview;
            const ownerIds = form.selectedOwners.map((o) => o.id);
            const ownerNames = form.selectedOwners.map((o) => o.name);
            const ownerEmails = form.selectedOwners.map((o) => o.email);
            const data = {
                name: form.name.trim(),
                ownerIds, ownerNames, ownerEmails,
                ownerId: ownerIds[0] || "", ownerName: ownerNames[0] || "", ownerEmail: ownerEmails[0] || "",
                region: form.region, commune: form.commune, address: form.address,
                fullAddress: `${form.address}, ${form.commune}, ${form.region}`,
                coordinates: { lat: form.lat, lng: form.lng },
                imageUrl,
                plan: plan?.name || form.plan, planId: plan?.id || form.plan.toLowerCase(), planPrice: Number(plan?.price ?? 0),
            };
            if (wizard.editingId) {
                await updateDoc(doc(db, "tenants", wizard.editingId), data);
                await audit("RECINTO_EDITADO", `${data.name} (${wizard.editingId})`);
                toast("Recinto actualizado");
            } else {
                const ref = await addDoc(collection(db, "tenants"), { ...data, status: "Activo", debtStatus: "Al Día", createdAt: serverTimestamp() });
                await audit("RECINTO_CREADO", `${data.name} (${ref.id})`);
                toast("Recinto creado");
            }
            setWizard((w) => ({ ...w, open: false }));
            refresh();
        } catch (e) {
            toast(e instanceof Error ? e.message : "Ocurrió un error", "error");
        } finally { setIsSubmitting(false); }
    };

    // ---- Filtros y orden ----
    const setF = (patch: Partial<TenantFilters>) => { setFilters((f) => ({ ...f, ...patch })); setVisibleCount(PAGE); };
    const regions = useMemo(() => Array.from(new Set(tenants.map((t) => t.region).filter(Boolean))).sort(), [tenants]);
    const communes = useMemo(() => {
        const base = filters.region === "Todas" ? tenants : tenants.filter((t) => t.region === filters.region);
        return Array.from(new Set(base.map((t) => t.commune).filter(Boolean))).sort();
    }, [tenants, filters.region]);

    const filtered = useMemo(() => {
        const q = filters.search.trim().toLowerCase();
        return tenants.filter((t) =>
            (!q || t.name.toLowerCase().includes(q) || t.owners.some((o) => o.toLowerCase().includes(q))) &&
            (filters.region === "Todas" || t.region === filters.region) &&
            (filters.commune === "Todas" || t.commune === filters.commune) &&
            (filters.status === "Todos" || !isTenantActive(t.status)));
    }, [tenants, filters]);
    const sorted = useMemo(() => [...filtered].sort((a, b) =>
        filters.sort === "mrr" ? moneyOf(b).mrr - moneyOf(a).mrr
            : filters.sort === "rating" ? b.rating - a.rating
            : a.name.localeCompare(b.name)), [filtered, filters.sort, moneyOf]);
    const visible = sorted.slice(0, visibleCount);
    const filtering = filters.search || filters.region !== "Todas" || filters.commune !== "Todas" || filters.status !== "Todos";

    const totals = useMemo(() => tenants.reduce((acc, t) => {
        const m = moneyOf(t);
        return { mrr: acc.mrr + m.mrr, debt: acc.debt + m.debt, owing: acc.owing + (m.debt > 0 ? 1 : 0), paid: acc.paid + (m.mrr > 0 ? 1 : 0), courts: acc.courts + t.infra.courts, staff: acc.staff + t.infra.staff };
    }, { mrr: 0, debt: 0, owing: 0, paid: 0, courts: 0, staff: 0 }), [tenants, moneyOf]);

    const exportCSV = () => {
        const esc = (v: unknown) => { const s = String(v ?? ""); return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
        const line = (cells: unknown[]) => cells.map(esc).join(";");
        const head = ["Recinto", "Dueños", "Plan", "MRR", "Comuna", "Región", "Canchas", "Staff", "Rating", "Reseñas", "Deuda", "Estado"];
        const body = sorted.map((t) => { const m = moneyOf(t); return line([t.name, t.owners.join(" | "), t.plan, m.mrr, t.commune, t.region, t.infra.courts, t.infra.staff, t.rating, t.totalFeedbacks, m.debt, t.status]); });
        const url = URL.createObjectURL(new Blob(["﻿" + [line(head), ...body].join("\n")], { type: "text/csv;charset=utf-8;" }));
        const a = document.createElement("a");
        a.href = url; a.download = `recintos_mvp_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click(); URL.revokeObjectURL(url);
    };

    const summary = [
        { label: "MRR total", value: formatCLP(totals.mrr), icon: ChartIncreaseIcon, tone: "text-slate-900 dark:text-white", chip: "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-[#00df82]" },
        { label: "Por cobrar", value: formatCLP(totals.debt), icon: ArrowDownRight01Icon, tone: "text-amber-600 dark:text-amber-400", chip: "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400" },
        { label: "Recintos con deuda", value: String(totals.owing), icon: Alert02Icon, tone: "text-slate-900 dark:text-white", chip: "bg-red-500/10 border-red-500/20 text-red-500" },
    ];

    return (
        <div className="w-full space-y-6 pb-12 animate-fadeIn relative">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-6">
                <PageTitle eyebrow="Red de infraestructura">Gestión de <Accent>Recintos</Accent></PageTitle>
                <div className="flex items-center gap-2">
                    <button onClick={exportCSV} disabled={sorted.length === 0} className="inline-flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 text-[11px] font-black uppercase tracking-wider rounded-md hover:border-emerald-400 dark:hover:border-[#00df82]/40 hover:text-emerald-600 dark:hover:text-[#00df82] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                        <HugeiconsIcon icon={Download01Icon} className="w-4 h-4" strokeWidth={2} />
                        Exportar
                    </button>
                    <button onClick={openCreate} className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 dark:bg-[#00df82] text-white dark:text-slate-950 text-[11px] font-black uppercase tracking-wider rounded-md shadow-lg shadow-emerald-500/25 hover:brightness-110 active:scale-95 transition-all cursor-pointer">
                        <HugeiconsIcon icon={Add01Icon} className="w-4 h-4" strokeWidth={2} />
                        Nuevo recinto
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <TarjetaKpi titulo="Recintos" valor={String(tenants.length)} sub="Global" icono={<HugeiconsIcon icon={Building01Icon} className={ic} strokeWidth={1.6} />} brillo />
                <TarjetaKpi titulo="Canchas" valor={String(totals.courts)} sub="Operativas" icono={<HugeiconsIcon icon={CheckmarkBadge01Icon} className={ic} strokeWidth={1.6} />} />
                <TarjetaKpi titulo="Staff" valor={String(totals.staff)} sub="Colaboradores" icono={<HugeiconsIcon icon={UserGroupIcon} className={ic} strokeWidth={1.6} />} />
                <TarjetaKpi titulo="Clientes" valor={String(totals.paid)} sub="Suscripciones" icono={<HugeiconsIcon icon={MoneyBag01Icon} className={ic} strokeWidth={1.6} />} brillo />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {summary.map((s) => (
                    <div key={s.label} className="rounded-md bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 px-5 py-4 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] md:text-[9px] font-black text-slate-400 uppercase tracking-wider">{s.label}</p>
                            <p className={`text-lg font-black font-mono leading-none mt-1 tabular-nums ${s.tone}`}>{s.value}</p>
                        </div>
                        <span className={`w-10 h-10 rounded-md border flex items-center justify-center ${s.chip}`}>
                            <HugeiconsIcon icon={s.icon} className="w-5 h-5" strokeWidth={1.6} />
                        </span>
                    </div>
                ))}
            </div>

            <TenantToolbar f={filters} set={setF} regions={regions} communes={communes} loading={loading} onRefresh={refresh} />

            {filtering && (
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        <span className="font-mono text-slate-900 dark:text-white">{filtered.length}</span> resultado{filtered.length === 1 ? "" : "s"}
                        {filters.region !== "Todas" && <> · región <span className="text-slate-900 dark:text-white">{filters.region}</span></>}
                        {filters.commune !== "Todas" && <> · comuna <span className="text-slate-900 dark:text-white">{filters.commune}</span></>}
                    </p>
                    <button onClick={() => setF({ search: "", region: "Todas", commune: "Todas", status: "Todos" })} className="inline-flex items-center gap-1.5 text-xs md:text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-emerald-600 dark:hover:text-[#00df82] transition-colors cursor-pointer">
                        <HugeiconsIcon icon={Cancel01Icon} className="w-3.5 h-3.5" strokeWidth={2} />
                        Limpiar filtros
                    </button>
                </div>
            )}

            <div className="relative min-h-[400px]">
                {loading && tenants.length === 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
                        {Array.from({ length: 6 }, (_, i) => <div key={i} className="h-44 rounded-md border border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-white/5 animate-pulse" />)}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                        <span className="w-16 h-16 rounded-md bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                            <HugeiconsIcon icon={Store01Icon} className="w-8 h-8 text-slate-300 dark:text-white/15" strokeWidth={1.5} />
                        </span>
                        <div className="text-center">
                            <p className="text-[12px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">No hay recintos que coincidan</p>
                            <p className="text-[11px] text-slate-400 mt-1">Ajusta la búsqueda o crea un nuevo recinto.</p>
                        </div>
                    </div>
                ) : filters.view === "grid" ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
                        {visible.map((t) => (
                            <TenantCard key={t.id} t={t} money={moneyOf(t)} onOpen={() => setProfileTenant(t)} onEdit={() => openEdit(t)} onToggle={() => toggleStatus(t)} onDelete={() => deleteTenant(t)} />
                        ))}
                    </div>
                ) : (
                    <TenantTable rows={visible} moneyOf={moneyOf} onOpen={setProfileTenant} />
                )}
            </div>

            {sorted.length > visibleCount && (
                <div className="flex justify-center pt-2">
                    <button onClick={() => setVisibleCount((c) => c + PAGE)} className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 text-[11px] font-black uppercase tracking-wider hover:border-emerald-400 dark:hover:border-[#00df82]/40 hover:text-emerald-600 dark:hover:text-[#00df82] transition-all cursor-pointer">
                        Mostrar más ({sorted.length - visibleCount} restantes)
                    </button>
                </div>
            )}

            <TenantProfileModal
                tenant={profileTenant ? { ...profileTenant, mrr: moneyOf(profileTenant).mrr } : null}
                isOpen={!!profileTenant}
                onClose={() => setProfileTenant(null)}
                onEdit={openEdit}
                onToggleStatus={toggleStatus}
                onDelete={deleteTenant}
            />

            <TenantWizard
                open={wizard.open}
                mode={wizard.editingId ? "edit" : "create"}
                initial={wizard.initial}
                ownersList={ownersList}
                isSubmitting={isSubmitting}
                onClose={() => setWizard((w) => ({ ...w, open: false }))}
                onSubmit={handleSubmit}
            />
        </div>
    );
}
