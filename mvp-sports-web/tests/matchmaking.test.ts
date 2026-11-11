import { describe, it, expect } from "vitest";
import { teamPostIssue, playerPostIssue, inZone, widenSearch, challengeView, editEntryIssue, matchSport } from "../utils/matchmaking";

describe("publicaciones de Partidos", () => {
  it("un equipo necesita equipo, deporte, región y comuna", () => {
    expect(teamPostIssue({})).toMatch(/equipo/);
    expect(teamPostIssue({ teamId: "t", sport: "Fútbol" })).toMatch(/región/); // antes se publicaba sin zona
    expect(teamPostIssue({ teamId: "t", sport: "Fútbol", region: "O'Higgins" })).toMatch(/comuna/);
    expect(teamPostIssue({ teamId: "t", sport: "Fútbol", region: "O'Higgins", communes: ["Rancagua"] })).toBeNull();
  });
  it("un jugador necesita deporte, región y comuna", () => {
    expect(playerPostIssue({ sports: [] })).toMatch(/deporte/);
    expect(playerPostIssue({ sports: ["Pádel"], region: "O'Higgins", communes: ["Rancagua"] })).toBeNull();
  });
});


describe("Partidos: filtros y retos", () => {
  it("zona: región y comunas, aceptando la comuna suelta antigua", () => {
    expect(inZone({ region: "Metropolitana", communes: ["Ñuñoa"] }, "Metropolitana", ["Ñuñoa", "Macul"])).toBe(true);
    expect(inZone({ region: "Metropolitana", commune: "Macul" }, "Metropolitana", ["Macul"])).toBe(true);
    expect(inZone({ region: "Valparaíso" }, "Metropolitana", [])).toBe(false);
    expect(inZone({}, "", [])).toBe(true);
  });
  it("amplía la búsqueda de a un paso", () => {
    expect(widenSearch({ sport: "Pádel", region: "RM", communes: ["Ñuñoa"] })?.next.communes).toEqual([]);
    expect(widenSearch({ sport: "Pádel", region: "RM", communes: [] })?.next.region).toBe("");
    expect(widenSearch({ sport: "Pádel", region: "", communes: [] })?.label).toBe("Ver todos los deportes");
    expect(widenSearch({ sport: "", region: "", communes: [] })).toBeNull();
  });
  it("el reto se lee desde cada lado", () => {
    const c = { type: "team_vs_team" as const, status: "pending", senderId: "a", receiverId: "b", challengerTeamName: "Rojos", challengedTeamName: "Azules", challengerTeamId: "r", challengedTeamId: "z" };
    expect(challengeView(c, "b")).toMatchObject({ title: "vs Rojos", otherTeamId: "r", mustAnswer: true, status: "Te retaron" });
    expect(challengeView(c, "a")).toMatchObject({ title: "vs Azules", otherTeamId: "z", mustAnswer: false, status: "Esperando respuesta" });
  });
  it("valida la edición y normaliza deportes", () => {
    expect(editEntryIssue({ type: "player", sports: [] })).toMatch(/deporte/);
    expect(editEntryIssue({ type: "team", description: "ok" })).toBeNull();
    expect(matchSport("padel")).toBe("Pádel");
  });
});
