import { describe, it, expect } from "vitest";
import { fromBooking, fromRegistration, fromEnrollment, incomeTotals } from "../utils/incomeModel";
import { normalizeBooking } from "../utils/bookingModel";

const ts = (iso: string) => ({ toDate: () => new Date(iso) });

describe("incomeModel", () => {
  const items = [
    fromBooking(normalizeBooking("b1", { paymentStatus: "paid", totalPrice: 20000, date: ts("2026-10-20T22:00:00Z"), startTime: "19:00", endTime: "20:00" })),
    fromBooking(normalizeBooking("b2", { paymentStatus: "paid", status: "cancelled", totalPrice: 18000, date: ts("2026-10-20T22:00:00Z") })),
    fromRegistration("r1", { paymentStatus: "paid", paidAmount: 30000, status: "confirmed", createdAt: ts("2026-10-05T12:00:00Z") }, "Copa"),
    fromRegistration("r2", { paymentStatus: "refunded", paidAmount: 30000, createdAt: ts("2026-10-05T12:00:00Z") }, "Copa"),
    fromEnrollment("e1", { paymentStatus: "paid", price: 25000, status: "active", className: "Escuela", createdAt: ts("2026-10-06T12:00:00Z") }),
    fromEnrollment("e2", { paymentStatus: "paid", price: 25000, status: "cancelled", createdAt: ts("2026-10-06T12:00:00Z") }),
  ];
  it("cada tipo decide si suma; etiquetas claras", () => {
    expect(items.map((i) => i.counts)).toEqual([true, false, true, false, true, false]);
    expect(items.map((i) => i.label)).toEqual(["Pagado", "Anulada", "Pagado", "Reembolsado", "Pagado", "Anulada"]);
    expect(items[0].timeRange).toBe("19:00 - 20:00");
    expect(items[4].detail).toBe("Academia: Escuela");
  });
  it("totales por tipo solo con lo que suma", () => {
    expect(incomeTotals(items)).toEqual({ total: 75000, reserva: 20000, torneo: 30000, academia: 25000 });
  });
});
