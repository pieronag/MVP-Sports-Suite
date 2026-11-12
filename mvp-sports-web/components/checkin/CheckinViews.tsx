"use client";
// Piezas de la pantalla de check-in: visor de cámara, fila de reserva y confirmación de ingreso.
import { useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Cancel01Icon, CheckmarkCircle02Icon, Location01Icon, RefreshIcon, SecurityCheckIcon, Ticket01Icon, UnavailableIcon, VideoOffIcon,
} from "@hugeicons/core-free-icons";
import { checkinOpensAt, type CheckinBooking, type CheckinState } from "@/utils/checkinDay";

type IconType = typeof Cancel01Icon;
const Icon = ({ icon, className }: { icon: IconType; className?: string }) => <HugeiconsIcon icon={icon} className={className} strokeWidth={1.6} />;
export const formatCLP = (n: number) => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", minimumFractionDigits: 0 }).format(n || 0);

export function CameraOverlay({ error, onRetry, onClose }: { error: string | null; onRetry: () => void; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div role="dialog" aria-modal="true" aria-label="Escáner de QR" className="fixed inset-0 z-200 bg-black flex flex-col animate-fadeIn">
      <div className="absolute top-0 left-0 right-0 p-4 pt-[calc(1rem+env(safe-area-inset-top,0px))] flex justify-between items-center z-20 bg-linear-to-b from-black/80 to-transparent">
        <span className="text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" /> Apunta al QR del ticket
        </span>
        <button aria-label="Cerrar escáner" onClick={onClose} className="w-11 h-11 flex items-center justify-center bg-white/20 rounded-full text-white backdrop-blur-md active:scale-95">
          <Icon icon={Cancel01Icon} className="w-6 h-6" />
        </button>
      </div>
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {!error ? (
          <div className="relative w-[70vh] h-[70vh] max-w-[90vw] max-h-[90vw] md:max-w-[400px] md:max-h-[400px] rounded-md overflow-hidden border-2 border-emerald-500/40">
            <div id="qr-reader" className="w-full h-full [&>video]:object-contain [&>video]:-scale-x-100" />
            <div className="absolute inset-0 pointer-events-none z-10">
              <div className="absolute border-[3px] border-transparent border-t-emerald-400 border-l-emerald-400 w-10 h-10 top-0 left-0 rounded-md" />
              <div className="absolute border-[3px] border-transparent border-t-emerald-400 border-r-emerald-400 w-10 h-10 top-0 right-0 rounded-md" />
              <div className="absolute border-[3px] border-transparent border-b-emerald-400 border-l-emerald-400 w-10 h-10 bottom-0 left-0 rounded-md" />
              <div className="absolute border-[3px] border-transparent border-b-emerald-400 border-r-emerald-400 w-10 h-10 bottom-0 right-0 rounded-md" />
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-emerald-400 animate-scan-vertical opacity-80" />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center text-white/70 gap-4 px-8 text-center max-w-sm" role="alert">
            <div className="p-4 bg-red-500/20 rounded-full"><Icon icon={VideoOffIcon} className="w-10 h-10 text-red-500" /></div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-white">No pudimos usar la cámara</p>
              <p className="text-xs text-white/60 leading-relaxed">{error}</p>
            </div>
            <div className="flex flex-col gap-2 w-full max-w-[220px]">
              <button onClick={onRetry} className="w-full h-11 bg-white text-black rounded-md text-xs font-black uppercase tracking-wide">Reintentar</button>
              <button onClick={onClose} className="w-full h-11 bg-white/10 text-white rounded-md text-xs font-bold uppercase tracking-wide">Escribir el código</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const STATE_BADGE: Record<CheckinState, { label: string; cls: string }> = {
  ready: { label: "Puede ingresar", cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  early: { label: "Pagada", cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  unpaid: { label: "Sin pago online", cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  in: { label: "Ingresó", cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  late: { label: "No llegó", cls: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" },
  noshow: { label: "Inasistencia", cls: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" },
  cancelled: { label: "Anulada", cls: "bg-slate-500/10 text-slate-500 border-slate-500/20" },
};

export function BookingRow({ b, state, busy, canNoShow, onCheckIn, onNoShow }: {
  b: CheckinBooking; state: CheckinState; busy: boolean; canNoShow: boolean; onCheckIn: () => void; onNoShow: () => void;
}) {
  const badge = STATE_BADGE[state];
  const dim = state === "in" || state === "cancelled" || state === "noshow";
  const sub = state === "cancelled" ? (b.cancelledBy === "staff" ? "Anulada por el recinto" : "Cancelada por el jugador")
    : state === "noshow" ? (b.paymentStatus === "paid" || b.paymentStatus === "no-show" ? "Pago retenido · strike aplicado" : "Strike aplicado")
      : state === "early" ? `Ingreso desde las ${checkinOpensAt(b.startTimeStr)}` : null;
  return (
    <li data-booking={b.id} className={`flex flex-wrap sm:flex-nowrap items-center gap-3 sm:gap-4 p-3.5 transition-colors hover:bg-slate-50/50 dark:hover:bg-white/1 ${dim ? "opacity-60" : ""}`}>
      <div className="flex flex-col items-center justify-center w-12 h-12 rounded-md bg-slate-900 dark:bg-white text-white dark:text-slate-900 shrink-0">
        <span className="text-[12px] font-black tracking-tighter tabular-nums">{b.startTimeStr}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 min-w-0">
          <h3 className="text-[12px] font-black text-slate-900 dark:text-white uppercase truncate">{b.clientName}</h3>
          <span className={`px-1.5 py-0.5 text-[10px] font-black uppercase rounded border shrink-0 ${badge.cls}`}>{badge.label}</span>
        </div>
        <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 text-[11px] font-bold min-w-0">
          <span className="flex items-center gap-1 min-w-0"><Icon icon={Location01Icon} className="w-3 h-3 text-emerald-500 shrink-0" /><span className="truncate uppercase">{b.courtName}{b.sport ? ` · ${b.sport}` : ""}</span></span>
          <span className="flex items-center gap-1 font-mono uppercase shrink-0"><Icon icon={Ticket01Icon} className="w-3 h-3" />#{b.id.slice(-6)}</span>
        </div>
        {sub && <p className="text-[11px] font-semibold text-slate-400 mt-0.5">{sub}</p>}
      </div>
      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
        {state === "in" && (
          <span className="flex items-center gap-1.5 px-3 h-9 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
            <Icon icon={SecurityCheckIcon} className="w-3.5 h-3.5" /> Acceso OK
          </span>
        )}
        {(state === "ready" || state === "early") && (
          <button onClick={onCheckIn} disabled={busy || state === "early"} title={state === "early" ? `El ingreso se habilita a las ${checkinOpensAt(b.startTimeStr)}` : undefined}
            className="h-11 sm:h-9 px-4 flex-1 sm:flex-none rounded-md text-[11px] font-black uppercase tracking-widest bg-slate-900 text-white dark:bg-white dark:text-slate-900 active:scale-95 transition-all disabled:opacity-40">
            Ingresar
          </button>
        )}
        {canNoShow && state !== "noshow" && (
          <button onClick={onNoShow} disabled={busy} aria-label={`Registrar inasistencia de ${b.clientName}`}
            className={`h-11 sm:h-9 px-3 flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-md text-[11px] font-black uppercase tracking-widest border transition-all active:scale-95 disabled:opacity-50 ${state === "late" ? "bg-red-500 text-white border-red-500" : "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"}`}>
            {busy ? <Icon icon={RefreshIcon} className="w-4 h-4 animate-spin" /> : <Icon icon={UnavailableIcon} className="w-4 h-4" />}
            {state === "late" ? "Registrar inasistencia" : "No llegó"}
          </button>
        )}
      </div>
    </li>
  );
}

export function ConfirmCheckin({ b, busy, onConfirm, onClose }: { b: CheckinBooking; busy: boolean; onConfirm: () => void; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);
  const end = b.endTimeStr || new Date(b.start.getTime() + 3_600_000).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Santiago" });
  const rows: [string, string][] = [["Jugador", b.clientName], ["Cancha", `${b.courtName}${b.sport ? ` · ${b.sport}` : ""}`], ["Horario", `${b.startTimeStr} – ${end}`], ["Pago", `${formatCLP(b.price)} online`]];
  return (
    <div className="fixed inset-0 z-300 flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn" onClick={() => !busy && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="checkin-confirm-title" onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-[#0B0F19] w-full sm:max-w-sm rounded-t-xl sm:rounded-md overflow-hidden shadow-2xl border border-slate-200 dark:border-white/10 pb-[env(safe-area-inset-bottom,0px)]">
        <div className="p-6 pb-3 text-center">
          <div className="w-14 h-14 rounded-md flex items-center justify-center mb-4 mx-auto border bg-emerald-500/10 border-emerald-500/20">
            <Icon icon={SecurityCheckIcon} className="w-7 h-7 text-emerald-500" />
          </div>
          <h2 id="checkin-confirm-title" className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Autorizar <span className="text-emerald-500">ingreso</span></h2>
          <p className="text-xs text-slate-400 font-bold mt-1">Verifica que sea la persona de la reserva</p>
        </div>
        <dl className="mx-6 bg-slate-50 dark:bg-white/5 rounded-md p-4 space-y-2.5 border border-slate-100 dark:border-white/5">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between items-center gap-3 text-[12px]">
              <dt className="font-black text-slate-400 uppercase tracking-widest text-[10px]">{k}</dt>
              <dd className="font-black text-slate-900 dark:text-white text-right truncate">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="p-6 flex gap-2">
          <button onClick={onClose} disabled={busy} className="flex-1 h-12 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/70 rounded-md text-[11px] font-black uppercase tracking-widest active:scale-95">Cancelar</button>
          <button autoFocus onClick={onConfirm} disabled={busy}
            className="flex-2 h-12 rounded-md text-[11px] font-black uppercase tracking-widest active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-950">
            {busy ? <Icon icon={RefreshIcon} className="w-4 h-4 animate-spin" /> : <>Confirmar entrada <Icon icon={CheckmarkCircle02Icon} className="w-4 h-4" /></>}
          </button>
        </div>
      </div>
    </div>
  );
}
