import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/services/firebase-admin";
import { isValidWebhookSignature, settlePayment } from "@/services/mercadopago";

// Webhook de Mercado Pago. El registro de pago viaja en ?pid (lo fija nuestra
// preferencia), así que se usa solo el token de ese recinto. Si hay secreto
// configurado se exige la firma x-signature; en todo caso el pago se verifica
// contra la API de MP (referencia + monto) antes de confirmar.
export async function POST(request: NextRequest) {
  const pid = request.nextUrl.searchParams.get("pid") || "";
  const body = await request.json().catch(() => ({}));
  const type = body?.type || request.nextUrl.searchParams.get("type") || request.nextUrl.searchParams.get("topic");
  const paymentId = String(body?.data?.id || request.nextUrl.searchParams.get("data.id") || "");

  if (type !== "payment" || !paymentId || !pid) return NextResponse.json({ ok: true });

  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET
    || (await adminDb().collection("settings_private").doc("global").get()).data()?.mercadopagoWebhookSecret;
  if (secret && !isValidWebhookSignature(request, paymentId, secret)) {
    return NextResponse.json({ ok: false, error: "firma inválida" }, { status: 401 });
  }

  try {
    const { result } = await settlePayment(pid, paymentId);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error("MercadoPago Webhook Error:", error);
    // 500 => MP reintenta la notificación
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
