// Panel general del superadmin: KPIs de la plataforma, facturación por mes, rankings y reservas recientes.
// Mismas reglas que Métricas (utils/platformMetrics): estado del recinto, periodo de la liquidación y comisión por plan.
import type { Booking, RawDoc } from "@/types/booking";
import { countsAsIncome } from "./bookingModel";
import { findPlan, type PlanConfig } from "./invoiceCalc";
import { chileMonthDay, commissionRateFor, invoicePeriod, isActiveTenant, paymentMethod } from "./platformMetrics";

export const PLAN_PALETTE = ["#64748b", "#6366f1", "#8b5cf6", "#00df82", "#f59e0b", "#ec4899"];
const isPaid = (inv: RawDoc) => ["pagada", "paid"].includes(String(inv.status || "").toLowerCase());
const toDate = (v: any): Date | null => { // eslint-disable-line @typescript-eslint/no-explicit-any
  const d = v?.toDate ? v.toDate() : v?.seconds ? new Date(v.seconds * 1000) : v ? new Date(v) : null;
  return d && !isNaN(d.getTime()) ? d : null;
};
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export interface OverviewInput {
  /** "AAAA-MM", o null para todo el histórico */
  month: string | null;
  tenants: RawDoc[]; invoices: RawDoc[]; bookings: Booking[]; plans: PlanConfig[]; defaultRate: number;
}

export function computeOverview(i: OverviewInput) {
  const tenantById = new Map(i.tenants.map((t) => [t.id, t]));
  const active = i.tenants.filter((t) => isActiveTenant(t.status));
  const paying = active.filter((t) => Number(findPlan(i.plans, t)?.price) > 0);
  const mrr = active.reduce((s, t) => s + (Number(findPlan(i.plans, t)?.price) || 0), 0);
  const inPeriod = (m: string) => i.month === null || m === i.month;

  // Reservas con ingreso del periodo
  const income = i.bookings.filter((b) => countsAsIncome(b) && b.start && inPeriod(chileMonthDay(b.start).month));
  const commission = income.reduce((s, b) => s + b.price * (commissionRateFor(tenantById.get(b.tenantId), i.plans, i.defaultRate) / 100), 0);

  // Facturado y pagado: por el periodo que liquida cada factura
  const paidInPeriod = i.invoices.filter((inv) => isPaid(inv) && inPeriod(invoicePeriod(inv)));
  const billed = paidInPeriod.reduce((s, inv) => s + (Number(inv.amount ?? inv.total) || 0), 0);
  const allPaid = i.invoices.filter(isPaid).reduce((s, inv) => s + (Number(inv.amount ?? inv.total) || 0), 0);

  const months = new Map<string, { name: string; valor: number; bookings: number; sort: string }>();
  const bucket = (m: string) => {
    if (!m) return null;
    if (!months.has(m)) { const [y, mo] = m.split("-"); months.set(m, { name: `${MONTHS[Number(mo) - 1]} ${y.slice(2)}`, valor: 0, bookings: 0, sort: m }); }
    return months.get(m)!;
  };
  for (const inv of i.invoices) if (isPaid(inv)) { const e = bucket(invoicePeriod(inv)); if (e) e.valor += Number(inv.amount ?? inv.total) || 0; }
  for (const b of i.bookings) if (countsAsIncome(b) && b.start) bucket(chileMonthDay(b.start).month)!.bookings++;

  const rank = (by: (b: Booking) => number) => {
    const m = new Map<string, { name: string; value: number }>();
    for (const b of income) {
      const k = b.tenantId || b.tenantName;
      const e = m.get(k) || { name: tenantById.get(b.tenantId)?.name || b.tenantName || "Recinto", value: 0 };
      e.value += by(b); m.set(k, e);
    }
    return [...m.values()].sort((a, b) => b.value - a.value).slice(0, 5);
  };

  const sortedPlans = [...i.plans].sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
  const dist = sortedPlans.map((p, k) => ({ name: String(p.name || p.id || "Plan"), value: 0, color: PLAN_PALETTE[k % PLAN_PALETTE.length] }));
  let noPlan = 0;
  for (const t of i.tenants) {
    const p = findPlan(i.plans, t);
    const e = p ? dist.find((d) => d.name === String(p.name || p.id || "Plan")) : null;
    if (e) e.value++; else noPlan++;
  }
  if (noPlan) dist.push({ name: "Sin plan", value: noPlan, color: "#cbd5e1" });

  return {
    kpis: {
      revenue: billed || (i.month ? Math.round(commission) : 0),
      revenueIsEstimate: !billed && !!i.month,
      mrr, gmv: income.reduce((s, b) => s + b.price, 0), commission: Math.round(commission),
      tenants: active.length, totalTenants: i.tenants.length,
      churn: i.tenants.length ? ((i.tenants.length - active.length) / i.tenants.length) * 100 : 0,
      conversionRate: active.length ? (paying.length / active.length) * 100 : 0,
      usageDensity: active.length ? income.length / active.length : 0,
      ltv: i.tenants.length ? Math.round(allPaid / i.tenants.length) : 0,
    },
    chart: [...months.values()].sort((a, b) => a.sort.localeCompare(b.sort)).slice(-12),
    topRevenue: rank((b) => b.price),
    topOccupancy: rank(() => 1),
    plans: dist.filter((d) => d.value > 0 || sortedPlans.length <= 6),
    newTenants: [...i.tenants]
      .sort((a, b) => (toDate(b.createdAt)?.getTime() || 0) - (toDate(a.createdAt)?.getTime() || 0)).slice(0, 5)
      .map((t) => ({ id: t.id, name: t.name || t.id, plan: findPlan(i.plans, t)?.name || "Sin plan", active: isActiveTenant(t.status), date: toDate(t.createdAt) })),
    // Las más recientes de verdad (antes eran las 8 primeras sin ordenar)
    recent: [...income].sort((a, b) => ((b.createdAt || b.start)?.getTime() || 0) - ((a.createdAt || a.start)?.getTime() || 0)).slice(0, 8)
      .map((b) => ({ id: b.id, at: b.createdAt || b.start, start: b.start, startTime: b.startTime, client: b.clientName || "Jugador", venue: tenantById.get(b.tenantId)?.name || b.tenantName || "Recinto", amount: b.price, method: paymentMethod(b), noShow: b.isNoShow })),
    bookingCount: income.length,
  };
}
