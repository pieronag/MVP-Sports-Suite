import { NextResponse } from "next/server";
import { verifyAuthedCaller } from "@/services/server/server-auth";
import { allowRequest } from "@/services/server/rateLimit";
import { saveSubscription, removeSubscription } from "@/services/server/push";
import { adminDb } from "@/services/server/firebase-admin";

// Activa (POST) o desactiva (DELETE) las notificaciones de este dispositivo
export async function POST(request: Request) {
  const caller = await verifyAuthedCaller(request);
  if (!caller) return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });
  if (!(await allowRequest(`push_sub_${caller.uid}`, 20, 60_000))) return NextResponse.json({ error: "Demasiadas solicitudes." }, { status: 429 });
  const { subscription } = await request.json().catch(() => ({}));
  const ok = subscription && typeof subscription.endpoint === "string" && /^https:\/\//.test(subscription.endpoint)
    && typeof subscription.keys?.p256dh === "string" && typeof subscription.keys?.auth === "string";
  if (!ok) return NextResponse.json({ error: "Suscripción no válida." }, { status: 400 });
  await saveSubscription(caller.uid, subscription, request.headers.get("user-agent") || "");
  await adminDb().collection("users").doc(caller.uid).set({ notificationsEnabled: true }, { merge: true });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const caller = await verifyAuthedCaller(request);
  if (!caller) return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });
  const { endpoint } = await request.json().catch(() => ({}));
  if (typeof endpoint === "string") await removeSubscription(caller.uid, endpoint);
  await adminDb().collection("users").doc(caller.uid).set({ notificationsEnabled: false }, { merge: true });
  return NextResponse.json({ ok: true });
}
