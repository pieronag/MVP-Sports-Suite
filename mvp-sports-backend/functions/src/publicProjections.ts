import * as admin from "firebase-admin";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";

// Proyecciones públicas de `bookings` (que contiene datos personales y ya no
// es legible por jugadores):
//  - court_slots/{courtId}_{YYYY-MM-DD}: horarios ocupados por cancha y día operativo
//  - booking_reviews/{bookingId}: calificación + comentario de reservas evaluadas
// Los clientes solo leen estas colecciones; solo esta Function las escribe.

const INACTIVE = new Set(["cancelled", "rejected", "refunded"]);

function toDate(raw: any): Date | null {
  if (!raw) return null;
  if (raw instanceof admin.firestore.Timestamp) return raw.toDate();
  if (raw instanceof Date) return raw;
  if (typeof raw === "string" || typeof raw === "number") {
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof raw?.seconds === "number") return new Date(raw.seconds * 1000);
  return null;
}

// Día operativo en Chile: los bloques antes de las 06:00 pertenecen al día anterior
export function operationalDay(date: Date, startTime?: string): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit"});
  const hour = Number((startTime || "").split(":")[0]);
  const d = new Date(date);
  if (!isNaN(hour) && hour < 6) d.setUTCDate(d.getUTCDate() - 1);
  return fmt.format(d);
}

export function slotKey(b: any): {docId: string; time: string} | null {
  if (!b?.courtId || typeof b.startTime !== "string" || b.isInternalMatch) return null;
  const date = toDate(b.date);
  if (!date) return null;
  return {docId: `${b.courtId}_${operationalDay(date, b.startTime)}`, time: b.startTime};
}

const isActive = (b: any) => !!b && !INACTIVE.has(String(b.status || "").toLowerCase());

export async function syncBookingProjections(bookingId: string, before: any, after: any) {
  const db = admin.firestore();
  const del = admin.firestore.FieldValue.delete();
  const prevSlot = isActive(before) ? slotKey(before) : null;
  const nextSlot = isActive(after) ? slotKey(after) : null;

  if (prevSlot && (!nextSlot || prevSlot.docId !== nextSlot.docId || prevSlot.time !== nextSlot.time)) {
    const ref = db.collection("court_slots").doc(prevSlot.docId);
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (snap.data()?.taken?.[prevSlot.time] === bookingId) {
        tx.update(ref, {[`taken.${prevSlot.time}`]: del, updatedAt: admin.firestore.FieldValue.serverTimestamp()});
      }
    });
  }
  if (nextSlot) {
    await db.collection("court_slots").doc(nextSlot.docId).set({
      courtId: after.courtId,
      tenantId: after.tenantId || null,
      day: nextSlot.docId.slice(after.courtId.length + 1),
      taken: {[nextSlot.time]: bookingId},
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, {merge: true});
  }

  const reviewRef = db.collection("booking_reviews").doc(bookingId);
  const rating = Number(after?.rating) || 0;
  if (after && rating > 0 && after.tenantId) {
    const name = String(after.clientName || "Jugador").trim().split(/\s+/)[0];
    await reviewRef.set({
      tenantId: after.tenantId,
      courtId: after.courtId || null,
      userId: after.userId || null,
      displayName: name,
      rating,
      comment: String(after.comment || after.feedback || "").slice(0, 600),
      sport: after.sport || null,
      date: toDate(after.ratedAt) || toDate(after.date) || new Date(),
    }, {merge: true});
  } else if (before && Number(before?.rating) > 0) {
    await reviewRef.delete().catch(() => undefined);
  }
}

export const onBookingWritten = onDocumentWritten(
  {document: "bookings/{bookingId}", region: "southamerica-west1"},
  async (event) => {
    const before = event.data?.before.exists ? event.data.before.data() : null;
    const after = event.data?.after.exists ? event.data.after.data() : null;
    try {
      await syncBookingProjections(event.params.bookingId, before, after);
    } catch (e) {
      logger.error("syncBookingProjections", event.params.bookingId, e);
      throw e; // reintento
    }
  },
);
