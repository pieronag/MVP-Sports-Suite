import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("loads hero section", async ({ page }) => {
    await expect(page.locator("text=MVP SPORTS")).toBeVisible();
  });

  test("loads supported sports", async ({ page }) => {
    await expect(page.getByText("Fútbol", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Pádel", { exact: true }).first()).toBeVisible();
  });

  test("has registration modal trigger", async ({ page }) => {
    const registerButton = page.locator("text=REGISTRARME").or(page.locator("text=Registrarme")).first();
    if (await registerButton.isVisible()) {
      await registerButton.click();
      await expect(page.getByText(/paso 1 de 3/i)).toBeVisible({ timeout: 5000 });
      // Sin datos el botón queda deshabilitado (no se crea ninguna cuenta)
      await expect(page.getByRole("button", { name: /siguiente/i })).toBeDisabled();
    }
  });

  test("footer has terms and privacy links", async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(page.locator("text=Términos").or(page.locator("text=Términos y Condiciones")).first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Privacidad").first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe("SEO", () => {
  test("has correct meta title", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/MVP Sports/);
  });
});
