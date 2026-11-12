import { describe, it, expect } from "vitest";
import { computeMetrics, invoicePeriod, shiftMonth, trend, relativeTime, chileMonthDay } from "../utils/platformMetrics";
import type { Booking } from "../types/booking";

const bk = (id: string, tenantId: string, iso: string, price: number, extra: Partial<Booking> = {}): Booking => ({
  id, tenantId, tenantName: tenantId.toUpperCase(), courtId: "", courtName: "", userId: "", clientName: "", clientPhone: "", sport: "",
  start: new Date(iso), startTime: "", endTime: "", price, payment: "paid", state: "confirmed", isNoShow: false, checkedIn: false, checkedOut: false,
  couponCode: null, isInternalMatch: false, createdAt: new Date(iso), raw: { paymentMethod: "mercadopago" }, ...extra,
});
const plans = [{ id: "pro", name: "Pro", price: 50000, commission: 5 }, { id: "base", name: "Base", price: 20000 }];
const tenants = [{ id: "a", name: "A", planId: "pro", status: "active" }, { id: "b", name: "B", plan: "Base", status: "Activo" }, { id: "c", name: "C", planId: "pro", status: "suspended" }];

describe("platformMetrics", () => {
  it("mes en hora de Chile y periodo de la factura", () => {
    expect(chileMonthDay(new Date("2026-11-01T02:00:00Z"))).toEqual({ month: "2026-10", day: 31 }); // 23:00 del 31 en Chile
    expect(invoicePeriod({ rawDate: "2026-10", issueDate: new Date("2026-11-03") })).toBe("2026-10");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  });

  it("comisión con la tasa del plan del recinto, MRR de recintos activos y cobranza por periodo", () => {
    const m = computeMetrics({
      month: "2026-11", now: new Date("2026-11-20T15:00:00Z"), plans, tenants, defaultRate: 10,
      bookings: [
        bk("1", "a", "2026-11-02T20:00:00Z", 20000), bk("2", "b", "2026-11-25T20:00:00Z", 10000, { raw: { paymentMethod: "cash" } }),
        bk("3", "a", "2026-10-10T20:00:00Z", 40000), bk("4", "b", "2026-11-05T20:00:00Z", 5000, { isNoShow: true }),
      ],
      invoices: [
        { tenantId: "a", tenantName: "A", rawDate: "2026-11", status: "Pagada", amount: 51000, breakdown: { planCost: 50000, commissionTotal: 1000 } },
        { tenantId: "b", tenantName: "B", rawDate: "2026-11", status: "Vencida", amount: 21500, breakdown: { planCost: 20000, commissionTotal: 1500 } },
        { tenantId: "b", rawDate: "2026-10", status: "Pendiente", amount: 999 },
      ],
    });
    // 20000*5% + 10000*10% + 5000*10%
    expect(m.kpis).toEqual({ gmv: 35000, commission: 2500, plans: 70000, pending: 21500 });
    expect(m.prevKpis).toMatchObject({ gmv: 40000, commission: 2000, pending: 999 });
    expect(m.collectedPct).toBe(70);
    expect(m.weekly.map((w) => w.comisiones)).toEqual([1500, 0, 0, 1000]);
    expect(m.methods.map((x) => x.label)).toEqual(["Mercado Pago", "Efectivo", "Inasistencia"]);
    expect(m.debts).toEqual([{ id: "b", name: "B", commission: 1500, total: 21500, overdue: true }]);
    expect(m.top[0]).toEqual({ name: "A", value: 20000, count: 1 });
  });

  it("mes cerrado: planes = lo liquidado y pagado; sin datos no se rompe", () => {
    const empty = computeMetrics({ month: "2026-09", now: new Date("2026-11-20T15:00:00Z"), plans, tenants, defaultRate: 10, bookings: [], invoices: [] });
    expect(empty.kpis).toEqual({ gmv: 0, commission: 0, plans: 0, pending: 0 });
    expect(empty.collectedPct).toBeNull();
  });

  it("tendencia y tiempo relativo", () => {
    expect(trend(150, 100)).toBe(50);
    expect(trend(5, 0)).toBeNull();
    const now = new Date("2026-11-20T15:00:00Z");
    expect(relativeTime(new Date("2026-11-20T14:30:00Z"), now)).toBe("30 min");
    expect(relativeTime(new Date("2026-11-18T15:00:00Z"), now)).toBe("2 d");
  });
});
