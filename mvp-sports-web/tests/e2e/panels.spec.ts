import { test, expect, type Page } from "@playwright/test";
import fs from "fs";
import { env, admin, exists, saPath } from "./helpers";
import { bookingDays, slotPrice } from "../../utils/venueBooking";
import { chileDateTime } from "../../utils/chileTime";

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

    // Un email inválido no se guarda
    await page.getByLabel("Email de Contacto").fill("no-es-un-email");
    await page.getByRole("button", { name: /^guardar$/i }).click();
    await expect(page.getByText("El email de contacto no es válido.")).toBeVisible();
    await page.keyboard.press("Escape");
    expect((await admin().firestore().collection("tenants").doc(TENANT).get()).data()?.contactEmail).not.toBe("no-es-un-email");

    // Revisar credenciales dice qué falta, sin inventar conexiones
    const mp = page.getByRole("switch", { name: "Cobro online con Mercado Pago" });
    if ((await mp.isEnabled()) && (await mp.getAttribute("aria-checked")) === "false") await mp.click();
    if (await mp.isEnabled()) {
      await page.getByLabel("Public Key").fill("");
      await page.getByRole("button", { name: "Revisar credenciales" }).click();
      await expect(page.getByRole("status").filter({ hasText: /Falta: Public Key/ })).toBeVisible();
    }
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

test.describe("Canchas", () => {
  test("el dueño ve la flota de su recinto y la filtra por nombre", async ({ page, isMobile }) => {
    test.skip(isMobile, "Basta una vez");
    test.skip(!(await exists(env.E2E_OWNER_EMAIL)), "Sin dueño de prueba");
    test.setTimeout(120_000);
    const errors = watchErrors(page);
    await login(page, env.E2E_OWNER_EMAIL, env.E2E_OWNER_PASSWORD);
    await page.goto("/dashboard/courts");
    // Primero se elige el recinto en la lista
    await page.getByText("Recinto E2E").first().click({ timeout: 30_000 });
    await expect(page.getByText("Cancha E2E").first()).toBeVisible({ timeout: 30_000 });
    await page.getByPlaceholder(/buscar/i).first().fill("no existe");
    await expect(page.getByText("Cancha E2E")).toHaveCount(0);
    await page.getByPlaceholder(/buscar/i).first().fill("E2E");
    await expect(page.getByText("Cancha E2E").first()).toBeVisible();
    expect(errors, errors.join("\n")).toEqual([]);
  });
});

test.describe("Torneo por grupos", () => {
  test("el fixture muestra a qué grupo pertenece cada partido y una tabla por grupo", async ({ page, isMobile }) => {
    test.skip(isMobile, "Basta una vez");
    test.skip(!(await exists(env.E2E_OWNER_EMAIL)), "Sin dueño de prueba");
    test.setTimeout(120_000);
    const { groups } = await import("../../utils/fixture");
    const owner = await admin().auth().getUserByEmail(env.E2E_OWNER_EMAIL);
    const teams = Array.from({ length: 8 }, (_, i) => ({ id: `e2e-t${i + 1}`, name: `Equipo E2E ${i + 1}` }));
    const fixture = groups(teams);
    fixture.matches[0] = { ...fixture.matches[0], score1: 2, score2: 1, status: "finished" }; // un resultado para que haya tabla
    const ref = admin().firestore().collection("tournaments").doc("e2e-torneo-grupos");
    await ref.set({ tenantId: "e2e-recinto-prueba", ownerId: owner.uid, name: "Copa E2E Grupos", sport: "Pádel", type: "grupos", price: 0, maxTeams: 8,
      teams: teams.map((t) => ({ ...t, userId: owner.uid })), enrolledTeams: 8, status: "active", fixture, isVisibleInApp: false });
    try {
      const errors = watchErrors(page);
      await login(page, env.E2E_OWNER_EMAIL, env.E2E_OWNER_PASSWORD);
      await page.goto("/dashboard/tournaments");
      const card = page.locator("div", { hasText: "Copa E2E Grupos" }).filter({ has: page.getByTitle("Fixture") }).last();
      await card.getByTitle("Fixture").click({ timeout: 30_000 });
      await expect(page.getByText(/Grupo A/).first()).toBeVisible({ timeout: 20_000 }); // en la tarjeta del partido
      await page.getByRole("button", { name: /posiciones/i }).first().click();
      await expect(page.getByText("Grupo A", { exact: true })).toBeVisible();
      await expect(page.getByText("Grupo B", { exact: true })).toBeVisible();
      expect(errors, errors.join("\n")).toEqual([]);
    } finally {
      await ref.delete();
    }
  });
});

test.describe("Sorteo del fixture", () => {
  test("validar, sacar bolillas y lanzar el torneo guarda el fixture", async ({ page, isMobile }) => {
    test.skip(isMobile, "Basta una vez");
    test.skip(!(await exists(env.E2E_OWNER_EMAIL)), "Sin dueño de prueba");
    test.setTimeout(180_000);
    const owner = await admin().auth().getUserByEmail(env.E2E_OWNER_EMAIL);
    const ref = admin().firestore().collection("tournaments").doc("e2e-torneo-sorteo");
    await ref.set({ tenantId: "e2e-recinto-prueba", ownerId: owner.uid, name: "Copa E2E Sorteo", sport: "Pádel", type: "eliminacion", price: 0, maxTeams: 2, prize1: "Trofeo",
      teams: [{ id: "e2e-s1", name: "Rojos E2E", userId: owner.uid }, { id: "e2e-s2", name: "Azules E2E", userId: owner.uid }], enrolledTeams: 2, status: "open", isVisibleInApp: false });
    try {
      const errors = watchErrors(page);
      await login(page, env.E2E_OWNER_EMAIL, env.E2E_OWNER_PASSWORD);
      await page.goto("/dashboard/tournaments");
      const card = page.locator("div", { hasText: "Copa E2E Sorteo" }).filter({ has: page.getByTitle("Fixture") }).last();
      await card.getByTitle("Fixture").click({ timeout: 30_000 });
      await page.getByRole("button", { name: /iniciar sorteo de bolillas/i }).click();
      for (let i = 0; i < 2; i++) {
        const ball = page.getByRole("button", { name: /sacar bolilla/i });
        await expect(ball).toBeEnabled({ timeout: 20_000 });
        await ball.click();
      }
      await page.getByRole("button", { name: /confirmar fixture y lanzar torneo/i }).first().click({ timeout: 30_000 });
      await expect.poll(async () => (await ref.get()).data()?.status, { timeout: 15_000 }).toBe("active");
      const t = (await ref.get()).data()!;
      expect(t.fixture.matches.length).toBe(1);
      expect([t.fixture.matches[0].team1_id, t.fixture.matches[0].team2_id].sort()).toEqual(["e2e-s1", "e2e-s2"]);
      expect(errors, errors.join("\n")).toEqual([]);
    } finally {
      await ref.delete();
    }
  });
});

test.describe("Reservar desde la ficha del recinto (jugador)", () => {
  test("elige día y hora, respeta el mantenimiento programado y lleva al pago con el precio de la tarifa", async ({ page, isMobile }) => {
    test.skip(isMobile, "Basta una vez");
    test.skip(!(await exists(env.E2E_PLAYER_EMAIL)), "Sin datos de prueba");
    test.setTimeout(120_000);
    const db = admin().firestore();
    const court = db.collection("courts").doc("e2e-cancha-prueba");
    const tenant = (await db.collection("tenants").doc(TENANT).get()).data()!;
    const day = bookingDays(new Date(), 3)[2]; // pasado mañana: sin reservas de prueba
    // Mantenimiento programado ese día de 10:00 a 12:00: solo esas horas deben desaparecer
    await court.update({ status: "maintenance", maintenanceStart: chileDateTime(day.date, 10, 0), maintenanceUntil: chileDateTime(day.date, 12, 0) });
    try {
      const errors = watchErrors(page);
      await page.goto("/login");
      await page.waitForLoadState("networkidle");
      await page.locator("#email").fill(env.E2E_PLAYER_EMAIL);
      await page.locator("#password").fill(env.E2E_PLAYER_PASSWORD);
      await page.locator('button[type="submit"]').click();
      await expect(page).toHaveURL(/\/player/, { timeout: 30_000 });
      await page.goto(`/player/clubes/${TENANT}`);
      // Un solo deporte: se elige solo y abre el paso de día y hora
      await page.getByRole("tab").nth(2).click({ timeout: 30_000 });
      await expect(page.getByRole("button", { name: "12:00", exact: true })).toBeVisible({ timeout: 20_000 });
      for (const t of ["10:00", "11:00"]) await expect(page.getByRole("button", { name: t, exact: true })).toHaveCount(0);
      await page.getByRole("button", { name: "12:00", exact: true }).click();
      const price = slotPrice(tenant, "Pádel", day.date, "12:00");
      expect(price).toBeGreaterThan(0);
      await page.getByRole("button", { name: /^Continuar/ }).click();
      await page.getByRole("button", { name: "Confirmar y pagar" }).click();
      await expect(page).toHaveURL(/\/player\/checkout/, { timeout: 20_000 });
      const q = new URL(page.url()).searchParams;
      expect({ courtId: q.get("courtId"), date: q.get("date"), startTime: q.get("startTime"), price: q.get("price") })
        .toEqual({ courtId: "e2e-cancha-prueba", date: day.date, startTime: "12:00", price: String(price) });
      expect(errors, errors.join("\n")).toEqual([]);
    } finally {
      await court.update({ status: "available", maintenanceStart: null, maintenanceUntil: null });
    }
  });
});

test.describe("Partidos (jugador)", () => {
  test("abre la ficha de un equipo y la de un jugador publicados", async ({ page, isMobile }) => {
    test.skip(isMobile, "Basta una vez");
    test.skip(!(await exists(env.E2E_PLAYER_B_EMAIL)), "Sin datos de prueba");
    test.setTimeout(120_000);
    const db = admin().firestore();
    const B = await admin().auth().getUserByEmail(env.E2E_PLAYER_B_EMAIL);
    const team = db.collection("teams").doc("e2e-equipo-partidos");
    const tEntry = db.collection("matchmaking").doc("e2e-mm-equipo"), pEntry = db.collection("matchmaking").doc("e2e-mm-jugador");
    await Promise.all([
      team.set({ name: "Halcones E2E", ownerId: B.uid, members: [B.uid], sport: "Pádel" }),
      tEntry.set({ type: "team", status: "active", userId: B.uid, teamId: team.id, teamName: "Halcones E2E", sport: "Pádel", region: "O'Higgins", communes: ["Rancagua"], memberCount: 1, description: "Buscamos rival E2E", createdAt: new Date() }),
      pEntry.set({ type: "player", status: "active", userId: B.uid, displayName: "Lucía E2E", sports: ["Pádel"], position: "Drive", ovr: 55, tier: "Bronce", region: "O'Higgins", communes: ["Rancagua"], description: "Juego los sábados", createdAt: new Date() }),
    ]);
    try {
      const errors = watchErrors(page);
      await page.goto("/login");
      await page.waitForLoadState("networkidle");
      await page.locator("#email").fill(env.E2E_PLAYER_EMAIL);
      await page.locator("#password").fill(env.E2E_PLAYER_PASSWORD);
      await page.locator('button[type="submit"]').click();
      await expect(page).toHaveURL(/\/player/, { timeout: 30_000 });
      await page.goto("/player/equipos/partidos");
      // Ficha del equipo
      const teamCard = page.locator("div", { hasText: "Halcones E2E" }).filter({ has: page.getByRole("button", { name: "Ver" }) }).last();
      await teamCard.getByRole("button", { name: "Ver" }).click({ timeout: 30_000 });
      await expect(page.getByText("Buscamos rival E2E").last()).toBeVisible();
      await page.getByRole("button", { name: "Cerrar" }).last().click();
      // Ficha del jugador
      await page.getByRole("tab", { name: /jugadores/i }).or(page.getByRole("button", { name: /^jugadores$/i })).first().click();
      const playerCard = page.locator("div", { hasText: "Lucía E2E" }).filter({ has: page.getByRole("button", { name: "Ver" }) }).last();
      await playerCard.getByRole("button", { name: "Ver" }).click({ timeout: 30_000 });
      await expect(page.getByText("Juego los sábados").last()).toBeVisible();
      await page.keyboard.press("Escape");
      expect(errors, errors.join("\n")).toEqual([]);
    } finally {
      await Promise.all([team.delete(), tEntry.delete(), pEntry.delete()]);
    }
  });

  test("publica su disponibilidad, valida la edición, la retira y reta a un equipo", async ({ page, isMobile }) => {
    test.skip(isMobile, "Escribe en la base: basta una vez");
    test.skip(!(await exists(env.E2E_PLAYER_B_EMAIL)), "Sin datos de prueba");
    test.setTimeout(150_000);
    const db = admin().firestore();
    const A = await admin().auth().getUserByEmail(env.E2E_PLAYER_EMAIL);
    const B = await admin().auth().getUserByEmail(env.E2E_PLAYER_B_EMAIL);
    const rival = db.collection("teams").doc("e2e-equipo-rival"), mine = db.collection("teams").doc("e2e-equipo-mio");
    const rEntry = db.collection("matchmaking").doc("e2e-mm-rival");
    const cleanup = async () => {
      const [mm, ch] = await Promise.all([
        db.collection("matchmaking").where("userId", "==", A.uid).get(),
        db.collection("challenges").where("senderId", "==", A.uid).get(),
      ]);
      await Promise.all([rival.delete(), mine.delete(), rEntry.delete(), ...mm.docs.map((d) => d.ref.delete()), ...ch.docs.map((d) => d.ref.delete())]);
    };
    await cleanup();
    await Promise.all([
      rival.set({ name: "Rivales E2E", ownerId: B.uid, members: [B.uid], sport: "Pádel" }),
      mine.set({ name: "Míos E2E", ownerId: A.uid, members: [A.uid], sport: "Pádel" }),
      rEntry.set({ type: "team", status: "active", userId: B.uid, teamId: rival.id, teamName: "Rivales E2E", sport: "Pádel", region: "O'Higgins", communes: ["Rancagua"], memberCount: 1, createdAt: new Date() }),
    ]);
    try {
      const errors = watchErrors(page);
      await page.goto("/login");
      await page.waitForLoadState("networkidle");
      await page.locator("#email").fill(env.E2E_PLAYER_EMAIL);
      await page.locator("#password").fill(env.E2E_PLAYER_PASSWORD);
      await page.locator('button[type="submit"]').click();
      await expect(page).toHaveURL(/\/player/, { timeout: 30_000 });
      await page.goto("/player/equipos/partidos?tab=jugadores");

      // Publicar disponibilidad: sin comuna no se puede
      await page.getByRole("button", { name: "Estoy disponible" }).click({ timeout: 30_000 });
      const sheet = page.getByRole("dialog", { name: "Estoy disponible" });
      const padel = sheet.getByRole("button", { name: "Pádel" });
      if ((await padel.getAttribute("aria-pressed")) !== "true") await padel.click();
      await sheet.getByRole("combobox").selectOption("O'Higgins");
      await sheet.getByRole("button", { name: "Publicar disponibilidad" }).click();
      await expect(sheet.getByRole("alert")).toHaveText(/comuna/);
      await sheet.getByRole("button", { name: "Rancagua" }).click();
      await sheet.getByRole("button", { name: "Publicar disponibilidad" }).click();
      await expect(page.getByText(/Disponibilidad publicada/)).toBeVisible({ timeout: 20_000 });
      await page.getByRole("button", { name: "Entendido" }).click();

      // Ya publicado: el botón pasa a editar, y no deja quedarse sin deportes
      await page.getByRole("button", { name: /Ya estás disponible/ }).click({ timeout: 20_000 });
      const edit = page.getByRole("dialog", { name: "Editar publicación" });
      for (const b of await edit.getByRole("button", { pressed: true }).all()) await b.click();
      await edit.getByRole("button", { name: "Guardar cambios" }).click();
      await expect(edit.getByRole("alert")).toHaveText(/al menos un deporte/);
      await page.keyboard.press("Escape");

      // Retirarla desde Mis partidos
      await page.getByRole("tab", { name: /Mis partidos/ }).click();
      await page.getByRole("button", { name: "Retirar" }).first().click();
      await page.getByRole("dialog", { name: "¿Retirar publicación?" }).getByRole("button", { name: "Retirar" }).click();
      await expect(page.getByRole("button", { name: "Retirar" })).toHaveCount(0, { timeout: 20_000 });
      const left = await db.collection("matchmaking").where("userId", "==", A.uid).where("status", "==", "active").get();
      expect(left.size).toBe(0);

      // Retar con mi único equipo de capitán: va directo a confirmar
      await page.getByRole("tab", { name: /Buscar rival/ }).click();
      await page.getByRole("group", { name: "Deporte" }).getByRole("button", { name: "Pádel" }).click();
      while ((await page.getByRole("button", { name: "Ver Rivales E2E" }).count()) === 0) {
        const widen = page.getByRole("button", { name: /^Buscar en/ });
        if (!(await widen.count())) break;
        await widen.click();
      }
      await page.getByRole("button", { name: "Ver Rivales E2E" }).click({ timeout: 30_000 });
      await page.getByRole("button", { name: /Retar a este equipo/ }).click({ timeout: 20_000 });
      await page.getByRole("button", { name: "Confirmar reto" }).click();
      await expect(page.getByText(/Has retado a Rivales E2E/)).toBeVisible({ timeout: 20_000 });
      const sent = await db.collection("challenges").where("senderId", "==", A.uid).get();
      expect(sent.docs.map((d) => d.data())).toEqual([expect.objectContaining({ challengerTeamId: mine.id, challengedTeamId: rival.id, status: "pending", receiverId: B.uid })]);
      expect(errors, errors.join("\n")).toEqual([]);
    } finally {
      await cleanup();
    }
  });
});

test.describe("Check-in: inasistencia", () => {
  test("una reserva que pasó la tolerancia se marca como inasistencia solo tras confirmar", async ({ page, isMobile }) => {
    test.skip(isMobile, "Escribe en la base: basta una vez");
    const db = admin().firestore();
    const base = (await db.collection("bookings").doc("E2ECHECKINAB12CD").get()).data();
    test.skip(!base || !(await exists(env.E2E_MANAGER_EMAIL)), "Sin datos de prueba");
    // Comenzó hace 20 minutos (hora de Chile); sin cruzar la medianoche
    const started = new Date(Date.now() - 20 * 60_000);
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(started).map((p) => [p.type, p.value]));
    test.skip(Number(parts.hour) < 7, "Cerca del cambio de día operativo");
    test.setTimeout(120_000);
    const ref = db.collection("bookings").doc("E2ENOSHOWQQ77XY");
    const userRef = db.collection("users").doc(base!.userId);
    const strikesBefore = (await userRef.get()).data()?.strikes || 0;
    await ref.set({ ...base, clientName: "Ausente E2E", startTime: `${parts.hour}:${parts.minute}`, endTime: "23:59", date: new Date(`${parts.year}-${parts.month}-${parts.day}T12:00:00Z`), checkIn: false });
    try {
      const errors = watchErrors(page);
      await login(page, env.E2E_MANAGER_EMAIL, env.E2E_MANAGER_PASSWORD);
      await page.goto("/dashboard/checkin");
      await expect(page.getByText(/pasó la tolerancia sin ingreso/)).toBeVisible({ timeout: 30_000 });
      await page.getByText(/pasó la tolerancia sin ingreso/).click();
      const row = page.locator('[data-booking="E2ENOSHOWQQ77XY"]');
      await expect(row.getByText("No llegó", { exact: true })).toBeVisible();
      // No se puede dar ingreso, y la inasistencia pide confirmación
      await expect(row.getByRole("button", { name: "Ingresar" })).toHaveCount(0);
      await row.getByRole("button", { name: "Registrar inasistencia de Ausente E2E" }).click();
      await page.getByRole("button", { name: "Cancelar" }).click();
      expect((await ref.get()).data()?.noShow).toBeFalsy();
      await row.getByRole("button", { name: "Registrar inasistencia de Ausente E2E" }).click();
      await page.getByRole("dialog").getByRole("button", { name: "Registrar inasistencia" }).click();
      await expect(row.getByText("Inasistencia", { exact: true })).toBeVisible({ timeout: 20_000 });
      const after = (await ref.get()).data();
      expect(after).toMatchObject({ noShow: true, status: "cancelled" });
      expect(errors, errors.join("\n")).toEqual([]);
    } finally {
      await ref.delete();
      await userRef.update({ strikes: strikesBefore });
    }
  });
});

test.describe("Check-in escaneando el QR del ticket", () => {
  test("el QR del ticket del jugador, leído por recepción, registra el ingreso", async ({ page, browser, isMobile }) => {
    test.skip(isMobile, "Escribe en la base: basta una vez");
    const booking = await admin().firestore().collection("bookings").doc("E2ECHECKINAB12CD").get();
    test.skip(!booking.exists || !!booking.data()?.checkIn || !(await exists(env.E2E_MANAGER_EMAIL)), "Sin reserva de prueba sin ingresar");
    test.setTimeout(150_000);
    // 1) El jugador abre su ticket y se toma la imagen del QR
    const ctx = await browser.newContext();
    const player = await ctx.newPage();
    await player.goto("/login");
    await player.waitForLoadState("networkidle");
    await player.locator("#email").fill(env.E2E_PLAYER_EMAIL);
    await player.locator("#password").fill(env.E2E_PLAYER_PASSWORD);
    await player.locator('button[type="submit"]').click();
    await expect(player).toHaveURL(/\/player/, { timeout: 30_000 });
    await player.goto("/player/ticket?bookingId=E2ECHECKINAB12CD");
    // El QR (qrcode.react) con su recuadro blanco: el margen blanco es necesario para leerlo
    const qr = player.locator('div.bg-white.p-4 > svg').first();
    await expect(qr).toBeVisible({ timeout: 30_000 });
    await qr.evaluate((el) => el.scrollIntoView({ block: "center" })); // que la barra inferior no lo tape
    const png = await qr.locator("xpath=..").screenshot({ scale: "device" });
    await ctx.close();
    // 2) Recepción lo "fotografía" con la cámara nativa
    const errors = watchErrors(page);
    await login(page, env.E2E_MANAGER_EMAIL, env.E2E_MANAGER_PASSWORD);
    await page.goto("/dashboard/checkin");
    await expect(page.getByText("Jugador E2E").first()).toBeVisible({ timeout: 30_000 });
    await page.locator("#native-camera-input").setInputFiles({ name: "qr.png", mimeType: "image/png", buffer: png });
    await page.getByRole("button", { name: /confirmar entrada/i }).click({ timeout: 20_000 });
    await expect(page.getByText(/ingreso exitoso/i)).toBeVisible({ timeout: 20_000 });
    expect((await admin().firestore().collection("bookings").doc("E2ECHECKINAB12CD").get()).data()?.checkIn).toBeTruthy();
    expect(errors, errors.join("\n")).toEqual([]);
  });
});

test.describe("Usuarios (superadmin)", () => {
  test("lista solo jugadores: el superadmin y el personal no aparecen", async ({ page, isMobile }) => {
    test.skip(isMobile, "Basta una vez");
    test.skip(!(await exists(env.E2E_ADMIN_EMAIL)), "Sin superadmin de prueba");
    test.setTimeout(120_000);
    await login(page, env.E2E_ADMIN_EMAIL, env.E2E_ADMIN_PASSWORD);
    await page.goto("/dashboard/users");
    await page.getByPlaceholder(/buscar/i).first().fill("E2E", { timeout: 30_000 });
    const main = page.locator("main");
    await expect(main.getByText("Jugador E2E", { exact: true }).first()).toBeVisible({ timeout: 30_000 });
    for (const staff of ["Admin E2E", "Mánager E2E", "Dueño E2E"]) await expect(main.getByText(staff, { exact: true })).toHaveCount(0);
  });
});

test.describe("Configuración central (superadmin)", () => {
  // Sin guardar: es la configuración real de la plataforma
  test("recorre las pestañas, marca cambios pendientes y valida al elevar staff", async ({ page, isMobile }) => {
    test.skip(!(await exists(env.E2E_ADMIN_EMAIL)), "Sin superadmin de prueba");
    test.setTimeout(120_000);
    const errors = watchErrors(page);
    await login(page, env.E2E_ADMIN_EMAIL, env.E2E_ADMIN_PASSWORD);
    await page.goto("/dashboard/settings");
    await expect(page.getByText("Modelos de monetización")).toBeVisible({ timeout: 30_000 });
    const save = page.getByRole("button", { name: "Guardar cambios" });
    await expect(save).toBeDisabled();

    // Editar un beneficio deja el aviso de cambios pendientes y habilita Guardar
    await page.getByRole("switch").first().click();
    await expect(page.getByText("Cambios sin guardar")).toBeVisible();
    await expect(save).toBeEnabled();

    await page.getByRole("tab", { name: /Fiscal/ }).click();
    await expect(page.getByRole("heading", { name: "Factura electrónica (SII)" })).toBeVisible();
    await expect(page.getByLabel("IVA (%)")).toHaveValue(/\d+/);

    await page.getByRole("tab", { name: /Identidad/ }).click();
    await expect(page.getByLabel("Nombre de la plataforma")).not.toHaveValue("");

    await page.getByRole("tab", { name: /Staff/ }).click();
    await expect(page.getByText(/\(tú\)/)).toBeVisible();
    await page.getByLabel("Buscar en el staff").fill("zzzz-nadie");
    await expect(page.getByText("Nadie coincide con la búsqueda")).toBeVisible();
    await page.getByLabel("Correo del usuario a elevar").fill("nadie.existe@example.test");
    await page.getByRole("button", { name: /Asignar rango/ }).click();
    await expect(page.getByText("Usuario no encontrado")).toBeVisible();
    await page.getByRole("button", { name: "Entendido" }).click();

    await page.getByRole("tab", { name: /Núcleo/ }).click();
    await expect(page.getByRole("heading", { name: "Auditoría reciente" })).toBeVisible();
    await expect(page.getByRole("button", { name: /mantenimiento/i })).toBeVisible();
    if (!isMobile) await page.screenshot({ path: "test-results/settings-nucleo.png", fullPage: true });
    expect(errors, errors.join("\n")).toEqual([]);
  });
});

test.describe("Red de recintos (superadmin)", () => {
  test("busca, cambia de vista y no deja borrar un recinto con canchas", async ({ page, isMobile }) => {
    test.skip(!(await exists(env.E2E_ADMIN_EMAIL)), "Sin superadmin de prueba");
    test.setTimeout(120_000);
    const errors = watchErrors(page);
    await login(page, env.E2E_ADMIN_EMAIL, env.E2E_ADMIN_PASSWORD);
    await page.goto("/dashboard/tenants");
    await page.getByLabel("Buscar recinto o dueño").fill("Recinto E2E");
    const row = page.locator(`[data-tenant="${TENANT}"]`);
    await expect(row).toBeVisible({ timeout: 30_000 });
    await expect(page.locator("[data-tenant]")).toHaveCount(1);

    // Filtro de inactivos: el recinto de prueba está inactivo
    await page.getByRole("button", { name: "Inactivos" }).click();
    await expect(row).toBeVisible();

    // Vista de tarjetas → eliminar queda bloqueado porque tiene canchas
    await page.getByRole("button", { name: "Vista cuadrícula" }).click();
    await page.getByRole("button", { name: "Eliminar Recinto E2E" }).click();
    await expect(page.getByText("No se puede eliminar")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Suspéndelo para que deje de recibir reservas/)).toBeVisible();
    await page.getByRole("button", { name: "Entendido" }).click();

    // El perfil abre desde la tarjeta
    await page.getByRole("button", { name: "Ver perfil de Recinto E2E" }).click();
    await expect(page.locator("#tenant-profile-title")).toHaveText(/Recinto E2E/);
    if (!isMobile) await page.screenshot({ path: "test-results/tenants-grid.png" });
    expect(errors, errors.join("\n")).toEqual([]);
  });
});

test.describe("Canchas › tarifas", () => {
  test("replicar un precio hacia abajo deja cambios pendientes y se guarda", async ({ page, isMobile }) => {
    test.skip(isMobile, "Escribe en la base: basta una vez");
    test.skip(!(await exists(env.E2E_OWNER_EMAIL)), "Sin dueño de prueba");
    test.setTimeout(120_000);
    const errors = watchErrors(page);
    await login(page, env.E2E_OWNER_EMAIL, env.E2E_OWNER_PASSWORD);
    await page.goto("/dashboard/courts");
    await page.getByText("Recinto E2E").first().click({ timeout: 30_000 });
    await page.getByRole("button", { name: "Infraestructura" }).click();
    await expect(page.getByText("Infraestructura sincronizada")).toBeVisible({ timeout: 30_000 });

    await page.getByRole("tab", { name: "Tarifas" }).click();
    await page.getByRole("tab", { name: "Lunes a viernes" }).click();
    const first = page.locator("[data-slot]").first();
    const slot = await first.getAttribute("data-slot");
    const price = 7000 + Math.floor(Math.random() * 90) * 100; // valor nuevo en cada corrida
    await first.locator("input").fill(String(price));
    await first.getByRole("button", { name: /Replicar el precio/ }).click();
    await expect(page.getByText("Cambios sin guardar")).toBeVisible();
    const last = page.locator("[data-slot]").last();
    await expect(last.locator("input")).toHaveValue(String(price));
    const lastSlot = await last.getAttribute("data-slot");

    await page.getByRole("button", { name: /Sincronizar cambios/ }).click();
    await expect(page.getByText("Infraestructura sincronizada")).toBeVisible({ timeout: 20_000 });
    const pricing = (await admin().firestore().collection("tenants").doc(TENANT).get()).data()?.pricing || {};
    const padel = pricing["Pádel"]?.weekday || {};
    expect(padel[slot!]).toBe(price);
    expect(padel[lastSlot!]).toBe(price);
    expect(errors, errors.join("\n")).toEqual([]);
  });
});
