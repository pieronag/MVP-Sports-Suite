// Mueve credenciales desde tenants/{id} y settings/global (lectura pública)
// a tenant_secrets/{id} y settings_private/global (sin acceso de cliente).
// Uso: node --env-file=.env.local scripts/migrate-tenant-secrets.mjs [--apply]
// Sin --apply solo lista lo que haría.
import admin from "firebase-admin";

const apply = process.argv.includes("--apply");
const key = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/^["']+|["']+$/g, "").split("\n").join("\n");
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: key,
  }),
});
const db = admin.firestore();
const del = admin.firestore.FieldValue.delete();

const SECRET = ["mercadopagoAccessToken", "siiApiKey"];
const LEGACY = [...SECRET, "transbankApiKey"];

const tenants = await db.collection("tenants").get();
let moved = 0;
for (const t of tenants.docs) {
  const d = t.data();
  const found = LEGACY.filter((f) => d[f]);
  if (!found.length) continue;
  moved++;
  console.log(`${t.id} (${d.name || "sin nombre"}): ${found.join(", ")}`);
  if (!apply) continue;
  const secrets = Object.fromEntries(SECRET.filter((f) => d[f]).map((f) => [f, d[f]]));
  if (Object.keys(secrets).length) {
    await db.collection("tenant_secrets").doc(t.id).set({ ...secrets, migratedAt: new Date() }, { merge: true });
  }
  await t.ref.update(Object.fromEntries(LEGACY.map((f) => [f, del])));
}

const g = (await db.collection("settings").doc("global").get()).data();
if (g?.mercadopago?.accessToken) {
  console.log("settings/global: mercadopago.accessToken");
  if (apply) {
    await db.collection("settings_private").doc("global").set({ mercadopagoAccessToken: g.mercadopago.accessToken }, { merge: true });
    await db.collection("settings").doc("global").update({ "mercadopago.accessToken": del });
  }
}

// API Key de Resend (settings/email es de lectura pública)
const em = await db.collection("settings").doc("email").get();
if (em.exists && em.data()?.resendApiKey) {
  console.log("settings/email: resendApiKey → settings_private/email");
  if (apply) {
    await db.collection("settings_private").doc("email").set(em.data(), { merge: true });
    await em.ref.update({ resendApiKey: del });
  }
}

// Credenciales maestras de Transbank (integración eliminada): borrar
const tbm = await db.collection("settings").doc("transbank_master").get();
if (tbm.exists) {
  console.log("settings/transbank_master: credenciales Transbank (se elimina)");
  if (apply) await tbm.ref.delete();
}

console.log(`\n${moved} recintos con credenciales ${apply ? "migrados" : "por migrar (ejecuta con --apply)"}.`);
console.log("Recuerda ROTAR los tokens en Mercado Pago: estuvieron expuestos públicamente.");
process.exit(0);
