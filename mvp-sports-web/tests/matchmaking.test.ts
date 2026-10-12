import { describe, it, expect } from "vitest";
import { teamPostIssue, playerPostIssue } from "../utils/matchmaking";

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
