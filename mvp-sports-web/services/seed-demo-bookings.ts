// Script de seed para datos DEMO compartidos entre web y móvil.
// Ejecutar con:
//   npx ts-node services/seed-demo-bookings.ts
// Requiere que tengas configuradas las env FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY

import admin from 'firebase-admin';

if (!admin.apps.length) {
  console.log('ENV CHECK', {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    hasKey: !!process.env.FIREBASE_PRIVATE_KEY,
  });
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();
const auth = admin.auth();

async function main() {
  console.log('== MVP Sports DEMO seed ==');

  // 1) Crear jugador demo si no existe
  const demoEmail = 'player.demo@mvp-sports.cl';
  let playerUid: string;
  try {
    const existing = await auth.getUserByEmail(demoEmail);
    playerUid = existing.uid;
    console.log('Jugador demo ya existe:', playerUid);
  } catch {
    const user = await auth.createUser({
      email: demoEmail,
      emailVerified: true,
      password: 'Demo1234!',
      displayName: 'Jugador Demo',
    });
    playerUid = user.uid;
    console.log('Jugador demo creado:', playerUid);
  }

  // Perfil extendido
  const userRef = db.collection('users').doc(playerUid);
  await userRef.set(
    {
      uid: playerUid,
      email: demoEmail,
      displayName: 'Jugador Demo',
      role: 'player',
      createdAt: new Date().toISOString(),
      tier: 'PLATINO PRO',
      ovr: 87,
      xp: 4200,
      stats: {
        played: 24,
        won: 16,
        lost: 8,
        goals: 31,
        skill: 82,
        stamina: 78,
        power: 80,
        fairplay: 95,
      },
      form: ['W', 'W', 'L', 'W', 'W'],
    },
    { merge: true }
  );

  // 2) Crear tenant + canchas demo si no existen
  const tenantName = 'MVP Arena Ñuñoa';
  let tenantId: string;
  const tenantsSnap = await db
    .collection('tenants')
    .where('name', '==', tenantName)
    .limit(1)
    .get();
  if (!tenantsSnap.empty) {
    tenantId = tenantsSnap.docs[0].id;
    console.log('Tenant demo ya existe:', tenantId);
  } else {
    const tRef = await db.collection('tenants').add({
      name: tenantName,
      address: 'Av. Demo 123, Ñuñoa, Santiago',
      rating: 4.9,
      category: 'Fútbol 7',
      coordinates: new admin.firestore.GeoPoint(-33.4569, -70.6050),
      imageUrl: 'https://images.unsplash.com/photo-1595435064215-68d148332009',
      pricing: {
        futbol: {
          '18:00': 18000,
          '19:00': 20000,
          '20:00': 22000,
        },
      },
    });
    tenantId = tRef.id;
    console.log('Tenant demo creado:', tenantId);
  }

  // Crea 2 canchas para ese tenant
  const courtsSnap = await db.collection('courts').where('tenantId', '==', tenantId).get();
  if (courtsSnap.empty) {
    await db.collection('courts').add({
      tenantId,
      name: 'Cancha 1',
      sport: 'futbol',
    });
    await db.collection('courts').add({
      tenantId,
      name: 'Cancha 2',
      sport: 'futbol',
    });
    console.log('Canchas demo creadas');
  } else {
    console.log('Canchas demo ya existen');
  }

  const courtsAgain = await db.collection('courts').where('tenantId', '==', tenantId).get();
  const firstCourt = courtsAgain.docs[0];

  // 3) Crear algunas reservas demo para el jugador
  const today = new Date();
  const baseDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const sampleBookings = [
    { offsetDays: 0, hour: 18, status: 'confirmed', paymentStatus: 'pending' },
    { offsetDays: 0, hour: 20, status: 'confirmed', paymentStatus: 'paid' },
    { offsetDays: -3, hour: 19, status: 'completed', paymentStatus: 'paid' },
    { offsetDays: -7, hour: 21, status: 'cancelled', paymentStatus: 'pending' },
  ] as const;

  const bookingsRef = db.collection('bookings');

  for (const sample of sampleBookings) {
    const start = new Date(baseDay);
    start.setDate(start.getDate() + sample.offsetDays);
    start.setHours(sample.hour, 0, 0, 0);
    const end = new Date(start.getTime() + 60 * 60000);

    const q = await bookingsRef
      .where('tenantId', '==', tenantId)
      .where('playerId', '==', playerUid)
      .where('date', '==', admin.firestore.Timestamp.fromDate(start))
      .limit(1)
      .get();
    if (!q.empty) continue;

    await bookingsRef.add({
      tenantId,
      tenantName,
      courtId: firstCourt.id,
      courtName: firstCourt.data().name,
      sport: firstCourt.data().sport || 'futbol',
      clientName: 'JUGADOR DEMO',
      clientPhone: '+569 1234 5678',
      date: admin.firestore.Timestamp.fromDate(start),
      startTime: `${sample.hour.toString().padStart(2, '0')}:00`,
      endTime: `${(sample.hour + 1).toString().padStart(2, '0')}:00`,
      duration: 1,
      price: sample.paymentStatus === 'paid' ? 20000 : 18000,
      totalPrice: sample.paymentStatus === 'paid' ? 20000 : 18000,
      paymentStatus: sample.paymentStatus,
      status: sample.status,
      source: 'manual_dashboard',
      ownerId: null,
      createdAt: new Date(),
      createdBy: playerUid,
      playerId: playerUid,
      checkIn: sample.status === 'completed',
    });
  }

  console.log('Seed DEMO completado.');
}

main()
  .then(() => {
    console.log('OK');
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

