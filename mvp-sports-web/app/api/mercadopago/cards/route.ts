import { NextResponse } from "next/server";
import { verifyAuthedCaller } from "@/services/server/server-auth";
import { getCardSetup, PaymentError } from "@/services/server/mercadopago";

// Datos para inicializar el Card Payment Brick: Public Key del recinto y tarjetas guardadas del jugador
export async function GET(request: Request) {
  const caller = await verifyAuthedCaller(request);
  if (!caller) return NextResponse.json({ error: "Inicia sesión para pagar" }, { status: 401 });
  const tenantId = new URL(request.url).searchParams.get("tenantId") || "";
  if (!tenantId) return NextResponse.json({ error: "Falta el recinto" }, { status: 400 });
  try {
    return NextResponse.json(await getCardSetup(caller.uid, caller.email, tenantId));
  } catch (e: any) {
    if (e instanceof PaymentError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("mp cards", e);
    return NextResponse.json({ error: "No se pudo preparar el pago" }, { status: 500 });
  }
}
