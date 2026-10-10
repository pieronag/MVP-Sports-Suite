"use client";
import React, { useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert02Icon, InformationCircleIcon, Delete01Icon } from "@hugeicons/core-free-icons";
import ModalPortal from "./ModalPortal";

export type ConfirmTone = "danger" | "warning" | "default";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const TONES: Record<ConfirmTone, { icon: any; ring: string; iconColor: string; button: string }> = {
  danger: {
    icon: Delete01Icon,
    ring: "bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20",
    iconColor: "text-red-600 dark:text-red-400",
    button: "bg-red-600 hover:bg-red-700 text-white shadow-red-600/20",
  },
  warning: {
    icon: Alert02Icon,
    ring: "bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20",
    iconColor: "text-amber-600 dark:text-amber-400",
    button: "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20",
  },
  default: {
    icon: InformationCircleIcon,
    ring: "bg-emerald-50 dark:bg-[#00df82]/10 border-emerald-100 dark:border-[#00df82]/20",
    iconColor: "text-emerald-600 dark:text-[#00df82]",
    button: "bg-[#00df82] hover:bg-[#3affa0] text-slate-950 shadow-emerald-500/20",
  },
};

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  tone = "default",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, loading, onCancel]);

  if (!open) return null;
  const t = TONES[tone];

  return (
    <ModalPortal>
    <div
      className="fixed inset-0 z-600 flex items-center justify-center p-4 bg-slate-900/80 dark:bg-black/80 backdrop-blur-xl animate-in fade-in duration-200"
      role="presentation"
      onClick={() => !loading && onCancel()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-md border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B0F19] shadow-2xl p-6 text-center animate-in zoom-in-95 duration-200"
      >
        <div className={`w-16 h-16 rounded-md border flex items-center justify-center mx-auto mb-4 ${t.ring}`}>
          <HugeiconsIcon icon={t.icon} className={`w-7 h-7 ${t.iconColor}`} strokeWidth={1.8} />
        </div>
        <h3 id="confirm-title" className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white font-heading">
          {title}
        </h3>
        <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed mt-2 mb-6">
          {message}
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-3 text-[11px] font-black uppercase tracking-[0.15em] rounded-md bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-all disabled:opacity-50 cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 py-3 text-[11px] font-black uppercase tracking-[0.15em] rounded-md shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer ${t.button}`}
          >
            {loading ? "Procesando..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}
