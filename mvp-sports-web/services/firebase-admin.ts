import "server-only";
import admin from 'firebase-admin';

function ensureAdmin() {
  if (!admin.apps.length) {
    // Parser robusto: tolera espacios alrededor del "=", comillas simples/dobles
    // envolventes (incluso repetidas) y saltos de línea escapados como \\n.
    const cleanVar = (v: string | undefined) => {
      if (!v) return '';
      let s = v.trim();
      while ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
        s = s.slice(1, -1).trim();
      }
      s = s.replace(/^["']+|["']+$/g, '').trim();
      return s.split('\\n').join('\n').trim();
    };

    const rawKey = process.env.FIREBASE_PRIVATE_KEY || '';
    const privateKey = cleanVar(rawKey);
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