import { describe, it, expect } from "vitest";
import { normalizeRole, homeFor, canOpen, redirectFor } from "../utils/roles";

describe("roles", () => {
  it("normaliza variantes históricas", () => {
    expect(normalizeRole("SuperAdmin ")).toBe("superadmin");
    expect(normalizeRole("staff")).toBe("manager");
    expect(normalizeRole("user")).toBe("player");
    expect(normalizeRole(undefined)).toBe("player");
  });
  it("cada rol tiene su inicio, también en el celular", () => {
    expect(homeFor("owner")).toBe("/dashboard");
    expect(homeFor("manager")).toBe("/dashboard");
    expect(homeFor("player")).toBe("/player");
  });
  it("permisos por ruta", () => {
    expect(canOpen("/dashboard", "manager")).toBe(true);
    expect(canOpen("/dashboard/finance", "manager")).toBe(false);
    expect(canOpen("/dashboard/finance", "owner")).toBe(true);
    expect(canOpen("/dashboard/invoices", "owner")).toBe(false);
    expect(canOpen("/dashboard/invoices", "superadmin")).toBe(true);
    expect(canOpen("/dashboard/settings/complex", "owner")).toBe(true);
    expect(canOpen("/dashboard/settings", "owner")).toBe(false);
  });
  it("nunca redirige a la misma ruta (antes un jugador en /dashboard quedaba en bucle)", () => {
    expect(redirectFor("/dashboard", "player")).toBe("/player");
    expect(redirectFor("/dashboard/finance", "manager")).toBe("/dashboard");
    expect(redirectFor("/dashboard/finance", "owner")).toBeNull();
  });
});
