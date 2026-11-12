"use client";
// Asistente de reserva en la ficha del recinto: deporte → día y hora (la cancha libre se asigna sola) → confirmar.
import type { ComponentType } from "react";
import { GlowCard } from "@/components/player/ui";
import { CheckCircle2, ChevronLeft, ChevronRight, Clock, ShieldCheck, Zap } from "@/components/player/icons";
import {
  FutbolIcon, PadelIcon, TenisIcon, BasquetbolIcon, VoleibolIcon,
  CanchaFutbolIcon, CanchaPadelIcon, CanchaTenisIcon, CanchaBasquetbolIcon, CanchaVoleibolIcon,
} from "@/components/icons/SportsIcons";
import { periodOf } from "@/utils/venueBooking";

/* eslint-disable @typescript-eslint/no-explicit-any */
type SportIcon = ComponentType<{ color?: string; size?: number }>;
const SPORTS: { match: RegExp; color: string; icon: SportIcon; court: SportIcon }[] = [
  { match: /futbol/, color: "#10b981", icon: FutbolIcon, court: CanchaFutbolIcon },
  { match: /padel/, color: "#3b82f6", icon: PadelIcon, court: CanchaPadelIcon },
  { match: /tenis/, color: "#f59e0b", icon: TenisIcon, court: CanchaTenisIcon },
  { match: /basq|basket/, color: "#6366f1", icon: BasquetbolIcon, court: CanchaBasquetbolIcon },
  { match: /vole|voley/, color: "#ec4899", icon: VoleibolIcon, court: CanchaVoleibolIcon },
];
export function sportStyle(sport: string) {
  const k = sport.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  return SPORTS.find((s) => s.match.test(k)) || SPORTS[0];
}

const muted = (d: boolean) => (d ? "text-slate-400" : "text-slate-500");
const strong = (d: boolean) => (d ? "text-slate-100" : "text-slate-900");
const clp = (n: number) => `$${Number(n || 0).toLocaleString("es-CL")}`;

const STEP_LABELS = ["Deporte", "Día y hora", "Confirmar"];
export function StepIndicator({ step, isDark }: { step: number; isDark: boolean }) {
  return (
    <ol className="grid grid-cols-3 gap-1 mb-4" aria-label="Pasos de la reserva">
      {STEP_LABELS.map((label, i) => {
        const s = i + 1, done = step > s, current = step === s;
        return (
          <li key={s} aria-current={current ? "step" : undefined} className="flex flex-col items-center gap-1.5">
            <div className={`h-1 w-full rounded-full ${done || current ? "bg-emerald-500" : isDark ? "bg-white/8" : "bg-slate-200"}`} />
            <span className={`text-[11px] font-semibold flex items-center gap-1 ${current ? strong(isDark) : done ? "text-emerald-500" : muted(isDark)}`}>
              {done && <CheckCircle2 size={12} />}{label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function StepHeader({ isDark, title, onBack }: { isDark: boolean; title: string; onBack?: () => void }) {
  return (
    <div className="flex items-center justify-between mb-4 min-h-10">
      {onBack ? (
        <button onClick={onBack} className={`flex items-center gap-1.5 h-10 pr-2 text-[12px] font-semibold active:scale-95 ${muted(isDark)}`}>
          <ChevronLeft size={14} /> Volver
        </button>
      ) : <span />}
      <p className={`text-[12px] font-semibold ${muted(isDark)}`}>{title}</p>
      <span className="w-14" />
    </div>
  );
}

export function SportStep({ isDark, sports, selected, onPick }: { isDark: boolean; sports: string[]; selected: string | null; onPick: (s: string) => void }) {
  return (
    <GlowCard isDark={isDark}>
      <div className="p-5">
        <StepHeader isDark={isDark} title="Elige un deporte" />
        {sports.length === 0 ? (
          <p className={`text-[13px] font-medium text-center py-4 ${muted(isDark)}`}>Este recinto aún no publica tarifas para reservar online.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {sports.map((sport) => {
              const st = sportStyle(sport), Icon = st.icon, on = selected === sport;
              return (
                <button key={sport} aria-pressed={on} onClick={() => onPick(sport)}
                  className={`flex items-center gap-2.5 px-5 h-12 rounded-md text-[13px] font-semibold transition-all active:scale-95 ${on ? "text-white" : isDark ? "text-slate-300 bg-white/6 hover:bg-white/10" : "text-slate-700 bg-slate-100 hover:bg-slate-200"}`}
                  style={on ? { backgroundColor: st.color } : undefined}>
                  <Icon color={on ? "white" : st.color} size={22} />{sport}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </GlowCard>
  );
}

type Day = { date: string; day: number; label: string; month: string; closed: boolean };
type Row = { time: string; courts: any[] };
const PERIODS = [["manana", "Mañana"], ["tarde", "Tarde"], ["noche", "Noche"]] as const;

export function TimeStep({ isDark, days, date, onDate, loading, hasCourts, rows, time, onTime, courtId, onCourt, priceOf, onBack, onNext }: {
  isDark: boolean; days: Day[]; date: string; onDate: (d: string) => void; loading: boolean; hasCourts: boolean;
  rows: Row[]; time: string | null; onTime: (t: string) => void; courtId: string | null; onCourt: (id: string) => void;
  priceOf: (time: string) => number; onBack: () => void; onNext: () => void;
}) {
  const day = days.find((d) => d.date === date);
  const idx = days.findIndex((d) => d.date === date);
  const free = rows.find((r) => r.time === time)?.courts || [];
  return (
    <GlowCard isDark={isDark}>
      <div className="p-5">
        <StepHeader isDark={isDark} title="Elige día y hora" onBack={onBack} />
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5 mb-4" role="tablist" aria-label="Día">
          {days.map((d) => {
            const on = d.date === date;
            return (
              <button key={d.date} role="tab" aria-selected={on} aria-label={`${d.label} ${d.day}${d.closed ? ", cerrado" : ""}`} onClick={() => onDate(d.date)}
                className={`shrink-0 w-[58px] py-2 rounded-md flex flex-col items-center transition-all active:scale-95 ${on ? "bg-emerald-500 text-white" : isDark ? "bg-white/6 text-slate-200" : "bg-slate-100 text-slate-700"} ${d.closed && !on ? "opacity-45" : ""}`}>
                <span className="text-[11px] font-semibold">{d.label}</span>
                <span className="text-[18px] font-heading font-black leading-tight tabular-nums">{d.day}</span>
                <span className={`text-[11px] font-medium ${on ? "text-white/80" : muted(isDark)}`}>{d.closed ? "Cerrado" : d.month}</span>
              </button>
            );
          })}
        </div>

        {day?.closed ? (
          <Empty isDark={isDark} text="El recinto está cerrado este día." action={idx < days.length - 1 ? { label: "Ver el día siguiente", onClick: () => onDate(days[idx + 1].date) } : undefined} />
        ) : !hasCourts ? (
          <Empty isDark={isDark} text="No hay canchas de este deporte por ahora." />
        ) : loading ? (
          <div className="flex justify-center py-8" role="status" aria-label="Cargando horarios"><div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : rows.length === 0 ? (
          <Empty isDark={isDark} text={idx === 0 ? "No quedan horarios hoy." : "No quedan horarios este día."}
            action={idx < days.length - 1 ? { label: "Ver el día siguiente", onClick: () => onDate(days[idx + 1].date) } : undefined} />
        ) : (
          <div className="space-y-4">
            {PERIODS.map(([pk, label]) => {
              const times = rows.filter((r) => periodOf(r.time) === pk);
              if (!times.length) return null;
              return (
                <div key={pk}>
                  <p className={`text-[11px] font-semibold mb-2 ${muted(isDark)}`}>{label}</p>
                  <div className="grid grid-cols-4 gap-2">
                    {times.map((r) => {
                      const on = time === r.time;
                      return (
                        <button key={r.time} aria-pressed={on} onClick={() => onTime(r.time)}
                          className={`h-11 rounded-md text-[13px] font-semibold tabular-nums transition-all active:scale-95 ${on ? "bg-emerald-500 text-white" : isDark ? "bg-white/6 text-slate-100" : "bg-slate-100 text-slate-800"}`}>
                          {r.time}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {time && free.length > 0 && (
              <div className={`pt-4 border-t ${isDark ? "border-white/6" : "border-slate-200"}`}>
                <p className={`text-[11px] font-semibold mb-2 ${muted(isDark)}`}>{free.length === 1 ? "Cancha disponible" : `Cancha · ${free.length} libres a las ${time}`}</p>
                <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5">
                  {free.map((c) => {
                    const on = courtId === c.id;
                    return (
                      <button key={c.id} aria-pressed={on} onClick={() => onCourt(c.id)}
                        className={`shrink-0 text-left px-4 py-2.5 min-h-11 rounded-md border transition-all ${on ? "border-emerald-500 bg-emerald-500/10" : isDark ? "border-white/8" : "border-slate-200"}`}>
                        <p className={`text-[12px] font-semibold ${strong(isDark)}`}>{c.name}</p>
                        {c.surface && <p className={`text-[11px] ${muted(isDark)}`}>{c.surface}</p>}
                      </button>
                    );
                  })}
                </div>
                <button onClick={onNext} disabled={!courtId}
                  className="mt-4 w-full h-12 rounded-md bg-emerald-500 text-white font-semibold text-[13px] flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50">
                  Continuar · {clp(priceOf(time))} <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </GlowCard>
  );
}

function Empty({ isDark, text, action }: { isDark: boolean; text: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="py-6 text-center">
      <p className={`text-[13px] font-medium ${muted(isDark)}`}>{text}</p>
      {action && <button onClick={action.onClick} className="mt-3 px-5 h-11 rounded-md text-[12px] font-semibold bg-emerald-500 text-white">{action.label}</button>}
    </div>
  );
}

export function SummaryStep({ isDark, sport, court, date, time, price, onBack, onConfirm }: {
  isDark: boolean; sport: string; court: any; date: string; time: string; price: number; onBack: () => void; onConfirm: () => void;
}) {
  const st = sportStyle(sport), Icon = st.icon, Court = st.court;
  const when = new Date(`${date}T12:00:00Z`).toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  const row = (icon: React.ReactNode, bg: string, title: string, sub: string) => (
    <div className="flex items-center gap-4 py-4">
      <div className="w-12 h-12 rounded-md flex items-center justify-center shrink-0" style={{ backgroundColor: bg }}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className={`text-[15px] font-semibold first-letter:uppercase ${strong(isDark)}`}>{title}</p>
        <p className={`text-[11px] font-medium ${muted(isDark)}`}>{sub}</p>
      </div>
    </div>
  );
  return (
    <GlowCard isDark={isDark}>
      <div className="p-5">
        <StepHeader isDark={isDark} title="Tu reserva" onBack={onBack} />
        <div className="divide-y divide-emerald-500/5">
          {row(<Icon color={st.color} size={24} />, `${st.color}20`, sport, "Deporte")}
          {row(Court ? <Court color={st.color} size={26} /> : <ShieldCheck size={22} />, `${st.color}15`, court?.name || "Cancha", court?.surface ? `Cancha · ${court.surface}` : "Cancha")}
          {row(<Clock size={22} className="text-blue-500" />, "rgba(59,130,246,0.1)", when, `${time} hrs · 60 min`)}
        </div>
        <div className={`p-4 rounded-md mt-4 flex items-center justify-between ${isDark ? "bg-emerald-500/10 border border-emerald-500/10" : "bg-emerald-50 border border-emerald-200"}`}>
          <div>
            <p className={`text-[12px] font-semibold ${muted(isDark)}`}>Valor de la reserva</p>
            <p className={`text-[11px] font-medium ${muted(isDark)}`}>Pago online con Mercado Pago</p>
          </div>
          <p className="text-[24px] font-heading font-black tabular-nums text-emerald-500">{clp(price)}</p>
        </div>
        <button onClick={onConfirm} disabled={price <= 0} className="w-full mt-5 h-14 rounded-md bg-emerald-500 text-white font-semibold text-[15px] flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50">
          <Zap size={20} /> Confirmar y pagar
        </button>
        {price <= 0 && <p className="text-[12px] font-semibold text-amber-600 dark:text-amber-400 text-center mt-2">Este horario no tiene tarifa publicada. Elige otro.</p>}
      </div>
    </GlowCard>
  );
}
