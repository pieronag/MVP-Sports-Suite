import { describe, it, expect } from "vitest";
import { computeOverview } from "../utils/adminOverview";
import type { Booking } from "../types/booking";

const bk = (id: string, tenantId: string, iso: string, price: number, extra: Partial<Booking> = {}): Booking => ({
  id, tenantId, tenantName: tenantId, courtId: "", courtName: "", userId: "", clientName: `C${id}`, clientPhone: "", sport: "",
  start: new Date(iso), startTime: "20:00", endTime: "", price, payment: "paid", state: "confirmed", isNoShow: false, checkedIn: false, checkedOut: false,
  couponCode: null, isInternalMatch: false, createdAt: new Date(iso), raw: { paymentMethod: "mercadopago" }, ...extra,
});
const plans = [{ id: "pro", name: "Pro", price: 50000, commission: 5 }, { id: "free", name: "Gratis", price: 0 }];
const tenants = [
  { id: "a", name: "A", planId: "pro", status: "active", createdAt: new Date("2026-10-01") },
  { id: "b", name: "B", planId: "free", status: "activo", createdAt: new Date("2026-11-01") },
  { id: "c", name: "C", status: "suspended", createdAt: new Date("2026-09-01") },
];
const bookings = [
  bk("1", "a", "2026-11-03T20:00:00Z", 20000), bk("2", "b", "2026-11-10T20:00:00Z", 10000),
  bk("3", "a", "2026-10-03T20:00:00Z", 30000), bk("4", "a", "2026-11-12T20:00:00Z", 9000, { payment: "refunded", state: "cancelled" }),
];
const invoices = [{ tenantId: "a", rawDate: "2026-10", status: "Pagada", amount: 51500 }, { tenantId: "a", rawDate: "2026-11", status: "Pendiente", amount: 51000 }];

describe("adminOverview", () => {
  it("recintos activos con 'active' o 'activo' (antes solo 'Activo' y el MRR salía $0)", () => {
    const o = computeOverview({ month: "2026-11", tenants, invoices, bookings, plans, defaultRate: 10 });
    expect(o.kpis).toMatchObject({ mrr: 50000, tenants: 2, totalTenants: 3, conversionRate: 50, gmv: 30000, commission: 2000, revenueIsEstimate: true, revenue: 2000 });
    expect(Math.round(o.kpis.churn)).toBe(33);
    expect(o.recent.map((r) => r.id)).toEqual(["2", "1"]);
    expect(o.topRevenue).toEqual([{ name: "A", value: 20000 }, { name: "B", value: 10000 }]);
  });

  it("facturado por periodo de la liquidación; gráfico por mes; histórico completo", () => {
    const oct = computeOverview({ month: "2026-10", tenants, invoices, bookings, plans, defaultRate: 10 });
    expect(oct.kpis).toMatchObject({ revenue: 51500, revenueIsEstimate: false, gmv: 30000 });
    expect(oct.chart.map((c) => [c.sort, c.valor, c.bookings])).toEqual([["2026-10", 51500, 1], ["2026-11", 0, 2]]);
    const all = computeOverview({ month: null, tenants, invoices, bookings, plans, defaultRate: 10 });
    expect(all.bookingCount).toBe(3);
    expect(all.plans.map((p) => [p.name, p.value])).toEqual([["Gratis", 1], ["Pro", 1], ["Sin plan", 1]]);
    expect(all.newTenants[0]).toMatchObject({ id: "b", plan: "Gratis", active: true });
  });
});
