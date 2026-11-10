import type { ReactNode } from "react";

// Título de pantalla del panel: línea de color + antetítulo + título (con la palabra destacada en <Accent>).
//   <PageTitle eyebrow="Operación diaria">Agenda de <Accent>Reservas</Accent></PageTitle>
// Las acciones de la pantalla (botones, filtros) van al lado, fuera de este componente.
// Cada módulo conserva su color (academia índigo, torneos ámbar, beneficios rosa); el resto, verde de marca
const TONES = {
  emerald: { line: "bg-emerald-500", text: "text-emerald-600 dark:text-[#00df82]", accent: "text-emerald-500 dark:text-[#00df82]" },
  indigo: { line: "bg-indigo-500", text: "text-indigo-600 dark:text-indigo-400", accent: "text-indigo-500 dark:text-indigo-400" },
  amber: { line: "bg-amber-500", text: "text-amber-600 dark:text-amber-400", accent: "text-amber-500 dark:text-amber-400" },
  pink: { line: "bg-pink-500", text: "text-pink-600 dark:text-pink-400", accent: "text-pink-500" },
} as const;
type Tone = keyof typeof TONES;

export function Accent({ children, tone = "emerald" }: { children: ReactNode; tone?: Tone }) {
  return <span className={TONES[tone].accent}>{children}</span>;
}

export default function PageTitle({ eyebrow, children, tone = "emerald" }: { eyebrow: ReactNode; children: ReactNode; tone?: Tone }) {
  const t = TONES[tone];
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <span className={`w-6 h-[2px] rounded-md ${t.line}`} />
        <p className={`text-[11px] font-black tracking-[0.2em] uppercase ${t.text}`}>{eyebrow}</p>
      </div>
      <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none font-heading">
        {children}
      </h1>
    </div>
  );
}
