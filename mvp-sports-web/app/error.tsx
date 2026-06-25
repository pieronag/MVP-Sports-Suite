"use client";
import Link from "next/link";
import { ArrowPathIcon } from "@heroicons/react/24/outline";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <h1 className="text-8xl font-black text-emerald-500 mb-4 tracking-tighter">500</h1>
        <h2 className="text-xl font-black text-white uppercase tracking-tight mb-2">
          Error del Servidor
        </h2>
        <p className="text-sm text-slate-400 mb-8 font-medium">
          Ocurrió un error inesperado. Nuestro equipo ha sido notificado.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-slate-950 font-black rounded-xl uppercase text-xs tracking-widest hover:bg-emerald-400 transition-all"
          >
            <ArrowPathIcon className="w-4 h-4" />
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
