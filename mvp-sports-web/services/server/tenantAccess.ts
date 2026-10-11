import "server-only";
import { adminDb } from "./firebase-admin";

const STAFF_ROLES = ["staff", "manager", "owner", "admin", "superadmin"];

// Misma regla que worksAtTenant() en firestore.rules: administrador, o personal asignado al recinto o dueño de él
export async function worksAtTenant(uid: string, tenantId: string): Promise<boolean> {
  if (!tenantId) return false;
  const db = adminDb();
  const [u, t] = await Promise.all([db.collection("users").doc(uid).get(), db.collection("tenants").doc(tenantId).get()]);
  const user = u.data() || {};
  const role = String(user.role || "").toLowerCase();
  if (role === "admin" || role === "superadmin") return true;
  if (!STAFF_ROLES.includes(role)) return false;
  // Personal suspendido no opera aunque conserve una sesión abierta
  if (String(user.status || "").toLowerCase() === "inactive") return false;
  const tenant = t.data() || {};
  return user.tenantId === tenantId || (user.tenantIds || []).includes(tenantId) || tenant.ownerId === uid || (tenant.ownerIds || []).includes(uid);
}
