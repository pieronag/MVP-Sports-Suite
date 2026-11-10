import fs from "fs";
import path from "path";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Utilidades compartidas de las pruebas de punta a punta con cuentas de prueba (@example.test).
// Las cuentas y recintos de prueba se crean y borran con el script de datos de prueba; sin .env.local
// ni cuenta de servicio, las pruebas que los necesitan se omiten.
const root = path.resolve(__dirname, "../..");

export const env: Record<string, string> = {};
try {
  for (const line of fs.readFileSync(path.join(root, ".env.local"), "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)="?(.*?)"?$/);
    if (m) env[m[1]] = m[2];
  }
} catch { /* sin .env.local */ }

export const saPath = path.join(root, "firebase-service-account.json");
export const hasServiceAccount = fs.existsSync(saPath);

// Acceso de administración (firebase-admin 14: solo API modular)
export const admin = () => {
  if (!getApps().length) initializeApp({ credential: cert(JSON.parse(fs.readFileSync(saPath, "utf8"))) });
  return { auth: () => getAuth(), firestore: () => getFirestore() };
};

export const exists = async (email?: string) =>
  !!email && hasServiceAccount && admin().auth().getUserByEmail(email).then(() => true, () => false);

// Token de sesión real de una cuenta de prueba (API REST de Firebase Auth)
export async function idToken(email: string, password: string): Promise<string> {
  const key = env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${key}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const data = await res.json();
  if (!data.idToken) throw new Error(`No se pudo iniciar sesión con ${email}: ${data.error?.message}`);
  return data.idToken;
}
