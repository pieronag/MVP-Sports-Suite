import { auth } from '@/services/client/firebase';
import { postApi, ApiError } from '@/services/client/apiClient';
import { sendEmailVerification, sendPasswordResetEmail } from 'firebase/auth';

export const emailService = {
  async sendAuthEmail(
    email: string,
    type: 'verify' | 'reset',
    displayName?: string
  ): Promise<{ success: boolean; method: 'custom' | 'fallback' }> {
    const cleanEmail = email.trim().toLowerCase();

    try {
            const data: any = await postApi('/api/auth/email', { email: cleanEmail, type, name: displayName });

      if (data && data.success) {
        return { success: true, method: 'custom' };
      } else {
        throw new Error((data && data.error) || 'No se pudo enviar el correo.');
      }
    } catch (error: any) {
      // Respuestas del servidor (límite de intentos, sin permiso, datos inválidos): se respetan, sin reintentar por Firebase.
      // El correo nativo de Firebase es solo respaldo cuando nuestro envío falla (5xx o sin conexión).
      if (error instanceof ApiError && error.status < 500) throw error;
      console.warn('[EmailService] Envío propio no disponible; uso el correo nativo de Firebase Auth:', error.message || error);

      if (type === 'verify') {
        const currentUser = auth.currentUser;
        if (currentUser) {
          await sendEmailVerification(currentUser);
          return { success: true, method: 'fallback' };
        } else {
          throw new Error('No hay usuario autenticado en la sesión para enviar la verificación.');
        }
      } else if (type === 'reset') {
        await sendPasswordResetEmail(auth, cleanEmail);
        return { success: true, method: 'fallback' };
      }

      throw error;
    }
  }
};
