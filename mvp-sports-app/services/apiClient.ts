import { auth } from './firebase';

// Rutas de servidor de la web (plan Spark: reemplazan a las Cloud Functions)
const API_BASE = (process.env.EXPO_PUBLIC_API_URL || 'https://mvpsports.cl').replace(/\/$/, '');

export async function postApi<T = any>(path: string, body: unknown): Promise<T> {
  const token = await auth.currentUser?.getIdToken().catch(() => undefined);
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any)?.error || `Error ${res.status}`);
  return data as T;
}

// Recalcula horarios ocupados y reseña tras escribir una reserva. Nunca bloquea el flujo.
export function syncBookingSlots(bookingId: string) {
  return postApi('/api/bookings/sync', { bookingId }).catch((e) => console.warn('syncBookingSlots', e?.message || e));
}
