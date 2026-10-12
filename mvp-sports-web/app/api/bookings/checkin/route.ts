import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { notifyUser } from "@/services/server/push";
import { adminDb } from "@/services/server/firebase-admin";
import { verifyAuthedCaller } from "@/services/server/server-auth";
import { syncBooking } from "@/services/server/bookingProjections";
import { canCheckIn, canMarkNoShow } from "@/utils/bookingPolicy";
import { worksAtTenant } from "@/services/server/tenantAccess";
import { recomputePlayer } from "@/services/server/gamification";

// Ingreso e inasistencia los registra el servidor: valida recinto, pago y horario, y recalcula la experiencia.
//   action "checkin": reserva pagada, desde 2 h antes hasta 15 min después del inicio.
//   action "noshow":  reserva sin ingreso que ya comenzó; suma un strike al jugador.
export async function POST(request: Request) {
  const caller = await verifyAuthedCaller(request);
  if (!caller) return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });
  const { bookingId, action } = await request.json().catch(() => ({}));
  if (!bookingId || !["checkin", "noshow"].includes(action)) return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 });

  const db = adminDb();
  const ref = db.collection("bookings").doc(String(bookingId));
  const b = (await ref.get()).data();
  if (!b) return NextResponse.json({ error: "No se encontró la reserva." }, { status: 404 });
  if (!(await worksAtTenant(caller.uid, b.tenantId))) return NextResponse.json({ error: "No trabajas en este recinto." }, { status: 403 });
  const decision = action === "checkin" ? canCheckIn(b) : canMarkNoShow(b);
  if (!decision.ok) return NextResponse.json({ error: decision.reason }, { status: 409 });

  if (action === "checkin") {
    await ref.update({ checkIn: true, checkInTime: FieldValue.serverTimestamp(), checkInBy: caller.uid, status: "active" });
  } else {
    await ref.update({ status: "cancelled", noShow: true, noShowBy: caller.uid, updatedAt: FieldValue.serverTimestamp() });
    if (b.userId) await db.collection("users").doc(b.userId).update({ strikes: FieldValue.increment(1), lastStrikeAt: FieldValue.serverTimestamp() }).catch(() => undefined);
    await notifyUser(b.userId, { kind: "no_show", bookingId: String(bookingId), venue: b.tenantName || "el recinto" });
  }

  await syncBooking(String(bookingId)).catch(() => undefined);
  if (b.userId) await recomputePlayer(b.userId).catch(() => null);
  return NextResponse.json({ ok: true });
}
