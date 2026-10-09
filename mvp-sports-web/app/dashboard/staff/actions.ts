"use server";
import { adminAuth as getAdminAuth, adminDb } from "@/services/firebase-admin";

/**
 * Verifica la identidad y el rol del llamador de la server action.
 * Solo owner/manager/admin/superadmin pueden gestionar staff.
 */
async function isAuthorizedManager(idToken: string): Promise<string | null> {
  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    const uid = decoded.uid;

    const userDoc = await adminDb().collection("users").doc(uid).get();
    let role: string | null = null;
    if (userDoc.exists) {
      const r = userDoc.data()?.role;
      if (r && typeof r === "string") role = r.trim().toLowerCase();
    }
    if (!role) {
      const profileDoc = await adminDb().collection("profiles").doc(uid).get();
      if (profileDoc.exists) {
        const r = profileDoc.data()?.role;
        if (r && typeof r === "string") role = r.trim().toLowerCase();
      }
    }

    const allowed = ["manager", "owner", "admin", "superadmin"];
    return role && allowed.includes(role) ? uid : null;
  } catch (error) {
    console.error("Error verificando autorización de staff:", error);
    return null;
  }
}

/**
 * El objetivo debe ser personal (manager/staff) de un recinto que el llamador
 * gestiona. Superadmin puede todo. Evita que un manager tome cuentas ajenas.
 */
async function canManageStaffMember(callerUid: string, targetUid: string): Promise<boolean> {
    const db = adminDb();
    const [callerDoc, targetDoc] = await Promise.all([
        db.collection("users").doc(callerUid).get(),
        db.collection("users").doc(targetUid).get(),
    ]);
    const callerRole = String(callerDoc.data()?.role || "").toLowerCase();
    if (["admin", "superadmin"].includes(callerRole)) return true;

    const target = targetDoc.data();
    if (!target || !["manager", "staff"].includes(String(target.role || "").toLowerCase())) return false;
    const targetTenants: string[] = target.tenantIds || (target.tenantId ? [target.tenantId] : []);
    if (!targetTenants.length) return false;

    // Recintos del llamador: asignados o de los que es dueño
    const callerTenants = new Set<string>(callerDoc.data()?.tenantIds || (callerDoc.data()?.tenantId ? [callerDoc.data()?.tenantId] : []));
    const owned = await db.collection("tenants").where("ownerId", "==", callerUid).get();
    owned.docs.forEach((d) => callerTenants.add(d.id));
    const ownedMulti = await db.collection("tenants").where("ownerIds", "array-contains", callerUid).get();
    ownedMulti.docs.forEach((d) => callerTenants.add(d.id));
    // Un manager solo gestiona staff; un owner también a sus managers
    if (callerRole === "manager" && String(target.role).toLowerCase() !== "staff") return false;
    return targetTenants.some((t) => callerTenants.has(t));
}

/**
 * Actualiza la contraseña de un miembro del staff desde el servidor.
 * Requiere un ID token válido de un usuario con rol de gestión.
 * @param uid UID del usuario en Firebase Auth
 * @param newPassword Nueva contraseña
 * @param idToken ID token del usuario autenticado (obtenido con getIdToken())
 */
export async function updateStaffPassword(uid: string, newPassword: string, idToken: string) {
    try {
        if (!uid || !newPassword || !idToken) {
            return { success: false, error: "UID, contraseña y token son obligatorios" };
        }

        if (newPassword.length < 6) {
            return { success: false, error: "La contraseña debe tener al menos 6 caracteres" };
        }

        const authorizedUid = await isAuthorizedManager(idToken);
        if (!authorizedUid) {
            return { success: false, error: "No tienes permisos para realizar esta acción" };
        }

        if (!(await canManageStaffMember(authorizedUid, uid))) {
            return { success: false, error: "Solo puedes cambiar la contraseña de personal de tus recintos" };
        }

        await getAdminAuth().updateUser(uid, {
            password: newPassword,
        });

        console.log(`✅ Contraseña actualizada para el usuario: ${uid}`);
        return { success: true };
    } catch (error: any) {
        console.error("❌ Error al actualizar contraseña:", error);
        return { success: false, error: error.message || "Error interno del servidor" };
    }
}
