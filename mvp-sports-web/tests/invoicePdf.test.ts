import { describe, it, expect, vi } from "vitest";
vi.mock("@/services/client/data/bookings", () => ({ listBookings: vi.fn() }));
import { monthRange } from "../services/client/invoicePdf";

// Mes en hora de Chile (UTC-3 en verano, UTC-4 en invierno)
describe("monthRange", () => {
  it("cubre el mes completo, del 1 a las 00:00 al último instante, en hora de Chile", () => {
    const { from, to } = monthRange("2026-07"); // invierno: UTC-4
    expect(from.toISOString()).toBe("2026-07-01T04:00:00.000Z");
    expect(to.toISOString()).toBe("2026-08-01T03:59:59.999Z");
  });
  it("diciembre cruza al año siguiente", () => {
    const { from, to } = monthRange("2026-12"); // verano: UTC-3
    expect(from.toISOString()).toBe("2026-12-01T03:00:00.000Z");
    expect(to.toISOString()).toBe("2027-01-01T02:59:59.999Z");
  });
});
