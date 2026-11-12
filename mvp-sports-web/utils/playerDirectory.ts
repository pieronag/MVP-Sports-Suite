// Directorio de jugadores (superadmin): de documento de usuario a fila, filtros, orden, paginación y CSV. Sin efectos.
import { normalizeRole } from "./roles";
import { canonicalSport } from "./sports";

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface PlayerStats { played: number; won: number; lost: number; goals: number; mvp?: number; [k: string]: number | undefined }
export interface PlayerRow {
  id: string; name: string; email: string; photoURL: string;
  captain: boolean; suspended: boolean; strikes: number;
  ovr: number; xp: number; tier: string; stats: PlayerStats; winRate: number; goalsPerMatch: number;
  teams: string[]; badges: any[]; mainSport: string; position: string;
  joinedAt: Date | null; raw: Record<string, any>;
}
export type TeamRef = { name: string; members?: string[]; ownerId?: string };

const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const toDate = (c: any): Date | null => {
  if (!c) return null;
  const d = c instanceof Date ? c : typeof c?.toDate === "function" ? c.toDate() : typeof c?.seconds === "number" ? new Date(c.seconds * 1000) : new Date(c);
  return isNaN(d.getTime()) ? null : d;
};

/** Fila del directorio, o null si la cuenta no es de jugador (el superadmin y el personal no aparecen). */
export function toPlayerRow(id: string, d: Record<string, any>, teams: TeamRef[]): PlayerRow | null {
  if (normalizeRole(d.role) !== "player") return null;
  const mine = teams.filter((t) => t.ownerId === id || (t.members || []).includes(id));
  const s = d.stats || {};
  const stats: PlayerStats = { ...s, played: num(s.played), won: num(s.won), lost: num(s.lost), goals: num(s.goals), mvp: num(s.mvp) };
  const joinedAt = [d.createdAt, d.joinedDate, d.created_at, d.registeredAt].map(toDate).find(Boolean) || null;
  return {
    id, name: d.displayName || d.name || "Usuario sin nombre", email: d.email || "", photoURL: d.photoURL || d.imageUrl || "",
    captain: teams.some((t) => t.ownerId === id), suspended: d.status === "suspended", strikes: num(d.strikes),
    ovr: num(d.ovr ?? d.elo), xp: num(d.xp), tier: String(d.tier || d.level || "Bronce").toUpperCase(),
    stats, winRate: stats.played ? Math.round((stats.won / stats.played) * 100) : 0,
    goalsPerMatch: stats.played ? Number((stats.goals / stats.played).toFixed(2)) : 0,
    teams: mine.map((t) => t.name).filter(Boolean),
    // Insignias: las que calcula el servidor (utils/gamificationCalc)
    badges: Array.isArray(d.badges) ? d.badges : [],
    mainSport: d.mainSport ? canonicalSport(d.mainSport) : "",
    position: d.position && d.position !== "Jugador" ? d.position : "",
    joinedAt, raw: d,
  };
}

export type PlayerFilter = "Todos" | "Capitanes" | "Sin equipo" | "Suspendidos" | "Con strikes";
export type SortKey = "ovr" | "name" | "played" | "winRate" | "goals" | "joined";
const fold = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function filterPlayers(rows: PlayerRow[], f: { search: string; filter: PlayerFilter; sport: string }) {
  const q = fold(f.search.trim());
  return rows.filter((u) => {
    if (q && !fold(`${u.name} ${u.email} ${u.teams.join(" ")}`).includes(q)) return false;
    if (f.filter === "Suspendidos" && !u.suspended) return false;
    if (f.filter === "Capitanes" && !u.captain) return false;
    if (f.filter === "Sin equipo" && u.teams.length) return false;
    if (f.filter === "Con strikes" && !u.strikes) return false;
    return f.sport === "Todos" || u.mainSport === f.sport;
  });
}

export function sortPlayers(rows: PlayerRow[], key: SortKey, dir: "asc" | "desc") {
  const k = dir === "asc" ? 1 : -1;
  const val = (u: PlayerRow): number | string => key === "name" ? u.name : key === "played" ? u.stats.played : key === "winRate" ? u.winRate
    : key === "goals" ? u.stats.goals : key === "joined" ? u.joinedAt?.getTime() || 0 : u.ovr;
  return [...rows].sort((a, b) => {
    const x = val(a), y = val(b);
    const c = typeof x === "string" ? x.localeCompare(String(y), "es") : x - (y as number);
    return c * k || a.name.localeCompare(b.name, "es");
  });
}

/** Botones de página: siempre la primera y la última, y las vecinas de la actual (null = "…"). */
export function pageWindow(current: number, total: number): (number | null)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set([1, total, current - 1, current, current + 1].filter((n) => n >= 1 && n <= total));
  const pages = [...set].sort((a, b) => a - b);
  const out: (number | null)[] = [];
  pages.forEach((p, i) => { if (i && p - pages[i - 1] > 1) out.push(null); out.push(p); });
  return out;
}

export const sportsOf = (rows: PlayerRow[]) => ["Todos", ...[...new Set(rows.map((u) => u.mainSport).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"))];

export function playersCsv(rows: PlayerRow[]) {
  const header = ["Nombre", "Email", "Rol", "Estado", "Strikes", "Deporte", "Posición", "OVR", "XP", "Nivel", "Partidos", "Ganados", "Perdidos", "% Victorias", "Goles", "Equipos", "Insignias", "Miembro desde"];
  // Evita que Excel interprete como fórmula un nombre que empiece con = + - @
  const esc = (v: unknown) => { let s = String(v ?? ""); if (/^[=+\-@]/.test(s)) s = `'${s}`; return `"${s.replace(/"/g, '""')}"`; };
  const body = rows.map((u) => [
    u.name, u.email, u.captain ? "Capitán" : "Jugador", u.suspended ? "Suspendido" : "Activo", u.strikes, u.mainSport, u.position,
    u.ovr, u.xp, u.tier, u.stats.played, u.stats.won, u.stats.lost, `${u.winRate}%`, u.stats.goals, u.teams.join(" | "), u.badges.length,
    u.joinedAt ? u.joinedAt.toLocaleDateString("es-CL") : "",
  ].map(esc).join(","));
  return "﻿" + [header.map(esc).join(","), ...body].join("\r\n");
}
