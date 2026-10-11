import { describe, it, expect } from "vitest";
import { canonicalSport, sameSport } from "../utils/sports";

describe("canonicalSport", () => {
  it("unifica las variantes encontradas en la base", () => {
    expect(canonicalSport("Padel")).toBe("Pádel");
    expect(canonicalSport("pádel")).toBe("Pádel");
    expect(canonicalSport("futbol")).toBe("Fútbol");
    expect(canonicalSport("futbolito")).toBe("Futbolito");
    expect(canonicalSport("voleibol")).toBe("Vóleibol");
    expect(canonicalSport("Voleibol")).toBe("Vóleibol");
    expect(canonicalSport(" Básquetbol ")).toBe("Básquetbol");
  });
  it("Fútbol y Futbolito siguen siendo distintos; lo desconocido se conserva", () => {
    expect(sameSport("Fútbol", "Futbolito")).toBe(false);
    expect(sameSport("Padel", "Pádel")).toBe(true);
    expect(canonicalSport("Hockey")).toBe("Hockey");
    expect(canonicalSport(null)).toBe("");
  });
});
