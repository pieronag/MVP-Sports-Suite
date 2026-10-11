import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/services/server/firebase-admin";
import { verifyAuthedCaller } from "@/services/server/server-auth";
import { allowRequest } from "@/services/server/rateLimit";
import { syncBooking } from "@/services/server/bookingProjections";
import { canPlayerCancel, refundFor } from "@/utils/bookingPolicy";

// Token Mercado Pago del recinto (tenant_secrets) o de la plataforma (settings_private)
async function resolveMercadoPagoToken(tenantId?: string): Promise<string | undefined> {
  const db = adminDb();
  if (tenantId && tenantId !== "system") {
    const sec = (await db.collection("tenant_secrets").doc(tenantId).get()).data();
    if (sec?.mercadopagoAccessToken) return sec.mercadopagoAccessToken;
  }
  const priv = (await db.collection("settings_private").doc("global").get()).data();
  return priv?.mercadopagoAccessToken || process.env.MERCADOPAGO_ACCESS_TOKEN || undefined;
}

// Única vía para que un jugador cancele: solo hasta 24 h antes, reembolsando lo pagado menos 3% de comisión.
export async function POST(request: Request) {
  const caller = await verifyAuthedCaller(request);
  if (!caller) return NextResponse.json({ error: "Debes estar autenticado." }, { status: 401 });
  if (!(await allowRequest(`refund_${caller.uid}`, 3, 60_000))) {
    return NextResponse.json({ error: "Demasiadas solicitudes. Intenta en un minuto." }, { status: 429 });
  }
  const { bookingId } = await request.json().catch(() => ({}));
  if (!bookingId) return NextResponse.json({ error: "Debe indicar la reserva." }, { status: 400 });

  const db = adminDb();
  try {
    const bookingRef = db.collection("bookings").doc(String(bookingId));
    const bookingData = (await bookingRef.get()).data();
    if (!bookingData) return NextResponse.json({ error: "No se encontró la reserva." }, { status: 404 });
    if (bookingData.userId !== caller.uid) return NextResponse.json({ error: "No tienes permisos sobre esta reserva." }, { status: 403 });
    const decision = canPlayerCancel(bookingData);
    if (!decision.ok) return NextResponse.json({ error: decision.reason }, { status: 409 });

    const paymentSnap = await db.collection("payments").where("bookingId", "==", String(bookingId)).limit(1).get();
    const paymentDoc = paymentSnap.empty ? null : paymentSnap.docs[0];
    let paymentData: any = null;
    let originalAmount = bookingData.totalPrice || bookingData.price || 0;
    if (paymentDoc) {
      const busy = await db.runTransaction(async (tx) => {
        const p = await tx.get(paymentDoc.ref);
        if (p.data()?.isRefundProcessing) return true;
        tx.update(paymentDoc.ref, { isRefundProcessing: true });
        return false;
      });
      if (busy) return NextResponse.json({ error: "El reembolso ya está en proceso." }, { status: 409 });
      paymentData = (await paymentDoc.ref.get()).data();
      originalAmount = paymentData?.amount || originalAmount;
    }

    const { fee, refund: refundAmount } = refundFor(originalAmount);
    let refundResult: any;
    const mpPaymentId = paymentData?.mercadopagoPaymentId;
    if (paymentData?.method === "mercadopago" && paymentData?.status === "approved" && mpPaymentId) {
      try {
        const accessToken = await resolveMercadoPagoToken(paymentData.tenantId || bookingData.tenantId);
        if (!accessToken) throw new Error("Recinto sin credenciales de Mercado Pago.");
        const resp = await fetch(`https://api.mercadopago.com/v1/payments/${mpPaymentId}/refunds`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}`, "X-Idempotency-Key": `refund-${bookingId}` },
          body: JSON.stringify({ amount: refundAmount }),
        });
        const data: any = await resp.json();
        if (!resp.ok) throw new Error(data?.message || `Mercado Pago respondió ${resp.status}`);
        refundResult = { type: "REFUNDED", mercadopagoRefundId: data.id, nullified_amount: refundAmount, response_code: 0 };
      } catch (err: any) {
        refundResult = { type: "FAILED_PHYSICAL_REFUND", error: err?.message || String(err), response_code: -99, nullified_amount: 0 };
      }
    } else if (paymentData?.status === "approved") {
      refundResult = { type: "FAILED_PHYSICAL_REFUND", error: "Pago histórico con Transbank: el reembolso debe hacerse manualmente.", response_code: -98, nullified_amount: 0 };
    } else {
      refundResult = { type: "NO_ONLINE_PAYMENT", nullified_amount: 0, response_code: 0 };
    }

    const failed = refundResult.type === "FAILED_PHYSICAL_REFUND";
    const batch = db.batch();
    batch.update(bookingRef, {
      paymentStatus: failed ? "refund_failed" : refundResult.type === "NO_ONLINE_PAYMENT" ? (bookingData.paymentStatus || "pending") : "refunded",
      status: "cancelled",
      refundAmount: refundResult.nullified_amount || 0,
      refundFee: refundResult.nullified_amount ? fee : 0,
      refundedAt: FieldValue.serverTimestamp(),
      refundDetails: refundResult,
    });
    if (paymentDoc) {
      batch.update(paymentDoc.ref, {
        status: failed ? "refund_failed" : "refunded",
        refundAmount: refundResult.nullified_amount || 0,
        refundFee: refundResult.nullified_amount ? fee : 0,
        refundDetails: refundResult,
        isRefundProcessing: false,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
    await syncBooking(String(bookingId)).catch(() => undefined);
    return NextResponse.json({ success: !failed, refundAmount: refundResult.nullified_amount || 0, fee, error: refundResult.error || null });
  } catch (e: any) {
    console.error("refund", e);
    return NextResponse.json({ error: e?.message || "Error al procesar el reembolso." }, { status: 500 });
  }
}
