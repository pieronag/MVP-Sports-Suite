// Pruebas de reglas Firestore (requiere el emulador: Java 21 + firebase-tools).
// Ejecutar desde mvp-sports-backend:
//   npx firebase-tools emulators:exec --only firestore "cd functions && npx vitest run src/__tests__/firestore.rules.test.ts"
import {readFileSync} from "fs";
import {resolve} from "path";
import {afterAll, beforeAll, beforeEach, describe, it} from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {doc, getDoc, setDoc, updateDoc} from "firebase/firestore";

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "mvp-sports-rules-test",
    firestore: {rules: readFileSync(resolve(__dirname, "../../../firestore.rules"), "utf8")},
  });
});

afterAll(async () => env?.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "users/player1"), {role: "player"});
    await setDoc(doc(db, "users/managerA"), {role: "manager", tenantIds: ["A"], tenantId: "A"});
    await setDoc(doc(db, "users/ownerA"), {role: "owner"});
    await setDoc(doc(db, "tenants/A"), {name: "Recinto A", ownerId: "ownerA"});
    await setDoc(doc(db, "tenants/B"), {name: "Recinto B", ownerId: "ownerB"});
    await setDoc(doc(db, "courts/cA"), {tenantId: "A", name: "Cancha 1"});
    await setDoc(doc(db, "courts/cB"), {tenantId: "B", name: "Cancha 1"});
    await setDoc(doc(db, "bookings/bA"), {tenantId: "A", userId: "player1", paymentStatus: "pending", totalPrice: 20000});
    await setDoc(doc(db, "tenant_secrets/A"), {mercadopagoAccessToken: "APP_USR-x"});
  });
});

const as = (uid: string) => env.authenticatedContext(uid).firestore();

describe("roles", () => {
  it("un jugador no puede hacerse superadmin", async () => {
    await assertFails(updateDoc(doc(as("player1"), "users/player1"), {role: "superadmin"}));
  });
  it("un jugador sí puede editar su nombre", async () => {
    await assertSucceeds(updateDoc(doc(as("player1"), "users/player1"), {displayName: "Nuevo"}));
  });
  it("registro propio solo como jugador", async () => {
    await assertFails(setDoc(doc(as("nuevo"), "users/nuevo"), {role: "owner"}));
    await assertSucceeds(setDoc(doc(as("nuevo2"), "users/nuevo2"), {role: "player", status: "active"}));
  });
});

describe("secretos", () => {
  it("nadie lee tenant_secrets desde el cliente", async () => {
    await assertFails(getDoc(doc(as("ownerA"), "tenant_secrets/A")));
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), "tenant_secrets/A")));
  });
  it("no se guardan tokens en tenants", async () => {
    await assertFails(updateDoc(doc(as("ownerA"), "tenants/A"), {mercadopagoAccessToken: "APP_USR-y"}));
  });
});

describe("alcance por recinto", () => {
  it("manager de A edita canchas de A pero no de B", async () => {
    await assertSucceeds(updateDoc(doc(as("managerA"), "courts/cA"), {name: "Cancha 1 techada"}));
    await assertFails(updateDoc(doc(as("managerA"), "courts/cB"), {name: "hack"}));
  });
  it("owner de A edita su recinto pero no el B", async () => {
    await assertSucceeds(updateDoc(doc(as("ownerA"), "tenants/A"), {phone: "+56911111111"}));
    await assertFails(updateDoc(doc(as("ownerA"), "tenants/B"), {phone: "+56900000000"}));
  });
});

describe("reservas", () => {
  it("un jugador no crea reservas pagadas", async () => {
    await assertFails(setDoc(doc(as("player1"), "bookings/x"), {tenantId: "A", userId: "player1", paymentStatus: "paid"}));
    await assertSucceeds(setDoc(doc(as("player1"), "bookings/y"), {tenantId: "A", userId: "player1", paymentStatus: "pending"}));
  });
  it("un jugador no marca su reserva como pagada", async () => {
    await assertFails(updateDoc(doc(as("player1"), "bookings/bA"), {paymentStatus: "paid"}));
  });
  it("el manager del recinto sí cobra la reserva", async () => {
    await assertSucceeds(updateDoc(doc(as("managerA"), "bookings/bA"), {paymentStatus: "paid"}));
  });
});

describe("equipos, reseñas y disponibilidad", () => {
  beforeEach(async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "teams/t1"), {ownerId: "captain", members: ["captain", "player1"], joinRequests: []});
    });
  });
  it("un jugador pide unirse pero no se agrega como miembro", async () => {
    await assertSucceeds(updateDoc(doc(as("player2"), "teams/t1"), {joinRequests: ["player2"]}));
    await assertFails(updateDoc(doc(as("player2"), "teams/t1"), {members: ["captain", "player1", "player2"]}));
  });
  it("un miembro puede salir del equipo", async () => {
    await assertSucceeds(updateDoc(doc(as("player1"), "teams/t1"), {members: ["captain"]}));
  });
  it("no se crea un equipo a nombre de otro", async () => {
    await assertFails(setDoc(doc(as("player1"), "teams/t2"), {ownerId: "captain", members: ["captain"]}));
  });
  it("solo el titular de la reserva la reseña", async () => {
    await assertSucceeds(setDoc(doc(as("player1"), "reviews/r1"), {bookingId: "bA", userId: "player1", rating: 5}));
    await assertFails(setDoc(doc(as("player2"), "reviews/r2"), {bookingId: "bA", userId: "player2", rating: 1}));
  });
  it("un jugador no lee reservas ajenas pero sí la disponibilidad", async () => {
    await assertFails(getDoc(doc(as("player2"), "bookings/bA")));
    await assertSucceeds(getDoc(doc(as("player2"), "court_slots/cA_2026-10-10")));
  });
});
