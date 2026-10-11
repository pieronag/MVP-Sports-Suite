import { test, expect } from "@playwright/test";

// No se envían credenciales: el login real contra Firebase se prueba manualmente.
test.describe("Login", () => {
  test.beforeEach(async ({ page }) => { await page.goto("/login"); });

  test("muestra Google, correo y contraseña", async ({ page }) => {
    await expect(page.getByRole("button", { name: /ingresar con google/i })).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("tiene enlaces a términos y privacidad", async ({ page }) => {
    await expect(page.getByRole("link", { name: /términos/i }).first()).toHaveAttribute("href", "/terms");
    await expect(page.getByRole("link", { name: /privacidad/i }).first()).toHaveAttribute("href", "/privacy");
  });
});

test.describe("Rutas protegidas", () => {
  for (const path of ["/dashboard", "/dashboard/checkin", "/dashboard/calendar", "/player", "/player/reservas", "/player/checkout", "/player/ranking"]) {
    test(`${path} redirige al login sin sesión`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login/, { timeout: 20_000 });
    });
  }

  test("la reserva manual ya no existe", async ({ page }) => {
    const res = await page.goto("/dashboard/manual-booking");
    expect(res?.status()).toBe(404);
  });
});
