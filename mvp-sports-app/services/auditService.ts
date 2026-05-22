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
            // Generar trace ID: TRC-XXXXXX (alfanumérico)
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let traceId = 'TRC-';
            for (let i = 0; i < 6; i++) {
                traceId += chars.charAt(Math.floor(Math.random() * chars.length));
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
            const actor = params.actor || currentUser?.displayName || currentUser?.email || 'Jugador Móvil';
            const role = params.role || 'player';
            const email = params.email || currentUser?.email || 'app@mvpsports.cl';

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
                ip: 'IP Móvil',
                location: 'Conexión Móvil',
                device: 'Mobile App',
                dateStr,
                timeStr,
                timestamp: serverTimestamp()
            });
        } catch (error) {
            console.error('Error logging audit event on mobile:', error);
        }
    }
};
