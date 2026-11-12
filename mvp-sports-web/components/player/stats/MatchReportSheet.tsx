"use client";
// Anotar el resultado de un partido (o registrar uno interno): rápido sin equipo, o con el detalle del equipo.
import { useEffect, useState } from "react";
import { GlowCard } from "@/components/player/ui";
import { MapPin, Minus, Plus, Star, X } from "@/components/player/icons";
import { teamService } from "@/services/client/player/teamService";
import { userService } from "@/services/client/player/userService";
import { capGoals, isScoreless, reportIssue, teamScore, type ReportDraft } from "@/utils/playerStats";
import { MAX_PER_MATCH } from "@/utils/gamificationCalc";

/* eslint-disable @typescript-eslint/no-explicit-any */
const muted = (d: boolean) => (d ? "text-slate-400" : "text-slate-500");
const strong = (d: boolean) => (d ? "text-slate-100" : "text-slate-900");

function Stepper({ value, onChange, label, isDark, small = false }: { value: number; onChange: (n: number) => void; label: string; isDark: boolean; small?: boolean }) {
  const s = small ? "w-9 h-9" : "w-11 h-11";
  return (
    <div className="flex items-center gap-1.5" role="group" aria-label={label}>
      <button aria-label={`Restar a ${label}`} onClick={() => onChange(capGoals(value - 1))} disabled={value <= 0} className={`${s} rounded-md flex items-center justify-center disabled:opacity-40 ${isDark ? "bg-white/6" : "bg-slate-100"}`}><Minus size={14} /></button>
      <span className={`w-7 text-center text-[16px] font-bold tabular-nums ${strong(isDark)}`} aria-live="polite">{value}</span>
      <button aria-label={`Sumar a ${label}`} onClick={() => onChange(capGoals(value + 1))} disabled={value >= MAX_PER_MATCH} className={`${s} rounded-md flex items-center justify-center bg-emerald-500 text-white disabled:opacity-40`}><Plus size={14} /></button>
    </div>
  );
}

function Segmented<T extends string>({ isDark, value, options, onChange, label }: { isDark: boolean; value: T; options: { key: T; label: string; color: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className={`flex rounded-md p-1 gap-1 ${isDark ? "bg-white/4" : "bg-slate-100"}`} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.key} role="radio" aria-checked={value === o.key} onClick={() => onChange(o.key)}
          className={`flex-1 h-10 rounded-md text-[12px] font-semibold transition-all ${value === o.key ? "text-white" : muted(isDark)}`}
          style={value === o.key ? { backgroundColor: o.color } : undefined}>{o.label}</button>
      ))}
    </div>
  );
}

export function MatchReportSheet({ isDark, uid, match, saving, error, onSave, onClose }: {
  isDark: boolean; uid: string; match: any | null; saving: boolean; error: string | null;
  onSave: (draft: ReportDraft, names: Record<string, string>, mvpUserId: string | null, teamName: string) => void; onClose: () => void;
}) {
  const sport = match?.sport || "Fútbol";
  const scoreless = isScoreless(sport);
  const [d, setD] = useState<ReportDraft>(() => ({
    outcome: match?.matchOutcome === "loss" ? "loss" : match?.matchOutcome === "draw" ? "draw" : "win",
    goals: Number(match?.goals) || 0, mvp: !!match?.isMVP, teamId: match?.selectedTeamId || "",
    assignments: match?.teamAssignments || {}, teamGoals: match?.teamStats || {}, winner: match?.winnerTeam || "A",
  }));
  const [mvpUserId, setMvp] = useState<string | null>(match?.mvpUserId ?? (match?.isMVP ? uid : null));
  const [teams, setTeams] = useState<any[]>([]);
  const [members, setMembers] = useState<{ uid: string; name: string }[]>([]);
  const [detail, setDetail] = useState(!!match?.selectedTeamId);
  const [issue, setIssue] = useState<string | null>(null);

  useEffect(() => { teamService.getUserTeams(uid).then(setTeams).catch(() => setTeams([])); }, [uid]);
  useEffect(() => {
    const team = teams.find((t) => t.id === d.teamId);
    if (!team) { setMembers([]); return; } // eslint-disable-line react-hooks/set-state-in-effect -- sin equipo, sin plantel
    let alive = true;
    Promise.all((team.members || []).map(async (id: string) => ({ uid: id, name: (await userService.getUserProfile(id).catch(() => null))?.displayName || "Compañero" })))
      .then((list) => {
        if (!alive) return;
        setMembers(list);
        setD((p) => ({ ...p, assignments: Object.fromEntries(list.map((m) => [m.uid, p.assignments[m.uid] || (m.uid === uid ? "A" : "N")])) }));
      });
    return () => { alive = false; };
  }, [d.teamId, teams, uid]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape" && !saving) onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [saving, onClose]);

  const set = (p: Partial<ReportDraft>) => { setD((x) => ({ ...x, ...p })); setIssue(null); };
  const score = teamScore(d);
  const submit = () => {
    const problem = reportIssue(d, uid);
    if (problem) { setIssue(problem); return; }
    onSave(d, Object.fromEntries(members.map((m) => [m.uid, m.name])), d.teamId ? mvpUserId : (d.mvp ? uid : null), teams.find((t) => t.id === d.teamId)?.name || "");
  };
  const SIDE = { A: "#ef4444", B: "#3b82f6", N: "#94a3b8" } as const;

  return (
    <div role="dialog" aria-modal="true" aria-label={match ? "Anotar resultado" : "Registrar partido interno"} className={`fixed inset-0 z-50 overflow-y-auto ${isDark ? "bg-[#020611]" : "bg-[#F8FAFC]"}`}>
      <div className="min-h-screen p-5 pt-12 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] max-w-lg mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <h2 className={`text-[16px] font-heading font-black ${strong(isDark)}`}>{match ? "Anotar resultado" : "Registrar partido interno"}</h2>
          <button aria-label="Cerrar" onClick={onClose} disabled={saving} className={`w-10 h-10 rounded-md flex items-center justify-center ${isDark ? "bg-white/6" : "bg-slate-100"}`}><X size={16} /></button>
        </div>

        {match ? (
          <GlowCard isDark={isDark}>
            <div className="p-4 flex items-center gap-3">
              <div className="w-11 h-11 rounded-md flex items-center justify-center bg-emerald-500/10"><MapPin size={20} className="text-emerald-500" /></div>
              <div className="min-w-0">
                <p className={`text-[13px] font-semibold truncate ${strong(isDark)}`}>{match.tenantName || "Partido"}</p>
                <p className={`text-[12px] font-medium ${muted(isDark)}`}>{sport}{match.startTime ? ` · ${match.startTime} hrs` : ""}</p>
              </div>
            </div>
          </GlowCard>
        ) : (
          <p className={`text-[12px] font-medium ${muted(isDark)}`}>Queda en tu historial y en el de tu equipo. Los partidos internos no suman XP: solo cuentan los jugados en un recinto con ingreso registrado.</p>
        )}

        {d.teamId && (
          <GlowCard isDark={isDark}>
            <div className="p-4 flex items-center justify-center gap-6">
              {(["A", "B"] as const).map((t, i) => (
                <div key={t} className={`flex-1 text-center ${i ? "order-3" : ""}`}>
                  <p className="text-[12px] font-semibold mb-1" style={{ color: SIDE[t] }}>Equipo {t}</p>
                  {scoreless ? (d.winner === t ? <span className="px-3 py-1 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-600">Ganador</span> : <span className={muted(isDark)}>—</span>)
                    : <p className={`text-[22px] font-bold tabular-nums ${strong(isDark)}`}>{t === "A" ? score.a : score.b}</p>}
                </div>
              ))}
              <span className={`order-2 text-[11px] font-semibold ${muted(isDark)}`}>VS</span>
            </div>
          </GlowCard>
        )}

        {(!d.teamId || scoreless) && (
          <GlowCard isDark={isDark}>
            <div className="p-4 space-y-3">
              <p className={`text-[12px] font-semibold ${muted(isDark)}`}>{d.teamId ? "Equipo ganador" : "Resultado"}</p>
              {d.teamId ? (
                <Segmented isDark={isDark} label="Equipo ganador" value={d.winner} onChange={(winner) => set({ winner })}
                  options={[{ key: "A", label: "Equipo A", color: SIDE.A }, { key: "B", label: "Equipo B", color: SIDE.B }, { key: "draw", label: "Empate", color: SIDE.N }]} />
              ) : (
                <Segmented isDark={isDark} label="Resultado" value={d.outcome} onChange={(outcome) => set({ outcome })}
                  options={[{ key: "win", label: "Victoria", color: "#10b981" }, { key: "loss", label: "Derrota", color: "#ef4444" }, { key: "draw", label: "Empate", color: "#94a3b8" }]} />
              )}
            </div>
          </GlowCard>
        )}
        {d.teamId && !scoreless && <p className={`text-[12px] font-medium ${muted(isDark)}`}>El ganador sale del marcador: anota los goles de cada jugador.</p>}

        {!d.teamId && (
          <GlowCard isDark={isDark}>
            <div className="p-4 space-y-4">
              {!scoreless && (
                <div className="flex items-center justify-between">
                  <p className={`text-[13px] font-semibold ${strong(isDark)}`}>Tus goles</p>
                  <Stepper isDark={isDark} label="tus goles" value={d.goals} onChange={(goals) => set({ goals })} />
                </div>
              )}
              <button onClick={() => set({ mvp: !d.mvp })} aria-pressed={d.mvp}
                className={`w-full h-11 rounded-md text-[13px] font-semibold flex items-center justify-center gap-2 border ${d.mvp ? "bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400" : isDark ? "border-white/8 text-slate-300" : "border-slate-200 text-slate-600"}`}>
                <Star size={16} /> {d.mvp ? "Fuiste el MVP" : "Fui el MVP"}
              </button>
            </div>
          </GlowCard>
        )}

        {!detail ? (
          teams.length > 0 && <button onClick={() => setDetail(true)} className="w-full text-[13px] font-semibold text-emerald-600 dark:text-emerald-400 h-11">+ Anotar con mi equipo (opcional)</button>
        ) : (
          <GlowCard isDark={isDark}>
            <div className="p-4 space-y-4">
              <label className="block">
                <span className={`text-[12px] font-semibold mb-1.5 block ${muted(isDark)}`}>Equipo</span>
                <select value={d.teamId} onChange={(e) => set({ teamId: e.target.value, assignments: {}, teamGoals: {} })}
                  className={`w-full h-11 rounded-md px-3 text-[13px] font-semibold border outline-hidden ${isDark ? "bg-[#0A101D] border-white/8 text-slate-100" : "bg-white border-slate-200 text-slate-900"}`}>
                  <option value="">Sin equipo</option>
                  {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </label>
              {d.teamId && members.length > 0 && (
                <ul className="space-y-1">
                  {members.map((m) => {
                    const side = d.assignments[m.uid] || "N";
                    return (
                      <li key={m.uid} className={`flex flex-wrap items-center gap-2 py-2.5 border-t ${isDark ? "border-white/4" : "border-slate-100"}`}>
                        <span className={`flex-1 min-w-[120px] text-[13px] font-medium truncate ${strong(isDark)}`}>{m.name}{m.uid === uid ? " (tú)" : ""}</span>
                        <div className="flex gap-1" role="radiogroup" aria-label={`Equipo de ${m.name}`}>
                          {(["A", "B", "N"] as const).map((t) => (
                            <button key={t} role="radio" aria-checked={side === t} aria-label={t === "N" ? "No jugó" : `Equipo ${t}`}
                              onClick={() => set({ assignments: { ...d.assignments, [m.uid]: t } })}
                              className={`w-9 h-9 rounded-md text-[12px] font-semibold ${side === t ? "text-white" : isDark ? "bg-white/4 text-slate-400" : "bg-slate-100 text-slate-500"}`}
                              style={side === t ? { backgroundColor: SIDE[t] } : undefined}>{t === "N" ? "—" : t}</button>
                          ))}
                        </div>
                        {!scoreless && side !== "N" && <Stepper small isDark={isDark} label={`goles de ${m.name}`} value={d.teamGoals[m.uid] || 0} onChange={(g) => set({ teamGoals: { ...d.teamGoals, [m.uid]: g } })} />}
                        <button aria-label={`MVP: ${m.name}`} aria-pressed={mvpUserId === m.uid} onClick={() => setMvp(mvpUserId === m.uid ? null : m.uid)} disabled={side === "N"}
                          className={`w-9 h-9 rounded-md flex items-center justify-center disabled:opacity-30 ${mvpUserId === m.uid ? "bg-amber-500 text-white" : isDark ? "bg-white/4 text-slate-500" : "bg-slate-100 text-slate-400"}`}><Star size={14} /></button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </GlowCard>
        )}

        {(issue || error) && <p role="alert" className="text-[13px] font-semibold text-red-500">{issue || error}</p>}
        <button disabled={saving} onClick={submit} className="w-full h-12 rounded-md bg-emerald-500 text-white font-semibold text-[14px] active:scale-[0.98] disabled:opacity-60 flex items-center justify-center">
          {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "Guardar"}
        </button>
      </div>
    </div>
  );
}
