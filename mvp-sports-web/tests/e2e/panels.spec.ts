import { test, expect, type Page } from "@playwright/test";
import fs from "fs";
import { env, admin, exists, saPath } from "./helpers";

// Panel del mánager y Configuración del complejo con cuentas de prueba (@example.test).
// El dueño de prueba administra un recinto propio e inactivo (no lo ven los jugadores).
const TENANT = "e2e-recinto-prueba";

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
    const t = (await admin().firestore().collection("tenants").doc(TENANT).get()).data() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
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

test.describe("Administración (superadmin)", () => {
  test("todas las pantallas de la plataforma cargan sin errores de permisos", async ({ page, isMobile }) => {
    test.skip(isMobile, "Basta una vez");
    test.skip(!(await exists(env.E2E_ADMIN_EMAIL)), "Sin superadmin de prueba");
    test.setTimeout(180_000);
    const errors = watchErrors(page);
    await login(page, env.E2E_ADMIN_EMAIL, env.E2E_ADMIN_PASSWORD);
    for (const p of ["/dashboard", "/dashboard/metrics", "/dashboard/tenants", "/dashboard/users", "/dashboard/owners", "/dashboard/invoices",
      "/dashboard/reports", "/dashboard/audit", "/dashboard/gamification", "/dashboard/settings", "/dashboard/users/analytics"]) {
      await page.goto(p);
      await expect(page).toHaveURL(new RegExp(`${p.replace(/\//g, "\/")}\/?$`), { timeout: 20_000 });
      await page.waitForTimeout(2500); // las escuchas de Firestore no dejan la red en reposo
      await expect(page.getByText(/no tienes permiso|error al cargar/i), p).toHaveCount(0);
    }
    expect(errors, errors.join("\n")).toEqual([]);
  });
});

test.describe("Check-in con el código del ticket", () => {
  test("recepción escribe el código como sale en el ticket y registra el ingreso", async ({ page, isMobile }) => {
    test.skip(isMobile, "Escribe en la base: basta una vez");
    const booking = fs.existsSync(saPath) ? await admin().firestore().collection("bookings").doc("E2ECHECKINAB12CD").get() : null;
    test.skip(!booking?.exists || !!booking.data()?.checkIn || !(await exists(env.E2E_MANAGER_EMAIL)), "Sin reserva de prueba sin ingresar (se crea con el script de datos de prueba)");
    test.setTimeout(120_000);
    const errors = watchErrors(page);
    await login(page, env.E2E_MANAGER_EMAIL, env.E2E_MANAGER_PASSWORD);
    await page.goto("/dashboard/checkin");
    await expect(page.getByText("Jugador E2E").first()).toBeVisible({ timeout: 30_000 });
    await page.getByPlaceholder(/buscar por código de reserva/i).fill("#AB12CD");
    await page.getByRole("button", { name: /^validar$/i }).click();
    await page.getByRole("button", { name: /confirmar entrada/i }).click();
    await expect(page.getByText(/ingreso exitoso/i)).toBeVisible({ timeout: 20_000 });
    const b = (await admin().firestore().collection("bookings").doc("E2ECHECKINAB12CD").get()).data() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(b.checkIn).toBeTruthy();
    expect(errors, errors.join("\n")).toEqual([]);

    // El partido jugado suma experiencia al jugador y la ve en Estadísticas
    const user = (await admin().firestore().collection("users").doc(b.userId).get()).data() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(user.xp).toBeGreaterThan(0);
    if (!env.E2E_PLAYER_PASSWORD) return;
    const player = await page.context().browser()!.newPage();
    await player.goto("/login");
    await player.waitForLoadState("networkidle");
    await player.locator("#email").fill(env.E2E_PLAYER_EMAIL);
    await player.locator("#password").fill(env.E2E_PLAYER_PASSWORD);
    await player.locator('button[type="submit"]').click();
    await expect(player).toHaveURL(/\/player/, { timeout: 30_000 });
    await player.goto("/player/estadisticas");
    await expect(player.getByText("XP total")).toBeVisible({ timeout: 30_000 });
    await expect(player.getByText(user.xp.toLocaleString("es-CL"), { exact: true }).first()).toBeVisible({ timeout: 20_000 });
    await player.close();
  });
});

test.describe("Liquidaciones", () => {
  test("el superadmin abre una liquidación y descarga su PDF", async ({ page, isMobile }) => {
    test.skip(isMobile, "Basta una vez");
    test.skip(!(await exists(env.E2E_ADMIN_EMAIL)), "Sin superadmin de prueba");
    test.setTimeout(120_000);
    const errors = watchErrors(page);
    await login(page, env.E2E_ADMIN_EMAIL, env.E2E_ADMIN_PASSWORD);
    await page.goto("/dashboard/invoices");
    // La vista abre en el último mes cerrado: retrocede hasta encontrar una liquidación (máx. 12 meses)
    const ver = page.getByTitle("Ver liquidación").first();
    await expect(page.getByRole("button", { name: "Mes anterior" })).toBeVisible({ timeout: 30_000 });
    for (let i = 0; i < 12 && !(await ver.isVisible().catch(() => false)); i++) {
      await page.getByRole("button", { name: "Mes anterior" }).click();
      await page.waitForTimeout(1500);
    }
    test.skip(!(await ver.isVisible()), "No hay liquidaciones en los últimos 12 meses");
    await ver.click();
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: /descargar/i }).last().click();
    const file = await (await download).path();
    const head = fs.readFileSync(file).subarray(0, 5).toString();
    expect(head).toBe("%PDF-");
    expect(fs.statSync(file).size).toBeGreaterThan(5_000);
    expect(errors, errors.join("\n")).toEqual([]);
  });
});
