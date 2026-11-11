"use client";
// Tarjetas y filtros de Partidos (rivales, jugadores, partidos que buscan gente, mis publicaciones y mis retos).
import type { ReactNode } from "react";
import { hideBrokenImg } from "@/utils/img";
import { REGIONS } from "@/utils/chileRegions";
import { MATCH_SPORTS, POSITIONS_BY_SPORT, challengeView } from "@/utils/matchmaking";
import { GlowCard } from "@/components/player/ui";
import { ChevronDown, MapPin, MessageCircle, Swords, User, X } from "@/components/player/icons";
import type { Challenge, MatchEntry } from "@/services/client/player/matchmakingService";
import { Sheet, chipCls } from "./Sheet";

/* eslint-disable @next/next/no-img-element */
const muted = (isDark: boolean) => (isDark ? "text-slate-400" : "text-slate-500");
const strong = (isDark: boolean) => (isDark ? "text-slate-100" : "text-slate-900");
const zoneText = (e: MatchEntry, max = 2) => {
  const list = e.communes?.length ? e.communes : e.commune ? [e.commune] : [];
  if (!list.length) return e.region || "";
  return `${list.slice(0, max).join(", ")}${list.length > max ? ` +${list.length - max}` : ""}${e.region ? ` · ${e.region}` : ""}`;
};

export type Filters = { sport: string; position: string; region: string; communes: string[] };

export function FilterBar({ isDark, filters, onChange, showPosition, zoneOpen, onToggleZone }: {
  isDark: boolean; filters: Filters; onChange: (f: Filters) => void; showPosition: boolean; zoneOpen: boolean; onToggleZone: () => void;
}) {
  const positions = POSITIONS_BY_SPORT[filters.sport] || [];
  const panel = isDark ? "bg-[#0A101D] border-white/6" : "bg-white border-slate-200";
  return (
    <div className="space-y-2">
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5" role="group" aria-label="Deporte">
        {["", ...MATCH_SPORTS].map((s) => {
          const on = filters.sport === s;
          return (
            <button key={s || "all"} aria-pressed={on} onClick={() => onChange({ ...filters, sport: s, position: "" })}
              className={`px-4 h-10 rounded-md text-[12px] font-semibold whitespace-nowrap shrink-0 transition-all active:scale-[0.97] ${on ? "bg-emerald-500 text-white" : isDark ? "bg-white/6 text-slate-300" : "bg-white text-slate-700 border border-slate-200"}`}>
              {s || "Todos"}
            </button>
          );
        })}
      </div>
      <div className="flex gap-2">
        <button onClick={onToggleZone} aria-expanded={zoneOpen}
          className={`flex-1 min-w-0 h-11 rounded-md px-4 text-[12px] font-semibold flex items-center justify-between gap-2 border ${filters.region ? "border-emerald-500/40 text-emerald-500" : isDark ? "bg-[#0A101D] text-slate-300 border-white/6" : "bg-white text-slate-700 border-slate-200"}`}>
          <span className="flex items-center gap-2 min-w-0"><MapPin size={15} />
            <span className="truncate">{filters.region ? `${filters.region}${filters.communes.length ? ` · ${filters.communes.length} comuna${filters.communes.length > 1 ? "s" : ""}` : ""}` : "Todo Chile"}</span>
          </span>
          <ChevronDown size={15} className={`shrink-0 transition-transform ${zoneOpen ? "rotate-180" : ""}`} />
        </button>
        {showPosition && positions.length > 0 && (
          <select value={filters.position} onChange={(e) => onChange({ ...filters, position: e.target.value })} aria-label="Posición"
            className={`flex-1 min-w-0 h-11 rounded-md px-3 text-[12px] font-semibold outline-hidden border ${isDark ? "bg-[#0A101D] text-slate-200 border-white/6" : "bg-white text-slate-700 border-slate-200"}`}>
            <option value="">Cualquier posición</option>
            {positions.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        )}
      </div>
      {zoneOpen && (
        <div className={`rounded-md p-3 space-y-3 border ${panel}`}>
          <select value={filters.region} onChange={(e) => onChange({ ...filters, region: e.target.value, communes: [] })} aria-label="Región"
            className={`w-full h-11 rounded-md px-3 text-[12px] font-semibold outline-hidden border ${isDark ? "bg-[#020611] text-slate-200 border-white/6" : "bg-slate-50 text-slate-700 border-slate-200"}`}>
            <option value="">Todo Chile</option>
            {Object.keys(REGIONS).map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          {filters.region && (
            <div className="flex flex-wrap gap-1.5">
              {(REGIONS[filters.region] || []).map((c) => {
                const on = filters.communes.includes(c);
                return <button key={c} aria-pressed={on} onClick={() => onChange({ ...filters, communes: on ? filters.communes.filter((x) => x !== c) : [...filters.communes, c] })} className={chipCls(on, isDark)}>{c}</button>;
              })}
            </div>
          )}
          <div className="flex gap-2">
            {filters.region && (
              <button onClick={() => onChange({ ...filters, region: "", communes: [] })} className={`flex-1 h-10 rounded-md text-[11px] font-semibold ${isDark ? "bg-white/6 text-slate-300" : "bg-slate-100 text-slate-600"}`}>Quitar zona</button>
            )}
            <button onClick={onToggleZone} className="flex-1 h-10 rounded-md text-[11px] font-semibold bg-emerald-500 text-white">Listo</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function Empty({ isDark, icon, text, action }: { isDark: boolean; icon: ReactNode; text: ReactNode; action?: { label: string; onClick: () => void } | null }) {
  return (
    <div className="py-14 flex flex-col items-center text-center">
      <span className={isDark ? "text-slate-600" : "text-slate-300"}>{icon}</span>
      <p className={`text-[13px] font-medium mt-3 ${muted(isDark)}`}>{text}</p>
      {action && <button onClick={action.onClick} className="mt-4 px-5 h-10 rounded-md text-[12px] font-semibold bg-emerald-500 text-white">{action.label}</button>}
    </div>
  );
}

export function RivalCard({ isDark, entry, challenged, onOpen }: { isDark: boolean; entry: MatchEntry; challenged: boolean; onOpen: () => void }) {
  return (
    <GlowCard isDark={isDark}>
      <div className="overflow-hidden">
        <div className="h-[90px] relative bg-linear-to-br from-emerald-600 to-emerald-800">
          {entry.teamImageUrl && <img src={entry.teamImageUrl} alt="" onError={hideBrokenImg} className="absolute inset-0 w-full h-full object-cover" />}
          <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/30 to-transparent" />
          <div className="absolute bottom-3 left-4 right-4 flex items-center gap-2">
            <span className="bg-emerald-500 px-2 py-0.5 rounded-md text-white font-semibold text-[12px]">{entry.sport}</span>
            <span className="bg-black/40 px-2 py-0.5 rounded-md text-white/80 text-[11px] font-medium">{entry.memberCount} jugadores</span>
          </div>
        </div>
        <div className="p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className={`font-semibold text-[14px] truncate ${strong(isDark)}`}>{entry.teamName}</p>
              {zoneText(entry) && <p className={`text-[11px] font-medium flex items-center gap-1 mt-1 ${muted(isDark)}`}><MapPin size={10} /><span className="truncate">{zoneText(entry)}</span></p>}
            </div>
            <button onClick={onOpen} aria-label={`Ver ${entry.teamName}`}
              className={`px-4 h-10 rounded-md text-[12px] font-semibold transition-all active:scale-[0.98] shrink-0 ${challenged ? (isDark ? "bg-white/6 text-slate-400" : "bg-slate-100 text-slate-500") : "bg-emerald-500 text-white"}`}>
              {challenged ? "Retado" : "Ver"}
            </button>
          </div>
          {entry.description && <p className={`text-[12px] font-medium mt-2 leading-snug ${muted(isDark)}`}>{entry.description}</p>}
        </div>
      </div>
    </GlowCard>
  );
}

export function PlayerCard({ isDark, entry, contacted, onOpen }: { isDark: boolean; entry: MatchEntry; contacted: boolean; onOpen: () => void }) {
  const tag = isDark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-700";
  return (
    <GlowCard isDark={isDark}>
      <div className="p-4">
        <div className="flex items-center gap-3">
          <div className={`w-14 h-14 rounded-md overflow-hidden shrink-0 border-2 flex items-center justify-center ${isDark ? "border-white/6 bg-white/6" : "border-slate-200 bg-slate-100"}`}>
            {entry.photoURL ? <img src={entry.photoURL} referrerPolicy="no-referrer" onError={hideBrokenImg} alt="" className="w-full h-full object-cover" /> : <User size={24} className={muted(isDark)} />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className={`font-semibold text-[14px] truncate ${strong(isDark)}`}>{entry.displayName}</p>
              <span className="text-emerald-500 text-[12px] font-bold shrink-0">OVR {entry.ovr}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${tag}`}>{entry.position || "Jugador"}</span>
              {entry.tier && <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded-md ${isDark ? "bg-white/6 text-slate-400" : "bg-slate-100 text-slate-500"}`}>{entry.tier}</span>}
              {zoneText(entry, 1) && <span className={`text-[11px] font-medium flex items-center gap-0.5 ${muted(isDark)}`}><MapPin size={10} />{zoneText(entry, 1).split(" · ")[0]}</span>}
            </div>
            {!!entry.sports?.length && (
              <div className="flex gap-1 mt-2 flex-wrap">{entry.sports.map((s) => <span key={s} className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${tag}`}>{s}</span>)}</div>
            )}
            {entry.description && <p className={`text-[12px] font-medium mt-1.5 leading-snug ${muted(isDark)}`}>{entry.description}</p>}
          </div>
        </div>
        <button onClick={onOpen} disabled={contacted}
          className={`w-full mt-3 h-11 rounded-md text-[12px] font-semibold transition-all active:scale-[0.98] ${contacted ? (isDark ? "bg-white/6 text-slate-400 border border-white/6" : "bg-slate-100 text-slate-500 border border-slate-200") : "bg-emerald-500 text-white"}`}>
          {contacted ? "Ya lo contactaste" : `Ver a ${entry.displayName?.split(" ")[0] || "jugador"}`}
        </button>
      </div>
    </GlowCard>
  );
}

export function NeedCard({ isDark, entry, busy, onJoin }: { isDark: boolean; entry: MatchEntry; busy: boolean; onJoin: () => void }) {
  const day = entry.day ? new Date(`${entry.day}T12:00:00`).toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "short" }) : "";
  return (
    <div className={`rounded-md p-4 border flex items-center gap-3 ${isDark ? "bg-[#0A101D] border-emerald-500/20" : "bg-white border-emerald-500/30"}`}>
      <div className="flex-1 min-w-0">
        <p className={`text-[14px] font-semibold ${strong(isDark)}`}>Faltan {entry.needed} · {entry.sport}</p>
        <p className={`text-[12px] truncate ${muted(isDark)}`}>{[day, entry.startTime && `${entry.startTime} hrs`, entry.tenantName].filter(Boolean).join(" · ")}</p>
        <p className={`text-[11px] ${muted(isDark)}`}>Organiza {entry.displayName}</p>
      </div>
      <button disabled={busy} onClick={onJoin} className="px-4 h-11 rounded-md bg-emerald-500 text-white text-[12px] font-semibold shrink-0 disabled:opacity-60">Me sumo</button>
    </div>
  );
}

export function MyEntryCard({ isDark, entry, onEdit, onClose }: { isDark: boolean; entry: MatchEntry; onEdit?: () => void; onClose: () => void }) {
  const title = entry.type === "team" ? entry.teamName
    : entry.type === "need" ? `Buscas ${entry.needed} jugador${entry.needed === 1 ? "" : "es"} · ${entry.tenantName} ${entry.startTime}`
      : "Disponible como jugador";
  return (
    <GlowCard isDark={isDark}>
      <div className="p-4 flex items-center gap-3">
        <div className={`w-11 h-11 rounded-md flex items-center justify-center shrink-0 ${isDark ? "bg-white/6" : "bg-slate-100"}`}>
          {entry.type === "team" ? <Swords size={20} className="text-emerald-500" /> : <User size={20} className="text-emerald-500" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`font-semibold text-[13px] truncate ${strong(isDark)}`}>{title}</p>
          <p className={`text-[11px] font-medium truncate ${muted(isDark)}`}>{entry.sport || entry.sports?.join(", ")}</p>
        </div>
        {onEdit && <button onClick={onEdit} className={`px-3 h-9 rounded-md text-[12px] font-semibold shrink-0 ${isDark ? "bg-blue-500/10 text-blue-400" : "bg-blue-50 text-blue-600"}`}>Editar</button>}
        <button onClick={onClose} className={`px-3 h-9 rounded-md text-[12px] font-semibold shrink-0 ${isDark ? "bg-red-500/10 text-red-400" : "bg-red-50 text-red-600"}`}>Retirar</button>
      </div>
    </GlowCard>
  );
}

export function ChallengeCard({ isDark, c, uid, onOpen, onChat }: { isDark: boolean; c: Challenge; uid: string; onOpen: () => void; onChat: () => void }) {
  const v = challengeView(c, uid);
  const tone = c.status === "active" ? (isDark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-700")
    : c.status === "pending" ? (isDark ? "bg-amber-500/10 text-amber-400" : "bg-amber-50 text-amber-700")
      : (isDark ? "bg-slate-500/10 text-slate-400" : "bg-slate-100 text-slate-500");
  const open = c.type === "team_vs_team" && (c.status === "pending" || c.status === "active");
  return (
    <GlowCard isDark={isDark}>
      <div className="p-4 flex items-center gap-3">
        <div className={`w-11 h-11 rounded-md flex items-center justify-center shrink-0 ${isDark ? "bg-white/6" : "bg-slate-100"}`}>
          <MessageCircle size={20} className={c.status === "active" ? "text-emerald-500" : c.status === "pending" ? "text-amber-500" : "text-slate-400"} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`font-semibold text-[13px] truncate ${strong(isDark)}`}>{v.title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-md ${tone}`}>{v.status}</span>
            <span className={`text-[11px] font-medium ${muted(isDark)}`}>{c.sport}</span>
          </div>
        </div>
        {open && (
          <button onClick={onOpen} className={`px-3 h-10 rounded-md text-[12px] font-semibold shrink-0 ${v.mustAnswer ? "bg-amber-500 text-white" : isDark ? "bg-white/6 text-slate-300" : "bg-slate-100 text-slate-600"}`}>
            {v.mustAnswer ? "Responder" : "Ver equipo"}
          </button>
        )}
        {c.status === "active" && <button onClick={onChat} className="px-4 h-10 rounded-md bg-emerald-500 text-white text-[12px] font-semibold shrink-0">Chat</button>}
      </div>
    </GlowCard>
  );
}

type TeamData = { team: { members: string[]; ownerId?: string }; profiles: Record<string, { displayName?: string; photoURL?: string; ovr?: number }> } | null;

export function ChallengeDetailSheet({ isDark, c, uid, data, busy, onAnswer, onClose }: {
  isDark: boolean; c: Challenge; uid: string; data: TeamData; busy: boolean; onAnswer: (accept: boolean) => void; onClose: () => void;
}) {
  const v = challengeView(c, uid);
  return (
    <Sheet isDark={isDark} title={v.title} onClose={onClose} bare>
      <div className="h-[100px] relative bg-linear-to-br from-emerald-800 to-slate-900">
        <button aria-label="Cerrar" onClick={onClose} className="absolute top-4 right-4 w-9 h-9 rounded-md bg-black/40 border border-white/10 flex items-center justify-center"><X size={14} className="text-white" /></button>
        <div className="absolute bottom-4 left-5 right-5">
          <p className="text-white text-[15px] font-semibold">{v.title}</p>
          <p className="text-white/70 text-[11px] font-medium mt-0.5">{c.sport} · {v.status}</p>
        </div>
      </div>
      <div className="p-5 space-y-4">
        {data ? (
          <div className="space-y-1.5">
            <p className={`text-[12px] font-semibold ${muted(isDark)}`}>Plantel · {data.team.members.length}</p>
            <div className="space-y-1.5 max-h-[240px] overflow-y-auto">
              {data.team.members.map((mid) => {
                const p = data.profiles[mid] || {};
                return (
                  <div key={mid} className="flex items-center gap-2.5 p-2 rounded-md">
                    <div className={`w-8 h-8 rounded-md overflow-hidden shrink-0 flex items-center justify-center ${isDark ? "bg-white/6" : "bg-slate-100"}`}>
                      {p.photoURL ? <img src={p.photoURL} referrerPolicy="no-referrer" onError={hideBrokenImg} alt="" className="w-full h-full object-cover" /> : <User size={14} className={muted(isDark)} />}
                    </div>
                    <p className={`flex-1 min-w-0 text-[12px] font-medium truncate ${isDark ? "text-slate-200" : "text-slate-700"}`}>{p.displayName || "Jugador MVP"}{mid === data.team.ownerId ? " (C)" : ""}</p>
                    <span className="text-emerald-500 text-[11px] font-semibold shrink-0">OVR {p.ovr || 40}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex justify-center py-4"><div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
        )}
        {v.mustAnswer && (
          <div className="flex gap-3 pt-2">
            <button disabled={busy} onClick={() => onAnswer(true)} className="flex-1 h-12 rounded-md bg-emerald-500 text-white font-semibold text-[13px] disabled:opacity-50">Aceptar</button>
            <button disabled={busy} onClick={() => onAnswer(false)} className="flex-1 h-12 rounded-md bg-red-500 text-white font-semibold text-[13px] disabled:opacity-50">Rechazar</button>
          </div>
        )}
      </div>
    </Sheet>
  );
}

export function TeamPickerSheet({ isDark, rivalName, teams, onPick, onClose }: {
  isDark: boolean; rivalName: string; teams: { id: string; name: string; sport?: string; members?: string[] }[]; onPick: (team: { id: string; name: string }) => void; onClose: () => void;
}) {
  return (
    <Sheet isDark={isDark} title={`Retar a ${rivalName}`} onClose={onClose}>
      <p className={`text-[12px] font-medium mb-4 ${muted(isDark)}`}>¿Con qué equipo quieres retar?</p>
      <div className="space-y-2">
        {teams.map((t) => (
          <button key={t.id} onClick={() => onPick(t)}
            className={`w-full p-4 rounded-md border text-left transition-all active:scale-[0.98] ${isDark ? "border-white/6 hover:bg-white/4" : "border-slate-200 hover:bg-slate-50"}`}>
            <p className={`font-semibold text-[13px] ${strong(isDark)}`}>{t.name}</p>
            <p className={`text-[11px] font-medium mt-0.5 capitalize ${muted(isDark)}`}>{t.sport || "Sin deporte"} · {t.members?.length || 1} jugadores</p>
          </button>
        ))}
      </div>
    </Sheet>
  );
}
