"use client";
// Piezas compartidas de Partidos: hoja modal (Escape y clic afuera la cierran), confirmación, aviso y selector de zona.
import { useEffect, type ReactNode } from "react";
import { CheckCircle2, X } from "@/components/player/icons";
import { REGIONS } from "@/utils/chileRegions";

export function Spinner({ light = false }: { light?: boolean }) {
  return <div className={`w-4 h-4 border-2 ${light ? "border-white" : "border-emerald-500"} border-t-transparent rounded-full animate-spin`} />;
}

export const fieldCls = (isDark: boolean) =>
  `w-full h-11 rounded-md px-4 text-[13px] font-semibold outline-hidden border focus:border-emerald-500 ${isDark ? "bg-[#0A101D] text-slate-200 border-white/6 placeholder-slate-500" : "bg-white text-slate-900 border-slate-200 placeholder-slate-400"}`;
export const labelCls = (isDark: boolean) => `text-[12px] font-semibold mb-1.5 block ${isDark ? "text-slate-400" : "text-slate-500"}`;
export const chipCls = (on: boolean, isDark: boolean) =>
  `px-3 min-h-9 rounded-md text-[11px] font-semibold transition-all active:scale-95 ${on ? "bg-emerald-500 text-white" : isDark ? "bg-white/6 text-slate-300 hover:bg-white/10" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`;

export function Sheet({ isDark, title, onClose, children, bare = false }: {
  isDark: boolean; title: string; onClose: () => void; children: ReactNode; bare?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-[2px] sm:px-5 sm:py-6 animate-in fade-in duration-200" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title}
        className={`w-full sm:max-w-sm max-h-[92dvh] overflow-y-auto rounded-t-xl sm:rounded-md border pb-[env(safe-area-inset-bottom,0px)] ${bare ? "" : "p-6"} ${isDark ? "bg-[#0A101D] border-white/6" : "bg-white border-slate-200"}`}
        onClick={(e) => e.stopPropagation()}>
        {!bare && (
          <div className="flex items-center justify-between gap-3 mb-5">
            <p className={`font-semibold text-[15px] ${isDark ? "text-slate-100" : "text-slate-900"}`}>{title}</p>
            <button aria-label="Cerrar" onClick={onClose} className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${isDark ? "bg-white/6" : "bg-slate-100"}`}><X size={14} /></button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

export function ConfirmSheet({ isDark, tone, icon, title, message, confirmLabel, cancelLabel = "Cancelar", busy, onConfirm, onClose }: {
  isDark: boolean; tone: "ok" | "danger"; icon: ReactNode; title: string; message: ReactNode;
  confirmLabel: string; cancelLabel?: string; busy: boolean; onConfirm: () => void; onClose: () => void;
}) {
  return (
    <Sheet isDark={isDark} title={title} onClose={onClose} bare>
      <div className="p-6 text-center">
        <div className={`w-16 h-16 rounded-md flex items-center justify-center mx-auto mb-4 ${tone === "ok" ? "bg-emerald-500/10" : "bg-red-500/10"}`}>{icon}</div>
        <p className={`font-semibold text-[15px] mb-2 ${isDark ? "text-slate-100" : "text-slate-900"}`}>{title}</p>
        <div className={`text-[12px] font-medium mb-6 wrap-break-word ${isDark ? "text-slate-400" : "text-slate-500"}`}>{message}</div>
        <div className="flex gap-3">
          <button onClick={onClose} className={`flex-1 h-12 rounded-md font-semibold text-[13px] ${isDark ? "bg-white/6 text-slate-300" : "bg-slate-100 text-slate-700"}`}>{cancelLabel}</button>
          <button onClick={onConfirm} disabled={busy}
            className={`flex-1 h-12 rounded-md font-semibold text-[13px] text-white disabled:opacity-50 flex items-center justify-center ${tone === "ok" ? "bg-emerald-500" : "bg-red-500"}`}>
            {busy ? <Spinner light /> : confirmLabel}
          </button>
        </div>
      </div>
    </Sheet>
  );
}

export function ResultSheet({ isDark, type, msg, onClose }: { isDark: boolean; type: "success" | "error"; msg: string; onClose: () => void }) {
  return (
    <Sheet isDark={isDark} title={type === "success" ? "Listo" : "No se pudo"} onClose={onClose} bare>
      <div className="p-6 text-center" role={type === "error" ? "alert" : "status"}>
        <div className={`w-14 h-14 rounded-md flex items-center justify-center mx-auto mb-4 ${type === "success" ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
          {type === "success" ? <CheckCircle2 size={28} className="text-emerald-500" /> : <X size={28} className="text-red-500" />}
        </div>
        <p className={`text-[13px] font-semibold mb-4 ${isDark ? "text-slate-100" : "text-slate-900"}`}>{msg}</p>
        <button autoFocus onClick={onClose} className={`w-full h-12 rounded-md font-semibold text-[13px] text-white ${type === "success" ? "bg-emerald-500" : "bg-red-500"}`}>Entendido</button>
      </div>
    </Sheet>
  );
}

/** Región + comunas donde se juega (las comunas se reinician al cambiar de región). */
export function ZonePicker({ isDark, region, communes, onChange, communesLabel = "Comunas donde juegan" }: {
  isDark: boolean; region: string; communes: string[]; onChange: (region: string, communes: string[]) => void; communesLabel?: string;
}) {
  return (
    <>
      <label className="block mb-4">
        <span className={labelCls(isDark)}>Región</span>
        <select value={region} onChange={(e) => onChange(e.target.value, [])} className={fieldCls(isDark)}>
          <option value="">Seleccionar región</option>
          {Object.keys(REGIONS).map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </label>
      {region && (
        <fieldset className="mb-4">
          <legend className={labelCls(isDark)}>{communesLabel}{communes.length > 0 && <span className="text-emerald-500"> · {communes.length}</span>}</legend>
          <div className="flex flex-wrap gap-1.5 max-h-[160px] overflow-y-auto">
            {(REGIONS[region] || []).map((c) => {
              const on = communes.includes(c);
              return <button key={c} type="button" aria-pressed={on} onClick={() => onChange(region, on ? communes.filter((x) => x !== c) : [...communes, c])} className={chipCls(on, isDark)}>{c}</button>;
            })}
          </div>
        </fieldset>
      )}
    </>
  );
}
