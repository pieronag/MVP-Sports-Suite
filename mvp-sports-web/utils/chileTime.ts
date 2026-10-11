
// Hora de pared en Chile como instante comparable (la diferencia entre dos de estos es la real)
export function chileWallClock(d: Date, time?: string): number {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: "America/Santiago", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", hourCycle: "h23" })
      .formatToParts(d).map((x) => [x.type, Number(x.value)])
  );
  const [h, m] = time ? time.split(":").map(Number) : [p.hour, p.minute];
  return Date.UTC(p.year, p.month - 1, p.day, h || 0, m || 0);
}

// Horas que faltan para el inicio de la reserva (negativo si ya empezó); null si faltan datos
export function hoursUntilStart(booking: any, now: Date = new Date()): number | null {
  const raw = booking.date;
  const date: Date | null = raw?.toDate ? raw.toDate() : raw ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(String(raw)) ? `${raw}T12:00:00Z` : raw) : null;
  if (!date || isNaN(date.getTime()) || !booking.startTime) return null;
  return (chileWallClock(date, booking.startTime) - chileWallClock(now)) / 3_600_000;
}
