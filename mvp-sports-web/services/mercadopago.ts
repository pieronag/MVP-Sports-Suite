import "server-only";
import crypto from "crypto";
import { adminDb } from "./firebase-admin";
import { resolveMercadoPagoToken } from "./tenant-secrets";

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

// Igual que getPriceFromConfig del cliente: tarifa del bloque horario más cercano
export function priceFromTenantConfig(tenant: any, sport: string, dateStr: string, timeStr: string): number {
  const pricing = tenant?.pricing?.[sport];
  if (!pricing) return 0;
  const day = new Date(`${dateStr}T12:00:00`).getDay();
  const schedule = day === 0 || day === 6 ? pricing.weekend : pricing.weekday;
  if (!schedule) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  const target = h * 60 + (m || 0);
  let best = 0;
  let bestDiff = Infinity;
  for (const [slot, price] of Object.entries(schedule)) {
    const [sh, sm] = slot.split(":").map(Number);
    const diff = Math.abs(target - (sh * 60 + (sm || 0)));
    if (diff < bestDiff) {
      bestDiff = diff;
      best = Number(price) || 0;
    }
  }
  return best;
}

async function resolveCoupon(code: string | undefined, tenantId: string) {
  if (!code) return null;
  const snap = await adminDb().collection("coupons").where("code", "==", code.trim().toUpperCase()).limit(1).get();
  if (snap.empty) throw new PaymentError("Cupón no encontrado");
  const doc = snap.docs[0];
  const c = doc.data();
  if (c.tenantId && c.tenantId !== tenantId) throw new PaymentError("Este cupón no es válido para este recinto");
  if (c.expiresAt?.toMillis && c.expiresAt.toMillis() < Date.now()) throw new PaymentError("Este cupón ha expirado");
  if (c.usageLimit && (c.usedCount || 0) >= c.usageLimit) throw new PaymentError("Este cupón ya no tiene usos disponibles");
  return { id: doc.id, code: c.code as string, discount: Number(c.discount) || 0, type: (c.type || "percentage") as string };
}

// Instante de "fecha + hora" en America/Santiago (el offset cambia -03/-04 según horario de verano)
function chileDateTime(dateStr: string, h: number, m: number, addDays = 0): Date {
  const [y, mo, d] = dateStr.split("-").map(Number);
  for (const offset of [3, 4]) {
    const candidate = new Date(Date.UTC(y, mo - 1, d + addDays, h + offset, m));
    const hourInChile = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Santiago", hour: "numeric", hourCycle: "h23" }).format(candidate));
    if (hourInChile === h) return candidate;
  }
  return new Date(Date.UTC(y, mo - 1, d + addDays, h + 3, m));
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

  const coupon = await resolveCoupon(input.couponCode, tenantId);
  const discount = coupon ? (coupon.type === "fixed" ? coupon.discount : (basePrice * coupon.discount) / 100) : 0;
  const amount = Math.max(0, Math.round(basePrice - discount));
  if (amount <= 0) throw new PaymentError("El monto a pagar debe ser mayor a cero");

  // Fecha real del bloque (antes de las 06:00 pertenece al día siguiente)
  const [sh, sm] = startTime.split(":").map(Number);
  const bookingDate = chileDateTime(date, sh, sm || 0, sh < 6 ? 1 : 0);

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

export async function createPreference(params: {
  uid: string;
  tenantId: string;
  bookingId: string;
  bookingData: Record<string, unknown>;
  amount: number;
  title: string;
  returnUrl: string;
}) {
  const accessToken = await resolveMercadoPagoToken(params.tenantId);
  if (!accessToken) throw new PaymentError("Mercado Pago no está configurado para este recinto.");

  const db = adminDb();
  const payRef = db.collection("payments").doc();
  const buyOrder = `ORD-${payRef.id}`;
  const back = (status: string) => `${SITE_URL}/api/mercadopago/commit?status=${status}&pid=${payRef.id}`;

  const resp = await fetch(`${MP_API}/checkout/preferences`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({
      items: [{ id: params.bookingId, title: params.title, quantity: 1, unit_price: params.amount, currency_id: "CLP" }],
      back_urls: { success: back("success"), pending: back("pending"), failure: back("failure") },
      auto_return: "approved",
      notification_url: `${SITE_URL}/api/mercadopago/webhook?pid=${payRef.id}`,
      external_reference: buyOrder,
      metadata: { payment_record_id: payRef.id, tenant_id: params.tenantId, booking_id: params.bookingId },
    }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new PaymentError(data.message || "Error al crear la preferencia de pago", 502);

  await payRef.set({
    userId: params.uid,
    bookingId: params.bookingId,
    tenantId: params.tenantId,
    amount: params.amount,
    currency: "CLP",
    buyOrder,
    preferenceId: data.id,
    status: "pending",
    method: "mercadopago",
    pendingBookingData: params.bookingData,
    returnUrl: params.returnUrl,
    createdAt: new Date(),
  });

  return { url: data.init_point as string, preferenceId: data.id as string, paymentRecordId: payRef.id };
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

  await db.runTransaction(async (tx) => {
    const fresh = await tx.get(payRef);
    if (fresh.data()?.status === "approved") return;
    const data = fresh.data()!;
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
    const couponId = data.pendingBookingData?.couponId;
    if (couponId) {
      const cRef = db.collection("coupons").doc(couponId);
      const c = await tx.get(cRef);
      if (c.exists) tx.update(cRef, { usedCount: (c.data()?.usedCount || 0) + 1 });
    }
  });
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
