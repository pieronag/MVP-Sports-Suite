import { describe, it, expect } from "vitest";
import { invoiceFor } from "../utils/invoiceCalc";
import { normalizeBooking } from "../utils/bookingModel";

const b = (id: string, d: Record<string, unknown>) => normalizeBooking(id, { tenantId: "t1", ...d });
const plans = [{ id: "pro", name: "Pro", price: 30000, commission: 5 }];

describe("invoiceFor", () => {
  const bookings = [
    b("1", { paymentStatus: "paid", totalPrice: 20000 }),
    b("2", { paymentStatus: "paid", totalPrice: 20000, checkIn: true, status: "active" }),
    b("3", { paymentStatus: "paid", totalPrice: 20000, status: "no-show" }), // pago retenido: genera comisión
    b("4", { paymentStatus: "paid", totalPrice: 20000, status: "cancelled" }), // anulada: no
    b("5", { paymentStatus: "refunded", totalPrice: 20000, status: "cancelled" }), // reembolsada: no
    b("6", { paymentStatus: "pending", totalPrice: 20000 }), // checkout sin pagar: no
    normalizeBooking("7", { tenantId: "otro", paymentStatus: "paid", totalPrice: 99000 }),
  ];
  it("comisión sobre lo cobrado (incluye check-in e inasistencia) + plan", () => {
    const r = invoiceFor({ id: "t1", planId: "PRO" }, bookings, plans, 8);
    expect(r.breakdown).toEqual({ planName: "Pro", planCost: 30000, commissionRate: 5, commissionTotal: 3000, totalBookings: 3, totalRevenue: 60000 });
    expect(r.amount).toBe(33000);
  });
  it("sin plan reconocido usa la comisión global y costo 0", () => {
    const r = invoiceFor({ id: "t1", plan: "desconocido" }, bookings, plans, 8);
    expect(r.breakdown.commissionRate).toBe(8);
    expect(r.amount).toBe(4800);
  });
});
