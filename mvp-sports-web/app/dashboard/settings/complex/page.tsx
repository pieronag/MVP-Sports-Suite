"use client";
// Configuración del complejo (dueño; el superadmin ve todos los recintos).
// Datos públicos → documento del recinto. Credenciales → /api/tenant-secrets (nunca se leen de vuelta).
import { useCallback, useEffect, useMemo, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Building01Icon, CheckmarkCircle02Icon, FloppyDiskIcon, RefreshIcon } from "@hugeicons/core-free-icons";
import { collection, doc, getDoc, getDocs, or, query, updateDoc, where } from "firebase/firestore";
import PageTitle, { Accent } from "@/components/dashboard/PageTitle";
import { useFeedback } from "@/components/ui/Feedback";
import { useAuth } from "@/context/AuthContext";
import { auditService } from "@/services/client/auditService";
import { auth, db } from "@/services/client/firebase";
import { formFromTenant, mercadoPagoMissing, sectionsDone, splitForSave, validateComplex, type ComplexForm, type SectionId } from "@/utils/complexForm";
import { ContactSection, IdentitySection, IntegrationsSection, LegalSection, OperationSection, SECTIONS, type SetField } from "@/components/complex/Sections";

type Tenant = { id: string; name?: string } & Record<string, unknown>;

async function authHeaders(): Promise<Record<string, string>> {
  const token = await auth.currentUser?.getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function ComplexSettingsPage() {
  const { user, role, firestoreUser } = useAuth();
  const { toast, confirm, alert } = useFeedback();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState<ComplexForm | null>(null);
  const [snapshot, setSnapshot] = useState("");
  const [secrets, setSecrets] = useState<Record<string, boolean>>({});
  const [mpBlocked, setMpBlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mpCheck, setMpCheck] = useState<string[] | null>(null);
  const [activeSection, setActiveSection] = useState<SectionId>("identidad");

  const dirty = !!form && JSON.stringify(form) !== snapshot;
  const set: SetField = useCallback((key, value) => { setForm((f) => (f ? { ...f, [key]: value } : f)); setMpCheck(null); }, []);

  const loadSecrets = useCallback(async (tenantId: string) => {
    setSecrets({});
    try {
      const res = await fetch(`/api/tenant-secrets?tenantId=${encodeURIComponent(tenantId)}`, { headers: await authHeaders() });
      if (res.ok) setSecrets((await res.json()).configured || {});
    } catch (e) { console.error("Estado de credenciales", e); }
  }, []);

  const open = useCallback((t: Tenant) => {
    const next = formFromTenant(t);
    setSelectedId(t.id);
    setForm(next);
    setSnapshot(JSON.stringify(next));
    setMpCheck(null);
    loadSecrets(t.id);
  }, [loadSecrets]);

  useEffect(() => {
    if (!user?.uid || !role) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const g = await getDoc(doc(db, "settings", "global"));
        if (!cancelled) setMpBlocked(g.data()?.paymentGateways?.mercadoPago === false);
        const isAdmin = role === "superadmin" || role === "admin";
        const q = isAdmin ? query(collection(db, "tenants"))
          : query(collection(db, "tenants"), or(where("ownerId", "==", user.uid), where("ownerIds", "array-contains", user.uid)));
        const list = (await getDocs(q)).docs.map((d) => ({ id: d.id, ...d.data() }) as Tenant)
          .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "es"));
        if (cancelled) return;
        setTenants(list);
        if (list[0]) open(list[0]);
      } catch (e) {
        console.error("Cargar recintos", e);
        if (!cancelled) toast("No se pudieron cargar tus recintos", "error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.uid, role, open, toast]);

  // Aviso al salir con cambios sin guardar
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // Sección visible → resaltada en la barra
  useEffect(() => {
    if (!form) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) setActiveSection(e.target.id as SectionId); });
    }, { rootMargin: "-20% 0px -70% 0px" });
    SECTIONS.forEach((s) => { const el = document.getElementById(s.id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, [form === null, selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const switchTenant = async (id: string) => {
    const t = tenants.find((x) => x.id === id);
    if (!t || id === selectedId) return;
    if (dirty && !(await confirm({ title: "Cambios sin guardar", message: "Si cambias de recinto se perderán los cambios que no has guardado.", tone: "danger", confirmLabel: "Descartar y cambiar" }))) return;
    open(t);
  };

  const save = async () => {
    if (!form || !selectedId || saving) return;
    const errors = validateComplex(form);
    if (errors.length) { await alert("Revisa antes de guardar", <ul className="list-disc pl-5 space-y-1">{errors.map((e) => <li key={e}>{e}</li>)}</ul>); return; }
    setSaving(true);
    const tenantName = form.name.trim() || selectedId;
    const audit = (status: "SUCCESS" | "FAILED", details: string) => auditService.logAuditEvent({
      action: "MODIFICACION_CONFIGURACION_COMPLEJO", module: "CONFIGURACIONES", severity: "MEDIUM", status, details,
      actor: firestoreUser?.fullName || user?.displayName || user?.email || "Dueño", role: role || "owner", email: user?.email || "",
    }).catch(() => {});
    try {
      const { publicData, secrets: newSecrets } = splitForSave(form, mpBlocked);
      if (Object.keys(newSecrets).length) {
        const res = await fetch("/api/tenant-secrets", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(await authHeaders()) },
          body: JSON.stringify({ tenantId: selectedId, ...newSecrets }),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "No se pudieron guardar las credenciales");
      }
      await updateDoc(doc(db, "tenants", selectedId), publicData);
      await audit("SUCCESS", `Se actualizó la configuración del recinto ${tenantName} (ID: ${selectedId})`);
      const saved = { ...form, ...publicData, mercadopagoAccessToken: "", siiApiKey: "" };
      setForm(saved);
      setSnapshot(JSON.stringify(saved));
      setTenants((prev) => prev.map((t) => (t.id === selectedId ? { ...t, ...publicData } : t)));
      if (Object.keys(newSecrets).length) loadSecrets(selectedId);
      toast("Configuración actualizada con éxito");
    } catch (error) {
      const e = error as { code?: string; message?: string };
      await audit("FAILED", `Fallo al actualizar la configuración del recinto ${tenantName} (ID: ${selectedId})`);
      console.error("Guardar recinto", error);
      toast(e?.code === "permission-denied" ? "Tu cuenta no tiene permiso para editar este recinto"
        : `No se pudo guardar: ${String(e?.message || "error desconocido").slice(0, 140)}`, "error");
    } finally {
      setSaving(false);
    }
  };

  const mpActive = !!form?.isMercadopagoActive && !mpBlocked;
  const done = useMemo(() => (form ? sectionsDone(form, mpActive) : null), [form, mpActive]);
  const selectedName = tenants.find((t) => t.id === selectedId)?.name || "Seleccionar";

  return (
    <div className="w-full space-y-6 pb-28 text-left relative animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-6">
        <PageTitle eyebrow="Infraestructura & Control Operativo">Configuración <Accent>Complejo</Accent></PageTitle>
        {form && (
          <div className="hidden md:flex items-center gap-3">
            {dirty && (
              <span className="inline-flex items-center gap-2 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-md">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Cambios sin guardar
              </span>
            )}
            <button onClick={save} disabled={saving || !dirty} className="px-6 py-3 bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black font-black text-[10px] uppercase tracking-[0.2em] rounded-md transition-all active:scale-95 flex items-center gap-2.5 disabled:opacity-40">
              <HugeiconsIcon icon={saving ? RefreshIcon : FloppyDiskIcon} className={`w-4 h-4 ${saving ? "animate-spin" : ""}`} /> Guardar
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20 text-slate-400 text-xs uppercase font-bold tracking-widest"><HugeiconsIcon icon={RefreshIcon} className="w-5 h-5 animate-spin mr-2" /> Cargando tu recinto…</div>
      ) : !form || !done ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-[#0B0F19] rounded-md border border-dashed border-slate-300 dark:border-white/10 text-center px-6">
          <HugeiconsIcon icon={Building01Icon} className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
          <h2 className="text-lg font-black text-slate-800 dark:text-white uppercase">Sin recintos asociados</h2>
          <p className="text-xs text-slate-500 mt-2 font-bold">Cuando la plataforma te asigne un recinto, podrás configurarlo aquí.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {tenants.length > 1 ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#0B0F19] p-5 rounded-md border border-slate-200 dark:border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-[#00df82] shrink-0">
                  <HugeiconsIcon icon={Building01Icon} className="w-5 h-5" strokeWidth={1.8} />
                </div>
                <div>
                  <p className="text-[11px] md:text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-0.5">Recinto activo</p>
                  <p className="text-[11px] font-black uppercase text-slate-900 dark:text-white font-heading">{selectedName}</p>
                </div>
              </div>
              <select aria-label="Recinto a configurar" value={selectedId} onChange={(e) => switchTenant(e.target.value)} className="w-full sm:w-auto px-4 min-h-11 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md text-[11px] font-bold uppercase outline-hidden text-slate-700 dark:text-white cursor-pointer">
                {tenants.map((t) => <option key={t.id} value={t.id} className="dark:bg-[#0B0F19]">{t.name || t.id}</option>)}
              </select>
            </div>
          ) : null}

          <nav aria-label="Secciones" className="sticky top-0 z-30 bg-slate-50/90 dark:bg-mvp-dark/90 backdrop-blur-md py-2 -my-2">
            <div className="flex items-center gap-1 p-1 bg-white dark:bg-[#0B0F19] rounded-md border border-slate-200 dark:border-white/5 shadow-xs overflow-x-auto no-scrollbar">
              {SECTIONS.map((s) => {
                const active = activeSection === s.id;
                return (
                  <button key={s.id} type="button" aria-current={active ? "true" : undefined}
                    onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                    className={`flex items-center gap-2 px-4 min-h-10 rounded-md text-xs md:text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${active ? "bg-slate-900 dark:bg-[#00df82] text-white dark:text-black" : "text-slate-500 hover:text-slate-800 dark:hover:text-white"}`}>
                    <HugeiconsIcon icon={s.icon} className="w-4 h-4" strokeWidth={1.8} />
                    {s.label}
                    <span aria-label={done[s.id] ? "completa" : "pendiente"} className={`w-1.5 h-1.5 rounded-full ${done[s.id] ? "bg-emerald-500 dark:bg-black/60" : active ? "bg-white/30" : "bg-slate-300 dark:bg-white/15"}`} />
                  </button>
                );
              })}
            </div>
          </nav>

          <div className="space-y-6">
            <IdentitySection form={form} set={set} done={done.identidad} />
            <LegalSection form={form} set={set} done={done.legal} />
            <ContactSection form={form} set={set} done={done.contacto} />
            <OperationSection form={form} set={set} done={done.operacion} />
            <IntegrationsSection form={form} set={set} done={done.integraciones} mpBlocked={mpBlocked}
              tokenConfigured={!!secrets.mercadopagoAccessToken} missing={mpCheck}
              onCheck={() => setMpCheck(mercadoPagoMissing(form, !!secrets.mercadopagoAccessToken))} />
          </div>
        </div>
      )}

      {form && (
        <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] pointer-events-none md:hidden">
          <div className="pointer-events-auto rounded-md bg-white/95 dark:bg-[#0B0F19]/95 backdrop-blur-md border border-slate-200 dark:border-white/10 shadow-2xl px-4 py-3 flex items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
              <span className={`w-2 h-2 rounded-full ${dirty ? "bg-amber-500 animate-pulse" : "bg-emerald-500 dark:bg-[#00df82]"}`} />
              {dirty ? "Sin guardar" : "Al día"}
            </p>
            <button onClick={save} disabled={saving || !dirty} className="flex items-center gap-2 px-6 min-h-11 bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black font-black text-xs uppercase tracking-[0.15em] rounded-md active:scale-95 transition-all disabled:opacity-40">
              <HugeiconsIcon icon={saving ? RefreshIcon : CheckmarkCircle02Icon} className={`w-4 h-4 ${saving ? "animate-spin" : ""}`} /> Guardar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
