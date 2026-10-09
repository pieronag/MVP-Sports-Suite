import { NextResponse } from "next/server";
import { verifyAuthedCaller } from "@/services/server-auth";
import { buildBookingCheckout, createPreference, PaymentError } from "@/services/mercadopago";

// Crea la preferencia de pago de una reserva. El cliente solo envía qué quiere
// reservar; el monto y los datos de la reserva se calculan en el servidor.
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
    const pref = await createPreference({ uid: caller.uid, tenantId: body.tenantId, ...checkout });
    return NextResponse.json({ url: pref.url, preferenceId: pref.preferenceId, bookingId: checkout.bookingId, amount: checkout.amount });
  } catch (error: any) {
    if (error instanceof PaymentError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("MercadoPago Create Error:", error);
    return NextResponse.json({ error: "Error al iniciar pago" }, { status: 500 });
  }
}
