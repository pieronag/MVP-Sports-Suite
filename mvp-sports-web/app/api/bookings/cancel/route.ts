import { NextResponse } from "next/server";
import { adminDb } from "@/services/server/firebase-admin";
import { verifyAuthedCaller } from "@/services/server/server-auth";
import { allowRequest } from "@/services/server/rateLimit";
import { worksAtTenant } from "@/services/server/tenantAccess";
import { cancelAndRefund, RefundBusyError } from "@/services/server/refunds";
import { canVenueCancel, fullRefund } from "@/utils/bookingPolicy";

// Anulación hecha por el recinto (dueño o personal): libera el horario y devuelve el 100% del pago.
export async function POST(request: Request) {
  const caller = await verifyAuthedCaller(request);
  if (!caller) return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });
  if (!(await allowRequest(`venue_cancel_${caller.uid}`, 10, 60_000))) {
    return NextResponse.json({ error: "Demasiadas solicitudes. Intenta en un minuto." }, { status: 429 });
  }
  const { bookingId, reason } = await request.json().catch(() => ({}));
  if (typeof bookingId !== "string" || !bookingId) return NextResponse.json({ error: "Debe indicar la reserva." }, { status: 400 });

  try {
    const b = (await adminDb().collection("bookings").doc(bookingId).get()).data();
    if (!b) return NextResponse.json({ error: "No se encontró la reserva." }, { status: 404 });
    if (!(await worksAtTenant(caller.uid, b.tenantId))) return NextResponse.json({ error: "Tu cuenta no tiene permisos sobre esta reserva." }, { status: 403 });
    const decision = canVenueCancel(b);
    if (!decision.ok) return NextResponse.json({ error: decision.reason }, { status: 409 });

    const r = await cancelAndRefund(bookingId, fullRefund, {
      cancelledBy: "staff",
      cancelledByUser: caller.email || caller.uid,
      cancelReason: typeof reason === "string" ? reason.slice(0, 200) : null,
    });
    return NextResponse.json({ success: r.ok, refundAmount: r.refundAmount, error: r.error });
  } catch (e) {
    if (e instanceof RefundBusyError) return NextResponse.json({ error: e.message }, { status: 409 });
    console.error("venue cancel", e);
    return NextResponse.json({ error: "No se pudo anular la reserva." }, { status: 500 });
  }
}
