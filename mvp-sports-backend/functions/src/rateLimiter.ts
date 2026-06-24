import * as admin from "firebase-admin";
import {HttpsError} from "firebase-functions/v2/https";

const db = admin.firestore();

interface RateLimitConfig {
  maxCalls: number;
  windowMs: number;
}

const DEFAULTS: Record<string, RateLimitConfig> = {
  awardPlayerXp: {maxCalls: 5, windowMs: 60_000},
  createWebpayTransaction: {maxCalls: 10, windowMs: 60_000},
  authorizeOneclickPayment: {maxCalls: 10, windowMs: 60_000},
  sendAuthEmail: {maxCalls: 3, windowMs: 60_000},
  refundBookingPayment: {maxCalls: 3, windowMs: 60_000},
};

export async function checkRateLimit(
  functionName: string,
  userId: string,
  config?: RateLimitConfig,
): Promise<void> {
  const cfg = config || DEFAULTS[functionName];
  if (!cfg) return;

  const key = `${functionName}_${userId}`;
  const now = admin.firestore.Timestamp.now();
  const windowStart = new Date(now.toMillis() - cfg.windowMs);

  const recentCalls = await db.collection("rate_limits")
    .where("key", "==", key)
    .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(windowStart))
    .count()
    .get();

  if (recentCalls.data().count >= cfg.maxCalls) {
    throw new HttpsError(
      "resource-exhausted",
      `Demasiadas solicitudes. Intenta de nuevo en ${Math.ceil(cfg.windowMs / 1000)} segundos.`,
    );
  }

  await db.collection("rate_limits").add({
    key,
    userId,
    functionName,
    createdAt: now,
  });

  // Cleanup old entries (best-effort)
  const oldEntries = await db.collection("rate_limits")
    .where("key", "==", key)
    .where("createdAt", "<", admin.firestore.Timestamp.fromDate(windowStart))
    .limit(20)
    .get();

  if (!oldEntries.empty) {
    const batch = db.batch();
    oldEntries.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
}
