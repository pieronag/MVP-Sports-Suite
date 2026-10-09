import "server-only";
import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function ensureAdmin() {
  if (!getApps().length) {
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
        initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
      } catch (e) {
        console.error('❌ Firebase Admin init error:', e);
      }
    }
  }
  return getApp(); // sin credenciales lanza un error claro en la ruta que lo use
}

export function adminAuth() {
  return getAuth(ensureAdmin());
}

export function adminDb() {
  return getFirestore(ensureAdmin());
}