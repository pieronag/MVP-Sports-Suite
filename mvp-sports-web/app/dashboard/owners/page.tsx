"use client";
// Cartera de dueños (superadmin): alta, edición, contraseña, suspensión y baja.
// Filas en utils/ownerDirectory (deuda real desde las liquidaciones); alta y baja por /dashboard/owners/api.
import { useCallback, useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Alert02Icon, Grid02Icon, InformationCircleIcon, ListViewIcon, MoneyBag01Icon, RefreshIcon, Search01Icon, UserGroupIcon } from "@hugeicons/core-free-icons";
import { collection, doc, getDoc, getDocs, query, updateDoc, where } from "firebase/firestore";
import PageTitle, { Accent } from "@/components/dashboard/PageTitle";
import { TarjetaKpi } from "@/components/ui/DashboardWidgets";
import { useFeedback } from "@/components/ui/Feedback";
import OwnerWizard, { EMPTY_OWNER_FORM, type OwnerFormState } from "@/components/dashboard/OwnerWizard";
import OwnerProfileModal from "@/components/dashboard/OwnerProfileModal";
import { CredentialsSheet, OwnerCards, OwnerTable, PasswordSheet, formatCLP } from "@/components/owners/OwnerViews";
import { auditService } from "@/services/client/auditService";
import { postApi } from "@/services/client/apiClient";
import { auth, db } from "@/services/client/firebase";
import { filterOwners, ownerUpdate, toOwnerRow, type OwnerFilter, type OwnerRow } from "@/utils/ownerDirectory";

type IconType = typeof Add01Icon;
const Icon = ({ icon, className = "w-6 h-6", w = 1.6 }: { icon: IconType; className?: string; w?: number }) => <HugeiconsIcon icon={icon} className={className} strokeWidth={w} />;
const FILTERS: OwnerFilter[] = ["Todos", "Morosos", "Suspendidos", "Sin recintos"];

async function ownersApi(body: Record<string, unknown>) {
  const res = await fetch("/dashboard/owners/api", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${await auth.currentUser?.getIdToken()}` },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "No se pudo completar la acción.");
  return data as { uid?: string };
}

export default function OwnersPage() {
  const { toast, confirm } = useFeedback();
  const [owners, setOwners] = useState<OwnerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<OwnerFilter>("Todos");
  const [view, setView] = useState<"grid" | "list">("list");
  const [wizard, setWizard] = useState<{ mode: "create" | "edit"; id: string | null; initial: OwnerFormState } | null>(null);
  const [busy, setBusy] = useState(false);
  const [profile, setProfile] = useState<OwnerRow | null>(null);
  const [passwordFor, setPasswordFor] = useState<OwnerRow | null>(null);
  const [created, setCreated] = useState<{ email: string; pass: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [settings, users, tenants, invoices] = await Promise.all([
        getDoc(doc(db, "settings", "global")), getDocs(query(collection(db, "users"), where("role", "==", "owner"))),
        getDocs(collection(db, "tenants")), getDocs(collection(db, "invoices")),
      ]);
      const plans = Array.isArray(settings.data()?.plans) ? settings.data()!.plans : [];
      const t = tenants.docs.map((d) => ({ ...d.data(), id: d.id }));
      const inv = invoices.docs.map((d) => d.data());
      setOwners(users.docs.map((d) => toOwnerRow(d.id, d.data(), t, plans, inv)));
    } catch (e) {
      console.error("Dueños", e);
      toast("No se pudieron cargar los dueños", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);
  useEffect(() => { load(); }, [load]); // eslint-disable-line react-hooks/set-state-in-effect -- carga inicial

  const audit = (action: string, details: string, severity: "LOW" | "MEDIUM" | "HIGH" = "MEDIUM") =>
    auditService.logAuditEvent({ action, module: "DUEÑOS", details, severity, status: "SUCCESS" }).catch(() => {});

  const openEdit = (o: OwnerRow) => {
    setProfile(null);
    setWizard({ mode: "edit", id: o.id, initial: { name: o.name, email: o.email, phone: o.phone, company: o.company, rut: o.rut, billingAddress: o.billingAddress, password: "" } });
  };

  const submit = async (form: OwnerFormState) => {
    if (!wizard) return;
    setBusy(true);
    try {
      if (wizard.mode === "edit" && wizard.id) {
        await updateDoc(doc(db, "users", wizard.id), { ...ownerUpdate(form), updatedAt: new Date() });
        audit("DUEÑO_EDITADO", `Se editaron los datos de ${form.name.trim()} (${wizard.id}).`, "LOW");
        toast("Dueño actualizado");
      } else {
        const r = await ownersApi({ action: "create", email: form.email, password: form.password, displayName: form.name, ...{ phone: form.phone, companyName: form.company, rut: form.rut, billingAddress: form.billingAddress } });
        audit("DUEÑO_CREADO", `Alta del dueño ${form.name.trim()} <${form.email.trim()}> (${r.uid}).`);
        setCreated({ email: form.email.trim().toLowerCase(), pass: form.password });
      }
      setWizard(null);
      await load();
    } catch (e) {
      toast((e as Error).message || "Ocurrió un error", "error");
    } finally {
      setBusy(false);
    }
  };

  const changePassword = async (pass: string) => {
    if (!passwordFor) return;
    setBusy(true);
    try {
      await ownersApi({ action: "updatePassword", uid: passwordFor.id, password: pass });
      audit("DUEÑO_CLAVE", `Se cambió la contraseña de ${passwordFor.name} (${passwordFor.id}).`, "HIGH");
      toast("Contraseña actualizada");
      setPasswordFor(null);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  const toggleStatus = async (o: OwnerRow) => {
    const suspend = o.status === "Activo";
    const ok = await confirm({
      title: suspend ? "¿Suspender dueño?" : "¿Activar dueño?",
      message: suspend ? <><strong>{o.name}</strong> pierde el acceso al panel hasta que lo reactives. Sus recintos siguen visibles para los jugadores.</> : <><strong>{o.name}</strong> recupera el acceso al panel.</>,
      tone: suspend ? "danger" : "default", confirmLabel: suspend ? "Suspender" : "Activar",
    });
    if (!ok) return;
    try {
      await postApi("/api/admin/user-status", { uid: o.id, status: suspend ? "suspended" : "active" });
      toast(suspend ? "Dueño suspendido" : "Dueño activado");
      setProfile(null);
      await load();
    } catch (e) {
      toast((e as Error)?.message || "No se pudo cambiar el estado", "error");
    }
  };

  const remove = async (o: OwnerRow) => {
    if (o.venues.length) {
      toast(`${o.name} tiene ${o.venues.length === 1 ? "un recinto" : `${o.venues.length} recintos`} a su nombre. Reasígnalos o suspende al dueño.`, "error");
      return;
    }
    const ok = await confirm({ title: "¿Eliminar dueño?", message: <>Se elimina la cuenta de <strong>{o.name}</strong> y su acceso. No se puede deshacer.</>, tone: "danger", confirmLabel: "Eliminar" });
    if (!ok) return;
    try {
      await ownersApi({ action: "delete", uid: o.id });
      audit("DUEÑO_ELIMINADO", `Se eliminó la cuenta del dueño ${o.name} (${o.id}).`, "HIGH");
      toast("Dueño eliminado");
      setProfile(null);
      setOwners((prev) => prev.filter((x) => x.id !== o.id));
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  const visible = filterOwners(owners, search, filter);
  const mrr = owners.reduce((a, o) => a + o.totalMrr, 0);
  const debtors = owners.filter((o) => o.debt > 0);
  const seg = "flex items-center gap-1 bg-slate-50 dark:bg-white/5 p-1 rounded-md border border-slate-100 dark:border-white/10";
  const newBtn = "inline-flex items-center gap-2 px-5 h-10 bg-[#00df82] text-slate-950 text-[11px] font-black uppercase tracking-wider rounded-md active:scale-95";

  return (
    <div className="w-full space-y-6 pb-12 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-6">
        <PageTitle eyebrow="Cartera de partners">Gestión de <Accent>Dueños</Accent></PageTitle>
        <button onClick={() => setWizard({ mode: "create", id: null, initial: EMPTY_OWNER_FORM })} className={newBtn}><Icon icon={Add01Icon} className="w-4 h-4" w={2} />Nuevo dueño</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <TarjetaKpi titulo="Dueños" valor={String(owners.length)} sub={`${owners.filter((o) => o.status === "Suspendido").length} suspendidos`} icono={<Icon icon={UserGroupIcon} />} brillo />
        <TarjetaKpi titulo="Planes (MRR)" valor={formatCLP(mrr)} sub="Lo que pagan al mes" icono={<Icon icon={MoneyBag01Icon} />} />
        <TarjetaKpi titulo="Con deuda" valor={String(debtors.length)} sub={formatCLP(debtors.reduce((a, o) => a + o.debt, 0))} icono={<Icon icon={Alert02Icon} className="w-6 h-6 text-red-500" />} />
        <TarjetaKpi titulo="Ticket promedio" valor={formatCLP(owners.length ? Math.round(mrr / owners.length) : 0)} sub="Mensual por dueño" icono={<Icon icon={InformationCircleIcon} />} />
      </div>

      <div className="flex flex-col xl:flex-row gap-3 xl:items-center justify-between p-3 rounded-md border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/50">
        <div className="relative w-full xl:w-80 shrink-0">
          <Icon icon={Search01Icon} className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" w={1.8} />
          <input type="search" aria-label="Buscar dueño" placeholder="Buscar por nombre, email, empresa o recinto…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 h-10 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-emerald-500 rounded-md text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-hidden" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className={`${seg} overflow-x-auto no-scrollbar max-w-full`} role="group" aria-label="Filtro">
            {FILTERS.map((f) => (
              <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)} className={`px-3 h-8 text-[10px] font-black uppercase rounded-md whitespace-nowrap ${filter === f ? "bg-white dark:bg-[#00df82] text-slate-900 dark:text-slate-950 shadow-xs" : "text-slate-500 hover:text-slate-900 dark:hover:text-white"}`}>{f}</button>
            ))}
          </div>
          <div className={`${seg} hidden md:flex`}>
            {([["grid", Grid02Icon, "Vista tarjetas"], ["list", ListViewIcon, "Vista tabla"]] as const).map(([v, ic, label]) => (
              <button key={v} onClick={() => setView(v)} aria-label={label} aria-pressed={view === v} className={`w-8 h-8 flex items-center justify-center rounded-md ${view === v ? "bg-white dark:bg-[#00df82] text-emerald-600 dark:text-slate-950 shadow-xs" : "text-slate-400"}`}><Icon icon={ic} className="w-4 h-4" w={1.8} /></button>
            ))}
          </div>
          <button onClick={load} aria-label="Actualizar" className="w-10 h-10 flex items-center justify-center rounded-md text-slate-500 hover:text-emerald-600 border border-slate-200 dark:border-white/10"><Icon icon={RefreshIcon} className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} w={1.8} /></button>
        </div>
      </div>

      {loading && !owners.length ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3" role="status">
          <Icon icon={RefreshIcon} className="w-8 h-8 text-emerald-500 animate-spin" w={2} />
          <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Cargando dueños…</p>
        </div>
      ) : !visible.length ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <Icon icon={UserGroupIcon} className="w-10 h-10 text-slate-300 dark:text-white/15" w={1.5} />
          <p className="text-[12px] font-black text-slate-500 uppercase tracking-[0.15em]">{owners.length ? "Ningún dueño coincide" : "Aún no hay dueños"}</p>
          {owners.length ? <button onClick={() => { setSearch(""); setFilter("Todos"); }} className="text-[11px] font-black uppercase text-emerald-600 dark:text-[#00df82]">Quitar filtros</button>
            : <button onClick={() => setWizard({ mode: "create", id: null, initial: EMPTY_OWNER_FORM })} className={newBtn}><Icon icon={Add01Icon} className="w-4 h-4" w={2} />Nuevo dueño</button>}
        </div>
      ) : view === "list" ? (
        <>
          <div className="hidden md:block"><OwnerTable rows={visible} onOpen={setProfile} /></div>
          <div className="md:hidden"><OwnerCards rows={visible} onOpen={setProfile} onEdit={openEdit} /></div>
        </>
      ) : <OwnerCards rows={visible} onOpen={setProfile} onEdit={openEdit} />}

      <OwnerProfileModal owner={profile} isOpen={!!profile} onClose={() => setProfile(null)}
        onEdit={(o: OwnerRow) => openEdit(o)} onChangePassword={(o: OwnerRow) => { setProfile(null); setPasswordFor(o); }}
        onToggleStatus={(o: OwnerRow) => toggleStatus(o)} onDelete={(o: OwnerRow) => remove(o)} />
      <OwnerWizard open={!!wizard} mode={wizard?.mode || "create"} initial={wizard?.initial || EMPTY_OWNER_FORM} isSubmitting={busy} onClose={() => setWizard(null)} onSubmit={submit} />
      {passwordFor && <PasswordSheet owner={passwordFor} busy={busy} onSubmit={changePassword} onClose={() => setPasswordFor(null)} />}
      {created && (
        <CredentialsSheet email={created.email} pass={created.pass} onClose={() => setCreated(null)}
          onCopy={() => navigator.clipboard.writeText(created.pass).then(() => toast("Contraseña copiada"), () => toast("No se pudo copiar: selecciónala y cópiala", "error"))} />
      )}
    </div>
  );
}
