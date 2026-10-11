import { describe, it, expect } from "vitest";
import { courtBlockedAt } from "../utils/courtAvailability";
import { slotInstant } from "../utils/chileTime";

const H = 3_600_000;
describe("courtBlockedAt", () => {
  const m = { status: "maintenance", maintenanceStart: new Date("2026-10-20T13:00:00Z"), maintenanceUntil: new Date("2026-10-20T16:00:00Z") };
  it("bloquea solo dentro de la ventana", () => {
    const at = (iso: string) => new Date(iso).getTime();
    expect(courtBlockedAt(m, at("2026-10-20T12:00:00Z"), at("2026-10-20T12:00:00Z") + H)).toBe(false);
    expect(courtBlockedAt(m, at("2026-10-20T12:30:00Z"), at("2026-10-20T12:30:00Z") + H)).toBe(true);
    expect(courtBlockedAt(m, at("2026-10-20T15:00:00Z"), at("2026-10-20T15:00:00Z") + H)).toBe(true);
    expect(courtBlockedAt(m, at("2026-10-20T16:00:00Z"), at("2026-10-20T16:00:00Z") + H)).toBe(false);
  });
  it("sin ventana queda bloqueada; activa nunca", () => {
    expect(courtBlockedAt({ status: "maintenance" }, 0, H)).toBe(true);
    expect(courtBlockedAt({ status: "active" }, 0, H)).toBe(false);
  });
  it("slotInstant usa la hora de Chile y pasa la madrugada al día siguiente", () => {
    expect(slotInstant("2026-10-20", "19:00").toISOString()).toBe("2026-10-20T22:00:00.000Z");
    expect(slotInstant("2026-10-20", "01:00").toISOString()).toBe("2026-10-21T04:00:00.000Z");
  });
});

import { operatingDay } from "../utils/chileTime";
describe("operatingDay", () => {
  it("de 06:00 a 05:59; la madrugada pertenece al día anterior", () => {
    const tarde = operatingDay(new Date("2026-10-20T23:00:00Z")); // 20:00 Chile
    expect(tarde.day).toBe("2026-10-20");
    expect(tarde.from.toISOString()).toBe("2026-10-20T09:00:00.000Z");
    expect(tarde.to.toISOString()).toBe("2026-10-21T08:59:59.999Z");
    expect(operatingDay(new Date("2026-10-21T05:30:00Z")).day).toBe("2026-10-20"); // 02:30 Chile
    expect(operatingDay(new Date("2026-10-21T09:30:00Z")).day).toBe("2026-10-21"); // 06:30 Chile
  });
});
