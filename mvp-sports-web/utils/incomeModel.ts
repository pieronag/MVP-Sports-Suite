// Movimientos de ingreso del recinto: reservas, inscripciones a torneos y academias, en una sola forma
import type { Booking, RawDoc } from "@/types/booking";
import { countsAsIncome as bookingCounts, bookingLabel, toDate } from "@/utils/bookingModel";

export type IncomeKind = "reserva" | "torneo" | "academia";

export interface IncomeItem {
  id: string;
  kind: IncomeKind;
  tenantId: string;
  date: Date;
  amount: number;
  clientName: string;
  clientPhone: string;
  detail: string;
  sport: string;
  courtName: string;
  timeRange: string;
  label: string;
  counts: boolean;
}

export function fromBooking(b: Booking): IncomeItem {
  return {
    id: b.id, kind: "reserva", tenantId: b.tenantId, date: b.start || b.createdAt || new Date(0), amount: b.price,
    clientName: b.clientName, clientPhone: b.clientPhone, detail: `${b.courtName} - ${b.startTime || "--:--"}`,
    sport: b.sport || "General", courtName: b.courtName,
    timeRange: b.startTime ? `${b.startTime} - ${b.endTime || "--:--"}` : "", label: bookingLabel(b), counts: bookingCounts(b),
  };
}

// Inscripción pagada (torneo o academia): suma salvo que esté anulada o reembolsada
const enrollmentState = (d: RawDoc) => {
  const ps = String(d.paymentStatus || "").toLowerCase();
  const st = String(d.status || "").toLowerCase();
  if (ps === "refunded") return { label: "Reembolsado", counts: false };
  if (st === "cancelled") return { label: "Anulada", counts: false };
  if (ps === "paid") return { label: "Pagado", counts: true };
  return { label: "Sin pagar", counts: false };
};

export function fromRegistration(id: string, d: RawDoc, tournamentName: string): IncomeItem {
  const s = enrollmentState(d);
  return {
    id, kind: "torneo", tenantId: d.tenantId || "", date: toDate(d.createdAt) || new Date(0),
    amount: Number(d.paidAmount ?? d.price ?? 0) || 0, clientName: d.teamName || d.userName || "Equipo",
    clientPhone: d.contactPhone || "", detail: `Torneo: ${tournamentName || "Torneo"}`, sport: "Torneo",
    courtName: "—", timeRange: "", ...s,
  };
}

export function fromEnrollment(id: string, d: RawDoc): IncomeItem {
  const s = enrollmentState(d);
  return {
    id, kind: "academia", tenantId: d.tenantId || "", date: toDate(d.createdAt) || new Date(0),
    amount: Number(d.price ?? 0) || 0, clientName: d.userName || "Alumno", clientPhone: "",
    detail: `Academia: ${d.className || "Clase"}`, sport: "Academia", courtName: "—", timeRange: "", ...s,
  };
}

export function incomeTotals(list: IncomeItem[]) {
  const t = { total: 0, reserva: 0, torneo: 0, academia: 0 };
  for (const i of list) if (i.counts) { t.total += i.amount; t[i.kind] += i.amount; }
  return t;
}
