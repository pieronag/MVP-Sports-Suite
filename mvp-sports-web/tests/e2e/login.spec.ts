import { test, expect } from "@playwright/test";

test.describe("Login Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("shows login form", async ({ page }) => {
    await expect(page.locator("text=INICIAR SESIÓN")).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("shows error with invalid credentials", async ({ page }) => {
    await page.fill('input[type="email"]', "invalid@test.com");
    await page.fill('input[type="password"]', "wrongpassword");
    await page.click('button[type="submit"]');
    await expect(page.locator("text=Error")).toBeVisible({ timeout: 10000 });
  });

  test("navigates to landing page", async ({ page }) => {
    await page.click("text=Volver al Inicio");
    await expect(page).toHaveURL("/");
  });

  test("has link to terms and privacy", async ({ page }) => {
    await expect(page.locator("text=Términos")).toBeVisible();
    await expect(page.locator("text=Privacidad")).toBeVisible();
  });
});

test.describe("Dashboard Access", () => {
  test("redirects unauthenticated users", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/.*login.*/);
  });
});
