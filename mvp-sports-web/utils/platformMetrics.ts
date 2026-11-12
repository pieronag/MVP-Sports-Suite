// Métricas de la plataforma (superadmin) para un mes: volumen procesado, comisiones, planes, cobranza y desgloses.
// Comisión con las mismas reglas que la liquidación (utils/invoiceCalc): tasa del plan del recinto o la tasa general.
import type { Booking, RawDoc } from "@/types/booking";
import { findPlan, type PlanConfig } from "./invoiceCalc";

const MONTH_FMT = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit" });
/** "AAAA-MM" y día del mes en hora de Chile. */
export const chileMonthDay = (d: Date) => { const s = MONTH_FMT.format(d); return { month: s.slice(0, 7), day: Number(s.slice(8, 10)) }; };
export const shiftMonth = (month: string, delta: number) => {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};

const toDate = (v: any): Date | null => { // eslint-disable-line @typescript-eslint/no-explicit-any
  const d = v?.toDate ? v.toDate() : v?.seconds ? new Date(v.seconds * 1000) : v ? new Date(v) : null;
  return d && !isNaN(d.getTime()) ? d : null;
};
export const isActiveTenant = (status?: string) => ["activo", "active"].includes(String(status || "").toLowerCase());
const PAID = ["pagada", "paid"], PENDING = ["pendiente", "pending", "vencida", "overdue"];
const invStatus = (s: unknown) => { const v = String(s || "").toLowerCase(); return PAID.includes(v) ? "paid" : PENDING.includes(v) ? (v === "vencida" || v === "overdue" ? "overdue" : "pending") : "other"; };
/** Periodo que liquida la factura ("AAAA-MM"); las antiguas sin periodo, el mes de emisión. */
export const invoicePeriod = (inv: RawDoc) => (/^\d{4}-\d{2}$/.test(String(inv.rawDate || "")) ? String(inv.rawDate) : (toDate(inv.issueDate) ? chileMonthDay(toDate(inv.issueDate)!).month : ""));

export function commissionRateFor(tenant: RawDoc | undefined, plans: PlanConfig[], defaultRate: number) {
  return (tenant ? findPlan(plans, tenant)?.commission : undefined) ?? defaultRate;
}

export type Method = { key: string; label: string };
export function paymentMethod(b: Booking): Method {
  if (b.isNoShow) return { key: "noshow", label: "Inasistencia" };
  const m = String(b.raw.paymentMethod || "").toLowerCase();
  if (m === "mercadopago" || m === "mercado_pago" || m === "mp") return { key: "mercadopago", label: "Mercado Pago" };
  if (m === "card" || m === "webpay" || m === "oneclick") return { key: "card", label: "Tarjeta" };
  if (m === "cash" || m === "efectivo") return { key: "cash", label: "Efectivo" };
  if (m === "transfer" || m === "transferencia") return { key: "transfer", label: "Transferencia" };
  return { key: "other", label: "Otro" };
}

export interface MetricsInput {
  month: string; bookings: Booking[]; invoices: RawDoc[]; tenants: RawDoc[]; plans: PlanConfig[]; defaultRate: number; now: Date;
}

function monthTotals(i: MetricsInput, month: string) {
  const tenantById = new Map(i.tenants.map((t) => [t.id, t]));
  const bookings = i.bookings.filter((b) => b.start && chileMonthDay(b.start).month === month);
  let gmv = 0, commission = 0;
  for (const b of bookings) {
    gmv += b.price;
    commission += b.price * (commissionRateFor(tenantById.get(b.tenantId), i.plans, i.defaultRate) / 100);
  }
  const invoices = i.invoices.filter((inv) => invoicePeriod(inv) === month);
  let plansPaid = 0, billedCommission = 0, pending = 0, billed = 0;
  for (const inv of invoices) {
    const st = invStatus(inv.status), amount = Number(inv.amount) || 0;
    billed += amount;
    if (st === "paid") { plansPaid += Number(inv.breakdown?.planCost ?? 0); billedCommission += Number(inv.breakdown?.commissionTotal ?? 0); }
    else if (st !== "other") pending += amount;
  }
  return { bookings, invoices, gmv: Math.round(gmv), commission: Math.round(commission), plansPaid, billedCommission, pending, billed };
}

export function computeMetrics(i: MetricsInput) {
  const isCurrent = chileMonthDay(i.now).month === i.month;
  const cur = monthTotals(i, i.month), prev = monthTotals(i, shiftMonth(i.month, -1));
  const tenantById = new Map(i.tenants.map((t) => [t.id, t]));
  // Planes: en el mes en curso, lo que pagan hoy los recintos activos (MRR); en meses cerrados, lo liquidado y pagado
  const mrr = i.tenants.filter((t) => isActiveTenant(t.status)).reduce((s, t) => s + Number(findPlan(i.plans, t)?.price || 0), 0);
  const kpis = { gmv: cur.gmv, commission: cur.commission, plans: isCurrent ? mrr : cur.plansPaid, pending: cur.pending };
  const prevKpis = { gmv: prev.gmv, commission: prev.commission, plans: prev.plansPaid, pending: prev.pending };

  // Comisión por semana del mes (días 1-7, 8-14, 15-21, 22 al final)
  const weekly = [1, 2, 3, 4].map((n) => ({ name: `Semana ${n}`, comisiones: 0, volumen: 0 }));
  for (const b of cur.bookings) {
    const w = Math.min(3, Math.floor((chileMonthDay(b.start!).day - 1) / 7));
    weekly[w].volumen += b.price;
    weekly[w].comisiones += Math.round(b.price * (commissionRateFor(tenantById.get(b.tenantId), i.plans, i.defaultRate) / 100));
  }

  const collected = cur.billed - cur.pending;
  const collectedPct = cur.billed > 0 ? Math.round((collected / cur.billed) * 100) : null;

  const methods = new Map<string, { key: string; label: string; value: number }>();
  for (const b of cur.bookings) { const m = paymentMethod(b); const e = methods.get(m.key) || { ...m, value: 0 }; e.value += b.price; methods.set(m.key, e); }

  const top = new Map<string, { name: string; value: number; count: number }>();
  for (const b of cur.bookings) {
    const k = b.tenantId || b.tenantName || "?";
    const e = top.get(k) || { name: b.tenantName || tenantById.get(b.tenantId)?.name || "Recinto", value: 0, count: 0 };
    e.value += b.price; e.count++; top.set(k, e);
  }

  const debts = new Map<string, { id: string; name: string; commission: number; total: number; overdue: boolean }>();
  for (const inv of cur.invoices) {
    const st = invStatus(inv.status);
    if (st !== "pending" && st !== "overdue") continue;
    const k = inv.tenantId || inv.tenantName;
    const e = debts.get(k) || { id: k, name: inv.tenantName || tenantById.get(inv.tenantId)?.name || "Recinto", commission: 0, total: 0, overdue: false };
    e.commission += Number(inv.breakdown?.commissionTotal || 0); e.total += Number(inv.amount || 0); e.overdue ||= st === "overdue";
    debts.set(k, e);
  }

  const transactions = [...cur.bookings]
    .sort((a, b) => ((b.createdAt || b.start)?.getTime() || 0) - ((a.createdAt || a.start)?.getTime() || 0))
    .slice(0, 8)
    .map((b) => ({
      id: b.id, venue: b.tenantName || tenantById.get(b.tenantId)?.name || "Recinto", amount: b.price,
      fee: Math.round(b.price * (commissionRateFor(tenantById.get(b.tenantId), i.plans, i.defaultRate) / 100)),
      method: paymentMethod(b), at: b.createdAt || b.start,
    }));

  return {
    isCurrent, kpis, prevKpis, weekly, collectedPct, billed: cur.billed,
    methods: [...methods.values()].sort((a, b) => b.value - a.value),
    top: [...top.values()].sort((a, b) => b.value - a.value).slice(0, 5),
    debts: [...debts.values()].sort((a, b) => b.total - a.total).slice(0, 10),
    transactions, bookingCount: cur.bookings.length,
  };
}

/** Variación porcentual, o null si no hay base para comparar. */
export const trend = (cur: number, prev: number) => (prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null);

export function relativeTime(from: Date | null, now: Date) {
  if (!from) return "—";
  const min = Math.max(0, Math.floor((now.getTime() - from.getTime()) / 60_000));
  if (min < 1) return "ahora";
  if (min < 60) return `${min} min`;
  if (min < 1440) return `${Math.floor(min / 60)} h`;
  if (min < 10_080) return `${Math.floor(min / 1440)} d`;
  return `${Math.floor(min / 10_080)} sem`;
}
