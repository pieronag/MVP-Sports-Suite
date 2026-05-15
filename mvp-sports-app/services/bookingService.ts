import { collection, query, where, getDocs, addDoc, Timestamp, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { bookingSchema } from './schemas';

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
    status: 'confirmed' | 'cancelled' | 'active' | 'completed' | 'past' | 'pending';
    paymentStatus: 'paid' | 'pending' | 'partial';
    source: 'mobile_app' | 'manual_dashboard';
    ownerId?: string;
    createdAt?: Timestamp;
    userId: string;
    createdBy?: string;
    checkIn?: boolean;
    checkInTime?: Timestamp;
    checkOut?: boolean;
    checkOutTime?: Timestamp;
    teamId?: string;
}

export const bookingService = {
    /**
     * Get available time slots for a given court on a specific date string (YYYY-MM-DD).
     */
    async getAvailableTimeSlots(tenantId: string, courtId: string, dateStr: string): Promise<string[]> {
        const slots: string[] = [];
        for (let i = 10; i < 24; i++) {
            slots.push(`${i.toString().padStart(2, '0')}:00`);
        }

        try {
            const [y, m, d] = dateStr.split('-').map(Number);
            const startOfDay = new Date(y, m - 1, d, 0, 0, 0);
            const endOfDay = new Date(y, m - 1, d, 23, 59, 59);

            const bookingsRef = collection(db, 'bookings');
            // Compatible con el esquema usado en web: algunas reservas antiguas usan startTime como Timestamp.
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
            // Default to all slots on failure to not block user entirely from exploring
            return slots;
        }
    },

    /**
     * Creates a new booking directly in the unified bookings collection
     */
    async createBooking(bookingData: Booking): Promise<string> {
        try {
            const bookingsRef = collection(db, 'bookings');

            // Add server timestamps
            const newBooking = {
                ...bookingData,
                createdAt: Timestamp.now(),
            };

            const docRef = await addDoc(bookingsRef, newBooking);
            return docRef.id;
        } catch (error) {
            console.error('Error creating booking:', error);
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
        await updateDoc(ref, data as any);
    },

    async cancelBooking(params: { bookingId: string; cancelledBy: string }) {
        await bookingService.updateBooking(params.bookingId, {
            status: 'cancelled',
            // campos extra compatibles con web (no rompe si no existen en schema)
            cancelledAt: Timestamp.now() as any,
            cancelledBy: params.cancelledBy as any,
        } as any);
    },

    async setPaymentStatus(params: { bookingId: string; paymentStatus: Booking['paymentStatus'] }) {
        await bookingService.updateBooking(params.bookingId, {
            paymentStatus: params.paymentStatus,
            status: params.paymentStatus === 'paid' ? 'confirmed' : 'pending',
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
        const ref = doc(db, 'bookings', bookingId);
        await updateDoc(ref, { 
            checkIn: true, 
            checkInTime: Timestamp.now(),
            status: 'active'
        });
    },

    async checkOut(bookingId: string) {
        const ref = doc(db, 'bookings', bookingId);
        await updateDoc(ref, { 
            checkOut: true, 
            checkOutTime: Timestamp.now(),
            status: 'completed'
        });
    },

    async saveMatchStats(stats: any) {
        const statsRef = collection(db, 'match_stats');
        await addDoc(statsRef, {
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
    }
};
