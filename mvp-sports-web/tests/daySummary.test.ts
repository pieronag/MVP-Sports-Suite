import { describe, it, expect } from "vitest";
import { summarizeDay } from "../utils/daySummary";
import { normalizeBooking } from "../utils/bookingModel";

const ts = (iso: string) => ({ toDate: () => new Date(iso) });
const now = new Date("2026-10-20T22:30:00Z"); // 19:30 Chile
const courts = [{ id: "c1", name: "Cancha 1" }, { id: "c2", name: "Cancha 2" }];
const bookings = [
  normalizeBooking("a", { courtId: "c1", clientName: "Ana", paymentStatus: "paid", totalPrice: 20000, date: ts("2026-10-20T22:00:00Z"), startTime: "19:00" }),
  normalizeBooking("b", { courtId: "c2", clientName: "Beto", paymentStatus: "paid", totalPrice: 18000, date: ts("2026-10-20T23:00:00Z"), startTime: "20:00" }),
  normalizeBooking("c", { courtId: "c2", clientName: "Caro", paymentStatus: "paid", status: "cancelled", totalPrice: 18000, date: ts("2026-10-20T22:00:00Z"), startTime: "19:00" }),
  normalizeBooking("d", { courtId: "c1", clientName: "Dani", paymentStatus: "paid", totalPrice: 15000, date: ts("2026-10-20T15:00:00Z"), startTime: "12:00", status: "no-show" }),
];

describe("summarizeDay", () => {
  const s = summarizeDay(bookings, courts, 10, now);
  it("cancha en uso según el instante real, no la hora del dispositivo", () => {
    expect(s.courtStatuses.map((c) => c.isOccupied)).toEqual([true, false]);
    expect(s.courtStatuses[0].currentBooking).toBe("Ana");
    expect(s.activeNow).toBe(1);
  });
  it("caja: pagadas vigentes + inasistencias; anuladas fuera", () => {
    expect(s.revenueToday).toBe(53000);
    expect(s.avgTicket).toBe(Math.round(53000 / 3));
  });
  it("reservas del día y próximas excluyen anuladas e inasistencias", () => {
    expect(s.todayCount).toBe(2);
    expect(s.nextBookings.map((b) => b.clientName)).toEqual(["Ana", "Beto"]);
    expect(s.occupancyRate).toBe(10); // 2 h de 20 h de capacidad
  });
});
