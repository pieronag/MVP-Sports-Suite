import { test, expect } from "@playwright/test";
import { initializeApp, deleteApp, type FirebaseApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, addDoc, deleteDoc, collection, getDocs, query, where, limit, type Firestore,
} from "firebase/firestore";
import { env, admin, exists } from "./helpers";

// QA agresivo de las reglas de Firestore publicadas: cada rol usa el SDK directamente (saltándose la app)
// e intenta leer o escribir lo que no le corresponde. Toda escritura prohibida debe ser rechazada.
const TENANT = "e2e-recinto-prueba", TENANT_B = "e2e-recinto-ajeno";
const BOOKING_A = "E2ECHECKINAB12CD", BOOKING_B = "E2EAJENOZZ99XY";

test.describe.configure({ mode: "serial" });
test.skip(({ isMobile }) => isMobile, "Las reglas son las mismas en celular");

const apps: FirebaseApp[] = [];
async function as(email: string, password: string): Promise<{ db: Firestore; uid: string }> {
  const app = initializeApp({
    apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY, authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
  }, `qa-${email}-${Date.now()}`);
  apps.push(app);
  const cred = await signInWithEmailAndPassword(getAuth(app), email, password);
  return { db: getFirestore(app), uid: cred.user.uid };
}
test.afterAll(async () => { await Promise.all(apps.map((a) => deleteApp(a))); });

// Ejecuta cada intento y devuelve los que NO fueron rechazados
async function attempts(list: [string, () => Promise<unknown>][]) {
  const passed: string[] = [];
  for (const [name, fn] of list) {
    try { await fn(); passed.push(name); } catch (e) {
      const code = (e as { code?: string }).code || "";
      if (!/permission-denied|PERMISSION_DENIED/i.test(code + String(e))) passed.push(`${name} (error inesperado: ${code || e})`);
    }
  }
  return passed;
}

test.beforeAll(async () => {
  test.skip(!(await exists(env.E2E_PLAYER_B_EMAIL)), "Sin datos de prueba (script de datos de prueba)");
});

test("jugador: no puede escalar privilegios ni tocar datos ajenos", async () => {
  const { db, uid } = await as(env.E2E_PLAYER_EMAIL, env.E2E_PLAYER_PASSWORD);
  const B = (await admin().auth().getUserByEmail(env.E2E_PLAYER_B_EMAIL)).uid;
  const passed = await attempts([
    ["subirse a superadmin", () => updateDoc(doc(db, "users", uid), { role: "superadmin" })],
    ["regalarse experiencia", () => updateDoc(doc(db, "users", uid), { xp: 999999 })],
    ["asignarse un recinto", () => updateDoc(doc(db, "users", uid), { tenantIds: [TENANT] })],
    ["leer el perfil de otro jugador", () => getDoc(doc(db, "users", B))],
    ["editar el perfil de otro jugador", () => updateDoc(doc(db, "users", B), { displayName: "hackeado" })],
    ["listar todos los usuarios", () => getDocs(query(collection(db, "users"), limit(5)))],
    ["crear una reserva pagada sin pagar", () => addDoc(collection(db, "bookings"), { userId: uid, tenantId: TENANT, courtId: "x", paymentStatus: "paid", status: "confirmed", totalPrice: 0 })],
    ["marcarse pagada su reserva", () => updateDoc(doc(db, "bookings", BOOKING_A), { paymentStatus: "paid", totalPrice: 1 })],
    ["hacerse el check-in solo", () => updateDoc(doc(db, "bookings", BOOKING_A), { checkIn: `falso-${Date.now()}` })],
    ["leer la reserva de otro jugador", () => getDoc(doc(db, "bookings", BOOKING_B))],
    ["cancelar la reserva de otro jugador", () => updateDoc(doc(db, "bookings", BOOKING_B), { status: "cancelled" })],
    ["editar un recinto", () => updateDoc(doc(db, "tenants", TENANT), { name: "hackeado" })],
    ["leer credenciales de pago", () => getDoc(doc(db, "tenant_secrets", TENANT))],
    ["leer suscripciones push", () => getDocs(query(collection(db, "push_subscriptions"), limit(1)))],
    ["crear una liquidación", () => addDoc(collection(db, "invoices"), { tenantId: TENANT, amount: -1000 })],
    ["crear una reseña sin jugar", () => addDoc(collection(db, "reviews"), { venueId: TENANT, rating: 1 })],
    ["crear un cupón", () => addDoc(collection(db, "coupons"), { tenantId: TENANT, code: "GRATIS", discount: 100 })],
    ["cambiar la configuración global", () => setDoc(doc(db, "settings", "global"), { commissionRate: 0 }, { merge: true })],
    ["darse de alta como personal", () => addDoc(collection(db, "staff"), { uid, tenantIds: [TENANT], role: "manager" })],
    ["leer la auditoría", () => getDocs(query(collection(db, "audit_logs"), limit(1)))],
    ["escribir en la auditoría", () => addDoc(collection(db, "audit"), { action: "falso", userId: uid })],
    ["leer pagos ajenos", () => getDocs(query(collection(db, "payments"), limit(5)))],
    ["inscribirse en un torneo sin pagar", () => addDoc(collection(db, "tournament_registrations"), { userId: uid, tournamentId: "x", paymentStatus: "paid" })],
    ["ponerse un nombre gigante (rompe ranking y equipos)", () => updateDoc(doc(db, "users", uid), { displayName: "x".repeat(100_000) })],
    ["publicarse en partidos con una descripción gigante", () => addDoc(collection(db, "matchmaking"), { userId: uid, type: "player", status: "active", description: "x".repeat(100_000) })],
    ["crear un equipo con nombre gigante", () => addDoc(collection(db, "teams"), { ownerId: uid, members: [uid], name: "x".repeat(5000) })],
    ["reporte de soporte gigante", () => addDoc(collection(db, "reports"), { userId: uid, subject: "x", description: "x".repeat(900_000) })],
  ]);
  expect(passed, passed.join("\n")).toEqual([]);
  // Control positivo: sí puede leer y editar lo propio permitido
  expect((await getDoc(doc(db, "users", uid))).exists()).toBe(true);
  await updateDoc(doc(db, "users", uid), { city: "Rancagua", displayName: "Jugador E2E" });
});

test("mánager: solo ve y opera su recinto", async () => {
  const { db, uid } = await as(env.E2E_MANAGER_EMAIL, env.E2E_MANAGER_PASSWORD);
  const passed = await attempts([
    ["leer una reserva de otro recinto (datos personales)", () => getDoc(doc(db, "bookings", BOOKING_B))],
    ["listar reservas de otro recinto", () => getDocs(query(collection(db, "bookings"), where("tenantId", "==", TENANT_B)))],
    ["listar todas las reservas", () => getDocs(query(collection(db, "bookings"), limit(5)))],
    ["editar una reserva de otro recinto", () => updateDoc(doc(db, "bookings", BOOKING_B), { checkIn: true })],
    ["editar otro recinto", () => updateDoc(doc(db, "tenants", TENANT_B), { name: "hackeado" })],
    ["cambiar el plan de su recinto", () => updateDoc(doc(db, "tenants", TENANT), { plan: "elite", planId: "elite" })],
    ["subirse a dueño", () => updateDoc(doc(db, "users", uid), { role: "owner" })],
    ["crear una cancha en otro recinto", () => addDoc(collection(db, "courts"), { tenantId: TENANT_B, name: "x" })],
    ["marcar pagada una reserva", () => updateDoc(doc(db, "bookings", BOOKING_A), { paymentStatus: "refunded", refundAmount: 99999 })],
  ]);
  expect(passed, passed.join("\n")).toEqual([]);
  expect((await getDoc(doc(db, "bookings", BOOKING_A))).exists()).toBe(true); // su recinto sí
});

test("dueño: dueño de lo suyo y nada más", async () => {
  const { db, uid } = await as(env.E2E_OWNER_EMAIL, env.E2E_OWNER_PASSWORD);
  const created: string[] = []; // documentos legítimos que crea la prueba (se borran al final)
  const passed = await attempts([
    ["agregarse como dueño de otro recinto", () => updateDoc(doc(db, "tenants", TENANT_B), { ownerIds: [uid] })],
    ["leer una reserva de otro recinto", () => getDoc(doc(db, "bookings", BOOKING_B))],
    ["cambiar su propio plan sin pagar", () => updateDoc(doc(db, "tenants", TENANT), { planId: "elite", features: { topPosition: true } })],
    ["subir su nota", () => updateDoc(doc(db, "tenants", TENANT), { rating: 5 })],
    ["borrar su deuda", () => updateDoc(doc(db, "tenants", TENANT), { debt: 0, debtStatus: "paid" })],
    ["escribir sus credenciales en el documento público", () => updateDoc(doc(db, "tenants", TENANT), { mercadopagoAccessToken: "APP_USR-x" })],
    ["leer sus credenciales directo", () => getDoc(doc(db, "tenant_secrets", TENANT))],
    ["borrar su recinto", () => deleteDoc(doc(db, "tenants", TENANT))],
    ["crear un cupón sin recinto (valdría en todos)", () => addDoc(collection(db, "coupons"), { ownerId: uid, code: "E2EGLOBAL", discount: 100, status: "active" })],
    ["crear un cupón con descuento de 500%", () => addDoc(collection(db, "coupons"), { ownerId: uid, tenantId: TENANT, code: "E2EMEGA", discount: 500 })],
    ["mover su cupón al recinto ajeno", async () => {
      const ref = await addDoc(collection(db, "coupons"), { ownerId: uid, tenantId: TENANT, code: "E2EMOVER", discount: 10, status: "active" });
      created.push(ref.path);
      await updateDoc(ref, { tenantId: TENANT_B });
    }],
    ["mover su torneo al recinto ajeno", async () => {
      const ref = await addDoc(collection(db, "tournaments"), { ownerId: uid, tenantId: TENANT, name: "Torneo E2E", price: 0 });
      created.push(ref.path);
      await updateDoc(ref, { tenantId: TENANT_B });
    }],
    ["subirse a superadmin", () => updateDoc(doc(db, "users", uid), { role: "superadmin" })],
  ]);
  expect(passed, passed.join("\n")).toEqual([]);
  await updateDoc(doc(db, "tenants", TENANT), { address: "Calle de Prueba 456" }); // lo suyo sí
  for (const p of created) await admin().firestore().doc(p).delete();
});
