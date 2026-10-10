import { NextResponse } from "next/server";
import { adminDb } from "@/services/server/firebase-admin";
import { verifyAuthedCaller } from "@/services/server/server-auth";
import { settlePayment, rejectionMessage, fetchMercadoPagoPayment } from "@/services/server/mercadopago";

// Estado de un pago con tarjeta (tras el desafío 3D Secure o un pago en revisión). Solo el dueño del pago.
export async function GET(request: Request) {
  const caller = await verifyAuthedCaller(request);
  if (!caller) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const pid = new URL(request.url).searchParams.get("pid") || "";
  const pay = pid ? (await adminDb().collection("payments").doc(pid).get()).data() : null;
  if (!pay || pay.userId !== caller.uid) return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });
  if (pay.status === "approved") return NextResponse.json({ ok: true, status: "approved", returnUrl: pay.returnUrl });
  if (!pay.mercadopagoPaymentId) return NextResponse.json({ ok: false, status: pay.status });
  const settled = await settlePayment(pid, String(pay.mercadopagoPaymentId));
  if (settled.result === "approved") return NextResponse.json({ ok: true, status: "approved", returnUrl: settled.returnUrl });
  const mp = await fetchMercadoPagoPayment(String(pay.mercadopagoPaymentId), pay.tenantId).catch(() => null);
  return NextResponse.json({ ok: false, status: mp?.status || pay.status, error: settled.result === "rejected" ? rejectionMessage(mp?.status_detail) : null });
}
