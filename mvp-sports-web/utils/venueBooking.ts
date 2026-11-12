// Reserva desde la ficha del recinto (jugador): deportes reservables, canchas, días, horarios y precio.
// El precio sale de utils/pricing (el mismo que usan el checkout y el servidor de pagos).
import { canonicalSport } from "./sports";
import { courtBlockedAt } from "./courtAvailability";
import { openHours } from "./venueSchedule";
import { priceFromTenantConfig } from "./pricing";
import { slotInstant } from "./chileTime";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Venue = Record<string, any>;
const fold = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
type Court = { id: string; name?: string; sport?: string; status?: string } & Record<string, any>;

const hasPrice = (p: any) => [p?.weekday, p?.weekend].some((s) => s && Object.values(s).some((v) => Number(v) > 0));

/** Deportes con tarifa (alguna hora con precio), uno por deporte aunque la clave venga con variantes ("Padel"/"Pádel"). */
export function bookableSports(venue: Venue | null): string[] {
  const pricing = venue?.pricing || {};
  const out = new Map<string, string>();
  for (const key of Object.keys(pricing)) if (hasPrice(pricing[key])) out.set(canonicalSport(key), out.get(canonicalSport(key)) || key);
  return [...out.values()].sort((a, b) => a.localeCompare(b, "es"));
}

/** Canchas del deporte, en orden natural (Cancha 2 antes que Cancha 10). */
export function courtsForSport(courts: Court[], sport: string): Court[] {
  const want = canonicalSport(sport), w = fold(want);
  // Mismo deporte oficial, o una variante que lo contiene ("Fútbol 7" para Fútbol)
  return courts.filter((c) => { const cs = canonicalSport(c.sport || ""); return cs === want || (!!cs && (fold(cs).includes(w) || w.includes(fold(cs)))); })
    .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "es", { numeric: true }));
}

/** Horarios abiertos del recinto ese día, sin los ya tomados en la cancha. */
export const freeTimes = (venue: Venue, dateStr: string, taken: string[]) => {
  const busy = new Set(taken);
  return openHours(venue, dateStr).slots.filter((t) => !busy.has(t));
};

/** Orden de un horario dentro del día operativo (00:00–05:59 va al final). */
export const slotOrder = (t: string) => { const [h, m] = t.split(":").map(Number); return (h < 6 ? h + 24 : h) * 60 + (m || 0); };
export const periodOf = (t: string): "manana" | "tarde" | "noche" => {
  const h = Number(t.split(":")[0]);
  return h >= 6 && h < 12 ? "manana" : h >= 12 && h < 18 ? "tarde" : "noche";
};

/**
 * Para cada horario del día, las canchas libres: no tomadas, dentro del horario del recinto, sin mantenimiento
 * en esa hora y que aún no empiezan. Una cancha con mantenimiento programado solo se bloquea en su ventana.
 */
export function timesWithCourts(courts: Court[], freeByCourt: Record<string, string[]>, dateStr: string, now: Date) {
  const map = new Map<string, Court[]>();
  for (const c of courts) {
    for (const t of freeByCourt[c.id] || []) {
      const start = slotInstant(dateStr, t).getTime();
      if (start <= now.getTime() || courtBlockedAt(c, start, start + 3_600_000)) continue;
      map.set(t, [...(map.get(t) || []), c]);
    }
  }
  return [...map.entries()].sort(([a], [b]) => slotOrder(a) - slotOrder(b)).map(([time, free]) => ({ time, courts: free }));
}

export const slotPrice = (venue: Venue | null, sport: string, dateStr: string, time: string) => priceFromTenantConfig(venue, sport, dateStr, time);

const ymd = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(d);
const WEEKDAY = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

/** Días reservables desde hoy. "Hoy" es el día operativo: antes de las 06:00 sigue siendo el día anterior. */
export function bookingDays(now: Date, count = 14, venue?: Venue | null) {
  const base = new Date(`${ymd(new Date(now.getTime() - 6 * 3_600_000))}T12:00:00Z`);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(base.getTime() + i * 86_400_000);
    const date = d.toISOString().slice(0, 10);
    const dow = d.getUTCDay();
    return {
      date, day: d.getUTCDate(),
      label: i === 0 ? "Hoy" : i === 1 ? "Mañana" : WEEKDAY[dow],
      month: d.toLocaleDateString("es-CL", { month: "short", timeZone: "UTC" }).replace(".", ""),
      closed: venue?.schedule?.[DAY_KEYS[dow]]?.isOpen === false,
    };
  });
}

/** Horario de hoy para la cabecera ("08:00 - 23:00" o "Cerrado"). */
export function hoursOn(venue: Venue | null, dateStr: string) {
  if (!venue) return "";
  const h = openHours(venue, dateStr);
  if (!h.isOpen) return "Cerrado";
  return `${String(h.startHour % 24).padStart(2, "0")}:00 - ${String(h.endHour % 24).padStart(2, "0")}:00`;
}

/** Semana agrupando días seguidos con el mismo horario: "Lun a Vie 08:00 - 23:00", "Dom Cerrado". */
export function weekHours(venue: Venue | null): string[] {
  if (!venue) return [];
  // Una semana cualquiera que empieza en lunes
  const monday = "2026-01-05";
  const rows = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(Date.parse(`${monday}T12:00:00Z`) + i * 86_400_000).toISOString().slice(0, 10);
    return { name: WEEKDAY[(i + 1) % 7], hours: hoursOn(venue, date) };
  });
  const groups: { from: string; to: string; hours: string }[] = [];
  for (const r of rows) {
    const last = groups[groups.length - 1];
    if (last && last.hours === r.hours) last.to = r.name;
    else groups.push({ from: r.name, to: r.name, hours: r.hours });
  }
  if (groups.length === 1) return [`Todos los días ${groups[0].hours}`];
  return groups.map((g) => `${g.from === g.to ? g.from : `${g.from} a ${g.to}`} ${g.hours}`);
}

export function distanceLabel(from: { latitude: number; longitude: number }, to: { latitude: number; longitude: number }) {
  const R = 6371, rad = Math.PI / 180;
  const a = Math.sin(((to.latitude - from.latitude) * rad) / 2) ** 2
    + Math.cos(from.latitude * rad) * Math.cos(to.latitude * rad) * Math.sin(((to.longitude - from.longitude) * rad) / 2) ** 2;
  const km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

export function venueCoords(venue: Venue | null) {
  const c = venue?.coordinates || venue?.location;
  const latitude = Number(c?.latitude ?? c?._lat ?? c?.lat), longitude = Number(c?.longitude ?? c?._long ?? c?.lng);
  return Number.isFinite(latitude) && Number.isFinite(longitude) && (latitude || longitude) ? { latitude, longitude } : null;
}
