import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/services/server/firebase-admin";
import { verifyAuthedCaller } from "@/services/server/server-auth";
import { allowRequest } from "@/services/server/rateLimit";
import { recomputeVenueRating } from "@/services/server/reviews";

// Reseña de un recinto: solo quien jugó la reserva (con ingreso registrado), una por reserva.
export async function POST(request: Request) {
  const caller = await verifyAuthedCaller(request);
  if (!caller) return NextResponse.json({ error: "Inicia sesión para dejar tu reseña." }, { status: 401 });
  if (!(await allowRequest(`review_${caller.uid}`, 5, 60_000))) {
    return NextResponse.json({ error: "Demasiadas solicitudes. Intenta en un minuto." }, { status: 429 });
  }
  const body = await request.json().catch(() => ({}));
  const bookingId = typeof body?.bookingId === "string" ? body.bookingId : "";
  const rating = Math.round(Number(body?.rating));
  const comment = typeof body?.comment === "string" ? body.comment.trim().slice(0, 500) : "";
  if (!bookingId) return NextResponse.json({ error: "Falta la reserva." }, { status: 400 });
  if (!(rating >= 1 && rating <= 5)) return NextResponse.json({ error: "La nota debe ser de 1 a 5 estrellas." }, { status: 400 });

  const db = adminDb();
  const b = (await db.collection("bookings").doc(bookingId).get()).data();
  if (!b) return NextResponse.json({ error: "No se encontró la reserva." }, { status: 404 });
  if (b.userId !== caller.uid) return NextResponse.json({ error: "Solo quien hizo la reserva puede reseñarla." }, { status: 403 });
  if (!b.tenantId || !b.checkIn) return NextResponse.json({ error: "Podrás dejar tu reseña después de jugar." }, { status: 409 });

  const tenant = (await db.collection("tenants").doc(b.tenantId).get()).data() || {};
  const user = (await db.collection("users").doc(caller.uid).get()).data() || {};
  // El id de la reseña es el de la reserva: una sola reseña por partido (si ya existe, se actualiza)
  const ref = db.collection("reviews").doc(bookingId);
  const existing = await ref.get();
  await ref.set({
    venueId: b.tenantId,
    venueName: tenant.name || b.tenantName || "Recinto",
    ownerId: tenant.ownerId || null,
    ownerIds: tenant.ownerIds || [],
    bookingId,
    userId: caller.uid,
    userName: user.displayName || user.fullName || "Jugador MVP",
    rating,
    comment,
    sport: b.sport || null,
    bookingDate: b.date || null,
    bookingTime: b.startTime || null,
    ...(existing.exists ? { updatedAt: FieldValue.serverTimestamp() } : { date: FieldValue.serverTimestamp() }),
  }, { merge: true });
  await db.collection("bookings").doc(bookingId).update({ rating, feedback: comment }).catch(() => undefined);
  const venue = await recomputeVenueRating(b.tenantId);
  return NextResponse.json({ ok: true, updated: existing.exists, venueRating: venue.avg });
}
