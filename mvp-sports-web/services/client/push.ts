// Notificaciones push del jugador en este dispositivo
import { auth } from "@/services/client/firebase";
import { postApi } from "@/services/client/apiClient";

export type PushState = "unsupported" | "blocked" | "off" | "on";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

const toUint8 = (base64: string) => {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

export const pushSupported = () =>
  typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window && !!PUBLIC_KEY;

async function registration() {
  return (await navigator.serviceWorker.getRegistration("/player/")) || navigator.serviceWorker.register("/player/sw.js", { scope: "/player" });
}

export async function pushState(): Promise<PushState> {
  if (!pushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "blocked";
  const reg = await navigator.serviceWorker.getRegistration("/player/");
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === "granted" ? "on" : "off";
}

// Pide permiso, suscribe este dispositivo y lo registra en el servidor
export async function enablePush(): Promise<PushState> {
  if (!pushSupported()) return "unsupported";
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "blocked" : "off";
  const reg = await registration();
  await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) ||
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toUint8(PUBLIC_KEY) }));
  await postApi("/api/push/subscribe", { subscription: sub.toJSON() });
  return "on";
}

export async function disablePush(): Promise<PushState> {
  if (!pushSupported()) return "unsupported";
  const reg = await navigator.serviceWorker.getRegistration("/player/");
  const sub = await reg?.pushManager.getSubscription();
  const token = await auth.currentUser?.getIdToken().catch(() => undefined);
  await fetch("/api/push/subscribe", {
    method: "DELETE",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ endpoint: sub?.endpoint || null }),
  });
  await sub?.unsubscribe().catch(() => undefined);
  return "off";
}

export const sendTestPush = () => postApi("/api/push/test", {});
