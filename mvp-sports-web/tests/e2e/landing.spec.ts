import { test, expect, type Page } from "@playwright/test";

const noHorizontalScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const isMobile = (page: Page) => (page.viewportSize()?.width || 1200) < 1024;

test.describe("Landing", () => {
  test.beforeEach(async ({ page }) => { await page.goto("/"); });

  test("muestra el hero, el título y todas las secciones", async ({ page }) => {
    await expect(page).toHaveTitle(/MVP Sports/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/TU CANCHA/i);
    for (const id of ["como-funciona", "player-functions", "owners", "planes"]) {
      await expect(page.locator(`#${id}`)).toHaveCount(1);
    }
    expect(await noHorizontalScroll(page)).toBe(true);
  });

  test("en mobile solo hay menú hamburguesa; en desktop, Ingresar y Registrarme", async ({ page }) => {
    const header = page.locator("header").first();
    const menu = page.getByRole("button", { name: /abrir menú/i });
    if (isMobile(page)) {
      await expect(menu).toBeVisible();
      await expect(header.getByRole("link", { name: "Ingresar" })).toBeHidden();
      await expect(header.getByRole("button", { name: "Registrarme" })).toBeHidden();
      await expect(async () => {
        if ((await menu.getAttribute("aria-expanded")) !== "true") await menu.click();
        await expect(page.locator("#mobile-menu").getByRole("link", { name: /planes/i })).toBeVisible({ timeout: 2000 });
      }).toPass({ timeout: 30_000 });
    } else {
      await expect(header.getByRole("link", { name: "Ingresar" })).toBeVisible();
      await expect(header.getByRole("button", { name: "Registrarme" })).toBeVisible();
    }
  });

  test("Recintos no muestra 'Próximamente' y el CTA abre WhatsApp con el mensaje de demo", async ({ page }) => {
    await expect(page.locator("#owners")).not.toContainText("Próximamente");
    const wa = page.locator('#owners a[href*="wa.me"]');
    await expect(wa).toHaveAttribute("href", /agendar%20una%20demo/);
    await expect(wa.locator("svg")).toHaveCount(1);
  });

  test("el footer lleva a las páginas legales (sin modales)", async ({ page }) => {
    const footer = page.locator("footer");
    await expect(footer.getByRole("link", { name: "Términos" })).toHaveAttribute("href", "/terms");
    await expect(footer.getByRole("link", { name: "Privacidad" })).toHaveAttribute("href", "/privacy");
  });
});

test.describe("Registro", () => {
  const open = async (page: Page) => {
    await page.goto("/");
    const cta = page.getByRole("button", { name: "Crear cuenta gratis" }).first();
    await expect(async () => {
      await cta.click();
      await expect(page.getByRole("dialog")).toBeVisible({ timeout: 3000 });
    }).toPass({ timeout: 30_000 });
    return page.getByRole("dialog");
  };

  test("es de un paso: Google o nombre, correo y contraseña", async ({ page }) => {
    const d = await open(page);
    await expect(d.getByRole("button", { name: /continuar con google/i })).toBeVisible();
    await expect(d.locator("input")).toHaveCount(5); // términos + nombre + correo + contraseña + repetir
    await expect(d).not.toContainText(/RUT|Teléfono|Paso 1 de 3/i);
  });

  test("valida contraseña de 8+, confirmación y aceptación de términos (sin crear cuenta)", async ({ page }) => {
    const d = await open(page);
    const crear = d.getByRole("button", { name: "Crear cuenta" });
    await d.locator("#displayName").fill("Prueba Local");
    await d.locator("#email").fill("prueba@example.test");
    await d.locator("#password").fill("abc12");
    await expect(d).toContainText("al menos 8 caracteres");
    await expect(crear).toBeDisabled();

    await d.locator("#password").fill("abc12345");
    await d.locator("#confirm").fill("abc12399");
    await expect(d).toContainText("no coinciden");
    await expect(crear).toBeDisabled();

    await d.locator("#confirm").fill("abc12345");
    await expect(crear).toBeDisabled(); // falta aceptar términos
    await d.locator("#acceptTerms").check();
    await expect(crear).toBeEnabled();
  });

  test("cada contraseña tiene su propio botón para mostrarla", async ({ page }) => {
    const d = await open(page);
    await d.locator("#confirm").fill("secreto123");
    await d.locator("#confirm").locator("xpath=..").getByRole("button").click();
    await expect(d.locator("#confirm")).toHaveAttribute("type", "text");
    await expect(d.locator("#password")).toHaveAttribute("type", "password");
  });

  test("Google exige aceptar los términos antes de abrir la ventana", async ({ page }) => {
    const d = await open(page);
    await d.getByRole("button", { name: /continuar con google/i }).click();
    await expect(d).toContainText("Acepta los Términos");
  });
});
