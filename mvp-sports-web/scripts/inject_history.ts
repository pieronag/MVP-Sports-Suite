import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import * as fs from 'fs';

// Cargamos directamente el service account que el usuario tiene descargado
const serviceAccountPath = 'C:\\Users\\Piero\\Downloads\\mvp-sports-chile-firebase-adminsdk-fbsvc-f05f8527a7.json';
let serviceAccount;

try {
    serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
} catch (e) {
    console.error("No se pudo leer el archivo service account en: " + serviceAccountPath);
    process.exit(1);
}

if (!getApps().length) {
    initializeApp({
        credential: cert(serviceAccount),
    });
}

const db = getFirestore();

async function run() {
    console.log("Iniciando inyección de historial...");
    const targetEmail = 'piero.abarca@gmail.com';
    
    const usersSnapshot = await db.collection('users').where('email', '==', targetEmail).get();
    if (usersSnapshot.empty) {
        console.error(`Usuario con correo ${targetEmail} no encontrado.`);
        process.exit(1);
    }
    
    const userDoc = usersSnapshot.docs[0];
    const userId = userDoc.id;
    console.log(`Usuario encontrado: ${userId}`);

    const batch = db.batch();
    
    const now = new Date();
    const sports = ['futbol', 'futbolito', 'padel', 'tenis', 'basquetbol'];
    
    for (let i = 0; i < 15; i++) {
        // Distribute matches over the last 90 days
        const matchDate = new Date(now.getTime() - Math.floor(Math.random() * 90) * 24 * 60 * 60 * 1000);
        
        const isWin = Math.random() > 0.4; // 60% win rate
        const matchGoals = Math.floor(Math.random() * 4); // 0 to 3 goals per match
        const selectedSport = sports[Math.floor(Math.random() * sports.length)];

        const bookingRef = db.collection('bookings').doc();
        batch.set(bookingRef, {
            playerId: userId,
            tenantName: 'MVP Complex Central',
            status: 'completed', // completed matches
            checkIn: true,
            date: Timestamp.fromDate(matchDate),
            startTime: `${10 + Math.floor(Math.random() * 10)}:00`,
            isWin: isWin,
            goals: matchGoals,
            sport: selectedSport, // Multideporte
            createdAt: Timestamp.fromDate(matchDate)
        });
    }

    await batch.commit();
    console.log(`✅ Inyectados 15 partidos multideporte para ${targetEmail}`);
    console.log(`NOTA: Presiona el botón "Sincronizar" en el dashboard para recalcular las estadísticas e insignias según la nueva lógica multideporte.`);
}

run().catch(console.error).finally(() => process.exit(0));
