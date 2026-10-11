import { hoursUntilStart } from "./chileTime";

// Reglas de negocio de una reserva (puras, para el servidor y los tests).
export const CANCEL_MIN_HOURS = 24;
export const REFUND_FEE = 0.03;
export const CHECKIN_OPENS_HOURS = 2;
export const CHECKIN_GRACE_HOURS = 0.25;

type Decision = { ok: true } | { ok: false; reason: string };

export function canPlayerCancel(b: any, now = new Date()): Decision {
  if (b.status === "cancelled") return { ok: false, reason: "La reserva ya está cancelada." };
  if (b.checkIn || ["active", "completed", "past", "no-show"].includes(b.status)) return { ok: false, reason: "La reserva ya comenzó, no se puede cancelar." };
  const h = hoursUntilStart(b, now);
  if (h === null || h < CANCEL_MIN_HOURS) return { ok: false, reason: `Las reservas solo se pueden cancelar hasta ${CANCEL_MIN_HOURS} horas antes del partido.` };
  return { ok: true };
}

export function refundFor(amount: number) {
  const fee = Math.round(amount * REFUND_FEE);
  return { fee, refund: Math.max(0, amount - fee) };
}

export function canCheckIn(b: any, now = new Date()): Decision {
  if (b.status === "cancelled") return { ok: false, reason: "La reserva está cancelada." };
  if (b.checkIn) return { ok: false, reason: "El jugador ya ingresó." };
  if (b.paymentStatus !== "paid") return { ok: false, reason: "La reserva no tiene un pago online aprobado." };
  const h = hoursUntilStart(b, now);
  if (h === null) return { ok: false, reason: "La reserva no tiene horario." };
  if (h > CHECKIN_OPENS_HOURS) return { ok: false, reason: "Demasiado temprano: el ingreso se habilita 2 horas antes." };
  if (h < -CHECKIN_GRACE_HOURS) return { ok: false, reason: "Pasaron más de 15 minutos del inicio: la reserva se considera inasistencia." };
  return { ok: true };
}

export function canMarkNoShow(b: any, now = new Date()): Decision {
  if (b.status === "cancelled") return { ok: false, reason: "La reserva está cancelada." };
  if (b.checkIn) return { ok: false, reason: "El jugador ya ingresó." };
  const h = hoursUntilStart(b, now);
  if (h === null) return { ok: false, reason: "La reserva no tiene horario." };
  if (h > 0) return { ok: false, reason: "La reserva aún no comienza." };
  return { ok: true };
}
