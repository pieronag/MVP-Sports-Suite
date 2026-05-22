import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from './firebase';

export interface AuditEventParams {
    action: string;
    module: string;
    details: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    status: 'SUCCESS' | 'WARNING' | 'FAILED';
    actor?: string;
    role?: string;
    email?: string;
}

export const auditService = {
    logAuditEvent: async (params: AuditEventParams) => {
        try {
            // Generar trace ID: TRC-XXXXXX
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let traceId = 'TRC-';
            for (let i = 0; i < 6; i++) {
                traceId += chars.charAt(Math.floor(Math.random() * chars.length));
            }

            // Obtener IP y Ubicación del cliente
            let ip = '127.0.0.1';
            let location = 'Chile';
            try {
                const response = await fetch('https://ipapi.co/json/');
                if (response.ok) {
                    const data = await response.json();
                    ip = data.ip || '127.0.0.1';
                    location = data.city ? `${data.city}, ${data.country_name || 'Chile'}` : (data.country_name || 'Chile');
                }
            } catch (e) {
                console.warn('Could not fetch client IP details from ipapi.co:', e);
            }

            // Formatear fecha y hora para la zona horaria chilena (es-CL)
            const now = new Date();
            const dateStr = now.toLocaleDateString('es-CL', {
                timeZone: 'America/Santiago',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
            const timeStr = now.toLocaleTimeString('es-CL', {
                timeZone: 'America/Santiago',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            });

            // Resolver actor, rol y email si no vienen provistos
            const currentUser = auth?.currentUser;
            const actor = params.actor || currentUser?.displayName || currentUser?.email || 'Sistema';
            const role = params.role || 'user';
            const email = params.email || currentUser?.email || 'sistema@mvpsports.cl';

            await addDoc(collection(db, 'audit'), {
                traceId,
                action: params.action,
                module: params.module,
                details: params.details,
                severity: params.severity,
                status: params.status,
                actor,
                role,
                email,
                ip,
                location,
                device: 'Web Console',
                dateStr,
                timeStr,
                timestamp: serverTimestamp()
            });
        } catch (error) {
            console.error('Error logging audit event on web:', error);
        }
    }
};
