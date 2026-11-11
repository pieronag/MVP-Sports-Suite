import { describe, it, expect } from "vitest";
import { overallHours, formFromTenant, splitForSave, validateComplex, mercadoPagoMissing, sectionsDone } from "../utils/complexForm";

describe("complexForm", () => {
  it("horario general: apertura más temprana y cierre más tardío, contando la madrugada", () => {
    const schedule = {
      lunes: { isOpen: true, open: "09:00", close: "23:00" },
      viernes: { isOpen: true, open: "08:00", close: "01:00" },
      domingo: { isOpen: false, open: "06:00", close: "03:00" },
    };
    expect(overallHours({ schedule })).toEqual({ open: "08:00", close: "01:00" });
    expect(overallHours({ openTime: "10:00" })).toEqual({ open: "10:00", close: "23:00" });
  });

  it("nunca trae credenciales al formulario y tolera campos raros", () => {
    const f = formFromTenant({ name: "Club", mercadopagoAccessToken: "secreto", siiApiKey: "x", rules: ["a", 3], amenities: "WiFi" });
    expect(f.mercadopagoAccessToken).toBe("");
    expect(f.siiApiKey).toBe("");
    expect(f.rules).toEqual(["a"]);
    expect(f.amenities).toEqual([]);
  });

  it("separa credenciales del documento público y respeta el bloqueo global de Mercado Pago", () => {
    const f = { ...formFromTenant({ name: " Club " }), isMercadopagoActive: true, mercadopagoAccessToken: " APP_USR-1 ", siiApiKey: "  " };
    const { publicData, secrets } = splitForSave(f, true);
    expect(publicData).not.toHaveProperty("mercadopagoAccessToken");
    expect(publicData).not.toHaveProperty("siiApiKey");
    expect(publicData.isMercadopagoActive).toBe(false);
    expect(publicData.name).toBe("Club");
    expect(publicData.openingHours).toBe("08:00 - 23:00");
    expect(secrets).toEqual({ mercadopagoAccessToken: "APP_USR-1" });
  });

  it("valida nombre, email, web y horario", () => {
    const ok = formFromTenant({ name: "Club" });
    expect(validateComplex(ok)).toEqual([]);
    expect(validateComplex({ ...ok, name: " ", contactEmail: "malo", website: "no web", closeTime: "08:00" })).toHaveLength(4);
    expect(validateComplex({ ...ok, website: "club.cl", contactEmail: "a@b.cl" })).toEqual([]);
  });

  it("dice qué falta para cobrar con Mercado Pago", () => {
    const f = formFromTenant({});
    expect(mercadoPagoMissing(f, false)).toEqual(["Public Key", "Access Token"]);
    expect(mercadoPagoMissing({ ...f, mercadopagoPublicKey: "APP_USR-abc" }, true)).toEqual([]);
    expect(mercadoPagoMissing({ ...f, mercadopagoPublicKey: "xyz" }, true)[0]).toMatch(/válida/);
    expect(sectionsDone(f, false).operacion).toBe(true);
  });
});
