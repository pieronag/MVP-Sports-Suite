"use client";
import * as Sentry from "@sentry/nextjs";
import NextError from "next/error";
import { useEffect } from "react";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es">
      <body className="bg-slate-950 text-white flex items-center justify-center min-h-screen">
        <div className="text-center p-8">
          <h1 className="text-6xl font-black text-emerald-500 mb-4">500</h1>
          <h2 className="text-xl font-black uppercase tracking-wider mb-2">Error del Servidor</h2>
          <p className="text-slate-400 text-sm mb-6">Ocurrió un error inesperado. Nuestro equipo ha sido notificado.</p>
          <a href="/" className="inline-block px-6 py-3 bg-emerald-500 text-slate-950 font-black rounded-xl uppercase text-sm tracking-widest">
            Volver al Inicio
          </a>
        </div>
      </body>
    </html>
  );
}
