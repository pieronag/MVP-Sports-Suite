import { collection, query, where, getDocs, addDoc, Timestamp, doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { bookingSchema } from './schemas';
import { auditService } from './auditService';

export interface Booking {
    id?: string;
    tenantId: string;
    tenantName?: string;
    courtId: string;
    courtName?: string;
    sport?: string;
    clientName: string;
    clientPhone?: string;
    date: Timestamp;
    startTime: string; // "18:00"
    endTime: string;   // "19:00"
    duration?: number; // hours (web usa 1)
    price?: number; // web usa price + totalPrice
    totalPrice: number;
    status: 'pending' | 'confirmed' | 'cancelled' | 'active' | 'completed' | 'past' | 'no-show';
    paymentStatus: 'paid' | 'pending' | 'partial' | 'no-show' | 'refunded' | 'refund_failed';
    source: 'mobile_app' | 'manual_dashboard';
    ownerId?: string;
    createdAt?: Timestamp;
    userId: string;
    createdBy?: string;
    checkIn?: boolean;
    checkInTime?: Timestamp;
    checkOut?: boolean;
    checkOutTime?: Timestamp;
    rating?: number;
    feedback?: string;
    teamId?: string;
    deposit?: number;
    cancelledBy?: string;
    noShow?: boolean;
    notes?: string;
    paymentMethod?: string;
}

export const bookingService = {
    /**
     * Get available time slots for a given court on a specific date string (YYYY-MM-DD).
     */
    async getAvailableTimeSlots(tenantId: string, courtId: string, dateStr: string): Promise<string[]> {
        let slots: string[] = [];
        for (let i = 8; i < 24; i++) {
            slots.push(`${i.toString().padStart(2, '0')}:00`);
        }

        try {
            // 1. Cargar el recinto para obtener el horario operativo y schedule semanal
            const tenantDocRef = doc(db, 'tenants', tenantId);
            const tenantSnap = await getDoc(tenantDocRef);
            let openTime = '08:00';
            let closeTime = '23:00';
            let weeklySchedule: any = null;

            if (tenantSnap.exists()) {
                const tData = tenantSnap.data();
                if (tData.openTime) openTime = tData.openTime;
                if (tData.closeTime) closeTime = tData.closeTime;
                if (tData.schedule) weeklySchedule = tData.schedule;
            }

            // 2. Resolver el día de la semana y su configuración de horario específico
            const [y, m, d] = dateStr.split('-').map(Number);
            const bookingDate = new Date(y, m - 1, d);
            const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const dayName = daysOfWeek[bookingDate.getDay()];

            if (weeklySchedule && weeklySchedule[dayName]) {
                const dayConfig = weeklySchedule[dayName];
                if (dayConfig.isOpen === false) {
                    return []; // Cerrado este día
                }
                if (dayConfig.open) openTime = dayConfig.open;
                if (dayConfig.close) closeTime = dayConfig.close;
            }

            // 3. Generar slots dinámicos basados en la hora de apertura y cierre
            const dynamicSlots: string[] = [];
            let openHour = parseInt(openTime.split(':')[0]);
            if (isNaN(openHour)) openHour = 8;
            let closeHour = parseInt(closeTime.split(':')[0]);
            if (isNaN(closeHour)) closeHour = 23;

            if (closeHour < openHour) {
                closeHour += 24;
            }
            if (closeHour === 0 && closeTime !== '00:00') {
                closeHour = 24;
            }

            for (let i = openHour; i < closeHour; i++) {
                const hour = i % 24;
                dynamicSlots.push(`${hour.toString().padStart(2, '0')}:00`);
            }
            slots = dynamicSlots;

            const startOfDay = new Date(y, m - 1, d, 0, 0, 0);
            const endOfDay = new Date(y, m - 1, d, 23, 59, 59);

            const bookingsRef = collection(db, 'bookings');
            const qByDate = query(
                bookingsRef,
                where('tenantId', '==', tenantId),
                where('courtId', '==', courtId),
                where('date', '>=', Timestamp.fromDate(startOfDay)),
                where('date', '<=', Timestamp.fromDate(endOfDay))
            );

            const qByStartTime = query(
                bookingsRef,
                where('tenantId', '==', tenantId),
                where('courtId', '==', courtId),
                where('startTime', '>=', Timestamp.fromDate(startOfDay)),
                where('startTime', '<=', Timestamp.fromDate(endOfDay))
            );

            const [snapDate, snapStart] = await Promise.all([
                getDocs(qByDate).catch(() => ({ docs: [] as any[] })),
                getDocs(qByStartTime).catch(() => ({ docs: [] as any[] })),
            ]);

            const allDocsMap = new Map<string, any>();
            [...snapDate.docs, ...snapStart.docs].forEach((d) => {
                if (!allDocsMap.has(d.id)) allDocsMap.set(d.id, d);
            });

            const occupiedTimes = Array.from(allDocsMap.values())
                .map((d) => d.data() as any)
                .filter((b) => b.status !== 'cancelled')
                .map((b) => (typeof b.startTime === 'string' ? b.startTime : null))
                .filter(Boolean) as string[];

            return slots.filter((slot) => !occupiedTimes.includes(slot));
        } catch (error) {
            console.error('Error fetching available slots:', error);
            // Devolver slots por defecto en caso de error para no bloquear al usuario
            return slots;
        }
    },

    /**
     * Creates a new booking directly in the unified bookings collection
     */
    async createBooking(bookingData: Booking): Promise<string> {
        try {
            // Generate standard 6-digit alphanumeric code (excluding confusing characters)
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            let bookingId = '';
            for (let i = 0; i < 6; i++) {
                bookingId += chars.charAt(Math.floor(Math.random() * chars.length));
            }

            const cleanData = { ...bookingData, createdAt: Timestamp.now() };
            Object.keys(cleanData).forEach(key => (cleanData as any)[key] === undefined && delete (cleanData as any)[key]);

            const docRef = doc(db, 'bookings', bookingId);
            await setDoc(docRef, cleanData);

            await auditService.logAuditEvent({
                action: 'RESERVA_CREAR_MOVIL',
                module: 'Reservas/Móvil',
                details: `Reserva creada exitosamente desde app móvil. Código: ${bookingId}, Cancha: ${bookingData.courtName || bookingData.courtId}, Recinto ID: ${bookingData.tenantId}. Total: ${bookingData.totalPrice}.`,
                severity: 'LOW',
                status: 'SUCCESS'
            });

            return bookingId;
        } catch (error: any) {
            console.error('Error creating booking:', error);
            await auditService.logAuditEvent({
                action: 'RESERVA_CREAR_MOVIL',
                module: 'Reservas/Móvil',
                details: `Falla al crear reserva desde app móvil. Cancha: ${bookingData.courtName || bookingData.courtId}. Error: ${error.message || error}`,
                severity: 'LOW',
                status: 'FAILED'
            });
            throw new Error('No se pudo crear la reserva.');
        }
    },

    async getBooking(bookingId: string): Promise<Booking | null> {
        try {
            const ref = doc(db, 'bookings', bookingId);
            const snap = await getDoc(ref);
            if (!snap.exists()) return null;
            const raw = snap.data() as any;
            const parsed = bookingSchema.safeParse(raw);
            if (!parsed.success) {
                console.warn('Invalid booking doc:', parsed.error.flatten().fieldErrors);
                return { id: snap.id, ...raw } as Booking;
            }
            return { id: snap.id, ...(parsed.data as any) } as Booking;
        } catch (error) {
            console.error('Error fetching booking:', error);
            return null;
        }
    },

    async updateBooking(bookingId: string, data: Partial<Booking>): Promise<void> {
        const ref = doc(db, 'bookings', bookingId);
        const cleanData = { ...data };
        Object.keys(cleanData).forEach(key => (cleanData as any)[key] === undefined && delete (cleanData as any)[key]);
        await updateDoc(ref, cleanData as any);
    },

    async cancelBooking(params: { bookingId: string; cancelledBy: string }) {
        try {
            await bookingService.updateBooking(params.bookingId, {
                status: 'cancelled',
                // campos extra compatibles con web (no rompe si no existen en schema)
                cancelledAt: Timestamp.now() as any,
                cancelledBy: params.cancelledBy as any,
            } as any);

            await auditService.logAuditEvent({
                action: 'RESERVA_CANCELAR',
                module: 'Reservas/Móvil',
                details: `Reserva ${params.bookingId} cancelada por ${params.cancelledBy}.`,
                severity: 'MEDIUM',
                status: 'SUCCESS'
            });
        } catch (error: any) {
            await auditService.logAuditEvent({
                action: 'RESERVA_CANCELAR',
                module: 'Reservas/Móvil',
                details: `Falla al cancelar reserva ${params.bookingId} por ${params.cancelledBy}. Error: ${error.message || error}`,
                severity: 'MEDIUM',
                status: 'FAILED'
            });
            throw error;
        }
    },

    async setPaymentStatus(params: { bookingId: string; paymentStatus: Booking['paymentStatus'] }) {
        await bookingService.updateBooking(params.bookingId, {
            paymentStatus: params.paymentStatus,
            status: 'confirmed',
            paymentUpdatedAt: Timestamp.now() as any,
        } as any);
    },

    async markCompleted(params: { bookingId: string }) {
        await bookingService.updateBooking(params.bookingId, {
            status: 'completed',
            completedAt: Timestamp.now() as any,
        } as any);
    },

    async getBookingsByTenantForDate(tenantId: string, date: Date): Promise<Booking[]> {
        try {
            const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
            const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);

            const bookingsRef = collection(db, 'bookings');
            const qByDate = query(
                bookingsRef,
                where('tenantId', '==', tenantId),
                where('date', '>=', Timestamp.fromDate(startOfDay)),
                where('date', '<=', Timestamp.fromDate(endOfDay))
            );
            const qByStartTime = query(
                bookingsRef,
                where('tenantId', '==', tenantId),
                where('startTime', '>=', Timestamp.fromDate(startOfDay)),
                where('startTime', '<=', Timestamp.fromDate(endOfDay))
            );

            const [snapDate, snapStart] = await Promise.all([
                getDocs(qByDate).catch(() => ({ docs: [] as any[] })),
                getDocs(qByStartTime).catch(() => ({ docs: [] as any[] })),
            ]);

            const allDocsMap = new Map<string, any>();
            [...snapDate.docs, ...snapStart.docs].forEach((d) => {
                if (!allDocsMap.has(d.id)) allDocsMap.set(d.id, d);
            });

            return Array.from(allDocsMap.values()).map((d) => {
                const raw = d.data() as any;
                const parsed = bookingSchema.safeParse(raw);
                return { id: d.id, ...(parsed.success ? (parsed.data as any) : raw) } as Booking;
            });
        } catch (error) {
            console.error('Error fetching tenant bookings:', error);
            return [];
        }
    },

    /**
     * Fetch user bookings
     */
    async getUserBookings(userIdOrEmail: string): Promise<Booking[]> {
        try {
            const bookingsRef = collection(db, 'bookings');
            // Estandarizamos a userId (nuevo) pero mantenemos createdBy (legacy/trazabilidad)
            const qByPlayer = query(bookingsRef, where('userId', '==', userIdOrEmail));
            const qByCreator = query(bookingsRef, where('createdBy', '==', userIdOrEmail));

            const [snapPlayer, snapCreator] = await Promise.all([
                getDocs(qByPlayer).catch(() => ({ docs: [] as any[] })),
                getDocs(qByCreator).catch(() => ({ docs: [] as any[] })),
            ]);

            const allDocsMap = new Map<string, any>();
            [...snapPlayer.docs, ...snapCreator.docs].forEach((d) => {
                if (!allDocsMap.has(d.id)) allDocsMap.set(d.id, d);
            });

            return Array.from(allDocsMap.values()).map((d) => {
                const raw = d.data() as any;
                const parsed = bookingSchema.safeParse(raw);
                return { id: d.id, ...(parsed.success ? (parsed.data as any) : raw) } as Booking;
            });
        } catch (error) {
            console.error('Error fetching user bookings:', error);
            return [];
        }
    },
    async getVenueBookings(tenantId: string): Promise<Booking[]> {
        try {
            const bookingsRef = collection(db, 'bookings');
            const q = query(bookingsRef, where('tenantId', '==', tenantId));
            const snap = await getDocs(q);
            return snap.docs.map(doc => {
                const raw = doc.data() as any;
                const parsed = bookingSchema.safeParse(raw);
                return { id: doc.id, ...(parsed.success ? (parsed.data as any) : raw) } as Booking;
            });
        } catch (error) {
            console.error('Error fetching venue bookings:', error);
            return [];
        }
    },

    async checkIn(bookingId: string) {
        try {
            const ref = doc(db, 'bookings', bookingId);
            await updateDoc(ref, { 
                checkIn: true, 
                checkInTime: Timestamp.now(),
                status: 'active'
            });

            await auditService.logAuditEvent({
                action: 'RESERVA_CHECKIN_MOVIL',
                module: 'Reservas/Móvil',
                details: `Check-in móvil registrado para la reserva ${bookingId}.`,
                severity: 'LOW',
                status: 'SUCCESS'
            });
        } catch (error: any) {
            await auditService.logAuditEvent({
                action: 'RESERVA_CHECKIN_MOVIL',
                module: 'Reservas/Móvil',
                details: `Falla al realizar check-in móvil para la reserva ${bookingId}. Error: ${error.message || error}`,
                severity: 'LOW',
                status: 'FAILED'
            });
            throw error;
        }
    },

    async checkOut(bookingId: string, surveyData?: { rating?: number; feedback?: string }) {
        try {
            const ref = doc(db, 'bookings', bookingId);
            const updateData: any = { 
                checkOut: true, 
                checkOutTime: Timestamp.now(),
                status: 'completed'
            };
            if (surveyData) {
                if (surveyData.rating !== undefined) updateData.rating = surveyData.rating;
                if (surveyData.feedback !== undefined) updateData.feedback = surveyData.feedback;
            }
            await updateDoc(ref, updateData);

            await auditService.logAuditEvent({
                action: 'RESERVA_CHECKOUT_MOVIL',
                module: 'Reservas/Móvil',
                details: `Check-out móvil registrado para la reserva ${bookingId}.${surveyData ? ` Valoración: ${surveyData.rating}, Feedback: ${surveyData.feedback}` : ''}`,
                severity: 'LOW',
                status: 'SUCCESS'
            });
        } catch (error: any) {
            await auditService.logAuditEvent({
                action: 'RESERVA_CHECKOUT_MOVIL',
                module: 'Reservas/Móvil',
                details: `Falla al realizar check-out móvil para la reserva ${bookingId}. Error: ${error.message || error}`,
                severity: 'LOW',
                status: 'FAILED'
            });
            throw error;
        }
    },

    async saveMatchStats(stats: any) {
        try {
            const statsRef = collection(db, 'match_stats');
            const res = await addDoc(statsRef, {
                ...stats,
                createdAt: Timestamp.now()
            });

            // Lógica de Gamificación (XP/Puntos)
            const players = [...stats.teamA.players, ...stats.teamB.players];
            const winner = stats.winner;

            for (const p of players) {
                const playerRef = doc(db, 'profiles', p.userId);
                const playerSnap = await getDoc(playerRef);
                if (playerSnap.exists()) {
                    const currentData = playerSnap.data();
                    let xpChange = 50; // XP base por jugar
                    let pointsChange = 10; // Puntos base

                    // Bonus por ganar / Penalización por perder
                    const isWinner = (winner === 'teamA' && stats.teamA.players.find((x: any) => x.userId === p.userId)) || 
                                     (winner === 'teamB' && stats.teamB.players.find((x: any) => x.userId === p.userId));
                    
                    if (isWinner) {
                        xpChange += 100;
                        pointsChange += 20;
                    } else if (winner !== 'draw') {
                        xpChange += 20;
                        pointsChange -= 15; // Se pierden puntos por perder
                    }

                    // Goles y asistencias
                    xpChange += (p.goals * 30) + (p.assists * 20);

                    await updateDoc(playerRef, {
                        'stats.xp': (currentData.stats?.xp || 0) + xpChange,
                        'stats.points': (currentData.stats?.points || 0) + pointsChange,
                        'stats.goals': (currentData.stats?.goals || 0) + p.goals,
                        'stats.assists': (currentData.stats?.assists || 0) + p.assists,
                        'stats.matchesPlayed': (currentData.stats?.matchesPlayed || 0) + 1
                    });
                }
            }

            await auditService.logAuditEvent({
                action: 'PARTIDO_ESTADISTICAS',
                module: 'Partidos/Móvil',
                details: `Estadísticas de partido registradas (ID stats: ${res.id}). Ganador: ${stats.winner}, Equipos: ${stats.teamA.name || 'A'} vs ${stats.teamB.name || 'B'}.`,
                severity: 'LOW',
                status: 'SUCCESS'
            });
        } catch (error: any) {
            console.error('Error in saveMatchStats:', error);
            await auditService.logAuditEvent({
                action: 'PARTIDO_ESTADISTICAS',
                module: 'Partidos/Móvil',
                details: `Falla al guardar estadísticas de partido. Error: ${error.message || error}`,
                severity: 'LOW',
                status: 'FAILED'
            });
            throw error;
        }
    }
};
