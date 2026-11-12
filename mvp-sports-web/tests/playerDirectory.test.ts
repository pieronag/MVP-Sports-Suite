import { describe, it, expect } from "vitest";
import { toPlayerRow, filterPlayers, sortPlayers, pageWindow, sportsOf, playersCsv } from "../utils/playerDirectory";

const teams = [{ name: "Halcones", ownerId: "a", members: ["a", "b"] }, { name: "Rojos", ownerId: "z", members: ["b"] }];
const rows = [
  toPlayerRow("a", { role: "player", displayName: "Ana Pérez", email: "ana@example.test", ovr: 70, mainSport: "padel", stats: { played: 10, won: 7, goals: 3 } }, teams)!,
  toPlayerRow("b", { role: "player", displayName: "Bruno", ovr: 55, mainSport: "Pádel", status: "suspended", strikes: 2 }, teams)!,
  toPlayerRow("c", { role: "player", displayName: "=Carla", ovr: 55, mainSport: "Tenis" }, teams)!,
];

describe("playerDirectory", () => {
  it("solo jugadores, con equipos, capitanía y deporte normalizado", () => {
    expect(toPlayerRow("s", { role: "superadmin" }, teams)).toBeNull();
    expect(rows[0]).toMatchObject({ captain: true, teams: ["Halcones"], winRate: 70, goalsPerMatch: 0.3, mainSport: "Pádel" });
    expect(rows[1]).toMatchObject({ captain: false, suspended: true, teams: ["Halcones", "Rojos"], winRate: 0 });
  });

  it("filtra sin tildes, por equipo, estado y deporte", () => {
    expect(filterPlayers(rows, { search: "perez", filter: "Todos", sport: "Todos" }).map((u) => u.id)).toEqual(["a"]);
    expect(filterPlayers(rows, { search: "rojos", filter: "Todos", sport: "Todos" }).map((u) => u.id)).toEqual(["b"]);
    expect(filterPlayers(rows, { search: "", filter: "Con strikes", sport: "Todos" }).map((u) => u.id)).toEqual(["b"]);
    expect(filterPlayers(rows, { search: "", filter: "Todos", sport: "Pádel" })).toHaveLength(2);
    expect(sportsOf(rows)).toEqual(["Todos", "Pádel", "Tenis"]);
  });

  it("ordena con desempate estable por nombre", () => {
    expect(sortPlayers(rows, "ovr", "desc").map((u) => u.id)).toEqual(["a", "c", "b"]);
    expect(sortPlayers(rows, "name", "asc")[0].id).toBe("c");
  });

  it("paginación con saltos", () => {
    expect(pageWindow(1, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(pageWindow(6, 20)).toEqual([1, null, 5, 6, 7, null, 20]);
    expect(pageWindow(1, 20)).toEqual([1, 2, null, 20]);
  });

  it("CSV sin fórmulas inyectadas", () => {
    const csv = playersCsv(rows);
    expect(csv).toContain(`"'=Carla"`);
    expect(csv.split("\r\n")).toHaveLength(4);
  });
});
