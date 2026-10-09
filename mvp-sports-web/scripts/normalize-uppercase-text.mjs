// Corrige textos que quedaron guardados en MAYÚSCULAS por campos que las forzaban.
// Nombres → "Nombre Propio"; descripciones/notas → "Formato de oración".
// Solo toca valores totalmente en mayúsculas (no cambia textos con mayúsculas/minúsculas mezcladas).
// Uso: node --env-file=.env.local scripts/normalize-uppercase-text.mjs [--apply]
import admin from "firebase-admin";

const apply = process.argv.includes("--apply");
const key = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/^["']+|["']+$/g, "").split("\\n").join("\n");
admin.initializeApp({ credential: admin.credential.cert({ projectId: process.env.FIREBASE_PROJECT_ID, clientEmail: process.env.FIREBASE_CLIENT_EMAIL, privateKey: key }) });
const db = admin.firestore();

// Colección → campos tipo nombre (title) y tipo texto libre (sentence)
const TARGETS = {
  users: { title: ["displayName", "fullName", "jobTitle", "city"], sentence: [] },
  staff: { title: ["fullName", "jobTitle"], sentence: [] },
  bookings: { title: ["clientName"], sentence: ["notes"] },
  tenants: { title: [], sentence: ["description", "cancellationPolicy"] },
  tournaments: { title: [], sentence: ["description", "rules"] },
  academy_classes: { title: [], sentence: ["description"] },
  coupons: { title: [], sentence: ["description"] },
  reports: { title: [], sentence: ["subject", "description", "steps"] },
};

const SMALL = new Set(["de", "del", "la", "las", "los", "y", "e", "da", "van", "von"]);
const isAllUpper = (s) => {
  const letters = s.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g, "");
  return letters.length >= 3 && letters === letters.toUpperCase() && letters !== letters.toLowerCase();
};
const toTitle = (s) => s.toLowerCase().split(/(\s+|-)/).map((w, i) => (i > 0 && SMALL.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1))).join("");
const toSentence = (s) => s.toLowerCase().replace(/(^\s*|[.!?]\s+)([a-záéíóúüñ])/g, (m, p, c) => p + c.toUpperCase());

let changes = 0;
for (const [col, { title, sentence }] of Object.entries(TARGETS)) {
  const snap = await db.collection(col).get();
  let batch = db.batch(), ops = 0;
  for (const d of snap.docs) {
    const data = d.data();
    const upd = {};
    for (const f of title) if (typeof data[f] === "string" && isAllUpper(data[f])) upd[f] = toTitle(data[f]);
    for (const f of sentence) if (typeof data[f] === "string" && isAllUpper(data[f])) upd[f] = toSentence(data[f]);
    if (Object.keys(upd).length) {
      changes++;
      console.log(`${col}/${d.id}:`, Object.entries(upd).map(([k, v]) => `${k}: "${data[k].slice(0, 40)}" → "${v.slice(0, 40)}"`).join(" | "));
      if (apply) { batch.update(d.ref, upd); if (++ops >= 400) { await batch.commit(); batch = db.batch(); ops = 0; } }
    }
  }
  if (apply && ops) await batch.commit();
}
console.log(`\n${changes} documentos ${apply ? "corregidos" : "por corregir (simulación; usa --apply)"}.`);
process.exit(0);
