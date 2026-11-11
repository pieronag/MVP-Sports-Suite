import { describe, it, expect } from "vitest";
import { pickCoupon, couponIssue, couponUses } from "../utils/coupon";

const base = { tenantId: "t1", status: "active", discount: 15, limit: 2, uses: 0, validFrom: "2026-10-01", validUntil: "2026-10-31", minimumPurchase: 10000 };
const at = (iso: string) => new Date(iso);

describe("couponIssue", () => {
  it("acepta un cupón vigente", () => {
    expect(couponIssue(base, { tenantId: "t1", price: 20000, now: at("2026-10-15T15:00:00Z") })).toBeNull();
  });
  it("rechaza otro recinto, inactivo, antes de inicio y vencido (hora de Chile)", () => {
    expect(couponIssue(base, { tenantId: "t2", price: 20000, now: at("2026-10-15T15:00:00Z") })).toMatch(/recinto/);
    expect(couponIssue({ ...base, status: "paused" }, { tenantId: "t1", price: 20000, now: at("2026-10-15T15:00:00Z") })).toMatch(/activo/);
    expect(couponIssue(base, { tenantId: "t1", price: 20000, now: at("2026-09-30T15:00:00Z") })).toMatch(/vigente/);
    // 31-oct 23:30 en Chile sigue vigente aunque en UTC ya sea 1-nov
    expect(couponIssue(base, { tenantId: "t1", price: 20000, now: at("2026-11-01T02:30:00Z") })).toBeNull();
    expect(couponIssue(base, { tenantId: "t1", price: 20000, now: at("2026-11-01T15:00:00Z") })).toMatch(/expirado/);
  });
  it("respeta el límite de usos y la compra mínima", () => {
    expect(couponIssue({ ...base, uses: 2 }, { tenantId: "t1", price: 20000, now: at("2026-10-15T15:00:00Z") })).toMatch(/usos/);
    expect(couponIssue({ ...base, usedCount: 2, uses: 0 }, { tenantId: "t1", price: 20000, now: at("2026-10-15T15:00:00Z") })).toMatch(/usos/);
    expect(couponIssue(base, { tenantId: "t1", price: 5000, now: at("2026-10-15T15:00:00Z") })).toMatch(/mínima/);
  });
  it("cuenta usos de ambos formatos", () => { expect(couponUses({ uses: 1, usedCount: 3 })).toBe(3); });
});

describe("couponIssue: alcance y descuento", () => {
  const now = new Date("2026-10-15T15:00:00Z");
  it("un cupón sin recinto solo vale en los recintos de su dueño", () => {
    const c = { code: "X", discount: 10, ownerId: "o1" };
    expect(couponIssue(c, { tenantId: "t9", price: 20000, now, tenantOwnerIds: ["o1"] })).toBeNull();
    expect(couponIssue(c, { tenantId: "t9", price: 20000, now, tenantOwnerIds: ["otro"] })).toMatch(/recinto/);
    expect(couponIssue(c, { tenantId: "t9", price: 20000, now })).toMatch(/recinto/);
  });
  it("rechaza descuentos fuera de rango", () => {
    const base = { tenantId: "t1", code: "X" };
    expect(couponIssue({ ...base, discount: 150 }, { tenantId: "t1", price: 20000, now })).toMatch(/válido/);
    expect(couponIssue({ ...base, discount: -10 }, { tenantId: "t1", price: 20000, now })).toMatch(/válido/);
    expect(couponIssue({ ...base, discount: 5000, type: "fixed" }, { tenantId: "t1", price: 20000, now })).toBeNull();
  });
});

describe("pickCoupon", () => {
  it("elige el cupón del recinto de la reserva aunque otro recinto use el mismo código", () => {
    const list = [{ id: "a", tenantId: "t2" }, { id: "b", tenantId: "t1" }];
    expect(pickCoupon(list, "t1")?.id).toBe("b");
    expect(pickCoupon(list, "t3")).toBeNull();
  });
  it("si no hay del recinto, uno antiguo sin recinto del mismo dueño", () => {
    const list = [{ id: "a", tenantId: "t2" }, { id: "g", ownerId: "o1" }];
    expect(pickCoupon(list, "t1", ["o1"])?.id).toBe("g");
    expect(pickCoupon(list, "t1", ["o2"])).toBeNull();
  });
});
