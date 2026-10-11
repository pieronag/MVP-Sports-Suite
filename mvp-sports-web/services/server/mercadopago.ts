import "server-only";
import crypto from "crypto";
import { couponIssue, couponUses } from "@/utils/coupon";
import { chileDateTime } from "@/utils/chileTime";
import { courtBlockedAt } from "@/utils/courtAvailability";
import { syncBooking } from "@/services/server/bookingProjections";
import { adminDb } from "@/services/server/firebase-admin";
import { resolveMercadoPagoToken } from "@/services/server/tenant-secrets";
import { commitRegistration } from "@/services/server/tournaments";
import { commitEnrollment } from "@/services/server/academies";

// Flujo de pago Mercado Pago (único método de pago de la plataforma).
// Reglas: el precio se calcula aquí, nunca se toma del cliente; un pago solo se
// aprueba tras consultar GET /v1/payments/{id} y comprobar referencia y monto.

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://mvpsports.cl").replace(/\/$/, "");
const MP_API = "https://api.mercadopago.com";

export class PaymentError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

// ---------- Precio ----------

export { priceFromTenantConfig } from "@/utils/pricing";
import { priceFromTenantConfig } from "@/utils/pricing";

async function resolveCoupon(code: string | undefined, tenantId: string, price: number) {
  if (!code) return null;
  const snap = await adminDb().collection("coupons").where("code", "==", code.trim().toUpperCase()).limit(1).get();
  if (snap.empty) throw new PaymentError("Cupón no encontrado");
  const doc = snap.docs[0];
  const c = doc.data();
  const issue = couponIssue(c, { tenantId, price });
  if (issue) throw new PaymentError(issue);
  return { id: doc.id, code: c.code as string, discount: Number(c.discount) || 0, type: (c.type || "percentage") as string };
}

const VALID_DATE =/^\d{4}-\d{2}-\d{2}$/;
const VALID_TIME = /^\d{2}:\d{2}$/;
const BOOKING_ID_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export interface BookingCheckoutInput {
  tenantId: string;
  courtId: string;
  sport: string;
  date: string; // YYYY-MM-DD (día operativo)
  startTime: string; // HH:mm
  couponCode?: string;
  teamId?: string;
}

// Arma la reserva y el monto en el servidor a partir de datos del recinto
export async function buildBookingCheckout(uid: string, input: BookingCheckoutInput) {
  const { tenantId, courtId, sport, date, startTime } = input;
  if (!tenantId || !courtId || !sport || !VALID_DATE.test(date || "") || !VALID_TIME.test(startTime || "")) {
    throw new PaymentError("Datos de reserva incompletos");
  }
  const db = adminDb();
  const [tenantSnap, courtSnap, userSnap] = await Promise.all([
    db.collection("tenants").doc(tenantId).get(),
    db.collection("courts").doc(courtId).get(),
    db.collection("users").doc(uid).get(),
  ]);
  const tenant = tenantSnap.data();
  const court = courtSnap.data();
  if (!tenant) throw new PaymentError("Recinto no encontrado", 404);
  if (!court || court.tenantId !== tenantId) throw new PaymentError("Cancha no encontrada", 404);
  if (tenant.isMercadopagoActive === false) throw new PaymentError("Este recinto no tiene pagos online habilitados");

  const basePrice = priceFromTenantConfig(tenant, sport, date, startTime);
  if (basePrice <= 0) throw new PaymentError("El recinto no tiene tarifa para ese horario");

  const coupon = await resolveCoupon(input.couponCode, tenantId, basePrice);
  const discount = coupon ? (coupon.type === "fixed" ? coupon.discount : (basePrice * coupon.discount) / 100) : 0;
  const amount = Math.max(0, Math.round(basePrice - discount));
  if (amount <= 0) throw new PaymentError("El monto a pagar debe ser mayor a cero");

  // Fecha real del bloque (antes de las 06:00 pertenece al día siguiente)
  const [sh, sm] = startTime.split(":").map(Number);
  const bookingDate = chileDateTime(date, sh, sm || 0, sh < 6 ? 1 : 0);

  if (courtBlockedAt(court, bookingDate.getTime(), bookingDate.getTime() + 3_600_000)) {
    throw new PaymentError("Esa cancha está en mantenimiento en ese horario", 409);
  }

  // Bloque ya tomado
  const taken = await db.collection("bookings")
    .where("courtId", "==", courtId)
    .where("date", "==", bookingDate)
    .get();
  if (taken.docs.some((d) => !["cancelled", "rejected"].includes(d.data().status))) {
    throw new PaymentError("Ese horario ya fue reservado", 409);
  }

  let bookingId = "";
  for (let i = 0; i < 6; i++) bookingId += BOOKING_ID_CHARS[crypto.randomInt(BOOKING_ID_CHARS.length)];

  const user = userSnap.data() || {};
  const endH = (sh + 1) % 24;
  const bookingData = {
    userId: uid,
    tenantId,
    tenantName: tenant.name || "Recinto",
    courtId,
    courtName: court.name || "Cancha",
    clientName: user.displayName || user.fullName || "Jugador MVP",
    clientPhone: user.phone || "",
    date: bookingDate,
    startTime,
    endTime: `${String(endH).padStart(2, "0")}:${String(sm || 0).padStart(2, "0")}`,
    totalPrice: amount,
    price: amount,
    originalPrice: basePrice,
    couponCode: coupon?.code || null,
    couponId: coupon?.id || null,
    discountApplied: coupon?.discount || 0,
    source: "web_app",
    createdBy: user.email || uid,
    sport,
    ...(input.teamId ? { teamId: input.teamId } : {}),
  };

  const returnUrl = `${SITE_URL}/player/ticket?bookingId=${bookingId}&sport=${encodeURIComponent(sport)}` +
    `&tenantName=${encodeURIComponent(String(bookingData.tenantName).toUpperCase())}` +
    `&courtName=${encodeURIComponent(String(bookingData.courtName).toUpperCase())}` +
    `&startTime=${startTime}&date=${date}&price=${amount}`;

  return { bookingId, bookingData, amount, returnUrl, title: `Reserva ${bookingData.courtName} · ${bookingData.tenantName}` };
}

// ---------- Preferencia ----------

// Registro del pago (payments/{id}) con lo que se confirmará al aprobarse
export async function createPaymentRecord(params: {
  uid: string;
  tenantId: string;
  bookingId: string;
  bookingData?: Record<string, unknown>;
  pendingRegistration?: Record<string, unknown>;
  pendingEnrollment?: Record<string, unknown>;
  amount: number;
  title: string;
  returnUrl: string;
}) {
  const payRef = adminDb().collection("payments").doc();
  const buyOrder = `ORD-${payRef.id}`;
  await payRef.set({
    userId: params.uid,
    bookingId: params.bookingId,
    tenantId: params.tenantId,
    amount: params.amount,
    currency: "CLP",
    buyOrder,
    status: "pending",
    method: "mercadopago",
    pendingBookingData: params.bookingData || null,
    pendingRegistration: params.pendingRegistration || null,
    pendingEnrollment: params.pendingEnrollment || null,
    kind: params.pendingEnrollment ? "academy" : params.pendingRegistration ? "tournament" : "booking",
    returnUrl: params.returnUrl,
    createdAt: new Date(),
  });
  return { payRef, buyOrder };
}

// ---------- Checkout API (Card Payment Brick): pago dentro de la PWA ----------

export interface CardData {
  token: string;              // token de la tarjeta generado por el Brick (los datos nunca pasan por aquí)
  payment_method_id: string;
  issuer_id?: string | number;
  installments?: number;
}

// Cliente de Mercado Pago del jugador para este recinto (para tarjetas guardadas)
async function mpCustomerId(accessToken: string, tenantId: string, uid: string, email: string, create: boolean): Promise<string | null> {
  const db = adminDb();
  const ref = db.collection("mp_customers").doc(`${tenantId}_${uid}`);
  const saved = (await ref.get()).data()?.customerId;
  if (saved) return saved;
  if (!email) return null;
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` };
  const found = await fetch(`${MP_API}/v1/customers/search?email=${encodeURIComponent(email)}`, { headers }).then((r) => r.json()).catch(() => null);
  let id: string | null = found?.results?.[0]?.id || null;
  if (!id && create) {
    const made = await fetch(`${MP_API}/v1/customers`, { method: "POST", headers, body: JSON.stringify({ email }) }).then((r) => r.json()).catch(() => null);
    id = made?.id || null;
  }
  if (id) await ref.set({ customerId: id, uid, tenantId, updatedAt: new Date() }, { merge: true });
  return id;
}

// Public Key y tarjetas guardadas del jugador (para inicializar el Brick)
export async function getCardSetup(uid: string, email: string, tenantId: string) {
  const db = adminDb();
  const tenant = (await db.collection("tenants").doc(tenantId).get()).data();
  if (!tenant) throw new PaymentError("Recinto no encontrado", 404);
  const accessToken = await resolveMercadoPagoToken(tenantId);
  const publicKey = tenant.mercadopagoPublicKey || process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY || "";
  if (!accessToken || !publicKey || tenant.isMercadopagoActive === false) throw new PaymentError("Este recinto no tiene pagos online habilitados");
  const customerId = await mpCustomerId(accessToken, tenantId, uid, email, false);
  let cardsIds: string[] = [];
  if (customerId) {
    const cards = await fetch(`${MP_API}/v1/customers/${customerId}/cards`, { headers: { Authorization: `Bearer ${accessToken}` } }).then((r) => r.json()).catch(() => []);
    if (Array.isArray(cards)) cardsIds = cards.map((c: any) => String(c.id));
  }
  // RUT del perfil (Ajustes) para precargarlo en el Brick: sin puntos ni guion
  const user = (await db.collection("users").doc(uid).get()).data() || {};
  const rut = String(user.rut || "").replace(/[^0-9kK]/g, "").toUpperCase();
  return { publicKey, customerId, cardsIds, email, rut };
}

// ¿La cuenta del recinto es de prueba? Mercado Pago exige entonces un comprador de prueba (@testuser.com)
const testAccountCache = new Map<string, boolean>();
async function isTestSeller(accessToken: string): Promise<boolean> {
  if (testAccountCache.has(accessToken)) return testAccountCache.get(accessToken)!;
  const me: any = await fetch(`${MP_API}/users/me`, { headers: { Authorization: `Bearer ${accessToken}` } }).then((r) => r.json()).catch(() => null);
  const isTest = Array.isArray(me?.tags) && me.tags.includes("test_user");
  console.info("MP vendedor", JSON.stringify({ id: me?.id, test: isTest, site: me?.site_id }));
  testAccountCache.set(accessToken, isTest);
  return isTest;
}

// Cobra con tarjeta y confirma con la misma conciliación que el webhook (settlePayment)
export async function chargeCard(params: Parameters<typeof createPaymentRecord>[0] & { card: CardData; payerEmail: string; saveCard?: boolean }) {
  const accessToken = await resolveMercadoPagoToken(params.tenantId);
  if (!accessToken) throw new PaymentError("Mercado Pago no está configurado para este recinto.");
  if (!params.card?.token || !params.card?.payment_method_id) throw new PaymentError("Datos de la tarjeta incompletos");

  const { payRef, buyOrder } = await createPaymentRecord(params);
  // Cuenta de prueba: comprador de prueba (con una cuenta real se usa el correo del jugador)
  if (await isTestSeller(accessToken)) {
    params = { ...params, payerEmail: process.env.MP_TEST_PAYER_EMAIL || `test_user_${params.uid.slice(0, 8).toLowerCase()}@testuser.com`, saveCard: false };
  }
  const customerId = params.saveCard || params.card.token
    ? await mpCustomerId(accessToken, params.tenantId, params.uid, params.payerEmail, !!params.saveCard).catch(() => null)
    : null;

  const resp = await fetch(`${MP_API}/v1/payments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}`, "X-Idempotency-Key": payRef.id },
    body: JSON.stringify({
      transaction_amount: params.amount,
      token: params.card.token,
      description: params.title,
      installments: Number(params.card.installments) || 1,
      payment_method_id: params.card.payment_method_id,
      ...(params.card.issuer_id ? { issuer_id: Number(params.card.issuer_id) } : {}),
      payer: customerId ? { type: "customer", id: customerId, email: params.payerEmail } : { email: params.payerEmail },
      external_reference: buyOrder,
      notification_url: `${SITE_URL}/api/mercadopago/webhook?pid=${payRef.id}`,
      statement_descriptor: "MVPSPORTS",
      three_d_secure_mode: "optional",
      metadata: { payment_record_id: payRef.id, tenant_id: params.tenantId, booking_id: params.bookingId },
    }),
  });
  const mp: any = await resp.json();
  if (!resp.ok || !mp?.id) {
    console.error("MP /v1/payments", resp.status, JSON.stringify({ message: mp?.message, error: mp?.error, cause: mp?.cause }).slice(0, 500));
    await payRef.update({ status: "error", error: String(mp?.message || resp.status), updatedAt: new Date() });
    throw new PaymentError(mp?.message ? `Mercado Pago: ${mp.message}` : "No se pudo procesar el pago", 402);
  }
  await payRef.update({ mercadopagoPaymentId: String(mp.id), updatedAt: new Date() });

  // Guardar la tarjeta para la próxima vez (si Mercado Pago lo permite con este token)
  if (params.saveCard && customerId && mp.status === "approved") {
    await fetch(`${MP_API}/v1/customers/${customerId}/cards`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ token: params.card.token }),
    }).catch(() => undefined);
  }

  const settled = await settlePayment(payRef.id, String(mp.id));
  const challenge = mp.status_detail === "pending_challenge" && mp.three_ds_info
    ? { url: mp.three_ds_info.external_resource_url, creq: mp.three_ds_info.creq }
    : null;
  return { paymentRecordId: payRef.id, status: mp.status as string, statusDetail: mp.status_detail as string, result: settled.result, returnUrl: settled.returnUrl, challenge };
}

// Mensaje claro para el jugador según el motivo de rechazo de Mercado Pago
export function rejectionMessage(detail?: string) {
  const m: Record<string, string> = {
    cc_rejected_insufficient_amount: "La tarjeta no tiene saldo suficiente.",
    cc_rejected_bad_filled_security_code: "El código de seguridad no es correcto.",
    cc_rejected_bad_filled_date: "La fecha de vencimiento no es correcta.",
    cc_rejected_bad_filled_other: "Revisa los datos de la tarjeta.",
    cc_rejected_call_for_authorize: "Tu banco pide autorizar el pago. Llámalo y vuelve a intentar.",
    cc_rejected_card_disabled: "La tarjeta está deshabilitada. Actívala con tu banco.",
    cc_rejected_duplicated_payment: "Ya hiciste un pago igual hace un momento.",
    cc_rejected_high_risk: "El pago fue rechazado por seguridad. Prueba con otra tarjeta.",
    cc_rejected_max_attempts: "Superaste los intentos permitidos. Usa otra tarjeta.",
  };
  return (detail && m[detail]) || "El pago fue rechazado. Prueba con otra tarjeta.";
}

// ---------- Verificación y cierre ----------

export async function fetchMercadoPagoPayment(paymentId: string, tenantId: string | null) {
  const accessToken = await resolveMercadoPagoToken(tenantId);
  if (!accessToken) throw new PaymentError("Sin credenciales Mercado Pago", 500);
  const resp = await fetch(`${MP_API}/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!resp.ok) throw new PaymentError(`Mercado Pago respondió ${resp.status}`, 502);
  return resp.json();
}

export type SettleResult = "approved" | "pending" | "rejected" | "mismatch" | "not_found";

// Verifica el pago contra MP y, si corresponde, confirma la reserva. Idempotente.
export async function settlePayment(paymentRecordId: string, mpPaymentId: string): Promise<{ result: SettleResult; returnUrl?: string }> {
  const db = adminDb();
  const payRef = db.collection("payments").doc(paymentRecordId);
  const paySnap = await payRef.get();
  if (!paySnap.exists) return { result: "not_found" };
  const pay = paySnap.data()!;
  if (pay.method !== "mercadopago") return { result: "not_found" };
  if (pay.status === "approved") return { result: "approved", returnUrl: pay.returnUrl };

  const mp = await fetchMercadoPagoPayment(mpPaymentId, pay.tenantId);
  const sameOrder = mp.external_reference === pay.buyOrder;
  const sameAmount = Math.round(Number(mp.transaction_amount)) === Math.round(Number(pay.amount)) && (mp.currency_id || "CLP") === "CLP";
  if (!sameOrder || !sameAmount) {
    await payRef.update({ status: "mismatch", mercadopagoPaymentId: String(mpPaymentId), mismatchAt: new Date() });
    console.error("MP pago no coincide", { paymentRecordId, mpPaymentId, sameOrder, sameAmount });
    return { result: "mismatch", returnUrl: pay.returnUrl };
  }

  if (mp.status !== "approved") {
    const result: SettleResult = ["rejected", "cancelled", "refunded", "charged_back"].includes(mp.status) ? "rejected" : "pending";
    await payRef.update({ status: mp.status, mercadopagoPaymentId: String(mpPaymentId), updatedAt: new Date() });
    return { result, returnUrl: pay.returnUrl };
  }

  // Firestore exige todas las lecturas antes de cualquier escritura en la transacción
  await db.runTransaction(async (tx) => {
    const fresh = await tx.get(payRef);
    if (fresh.data()?.status === "approved") return;
    const data = fresh.data()!;
    const couponId = data.pendingBookingData?.couponId;
    const cRef = couponId ? db.collection("coupons").doc(couponId) : null;
    const coupon = cRef ? await tx.get(cRef) : null;

    // Inscripción a torneo: lee y escribe (sus lecturas siguen antes de las escrituras de abajo)
    if (data.pendingRegistration) {
      await commitRegistration(tx, data.pendingRegistration, { paymentStatus: "paid", method: "mercadopago", paymentRecordId });
    }
    if (data.pendingEnrollment) {
      await commitEnrollment(tx, data.pendingEnrollment, { paymentStatus: "paid", method: "mercadopago", paymentRecordId }, false);
    }
    tx.update(payRef, { status: "approved", mercadopagoPaymentId: String(mpPaymentId), approvedAt: new Date() });
    if (data.bookingId && data.pendingBookingData) {
      tx.set(db.collection("bookings").doc(data.bookingId), {
        ...data.pendingBookingData,
        paymentMethod: "mercadopago",
        paymentStatus: "paid",
        status: "confirmed",
        paymentRecordId,
        createdAt: data.createdAt || new Date(),
        updatedAt: new Date(),
      });
    }
    if (cRef && coupon?.exists) { const n = couponUses(coupon.data()) + 1; tx.update(cRef, { uses: n, usedCount: n }); }
  });
  if (pay.bookingId) await syncBooking(String(pay.bookingId)).catch((e) => console.error("syncBooking", e));
  return { result: "approved", returnUrl: pay.returnUrl };
}

// ---------- Firma del webhook ----------

// https://www.mercadopago.cl/developers/es/docs/your-integrations/notifications/webhooks
export function isValidWebhookSignature(request: Request, dataId: string, secret: string): boolean {
  const sig = request.headers.get("x-signature") || "";
  const requestId = request.headers.get("x-request-id") || "";
  const parts = Object.fromEntries(sig.split(",").map((p) => p.trim().split("=") as [string, string]));
  if (!parts.ts || !parts.v1) return false;
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${parts.ts};`;
  const expected = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(parts.v1);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
