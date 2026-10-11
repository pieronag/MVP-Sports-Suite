import { describe, it, expect } from "vitest";
import { tournamentIssue } from "../utils/tournament";

const ok = { name: "Copa E2E", sport: "Fútbol", tenantId: "t1", maxTeams: 8, price: 20000, tournamentStartDate: "2026-11-10", tournamentEndDate: "2026-11-30", registrationStartDate: "2026-10-15", registrationEndDate: "2026-11-05", startTime: "19:00", endTime: "23:00" };
describe("tournamentIssue", () => {
  it("acepta un torneo completo", () => { expect(tournamentIssue(ok)).toBeNull(); });
  it("rechaza el formulario vacío", () => { expect(tournamentIssue({})).toMatch(/nombre/); });
  it("exige recinto, equipos y fechas coherentes", () => {
    expect(tournamentIssue({ ...ok, tenantId: "" })).toMatch(/recinto/);
    expect(tournamentIssue({ ...ok, maxTeams: 1 })).toMatch(/2 equipos/);
    expect(tournamentIssue({ ...ok, price: -1 })).toMatch(/negativa/);
    expect(tournamentIssue({ ...ok, tournamentEndDate: "2026-11-01" })).toMatch(/terminar antes/);
    expect(tournamentIssue({ ...ok, registrationEndDate: "2026-11-20" })).toMatch(/antes de que empiece/);
    expect(tournamentIssue({ ...ok, endTime: "18:00" })).toMatch(/hora de término/);
  });
});

import { registrationState } from "../utils/tournament";
describe("registrationState", () => {
  const t = { registrationStartDate: "2026-10-15", registrationEndDate: "2026-11-05" };
  it("antes, durante y después (día de Chile)", () => {
    expect(registrationState(t, new Date("2026-10-14T15:00:00Z"))).toBe("not_open");
    expect(registrationState(t, new Date("2026-10-15T15:00:00Z"))).toBe("open");
    // 5-nov 23:30 en Chile aún está abierto aunque en UTC sea 6-nov
    expect(registrationState(t, new Date("2026-11-06T02:30:00Z"))).toBe("open");
    expect(registrationState(t, new Date("2026-11-06T15:00:00Z"))).toBe("closed");
    expect(registrationState({ status: "finished" })).toBe("closed");
  });
});
