import "server-only"; // Protege este archivo de ser importado en el cliente
import admin from 'firebase-admin';

// Inicialización Singleton para evitar errores de "App already exists"
if (!admin.apps.length) {
  const cleanVar = (v: string | undefined) => v?.replace(/^["']|["']$/g, '').trim() || '';

  const rawKey = process.env.FIREBASE_PRIVATE_KEY || '';
  const privateKey = cleanVar(rawKey)
    .split('\\n').join('\n')
    .trim();
  const clientEmail = cleanVar(process.env.FIREBASE_CLIENT_EMAIL);
  const projectId = cleanVar(process.env.FIREBASE_PROJECT_ID);

  // LOG DE DIAGNÓSTICO (Solo en consola de servidor)
  console.log('--- [DEBUG] FIREBASE ADMIN INIT ---');
  console.log('Project:', projectId);
  console.log('Email:', clientEmail);
  console.log('Key Length:', privateKey?.length);
  console.log('Key Start:', privateKey?.substring(0, 30));
  console.log('Key End:', privateKey?.substring(privateKey.length - 30));

  if (privateKey && clientEmail && projectId) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      console.log('✅ Firebase Admin Inicializado');
    } catch (e) {
      console.error('❌ Error al inicializar Admin SDK:', e);
    }
  }
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();