import "server-only";
import admin from 'firebase-admin';

function ensureAdmin() {
  if (!admin.apps.length) {
    const cleanVar = (v: string | undefined) => v?.replace(/^["']|["']$/g, '').trim() || '';

    const rawKey = process.env.FIREBASE_PRIVATE_KEY || '';
    const privateKey = cleanVar(rawKey).split('\\n').join('\n').trim();
    const clientEmail = cleanVar(process.env.FIREBASE_CLIENT_EMAIL);
    const projectId = cleanVar(process.env.FIREBASE_PROJECT_ID);

    if (privateKey && clientEmail && projectId) {
      try {
        admin.initializeApp({
          credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
        });
      } catch (e) {
        console.error('❌ Firebase Admin init error:', e);
      }
    }
  }
  return admin;
}

export function adminAuth() {
  return ensureAdmin().auth();
}

export function adminDb() {
  return ensureAdmin().firestore();
}