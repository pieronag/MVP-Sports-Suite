"use client";
// Formularios de Partidos: publicar equipo, publicar disponibilidad y editar una publicación.
// Cada hoja guarda su propio borrador y valida antes de llamar a onSubmit.
import { useState } from "react";
import { User } from "@/components/player/icons";
import { MATCH_SPORTS, matchSport, teamPostIssue, playerPostIssue, editEntryIssue } from "@/utils/matchmaking";
import type { MatchEntry } from "@/services/client/player/matchmakingService";
import { Sheet, ZonePicker, Spinner, fieldCls, labelCls, chipCls } from "./Sheet";

export type Zone = { region: string; communes: string[] };
type Team = { id: string; name: string; sport?: string; members?: string[]; imageUrl?: string };

function Issue({ text }: { text: string | null }) {
  return text ? <p role="alert" className="text-[12px] font-semibold text-red-500 mb-3">{text}</p> : null;
}

function SubmitButton({ busy, label, disabled = false }: { busy: boolean; label: string; disabled?: boolean }) {
  return (
    <button type="submit" disabled={busy || disabled}
      className="w-full h-12 rounded-md bg-emerald-500 text-white font-semibold text-[13px] transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center">
      {busy ? <Spinner light /> : label}
    </button>
  );
}

export function PublishTeamSheet({ isDark, teams, hasAnyTeam, zone, busy, onSubmit, onClose }: {
  isDark: boolean; teams: Team[]; hasAnyTeam: boolean; zone: Zone; busy: boolean;
  onSubmit: (p: { team: Team; sport: string; description: string } & Zone) => void; onClose: () => void;
}) {
  const [teamId, setTeamId] = useState(teams.length === 1 ? teams[0].id : "");
  const [description, setDescription] = useState("");
  const [z, setZ] = useState<Zone>(zone);
  const [issue, setIssue] = useState<string | null>(null);
  const team = teams.find((t) => t.id === teamId);
  const [chosenSport, setChosenSport] = useState("");
  const teamSport = matchSport(team?.sport);
  const sport = teamSport || chosenSport;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const problem = teamPostIssue({ teamId, sport, ...z });
    if (problem || !team) { setIssue(problem || "Elige el equipo que quieres publicar."); return; }
    onSubmit({ team, sport, description: description.trim(), ...z });
  };

  return (
    <Sheet isDark={isDark} title="Publicar mi equipo" onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <label className="block mb-4">
          <span className={labelCls(isDark)}>Equipo</span>
          {teams.length === 0 ? (
            <span className={`w-full min-h-11 rounded-md flex items-center px-4 text-[13px] font-medium border ${isDark ? "bg-white/4 text-slate-400 border-white/6" : "bg-slate-50 text-slate-500 border-slate-200"}`}>
              {hasAnyTeam ? "Todos tus equipos ya están publicados" : "Solo el capitán puede publicar. Crea un equipo primero."}
            </span>
          ) : (
            <select value={teamId} onChange={(e) => { setTeamId(e.target.value); setIssue(null); }} className={fieldCls(isDark)}>
              <option value="">Seleccionar equipo</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          )}
        </label>
        {team && teamSport && (
          <p className={`text-[12px] font-medium -mt-2 mb-4 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Deporte: <span className="font-semibold text-emerald-500">{teamSport}</span>
          </p>
        )}
        {team && !teamSport && (
          <label className="block mb-4">
            <span className={labelCls(isDark)}>Deporte</span>
            <select value={chosenSport} onChange={(e) => { setChosenSport(e.target.value); setIssue(null); }} className={fieldCls(isDark)}>
              <option value="">Seleccionar deporte</option>
              {MATCH_SPORTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
        )}
        <label className="block mb-4">
          <span className={labelCls(isDark)}>Descripción (opcional)</span>
          <input value={description} maxLength={200} onChange={(e) => setDescription(e.target.value)} placeholder="Ej: Buscamos rival para este sábado" className={fieldCls(isDark)} />
        </label>
        <ZonePicker isDark={isDark} region={z.region} communes={z.communes} onChange={(region, communes) => { setZ({ region, communes }); setIssue(null); }} />
        <Issue text={issue} />
        <SubmitButton busy={busy} label="Publicar equipo" disabled={teams.length === 0} />
      </form>
    </Sheet>
  );
}

export function PublishPlayerSheet({ isDark, me, initialSports, zone, busy, onSubmit, onClose }: {
  isDark: boolean; me: { name: string; photo: string; position: string; ovr: number; tier: string };
  initialSports: string[]; zone: Zone; busy: boolean;
  onSubmit: (p: { sports: string[]; description: string } & Zone) => void; onClose: () => void;
}) {
  const [sports, setSports] = useState(initialSports);
  const [description, setDescription] = useState("");
  const [z, setZ] = useState<Zone>(zone);
  const [issue, setIssue] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const problem = playerPostIssue({ sports, ...z });
    if (problem) { setIssue(problem); return; }
    onSubmit({ sports, description: description.trim(), ...z });
  };

  return (
    <Sheet isDark={isDark} title="Estoy disponible" onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <div className={`p-4 rounded-md mb-4 flex items-center gap-3 ${isDark ? "bg-white/4" : "bg-slate-50"}`}>
          <div className={`w-10 h-10 rounded-md overflow-hidden shrink-0 flex items-center justify-center ${isDark ? "bg-white/6" : "bg-slate-100"}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {me.photo ? <img src={me.photo} alt="" className="w-full h-full object-cover" /> : <User size={18} className={isDark ? "text-slate-400" : "text-slate-500"} />}
          </div>
          <div className="min-w-0">
            <p className={`font-semibold text-[13px] truncate ${isDark ? "text-slate-100" : "text-slate-900"}`}>{me.name}</p>
            <p className={`text-[11px] font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>{[me.position, `OVR ${me.ovr}`, me.tier].filter(Boolean).join(" · ")}</p>
          </div>
        </div>
        <fieldset className="mb-4">
          <legend className={labelCls(isDark)}>Deportes</legend>
          <div className="flex flex-wrap gap-2">
            {MATCH_SPORTS.map((s) => {
              const on = sports.includes(s);
              return <button key={s} type="button" aria-pressed={on} onClick={() => { setSports(on ? sports.filter((x) => x !== s) : [...sports, s]); setIssue(null); }} className={chipCls(on, isDark)}>{s}</button>;
            })}
          </div>
        </fieldset>
        <ZonePicker isDark={isDark} region={z.region} communes={z.communes} communesLabel="Comunas donde juegas" onChange={(region, communes) => { setZ({ region, communes }); setIssue(null); }} />
        <label className="block mb-4">
          <span className={labelCls(isDark)}>Comentario (opcional)</span>
          <input value={description} maxLength={200} onChange={(e) => setDescription(e.target.value)} placeholder="Ej: Busco partidos los fines de semana" className={fieldCls(isDark)} />
        </label>
        <Issue text={issue} />
        <SubmitButton busy={busy} label="Publicar disponibilidad" />
      </form>
    </Sheet>
  );
}

export function EditEntrySheet({ isDark, entry, busy, onSubmit, onClose }: {
  isDark: boolean; entry: MatchEntry; busy: boolean;
  onSubmit: (data: { description: string; sports?: string[] }) => void; onClose: () => void;
}) {
  const [description, setDescription] = useState(entry.description || "");
  const [sports, setSports] = useState<string[]>((entry.sports || []).map((s) => matchSport(s) || s));
  const [issue, setIssue] = useState<string | null>(null);
  const isPlayer = entry.type === "player";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const problem = editEntryIssue({ type: entry.type, sports, description });
    if (problem) { setIssue(problem); return; }
    onSubmit(isPlayer ? { description: description.trim(), sports } : { description: description.trim() });
  };

  return (
    <Sheet isDark={isDark} title="Editar publicación" onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <div className={`p-4 rounded-md mb-4 ${isDark ? "bg-white/4" : "bg-slate-50"}`}>
          <p className={`font-semibold text-[13px] ${isDark ? "text-slate-100" : "text-slate-900"}`}>{entry.type === "team" ? entry.teamName : "Disponible como jugador"}</p>
          {entry.type === "team" && <p className={`text-[11px] font-medium mt-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>{entry.sport} · el deporte es el del equipo</p>}
        </div>
        {isPlayer && (
          <fieldset className="mb-4">
            <legend className={labelCls(isDark)}>Deportes</legend>
            <div className="flex flex-wrap gap-2">
              {MATCH_SPORTS.map((s) => {
                const on = sports.includes(s);
                return <button key={s} type="button" aria-pressed={on} onClick={() => { setSports(on ? sports.filter((x) => x !== s) : [...sports, s]); setIssue(null); }} className={chipCls(on, isDark)}>{s}</button>;
              })}
            </div>
          </fieldset>
        )}
        <label className="block mb-5">
          <span className={labelCls(isDark)}>Descripción</span>
          <input value={description} maxLength={200} onChange={(e) => setDescription(e.target.value)} placeholder="Descripción de tu publicación" className={fieldCls(isDark)} />
        </label>
        <Issue text={issue} />
        <SubmitButton busy={busy} label="Guardar cambios" />
      </form>
    </Sheet>
  );
}
