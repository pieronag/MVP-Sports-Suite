// Acceso a reservas desde el navegador. Las pantallas usan estas funciones en vez de consultar Firestore directo:
// devuelven siempre el modelo normalizado (types/booking.ts).
import { collection, getDocs, onSnapshot, query, where, Timestamp, type QueryConstraint } from "firebase/firestore";
import { db } from "@/services/client/firebase";
import { normalizeBooking } from "@/utils/bookingModel";
import type { Booking } from "@/types/booking";

export interface BookingRange { from?: Date; to?: Date }

const chunks = <T,>(arr: T[], n = 30) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

// Algunas reservas antiguas guardan el instante en `startTime` en vez de `date`: se consultan ambos campos
function queriesFor(tenantIds: string[], range: BookingRange) {
  const out: ReturnType<typeof query>[] = [];
  for (const ids of chunks([...new Set(tenantIds.filter(Boolean))])) {
    for (const field of ["date", "startTime"]) {
      const c: QueryConstraint[] = [where("tenantId", "in", ids)];
      if (range.from) c.push(where(field, ">=", Timestamp.fromDate(range.from)));
      if (range.to) c.push(where(field, "<=", Timestamp.fromDate(range.to)));
      if (!range.from && !range.to && field === "startTime") continue; // sin rango basta una consulta
      out.push(query(collection(db, "bookings"), ...c));
    }
  }
  return out;
}

const sortByStart = (list: Booking[]) => list.sort((a, b) => (a.start?.getTime() || 0) - (b.start?.getTime() || 0));

export async function listBookings(tenantIds: string[], range: BookingRange = {}): Promise<Booking[]> {
  if (!tenantIds.length) return [];
  const snaps = await Promise.all(queriesFor(tenantIds, range).map((q) => getDocs(q).catch(() => null)));
  const map = new Map<string, Booking>();
  for (const s of snaps) s?.docs.forEach((d) => map.set(d.id, normalizeBooking(d.id, d.data() as Record<string, any>)));
  return sortByStart([...map.values()]);
}

// Suscripción en vivo; onError recibe el error de permisos/red para mostrar un aviso
export function watchBookings(tenantIds: string[], range: BookingRange, onData: (list: Booking[]) => void, onError?: (e: Error) => void): () => void {
  if (!tenantIds.length) { onData([]); return () => {}; }
  const parts = new Map<number, Map<string, Booking>>();
  const qs = queriesFor(tenantIds, range);
  const emit = () => {
    const all = new Map<string, Booking>();
    parts.forEach((m) => m.forEach((b, id) => all.set(id, b)));
    onData(sortByStart([...all.values()]));
  };
  const unsubs = qs.map((q, i) => onSnapshot(q, (snap) => {
    parts.set(i, new Map(snap.docs.map((d) => [d.id, normalizeBooking(d.id, d.data() as Record<string, any>)])));
    if (parts.size === qs.length) emit();
  }, (e) => { parts.set(i, new Map()); onError?.(e); if (parts.size === qs.length) emit(); }));
  return () => unsubs.forEach((u) => u());
}
