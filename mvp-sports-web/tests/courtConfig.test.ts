import { describe, it, expect } from "vitest";
import { mergePricing, maintenanceRange, pausedNow } from "../utils/courtConfig";

describe("mergePricing", () => {
  it("une tarifas por nombre oficial y descarta deportes que el recinto no ofrece", () => {
    const m = mergePricing({ Padel: { weekday: { "18:00": 1 } }, Tenis: { weekday: { "18:00": 2 } } }, ["Pádel"]);
    expect(Object.keys(m)).toEqual(["Pádel"]);
    expect(m["Pádel"].weekday["18:00"]).toBe(1);
  });
  it("si hay variantes del mismo deporte, gana la que ya tenía el nombre oficial", () => {
    const m = mergePricing({ Padel: { weekday: { "18:00": 1 } }, "Pádel": { weekday: { "18:00": 9 } } }, ["Pádel"]);
    expect(m["Pádel"].weekday["18:00"]).toBe(9);
  });
});

describe("maintenanceRange", () => {
  it("por horas: inicio y término el mismo día en hora de Chile", () => {
    const r = maintenanceRange({ type: "hours", date: "2026-11-10", startTime: "10:00", endTime: "12:30", endDate: "" });
    expect(r.end.getTime() - r.start.getTime()).toBe(150 * 60_000);
  });
  it("por días: cubre hasta el último segundo del día de término", () => {
    const r = maintenanceRange({ type: "days", date: "2026-11-10", startTime: "", endTime: "", endDate: "2026-11-11" });
    const hours = (r.end.getTime() - r.start.getTime() + 1) / 3_600_000;
    expect(hours).toBe(48);
  });
});

describe("pausedNow", () => {
  it("solo está en pausa dentro de la ventana de mantenimiento", () => {
    const now = Date.now();
    expect(pausedNow({ status: "active" })).toBe(false);
    expect(pausedNow({ status: "maintenance", maintenanceStart: new Date(now - 3_600_000), maintenanceUntil: new Date(now + 3_600_000) })).toBe(true);
    expect(pausedNow({ status: "maintenance", maintenanceStart: new Date(now + 3_600_000), maintenanceUntil: new Date(now + 7_200_000) })).toBe(false);
  });
});
