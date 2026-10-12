import { test, expect, type Page } from "@playwright/test";
import fs from "fs";
import path from "path";

// Panel del mánager y Configuración del complejo con cuentas de prueba (@example.test).
// El dueño de prueba administra un recinto propio e inactivo (no lo ven los jugadores).
const root = path.resolve(__dirname, "../..");
const env: Record<string, string> = {};
try {
  for (const line of fs.readFileSync(path.join(root, ".env.local"), "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)="?(.*?)"?$/);
    if (m) env[m[1]] = m[2];
  }
} catch { /* sin .env.local */ }
const saPath = path.join(root, "firebase-service-account.json");
const TENANT = "e2e-recinto-prueba";

const admin = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const a = require("firebase-admin");
  if (!a.apps.length) a.initializeApp({ credential: a.credential.cert(JSON.parse(fs.readFileSync(saPath, "utf8"))) });
  return a;
};
const exists = async (email?: string) => !!email && fs.existsSync(saPath) && admin().auth().getUserByEmail(email).then(() => true, () => false);

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
}

// Errores de permisos de Firestore o de la app durante la prueba
function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error" && /permission|insufficient|denied|permiso/i.test(m.text())) errors.push(m.text().slice(0, 200)); });
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
  return errors;
}

test.describe("Panel del mánager", () => {
  test("ve su operación del día y no las secciones del dueño", async ({ page, isMobile }) => {
    test.skip(!(await exists(env.E2E_MANAGER_EMAIL)), "Sin cuenta de prueba del mánager");
    test.setTimeout(120_000);
    const errors = watchErrors(page);
    await login(page, env.E2E_MANAGER_EMAIL, env.E2E_MANAGER_PASSWORD);

    // Puede: hoy, check-in, agenda, soporte y perfil
    for (const p of ["/dashboard/checkin", "/dashboard/calendar", "/dashboard/report-issue", "/dashboard/profile"]) {
      await page.goto(p);
      await expect(page).toHaveURL(new RegExp(p.replace(/\//g, "\\/")), { timeout: 20_000 });
      await expect(page.getByText(/no tienes permiso|error al cargar/i)).toHaveCount(0);
    }
    // No puede: secciones del dueño y de la plataforma
    for (const p of ["/dashboard/finance", "/dashboard/staff", "/dashboard/courts", "/dashboard/settings/complex", "/dashboard/tournaments", "/dashboard/tenants"]) {
      await page.goto(p);
      await expect(page).toHaveURL(/\/dashboard\/?$/, { timeout: 20_000 });
    }
    if (isMobile) {
      const bar = page.getByRole("navigation").last();
      await bar.getByText("Check-in", { exact: true }).click();
      await expect(page).toHaveURL(/\/dashboard\/checkin/, { timeout: 20_000 });
      await bar.getByText("Agenda", { exact: true }).click();
      await expect(page).toHaveURL(/\/dashboard\/calendar/, { timeout: 20_000 });
    }
    expect(errors, errors.join("\n")).toEqual([]);
  });
});

test.describe("Configuración del complejo", () => {
  test("el dueño edita y guarda su recinto con las reglas publicadas", async ({ page, isMobile }) => {
    test.skip(isMobile, "Escribe en la base: basta una vez");
    test.skip(!(await exists(env.E2E_OWNER_EMAIL)), "Sin dueño de prueba");
    test.setTimeout(120_000);
    const errors = watchErrors(page);
    await login(page, env.E2E_OWNER_EMAIL, env.E2E_OWNER_PASSWORD);
    await page.goto("/dashboard/settings/complex");

    const name = page.getByLabel("Nombre Comercial");
    await expect(name).toHaveValue(/^Recinto E2E/, { timeout: 30_000 });
    const nuevo = `Recinto E2E ${Date.now() % 10000}`;
    await name.fill(nuevo);
    await page.getByLabel("WhatsApp").fill("+56911112222");
    await page.getByRole("button", { name: /^guardar$/i }).click();
    await expect(page.getByText("Configuración actualizada con éxito")).toBeVisible({ timeout: 20_000 });

    // Se guardó en la base sin tocar propiedad ni estado
    const t = (await admin().firestore().collection("tenants").doc(TENANT).get()).data();
    expect(t.name).toBe(nuevo);
    expect(t.whatsapp).toBe("+56911112222");
    expect(t.status).toBe("inactive");
    const owner = await admin().auth().getUserByEmail(env.E2E_OWNER_EMAIL);
    expect(t.ownerId).toBe(owner.uid);

    // Al recargar, los datos siguen ahí
    await page.reload();
    await expect(page.getByLabel("Nombre Comercial")).toHaveValue(nuevo, { timeout: 30_000 });
    expect(errors, errors.join("\n")).toEqual([]);
  });
});
