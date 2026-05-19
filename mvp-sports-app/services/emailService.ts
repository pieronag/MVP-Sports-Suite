import { auth, functions } from './firebase';
import { httpsCallable } from 'firebase/functions';
import { sendEmailVerification, sendPasswordResetEmail } from 'firebase/auth';

export const emailService = {
  /**
   * Envía un correo electrónico personalizado (activación o restablecimiento)
   * a través de la Cloud Function unificada, con fallback al SDK nativo de Firebase
   * en caso de fallo, depuración o falta de conexión.
   */
  async sendAuthEmail(
    email: string,
    type: 'verify' | 'reset',
    displayName?: string
  ): Promise<{ success: boolean; method: 'custom' | 'fallback' }> {
    const cleanEmail = email.trim().toLowerCase();
    
    try {
      console.log(`[EmailService] Intentando enviar correo de tipo: ${type} a ${cleanEmail} usando Cloud Function...`);
      
      const sendEmailFn = httpsCallable(functions, 'sendAuthEmail');
      const response = await sendEmailFn({
        email: cleanEmail,
        type,
        name: displayName
      });

      const data = response.data as any;
      
      if (data && data.success) {
        console.log(`[EmailService] Correo enviado exitosamente vía Cloud Function. Método: ${data.method}`);
        return { success: true, method: 'custom' };
      } else {
        throw new Error((data && data.error) || 'Respuesta no exitosa de la Cloud Function.');
      }
    } catch (error: any) {
      console.warn('[EmailService] La Cloud Function falló o no está desplegada. Aplicando fallback a Firebase Auth nativo:', error.message || error);
      
      // Fallback a los correos nativos de Firebase Auth
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
