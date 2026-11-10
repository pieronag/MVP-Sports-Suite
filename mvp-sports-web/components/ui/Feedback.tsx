"use client";
// Avisos y confirmaciones del panel, en un solo lugar.
//   const { toast, confirm, alert } = useFeedback();
//   toast("Cancha actualizada");                       → aviso breve (éxito por defecto)
//   toast("No se pudo guardar", "error");
//   if (await confirm({ title: "Eliminar", message: "…", tone: "danger" })) { … }
//   await alert("Sin datos", "No hay reservas pagadas en este periodo.");
// Reemplaza las copias locales de showToast/addToast/showConfirm que tenía cada pantalla.
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle02Icon, Alert02Icon, InformationCircleIcon, Cancel01Icon } from "@hugeicons/core-free-icons";
import ConfirmDialog, { type ConfirmTone } from "./ConfirmDialog";

export type ToastType = "success" | "error" | "info";
interface ConfirmOptions { title: string; message: ReactNode; tone?: ConfirmTone; confirmLabel?: string; cancelLabel?: string }
interface FeedbackApi {
  toast: (message: string, type?: ToastType) => void;
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
  alert: (title: string, message: ReactNode) => Promise<void>;
}

const FeedbackContext = createContext<FeedbackApi | null>(null);

const TOAST_STYLE: Record<ToastType, { icon: typeof CheckmarkCircle02Icon; cls: string }> = {
  success: { icon: CheckmarkCircle02Icon, cls: "bg-emerald-50 dark:bg-[#00df82]/10 border-emerald-200 dark:border-[#00df82]/30 text-emerald-800 dark:text-[#00df82]" },
  error: { icon: Alert02Icon, cls: "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-300" },
  info: { icon: InformationCircleIcon, cls: "bg-white dark:bg-[#0A101D] border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200" },
};

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<{ id: number; message: string; type: ToastType }[]>([]);
  const [dialog, setDialog] = useState<(ConfirmOptions & { alertOnly?: boolean }) | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);
  const seq = useRef(0);

  const toast = useCallback((message: string, type: ToastType = "success") => {
    const id = ++seq.current;
    setToasts((t) => [...t.slice(-2), { id, message, type }]); // como máximo 3 a la vez
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), type === "error" ? 6000 : 3500);
  }, []);

  const open = useCallback((opts: ConfirmOptions & { alertOnly?: boolean }) => new Promise<boolean>((resolve) => {
    resolver.current?.(false); // un diálogo nuevo cancela el anterior
    resolver.current = resolve;
    setDialog(opts);
  }), []);
  const confirm = useCallback((opts: ConfirmOptions) => open(opts), [open]);
  const alert = useCallback(async (title: string, message: ReactNode) => { await open({ title, message, alertOnly: true }); }, [open]);
  const close = (ok: boolean) => { resolver.current?.(ok); resolver.current = null; setDialog(null); };

  return (
    <FeedbackContext.Provider value={{ toast, confirm, alert }}>
      {children}
      <div aria-live="polite" className="fixed z-[500] top-4 right-4 left-4 sm:left-auto flex flex-col gap-2 items-stretch sm:items-end pointer-events-none">
        {toasts.map((t) => {
          const s = TOAST_STYLE[t.type];
          return (
            <div key={t.id} role={t.type === "error" ? "alert" : "status"}
              className={`pointer-events-auto flex items-start gap-3 sm:max-w-sm px-4 py-3 rounded-md border shadow-lg backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200 ${s.cls}`}>
              <HugeiconsIcon icon={s.icon} className="w-5 h-5 shrink-0 mt-px" strokeWidth={1.8} />
              <span className="text-[13px] font-semibold leading-snug flex-1">{t.message}</span>
              <button aria-label="Cerrar aviso" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} className="opacity-60 hover:opacity-100">
                <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" strokeWidth={1.8} />
              </button>
            </div>
          );
        })}
      </div>
      <ConfirmDialog
        open={!!dialog}
        title={dialog?.title || ""}
        message={dialog?.message || ""}
        tone={dialog?.tone || "default"}
        confirmLabel={dialog?.alertOnly ? "Entendido" : dialog?.confirmLabel}
        cancelLabel={dialog?.cancelLabel}
        hideCancel={!!dialog?.alertOnly}
        onConfirm={() => close(true)}
        onCancel={() => close(false)}
      />
    </FeedbackContext.Provider>
  );
}

export function useFeedback(): FeedbackApi {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error("useFeedback debe usarse dentro de <FeedbackProvider>");
  return ctx;
}
