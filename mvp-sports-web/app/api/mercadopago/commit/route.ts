import { NextRequest, NextResponse } from "next/server";
import { settlePayment, SITE_URL } from "@/services/mercadopago";

// Retorno del checkout de Mercado Pago. Nunca confía en `status` de la URL:
// el pago se verifica siempre contra la API de MP antes de confirmar la reserva.
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const pid = sp.get("pid") || "";
  const paymentId = sp.get("payment_id") || sp.get("collection_id") || "";
  const fallbackUrl = `${SITE_URL}/player/billetera`;
  const withParam = (url: string, k: string, v: string) => url + (url.includes("?") ? "&" : "?") + `${k}=${v}`;

  if (!pid) return NextResponse.redirect(withParam(fallbackUrl, "error", "payment_not_found"));
  // Sin payment_id (pago en efectivo pendiente, abandono): el webhook lo resolverá
  if (!paymentId || paymentId === "null") return NextResponse.redirect(withParam(fallbackUrl, "payment", "pending"));

  try {
    const { result, returnUrl } = await settlePayment(pid, paymentId);
    const target = returnUrl || fallbackUrl;
    if (result === "approved") return NextResponse.redirect(target);
    if (result === "pending") return NextResponse.redirect(withParam(fallbackUrl, "payment", "pending"));
    if (result === "not_found") return NextResponse.redirect(withParam(fallbackUrl, "error", "payment_not_found"));
    return NextResponse.redirect(withParam(fallbackUrl, "error", "rejected"));
  } catch (error) {
    console.error("MercadoPago Commit Error:", error);
    return NextResponse.redirect(withParam(fallbackUrl, "error", "commit_failed"));
  }
}
