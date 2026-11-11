"use client";
// Secciones de "Configuración del complejo". Cada una recibe el formulario y un `set(campo, valor)`.
import type { ReactNode } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { PanelGlass } from "@/components/ui/DashboardWidgets";
import {
  Briefcase01Icon, Building01Icon, CallIcon, CheckmarkCircle02Icon, Clock01Icon, CodeIcon, CreditCardIcon, FireIcon,
  GlobeIcon, IdentityCardIcon, Key01Icon, Mail01Icon, MapPinIcon, Message02Icon, ShieldCheckIcon, UserGroupIcon, Alert02Icon,
} from "@hugeicons/core-free-icons";
import { AMENITIES, RULES, type ComplexForm, type SectionId } from "@/utils/complexForm";

type IconType = typeof Building01Icon;
export type SetField = <K extends keyof ComplexForm>(key: K, value: ComplexForm[K]) => void;
interface SectionProps { form: ComplexForm; set: SetField; done: boolean }

export const SECTIONS: { id: SectionId; label: string; icon: IconType }[] = [
  { id: "identidad", label: "Identidad", icon: Building01Icon },
  { id: "legal", label: "Legal", icon: IdentityCardIcon },
  { id: "contacto", label: "Contacto", icon: Message02Icon },
  { id: "operacion", label: "Operación", icon: Clock01Icon },
  { id: "integraciones", label: "Integraciones", icon: CreditCardIcon },
];

const labelCls = "text-xs md:text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1";
const areaCls = "w-full px-4 py-3 bg-slate-50 dark:bg-[#020611] border border-slate-200 dark:border-white/10 rounded-md text-xs font-bold outline-hidden focus:ring-1 focus:ring-emerald-500/30 resize-none transition-all text-slate-700 dark:text-white";
const timeCls = "w-full px-3 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md text-[11px] font-black outline-hidden focus:border-emerald-500 text-slate-700 dark:text-white";

const toggleIn = (list: string[], item: string) => (list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);

export function Field({ label, value, icon, onChange, type = "text", placeholder = "", autoComplete = "off" }: {
  label: string; value: string; icon: IconType; onChange: (v: string) => void; type?: string; placeholder?: string; autoComplete?: string;
}) {
  return (
    <div className="space-y-2">
      <label className={labelCls}>{label}</label>
      <div className="relative group">
        <HugeiconsIcon icon={icon} className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-emerald-500 transition-colors" />
        <input type={type} aria-label={label} placeholder={placeholder} value={value} autoComplete={autoComplete} onChange={(e) => onChange(e.target.value)}
          className="w-full pl-11 pr-4 py-3.5 rounded-md border bg-white dark:bg-[#020611] border-slate-200 dark:border-white/10 text-xs font-bold outline-hidden focus:ring-1 focus:ring-emerald-500/30 transition-all tracking-tight text-slate-700 dark:text-white" />
      </div>
    </div>
  );
}

function Toggle({ on, onChange, label, disabled = false }: { on: boolean; onChange: () => void; label: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={onChange} disabled={disabled}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-all ${disabled ? "bg-slate-100 dark:bg-white/5 opacity-40 cursor-not-allowed" : on ? "bg-emerald-500 shadow-lg shadow-emerald-500/20" : "bg-slate-200 dark:bg-white/10"}`}>
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${on ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}

function Panel({ id, icon, title, subtitle, done, doneLabel = "Completado", pendingLabel = "Pendiente", children }: {
  id: SectionId; icon: IconType; title: string; subtitle: string; done: boolean; doneLabel?: string; pendingLabel?: string; children: ReactNode;
}) {
  return (
    <PanelGlass id={id} className="overflow-hidden scroll-mt-20">
      <div className="flex items-center justify-between gap-3 px-5 lg:px-7 py-4 border-b border-slate-100 dark:border-white/5">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-10 h-10 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-[#00df82] shrink-0">
            <HugeiconsIcon icon={icon} className="w-5 h-5" strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-900 dark:text-white font-heading">{title}</h3>
            <p className="text-xs md:text-[10px] font-bold text-slate-400">{subtitle}</p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] md:text-[8px] font-black uppercase tracking-widest border shrink-0 ${done ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-[#00df82] border-emerald-100 dark:border-emerald-500/20" : "bg-slate-50 dark:bg-white/5 text-slate-400 border-slate-200 dark:border-white/10"}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${done ? "bg-emerald-500 dark:bg-[#00df82]" : "bg-slate-300 dark:bg-white/20"}`} />
          {done ? doneLabel : pendingLabel}
        </span>
      </div>
      <div className="p-5 lg:p-7">{children}</div>
    </PanelGlass>
  );
}

export function IdentitySection({ form, set, done }: SectionProps) {
  return (
    <Panel id="identidad" icon={Building01Icon} title="Identidad de Marca" subtitle="Presencia pública del recinto" done={done}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Field label="Nombre Comercial" value={form.name} onChange={(v) => set("name", v)} icon={Building01Icon} />
          <Field label="Dirección Pública" value={form.address} onChange={(v) => set("address", v)} icon={MapPinIcon} />
        </div>
        <div className="space-y-2">
          <label htmlFor="complex-description" className={labelCls}>Reseña del Club</label>
          <textarea id="complex-description" rows={5} value={form.description} onChange={(e) => set("description", e.target.value)} className={areaCls} placeholder="Qué hace especial a tu complejo…" />
        </div>
      </div>
    </Panel>
  );
}

export function LegalSection({ form, set, done }: SectionProps) {
  return (
    <Panel id="legal" icon={IdentityCardIcon} title="Marco Legal" subtitle="Facturación y datos tributarios" done={done}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Field label="Razón Social" value={form.legalName} onChange={(v) => set("legalName", v)} icon={Briefcase01Icon} />
        <Field label="RUT Corporativo" value={form.rut} onChange={(v) => set("rut", v)} icon={IdentityCardIcon} placeholder="76.123.456-7" />
        <Field label="Representante Legal" value={form.legalRepresentative} onChange={(v) => set("legalRepresentative", v)} icon={UserGroupIcon} />
        <Field label="Giro" value={form.businessType} onChange={(v) => set("businessType", v)} icon={CodeIcon} />
      </div>
    </Panel>
  );
}

export function ContactSection({ form, set, done }: SectionProps) {
  return (
    <Panel id="contacto" icon={Message02Icon} title="Canales de Comunicación" subtitle="Contacto directo y redes" done={done}>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <Field label="WhatsApp" type="tel" value={form.whatsapp} onChange={(v) => set("whatsapp", v)} icon={CallIcon} placeholder="+56 9 1234 5678" />
        <Field label="Instagram" value={form.instagram} onChange={(v) => set("instagram", v)} icon={FireIcon} placeholder="@tuclub" />
        <Field label="Web Oficial" type="url" value={form.website} onChange={(v) => set("website", v)} icon={GlobeIcon} placeholder="tuclub.cl" />
        <Field label="Email de Contacto" type="email" value={form.contactEmail} onChange={(v) => set("contactEmail", v)} icon={Mail01Icon} placeholder="contacto@tuclub.cl" />
      </div>
    </Panel>
  );
}

export function OperationSection({ form, set, done }: SectionProps) {
  return (
    <Panel id="operacion" icon={Clock01Icon} title="Operación" subtitle="Horarios, servicios y reglamento" done={done} doneLabel="Configurado">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <fieldset className="p-4 bg-white dark:bg-[#020611] rounded-md border border-slate-200 dark:border-white/10">
            <legend className="sr-only">Horario general</legend>
            <div className="flex items-center gap-3 mb-3">
              <HugeiconsIcon icon={Clock01Icon} className="w-4 h-4 text-emerald-500" />
              <span className="text-xs md:text-[10px] font-black text-slate-900 dark:text-white uppercase">Horario general</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-[11px] md:text-[8px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Apertura</span>
                <input type="time" value={form.openTime} onChange={(e) => set("openTime", e.target.value)} className={timeCls} />
              </label>
              <label className="block">
                <span className="text-[11px] md:text-[8px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Cierre</span>
                <input type="time" value={form.closeTime} onChange={(e) => set("closeTime", e.target.value)} className={timeCls} />
              </label>
            </div>
            <p className="text-[11px] font-bold text-slate-400 mt-3">El horario por día y las tarifas se ajustan en Canchas › Infraestructura.</p>
          </fieldset>
          <div className="space-y-2">
            <label htmlFor="complex-cancel" className={labelCls}>Política de Cancelación</label>
            <textarea id="complex-cancel" rows={3} value={form.cancellationPolicy} onChange={(e) => set("cancellationPolicy", e.target.value)} className={areaCls} placeholder="Ej: cancelación gratuita hasta 24 horas antes." />
          </div>
        </div>
        <fieldset>
          <legend className={`${labelCls} block mb-2`}>Servicios Disponibles</legend>
          <div className="grid grid-cols-2 gap-2.5">
            {AMENITIES.map((item) => {
              const on = form.amenities.includes(item);
              return (
                <button key={item} type="button" aria-pressed={on} onClick={() => set("amenities", toggleIn(form.amenities, item))}
                  className={`flex items-center gap-2 px-3 min-h-11 rounded-md text-xs md:text-[10px] font-bold uppercase tracking-widest border transition-all ${on ? "bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black border-emerald-500 dark:border-[#00df82]" : "bg-slate-50 dark:bg-white/5 border-transparent text-slate-500 hover:border-emerald-500/30"}`}>
                  {on && <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-3.5 h-3.5" strokeWidth={2.5} />} {item}
                </button>
              );
            })}
          </div>
        </fieldset>
        <fieldset>
          <legend className={`${labelCls} block mb-2`}>Reglamento Interno <span className="normal-case tracking-normal">({form.rules.length} de {RULES.length})</span></legend>
          <div className="grid grid-cols-1 gap-2 pr-1 max-h-72 overflow-y-auto custom-scrollbar">
            {RULES.map((rule) => {
              const on = form.rules.includes(rule);
              return (
                <button key={rule} type="button" role="checkbox" aria-checked={on} onClick={() => set("rules", toggleIn(form.rules, rule))}
                  className={`w-full flex items-center gap-3 px-3.5 min-h-10 py-2 rounded-md border text-left text-[11px] md:text-[9px] font-bold uppercase transition-all ${on ? "bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-300" : "bg-slate-50 dark:bg-white/5 border-transparent text-slate-500"}`}>
                  <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${on ? "bg-emerald-500 dark:bg-[#00df82] border-emerald-500" : "bg-white dark:bg-white/5 border-slate-200 dark:border-white/20"}`}>
                    {on && <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-3 h-3 text-white dark:text-black" strokeWidth={2.5} />}
                  </span>
                  {rule}
                </button>
              );
            })}
          </div>
        </fieldset>
      </div>
    </Panel>
  );
}

export function IntegrationsSection({ form, set, done, mpBlocked, tokenConfigured, missing, onCheck }: SectionProps & {
  mpBlocked: boolean; tokenConfigured: boolean; missing: string[] | null; onCheck: () => void;
}) {
  const active = form.isMercadopagoActive && !mpBlocked;
  return (
    <Panel id="integraciones" icon={CreditCardIcon} title="Integraciones de Pago" subtitle="Pasarelas para cobros online" done={done} doneLabel="Activo" pendingLabel="Sin configurar">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`p-5 bg-white dark:bg-[#020611] rounded-md border transition-all ${mpBlocked ? "opacity-50" : active ? "border-emerald-500/40" : "border-slate-200 dark:border-white/10"}`}>
          <div className="flex items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-md bg-sky-500/10 flex items-center justify-center text-sky-500 border border-sky-500/20 shrink-0"><HugeiconsIcon icon={CreditCardIcon} className="w-6 h-6" strokeWidth={1.6} /></div>
              <div className="min-w-0">
                <h4 className="text-[11px] font-black uppercase text-slate-900 dark:text-white tracking-widest">Mercado Pago</h4>
                <p className={`text-[11px] md:text-[9px] font-bold mt-0.5 ${mpBlocked ? "text-red-500" : "text-slate-400"}`}>
                  {mpBlocked ? "Desactivado por la plataforma" : active ? "Tus jugadores pueden pagar online" : "Cobro online apagado"}
                </p>
              </div>
            </div>
            <Toggle label="Cobro online con Mercado Pago" on={active} disabled={mpBlocked} onChange={() => set("isMercadopagoActive", !form.isMercadopagoActive)} />
          </div>
          {active && (
            <div className="space-y-4 animate-fadeIn">
              <Field label="Public Key" value={form.mercadopagoPublicKey} onChange={(v) => set("mercadopagoPublicKey", v)} icon={Key01Icon} placeholder="APP_USR-…" />
              <Field label="Access Token" type="password" autoComplete="new-password" value={form.mercadopagoAccessToken} onChange={(v) => set("mercadopagoAccessToken", v)} icon={ShieldCheckIcon}
                placeholder={tokenConfigured ? "•••••••• configurado (escribe para reemplazar)" : "APP_USR-…"} />
              <button type="button" onClick={onCheck} className="w-full min-h-11 border border-emerald-500/40 text-emerald-700 dark:text-[#00df82] text-[11px] md:text-[9px] font-black uppercase tracking-widest rounded-md hover:bg-emerald-500/10 transition-all">
                Revisar credenciales
              </button>
              {missing && (
                <p role="status" className={`flex items-start gap-2 text-xs font-bold ${missing.length ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-[#00df82]"}`}>
                  <HugeiconsIcon icon={missing.length ? Alert02Icon : CheckmarkCircle02Icon} className="w-4 h-4 shrink-0 mt-px" />
                  {missing.length ? `Falta: ${missing.join(", ")}.` : "Credenciales completas. Guarda para activar el cobro online."}
                </p>
              )}
            </div>
          )}
        </div>
        <div className="p-5 rounded-md border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/3 space-y-3">
          <div className="flex items-center gap-2.5">
            <HugeiconsIcon icon={ShieldCheckIcon} className="w-5 h-5 text-emerald-500" />
            <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-900 dark:text-white">Cómo cuidamos tus credenciales</h4>
          </div>
          <ul className="space-y-2 text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed list-disc pl-4">
            <li>El Access Token se guarda aparte del perfil público del recinto y solo lo lee el servidor al cobrar.</li>
            <li>Nunca vuelve a mostrarse en pantalla: para cambiarlo, escribe uno nuevo.</li>
            <li>Encuéntralos en Mercado Pago › Tus integraciones › Credenciales de producción.</li>
          </ul>
        </div>
      </div>
    </Panel>
  );
}
