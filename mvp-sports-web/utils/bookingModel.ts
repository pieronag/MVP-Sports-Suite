import type { Booking, BookingState, PaymentState, RawDoc } from "@/types/booking";

export const toDate = (v: unknown): Date | null => {
  const x = v as RawDoc | null;
  if (!v) return null;
  if (typeof x?.toDate === "function") return x.toDate();
  if (typeof x?.seconds === "number") return new Date(x.seconds * 1000);
  if (v instanceof Date) return v;
  const d = new Date(v as string | number);
  return isNaN(d.getTime()) ? null : d;
};
const chileHHMM = (d: Date) => new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);
const hhmm = (v: unknown): string => (typeof v === "string" && /^\d{1,2}:\d{2}$/.test(v) ? v.padStart(5, "0") : "");

// Documento de Firestore (cualquier variante histórica) → modelo de la aplicación
export function normalizeBooking(id: string, d: RawDoc): Booking {
  const ps = String(d.paymentStatus || "").toLowerCase();
  const notes = String(d.notes || "").toLowerCase();
  const isNoShow = d.status === "no-show" || ps === "no-show" || d.noShow === true || notes.includes("no-show") || notes.includes("inasistencia");

  const payment: PaymentState =
    ps === "paid" || ps === "refunded" || ps === "refund_failed" ? (ps as PaymentState) : isNoShow ? "no-show" : "pending";

  const state: BookingState = isNoShow ? "no-show"
    : d.status === "cancelled" || d.status === "rejected" ? "cancelled"
    : d.status === "completed" || d.checkOut ? "completed"
    : d.checkIn ? "active"
    : "confirmed";

  // La fecha vive en `date`; algunas reservas antiguas la guardaron en `startTime` como Timestamp
  const start = toDate(d.date) || (typeof d.startTime === "object" ? toDate(d.startTime) : null);
  const startTime = hhmm(d.startTime) || (start ? chileHHMM(start) : "");

  return {
    id,
    tenantId: d.tenantId || "",
    tenantName: d.tenantName || "",
    courtId: d.courtId || "",
    courtName: d.courtName || "Cancha",
    userId: d.userId || "",
    clientName: d.clientName || d.userName || "Cliente",
    clientPhone: d.clientPhone || "",
    sport: d.sport || "",
    start,
    startTime,
    endTime: hhmm(d.endTime),
    price: Number(d.totalPrice ?? d.price ?? d.finalPrice ?? 0) || 0,
    payment,
    state,
    isNoShow,
    checkedIn: !!d.checkIn,
    checkedOut: !!d.checkOut,
    couponCode: d.couponCode || null,
    isInternalMatch: !!d.isInternalMatch,
    createdAt: toDate(d.createdAt),
    raw: d,
  };
}

// Pago 100% online: existe solo si se pagó, se reembolsó o terminó en inasistencia (un checkout sin terminar no es reserva)
export const isReal = (b: Booking) => b.payment !== "pending";

// Ingreso del recinto: pagada y no anulada, o inasistencia (el pago se retiene). Lo reembolsado no suma.
export const countsAsIncome = (b: Booking) => (b.payment === "paid" && b.state !== "cancelled") || b.payment === "no-show";

export const PAYMENT_LABEL: Record<PaymentState, string> = {
  paid: "Pagado", refunded: "Reembolsado", refund_failed: "Error en reembolso", "no-show": "Inasistencia", pending: "Sin pagar",
};

// Etiqueta visible para el dueño/staff: anulada tiene prioridad sobre "pagado"
export function bookingLabel(b: Booking): string {
  if (b.payment === "refunded") return "Reembolsado";
  if (b.isNoShow) return "Inasistencia";
  if (b.state === "cancelled") return "Anulada";
  return PAYMENT_LABEL[b.payment];
}
