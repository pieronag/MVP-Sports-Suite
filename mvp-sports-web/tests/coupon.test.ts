import { describe, it, expect } from "vitest";
import { couponIssue, couponUses } from "../utils/coupon";

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
