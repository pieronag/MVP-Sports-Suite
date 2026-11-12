import { describe, it, expect } from "vitest";
import { normalizeSettings, computeProgress, bookingXp } from "../utils/gamificationCalc";
import { rankProgress, badgeList, matchFeed, reportPayload, reportIssue, type ReportDraft } from "../utils/playerStats";

const cfg = normalizeSettings({ gamification: { badges: { scorer: { bronze: 2, silver: 5, gold: 10 } } } });
const U = "u1";
const user = { mainSport: "Fútbol", createdAt: new Date("2026-01-01") };
const bookings = [
  { id: "a", userId: U, date: new Date("2026-11-01T15:00:00Z"), startTime: "12:00", checkIn: true, goals: 20, matchOutcome: "win", isMVP: true, sport: "Fútbol", tenantName: "Club" },
  { id: "b", userId: "o", date: new Date("2026-11-02T15:00:00Z"), startTime: "20:00", checkIn: true, teamAssignments: { [U]: "B", o: "A" }, winnerTeam: "A", teamStats: { [U]: 2 }, sport: "Fútbol", tenantName: "Club" },
  { id: "c", userId: U, date: new Date("2026-11-03T15:00:00Z"), startTime: "20:00", noShow: true, status: "cancelled" },
  { id: "d", userId: U, date: new Date("2026-11-04T15:00:00Z"), isInternalMatch: true, matchOutcome: "win", goals: 3, tenantName: "PARTIDO INTERNO: Halcones" },
  { id: "e", userId: U, date: new Date("2026-11-05T15:00:00Z"), startTime: "20:00", status: "confirmed", paymentStatus: "paid" },
  { id: "f", userId: U, date: new Date("2026-11-06T15:00:00Z"), status: "cancelled", paymentStatus: "refunded" },
];
const now = new Date("2026-11-12T12:00:00Z");

describe("XP por partido = XP total del servidor", () => {
  it("la suma de cada partido más el bono de logros da lo mismo que computeProgress", () => {
    const p = computeProgress(U, user, bookings, cfg, now.getTime());
    const sum = bookings.reduce((s, b) => s + bookingXp(b, U, user, cfg).xp, 0);
    expect(Math.max(0, sum + p.badgeXpBonus)).toBe(p.xp);
  });
  it("goles acotados a 15 y equipo perdedor resta", () => {
    expect(bookingXp(bookings[0], U, user, cfg)).toMatchObject({ counts: true, goals: 15, outcome: "win", mvp: true });
    expect(bookingXp(bookings[1], U, user, cfg)).toMatchObject({ counts: true, goals: 2, outcome: "loss" });
  });
});

describe("playerStats", () => {
  it("rango y progreso", () => {
    expect(rankProgress(0, cfg)).toMatchObject({ current: { id: "bronze" }, next: { id: "silver" }, progress: 0, toNext: 1000 });
    expect(rankProgress(2000, cfg)).toMatchObject({ current: { id: "silver" }, progress: 50 });
    expect(rankProgress(99999, cfg)).toMatchObject({ current: { id: "legend" }, next: null, progress: 100 });
  });

  it("logros: solo los del servidor, de oro a bronce", () => {
    const list = badgeList([{ id: "scorer", tier: "bronze", value: 3 }, { id: "wins", tier: "gold" }, { id: "x", tier: "rare" }], cfg);
    expect(list.map((b) => [b.id, b.xp])).toEqual([["wins", 500], ["scorer", 50]]);
  });

  it("bitácora: sin cancelados ni futuros, con lo que suma cada uno", () => {
    const feed = matchFeed(bookings, U, user, cfg, now);
    expect(feed.map((f) => [f.id, f.label])).toEqual([["e", "Sin ingreso"], ["d", "Partido interno"], ["c", "Inasistencia"], ["b", "Derrota"], ["a", "Victoria"]]);
    expect(feed.find((f) => f.id === "d")).toMatchObject({ xp: null, title: "Interno · Halcones", canReport: true });
    expect(feed.find((f) => f.id === "c")!.xp).toBe(-150);
    expect(feed.find((f) => f.id === "e")).toMatchObject({ xp: null, canReport: false });
    expect(matchFeed([{ ...bookings[4], date: new Date("2026-11-20T15:00:00Z") }], U, user, cfg, now)).toEqual([]);
  });

  it("resultado con equipo: el ganador sale del marcador", () => {
    const d: ReportDraft = { outcome: "win", goals: 0, mvp: false, teamId: "t", assignments: { [U]: "B", o: "A", n: "N" }, teamGoals: { [U]: 3, o: 1, n: 9 }, winner: "A" };
    const p = reportPayload(d, U, "Fútbol", {}, null);
    expect(p).toMatchObject({ scoreA: 1, scoreB: 3, winnerTeam: "B", matchOutcome: "win", isWin: true, participantIds: [U, "o"] });
    expect(p.teamStats).toEqual({ [U]: 3, o: 1 });
    expect(reportPayload({ ...d, winner: "A" }, U, "Pádel", {}, null)).toMatchObject({ winnerTeam: "A", matchOutcome: "loss", goals: 0 });
    expect(reportIssue({ ...d, assignments: { [U]: "A", o: "A" } }, U)).toMatch(/A y B/);
    expect(reportPayload({ ...d, teamId: "", goals: 40 }, U, "Fútbol", {}, null)).toMatchObject({ goals: 15, matchOutcome: "win" });
  });
});
