import { NextResponse } from "next/server";
import { adminDb } from "@/services/server/firebase-admin";
import { notifyUser } from "@/services/server/push";
import { verifyAuthedCaller } from "@/services/server/server-auth";
import { allowRequest } from "@/services/server/rateLimit";
import { cancelAndRefund, RefundBusyError } from "@/services/server/refunds";
import { canPlayerCancel, refundFor } from "@/utils/bookingPolicy";

// Única vía para que un jugador cancele: solo hasta 24 h antes, reembolsando lo pagado menos 3% de comisión.
export async function POST(request: Request) {
  const caller = await verifyAuthedCaller(request);
  if (!caller) return NextResponse.json({ error: "Debes estar autenticado." }, { status: 401 });
  if (!(await allowRequest(`refund_${caller.uid}`, 3, 60_000))) {
    return NextResponse.json({ error: "Demasiadas solicitudes. Intenta en un minuto." }, { status: 429 });
  }
  const { bookingId } = await request.json().catch(() => ({}));
  if (!bookingId) return NextResponse.json({ error: "Debe indicar la reserva." }, { status: 400 });

  try {
    const bookingData = (await adminDb().collection("bookings").doc(String(bookingId)).get()).data();
    if (!bookingData) return NextResponse.json({ error: "No se encontró la reserva." }, { status: 404 });
    if (bookingData.userId !== caller.uid) return NextResponse.json({ error: "No tienes permisos sobre esta reserva." }, { status: 403 });
    const decision = canPlayerCancel(bookingData);
    if (!decision.ok) return NextResponse.json({ error: decision.reason }, { status: 409 });

    const r = await cancelAndRefund(String(bookingId), refundFor, { cancelledBy: "player" });
    if (r.ok && r.refundAmount > 0) await notifyUser(caller.uid, { kind: "booking_refunded", bookingId: String(bookingId), refund: r.refundAmount });
    return NextResponse.json({ success: r.ok, refundAmount: r.refundAmount, fee: r.fee, error: r.error });
  } catch (e) {
    if (e instanceof RefundBusyError) return NextResponse.json({ error: e.message }, { status: 409 });
    console.error("refund", e);
    return NextResponse.json({ error: "Error al procesar el reembolso." }, { status: 500 });
  }
}
