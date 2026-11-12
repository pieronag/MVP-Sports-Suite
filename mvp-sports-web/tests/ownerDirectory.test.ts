import { describe, it, expect } from "vitest";
import { toOwnerRow, filterOwners, ownerTier, ownerUpdate } from "../utils/ownerDirectory";

const plans = [{ id: "pro", name: "Pro", price: 50000 }, { id: "base", name: "Base", price: 20000 }];
const tenants = [
  { id: "t1", name: "Club Uno", ownerId: "o1", planId: "pro" }, { id: "t2", name: "Club Dos", ownerIds: ["o1", "x"], plan: "Base" },
  { id: "t3", name: "Club Tres", ownerId: "o2", planId: "pro" },
];
const invoices = [
  { tenantId: "t1", status: "Vencida", amount: 51000 }, { tenantId: "t2", status: "Pagada", amount: 20000 }, { tenantId: "t3", status: "Pendiente", amount: 0 },
];

describe("ownerDirectory", () => {
  it("recintos, MRR y deuda real desde las liquidaciones", () => {
    const o = toOwnerRow("o1", { displayName: "Ana", status: "activo" }, tenants, plans, invoices);
    expect(o).toMatchObject({ status: "Activo", totalMrr: 70000, debt: 51000, overdue: true, tier: "ESTÁNDAR", phone: "", company: "" });
    expect(o.venues.map((v) => v.plan)).toEqual(["Pro", "Base"]);
    expect(toOwnerRow("o3", {}, tenants, plans, invoices)).toMatchObject({ status: "Activo", venues: [], debt: 0 });
    expect(toOwnerRow("o4", { status: "suspended" }, tenants, plans, invoices).status).toBe("Suspendido");
  });

  it("nivel por MRR relativo al plan más caro", () => {
    expect(ownerTier(100000, plans)).toBe("ORO");
    expect(ownerTier(200000, plans)).toBe("VIP PLATINO");
    expect(ownerTier(500000, [])).toBe("ESTÁNDAR");
  });

  it("filtra por recinto sin tildes y ordena deudores primero", () => {
    const rows = ["o1", "o2", "o5"].map((id) => toOwnerRow(id, { displayName: id }, tenants, plans, invoices));
    expect(filterOwners(rows, "club tres", "Todos").map((o) => o.id)).toEqual(["o2"]);
    expect(filterOwners(rows, "", "Morosos").map((o) => o.id)).toEqual(["o1"]);
    expect(filterOwners(rows, "", "Sin recintos").map((o) => o.id)).toEqual(["o5"]);
  });

  it("al editar no guarda relleno ni espacios", () => {
    expect(ownerUpdate({ name: " Ana ", phone: "", company: " ", rut: "1-9", billingAddress: "" })).toEqual({ displayName: "Ana", phone: "", companyName: "", rut: "1-9", billingAddress: "" });
  });
});
