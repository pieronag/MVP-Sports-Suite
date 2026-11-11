// Validez de un cupón. El panel guarda validFrom/validUntil (AAAA-MM-DD), limit, uses, minimumPurchase y status;
// se aceptan también los campos antiguos (expiresAt, usageLimit, usedCount).

const chileDay = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(d); // AAAA-MM-DD

export const couponUses = (c: any) => Math.max(Number(c?.uses) || 0, Number(c?.usedCount) || 0);
export const couponLimit = (c: any) => Number(c?.limit ?? c?.usageLimit) || 0;

export function couponIssue(c: any, opts: { tenantId: string; price: number; now?: Date; tenantOwnerIds?: string[] }): string | null {
  const now = opts.now ?? new Date();
  const today = chileDay(now);
  if (c?.status && c.status !== "active") return "Este cupón no está activo";
  if (c?.tenantId && c.tenantId !== opts.tenantId) return "Este cupón no es válido para este recinto";
  // Cupón antiguo sin recinto: solo vale en los recintos de su dueño (antes valía en toda la plataforma)
  if (!c?.tenantId && !(c?.ownerId && (opts.tenantOwnerIds || []).includes(c.ownerId))) return "Este cupón no es válido para este recinto";
  // Descuento coherente: porcentaje entre 1 y 100, monto fijo positivo
  const d = Number(c?.discount);
  if (!Number.isFinite(d) || d <= 0 || ((c?.type || "percentage") !== "fixed" && d > 100)) return "Este cupón no es válido";
  if (c?.validFrom && today < String(c.validFrom)) return "Este cupón aún no está vigente";
  if (c?.validUntil && today > String(c.validUntil)) return "Este cupón ha expirado";
  if (c?.expiresAt?.toMillis && c.expiresAt.toMillis() < now.getTime()) return "Este cupón ha expirado";
  const limit = couponLimit(c);
  if (limit > 0 && couponUses(c) >= limit) return "Este cupón ya no tiene usos disponibles";
  const min = Number(c?.minimumPurchase) || 0;
  if (min > 0 && opts.price < min) return `Este cupón requiere una compra mínima de $${min.toLocaleString("es-CL")}`;
  return null;
}

// Entre los cupones con el mismo código (cada recinto puede tener el suyo), el del recinto de la reserva;
// si no hay, uno antiguo sin recinto del dueño de ese recinto
export function pickCoupon<T extends { tenantId?: string; ownerId?: string }>(candidates: T[], tenantId: string, tenantOwnerIds: string[] = []): T | null {
  return candidates.find((c) => c.tenantId === tenantId)
    ?? candidates.find((c) => !c.tenantId && !!c.ownerId && tenantOwnerIds.includes(c.ownerId))
    ?? null;
}
