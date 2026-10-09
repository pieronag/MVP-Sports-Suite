// Reglas únicas de cálculo sobre reservas, para que Agenda, Check-in y Resumen
// muestren las mismas cifras.

// Duración en horas. Las reservas guardan horas (1.0, 1.5); valores > 12 se
// interpretan como minutos (datos antiguos). Sin dato: 1 hora.
export function durationHours(b: { duration?: unknown }): number {
  const d = Number(b?.duration);
  if (!Number.isFinite(d) || d <= 0) return 1;
  return d > 12 ? d / 60 : d;
}

// Lo efectivamente cobrado: pagado = total, abono = lo abonado, pendiente o
// devuelto = 0. Una reserva anulada ya cobrada sigue contando hasta su devolución.
export function collectedAmount(b: { paymentStatus?: string; totalPrice?: unknown; price?: unknown; finalPrice?: unknown; deposit?: unknown }): number {
  const ps = String(b?.paymentStatus || "").toLowerCase();
  const total = Number(b?.finalPrice ?? b?.totalPrice ?? b?.price) || 0;
  if (ps === "paid") return total;
  if (ps === "partial") return Number(b?.deposit) || 0;
  return 0;
}

// Saldo por cobrar de reservas vigentes (las anuladas no se cobran)
export function pendingAmount(b: { status?: string; paymentStatus?: string; totalPrice?: unknown; price?: unknown; finalPrice?: unknown; deposit?: unknown }): number {
  if (b?.status === "cancelled") return 0;
  const ps = String(b?.paymentStatus || "").toLowerCase();
  const total = Number(b?.finalPrice ?? b?.totalPrice ?? b?.price) || 0;
  if (ps === "pending") return total;
  if (ps === "partial") return Math.max(0, total - (Number(b?.deposit) || 0));
  return 0;
}

// Bloques horarios (de 1 h) que el recinto abre en un día, según schedule por día
// u openTime/closeTime. Soporta cierres pasada la medianoche (ej. 09:00–02:00).
export function dayOpenHours(venue: any, dateStr: string): { startHour: number; endHour: number; slots: string[] } {
  let openHour = 8;
  let closeHour = 23;
  if (venue?.openTime) openHour = parseInt(String(venue.openTime).split(":")[0]);
  if (venue?.closeTime) closeHour = parseInt(String(venue.closeTime).split(":")[0]);
  if (venue?.schedule && dateStr) {
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const cfg = venue.schedule[days[new Date(`${dateStr}T12:00:00`).getDay()]];
    if (cfg && cfg.isOpen !== false) {
      if (cfg.open) openHour = parseInt(String(cfg.open).split(":")[0]);
      if (cfg.close) closeHour = parseInt(String(cfg.close).split(":")[0]);
    }
  }
  if (isNaN(openHour)) openHour = 8;
  if (isNaN(closeHour)) closeHour = 23;
  if (closeHour < openHour) closeHour += 24;
  if (closeHour === 0) closeHour = 24;
  const slots: string[] = [];
  for (let i = openHour; i < closeHour; i++) slots.push(`${String(i % 24).padStart(2, "0")}:00`);
  return { startHour: openHour, endHour: closeHour, slots };
}
