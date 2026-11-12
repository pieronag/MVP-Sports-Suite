import { describe, it, expect } from "vitest";
import { checkinState, checkinBlocker, checkinOpensAt, summarizeCheckins, findBookings, canFlagNoShow, matchesFilter, type CheckinBooking } from "../utils/checkinDay";
import { chileDateTime } from "../utils/chileTime";

// Reserva hoy a las 20:00 (hora de Chile)
const DAY = "2026-11-12";
const at = (h: number, m = 0) => chileDateTime(DAY, h, m);
const b = (over: Partial<CheckinBooking> = {}): CheckinBooking => ({
  id: "abcdefAB12CD", clientName: "Ana Pérez", courtName: "Cancha 1", start: at(12), startTimeStr: "20:00",
  status: "confirmed", paymentStatus: "paid", price: 20000, ...over,
});

describe("checkinDay", () => {
  it("estado según la hora, con las reglas del servidor", () => {
    expect(checkinState(b(), at(17, 30))).toBe("early");
    expect(checkinState(b(), at(18, 0))).toBe("ready");
    expect(checkinState(b(), at(20, 10))).toBe("ready");
    expect(checkinState(b(), at(20, 20))).toBe("late");
    expect(checkinState(b({ checkIn: true }), at(20, 20))).toBe("in");
    expect(checkinState(b({ paymentStatus: "refunded", status: "cancelled" }), at(19))).toBe("cancelled");
    expect(checkinState(b({ noShow: true, status: "cancelled" }), at(21))).toBe("noshow");
    expect(checkinState(b({ paymentStatus: "pending" }), at(19))).toBe("unpaid");
  });

  it("la inasistencia solo se puede marcar cuando ya empezó", () => {
    expect(canFlagNoShow(b(), at(19, 59))).toBe(false);
    expect(canFlagNoShow(b(), at(20, 1))).toBe(true);
    expect(canFlagNoShow(b({ checkIn: true }), at(21))).toBe(false);
  });

  it("explica por qué no puede ingresar", () => {
    expect(checkinBlocker(b(), at(19))).toBeNull();
    expect(checkinBlocker(b(), at(15))).toMatch(/18:00/);
    expect(checkinOpensAt("01:30")).toBe("23:30");
  });

  it("conteos y montos del día", () => {
    const list = [b({ id: "1", checkIn: true }), b({ id: "2" }), b({ id: "3", status: "cancelled", paymentStatus: "refunded" }), b({ id: "4", noShow: true })];
    const s = summarizeCheckins(list, at(20, 30));
    expect(s.counts).toEqual({ pending: 0, in: 1, noshow: 2, cancelled: 1, all: 4 });
    expect(s.lateToFlag).toBe(1);
    expect(s.expected).toBe(60000);
    expect(s.collectedIn).toBe(20000);
    expect(matchesFilter("late", "noshow")).toBe(true);
  });

  it("busca por QR, código del ticket o nombre (sin tildes) y devuelve todas si hay varias", () => {
    const list = [b({ id: "xxxxxxAB12CD", clientName: "Ana Pérez" }), b({ id: "yyyyyyZZ99XY", clientName: "Ana Soto" }), b({ id: "zzzzzzQQ11WW", clientName: "Luis" })];
    expect(findBookings(list, "xxxxxxAB12CD").map((x) => x.clientName)).toEqual(["Ana Pérez"]);
    expect(findBookings(list, " #ab 12cd ").map((x) => x.clientName)).toEqual(["Ana Pérez"]);
    expect(findBookings(list, "perez")).toHaveLength(1);
    expect(findBookings(list, "ana")).toHaveLength(2);
    expect(findBookings(list, "a")).toEqual([]);
  });
});
