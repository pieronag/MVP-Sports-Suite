
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

// Instante de "fecha + hora" en America/Santiago (el offset cambia -03/-04 según horario de verano)
export function chileDateTime(dateStr: string, h: number, m: number, addDays = 0): Date {
  const [y, mo, d] = dateStr.split("-").map(Number);
  for (const offset of [3, 4]) {
    const candidate = new Date(Date.UTC(y, mo - 1, d + addDays, h + offset, m));
    const hourInChile = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Santiago", hour: "numeric", hourCycle: "h23" }).format(candidate));
    if (hourInChile === h) return candidate;
  }
  return new Date(Date.UTC(y, mo - 1, d + addDays, h + 3, m));
}

// Inicio real de un bloque del día operativo (antes de las 06:00 pertenece al día siguiente)
export function slotInstant(dateStr: string, time: string): Date {
  const [h, m] = time.split(":").map(Number);
  return chileDateTime(dateStr, h, m || 0, h < 6 ? 1 : 0);
}

// Día calendario de hoy en Chile (AAAA-MM-DD), para comparar con fechas guardadas sin hora
export const chileToday = (now: Date = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(now);

// Día operativo de un recinto: antes de las 06:00 sigue siendo el día anterior. Devuelve AAAA-MM-DD y su ventana.
export function operatingDay(now: Date = new Date()): { day: string; from: Date; to: Date } {
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Santiago", hour: "numeric", hourCycle: "h23" }).format(now));
  let day = chileToday(now);
  if (hour < 6) {
    const [y, m, d] = day.split("-").map(Number);
    day = new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
  }
  return { day, from: chileDateTime(day, 6, 0), to: new Date(chileDateTime(day, 6, 0, 1).getTime() - 1) };
}

// Fecha legible en Chile para los avisos ("13 oct")
export const chileDayLabel = (d: Date) => new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", day: "numeric", month: "short" }).format(d);
