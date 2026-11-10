// Migración del modelo de datos v2 → v3 (en el lugar, idempotente).
// Por defecto SOLO SIMULA y muestra cada cambio; con --apply escribe. Antes de aplicar, respaldo con backup.cjs.
// Uso (desde la raíz del repositorio): node mvp-sports-backend/scripts/migrate-v3.cjs [--apply]
//
// Qué ordena (ver docs/modelo-datos.md):
//  users        · crea el perfil de jugador de las cuentas que no lo tienen; borra perfiles sin cuenta de prueba (@example.test)
//               · quita campos que ya nadie usa (billetera antigua, ELO, sincronizaciones viejas, copia de emailVerified)
//               · altura, peso y nivel como número; updatedAt como fecha; uid y createdAt siempre presentes
//  users/*      · borra tarjetas de Transbank (tokens) y transacciones de la billetera antigua: ya no se usan
//  public_profiles · se borra (los perfiles públicos salen de /api/public-profiles)
//  rate_limits  · borra contadores de más de 24 h
//  bookings     · un solo monto: totalPrice (se migra desde price/finalPrice); sin couponCode vacío
//  court_slots  · tenantId desde la cancha cuando falta
//  courts, payments · sin campos en null (null y ausente significan lo mismo)
//  settings/schema · version = 3
const path = require('path');
const root = path.resolve(__dirname, '../..');
const req = require('module').createRequire(path.join(root, 'mvp-sports-web/package.json'));
const { initializeApp, cert } = req('firebase-admin/app');
const { getFirestore, FieldValue, Timestamp } = req('firebase-admin/firestore');
const { getAuth } = req('firebase-admin/auth');
initializeApp({ credential: cert(require(path.join(root, 'mvp-sports-web/firebase-service-account.json'))) });
const db = getFirestore(); const auth = getAuth();
const APPLY = process.argv.includes('--apply');
const DEL = FieldValue.delete();

const ops = []; // { path, kind: 'set'|'update'|'delete', data, why }
const plan = (path, kind, data, why) => ops.push({ path, kind, data, why });

const USER_UNUSED = ['walletBalance', 'walletUpdatedAt', 'sportRatings', 'readReceipts', 'lastELOUpdate', 'privacyMode', 'totalXp', 'lastSync', 'paymentHistory', 'emailVerified'];
const num = (v) => { const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.')); return Number.isFinite(n) ? n : null; };

(async () => {
  // ---------- users ----------
  const users = await db.collection('users').get();
  const authUsers = []; let page;
  do { const r = await auth.listUsers(1000, page); authUsers.push(...r.users); page = r.pageToken; } while (page);
  const authById = new Map(authUsers.map((u) => [u.uid, u]));
  const withDoc = new Set(users.docs.map((d) => d.id));

  for (const u of authUsers) {
    if (withDoc.has(u.uid)) continue;
    plan(`users/${u.uid}`, 'set', {
      uid: u.uid, email: (u.email || '').toLowerCase(), displayName: u.displayName || (u.email || 'Jugador').split('@')[0],
      role: 'player', status: u.disabled ? 'disabled' : 'active', xp: 0, ovr: 40, tier: 'Bronce', badges: [], stats: {},
      createdAt: Timestamp.fromDate(new Date(u.metadata.creationTime)),
    }, `cuenta sin perfil (${u.email})`);
  }
  for (const d of users.docs) {
    const x = d.data(); const p = `users/${d.id}`;
    if (!authById.has(d.id)) {
      if (String(x.email || '').endsWith('@example.test')) plan(p, 'delete', null, `perfil de prueba sin cuenta (${x.email})`);
      else console.log(`  ⚠ perfil sin cuenta de acceso (se conserva, revisar a mano): ${p} ${x.email || ''}`);
      continue;
    }
    const up = {};
    for (const f of USER_UNUSED) if (f in x) up[f] = DEL;
    for (const f of ['height', 'weight', 'level']) if (f in x && typeof x[f] !== 'number') { const n = num(x[f]); up[f] = n === null ? DEL : n; }
    if (typeof x.updatedAt === 'string') { const t = new Date(x.updatedAt); up.updatedAt = isNaN(t) ? DEL : Timestamp.fromDate(t); }
    if (!x.uid) up.uid = d.id;
    if (!x.createdAt) up.createdAt = Timestamp.fromDate(new Date(authById.get(d.id).metadata.creationTime));
    if (Object.keys(up).length) plan(p, 'update', up, Object.keys(up).join(', '));
    for (const sub of ['cards', 'transactions']) {
      for (const s of (await d.ref.collection(sub).get()).docs) plan(s.ref.path, 'delete', null, sub === 'cards' ? 'tarjeta de Transbank (sistema retirado)' : 'transacción de la billetera antigua');
    }
  }

  // ---------- colecciones sin uso ----------
  for (const d of (await db.collection('public_profiles').get()).docs) plan(d.ref.path, 'delete', null, 'copia antigua de perfil público');
  const dayAgo = Date.now() - 86_400_000;
  for (const d of (await db.collection('rate_limits').get()).docs) {
    const x = d.data(); const t = typeof x.updatedAt === 'number' ? x.updatedAt : x.createdAt?.toMillis?.() ?? 0;
    if (t < dayAgo) plan(d.ref.path, 'delete', null, 'contador vencido');
  }

  // ---------- bookings ----------
  for (const d of (await db.collection('bookings').get()).docs) {
    const x = d.data(); const up = {};
    if (x.totalPrice === undefined && (x.price !== undefined || x.finalPrice !== undefined)) up.totalPrice = Number(x.price ?? x.finalPrice) || 0;
    if ('price' in x) up.price = DEL;
    if ('finalPrice' in x) up.finalPrice = DEL;
    if ('couponCode' in x && !x.couponCode) up.couponCode = DEL;
    if (Object.keys(up).length) plan(d.ref.path, 'update', up, Object.keys(up).join(', '));
  }

  // ---------- court_slots ----------
  const courts = await db.collection('courts').get();
  const courtTenant = new Map(courts.docs.map((c) => [c.id, c.data().tenantId]));
  for (const d of (await db.collection('court_slots').get()).docs) {
    const x = d.data();
    if (!x.tenantId && courtTenant.get(x.courtId)) plan(d.ref.path, 'update', { tenantId: courtTenant.get(x.courtId) }, 'tenantId desde la cancha');
  }

  // ---------- campos en null ----------
  for (const [col, fields] of [['courts', ['maintenanceStart', 'maintenanceUntil']], ['payments', ['pendingRegistration', 'pendingEnrollment', 'returnUrl', 'pendingBookingData', 'bookingId']]]) {
    for (const d of (await db.collection(col).get()).docs) {
      const x = d.data(); const up = {};
      for (const f of fields) if (f in x && x[f] === null) up[f] = DEL;
      if (Object.keys(up).length) plan(d.ref.path, 'update', up, `sin null: ${Object.keys(up).join(', ')}`);
    }
  }

  // ---------- versión ----------
  const schema = (await db.doc('settings/schema').get()).data() || {};
  if (schema.version !== 3) plan('settings/schema', 'set', { version: 3, migratedAt: Timestamp.now() }, 'versión del modelo');

  // ---------- resumen ----------
  const byWhy = {};
  for (const o of ops) { const k = `${o.path.split('/')[0]}${o.path.split('/').length > 2 ? '/*/' + o.path.split('/')[2] : ''} · ${o.kind}`; byWhy[k] = (byWhy[k] || 0) + 1; }
  console.log(`\n${APPLY ? 'APLICANDO' : 'SIMULACIÓN (sin escribir)'} · ${ops.length} cambios`);
  for (const [k, n] of Object.entries(byWhy)) console.log(`  ${k}: ${n}`);
  if (!APPLY) { for (const o of ops) console.log(`   - ${o.kind.padEnd(6)} ${o.path} · ${o.why}`); return process.exit(0); }

  for (let i = 0; i < ops.length; i += 400) {
    const batch = db.batch();
    for (const o of ops.slice(i, i + 400)) {
      const ref = db.doc(o.path);
      if (o.kind === 'delete') batch.delete(ref);
      else if (o.kind === 'set') batch.set(ref, o.data, { merge: true });
      else batch.update(ref, o.data);
    }
    await batch.commit();
  }
  console.log('Listo.');
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
