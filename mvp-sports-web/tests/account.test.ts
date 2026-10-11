import { describe, it, expect } from "vitest";
import { passwordIssue, PASSWORD_MIN } from "@/utils/password";

import { missingForPayment, newPlayerDoc } from "@/utils/playerProfile";

describe("contraseñas", () => {
  it("exige al menos 8 caracteres", () => {
    expect(PASSWORD_MIN).toBe(8);
    expect(passwordIssue("1234567")).toMatch(/8 caracteres/);
    expect(passwordIssue("12345678")).toBeNull();
  });
  it("exige que la confirmación coincida", () => {
    expect(passwordIssue("abcdefgh", "abcdefgx")).toMatch(/no coinciden/);
    expect(passwordIssue("abcdefgh", "abcdefgh")).toBeNull();
  });
});

describe("datos obligatorios para pagar", () => {
  it("pide teléfono, RUT y fecha de nacimiento a un jugador recién registrado", () => {
    expect(missingForPayment({ displayName: "Ana" })).toEqual(["teléfono", "RUT", "fecha de nacimiento"]);
  });
  it("no pide nada con el perfil completo", () => {
    expect(missingForPayment({ displayName: "Ana", phone: "+56 9 1234 5678", rut: "12.345.678-5", birthDate: "01/01/1990" })).toEqual([]);
  });
});

describe("perfil inicial", () => {
  it("parte como jugador en XP 0 (lo que permiten las reglas)", () => {
    const d = newPlayerDoc({ uid: "u1", email: "a@b.cl", displayName: "Ana", photoURL: null });
    expect(d).toMatchObject({ role: "player", status: "active", xp: 0, ovr: 40, tier: "BRONCE" });
    expect(d).not.toHaveProperty("rut");
  });
});
