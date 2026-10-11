import { test, expect } from "@playwright/test";

test.describe("Documentos legales", () => {
  test("términos: pago online, 24 h, sin retracto y datos de la empresa", async ({ page }) => {
    await page.goto("/terms");
    const body = page.locator("main");
    await expect(body).toContainText("Pago 100% online");
    await expect(body).toContainText("24 horas o más antes del partido");
    await expect(body).toContainText("artículo 3 bis de la Ley N° 19.496");
    await expect(body).toContainText("Orion Technology SpA, RUT 78.392.951-1, San Pedro 1417, Rancagua");
    await expect(body).not.toContainText(/recompensa|reserva manual/i);
  });

  test("privacidad: Ley 21.719, derechos y proveedores", async ({ page }) => {
    await page.goto("/privacy");
    const body = page.locator("main");
    await expect(body).toContainText("Ley N° 21.719");
    for (const right of ["Acceso", "Rectificación", "Supresión", "Oposición", "Portabilidad", "Bloqueo"]) await expect(body).toContainText(right);
    for (const p of ["Mercado Pago", "Google Firebase", "Vercel", "Sentry", "Resend"]) await expect(body).toContainText(p);
    await expect(body).toContainText("30 días corridos");
  });
});

// Ninguna acción sensible responde sin sesión
test.describe("API sin sesión", () => {
  const cases: [string, string][] = [
    ["POST", "/api/bookings/refund"], ["POST", "/api/bookings/checkin"], ["POST", "/api/account/delete"],
    ["POST", "/api/players/recompute"], ["GET", "/api/public-profiles?top=1"], ["GET", "/api/cron/cleanup-pending"],
    ["POST", "/api/academies/enroll"], ["POST", "/api/tournaments/register"], ["GET", "/api/mercadopago/cards?tenantId=x"],
  ];
  for (const [method, path] of cases) {
    test(`${method} ${path} → 401`, async ({ request }) => {
      const res = await request.fetch(path, { method, data: method === "POST" ? {} : undefined });
      expect(res.status()).toBe(401);
    });
  }
});
