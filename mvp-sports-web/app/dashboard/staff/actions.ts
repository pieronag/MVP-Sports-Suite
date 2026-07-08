"use server";
import { adminAuth as getAdminAuth } from "@/services/firebase-admin";

/**
 * Actualiza la contraseña de un miembro del staff desde el servidor
 * @param uid UID del usuario en Firebase Auth
 * @param newPassword Nueva contraseña
 */
export async function updateStaffPassword(uid: string, newPassword: string) {
    try {
        if (!uid || !newPassword) {
            return { success: false, error: "UID y contraseña son obligatorios" };
        }
        
        if (newPassword.length < 6) {
            return { success: false, error: "La contraseña debe tener al menos 6 caracteres" };
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
