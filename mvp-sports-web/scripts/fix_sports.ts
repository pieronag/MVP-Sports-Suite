import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
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
    console.log("Buscando partidos sin deporte definido...");
    
    const bookingsSnap = await db.collection('bookings').get();
    
    if (bookingsSnap.empty) {
        console.log("No se encontraron reservas.");
        process.exit(0);
    }
    
    let updatedCount = 0;
    const batch = db.batch();
    
    for (const doc of bookingsSnap.docs) {
        const data = doc.data();
        if (!data.sport || data.sport === undefined || data.sport === 'undefined' || data.sport === '') {
            const fallbackSport = Math.random() > 0.5 ? 'futbol' : 'futbolito';
            batch.update(doc.ref, { sport: fallbackSport });
            updatedCount++;
        }
    }

    if (updatedCount > 0) {
        await batch.commit();
        console.log(`✅ ${updatedCount} partidos actualizados exitosamente a futbol o futbolito.`);
    } else {
        console.log("✅ Todos los partidos ya tienen un deporte asignado.");
    }
}

run().catch(console.error).finally(() => process.exit(0));
