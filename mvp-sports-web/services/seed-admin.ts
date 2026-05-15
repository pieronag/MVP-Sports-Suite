import { db } from './firebase';
import { collection, query, where, getDocs, updateDoc, doc, setDoc } from 'firebase/firestore';

async function seedSuperAdmin() {
    const targetEmail = 'piero.abarca@gmail.com'; // Ajustado a patrón común o el que uses
    console.log(`🚀 Iniciando Script de Elevación para: ${targetEmail}`);

    try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', targetEmail));
        const snap = await getDocs(q);

        if (snap.empty) {
            console.log("⚠️ Usuario no encontrado. Creando perfil de Superadmin de emergencia...");
            const newAdminRef = doc(usersRef, "emergency_superadmin");
            await setDoc(newAdminRef, {
                email: targetEmail,
                fullName: "Piero Abarca",
                role: "superadmin",
                status: "active",
                createdAt: new Date()
            });
            console.log("✅ Perfil de emergencia CREADO como SUPERADMIN.");
        } else {
            const userDoc = snap.docs[0];
            await updateDoc(userDoc.ref, { role: 'superadmin' });
            console.log("✅ Usuario existente PROMOVIDO a SUPERADMIN correctamente.");
        }

        console.log("⚙️ Sincronizando configuración base...");
        const settingsRef = doc(db, 'settings', 'global');
        await setDoc(settingsRef, {
            platformName: 'MVP Sports',
            maintenanceMode: false,
            updatedAt: new Date()
        }, { merge: true });

        console.log("🎉 PROCESO COMPLETADO EXITO");
    } catch (e) {
        console.error("❌ ERROR EN SEED:", e);
    }
}

seedSuperAdmin();
