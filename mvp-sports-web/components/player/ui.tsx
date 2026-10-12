"use client";
import type { ReactNode } from "react";

// Piezas visuales del área Jugador con el lenguaje del dashboard:
// tarjetas planas con borde fino (sin desenfoque, brillo ni sombras pesadas),
// encabezados de sección con línea verde y verde de marca #00df82 en oscuro.

export const PLAYER_BG = { dark: "#020611", light: "#F8FAFC" } as const;
export const PLAYER_CARD = { dark: "#0A101D", light: "#FFFFFF" } as const;

export function GlowCard({ isDark, children, className = "" }: { isDark: boolean; children: ReactNode; className?: string }) {
  return (
    <div className={`relative rounded-md border ${isDark ? "bg-[#0A101D] border-white/5" : "bg-white border-slate-200 shadow-xs shadow-slate-200/50"} ${className}`}>
      {children}
    </div>
  );
}

export function SectionPill({ label, className = "" }: { label: string; className?: string }) {
  return (
    <div className={`flex items-center gap-2 px-6 mb-3 mt-6 ${className}`}>
      <span className="w-6 h-[2px] bg-emerald-500 rounded-md" />
      <span className="text-[12px] font-bold text-emerald-500">{label}</span>
    </div>
  );
}

// Control segmentado para elegir función/vista dentro de una pantalla
export function SegmentedTabs<T extends string>({ isDark, value, onChange, options, className = "" }: {
  isDark: boolean;
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: ReactNode; icon?: React.ElementType }[];
  className?: string;
}) {
  return (
    <div role="tablist" className={`flex p-1 rounded-md ${isDark ? "bg-white/4" : "bg-slate-100"} ${className}`}>
      {options.map(({ id, label, icon: Icon }) => {
        const on = value === id;
        return (
          <button key={id} role="tab" aria-selected={on} onClick={() => onChange(id)}
            className={`flex-1 min-w-0 h-9 px-2 rounded-md text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 ${on ? (isDark ? "bg-[#0A101D] text-emerald-400" : "bg-white text-emerald-600 shadow-xs") : isDark ? "text-slate-400" : "text-slate-500"}`}>
            {Icon && <Icon size={14} className="shrink-0" />}<span className="truncate">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
