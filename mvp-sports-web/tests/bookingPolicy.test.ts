import { describe, it, expect } from "vitest";
import { canPlayerCancel, canCheckIn, canMarkNoShow, refundFor } from "@/utils/bookingPolicy";
import { hoursUntilStart } from "@/utils/chileTime";

// "Ahora" fijo: 11 oct 2026 12:00 en Chile (UTC-3 en horario de verano)
const NOW = new Date("2026-10-11T15:00:00Z");
const chileHHMM = (d: Date) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "America/Santiago", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);
// Reserva que empieza `h` horas después de NOW (date = instante de inicio, startTime = hora de Chile)
const startingIn = (h: number, extra: any = {}) => {
  const start = new Date(NOW.getTime() + h * 3_600_000);
  return { date: start, startTime: chileHHMM(start), status: "confirmed", paymentStatus: "paid", ...extra };
};

describe("hoursUntilStart", () => {
  it("calcula horas en hora de Chile, también pasada la medianoche", () => {
    expect(hoursUntilStart(startingIn(5), NOW)).toBeCloseTo(5, 5);
    expect(hoursUntilStart(startingIn(14), NOW)).toBeCloseTo(14, 5); // 02:00 del día siguiente
    expect(hoursUntilStart(startingIn(-1), NOW)).toBeCloseTo(-1, 5);
  });
  it("devuelve null sin fecha u hora", () => {
    expect(hoursUntilStart({ startTime: "10:00" }, NOW)).toBeNull();
    expect(hoursUntilStart({ date: NOW }, NOW)).toBeNull();
  });
});

describe("cancelación del jugador (24 h)", () => {
  it("permite cancelar con 24 h o más", () => {
    expect(canPlayerCancel(startingIn(24), NOW).ok).toBe(true);
    expect(canPlayerCancel(startingIn(72), NOW).ok).toBe(true);
  });
  it("rechaza con menos de 24 h", () => {
    const d = canPlayerCancel(startingIn(23.9), NOW);
    expect(d.ok).toBe(false);
    if (!d.ok) expect(d.reason).toMatch(/24 horas/);
  });
  it("rechaza reservas canceladas, iniciadas o con check-in", () => {
    expect(canPlayerCancel(startingIn(48, { status: "cancelled" }), NOW).ok).toBe(false);
    expect(canPlayerCancel(startingIn(48, { checkIn: true }), NOW).ok).toBe(false);
    expect(canPlayerCancel(startingIn(48, { status: "no-show" }), NOW).ok).toBe(false);
  });
  it("devuelve el 97% y retiene el 3%", () => {
    expect(refundFor(20000)).toEqual({ fee: 600, refund: 19400 });
    expect(refundFor(0)).toEqual({ fee: 0, refund: 0 });
  });
});

describe("check-in", () => {
  it("abre 2 h antes y cierra 15 min después del inicio", () => {
    expect(canCheckIn(startingIn(2.1), NOW).ok).toBe(false);
    expect(canCheckIn(startingIn(2), NOW).ok).toBe(true);
    expect(canCheckIn(startingIn(0), NOW).ok).toBe(true);
    expect(canCheckIn(startingIn(-0.25), NOW).ok).toBe(true);
    expect(canCheckIn(startingIn(-0.3), NOW).ok).toBe(false);
  });
  it("exige pago online aprobado", () => {
    const d = canCheckIn(startingIn(1, { paymentStatus: "pending" }), NOW);
    expect(d.ok).toBe(false);
    if (!d.ok) expect(d.reason).toMatch(/pago online/);
  });
  it("no repite el ingreso ni acepta canceladas", () => {
    expect(canCheckIn(startingIn(1, { checkIn: true }), NOW).ok).toBe(false);
    expect(canCheckIn(startingIn(1, { status: "cancelled" }), NOW).ok).toBe(false);
  });
});

describe("inasistencia", () => {
  it("solo después del inicio y sin ingreso", () => {
    expect(canMarkNoShow(startingIn(0.5), NOW).ok).toBe(false);
    expect(canMarkNoShow(startingIn(-0.5), NOW).ok).toBe(true);
    expect(canMarkNoShow(startingIn(-0.5, { checkIn: true }), NOW).ok).toBe(false);
  });
});
