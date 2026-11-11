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

import { timeSlotsFor, referencePrice, setSlotPrices } from "../utils/courtConfig";

describe("horario y tarifas", () => {
  const day = (open: string, close: string, isOpen = true) => ({ isOpen, open, close });
  it("tramos de una hora de la apertura más temprana al cierre más tardío", () => {
    expect(timeSlotsFor({ monday: day("09:00", "12:00"), sunday: day("10:00", "14:00") })).toEqual(["09:00", "10:00", "11:00", "12:00", "13:00"]);
  });
  it("cierre después de medianoche y días cerrados", () => {
    expect(timeSlotsFor({ friday: day("22:00", "01:00"), monday: day("06:00", "23:00", false) })).toEqual(["22:00", "23:00", "00:00"]);
    expect(timeSlotsFor({ monday: day("09:00", "10:00", false) })).toEqual([]);
  });
  const slots = ["09:00", "10:00", "11:00"];
  it("precio de referencia: primero el mismo tipo de día, luego cualquiera", () => {
    expect(referencePrice({ "Pádel": { weekday: { "10:00": 8000 } } }, "Pádel", "weekday", slots)).toBe(8000);
    expect(referencePrice({ "Pádel": { weekday: { "11:00": 9000 } } }, "Pádel", "weekend", slots)).toBe(9000);
    expect(referencePrice({}, "Pádel", "weekday", slots)).toBe(0);
  });
  it("completar faltantes no pisa precios y aplicar a todos sí; nada muta el original", () => {
    const base = { "Pádel": { weekday: { "10:00": 12000 }, weekend: { "09:00": 1 } } };
    const filled = setSlotPrices(base, "Pádel", "weekday", slots, 8000, true);
    expect(filled["Pádel"].weekday).toEqual({ "09:00": 8000, "10:00": 12000, "11:00": 8000 });
    expect(filled["Pádel"].weekend).toEqual({ "09:00": 1 });
    expect(setSlotPrices(base, "Pádel", "weekday", slots, 8000)["Pádel"].weekday).toEqual({ "09:00": 8000, "10:00": 8000, "11:00": 8000 });
    expect(base["Pádel"].weekday).toEqual({ "10:00": 12000 });
  });
});
