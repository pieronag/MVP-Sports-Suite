import "server-only";
import { adminAuth as getAdminAuth, adminDb } from "./firebase-admin";

const SUPER_ADMIN_ROLES = ["admin", "superadmin"];
const MANAGER_ROLES = ["manager", "owner", "admin", "superadmin"];
const OWNER_ROLES = ["owner", "admin", "superadmin"];

export interface AuthedCaller {
  uid: string;
  email: string;
  role: string | null;
}

/**
 * Verifica el ID token de Firebase enviado como `Authorization: Bearer <token>`.
 * Devuelve el caller autenticado o null si no es válido.
 */
export async function verifyAuthedCaller(request: Request): Promise<AuthedCaller | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.split("Bearer ")[1];
  if (!token) return null;

  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    return {
      uid: decoded.uid,
      email: decoded.email || "",
      role: null,
    };
  } catch {
    return null;
  }
}

/**
 * Lee el rol real del usuario desde Firestore (fuente de verdad) en minúsculas.
 * El custom claim del token se usa solo como respaldo.
 */
export async function getUserRole(uid: string): Promise<string | null> {
  try {
    const userDoc = await adminDb().collection("users").doc(uid).get();
    if (userDoc.exists) {
      const role = userDoc.data()?.role;
      if (role && typeof role === "string") return role.trim().toLowerCase();
    }
    const profileDoc = await adminDb().collection("profiles").doc(uid).get();
    if (profileDoc.exists) {
      const role = profileDoc.data()?.role;
      if (role && typeof role === "string") return role.trim().toLowerCase();
    }
    const staffDoc = await adminDb().collection("staff").doc(uid).get();
    if (staffDoc.exists) {
      const role = staffDoc.data()?.role;
      if (role && typeof role === "string") return role.trim().toLowerCase();
    }
  } catch (e) {
    console.error("getUserRole error:", e);
  }
  return null;
}

/**
 * Verifica que el caller tenga un rol admin (admin/superadmin) según Firestore.
 */
export async function isSuperAdminCaller(request: Request): Promise<AuthedCaller | null> {
  const caller = await verifyAuthedCaller(request);
  if (!caller) return null;
  const role = await getUserRole(caller.uid);
  if (!role || !SUPER_ADMIN_ROLES.includes(role)) return null;
  return { ...caller, role };
}

/**
 * Verifica que el caller tenga un rol de gestión (owner/manager/admin/superadmin).
 */
export async function isManagerCaller(request: Request): Promise<AuthedCaller | null> {
  const caller = await verifyAuthedCaller(request);
  if (!caller) return null;
  const role = await getUserRole(caller.uid);
  if (!role || !MANAGER_ROLES.includes(role)) return null;
  return { ...caller, role };
}

export { SUPER_ADMIN_ROLES, MANAGER_ROLES, OWNER_ROLES };
