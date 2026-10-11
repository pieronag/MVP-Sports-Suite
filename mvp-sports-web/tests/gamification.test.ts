import { describe, it, expect } from "vitest";
import { computeProgress, normalizeSettings } from "@/utils/gamificationCalc";

const NOW = new Date("2026-10-11T15:00:00Z").getTime();
const past = (days: number) => new Date(NOW - days * 86_400_000);
const cfg = normalizeSettings({
  gamification: { xpPerMatch: 100, xpPerCheckin: 50, xpPerWin: 150, xpPerLoss: 50, xpPerGoal: 25, xpPerAssist: 15, xpPerMvp: 200, xpPerNoShow: 150 },
  badges: { scorer: { bronze: 3, silver: 10, gold: 30 } },
  badgeXpValues: { bronze: 50, silver: 150, gold: 500 },
});
const user = { mainSport: "Fútbol", createdAt: past(10).toISOString() };

describe("computeProgress", () => {
  it("un jugador sin reservas parte en 0 y Bronce", () => {
    const p = computeProgress("u1", user, [], cfg, NOW);
    expect(p.xp).toBe(0);
    expect(p.tier).toBe("BRONCE");
    expect(p.ovr).toBe(40);
  });

  it("suma partido, check-in, victoria, goles y MVP de una reserva real", () => {
    const b = { userId: "u1", date: past(1), startTime: "20:00", paymentStatus: "paid", checkIn: true, sport: "futbol",
      teamAssignments: { u1: "A", u2: "B" }, winnerTeam: "A", teamStats: { u1: 2 }, teamAssists: { u1: 1 }, mvpUserId: "u1" };
    const p = computeProgress("u1", user, [b], cfg, NOW);
    // 100 partido + 50 check-in + 150 victoria + 2*25 goles + 15 asistencia + 200 MVP
    expect(p.xp).toBe(565);
    expect(p.stats).toMatchObject({ played: 1, won: 1, lost: 0, goals: 2, assists: 1, mvps: 1, checkins: 1 });
    expect(p.stats.night_matches).toBe(1);
  });

  it("el rival suma la derrota, no la victoria", () => {
    const b = { userId: "u1", date: past(1), startTime: "10:00", paymentStatus: "paid", checkIn: true, participantIds: ["u2"],
      teamAssignments: { u1: "A", u2: "B" }, winnerTeam: "A" };
    const p = computeProgress("u2", user, [b], cfg, NOW);
    expect(p.stats).toMatchObject({ played: 1, won: 0, lost: 1, checkins: 0 });
    expect(p.xp).toBe(50); // 100 partido - 50 derrota; el check-in es del titular
  });

  it("resta por inasistencia y no cuenta canceladas ni futuras", () => {
    const bookings = [
      { userId: "u1", date: past(2), startTime: "18:00", paymentStatus: "paid", checkIn: true },
      { userId: "u1", date: past(3), startTime: "18:00", status: "no-show" },
      { userId: "u1", date: past(4), startTime: "18:00", status: "cancelled" },
      { userId: "u1", date: new Date(NOW + 86_400_000), startTime: "18:00", paymentStatus: "paid" },
    ];
    const p = computeProgress("u1", user, bookings, cfg, NOW);
    expect(p.stats).toMatchObject({ played: 1, noShows: 1 });
    expect(p.xp).toBe(0); // 100 + 50 - 150, sin bajar de 0
  });

  it("otorga logros y su bonificación", () => {
    const b = { userId: "u1", isInternalMatch: true, date: past(1), startTime: "19:00", teamStats: { u1: 3 } };
    const p = computeProgress("u1", user, [b], cfg, NOW);
    expect(p.badges).toEqual([{ id: "scorer", tier: "bronze", value: 3 }]);
    expect(p.xp).toBe(100 + 75 + 50); // partido + 3 goles + logro bronce
  });

  it("sube de nivel según los tramos", () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ userId: "u1", isInternalMatch: true, date: past(i + 1), startTime: "15:00" }));
    const p = computeProgress("u1", user, many, cfg, NOW);
    expect(p.xp).toBe(1200);
    expect(p.tier).toBe("PLATA");
    expect(p.ovr).toBeGreaterThan(40);
  });
});
