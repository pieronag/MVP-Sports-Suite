// Resumen operativo de un día de recinto (panel del mánager): canchas en uso, caja, ocupación y próximas reservas.
import type { Booking } from "@/types/booking";
import { countsAsIncome } from "@/utils/bookingModel";
import { durationHours } from "@/utils/bookingMath";

export interface CourtRef { id: string; name: string; sport?: string }
export interface CourtNow extends CourtRef { isOccupied: boolean; currentBooking?: string; endTime?: Date }

const endOf = (b: Booking) => (b.start ? new Date(b.start.getTime() + durationHours(b.raw) * 3_600_000) : null);
const live = (b: Booking) => b.state !== "cancelled" && !b.isNoShow;

export function summarizeDay(bookings: Booking[], courts: CourtRef[], capacitySlots: number, now: Date = new Date()) {
  const active = bookings.filter(live);

  const courtStatuses: CourtNow[] = courts.map((c) => {
    const b = active.find((x) => x.courtId === c.id && x.start && x.start <= now && (endOf(x) as Date) > now);
    return b ? { ...c, isOccupied: true, currentBooking: b.clientName, endTime: endOf(b) || undefined } : { ...c, isOccupied: false };
  });

  const income = bookings.filter(countsAsIncome);
  const revenueToday = income.reduce((acc, b) => acc + b.price, 0);
  const hoursBooked = active.reduce((acc, b) => acc + durationHours(b.raw), 0);
  const capacity = Math.max(1, courts.length * capacitySlots);

  const nextBookings = active
    .filter((b) => { const e = endOf(b); return !!e && e > now; })
    .sort((a, b) => (a.start?.getTime() || 0) - (b.start?.getTime() || 0))
    .slice(0, 5);

  return {
    todayCount: active.length,
    activeNow: courtStatuses.filter((c) => c.isOccupied).length,
    revenueToday,
    occupancyRate: Math.min(100, Math.round((hoursBooked / capacity) * 100)),
    avgTicket: income.length ? Math.round(revenueToday / income.length) : 0,
    courtStatuses,
    nextBookings,
  };
}
