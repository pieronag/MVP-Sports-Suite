import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, type User } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/services/client/firebase";

// Perfil mínimo de un jugador nuevo. Teléfono, RUT y fecha de nacimiento se piden antes del primer pago.
export function newPlayerDoc(user: Pick<User, "uid" | "email" | "displayName" | "photoURL">, displayName?: string) {
  return {
    uid: user.uid,
    email: user.email || "",
    displayName: displayName || user.displayName || "",
    photoURL: user.photoURL || "",
    role: "player",
    status: "active",
    createdAt: new Date().toISOString(),
    xp: 0,
    level: 1,
    tier: "BRONCE",
    ovr: 40,
    badges: [],
    stats: { played: 0, won: 0, lost: 0, goals: 0, assists: 0, mvp: 0 },
  };
}

// Crea el documento del jugador si aún no existe (primer ingreso con Google o tras un registro interrumpido).
export async function ensurePlayerDoc(user: User): Promise<any | null> {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data();
  const legacy = await getDoc(doc(db, "profiles", user.uid));
  if (legacy.exists()) return legacy.data();
  const data = newPlayerDoc(user);
  await setDoc(ref, data);
  return data;
}

export async function signInWithGoogle(): Promise<void> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  try {
    const { user } = await signInWithPopup(auth, provider);
    await ensurePlayerDoc(user);
  } catch (e: any) {
    // En apps instaladas (PWA) o navegadores que bloquean ventanas emergentes se usa redirección;
    // AuthContext crea el perfil al volver.
    if (["auth/popup-blocked", "auth/operation-not-supported-in-this-environment", "auth/cancelled-popup-request"].includes(e?.code)) {
      await signInWithRedirect(auth, provider);
      return;
    }
    throw e;
  }
}

// Datos obligatorios para pagar: Mercado Pago pide RUT y el recinto necesita un teléfono de contacto.
export function missingForPayment(profile: any): string[] {
  const missing: string[] = [];
  if (!String(profile?.displayName || profile?.fullName || "").trim()) missing.push("nombre");
  if (String(profile?.phone || "").replace(/\D/g, "").length < 11) missing.push("teléfono");
  if (String(profile?.rut || "").replace(/[^0-9kK]/g, "").length < 8) missing.push("RUT");
  if (!profile?.birthDate) missing.push("fecha de nacimiento");
  return missing;
}
