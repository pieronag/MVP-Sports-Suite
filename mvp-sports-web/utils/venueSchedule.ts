// Horario de un recinto para un día operativo (AAAA-MM-DD). Una sola regla para la agenda, la app y el servidor.
// - schedule[día] = { isOpen, open: "HH:MM", close: "HH:MM" } tiene prioridad sobre openTime/closeTime
// - un día con isOpen === false no tiene horarios
// - cierre menor o igual a la apertura cruza la medianoche (p. ej. 18:00 a 02:00)

const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

const hourOf = (t: unknown, fallback: number) => {
  const h = parseInt(String(t ?? "").split(":")[0], 10);
  return Number.isFinite(h) && h >= 0 && h <= 24 ? h : fallback;
};

export function dayOfWeek(dateStr: string): (typeof DAYS)[number] {
  const [y, m, d] = dateStr.split("-").map(Number);
  return DAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

export function openHours(venue: any, dateStr: string): { isOpen: boolean; startHour: number; endHour: number; slots: string[] } {
  let open = hourOf(venue?.openTime, 8);
  let close = hourOf(venue?.closeTime, 23);
  const cfg = venue?.schedule?.[dayOfWeek(dateStr)];
  if (cfg) {
    if (cfg.isOpen === false) return { isOpen: false, startHour: open, endHour: open, slots: [] };
    open = hourOf(cfg.open, open);
    close = hourOf(cfg.close, close);
  }
  if (close <= open) close += 24;
  const slots: string[] = [];
  for (let h = open; h < close; h++) slots.push(`${String(h % 24).padStart(2, "0")}:00`);
  return { isOpen: true, startHour: open, endHour: close, slots };
}

export const isWithinOpenHours = (venue: any, dateStr: string, time: string) => openHours(venue, dateStr).slots.includes(time);
