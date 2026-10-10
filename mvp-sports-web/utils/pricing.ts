// Tarifa de un bloque: la usan el checkout (cliente) y el servidor de pagos, así siempre coinciden.
// Tarifa del bloque horario más cercano según la configuración del recinto
export function priceFromTenantConfig(tenant: any, sport: string, dateStr: string, timeStr: string): number {
  const pricing = tenant?.pricing?.[sport];
  if (!pricing) return 0;
  const day = new Date(`${dateStr}T12:00:00`).getDay();
  const schedule = day === 0 || day === 6 ? pricing.weekend : pricing.weekday;
  if (!schedule) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  const target = h * 60 + (m || 0);
  let best = 0;
  let bestDiff = Infinity;
  for (const [slot, price] of Object.entries(schedule)) {
    const [sh, sm] = slot.split(":").map(Number);
    const diff = Math.abs(target - (sh * 60 + (sm || 0)));
    if (diff < bestDiff) {
      bestDiff = diff;
      best = Number(price) || 0;
    }
  }
  return best;
}
