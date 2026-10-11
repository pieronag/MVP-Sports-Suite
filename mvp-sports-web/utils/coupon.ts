// Validez de un cupón. El panel guarda validFrom/validUntil (AAAA-MM-DD), limit, uses, minimumPurchase y status;
// se aceptan también los campos antiguos (expiresAt, usageLimit, usedCount).

const chileDay = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(d); // AAAA-MM-DD

export const couponUses = (c: any) => Math.max(Number(c?.uses) || 0, Number(c?.usedCount) || 0);
export const couponLimit = (c: any) => Number(c?.limit ?? c?.usageLimit) || 0;

export function couponIssue(c: any, opts: { tenantId: string; price: number; now?: Date }): string | null {
  const now = opts.now ?? new Date();
  const today = chileDay(now);
  if (c?.status && c.status !== "active") return "Este cupón no está activo";
  if (c?.tenantId && c.tenantId !== opts.tenantId) return "Este cupón no es válido para este recinto";
  if (c?.validFrom && today < String(c.validFrom)) return "Este cupón aún no está vigente";
  if (c?.validUntil && today > String(c.validUntil)) return "Este cupón ha expirado";
  if (c?.expiresAt?.toMillis && c.expiresAt.toMillis() < now.getTime()) return "Este cupón ha expirado";
  const limit = couponLimit(c);
  if (limit > 0 && couponUses(c) >= limit) return "Este cupón ya no tiene usos disponibles";
  const min = Number(c?.minimumPurchase) || 0;
  if (min > 0 && opts.price < min) return `Este cupón requiere una compra mínima de $${min.toLocaleString("es-CL")}`;
  return null;
}
