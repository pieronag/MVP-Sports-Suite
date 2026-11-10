// Respaldo completo de Firestore (todas las colecciones y subcolecciones) y de las cuentas de Firebase Auth.
// Conserva los tipos (fechas, referencias, geopuntos) para poder restaurar exactamente.
// Uso (desde la raíz del repositorio): node mvp-sports-backend/scripts/backup.cjs
// Salida: docs/backups/<fecha>/firestore.json y auth.json (carpeta ignorada por git: contiene datos personales).
const path = require('path'); const fs = require('fs');
const root = path.resolve(__dirname, '../..');
const req = require('module').createRequire(path.join(root, 'mvp-sports-web/package.json'));
const { initializeApp, cert } = req('firebase-admin/app');
const { getFirestore, Timestamp, DocumentReference, GeoPoint } = req('firebase-admin/firestore');
const { getAuth } = req('firebase-admin/auth');
initializeApp({ credential: cert(require(path.join(root, 'mvp-sports-web/firebase-service-account.json'))) });
const db = getFirestore();

// Valores de Firestore a JSON con marcas de tipo
const enc = (v) => {
  if (v instanceof Timestamp) return { __t: 'ts', s: v.seconds, n: v.nanoseconds };
  if (v instanceof DocumentReference) return { __t: 'ref', p: v.path };
  if (v instanceof GeoPoint) return { __t: 'geo', lat: v.latitude, lng: v.longitude };
  if (Buffer.isBuffer(v) || v instanceof Uint8Array) return { __t: 'bytes', b64: Buffer.from(v).toString('base64') };
  if (Array.isArray(v)) return v.map(enc);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, enc(x)]));
  return v;
};

async function dumpCollection(ref, out) {
  const snap = await ref.get();
  for (const d of snap.docs) {
    out[d.ref.path] = enc(d.data());
    for (const sub of await d.ref.listCollections()) await dumpCollection(sub, out);
  }
  return snap.size;
}

(async () => {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const dir = path.join(root, 'docs/backups', stamp);
  fs.mkdirSync(dir, { recursive: true });
  const docs = {}; const counts = {};
  for (const c of await db.listCollections()) counts[c.id] = await dumpCollection(c, docs);
  fs.writeFileSync(path.join(dir, 'firestore.json'), JSON.stringify({ createdAt: new Date().toISOString(), counts, docs }));
  const users = []; let page;
  do { const r = await getAuth().listUsers(1000, page); users.push(...r.users.map((u) => u.toJSON())); page = r.pageToken; } while (page);
  fs.writeFileSync(path.join(dir, 'auth.json'), JSON.stringify({ createdAt: new Date().toISOString(), users }));
  console.log(`Respaldo en docs/backups/${stamp}`);
  console.log(`Firestore: ${Object.keys(docs).length} documentos ·`, Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(', '));
  console.log(`Auth: ${users.length} cuentas (${users.filter((u) => u.passwordHash).length} con hash de contraseña)`);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
