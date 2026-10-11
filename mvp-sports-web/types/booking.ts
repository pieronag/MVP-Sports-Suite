// Modelo único de una reserva tal como la usa la aplicación.
// Los documentos de Firestore tienen variantes históricas; normalizeBooking() las traduce a esta forma.

export type PaymentState = "paid" | "refunded" | "refund_failed" | "no-show" | "pending";
export type BookingState = "confirmed" | "active" | "completed" | "cancelled" | "no-show";

export interface Booking {
  id: string;
  tenantId: string;
  tenantName: string;
  courtId: string;
  courtName: string;
  userId: string;
  clientName: string;
  clientPhone: string;
  sport: string;
  /** Inicio real del bloque (instante) */
  start: Date | null;
  /** Hora de inicio y término en formato HH:MM */
  startTime: string;
  endTime: string;
  price: number;
  payment: PaymentState;
  state: BookingState;
  isNoShow: boolean;
  checkedIn: boolean;
  checkedOut: boolean;
  couponCode: string | null;
  isInternalMatch: boolean;
  createdAt: Date | null;
  /** Documento original, para campos que aún no forman parte del modelo */
  raw: Record<string, any>;
}
