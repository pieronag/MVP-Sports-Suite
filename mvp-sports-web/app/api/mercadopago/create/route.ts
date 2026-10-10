import { NextResponse } from "next/server";
import { verifyAuthedCaller } from "@/services/server-auth";
import { buildBookingCheckout, chargeCard, rejectionMessage, PaymentError } from "@/services/mercadopago";

// Cobra una reserva con tarjeta (Checkout API / Card Payment Brick). El cliente envía qué quiere
// reservar y el token de la tarjeta; el monto y los datos de la reserva se calculan en el servidor.
export async function POST(request: Request) {
  const caller = await verifyAuthedCaller(request);
  if (!caller) return NextResponse.json({ error: "Inicia sesión para pagar" }, { status: 401 });

  try {
    const body = await request.json();
    if (body?.type === "tournament") {
      return NextResponse.json({ error: "El pago online de torneos aún no está disponible" }, { status: 400 });
    }
    const checkout = await buildBookingCheckout(caller.uid, {
      tenantId: String(body?.tenantId || ""),
      courtId: String(body?.courtId || ""),
      sport: String(body?.sport || ""),
      date: String(body?.date || ""),
      startTime: String(body?.startTime || ""),
      couponCode: body?.couponCode ? String(body.couponCode) : undefined,
      teamId: body?.teamId ? String(body.teamId) : undefined,
    });
    const pay = await chargeCard({ uid: caller.uid, tenantId: body.tenantId, ...checkout, card: body.card, payerEmail: caller.email, saveCard: !!body.saveCard });
      if (pay.result !== "approved" && !pay.challenge) {
        return NextResponse.json({ ok: false, status: pay.status, error: rejectionMessage(pay.statusDetail) }, { status: 402 });
      }
      return NextResponse.json({ ok: pay.result === "approved", status: pay.status, challenge: pay.challenge, paymentRecordId: pay.paymentRecordId, returnUrl: pay.returnUrl, bookingId: checkout.bookingId });
  } catch (error: any) {
    if (error instanceof PaymentError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("MercadoPago Create Error:", error);
    return NextResponse.json({ error: "Error al iniciar pago" }, { status: 500 });
  }
}
