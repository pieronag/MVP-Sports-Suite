// Resumen de ingresos de un conjunto de reservas, con días calendario de Chile
import type { Booking } from "@/types/booking";
import { countsAsIncome } from "@/utils/bookingModel";
import { chileDateTime, chileToday } from "@/utils/chileTime";

export type TimeRange = "today" | "7d" | "30d" | "month";

const addDays = (day: string, n: number) => {
  const [y, m, d] = day.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
};
const chileDayOf = (d: Date) => chileToday(d);

// Desde el inicio del primer día hasta el final del día de hoy (o del mes), en hora de Chile
export function rangeFor(range: TimeRange, now: Date = new Date()): { from: Date; to: Date } {
  const today = chileToday(now);
  const endOf = (day: string) => new Date(chileDateTime(addDays(day, 1), 0, 0).getTime() - 1);
  if (range === "today") return { from: chileDateTime(today, 0, 0), to: endOf(today) };
  if (range === "7d") return { from: chileDateTime(addDays(today, -6), 0, 0), to: endOf(today) };
  if (range === "30d") return { from: chileDateTime(addDays(today, -29), 0, 0), to: endOf(today) };
  const [y, m] = today.split("-").map(Number);
  const first = `${y}-${String(m).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: chileDateTime(first, 0, 0), to: endOf(`${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`) };
}

export interface RevenueSummary {
  revenue: number;
  revenueToday: number;
  incomeCount: number;
  byDay: { name: string; valor: number }[];
  byVenue: { name: string; value: number }[];
}

export function summarizeRevenue(bookings: Booking[], venueName: (tenantId: string) => string, now: Date = new Date()): RevenueSummary {
  const today = chileToday(now);
  const day = new Map<string, number>();
  const venue = new Map<string, number>();
  let revenue = 0, revenueToday = 0, incomeCount = 0;
  for (const b of bookings) {
    if (!countsAsIncome(b) || !b.start) continue;
    incomeCount++;
    revenue += b.price;
    const d = chileDayOf(b.start);
    if (d === today) revenueToday += b.price;
    day.set(d, (day.get(d) || 0) + b.price);
    const v = venueName(b.tenantId) || "Recinto";
    venue.set(v, (venue.get(v) || 0) + b.price);
  }
  const byDay = [...day.entries()].sort(([a], [b]) => a.localeCompare(b))
    .map(([d, valor]) => ({ name: `${d.slice(8, 10)}/${d.slice(5, 7)}`, valor }));
  const byVenue = [...venue.entries()].map(([name, value]) => ({ name, value }));
  return { revenue, revenueToday, incomeCount, byDay, byVenue };
}
