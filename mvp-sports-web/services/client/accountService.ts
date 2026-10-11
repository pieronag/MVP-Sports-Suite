import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, type User } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/services/client/firebase";
import { newPlayerDoc } from "@/utils/playerProfile";

export { newPlayerDoc, missingForPayment } from "@/utils/playerProfile";

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
