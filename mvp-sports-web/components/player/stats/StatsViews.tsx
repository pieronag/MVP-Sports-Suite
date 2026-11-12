"use client";
// Estadísticas del jugador: rango, datos físicos, cómo se gana XP y tarjetas de la bitácora.
import { GlowCard } from "@/components/player/ui";
import { Activity, AlertCircle, Footprints, Info, Ruler, Star, Trophy, Weight, Zap } from "@/components/player/icons";
import { BADGE_ICONS } from "@/components/player/badgeIcons";
import type { FeedItem, rankProgress, badgeList } from "@/utils/playerStats";
import type { xpValues } from "@/utils/gamificationCalc";

/* eslint-disable @typescript-eslint/no-explicit-any */
const muted = (d: boolean) => (d ? "text-slate-400" : "text-slate-500");
const strong = (d: boolean) => (d ? "text-slate-100" : "text-slate-900");

export function RankCard({ isDark, rank, xp, ovr }: { isDark: boolean; rank: ReturnType<typeof rankProgress>; xp: number; ovr: number }) {
  return (
    <GlowCard isDark={isDark}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className={`text-[12px] font-semibold ${muted(isDark)}`}>Rango actual</p>
            <p className="text-[18px] font-heading font-black" style={{ color: rank.current.color }}>{rank.current.name}</p>
            <span className={`mt-2 inline-block px-3 py-1 rounded-md border text-[12px] font-semibold ${isDark ? "border-white/8 text-slate-300" : "border-slate-200 text-slate-700"}`}>OVR {ovr}</span>
          </div>
          <div className="text-right">
            <p className={`text-[12px] font-semibold ${muted(isDark)}`}>Experiencia</p>
            <p className={`text-[18px] font-heading font-black tabular-nums ${strong(isDark)}`}>{xp.toLocaleString("es-CL")} XP</p>
          </div>
        </div>
        <div className="mt-5">
          <div className="flex justify-between mb-2 text-[12px]">
            <span className={`font-medium ${muted(isDark)}`}>{rank.next ? `Te faltan ${rank.toNext.toLocaleString("es-CL")} XP para ${rank.next.name}` : "Nivel máximo"}</span>
            <span className={`font-semibold tabular-nums ${isDark ? "text-slate-300" : "text-slate-700"}`}>{rank.progress}%</span>
          </div>
          <div className={`h-2 rounded-full overflow-hidden ${isDark ? "bg-white/6" : "bg-slate-100"}`} role="progressbar" aria-valuenow={rank.progress} aria-valuemin={0} aria-valuemax={100} aria-label="Progreso al siguiente rango">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${rank.progress}%`, backgroundColor: rank.current.color }} />
          </div>
        </div>
      </div>
    </GlowCard>
  );
}

export function BodyStats({ isDark, profile }: { isDark: boolean; profile: any }) {
  const items = [
    { label: "Altura", value: profile?.height ? `${profile.height} cm` : "—", icon: Ruler },
    { label: "Peso", value: profile?.weight ? `${profile.weight} kg` : "—", icon: Weight },
    { label: "Pie hábil", value: profile?.dominantFoot || "—", icon: Footprints },
  ];
  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map((f) => (
        <GlowCard key={f.label} isDark={isDark}>
          <div className="p-4 flex flex-col items-center text-center">
            <div className="w-9 h-9 rounded-md flex items-center justify-center mb-2.5 bg-emerald-500/10"><f.icon size={18} className="text-emerald-500" /></div>
            <p className={`text-[13px] font-semibold capitalize ${strong(isDark)}`}>{f.value}</p>
            <p className={`text-[12px] font-semibold mt-0.5 ${muted(isDark)}`}>{f.label}</p>
          </div>
        </GlowCard>
      ))}
    </div>
  );
}

export function XpRules({ isDark, x }: { isDark: boolean; x: ReturnType<typeof xpValues> }) {
  const rows = [
    { icon: Activity, label: "Partido jugado en un recinto", val: `+${x.match}` },
    { icon: Zap, label: "Ingreso registrado (check-in)", val: `+${x.checkin}` },
    { icon: Trophy, label: "Victoria / derrota", val: `+${x.win} / -${x.loss}` },
    { icon: Star, label: "MVP del partido", val: `+${x.mvp}` },
    { icon: Activity, label: "Cada gol / asistencia (máx. 15)", val: `+${x.goal} / +${x.assist}` },
    { icon: AlertCircle, label: "Inasistencia", val: `-${x.noShow}`, bad: true },
  ];
  return (
    <GlowCard isDark={isDark}>
      <div className="p-5 space-y-3.5">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${isDark ? "bg-white/4" : "bg-slate-100"}`}><r.icon size={16} className={muted(isDark)} /></div>
              <span className={`text-[13px] font-medium ${isDark ? "text-slate-200" : "text-slate-800"}`}>{r.label}</span>
            </div>
            <span className={`px-3 py-1 rounded-md text-[13px] font-semibold tabular-nums whitespace-nowrap ${r.bad ? "text-red-500 bg-red-500/10" : "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"}`}>{r.val}</span>
          </div>
        ))}
        <div className={`p-3.5 rounded-md flex items-start gap-3 ${isDark ? "bg-white/2" : "bg-slate-50"}`}>
          <Info size={14} className="text-emerald-500 shrink-0 mt-0.5" />
          <p className={`text-[12px] font-medium ${muted(isDark)}`}>Solo suman los partidos con ingreso registrado por el recinto. Los partidos internos quedan en tu historial pero no dan XP.</p>
        </div>
      </div>
    </GlowCard>
  );
}

const TONES: Record<FeedItem["tone"], string> = {
  win: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", loss: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  neutral: "bg-slate-500/10 text-slate-600 dark:text-slate-300", bad: "bg-red-500/10 text-red-600 dark:text-red-400",
  pending: "bg-amber-500/10 text-amber-700 dark:text-amber-400", internal: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
};

export function MatchCard({ isDark, item, onReport }: { isDark: boolean; item: FeedItem; onReport: () => void }) {
  const b = item.booking;
  const goals = b.teamStats ? null : Number(b.goals) || 0;
  return (
    <div className={`rounded-md p-4 border ${isDark ? "border-white/6" : "border-slate-200"}`} data-match={item.id}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`px-2.5 py-1 rounded text-[12px] font-semibold ${TONES[item.tone]}`}>{item.label}</span>
            {item.time && <span className={`text-[11px] font-medium ${muted(isDark)}`}>{item.time} hrs</span>}
          </div>
          <p className={`text-[13px] font-semibold truncate ${strong(isDark)}`}>{item.title}</p>
          <p className={`text-[11px] font-medium ${muted(isDark)}`}>{item.date.toLocaleDateString("es-CL", { timeZone: "America/Santiago" })}{item.sport ? ` · ${item.sport}` : ""}</p>
          {(goals || b.isMVP || b.mvpUserId) ? (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {goals ? <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${isDark ? "border-white/8" : "border-slate-200"}`}>{goals} {goals === 1 ? "gol" : "goles"}</span> : null}
              {b.isMVP ? <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400">MVP</span> : null}
            </div>
          ) : null}
          {item.note && <p className={`text-[11px] font-medium mt-1.5 ${muted(isDark)}`}>{item.note}</p>}
          {item.canReport && (
            <button onClick={onReport} className="mt-3 px-4 h-9 rounded-md text-[12px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 active:scale-[0.98]">
              {item.reported ? "Editar resultado" : "Anotar resultado"}
            </button>
          )}
        </div>
        <div className="shrink-0">
          {item.xp !== null ? (
            <div className={`px-3 py-2 rounded-md text-center border ${item.xp >= 0 ? "border-emerald-500/20 bg-emerald-500/8 text-emerald-600 dark:text-emerald-400" : "border-rose-500/20 bg-rose-500/8 text-rose-600 dark:text-rose-400"}`}>
              <p className="text-[15px] font-bold tabular-nums">{item.xp >= 0 ? `+${item.xp}` : item.xp}</p>
              <p className="text-[11px] font-semibold">XP</p>
            </div>
          ) : (
            <div className={`px-3 py-2 rounded-md text-center border ${isDark ? "border-white/6 text-slate-500" : "border-slate-200 text-slate-400"}`}>
              <p className="text-[13px] font-semibold">0</p><p className="text-[11px] font-semibold">XP</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function BadgeCard({ isDark, badge }: { isDark: boolean; badge: ReturnType<typeof badgeList>[number] }) {
  const Icon = BADGE_ICONS[badge.id] || Trophy;
  return (
    <div className="rounded-md p-4 border flex items-center justify-between gap-3" style={{ borderColor: `${badge.color}35`, backgroundColor: `${badge.color}0A` }}>
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-11 h-11 rounded-md flex items-center justify-center shrink-0" style={{ backgroundColor: `${badge.color}18` }}>
          <Icon size={20} color={badge.color} strokeWidth={1.5} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-[13px] font-semibold truncate ${strong(isDark)}`}>{badge.name}</span>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold" style={{ backgroundColor: `${badge.color}20`, color: badge.color }}>{badge.tierLabel}</span>
          </div>
          <p className={`text-[11px] font-medium mt-0.5 ${muted(isDark)}`}>{badge.desc}{badge.value ? ` · ${badge.value}` : ""}</p>
        </div>
      </div>
      <p className="text-[14px] font-bold tabular-nums shrink-0" style={{ color: badge.color }}>+{badge.xp} XP</p>
    </div>
  );
}
