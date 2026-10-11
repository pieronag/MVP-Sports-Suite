import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./firebase-admin";
import { syncBooking } from "./bookingProjections";

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

export class RefundBusyError extends Error {}

export interface RefundOutcome { ok: boolean; refundAmount: number; fee: number; error: string | null }

/**
 * Anula la reserva y devuelve el pago por Mercado Pago.
 * `split(original)` decide cuánto se devuelve (jugador: 97%; recinto: 100%).
 * Marca la reserva `refunded` o `refund_failed` para que el error quede visible y se pueda reintentar a mano.
 */
export async function cancelAndRefund(
  bookingId: string,
  split: (original: number) => { refund: number; fee: number },
  meta: Record<string, unknown> = {},
): Promise<RefundOutcome> {
  const db = adminDb();
  const bookingRef = db.collection("bookings").doc(bookingId);
  const bookingData = (await bookingRef.get()).data() || {};

  const paymentSnap = await db.collection("payments").where("bookingId", "==", bookingId).limit(1).get();
  const paymentDoc = paymentSnap.empty ? null : paymentSnap.docs[0];
  let paymentData: FirebaseFirestore.DocumentData | null = null;
  let originalAmount = Number(bookingData.totalPrice || bookingData.price || 0);
  if (paymentDoc) {
    const busy = await db.runTransaction(async (tx) => {
      const p = await tx.get(paymentDoc.ref);
      if (p.data()?.isRefundProcessing) return true;
      tx.update(paymentDoc.ref, { isRefundProcessing: true });
      return false;
    });
    if (busy) throw new RefundBusyError("El reembolso ya está en proceso.");
    paymentData = (await paymentDoc.ref.get()).data() || null;
    originalAmount = Number(paymentData?.amount || originalAmount);
  }

  const { fee, refund: refundAmount } = split(originalAmount);
  let result: { type: string; error?: string; mercadopagoRefundId?: unknown; nullified_amount: number };
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
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.message || `Mercado Pago respondió ${resp.status}`);
      result = { type: "REFUNDED", mercadopagoRefundId: data.id, nullified_amount: refundAmount };
    } catch (err) {
      result = { type: "FAILED_PHYSICAL_REFUND", error: err instanceof Error ? err.message : String(err), nullified_amount: 0 };
    }
  } else if (paymentData?.status === "approved") {
    result = { type: "FAILED_PHYSICAL_REFUND", error: "Pago histórico con Transbank: el reembolso debe hacerse manualmente.", nullified_amount: 0 };
  } else {
    result = { type: "NO_ONLINE_PAYMENT", nullified_amount: 0 };
  }

  const failed = result.type === "FAILED_PHYSICAL_REFUND";
  const batch = db.batch();
  batch.update(bookingRef, {
    paymentStatus: failed ? "refund_failed" : result.type === "NO_ONLINE_PAYMENT" ? (bookingData.paymentStatus || "pending") : "refunded",
    status: "cancelled",
    refundAmount: result.nullified_amount || 0,
    refundFee: result.nullified_amount ? fee : 0,
    refundedAt: FieldValue.serverTimestamp(),
    refundDetails: result,
    cancelledAt: FieldValue.serverTimestamp(),
    ...meta,
  });
  if (paymentDoc) {
    batch.update(paymentDoc.ref, {
      status: failed ? "refund_failed" : "refunded",
      refundAmount: result.nullified_amount || 0,
      refundFee: result.nullified_amount ? fee : 0,
      refundDetails: result,
      isRefundProcessing: false,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();
  await syncBooking(bookingId).catch(() => undefined);
  return { ok: !failed, refundAmount: result.nullified_amount || 0, fee: result.nullified_amount ? fee : 0, error: result.error || null };
}
