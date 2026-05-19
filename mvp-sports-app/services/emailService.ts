import { auth } from './firebase';
import { sendEmailVerification, sendPasswordResetEmail } from 'firebase/auth';

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL || 'https://mvp-sports-chile.vercel.app';

export const emailService = {
  /**
   * Envía un correo electrónico personalizado (activación o restablecimiento)
   * a través del backend unificado de Next.js, con fallback al SDK local de Firebase
   * en caso de fallo o configuración incompleta.
   */
  async sendAuthEmail(email: string, type: 'verify' | 'reset', displayName?: string): Promise<{ success: boolean; method: 'custom' | 'fallback' }> {
    const cleanEmail = email.trim().toLowerCase();
    
    try {
      console.log(`[EmailService] Intentando enviar correo de tipo: ${type} a ${cleanEmail} usando API personalizada...`);
      
      const response = await fetch(`${WEB_URL}/api/send-auth-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: cleanEmail,
          type,
          name: displayName
        }),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        console.log(`[EmailService] Correo enviado exitosamente vía API personalizada. Método: ${data.actionLink ? 'Mock (Log)' : 'Resend'}`);
        return { success: true, method: 'custom' };
      } else {
        throw new Error(data.error || 'Respuesta no exitosa del servidor.');
      }
    } catch (error: any) {
      console.warn('[EmailService] API personalizada falló, aplicando fallback a Firebase Auth nativo:', error.message || error);
      
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
