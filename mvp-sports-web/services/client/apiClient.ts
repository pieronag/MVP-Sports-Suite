import { auth } from "@/services/client/firebase";

// POST a una ruta de API propia con el token de sesión (si hay). Lanza Error con el mensaje del servidor.
export async function postApi<T = any>(path: string, body: unknown): Promise<T> {
  const token = await auth.currentUser?.getIdToken().catch(() => undefined);
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Error ${res.status}`);
  return data as T;
}

// Recalcula horarios ocupados/reseña tras escribir una reserva. Nunca bloquea el flujo.
export function syncBookingSlots(bookingId: string, prev?: { courtId?: string; date?: any; startTime?: string } | null) {
  const p = prev ? { courtId: prev.courtId, startTime: prev.startTime, date: serializeDate(prev.date) } : undefined;
  return postApi("/api/bookings/sync", { bookingId, prev: p }).catch((e) => console.warn("syncBookingSlots", e));
}

function serializeDate(d: any) {
  if (!d) return d;
  if (typeof d?.toDate === "function") return d.toDate().toISOString();
  if (d instanceof Date) return d.toISOString();
  if (typeof d?.seconds === "number") return new Date(d.seconds * 1000).toISOString();
  return d;
}

export async function getApi<T = any>(path: string): Promise<T> {
  const token = await auth.currentUser?.getIdToken().catch(() => undefined);
  const res = await fetch(path, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Error ${res.status}`);
  return data as T;
}
