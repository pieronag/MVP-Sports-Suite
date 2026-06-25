"use client";
import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { ExclamationTriangleIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="h-full w-full flex flex-col items-center justify-center text-center p-8 min-h-[60vh]">
      <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-6">
        <ExclamationTriangleIcon className="w-8 h-8 text-red-500" />
      </div>
      <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">
        Error en el Dashboard
      </h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 max-w-md font-medium">
        Ocurrió un error inesperado al cargar esta sección. Si el problema persiste, contacta a soporte.
      </p>
      <button
        onClick={reset}
        className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white font-black rounded-xl uppercase text-xs tracking-widest hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
      >
        <ArrowPathIcon className="w-4 h-4" />
        Reintentar
      </button>
    </div>
  );
}
