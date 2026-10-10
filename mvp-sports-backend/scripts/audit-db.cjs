// Auditoría de solo lectura de Firestore: campos reales por colección y si el código los usa.
// Uso (desde la raíz del repo):
//   node mvp-sports-backend/scripts/audit-db.cjs ruta/a/service-account.json
// Genera docs/auditoria-bd.md. No modifica ningún dato.
const fs = require("fs");
const path = require("path");

const keyPath = process.argv[2];
if (!keyPath) { console.error("Indica la ruta del archivo de cuenta de servicio (JSON)."); process.exit(1); }
const root = path.resolve(__dirname, "../..");
const admin = require(path.join(root, "mvp-sports-web/node_modules/firebase-admin"));
admin.initializeApp({ credential: admin.credential.cert(require(path.resolve(keyPath))) });
const db = admin.firestore();
const SAMPLE = 500;

const codeDirs = ["mvp-sports-web/app", "mvp-sports-web/components", "mvp-sports-web/services", "mvp-sports-web/context",
  "mvp-sports-web/hooks", "mvp-sports-web/utils", "mvp-sports-app", "mvp-sports-backend"];
let code = "";
const walkCode = (dir) => {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".next", ".expo", "dist", "build"].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkCode(p);
    else if (/\.(ts|tsx|js|jsx|rules)$/.test(e.name) && p !== __filename) code += fs.readFileSync(p, "utf8") + "\n";
  }
};
codeDirs.forEach((d) => walkCode(path.join(root, d)));
const usedInCode = (field) => new RegExp(`\\b${field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(code);

const isPlain = (v) => v && typeof v === "object" && !Array.isArray(v) && !(v instanceof admin.firestore.Timestamp) && !(v instanceof admin.firestore.GeoPoint) && !(v instanceof admin.firestore.DocumentReference);

async function scan(ref, label, out) {
  const total = (await ref.count().get()).data().count;
  const snap = await ref.limit(SAMPLE).get();
  const fields = {};
  snap.docs.forEach((d) => {
    const data = d.data();
    for (const [k, v] of Object.entries(data)) {
      const f = (fields[k] ||= { n: 0, types: new Set(), sub: {} });
      f.n++; f.types.add(Array.isArray(v) ? "array" : v === null ? "null" : isPlain(v) ? "map" : v?.constructor?.name === "Timestamp" ? "timestamp" : typeof v);
      if (isPlain(v) && Object.keys(v).length <= 30) for (const sk of Object.keys(v)) f.sub[sk] = (f.sub[sk] || 0) + 1;
    }
  });
  out.push({ label, total, sampled: snap.size, fields });
  if (snap.size) {
    const subs = await snap.docs[0].ref.listCollections();
    for (const s of subs) await scan(db.collectionGroup(s.id).limit(SAMPLE), `${label}/{id}/${s.id}`, out);
  }
}

(async () => {
  const out = [];
  for (const c of await db.listCollections()) await scan(c, c.id, out);
  let md = `# Auditoría de la base de datos\n\nGenerado: ${new Date().toISOString()} · muestra de hasta ${SAMPLE} documentos por colección.\n\n`;
  md += `"Uso en código" busca el nombre del campo en mvp-sports-web, mvp-sports-app y mvp-sports-backend. Un campo sin uso es candidato a eliminar; uno en pocos documentos suele ser un resto de versiones anteriores.\n\n`;
  const summary = [];
  for (const c of out) {
    md += `## ${c.label}\n\n${c.total ?? "?"} documentos (muestra ${c.sampled}).\n\n| Campo | % docs | Tipos | Uso en código |\n|---|---|---|---|\n`;
    const rows = Object.entries(c.fields).sort((a, b) => b[1].n - a[1].n);
    for (const [k, f] of rows) {
      const used = usedInCode(k);
      if (!used) summary.push(`${c.label}.${k}`);
      md += `| \`${k}\`${Object.keys(f.sub).length ? ` (${Object.keys(f.sub).slice(0, 8).join(", ")})` : ""} | ${Math.round((f.n / Math.max(1, c.sampled)) * 100)}% | ${[...f.types].join(", ")} | ${used ? "sí" : "**no**"} |\n`;
    }
    md += "\n";
  }
  md = md.replace("\n\n## ", `\n\n## Candidatos a eliminar (${summary.length})\n\n${summary.map((s) => `- \`${s}\``).join("\n") || "Ninguno."}\n\n## `);
  const dest = path.join(root, "docs/auditoria-bd.md");
  fs.writeFileSync(dest, md);
  console.log(`Listo: ${out.length} colecciones, ${summary.length} campos sin uso en código → ${dest}`);
  process.exit(0);
})().catch((e) => { console.error(e.message); process.exit(1); });
