import { collection, query, where, getDocs, addDoc, Timestamp, doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

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
    startTime: string;
    endTime?: string;
    totalPrice: number;
    originalPrice?: number;
    couponCode?: string;
    discountApplied?: number;
    status: 'pending' | 'confirmed' | 'cancelled' | 'active' | 'completed' | 'past' | 'no-show';
    paymentStatus: 'paid' | 'pending' | 'partial' | 'no-show' | 'refunded' | 'refund_failed';
    paymentMethod?: string;
    source: 'mobile_app' | 'manual_dashboard' | 'web_app';
    userId: string;
    createdBy?: string;
    createdAt?: Timestamp;
    checkIn?: boolean;
    checkInTime?: Timestamp;
    checkOut?: boolean;
    checkOutTime?: Timestamp;
    rating?: number;
    feedback?: string;
    teamId?: string;
    cancelledBy?: string;
    noShow?: boolean;
    notes?: string;
}

export const bookingService = {
    async getAvailableTimeSlots(tenantId: string, courtId: string, dateStr: string): Promise<string[]> {
        let slots: string[] = [];
        for (let i = 8; i < 24; i++) slots.push(`${i.toString().padStart(2, '0')}:00`);
        try {
            const tenantDocRef = doc(db, 'tenants', tenantId);
            const tenantSnap = await getDoc(tenantDocRef);
            let openTime = '08:00', closeTime = '23:00';
            if (tenantSnap.exists()) {
                const tData = tenantSnap.data();
                if (tData.openTime) openTime = tData.openTime;
                if (tData.closeTime) closeTime = tData.closeTime;
            }
            const [y, m, d] = dateStr.split('-').map(Number);
            const bookingDate = new Date(y, m - 1, d);
            const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const dayName = daysOfWeek[bookingDate.getDay()];
            if (tenantSnap.exists() && tenantSnap.data().schedule?.[dayName]) {
                const dayConfig = tenantSnap.data().schedule[dayName];
                if (dayConfig.isOpen === false) return [];
                if (dayConfig.open) openTime = dayConfig.open;
                if (dayConfig.close) closeTime = dayConfig.close;
            }
            const dynamicSlots: string[] = [];
            let openHour = parseInt(openTime.split(':')[0]) || 8;
            let closeHour = parseInt(closeTime.split(':')[0]) || 23;
            let adjustedClose = closeHour;
            if (adjustedClose <= openHour) adjustedClose += 24;
            for (let i = openHour; i < adjustedClose; i++) dynamicSlots.push(`${(i % 24).toString().padStart(2, '0')}:00`);
            slots = dynamicSlots;
            const startOfDay = new Date(y, m - 1, d, 0, 0, 0);
            const endOfDay = new Date(y, m - 1, d, 23, 59, 59);
            const bookingsRef = collection(db, 'bookings');
            const q = query(bookingsRef, where('tenantId', '==', tenantId), where('courtId', '==', courtId), where('date', '>=', Timestamp.fromDate(startOfDay)), where('date', '<=', Timestamp.fromDate(endOfDay)));
            const snap = await getDocs(q).catch(() => ({ docs: [] as any[] }));
            const occupiedTimes = Array.from(snap.docs.values()).map(d => d.data() as any).filter(b => b.status !== 'cancelled').map(b => b.startTime).filter(Boolean) as string[];
            return slots.filter(slot => !occupiedTimes.includes(slot));
        } catch { return slots; }
    },

    async createBooking(bookingData: Booking): Promise<string> {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let bookingId = '';
        for (let i = 0; i < 6; i++) bookingId += chars.charAt(Math.floor(Math.random() * chars.length));
        const cleanData = { ...bookingData, source: 'web_app' as const, createdAt: Timestamp.now() };
        Object.keys(cleanData).forEach(key => (cleanData as any)[key] === undefined && delete (cleanData as any)[key]);
        const docRef = doc(db, 'bookings', bookingId);
        await setDoc(docRef, cleanData);
        return bookingId;
    },

    async getBooking(bookingId: string): Promise<Booking | null> {
        const ref = doc(db, 'bookings', bookingId);
        const snap = await getDoc(ref);
        if (!snap.exists()) return null;
        return { id: snap.id, ...snap.data() } as Booking;
    },

    async updateBooking(bookingId: string, data: Partial<Booking>): Promise<void> {
        const ref = doc(db, 'bookings', bookingId);
        const cleanData = { ...data };
        Object.keys(cleanData).forEach(key => (cleanData as any)[key] === undefined && delete (cleanData as any)[key]);
        await updateDoc(ref, cleanData as any);
    },

    async cancelBooking(params: { bookingId: string; cancelledBy: string }) {
        await bookingService.updateBooking(params.bookingId, {
            status: 'cancelled',
            cancelledAt: Timestamp.now() as any,
            cancelledBy: params.cancelledBy as any,
        } as any);
    },

    async getUserBookings(userId: string): Promise<Booking[]> {
        const bookingsRef = collection(db, 'bookings');
        const qByUser = query(bookingsRef, where('userId', '==', userId));
        const qByCreator = query(bookingsRef, where('createdBy', '==', userId));
        const [snapUser, snapCreator] = await Promise.all([
            getDocs(qByUser).catch(() => ({ docs: [] as any[] })),
            getDocs(qByCreator).catch(() => ({ docs: [] as any[] })),
        ]);
        const allDocsMap = new Map<string, any>();
        [...snapUser.docs, ...snapCreator.docs].forEach(d => { if (!allDocsMap.has(d.id)) allDocsMap.set(d.id, d); });
        return Array.from(allDocsMap.values()).map(d => ({ id: d.id, ...d.data() } as Booking));
    },

    async checkIn(bookingId: string) {
        const ref = doc(db, 'bookings', bookingId);
        await updateDoc(ref, { checkIn: true, checkInTime: Timestamp.now(), status: 'active' });
    },

    async checkOut(bookingId: string, surveyData?: { rating?: number; feedback?: string }) {
        const ref = doc(db, 'bookings', bookingId);
        const updateData: any = { checkOut: true, checkOutTime: Timestamp.now(), status: 'completed' };
        if (surveyData?.rating !== undefined) updateData.rating = surveyData.rating;
        if (surveyData?.feedback !== undefined) updateData.feedback = surveyData.feedback;
        await updateDoc(ref, updateData);
    },

    async checkUserHasCashNoShow(userId: string): Promise<boolean> {
        const bookingsRef = collection(db, 'bookings');
        const q = query(bookingsRef, where('userId', '==', userId));
        const snap = await getDocs(q);
        for (const docSnap of snap.docs) {
            const b = docSnap.data();
            const isNoShow = b.status === 'no-show' || b.paymentStatus === 'no-show' || b.noShow === true;
            const isCash = b.paymentMethod === 'cash' || b.paymentMethod === 'venue';
            if (isNoShow && isCash) return true;
        }
        return false;
    }
};
