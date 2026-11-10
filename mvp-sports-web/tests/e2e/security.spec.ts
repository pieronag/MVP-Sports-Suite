import { test, expect, type APIRequestContext } from "@playwright/test";
import { env, admin, exists, idToken } from "./helpers";

// QA agresivo de la API: cada ruta se ataca sin sesión, con sesión falsa, con datos basura
// y desde cada rol intentando lo que no le corresponde. Ningún ataque puede terminar en 2xx ni en 500.
// Usa las cuentas y recintos de prueba (recinto propio y recinto ajeno) del script de datos de prueba.
const TENANT = "e2e-recinto-prueba", TENANT_B = "e2e-recinto-ajeno";
const BOOKING_A = "E2ECHECKINAB12CD", BOOKING_B = "E2EAJENOZZ99XY";

const POST_ROUTES = [
  "/api/academies/enroll", "/api/account/delete", "/api/admin/maintenance", "/api/admin/user-status", "/api/auth/email",
  "/api/billing/plan", "/api/bookings/cancel", "/api/bookings/checkin", "/api/bookings/refund", "/api/bookings/sync",
  "/api/mercadopago/create", "/api/players/recompute", "/api/push/subscribe", "/api/push/test", "/api/reviews",
  "/api/reviews/reply", "/api/send-email", "/api/staff", "/api/staff/delete", "/api/staff/update", "/api/tenant-secrets",
  "/api/tournaments/register",
];
const GET_ROUTES = ["/api/mercadopago/cards", "/api/mercadopago/status", "/api/public-profiles?top=1", "/api/tenant-secrets?tenantId=" + TENANT_B];
// Rutas que funcionan sin sesión a propósito
const PUBLIC_OK = new Set(["/api/auth/email"]);

test.describe.configure({ mode: "serial" });
test.skip(({ isMobile }) => isMobile, "La API es la misma en celular");

let T: Record<"player" | "playerB" | "manager" | "owner" | "admin", string>;
test.beforeAll(async () => {
  test.skip(!(await exists(env.E2E_PLAYER_B_EMAIL)), "Sin datos de prueba (script de datos de prueba)");
  const [player, playerB, manager, owner, adm] = await Promise.all([
    idToken(env.E2E_PLAYER_EMAIL, env.E2E_PLAYER_PASSWORD), idToken(env.E2E_PLAYER_B_EMAIL, env.E2E_PLAYER_B_PASSWORD),
    idToken(env.E2E_MANAGER_EMAIL, env.E2E_MANAGER_PASSWORD), idToken(env.E2E_OWNER_EMAIL, env.E2E_OWNER_PASSWORD),
    idToken(env.E2E_ADMIN_EMAIL, env.E2E_ADMIN_PASSWORD),
  ]);
  T = { player, playerB, manager, owner, admin: adm };
});

const post = (r: APIRequestContext, url: string, token: string | null, data: unknown) =>
  r.post(url, { headers: token ? { Authorization: `Bearer ${token}` } : {}, data: data as Record<string, unknown> });
const denied = (status: number) => status === 400 || status === 401 || status === 403 || status === 404 || status === 409 || status === 429;

test("sin sesión: ninguna ruta privada responde datos ni se cae", async ({ request }) => {
  const bad: string[] = [];
  for (const url of POST_ROUTES) {
    const s = (await post(request, url, null, { bookingId: BOOKING_B, tenantId: TENANT_B })).status();
    if (!PUBLIC_OK.has(url) && !denied(s)) bad.push(`POST ${url} → ${s}`);
  }
  for (const url of GET_ROUTES) {
    const s = (await request.get(url)).status();
    if (!denied(s)) bad.push(`GET ${url} → ${s}`);
  }
  expect((await request.get("/api/cron/cleanup-pending")).status()).toBe(401);
  expect((await request.get("/api/cron/cleanup-pending", { headers: { Authorization: "Bearer adivinanza" } })).status()).toBe(401);
  expect(bad, bad.join("\n")).toEqual([]);
});

test("sesión falsa o vencida: rechazada en todas las rutas", async ({ request }) => {
  const fake = "eyJhbGciOiJSUzI1NiJ9.eyJ1aWQiOiJoYWNrZXIiLCJyb2xlIjoic3VwZXJhZG1pbiJ9.firma-falsa";
  const bad: string[] = [];
  for (const url of POST_ROUTES) {
    const s = (await post(request, url, fake, { bookingId: BOOKING_B, tenantId: TENANT_B, uid: "x", status: "suspended" })).status();
    if (!PUBLIC_OK.has(url) && !denied(s)) bad.push(`POST ${url} → ${s}`);
  }
  expect(bad, bad.join("\n")).toEqual([]);
});

test("datos basura con sesión válida: errores controlados, nunca 500", async ({ request }) => {
  const junk: unknown[] = [null, "texto", 12345, [], { bookingId: { $gt: "" } }, { bookingId: "../../users/x" }, { tenantId: "x".repeat(5000) },
    { bookingId: "<script>alert(1)</script>", rating: 999, comment: "x".repeat(20000) }, { uids: Array(500).fill("a") }];
  const bad: string[] = [];
  for (const url of POST_ROUTES.filter((u) => !["/api/account/delete", "/api/auth/email", "/api/send-email"].includes(u))) {
    for (const data of junk) {
      const res = await request.post(url, { headers: { Authorization: `Bearer ${T.player}`, "Content-Type": "application/json" }, data: JSON.stringify(data) });
      if (res.status() >= 500) bad.push(`POST ${url} ${JSON.stringify(data).slice(0, 40)} → ${res.status()}`);
    }
    const raw = await request.post(url, { headers: { Authorization: `Bearer ${T.player}`, "Content-Type": "application/json" }, data: "{no es json" });
    if (raw.status() >= 500) bad.push(`POST ${url} (JSON roto) → ${raw.status()}`);
  }
  expect(bad, bad.join("\n")).toEqual([]);
});

test("jugador: no puede usar funciones del recinto ni de la plataforma", async ({ request }) => {
  const attempts: [string, unknown][] = [
    ["/api/bookings/checkin", { bookingId: BOOKING_A, action: "checkin" }],
    ["/api/bookings/checkin", { bookingId: BOOKING_B, action: "noshow" }],
    ["/api/bookings/cancel", { bookingId: BOOKING_B, reason: "ataque" }],
    ["/api/staff", { tenantIds: [TENANT], fullName: "Intruso", email: "intruso@example.test", password: "Intruso123!", passwordConfirm: "Intruso123!" }],
    ["/api/staff/update", { staffId: "x", role: "superadmin" }],
    ["/api/staff/delete", { staffId: "x" }],
    ["/api/billing/plan", { action: "schedule", tenantId: TENANT, planId: "elite", cycle: "monthly" }],
    ["/api/tenant-secrets", { tenantId: TENANT, mercadopagoAccessToken: "APP_USR-robado" }],
    ["/api/admin/user-status", { uid: "cualquiera", status: "suspended" }],
    ["/api/admin/maintenance", { task: "migrate-secrets", apply: true }],
    ["/api/reviews/reply", { reviewId: "x", reply: "respuesta falsa" }],
  ];
  const bad: string[] = [];
  for (const [url, data] of attempts) {
    const s = (await post(request, url, T.player, data)).status();
    if (!denied(s)) bad.push(`${url} ${JSON.stringify(data).slice(0, 60)} → ${s}`);
  }
  const s = (await request.get(`/api/tenant-secrets?tenantId=${TENANT}`, { headers: { Authorization: `Bearer ${T.player}` } })).status();
  if (!denied(s)) bad.push(`GET tenant-secrets → ${s}`);
  expect(bad, bad.join("\n")).toEqual([]);
});

test("jugador A: no puede tocar la reserva ni la cuenta del jugador B", async ({ request }) => {
  const bad: string[] = [];
  for (const [url, data] of [
    ["/api/bookings/refund", { bookingId: BOOKING_B }],
    ["/api/reviews", { bookingId: BOOKING_B, rating: 1, comment: "reseña falsa" }],
    ["/api/send-email", { email: env.E2E_PLAYER_B_EMAIL, name: "Phishing" }],
    ["/api/auth/email", { email: env.E2E_PLAYER_B_EMAIL, type: "verify" }],
  ] as [string, unknown][]) {
    const s = (await post(request, url, T.player, data)).status();
    if (!denied(s)) bad.push(`${url} → ${s}`);
  }
  const b = (await admin().firestore().collection("bookings").doc(BOOKING_B).get()).data();
  expect(b?.status).toBe("confirmed");
  expect(b?.paymentStatus).toBe("paid");
  expect(bad, bad.join("\n")).toEqual([]);
});

test("mánager: limitado a su recinto y sin funciones del dueño", async ({ request }) => {
  const bad: string[] = [];
  for (const [url, data] of [
    ["/api/bookings/checkin", { bookingId: BOOKING_B, action: "checkin" }],
    ["/api/bookings/cancel", { bookingId: BOOKING_B, reason: "ataque" }],
    ["/api/staff", { tenantIds: [TENANT], fullName: "Otro Mánager", email: "otro@example.test", password: "Intruso123!", passwordConfirm: "Intruso123!" }],
    ["/api/billing/plan", { action: "schedule", tenantId: TENANT, planId: "elite", cycle: "monthly" }],
    ["/api/tenant-secrets", { tenantId: TENANT, mercadopagoAccessToken: "APP_USR-robado" }],
    ["/api/admin/user-status", { uid: "x", status: "suspended" }],
  ] as [string, unknown][]) {
    const s = (await post(request, url, T.manager, data)).status();
    if (!denied(s)) bad.push(`${url} ${JSON.stringify(data).slice(0, 50)} → ${s}`);
  }
  expect((await admin().firestore().collection("bookings").doc(BOOKING_B).get()).data()?.checkIn).toBeFalsy();
  expect(bad, bad.join("\n")).toEqual([]);
});

test("dueño: no puede tocar el recinto ajeno ni subir de rol a nadie", async ({ request }) => {
  const bad: string[] = [];
  for (const [url, data] of [
    ["/api/bookings/cancel", { bookingId: BOOKING_B, reason: "ataque" }],
    ["/api/bookings/checkin", { bookingId: BOOKING_B, action: "noshow" }],
    ["/api/staff", { tenantIds: [TENANT_B], fullName: "Infiltrado", email: "infiltrado@example.test", password: "Intruso123!", passwordConfirm: "Intruso123!" }],
    ["/api/billing/plan", { action: "schedule", tenantId: TENANT_B, planId: "free", cycle: "monthly" }],
    ["/api/tenant-secrets", { tenantId: TENANT_B, mercadopagoAccessToken: "APP_USR-robado" }],
    ["/api/admin/user-status", { uid: "x", status: "suspended" }],
    ["/api/admin/maintenance", { task: "rebuild-slots", apply: true }],
  ] as [string, unknown][]) {
    const s = (await post(request, url, T.owner, data)).status();
    if (!denied(s)) bad.push(`${url} ${JSON.stringify(data).slice(0, 50)} → ${s}`);
  }
  const s = (await request.get(`/api/tenant-secrets?tenantId=${TENANT_B}`, { headers: { Authorization: `Bearer ${T.owner}` } })).status();
  if (!denied(s)) bad.push(`GET tenant-secrets ajeno → ${s}`);
  // Alta de personal en su recinto: el rol queda en mánager aunque pida superadmin
  const ok = await post(request, "/api/staff", T.owner, { tenantIds: [TENANT], fullName: "Mánager Extra E2E", email: "e2e.extra@example.test", password: "Extra1234!", passwordConfirm: "Extra1234!", role: "superadmin" });
  if (ok.ok()) {
    const u = await admin().auth().getUserByEmail("e2e.extra@example.test");
    const d = (await admin().firestore().collection("users").doc(u.uid).get()).data();
    if (d?.role !== "manager") bad.push(`alta de personal con rol ${d?.role}`);
    await admin().auth().deleteUser(u.uid);
    await admin().firestore().collection("users").doc(u.uid).delete();
    for (const x of (await admin().firestore().collection("staff").where("email", "==", "e2e.extra@example.test").get()).docs) await x.ref.delete();
  }
  const t = (await admin().firestore().collection("tenants").doc(TENANT_B).get()).data();
  expect(t?.pendingPlanId).toBeFalsy();
  expect(bad, bad.join("\n")).toEqual([]);
});

test("las respuestas nunca filtran datos personales ni secretos", async ({ request }) => {
  const res = await request.get("/api/public-profiles?top=1", { headers: { Authorization: `Bearer ${T.player}` } });
  const text = await res.text();
  expect(text).not.toMatch(/@example\.test|"email"|"phone"|"rut"|birthDate|"role"/);
  const season = await (await request.get("/api/season")).text();
  expect(season).not.toMatch(/@|"email"|"phone"|"rut"/);
  // El superadmin sí ve si hay credenciales, pero nunca su valor
  const sec = await request.get(`/api/tenant-secrets?tenantId=${TENANT}`, { headers: { Authorization: `Bearer ${T.admin}` } });
  expect(sec.status()).toBeLessThan(500);
  expect(await sec.text()).not.toMatch(/APP_USR-|TEST-\d/);
});

test("límite de intentos: repetir una acción muchas veces se frena", async ({ request }) => {
  const statuses: number[] = [];
  for (let i = 0; i < 6; i++) statuses.push((await post(request, "/api/bookings/refund", T.playerB, { bookingId: "no-existe-" + i })).status());
  expect(statuses).toContain(429);
});
