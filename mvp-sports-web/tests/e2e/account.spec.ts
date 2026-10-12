import { test, expect, type Page } from "@playwright/test";
import fs from "fs";
import path from "path";

// Flujos reales de cuenta contra Firebase con cuentas de prueba (@example.test).
// Requiere .env.local con E2E_* y firebase-service-account.json; si faltan, se omiten.
const root = path.resolve(__dirname, "../..");
const env: Record<string, string> = {};
try {
  for (const line of fs.readFileSync(path.join(root, ".env.local"), "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)="?(.*?)"?$/);
    if (m) env[m[1]] = m[2];
  }
} catch { /* sin .env.local */ }
const saPath = path.join(root, "firebase-service-account.json");
const ready = !!env.E2E_MANAGER_EMAIL && !!env.E2E_PLAYER_EMAIL && fs.existsSync(saPath);

// eslint-disable-next-line @typescript-eslint/no-require-imports
const adminAuth = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const admin = require("firebase-admin");
  if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(JSON.parse(fs.readFileSync(saPath, "utf8"))) });
  return admin;
};

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.waitForLoadState("networkidle"); // el formulario debe estar hidratado antes de enviarlo
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator('button[type="submit"]').click();
}

test.describe("Cuenta y acceso", () => {
  test.skip(!ready, "Faltan cuentas de prueba (.env.local) o la cuenta de servicio");

  test("mánager entra a su panel y no ve finanzas", async ({ page, isMobile }) => {
    const exists = await adminAuth().auth().getUserByEmail(env.E2E_MANAGER_EMAIL).then(() => true, () => false);
    test.skip(!exists, "La cuenta de prueba del mánager no existe (se crea con el script de cuentas E2E)");
    await login(page, env.E2E_MANAGER_EMAIL, env.E2E_MANAGER_PASSWORD);
    await expect(page).toHaveURL(/\/dashboard(\?|$|\/)/, { timeout: 30_000 });
    if (isMobile) {
      const bar = page.getByRole("navigation").last();
      for (const t of ["Hoy", "Check-in", "Agenda"]) await expect(bar.getByText(t, { exact: true })).toBeVisible();
    }
    await page.goto("/dashboard/finance");
    await expect(page).toHaveURL(/\/dashboard\/?$/, { timeout: 20_000 });
    await page.goto("/dashboard/checkin");
    await expect(page).toHaveURL(/\/dashboard\/checkin/);
    // Solo administración de la plataforma
    await page.goto("/dashboard/users");
    await expect(page).toHaveURL(/\/dashboard\/?$/, { timeout: 20_000 });
  });

  test("recuperar contraseña muestra el aviso neutro", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.locator("#email").fill(env.E2E_MANAGER_EMAIL);
    await page.getByRole("button", { name: /olvidaste tu contraseña/i }).click();
    await expect(page.getByText(/si el correo está registrado, te enviamos un enlace/i)).toBeVisible({ timeout: 20_000 });
  });

  test("registro → sin verificar no entra → verificado entra → elimina su cuenta", async ({ page, isMobile }) => {
    test.skip(isMobile, "Crea y borra una cuenta real: basta una vez");
    test.setTimeout(150_000);
    const email = env.E2E_PLAYER_EMAIL, password = env.E2E_PLAYER_PASSWORD;
    const admin = adminAuth();
    const prev = await admin.auth().getUserByEmail(email).catch(() => null);
    if (prev) await admin.auth().deleteUser(prev.uid);

    // 1) Registro por la pantalla
    await page.goto("/");
    await page.getByRole("button", { name: /crear cuenta gratis/i }).first().click();
    await page.locator("#displayName").fill("Jugador E2E");
    await page.locator("#email").fill(email);
    await page.locator("#password").fill(password);
    await page.locator("#confirm").fill(password);
    await page.locator("#acceptTerms").check();
    await page.getByRole("button", { name: /^crear cuenta$/i }).click();
    await expect(page.getByText(/cuenta creada/i)).toBeVisible({ timeout: 30_000 });

    // 2) Sin verificar el correo no puede ingresar
    await login(page, email, password);
    await expect(page.getByText(/verifica tu correo antes de ingresar/i)).toBeVisible({ timeout: 20_000 });

    // 3) Simula el clic del enlace de verificación
    const u = await admin.auth().getUserByEmail(email);
    await admin.auth().updateUser(u.uid, { emailVerified: true });
    await login(page, email, password);
    await expect(page).toHaveURL(/\/player/, { timeout: 30_000 });

    // 4) Elimina la cuenta desde Ajustes
    await page.goto("/player/preferencias");
    await page.getByRole("button", { name: /eliminar cuenta/i }).click();
    await page.getByLabel("Contraseña para confirmar").fill(password);
    await page.getByRole("button", { name: /^eliminar$/i }).click();
    await expect(page).toHaveURL(/\/login/, { timeout: 30_000 });
    expect(await admin.auth().getUserByEmail(email).catch(() => null)).toBeNull();
    const doc = await admin.firestore().collection("users").doc(u.uid).get();
    expect(doc.exists).toBe(false);

    // 5) Ya no puede ingresar
    await login(page, email, password);
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("alert").or(page.getByText(/incorrect|no existe|inválid/i)).first()).toBeVisible({ timeout: 20_000 });
  });
});
