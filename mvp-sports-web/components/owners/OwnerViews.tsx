"use client";
// Cartera de dueños: tarjetas, tabla y hojas de contraseña y credenciales.
import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Alert02Icon, Building01Icon, CallIcon, CheckmarkCircle02Icon, Copy01Icon, IdentityCardIcon, Key01Icon, Mail01Icon, MoneyBag01Icon, PencilEdit02Icon, UserCircleIcon,
} from "@hugeicons/core-free-icons";
import ModalPortal from "@/components/ui/ModalPortal";
import { hideBrokenImg } from "@/utils/img";
import { PASSWORD_MIN, passwordIssue } from "@/utils/password";
import type { OwnerRow } from "@/utils/ownerDirectory";

/* eslint-disable @next/next/no-img-element */
type IconType = typeof Mail01Icon;
const Icon = ({ icon, className, w = 1.8 }: { icon: IconType; className?: string; w?: number }) => <HugeiconsIcon icon={icon} className={className} strokeWidth={w} />;
export const formatCLP = (n: number) => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", minimumFractionDigits: 0 }).format(n || 0);
const TIER: Record<OwnerRow["tier"], string> = {
  "VIP PLATINO": "bg-slate-900 text-white dark:bg-white dark:text-slate-900", ORO: "bg-amber-400 text-amber-950", "ESTÁNDAR": "bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-300",
};

function Avatar({ o, cls }: { o: OwnerRow; cls: string }) {
  return o.photoURL
    ? <img src={o.photoURL} referrerPolicy="no-referrer" onError={hideBrokenImg} alt="" className={`${cls} object-cover`} />
    : <span className={`${cls} bg-linear-to-br from-emerald-500 to-emerald-800 text-white flex items-center justify-center font-black uppercase`}>{o.name.charAt(0)}</span>;
}

function Status({ o }: { o: OwnerRow }) {
  const on = o.status === "Activo";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border w-fit ${on ? "bg-emerald-500/10 text-emerald-700 dark:text-[#00df82] border-emerald-500/25" : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/25"}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${on ? "bg-emerald-500" : "bg-red-500"}`} />{o.status}
    </span>
  );
}

function Debt({ o }: { o: OwnerRow }) {
  return o.debt > 0
    ? <span className={`inline-flex items-center gap-1 text-[11px] font-black ${o.overdue ? "text-red-600 dark:text-red-400" : "text-amber-700 dark:text-amber-400"}`}><Icon icon={Alert02Icon} className="w-3.5 h-3.5" w={2} />{o.overdue ? "Vencida" : "Pendiente"} {formatCLP(o.debt)}</span>
    : <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-600 dark:text-[#00df82]"><Icon icon={CheckmarkCircle02Icon} className="w-3.5 h-3.5" w={2} />Al día</span>;
}

export function OwnerCards({ rows, onOpen, onEdit }: { rows: OwnerRow[]; onOpen: (o: OwnerRow) => void; onEdit: (o: OwnerRow) => void }) {
  const line = (icon: IconType, v: string, mono = false) => (
    <p className="flex items-center gap-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300 min-w-0">
      <Icon icon={icon} className="w-3.5 h-3.5 text-emerald-500 shrink-0" /><span className={`truncate ${mono ? "tabular-nums" : ""}`}>{v || "—"}</span>
    </p>
  );
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
      {rows.map((o) => (
        <div key={o.id} data-owner={o.id} className={`flex flex-col overflow-hidden rounded-md border bg-white dark:bg-slate-900/50 ${o.status === "Activo" ? "border-slate-200 dark:border-white/5" : "border-red-200 dark:border-red-500/20"}`}>
          <div className="flex gap-4 p-4">
            <Avatar o={o} cls="w-16 h-16 rounded-md text-2xl shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-black text-slate-900 dark:text-white text-[15px] uppercase leading-tight truncate font-heading">{o.name}</h3>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider shrink-0 ${TIER[o.tier]}`}>{o.tier}</span>
              </div>
              <p className="text-[11px] text-slate-500 font-bold uppercase flex items-center gap-1 mt-1 truncate"><Icon icon={Building01Icon} className="w-3 h-3 shrink-0" w={2} />{o.company || "Particular"}</p>
              <div className="mt-2"><Status o={o} /></div>
            </div>
          </div>
          <div className="px-4 pb-3 space-y-1.5">{line(IdentityCardIcon, o.rut, true)}{line(Mail01Icon, o.email)}{line(CallIcon, o.phone, true)}</div>
          <div className="px-4 pb-3 grid grid-cols-2 gap-1.5">
            <div className="px-2 py-2 bg-slate-50 dark:bg-white/5 rounded-md text-center">
              <span className="block text-sm font-black text-slate-900 dark:text-white tabular-nums">{o.venues.length}</span>
              <span className="block text-[10px] font-bold text-slate-500 uppercase mt-0.5">{o.venues.length === 1 ? "Recinto" : "Recintos"}</span>
            </div>
            <div className="px-2 py-2 bg-slate-50 dark:bg-white/5 rounded-md text-center">
              <span className="block text-sm font-black text-slate-900 dark:text-white tabular-nums truncate">{formatCLP(o.totalMrr)}</span>
              <span className="block text-[10px] font-bold text-slate-500 uppercase mt-0.5">Plan mensual</span>
            </div>
          </div>
          <div className="px-4 py-2.5 border-t border-slate-100 dark:border-white/5 flex items-center gap-2"><Icon icon={MoneyBag01Icon} className="w-3.5 h-3.5 text-slate-400" /><Debt o={o} /></div>
          <div className="grid grid-cols-2 border-t border-slate-100 dark:border-white/5 divide-x divide-slate-100 dark:divide-white/5 mt-auto">
            <button onClick={() => onOpen(o)} aria-label={`Ver perfil de ${o.name}`} className="h-11 flex items-center justify-center gap-1.5 bg-[#00df82] text-slate-950"><Icon icon={UserCircleIcon} className="w-4 h-4" w={2} /><span className="text-[10px] font-black uppercase tracking-wider">Perfil</span></button>
            <button onClick={() => onEdit(o)} aria-label={`Editar a ${o.name}`} className="h-11 flex items-center justify-center gap-1.5 text-slate-600 dark:text-slate-300 hover:text-emerald-600"><Icon icon={PencilEdit02Icon} className="w-4 h-4" w={2} /><span className="text-[10px] font-black uppercase tracking-wider">Editar</span></button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function OwnerTable({ rows, onOpen }: { rows: OwnerRow[]; onOpen: (o: OwnerRow) => void }) {
  const th = "py-4 px-5 text-[10px] font-black text-slate-500 uppercase tracking-wider";
  return (
    <div className="overflow-hidden rounded-md border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/50">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-[860px]">
          <thead><tr className="border-b border-slate-100 dark:border-white/5 bg-slate-50/60 dark:bg-white/2">
            <th className={th}>Dueño</th><th className={th}>Nivel</th><th className={`${th} text-center`}>Recintos</th><th className={`${th} text-right`}>Plan mensual</th><th className={th}>Estado</th><th className={th}>Cobranza</th><th className={th}><span className="sr-only">Acciones</span></th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {rows.map((o) => (
              <tr key={o.id} data-owner={o.id} className="hover:bg-slate-50/60 dark:hover:bg-white/2">
                <td className="py-4 px-5">
                  <div className="flex items-center gap-3">
                    <Avatar o={o} cls="w-10 h-10 rounded-md text-sm shrink-0" />
                    <div className="min-w-0">
                      <span className="font-black text-[13px] text-slate-900 dark:text-white uppercase truncate block font-heading">{o.name}</span>
                      <span className="text-[11px] text-slate-500 truncate block">{o.email || o.company || "—"}</span>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-5"><span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${TIER[o.tier]}`}>{o.tier}</span></td>
                <td className="py-4 px-5 text-center text-[12px] font-black text-slate-900 dark:text-white tabular-nums" title={o.venues.map((v) => v.name).join(", ")}>{o.venues.length}</td>
                <td className="py-4 px-5 text-right text-[12px] font-black text-slate-900 dark:text-white tabular-nums">{formatCLP(o.totalMrr)}</td>
                <td className="py-4 px-5"><Status o={o} /></td>
                <td className="py-4 px-5"><Debt o={o} /></td>
                <td className="py-4 px-5 text-right">
                  <button onClick={() => onOpen(o)} aria-label={`Ver perfil de ${o.name}`} className="inline-flex items-center gap-1.5 px-3 h-9 rounded-md text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:text-emerald-600 active:scale-95">
                    <Icon icon={UserCircleIcon} className="w-3.5 h-3.5" />Perfil
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Shell({ children, onClose, label }: { children: React.ReactNode; onClose?: () => void; label: string }) {
  return (
    <ModalPortal>
      <div className="fixed inset-0 z-500 flex items-center justify-center p-4 bg-slate-900/80 dark:bg-black/85 backdrop-blur-xl" role="presentation" onClick={onClose}
        onKeyDown={(e) => { if (e.key === "Escape") onClose?.(); }}>
        <div role="dialog" aria-modal="true" aria-label={label} onClick={(e) => e.stopPropagation()} className="relative w-full max-w-sm rounded-md border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B0F19] shadow-2xl p-6">
          {children}
        </div>
      </div>
    </ModalPortal>
  );
}

export function PasswordSheet({ owner, busy, onSubmit, onClose }: { owner: OwnerRow; busy: boolean; onSubmit: (pass: string) => void; onClose: () => void }) {
  const [pass, setPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const issue = pass || confirm ? passwordIssue(pass, confirm) : null;
  return (
    <Shell label="Nueva contraseña" onClose={busy ? undefined : onClose}>
      <form onSubmit={(e) => { e.preventDefault(); if (!passwordIssue(pass, confirm)) onSubmit(pass); }} className="space-y-4">
        <div className="text-center">
          <div className="w-14 h-14 rounded-md bg-amber-500/10 flex items-center justify-center mx-auto mb-3 text-amber-600 dark:text-amber-400"><Icon icon={Key01Icon} className="w-7 h-7" /></div>
          <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white font-heading">Nueva contraseña</h3>
          <p className="text-[12px] text-slate-500 mt-1">Para <strong>{owner.name}</strong>. Se la tendrás que entregar por un canal seguro.</p>
        </div>
        {[["Contraseña", pass, setPass, "owner-pass"], ["Repítela", confirm, setConfirm, "owner-pass2"]].map(([label, val, set, id]) => (
          <label key={id as string} className="block space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">{label as string}</span>
            <input id={id as string} type="password" autoComplete="new-password" value={val as string} onChange={(e) => (set as (v: string) => void)(e.target.value)} placeholder={`Mínimo ${PASSWORD_MIN} caracteres`}
              className="w-full px-3.5 h-11 rounded-md border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-slate-900 dark:text-white outline-hidden focus:border-amber-500" />
          </label>
        ))}
        {issue && <p role="alert" className="text-[12px] font-semibold text-red-500">{issue}</p>}
        <div className="flex gap-3">
          <button type="button" onClick={onClose} disabled={busy} className="flex-1 h-11 text-[11px] font-black uppercase tracking-[0.15em] rounded-md bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300">Cancelar</button>
          <button type="submit" disabled={busy || !!passwordIssue(pass, confirm)} className="flex-1 h-11 text-[11px] font-black uppercase tracking-[0.15em] rounded-md text-white bg-amber-600 disabled:opacity-50">{busy ? "Guardando…" : "Cambiar"}</button>
        </div>
      </form>
    </Shell>
  );
}

export function CredentialsSheet({ email, pass, onCopy, onClose }: { email: string; pass: string; onCopy: () => void; onClose: () => void }) {
  return (
    <Shell label="Dueño registrado">
      <div className="text-center">
        <div className="w-16 h-16 rounded-md bg-emerald-500/10 flex items-center justify-center mx-auto mb-4 text-emerald-600 dark:text-[#00df82]"><Icon icon={CheckmarkCircle02Icon} className="w-8 h-8" /></div>
        <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white font-heading">Dueño registrado</h3>
        <p className="text-[12px] text-slate-500 mt-1 mb-5">Entrégale estos datos por un canal seguro. La contraseña no se vuelve a mostrar.</p>
      </div>
      <div className="rounded-md border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/2 p-4 space-y-3 mb-5">
        <div><p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Email</p><p className="text-sm font-bold text-slate-900 dark:text-white break-all">{email}</p></div>
        <div className="pt-3 border-t border-slate-200 dark:border-white/5">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Contraseña inicial</p>
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-base font-black text-emerald-600 dark:text-[#00df82] break-all select-all">{pass}</p>
            <button onClick={onCopy} aria-label="Copiar contraseña" className="w-10 h-10 flex items-center justify-center bg-emerald-500/10 text-emerald-600 dark:text-[#00df82] rounded-md shrink-0"><Icon icon={Copy01Icon} className="w-5 h-5" /></button>
          </div>
        </div>
      </div>
      <button onClick={onClose} className="w-full h-12 bg-[#00df82] text-slate-950 rounded-md text-[11px] font-black uppercase tracking-[0.2em]">Listo</button>
    </Shell>
  );
}
