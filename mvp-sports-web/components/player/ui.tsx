"use client";
import type { ReactNode } from "react";

// Piezas visuales del área Jugador con el lenguaje del dashboard:
// tarjetas planas con borde fino (sin desenfoque, brillo ni sombras pesadas),
// encabezados de sección con línea verde y verde de marca #00df82 en oscuro.

export const PLAYER_BG = { dark: "#020611", light: "#F8FAFC" } as const;
export const PLAYER_CARD = { dark: "#0A101D", light: "#FFFFFF" } as const;

export function GlowCard({ isDark, children, className = "" }: { isDark: boolean; children: ReactNode; className?: string }) {
  return (
    <div className={`relative rounded-md border ${isDark ? "bg-[#0A101D] border-white/5" : "bg-white border-slate-200 shadow-sm shadow-slate-200/50"} ${className}`}>
      {children}
    </div>
  );
}

export function SectionPill({ label, className = "" }: { label: string; className?: string }) {
  return (
    <div className={`flex items-center gap-2 px-6 mb-3 mt-6 ${className}`}>
      <span className="w-6 h-[2px] bg-emerald-500 rounded-md" />
      <span className="text-[12px] font-black text-emerald-500 tracking-[0.2em] uppercase">{label}</span>
    </div>
  );
}
