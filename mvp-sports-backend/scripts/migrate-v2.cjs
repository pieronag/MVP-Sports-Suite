// Migración a la estructura v2 de la base.
//
// Uso (desde la raíz del repo):
//   node mvp-sports-backend/scripts/migrate-v2.cjs ruta/service-account.json            → modo prueba: solo muestra los cambios
//   node mvp-sports-backend/scripts/migrate-v2.cjs ruta/service-account.json --apply    → guarda respaldo y aplica
// Opciones:
//   --image=panel    conserva como imagen principal la que muestra el panel (imageURL) en vez de la de la app (imageUrl)
//   --pricing=panel  si un deporte tiene tarifas con dos nombres ("Pádel" y "Padel"), conserva la que editaba el panel
//                    (la escrita como en activeSports) en vez de la que cobraba el servidor (nombre oficial)
//
// Es idempotente: correrla dos veces no cambia nada la segunda vez.
const fs = require("fs");
const path = require("path");

const keyPath = process.argv[2];
const APPLY = process.argv.includes("--apply");
const IMAGE_FROM_PANEL = process.argv.includes("--image=panel");
const PRICING_FROM_PANEL = process.argv.includes("--pricing=panel");
if (!keyPath) { console.error("Indica la ruta del archivo de cuenta de servicio (JSON)."); process.exit(1); }

const root = path.resolve(__dirname, "../..");
const admin = require(path.join(root, "mvp-sports-web/node_modules/firebase-admin"));
admin.initializeApp({ credential: admin.credential.cert(require(path.resolve(keyPath))) });
const db = admin.firestore();
const { FieldValue, Timestamp } = admin.firestore;
const DEL = FieldValue.delete();

// ---- Reglas de normalización (mismas que utils/sports.ts y utils/roles.ts de la web) ----
const key = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z]/g, "");
const SPORT = {
  futbol: "Fútbol", football: "Fútbol", soccer: "Fútbol", futbol11: "Fútbol",
  futbolito: "Futbolito", baby: "Futbolito", babyfutbol: "Futbolito", futsal: "Futbolito", futbol7: "Futbolito", futbol5: "Futbolito",
  padel: "Pádel", paddle: "Pádel", tenis: "Tenis", tennis: "Tenis",
  basquetbol: "Básquetbol", basketball: "Básquetbol", basquet: "Básquetbol", basket: "Básquetbol",
  voleibol: "Vóleibol", volleyball: "Vóleibol", voley: "Vóleibol", volley: "Vóleibol",
};
const sport = (s) => (s ? SPORT[key(s)] || String(s).trim() : s);
const sports = (arr) => [...new Set((arr || []).map(sport).filter(Boolean))];
const role = (r) => { const x = String(r || "").trim().toLowerCase(); return x === "staff" ? "manager" : x === "user" || !x ? "player" : x; };
const toTs = (v) => {
  if (!v || v instanceof Timestamp) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : Timestamp.fromDate(d);
};
const toNum = (v) => (typeof v === "string" && v.trim() !== "" && !isNaN(Number(v.replace(",", "."))) ? Number(v.replace(",", ".")) : null);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const short = (v) => (typeof v === "string" && v.length > 70 ? v.slice(0, 67) + "…" : v);

// ---- Cambios por colección: cada función devuelve { campo: valorNuevo | DEL } ----
const plansP = db.collection("settings").doc("global").get().then((s) => (s.data() || {}).plans || []);

async function tenantPatch(d) {
  const p = {};
  const plans = await plansP;
  // Imagen principal única
  const main = IMAGE_FROM_PANEL ? d.imageURL || d.imageUrl : d.imageUrl || d.imageURL;
  if (main && d.imageUrl !== main) p.imageUrl = main;
  if ("imageURL" in d) p.imageURL = DEL;
  // Plan: planId (id del plan en settings/global)
  if (!d.planId && d.plan) {
    const ref = key(d.plan);
    const plan = plans.find((x) => key(x.id || "") === ref || key(x.name || "") === ref);
    if (plan) p.planId = plan.id;
  }
  if ((d.planId || p.planId) && d.plan !== undefined) p.plan = DEL; // en la misma pasada en que se crea planId
  // Deportes y tarifas con nombre oficial (si hay "Pádel" y "Padel", gana la que ya tenía el nombre oficial)
  const as = sports([...(d.activeSports || []), ...(d.sports || [])]);
  if (!same(as, d.activeSports || [])) p.activeSports = as;
  if ("sports" in d) p.sports = DEL;
  if (d.pricing && typeof d.pricing === "object") {
    const merged = {};
    // Variante que editaba el panel: la escrita igual que en activeSports (p. ej. "Padel")
    const panelKeys = new Set(d.activeSports || []);
    for (const [k, v] of Object.entries(d.pricing)) {
      const c = sport(k);
      const preferred = PRICING_FROM_PANEL ? panelKeys.has(k) : k === c;
      if (!(c in merged) || preferred) merged[c] = v;
    }
    if (!same(Object.keys(merged).sort(), Object.keys(d.pricing).sort())) p.pricing = merged;
  }
  // Restos de Transbank (pago 100% Mercado Pago)
  for (const f of ["isTransbankActive", "transbankCommerceCode"]) if (f in d) p[f] = DEL;
  return p;
}

function courtPatch(d) {
  const p = {};
  if (d.sport && sport(d.sport) !== d.sport) p.sport = sport(d.sport);
  return p;
}

const DAY = 86_400_000;
function bookingPatch(d) {
  const p = {};
  if (d.sport && sport(d.sport) !== d.sport) p.sport = sport(d.sport);
  if (d.totalPrice === undefined && (d.price !== undefined || d.finalPrice !== undefined)) p.totalPrice = Number(d.price ?? d.finalPrice) || 0;
  // Pago parcial y campos sin uso
  for (const f of ["deposit", "remainingBalance", "seriesOf", "id", "finalPrice"]) if (f in d) p[f] = DEL;
  // Checkouts sin pagar de más de un día: no son reservas (pago 100% online)
  const created = d.createdAt?.toDate ? d.createdAt.toDate() : d.createdAt?.seconds ? new Date(d.createdAt.seconds * 1000) : null;
  if (String(d.paymentStatus || "").toLowerCase() === "pending" && d.status !== "cancelled" && (!created || Date.now() - created.getTime() > DAY)) {
    p.status = "cancelled"; p.cancelReason = "pago_no_realizado"; p.cancelledBy = "sistema"; p.cancelledAt = FieldValue.serverTimestamp();
  }
  // createdAt guardado como mapa {seconds, nanoseconds}
  if (d.createdAt && !(d.createdAt instanceof Timestamp) && typeof d.createdAt.seconds === "number") p.createdAt = new Timestamp(d.createdAt.seconds, d.createdAt.nanoseconds || 0);
  return p;
}

function userPatch(d) {
  const p = {};
  const r = role(d.role);
  if (d.role !== r) p.role = r;
  for (const f of ["createdAt", "updatedAt", "lastLogin"]) { const t = toTs(d[f]); if (t && typeof d[f] === "string") p[f] = t; }
  for (const f of ["height", "weight", "level"]) { const n = toNum(d[f]); if (n !== null) p[f] = n; }
  if (d.mainSport && sport(d.mainSport) !== d.mainSport) p.mainSport = sport(d.mainSport);
  if (Array.isArray(d.favSports) && !same(sports(d.favSports), d.favSports)) p.favSports = sports(d.favSports);
  for (const f of ["interests", "lastCalculation"]) if (f in d) p[f] = DEL;
  return p;
}

function sportFieldPatch(d) {
  const p = {};
  if (d.sport && sport(d.sport) !== d.sport) p.sport = sport(d.sport);
  if (Array.isArray(d.sports) && !same(sports(d.sports), d.sports)) p.sports = sports(d.sports);
  return p;
}

// Reglas de experiencia: una sola fuente (settings/global.gamification). Se quitan campos antiguos que nada lee.
const OLD_GAMIFICATION = ["winPoints", "drawPoints", "lossPoints", "multiplierSuperior", "bronzeThreshold", "silverThreshold", "goldThreshold", "eliteThreshold"];
function settingsPatch(d, id) {
  if (id !== "global") return {};
  const p = {};
  if ("primaryColor" in d) p.primaryColor = DEL;
  for (const k of OLD_GAMIFICATION) if (d.gamification && k in d.gamification) p[`gamification.${k}`] = DEL;
  return p;
}

// Documentos completos que nada usa
const OBSOLETE_DOCS = ["settings/gamification"];

const PLAN = [
  ["tenants", tenantPatch], ["courts", courtPatch], ["bookings", bookingPatch], ["users", userPatch],
  ["teams", sportFieldPatch], ["matchmaking", sportFieldPatch], ["public_profiles", sportFieldPatch],
  ["settings", settingsPatch],
];

(async () => {
  console.log(APPLY ? "MODO APLICAR: se guardará un respaldo y se escribirán los cambios.\n" : "MODO PRUEBA: no se escribe nada. Usa --apply para aplicar.\n");
  const backup = {};
  const writes = [];
  const summary = [];
  for (const [col, fn] of PLAN) {
    const snap = await db.collection(col).get();
    let changed = 0;
    for (const doc of snap.docs) {
      const data = doc.data();
      const patch = await fn(data, doc.id);
      if (!Object.keys(patch).length) continue;
      changed++;
      (backup[col] ||= {})[doc.id] = data;
      writes.push({ ref: doc.ref, patch });
      console.log(`${col}/${doc.id}`);
      for (const [k, v] of Object.entries(patch)) {
        const after = v === DEL ? "(se elimina)" : v instanceof Timestamp ? v.toDate().toISOString() : v?.constructor?.name === "ServerTimestampTransform" || (v && typeof v === "object" && v._methodName) ? "(fecha del servidor)" : JSON.stringify(short(v));
        const before = k.includes('.') ? k.split('.').reduce((o, x) => (o == null ? o : o[x]), data) : data[k];
        console.log(`   ${k}: ${JSON.stringify(short(before))} → ${after}`);
      }
    }
    summary.push(`${col}: ${changed} de ${snap.size}`);
  }
  const deletes = [];
  for (const docPath of OBSOLETE_DOCS) {
    const snap = await db.doc(docPath).get();
    if (!snap.exists) continue;
    const [col, id] = docPath.split("/");
    (backup[col] ||= {})[id] = snap.data();
    deletes.push(snap.ref);
    console.log(`${docPath}\n   (documento sin uso: se elimina)`);
  }
  summary.push(`documentos obsoletos: ${deletes.length}`);
  console.log("\nResumen:\n  " + summary.join("\n  "));
  if (!APPLY) { console.log(`\n${writes.length + deletes.length} documentos cambiarían. Nada se modificó.`); process.exit(0); }

  const dir = path.join(root, "docs", "backups");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `backup-v2-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  fs.writeFileSync(file, JSON.stringify(backup, (k, v) => (v && typeof v === "object" && typeof v._seconds === "number" ? { __ts: v._seconds } : v), 2));
  console.log(`\nRespaldo: ${file}`);

  for (let i = 0; i < writes.length; i += 400) {
    const batch = db.batch();
    writes.slice(i, i + 400).forEach((w) => batch.update(w.ref, w.patch));
    await batch.commit();
  }
  for (const ref of deletes) await ref.delete();
  await db.collection("settings").doc("schema").set({ version: 2, migratedAt: FieldValue.serverTimestamp(), documents: writes.length }, { merge: true });
  console.log(`Listo: ${writes.length} documentos actualizados y ${deletes.length} eliminados. Versión de esquema: 2.`);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
