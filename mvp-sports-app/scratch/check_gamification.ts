import { db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';

async function checkGamification() {
    const snap = await getDoc(doc(db, 'settings', 'gamification'));
    if (snap.exists()) {
        console.log("GAMIFICATION DATA:", JSON.stringify(snap.data(), null, 2));
    } else {
        console.log("No existe el documento settings/gamification");
    }
}

checkGamification();
