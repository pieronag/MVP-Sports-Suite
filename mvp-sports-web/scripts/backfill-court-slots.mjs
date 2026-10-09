// Llena court_slots y booking_reviews con las reservas existentes (una vez, antes
// de publicar las reglas que cierran la lectura de bookings).
// Uso: node --env-file=.env.local scripts/backfill-court-slots.mjs [--apply]
import admin from "firebase-admin";

const apply = process.argv.includes("--apply");
const key = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/^["']+|["']+$/g, "").split("\n").join("\n");
admin.initializeApp({ credential: admin.credential.cert({ projectId: process.env.FIREBASE_PROJECT_ID, clientEmail: process.env.FIREBASE_CLIENT_EMAIL, privateKey: key }) });
const db = admin.firestore();

const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit" });
const toDate = (r) => (r?.toDate ? r.toDate() : r?.seconds ? new Date(r.seconds * 1000) : r ? new Date(r) : null);
const INACTIVE = new Set(["cancelled", "rejected", "refunded"]);
const since = new Date(Date.now() - 2 * 24 * 3600 * 1000); // solo horarios desde anteayer

const slots = new Map();
let reviews = 0;
let batch = db.batch(), ops = 0;
const flush = async () => { if (apply && ops) await batch.commit(); batch = db.batch(); ops = 0; };

const snap = await db.collection("bookings").get();
for (const d of snap.docs) {
  const b = d.data();
  const date = toDate(b.date);
  if (date && b.courtId && typeof b.startTime === "string" && !b.isInternalMatch && !INACTIVE.has(String(b.status || "").toLowerCase()) && date >= since) {
    const day = new Date(date);
    if (Number(b.startTime.split(":")[0]) < 6) day.setUTCDate(day.getUTCDate() - 1);
    const id = `${b.courtId}_${fmt.format(day)}`;
    if (!slots.has(id)) slots.set(id, { courtId: b.courtId, tenantId: b.tenantId || null, day: fmt.format(day), taken: {} });
    slots.get(id).taken[b.startTime] = d.id;
  }
  if (Number(b.rating) > 0 && b.tenantId) {
    reviews++;
    batch.set(db.collection("booking_reviews").doc(d.id), {
      tenantId: b.tenantId, courtId: b.courtId || null, userId: b.userId || null,
      displayName: String(b.clientName || "Jugador").trim().split(/\s+/)[0],
      rating: Number(b.rating), comment: String(b.comment || b.feedback || "").slice(0, 600),
      sport: b.sport || null, date: toDate(b.ratedAt) || date || new Date(),
    }, { merge: true });
    if (++ops >= 400) await flush();
  }
}
for (const [id, v] of slots) {
  batch.set(db.collection("court_slots").doc(id), { ...v, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  if (++ops >= 400) await flush();
}
await flush();
console.log(`${snap.size} reservas leídas → ${slots.size} días/cancha y ${reviews} calificaciones ${apply ? "escritas" : "(simulación; usa --apply)"}.`);
process.exit(0);
