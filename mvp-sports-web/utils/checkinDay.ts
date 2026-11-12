// Check-in del día: en qué estado está cada reserva para recepción, conteos y búsqueda por código o nombre.
// Usa las mismas reglas que el servidor (utils/bookingPolicy), así la pantalla no ofrece acciones que el servidor rechazaría.
import { canCheckIn, canMarkNoShow, CHECKIN_OPENS_HOURS } from "./bookingPolicy";

export interface CheckinBooking {
  id: string;
  clientName: string;
  courtName: string;
  sport?: string;
  start: Date;
  startTimeStr: string; // "HH:MM" en hora de Chile
  endTimeStr?: string | null;
  status: string;
  paymentStatus: string; // paid | refunded | no-show | …
  checkIn?: boolean;
  noShow?: boolean;
  cancelledBy?: string;
  price: number;
}

/**
 * in: ya ingresó · ready: puede ingresar ahora · early: pagada, aún no abre el ingreso · unpaid: sin pago online
 * late: pasó la tolerancia sin ingreso (falta registrar la inasistencia) · noshow: inasistencia registrada · cancelled: anulada
 */
export type CheckinState = "in" | "ready" | "early" | "unpaid" | "late" | "noshow" | "cancelled";

const policyShape = (b: CheckinBooking) => ({ status: b.status, checkIn: b.checkIn, paymentStatus: b.paymentStatus, date: b.start, startTime: b.startTimeStr });

export function checkinState(b: CheckinBooking, now: Date): CheckinState {
  if (b.checkIn) return "in";
  if (b.noShow || b.paymentStatus === "no-show" || b.status === "no-show") return "noshow";
  if (b.status === "cancelled") return "cancelled";
  if (b.paymentStatus !== "paid") return "unpaid";
  if (canCheckIn(policyShape(b), now).ok) return "ready";
  return canMarkNoShow(policyShape(b), now).ok ? "late" : "early";
}

/** ¿Se puede marcar inasistencia ahora? (la reserva ya empezó y no ingresó) */
export const canFlagNoShow = (b: CheckinBooking, now: Date) => canMarkNoShow(policyShape(b), now).ok;

/** Hora a la que se habilita el ingreso ("HH:MM"). */
export function checkinOpensAt(startTimeStr: string) {
  const [h, m] = startTimeStr.split(":").map(Number);
  const mins = ((h * 60 + (m || 0) - CHECKIN_OPENS_HOURS * 60) % 1440 + 1440) % 1440;
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
}

/** Por qué no puede ingresar ahora (null si puede). */
export function checkinBlocker(b: CheckinBooking, now: Date): string | null {
  switch (checkinState(b, now)) {
    case "ready": return null;
    case "in": return `${b.clientName} ya registró su ingreso.`;
    case "unpaid": return "Esta reserva no tiene un pago online aprobado. El jugador debe pagar desde la app para poder ingresar.";
    case "early": return `Aún es temprano: el ingreso se habilita a las ${checkinOpensAt(b.startTimeStr)} hrs.`;
    case "late": return "Pasaron más de 15 minutos del inicio: la reserva se considera inasistencia.";
    case "noshow": return "Esta reserva quedó registrada como inasistencia.";
    case "cancelled": return "La reserva está anulada.";
  }
}

export type CheckinFilter = "pending" | "in" | "noshow" | "cancelled" | "all";
const FILTER_STATES: Record<CheckinFilter, CheckinState[] | null> = {
  pending: ["ready", "early", "unpaid"],
  in: ["in"],
  noshow: ["late", "noshow"],
  cancelled: ["cancelled"],
  all: null,
};
export const matchesFilter = (s: CheckinState, f: CheckinFilter) => !FILTER_STATES[f] || FILTER_STATES[f]!.includes(s);

export function summarizeCheckins(list: CheckinBooking[], now: Date) {
  const counts: Record<CheckinFilter, number> = { pending: 0, in: 0, noshow: 0, cancelled: 0, all: list.length };
  let expected = 0, collectedIn = 0, lateToFlag = 0;
  for (const b of list) {
    const s = checkinState(b, now);
    (Object.keys(FILTER_STATES) as CheckinFilter[]).forEach((f) => { if (f !== "all" && matchesFilter(s, f)) counts[f]++; });
    if (s !== "cancelled") expected += b.price || 0;
    if (s === "in") collectedIn += b.price || 0;
    if (s === "late") lateToFlag++;
  }
  return { counts, expected, collectedIn, lateToFlag };
}

const fold = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/**
 * Busca por lo que traiga el jugador: el QR (id completo), el código del ticket (#AB12CD, con o sin # y espacios)
 * o su nombre. Si el nombre calza con varias reservas, devuelve todas para que recepción elija.
 */
export function findBookings(list: CheckinBooking[], input: string): CheckinBooking[] {
  const raw = input.trim();
  if (!raw) return [];
  const code = raw.replace(/^#/, "").replace(/\s+/g, "").toUpperCase();
  const byCode = list.filter((b) => b.id === raw || b.id.slice(-6).toUpperCase() === code);
  if (byCode.length) return byCode;
  const q = fold(raw);
  if (q.length < 2) return [];
  return list.filter((b) => fold(b.clientName).includes(q));
}
