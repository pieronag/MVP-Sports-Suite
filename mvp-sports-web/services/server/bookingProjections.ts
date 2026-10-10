import "server-only";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/services/server/firebase-admin";

// Proyecciones públicas de `bookings` (con datos personales, no legible por jugadores):
//  - court_slots/{courtId}_{YYYY-MM-DD}: horarios ocupados por cancha y día operativo
//  - booking_reviews/{bookingId}: calificación + comentario de reservas evaluadas
// En plan Spark no hay triggers: se recalculan desde la fuente tras cada cambio
// (POST /api/bookings/sync), así que repetir la sincronización es inofensivo.

const INACTIVE = new Set(["cancelled", "rejected", "refunded"]);
// Pagos online sin completar dejan de bloquear el horario a los 15 minutos
const PENDING_ONLINE_TTL_MS = 15 * 60 * 1000;

export function toDate(raw: any): Date | null {
  if (!raw) return null;
  if (raw instanceof Timestamp) return raw.toDate();
  if (raw instanceof Date) return raw;
  if (typeof raw?.toDate === "function") return raw.toDate();
  if (typeof raw?.seconds === "number") return new Date(raw.seconds * 1000);
  if (typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw)) return new Date(`${raw}T12:00:00-03:00`);
  if (typeof raw === "string" || typeof raw === "number") {
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

// Día operativo en Chile: los bloques antes de las 06:00 pertenecen al día anterior
export function operationalDay(date: Date, startTime?: string): string {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit" });
  const hour = Number((startTime || "").split(":")[0]);
  const d = new Date(date);
  if (!isNaN(hour) && hour < 6) d.setUTCDate(d.getUTCDate() - 1);
  return fmt.format(d);
}

export function slotOf(b: any): { courtId: string; day: string; time: string } | null {
  if (!b?.courtId || typeof b.startTime !== "string" || b.isInternalMatch) return null;
  const date = toDate(b.date);
  if (!date) return null;
  return { courtId: String(b.courtId), day: operationalDay(date, b.startTime), time: b.startTime };
}

export function blocksSlot(b: any, now = Date.now()): boolean {
  if (!b || INACTIVE.has(String(b.status || "").toLowerCase())) return false;
  if (b.paymentStatus === "pending" && b.paymentMethod === "mercadopago") {
    const created = toDate(b.createdAt)?.getTime() || 0;
    if (created && now - created > PENDING_ONLINE_TTL_MS) return false;
  }
  return true;
}

// Reescribe el mapa de horarios ocupados de una cancha en un día operativo
export async function rebuildCourtDay(courtId: string, day: string) {
  const db = adminDb();
  const snap = await db.collection("bookings").where("courtId", "==", courtId).get();
  const taken: Record<string, string> = {};
  let tenantId: string | null = null;
  const now = Date.now();
  for (const d of snap.docs) {
    const b = d.data();
    const s = slotOf(b);
    if (!s || s.day !== day || !blocksSlot(b, now)) continue;
    taken[s.time] = d.id;
    tenantId = tenantId || b.tenantId || null;
  }
  await db.collection("court_slots").doc(`${courtId}_${day}`).set({
    courtId, tenantId, day, taken, updatedAt: FieldValue.serverTimestamp(),
  });
}

async function syncReview(bookingId: string, b: any | null) {
  const ref = adminDb().collection("booking_reviews").doc(bookingId);
  const rating = Number(b?.rating) || 0;
  if (b && rating > 0 && b.tenantId) {
    const name = String(b.clientName || "Jugador").trim().split(/\s+/)[0];
    await ref.set({
      tenantId: b.tenantId,
      courtId: b.courtId || null,
      userId: b.userId || null,
      displayName: name,
      rating,
      comment: String(b.comment || b.feedback || "").slice(0, 600),
      sport: b.sport || null,
      date: toDate(b.ratedAt) || toDate(b.date) || new Date(),
    }, { merge: true });
  } else {
    await ref.delete().catch(() => undefined);
  }
}

// Sincroniza las proyecciones de una reserva. `prev` es el horario que tenía antes
// de un cambio de cancha/fecha/hora (o de borrarla), para liberar el anterior.
export async function syncBooking(bookingId: string, prev?: { courtId?: string; date?: any; startTime?: string } | null) {
  const snap = await adminDb().collection("bookings").doc(bookingId).get();
  const b = snap.exists ? snap.data() : null;
  const days = new Map<string, { courtId: string; day: string }>();
  const cur = slotOf(b);
  if (cur) days.set(`${cur.courtId}_${cur.day}`, cur);
  const old = prev ? slotOf(prev) : null;
  if (old) days.set(`${old.courtId}_${old.day}`, old);
  await Promise.all([...days.values()].map((s) => rebuildCourtDay(s.courtId, s.day)));
  await syncReview(bookingId, b);
  return { courtDays: [...days.keys()] };
}
