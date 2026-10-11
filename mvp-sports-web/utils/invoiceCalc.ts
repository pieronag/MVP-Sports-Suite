// Liquidación mensual de un recinto: costo del plan + comisión sobre lo que el recinto cobró en el mes
import type { Booking } from "@/types/booking";
import { countsAsIncome } from "@/utils/bookingModel";

export interface PlanConfig { id?: string; name?: string; price?: number; commission?: number }

export function findPlan(plans: PlanConfig[], tenant: { planId?: string; plan?: string }) {
  const ref = String(tenant.planId || tenant.plan || "").toLowerCase();
  if (!ref) return undefined;
  return plans.find((p) => String(p.id || "").toLowerCase() === ref || String(p.name || "").toLowerCase() === ref);
}

export function invoiceFor(tenant: { id: string; planId?: string; plan?: string }, bookings: Booking[], plans: PlanConfig[], defaultRate: number) {
  const plan = findPlan(plans, tenant);
  const commissionRate = plan?.commission ?? defaultRate;
  const planCost = Number(plan?.price || 0);
  // Ingreso real del recinto: pagadas vigentes e inasistencias (sin anuladas ni reembolsadas)
  const mine = bookings.filter((b) => b.tenantId === tenant.id && countsAsIncome(b));
  const totalRevenue = mine.reduce((acc, b) => acc + b.price, 0);
  const commissionTotal = Math.round(totalRevenue * (commissionRate / 100));
  return {
    amount: commissionTotal + planCost,
    breakdown: { planName: plan?.name || "Base", planCost, commissionRate, commissionTotal, totalBookings: mine.length, totalRevenue },
  };
}
