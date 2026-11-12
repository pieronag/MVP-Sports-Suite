// Estadísticas del jugador: rango, bitácora de partidos y logros, y el formulario de resultado.
// Todo con las reglas del servidor (utils/gamificationCalc): lo que se muestra es lo que suma.
import { bookingXp, MAX_PER_MATCH, type GamificationConfig } from "./gamificationCalc";
import { slotInstant } from "./chileTime";

/* eslint-disable @typescript-eslint/no-explicit-any */
export const RANKS = [
  { id: "bronze", name: "Bronce", color: "#cd7f32" }, { id: "silver", name: "Plata", color: "#94A3B8" },
  { id: "gold", name: "Oro", color: "#f59e0b" }, { id: "platinum", name: "Platino", color: "#3b82f6" },
  { id: "diamond", name: "Diamante", color: "#0ea5e9" }, { id: "elite", name: "Élite", color: "#10b981" },
  { id: "legend", name: "Leyenda", color: "#8b5cf6" },
] as const;

export function rankProgress(xp: number, cfg: GamificationConfig) {
  const ranks = RANKS.map((r) => ({ ...r, min: Number((cfg.tiers as any)[r.id]) || 0 }));
  let i = 0;
  ranks.forEach((r, k) => { if (xp >= r.min) i = k; });
  const current = ranks[i], next = ranks[i + 1] || null;
  const progress = next ? Math.min(100, Math.max(0, Math.round(((xp - current.min) / Math.max(1, next.min - current.min)) * 100))) : 100;
  return { current, next, progress, toNext: next ? Math.max(0, next.min - xp) : 0 };
}

export const BADGE_NAMES: Record<string, [string, string]> = {
  scorer: ["Artillero", "Goles anotados"], playmaker: ["Maestro", "Asistencias"], defender: ["Muralla", "Valla invicta"],
  wins: ["Ganador", "Victorias"], mvp: ["Estrella", "Premios MVP"], experience: ["Veterano", "Partidos jugados"],
  multi_sport: ["Atleta total", "Deportes jugados"], captaincy: ["Capitán", "Partidos como capitán"], comeback: ["Ave Fénix", "Remontadas"],
  precision: ["Francotirador", "Precisión"], clutch: ["Clutch", "Goles decisivos"], tournaments: ["Competidor", "Torneos"],
  invictus: ["Invicto", "Racha invicta"], rivalry: ["Verdugo", "Clásicos ganados"], morning_player: ["Madrugador", "Partidos de mañana"],
  night_player: ["Nocturno", "Partidos de noche"], loyal: ["Fiel", "Meses en MVP"], weekend_warrior: ["Guerrero de finde", "Partidos de fin de semana"],
  stamina: ["Motor", "Minutos jugados"], social: ["Sociable", "Amigos invitados"],
};
const TIER_ORDER: Record<string, number> = { gold: 3, silver: 2, bronze: 1 };
const TIER_LABEL: Record<string, [string, string]> = { gold: ["Oro", "#d97706"], silver: ["Plata", "#64748b"], bronze: ["Bronce", "#b45309"] };

/** Logros que ya calculó el servidor (profile.badges), ordenados de oro a bronce, con su bono de XP. */
export function badgeList(saved: any[], cfg: GamificationConfig) {
  return (Array.isArray(saved) ? saved : []).filter((b) => b?.id && TIER_ORDER[b.tier])
    .map((b) => ({
      id: String(b.id), tier: String(b.tier), value: Number(b.value) || null,
      name: BADGE_NAMES[b.id]?.[0] || "Logro", desc: BADGE_NAMES[b.id]?.[1] || "Hito superado",
      tierLabel: TIER_LABEL[b.tier][0], color: TIER_LABEL[b.tier][1], xp: Number(cfg.badgeXp[b.tier]) || 0,
    }))
    .sort((a, b) => TIER_ORDER[b.tier] - TIER_ORDER[a.tier] || a.name.localeCompare(b.name, "es"));
}

const toDate = (raw: any): Date | null => {
  const d = raw?.toDate ? raw.toDate() : raw?.seconds ? new Date(raw.seconds * 1000) : raw ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(String(raw)) ? `${raw}T12:00:00Z` : raw) : null;
  return d && !isNaN(d.getTime()) ? d : null;
};
const ymd = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(d);

export type FeedItem = {
  id: string; booking: any; date: Date; title: string; sport: string; time: string;
  label: string; tone: "win" | "loss" | "neutral" | "bad" | "pending" | "internal";
  xp: number | null; note: string | null; canReport: boolean; reported: boolean;
};

/**
 * Partidos ya jugados (o inasistencias), del más reciente al más antiguo, con lo que sumaron según el servidor.
 * Un partido de recinto sin ingreso registrado no suma; un partido interno se muestra pero tampoco suma.
 */
export function matchFeed(bookings: any[], uid: string, user: any, cfg: GamificationConfig, now: Date): FeedItem[] {
  const out: FeedItem[] = [];
  for (const b of bookings) {
    const date = toDate(b.date);
    if (!date) continue;
    const r = bookingXp(b, uid, user, cfg);
    if (!r.counts && r.reason === "cancelled") continue;
    const end = b.startTime ? slotInstant(ymd(date), String(b.startTime)).getTime() + 3_600_000 : date.getTime();
    const over = end <= now.getTime() || b.isInternalMatch || b.checkOut || b.status === "completed";
    if (!over && !(!r.counts && r.reason === "no-show")) continue; // aún no se juega
    const reported = !!(b.teamStats || b.matchOutcome || b.winnerTeam);
    let label = "Jugado", tone: FeedItem["tone"] = "neutral", note: string | null = null;
    if (r.counts) {
      if (r.outcome === "win") { label = "Victoria"; tone = "win"; }
      else if (r.outcome === "loss") { label = "Derrota"; tone = "loss"; }
      else if (r.outcome === "draw") label = "Empate";
    } else if (r.reason === "no-show") { label = "Inasistencia"; tone = "bad"; note = "Resta XP y suma un strike"; }
    else if (r.reason === "internal") { label = "Partido interno"; tone = "internal"; note = "Los partidos internos no suman XP"; }
    else { label = "Sin ingreso"; tone = "pending"; note = "No suma: el recinto no registró tu ingreso"; }
    out.push({
      id: b.id, booking: b, date, sport: b.sport || "", time: b.startTime || "",
      title: b.isInternalMatch ? String(b.tenantName || "Partido interno").replace(/^PARTIDO INTERNO:\s*/i, "Interno · ") : b.tenantName || "Partido",
      label, tone, note, xp: r.counts ? r.xp : r.xp || (r.reason === "no-show" ? 0 : null),
      // Se puede anotar el resultado de lo jugado (no de inasistencias)
      canReport: r.counts || r.reason === "internal", reported,
    });
  }
  return out.sort((a, b) => b.date.getTime() - a.date.getTime());
}

// ---------- Formulario de resultado ----------
const SCORELESS = /padel|tenis|tennis|basq|basket/;
const fold = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
/** En pádel, tenis y básquetbol se anota quién ganó, no goles. */
export const isScoreless = (sport: string) => SCORELESS.test(fold(sport || ""));
export const capGoals = (n: number) => Math.min(MAX_PER_MATCH, Math.max(0, Math.floor(n || 0)));

export interface ReportDraft {
  outcome: "win" | "loss" | "draw";      // sin equipo
  goals: number; mvp: boolean;            // sin equipo
  teamId: string;
  assignments: Record<string, "A" | "B" | "N">;
  teamGoals: Record<string, number>;
  winner: "A" | "B" | "draw";             // con equipo, deportes sin goles
}

export function teamScore(d: ReportDraft) {
  let a = 0, b = 0;
  for (const [id, g] of Object.entries(d.teamGoals)) { if (d.assignments[id] === "A") a += capGoals(g); if (d.assignments[id] === "B") b += capGoals(g); }
  return { a, b };
}

/** Datos que se guardan en la reserva. Con equipo y goles, el ganador sale del marcador (antes quedaba siempre "A"). */
export function reportPayload(d: ReportDraft, uid: string, sport: string, names: Record<string, string>, mvpUserId: string | null) {
  if (!d.teamId) {
    const goals = isScoreless(sport) ? 0 : capGoals(d.goals);
    return { goals, assists: 0, isMVP: d.mvp, mvpUserId: d.mvp ? uid : null, matchOutcome: d.outcome, isWin: d.outcome === "win", selectedTeamId: "" };
  }
  const { a, b } = teamScore(d);
  const winner: "A" | "B" | "draw" = isScoreless(sport) ? d.winner : a > b ? "A" : b > a ? "B" : "draw";
  const mine = d.assignments[uid];
  const outcome = winner === "draw" || !mine || mine === "N" ? "draw" : winner === mine ? "win" : "loss";
  const teamStats = Object.fromEntries(Object.entries(d.teamGoals).filter(([id]) => d.assignments[id] && d.assignments[id] !== "N").map(([id, g]) => [id, isScoreless(sport) ? 0 : capGoals(g)]));
  return {
    goals: teamStats[uid] || 0, assists: 0, isMVP: mvpUserId === uid, mvpUserId, matchOutcome: outcome, isWin: outcome === "win",
    selectedTeamId: d.teamId, teamStats, teamAssists: {}, teamAssignments: d.assignments, teamMemberNames: names,
    participantIds: Object.keys(d.assignments).filter((id) => d.assignments[id] !== "N"), scoreA: a, scoreB: b, winnerTeam: winner,
  };
}

export function reportIssue(d: ReportDraft, uid: string): string | null {
  if (!d.teamId) return null;
  const sides = Object.values(d.assignments);
  if (!sides.includes("A") || !sides.includes("B")) return "Reparte a los jugadores en los equipos A y B.";
  if (!d.assignments[uid] || d.assignments[uid] === "N") return "Indica en qué equipo jugaste tú.";
  return null;
}
