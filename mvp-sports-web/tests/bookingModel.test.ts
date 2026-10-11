import { describe, it, expect } from "vitest";
import { normalizeBooking, isReal, countsAsIncome, bookingLabel } from "../utils/bookingModel";

const ts = (iso: string) => ({ toDate: () => new Date(iso) });

describe("normalizeBooking", () => {
  it("unifica precio, fecha y hora de las variantes históricas", () => {
    const a = normalizeBooking("a", { totalPrice: 20000, date: ts("2026-10-20T22:00:00Z"), startTime: "19:00", paymentStatus: "paid" });
    const b = normalizeBooking("b", { price: "18000", startTime: ts("2026-10-20T22:00:00Z"), paymentStatus: "PAID" });
    const c = normalizeBooking("c", { finalPrice: 15000, date: ts("2026-10-20T22:00:00Z"), startTime: "9:00" });
    expect([a.price, b.price, c.price]).toEqual([20000, 18000, 15000]);
    expect(a.start?.toISOString()).toBe("2026-10-20T22:00:00.000Z");
    expect(b.start?.toISOString()).toBe("2026-10-20T22:00:00.000Z");
    expect(a.startTime).toBe("19:00");
    expect(c.startTime).toBe("09:00");
    expect(b.payment).toBe("paid");
    expect(b.startTime).toBe("19:00"); // tomada del Timestamp, en hora de Chile
  });

  it("reconoce la inasistencia registrada de cualquier forma", () => {
    for (const d of [{ status: "no-show" }, { paymentStatus: "no-show" }, { noShow: true }, { notes: "Marcado como inasistencia" }]) {
      const b = normalizeBooking("x", { paymentStatus: "paid", ...d });
      expect(b.isNoShow).toBe(true);
      expect(b.state).toBe("no-show");
    }
  });

  it("deriva el estado desde check-in/check-out y anulación", () => {
    expect(normalizeBooking("x", { paymentStatus: "paid" }).state).toBe("confirmed");
    expect(normalizeBooking("x", { paymentStatus: "paid", checkIn: true }).state).toBe("active");
    expect(normalizeBooking("x", { paymentStatus: "paid", checkIn: true, checkOut: true }).state).toBe("completed");
    expect(normalizeBooking("x", { paymentStatus: "paid", status: "cancelled" }).state).toBe("cancelled");
  });
});

describe("reglas sobre el modelo", () => {
  const paid = normalizeBooking("p", { paymentStatus: "paid", totalPrice: 10000 });
  const cancelledPaid = normalizeBooking("c", { paymentStatus: "paid", status: "cancelled" });
  const refunded = normalizeBooking("r", { paymentStatus: "refunded", status: "cancelled" });
  const pending = normalizeBooking("n", { paymentStatus: "pending" });
  const noShow = normalizeBooking("s", { paymentStatus: "paid", status: "no-show" });

  it("solo los checkout pagados son reservas reales", () => {
    expect([paid, cancelledPaid, refunded, noShow].every(isReal)).toBe(true);
    expect(isReal(pending)).toBe(false);
  });
  it("ingreso: pagadas vigentes e inasistencias; no anuladas ni reembolsadas", () => {
    expect([paid, noShow].every(countsAsIncome)).toBe(true);
    expect([cancelledPaid, refunded, pending].some(countsAsIncome)).toBe(false);
  });
  it("la etiqueta prioriza reembolso, inasistencia y anulación", () => {
    expect(bookingLabel(paid)).toBe("Pagado");
    expect(bookingLabel(cancelledPaid)).toBe("Anulada");
    expect(bookingLabel(refunded)).toBe("Reembolsado");
    expect(bookingLabel(noShow)).toBe("Inasistencia");
  });
});
