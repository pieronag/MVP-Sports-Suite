"use client";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

export default function LoginError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-6">
          <ExclamationTriangleIcon className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-black text-white uppercase tracking-tight mb-2">
          Error de Autenticación
        </h2>
        <p className="text-sm text-slate-400 mb-8 font-medium">
          Ocurrió un error al cargar la página de inicio de sesión.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 bg-emerald-500 text-slate-950 font-black rounded-xl uppercase text-xs tracking-widest hover:bg-emerald-400 transition-all"
          >
            Reintentar
          </button>
          <Link
            href="/"
            className="px-6 py-3 border border-slate-700 text-slate-300 font-black rounded-xl uppercase text-xs tracking-widest hover:bg-slate-800 transition-all"
          >
            Volver al Inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
