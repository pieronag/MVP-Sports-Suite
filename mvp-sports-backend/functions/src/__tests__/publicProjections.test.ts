import {describe, expect, it} from "vitest";
import {operationalDay, slotKey} from "../publicProjections";

describe("operationalDay", () => {
  it("bloque de la tarde pertenece al mismo día (Chile)", () => {
    // 2026-10-10 20:00 en Chile (UTC-3 en horario de verano) = 23:00 UTC
    expect(operationalDay(new Date("2026-10-10T23:00:00Z"), "20:00")).toBe("2026-10-10");
  });
  it("bloque de madrugada pertenece al día operativo anterior", () => {
    // 2026-10-11 01:00 Chile = 04:00 UTC → día operativo 10
    expect(operationalDay(new Date("2026-10-11T04:00:00Z"), "01:00")).toBe("2026-10-10");
  });
  it("respeta el horario de invierno (UTC-4)", () => {
    // 2026-07-15 20:00 Chile (UTC-4) = 2026-07-16 00:00 UTC
    expect(operationalDay(new Date("2026-07-16T00:00:00Z"), "20:00")).toBe("2026-07-15");
  });
});

describe("slotKey", () => {
  it("ignora partidos internos y reservas sin cancha", () => {
    expect(slotKey({isInternalMatch: true, courtId: "c", startTime: "20:00", date: new Date()})).toBeNull();
    expect(slotKey({startTime: "20:00", date: new Date()})).toBeNull();
  });
  it("arma el id cancha_día", () => {
    expect(slotKey({courtId: "c1", startTime: "20:00", date: new Date("2026-10-10T23:00:00Z")}))
      .toEqual({docId: "c1_2026-10-10", time: "20:00"});
  });
});
