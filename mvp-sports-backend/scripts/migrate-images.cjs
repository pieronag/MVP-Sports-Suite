// Fotos en base64 dentro de los documentos → colección `images` (idempotente).
// Algunas pantallas antiguas guardaban la imagen completa en el documento (portada y galería del recinto, foto de perfil,
// escudo del equipo). Eso infla cada lectura y acerca los documentos al límite de 1 MB. Este script mueve cada imagen a
// su propio documento en `images` (igual que /api/images de la app) y deja en el campo solo la URL /api/images/<id>.
// Por defecto SOLO SIMULA; con --apply mueve y escribe. Antes de aplicar, respaldo con backup.cjs.
// Uso (desde la raíz del repositorio): node mvp-sports-backend/scripts/migrate-images.cjs [--apply]
const path = require('path');
const root = path.resolve(__dirname, '../..');
const req = require('module').createRequire(path.join(root, 'mvp-sports-web/package.json'));
const { initializeApp, cert } = req('firebase-admin/app');
const { getFirestore, FieldValue } = req('firebase-admin/firestore');
initializeApp({ credential: cert(require(path.join(root, 'mvp-sports-web/firebase-service-account.json'))) });
const db = getFirestore();
const MAX = 700 * 1024; // como utils/images.ts
const APPLY = process.argv.includes('--apply');

// colección → carpeta y quién es el dueño de la imagen
const TARGETS = {
  tenants: { folder: 'venues', owner: (id, d) => (d.ownerIds || [])[0] || d.ownerId || 'system' },
  users: { folder: 'avatars', owner: (id) => id },
  teams: { folder: 'teams', owner: (id, d) => d.captainId || d.ownerId || d.createdBy || 'system' },
  courts: { folder: 'courts', owner: () => 'system' },
  tournaments: { folder: 'tournaments', owner: () => 'system' },
};

const parseDataUrl = (s) => {
  const m = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i.exec(s);
  return m ? { type: m[1].toLowerCase(), buf: Buffer.from(m[2], 'base64') } : null;
};
// Id estable por campo: volver a correr el script no duplica imágenes
const idFor = (col, docId, field, i) => `mig-${col}-${docId}-${field}${i === null ? '' : `-${i}`}`.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 128);

async function store(id, owner, folder, { type, buf }) {
  await db.collection('images').doc(id).set({ owner, folder, type: type === 'image/jpg' ? 'image/jpeg' : type, size: buf.length, data: buf, createdAt: FieldValue.serverTimestamp(), migrated: true });
  return `/api/images/${id}`;
}

(async () => {
  let found = 0, kb = 0;
  for (const [col, cfg] of Object.entries(TARGETS)) {
    for (const d of (await db.collection(col).get()).docs) {
      const data = d.data();
      const update = {};
      // Campos de primer nivel con imagen y arreglos de imágenes (galería)
      for (const [field, value] of Object.entries(data)) {
        const list = Array.isArray(value) ? value : [value];
        if (!list.some((v) => typeof v === 'string' && v.startsWith('data:image'))) continue;
        const out = [];
        for (const [i, v] of list.entries()) {
          const img = typeof v === 'string' && v.startsWith('data:image') ? parseDataUrl(v) : null;
          if (!img) { out.push(v); continue; }
          found++; kb += Math.round(v.length / 1024);
          const id = idFor(col, d.id, field, Array.isArray(value) ? i : null);
          if (img.buf.length > MAX) { console.log(`! ${col}/${d.id.slice(0, 6)}… ${field} pesa ${Math.round(img.buf.length / 1024)} KB: se deja como está`); out.push(v); continue; }
          console.log(`${APPLY ? '→' : '·'} ${col}/${d.id.slice(0, 6)}… ${field}${Array.isArray(value) ? `[${i}]` : ''} ${Math.round(img.buf.length / 1024)} KB → /api/images/${id.slice(0, 18)}…`);
          out.push(APPLY ? await store(id, cfg.owner(d.id, data), cfg.folder, img) : '(url)');
        }
        update[field] = Array.isArray(value) ? out : out[0];
      }
      if (APPLY && Object.keys(update).length) await d.ref.update(update);
    }
  }
  console.log(`\n${found} imagen(es), ${kb} KB en base64 ${APPLY ? 'movidas a la colección images' : 'por mover (simulación; usa --apply)'}.`);
})().catch((e) => { console.error(e.message); process.exit(1); });
