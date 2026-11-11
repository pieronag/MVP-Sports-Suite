import { describe, it, expect } from "vitest";
import { roundRobin, knockout, groups, standings, stageName, type FixtureMatch } from "../utils/fixture";

const teams = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `t${i + 1}`, name: `Equipo ${i + 1}` }));
const pairKey = (m: FixtureMatch) => [m.team1_id, m.team2_id].sort().join("-");

describe("roundRobin", () => {
  it("todos contra todos exactamente una vez (par e impar)", () => {
    for (const n of [4, 5, 6]) {
      const { matches, totalRounds } = roundRobin(teams(n));
      expect(matches.length).toBe((n * (n - 1)) / 2);
      expect(new Set(matches.map(pairKey)).size).toBe(matches.length);
      expect(totalRounds).toBe(n % 2 ? n : n - 1);
      expect(matches.some((m) => m.team1_id === "bye" || m.team2_id === "bye")).toBe(false);
    }
  });
  it("nadie juega dos veces en la misma fecha", () => {
    const { matches } = roundRobin(teams(6));
    const byRound = new Map<number, string[]>();
    for (const m of matches) byRound.set(m.round, [...(byRound.get(m.round) || []), m.team1_id, m.team2_id]);
    for (const ids of byRound.values()) expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("knockout", () => {
  it("cuadro de potencia de 2 y nunca descanso contra descanso", () => {
    for (const n of [2, 3, 5, 6, 7, 8, 9]) {
      const { matches, totalRounds } = knockout(teams(n));
      expect(matches.length).toBe(2 ** totalRounds / 2);
      expect(matches.some((m) => m.team1_id === "bye" && m.team2_id === "bye")).toBe(false);
      expect(matches.every((m) => m.team1_id !== "bye")).toBe(true);
      const real = matches.flatMap((m) => [m.team1_id, m.team2_id]).filter((id) => id !== "bye");
      expect(new Set(real).size).toBe(n); // todos los equipos aparecen una vez
    }
  });
  it("quien descansa avanza (partido terminado 1-0)", () => {
    const { matches } = knockout(teams(5));
    const byes = matches.filter((m) => m.team2_id === "bye");
    expect(byes.length).toBe(3);
    expect(byes.every((m) => m.status === "finished" && m.score1 === 1)).toBe(true);
  });
  it("nombres de fase", () => {
    expect(stageName(3, 3)).toBe("Final");
    expect(stageName(3, 2)).toBe("Semifinal");
    expect(stageName(3, 1)).toBe("Cuartos de Final");
  });
});

describe("groups", () => {
  it("usa a todos los inscritos (antes solo los primeros 4)", () => {
    const { groups: g, matches } = groups(teams(8));
    expect(g.length).toBe(2);
    expect(g.flatMap((x) => x.teams).length).toBe(8);
    expect(matches.length).toBe(2 * 6); // 6 partidos por grupo de 4
    expect(matches.every((m) => m.group)).toBe(true);
  });
  it("con pocos equipos, un solo grupo", () => {
    expect(groups(teams(3)).groups.length).toBe(1);
  });
});

describe("standings", () => {
  const m = (a: string, b: string, s1: number, s2: number): FixtureMatch => ({ id: a + b, team1_id: a, team1_name: a.toUpperCase(), team2_id: b, team2_name: b.toUpperCase(), score1: s1, score2: s2, status: "finished", round: 1 });
  it("3 por triunfo, 1 por empate y desempate por diferencia de goles", () => {
    const t = standings([m("a", "b", 2, 0), m("b", "c", 1, 1), m("a", "c", 0, 1), m("c", "d", 3, 0)]);
    expect(t[0].id).toBe("c"); // 7 pts
    expect(t.find((x) => x.id === "a")!.pts).toBe(3);
    expect(t.find((x) => x.id === "b")!.pe).toBe(1);
  });
  it("dos equipos con el mismo nombre no se mezclan", () => {
    const t = standings([{ ...m("x", "y", 1, 0), team1_name: "Leones", team2_name: "Leones" }]);
    expect(t.length).toBe(2);
  });
  it("ignora partidos pendientes y descansos", () => {
    expect(standings([{ ...m("a", "bye", 1, 0) }, { ...m("a", "b", 0, 0), status: "pending", score1: null, score2: null }]).length).toBe(0);
  });
});
