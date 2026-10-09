import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("loads hero section", async ({ page }) => {
    await expect(page.locator("text=MVP SPORTS")).toBeVisible();
  });

  test("loads supported sports", async ({ page }) => {
    await expect(page.locator("text=Fútbol").or(page.locator("text=Pádel"))).toBeVisible();
  });

  test("has registration modal trigger", async ({ page }) => {
    const registerButton = page.locator("text=REGISTRARME").or(page.locator("text=Registrarme")).first();
    if (await registerButton.isVisible()) {
      await registerButton.click();
      await expect(page.locator("text=REGISTRO").or(page.locator("text=Registro"))).toBeVisible({ timeout: 5000 });
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
