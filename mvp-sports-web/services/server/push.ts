import "server-only";
import crypto from "crypto";
import webpush from "web-push";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./firebase-admin";
import { pushFor, type PushEvent } from "@/utils/pushMessages";

// Notificaciones push (Web Push con claves VAPID propias). Las suscripciones viven en push_subscriptions,
// una por dispositivo (id = hash del endpoint) y solo las escribe el servidor.
let configured: boolean | null = null;
function ready() {
  if (configured !== null) return configured;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  configured = !!(pub && priv);
  if (configured) webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:soporte@mvpsports.cl", pub!, priv!);
  return configured;
}

export const subscriptionId = (endpoint: string) => crypto.createHash("sha256").update(endpoint).digest("hex").slice(0, 40);

export interface BrowserSubscription { endpoint: string; keys: { p256dh: string; auth: string } }

export async function saveSubscription(uid: string, sub: BrowserSubscription, userAgent = "") {
  await adminDb().collection("push_subscriptions").doc(subscriptionId(sub.endpoint)).set({
    uid, endpoint: sub.endpoint, keys: sub.keys, userAgent: userAgent.slice(0, 200), updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
}

export async function removeSubscription(uid: string, endpoint: string) {
  const ref = adminDb().collection("push_subscriptions").doc(subscriptionId(endpoint));
  const doc = await ref.get();
  if (doc.exists && doc.data()?.uid === uid) await ref.delete();
}

// Envía a todos los dispositivos del jugador. Nunca lanza: una notificación no debe romper un pago o un check-in.
export async function notifyUser(uid: string | undefined | null, event: PushEvent): Promise<number> {
  if (!uid || !ready()) return 0;
  try {
    const db = adminDb();
    const user = (await db.collection("users").doc(uid).get()).data() || {};
    if (user.notificationsEnabled === false) return 0;
    const subs = await db.collection("push_subscriptions").where("uid", "==", uid).get();
    if (subs.empty) return 0;
    const payload = JSON.stringify(pushFor(event));
    let sent = 0;
    await Promise.all(subs.docs.map(async (d) => {
      const s = d.data();
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, payload, { TTL: 60 * 60 * 24 });
        sent++;
      } catch (e: any) {
        // 404/410: la suscripción ya no existe (desinstaló o revocó el permiso)
        if (e?.statusCode === 404 || e?.statusCode === 410) await d.ref.delete().catch(() => undefined);
        else console.warn("push", e?.statusCode || e?.message);
      }
    }));
    return sent;
  } catch (e) {
    console.warn("notifyUser", e);
    return 0;
  }
}
