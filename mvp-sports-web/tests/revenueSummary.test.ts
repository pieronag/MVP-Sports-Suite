import { describe, it, expect } from "vitest";
import { rangeFor, summarizeRevenue } from "../utils/revenueSummary";
import { normalizeBooking } from "../utils/bookingModel";

const ts = (iso: string) => ({ toDate: () => new Date(iso) });
const now = new Date("2026-10-20T15:00:00Z"); // 20-oct 12:00 en Chile (-03)

describe("rangeFor", () => {
  it("hoy va de 00:00 a 23:59:59.999 en Chile", () => {
    const r = rangeFor("today", now);
    expect(r.from.toISOString()).toBe("2026-10-20T03:00:00.000Z");
    expect(r.to.toISOString()).toBe("2026-10-21T02:59:59.999Z");
  });
  it("7 días incluye hoy y los 6 anteriores; mes completo", () => {
    expect(rangeFor("7d", now).from.toISOString()).toBe("2026-10-14T03:00:00.000Z");
    const m = rangeFor("month", now);
    expect(m.from.toISOString()).toBe("2026-10-01T03:00:00.000Z");
    expect(m.to.toISOString()).toBe("2026-11-01T02:59:59.999Z");
  });
});

describe("summarizeRevenue", () => {
  const list = [
    normalizeBooking("1", { paymentStatus: "paid", totalPrice: 20000, tenantId: "a", date: ts("2026-10-20T22:00:00Z") }),
    // 21-oct 00:30 UTC = 20-oct 21:30 en Chile → cuenta como hoy
    normalizeBooking("2", { paymentStatus: "paid", totalPrice: 10000, tenantId: "b", date: ts("2026-10-21T00:30:00Z") }),
    normalizeBooking("3", { paymentStatus: "paid", totalPrice: 5000, tenantId: "a", date: ts("2026-10-18T22:00:00Z") }),
    normalizeBooking("4", { paymentStatus: "paid", status: "cancelled", totalPrice: 99000, tenantId: "a", date: ts("2026-10-20T22:00:00Z") }),
    normalizeBooking("5", { paymentStatus: "pending", totalPrice: 40000, tenantId: "a", date: ts("2026-10-20T22:00:00Z") }),
  ];
  const s = summarizeRevenue(list, (id) => ({ a: "Uno", b: "Dos" } as any)[id], now);
  it("suma solo ingresos reales y separa hoy, por día y por recinto", () => {
    expect(s.revenue).toBe(35000);
    expect(s.revenueToday).toBe(30000);
    expect(s.incomeCount).toBe(3);
    expect(s.byDay).toEqual([{ name: "18/10", valor: 5000 }, { name: "20/10", valor: 30000 }]);
    expect(s.byVenue).toEqual([{ name: "Uno", value: 25000 }, { name: "Dos", value: 10000 }]);
  });
});
