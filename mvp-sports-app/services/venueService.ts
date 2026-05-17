import { collection, query, where, getDocs, GeoPoint, documentId, doc, getDoc, addDoc, updateDoc, Timestamp, orderBy, limit } from 'firebase/firestore';
import { db } from './firebase';
import { courtSchema, tenantSchema } from './schemas';

export interface Tenant {
    id: string;
    name: string;
    address?: string;
    description?: string;
    phone?: string;
    instagram?: string;
    whatsapp?: string;
    coordinates?: {
        lat: number;
        lng: number;
        [key: string]: any;
    }; 
    imageUrl?: string;
    rating?: number;
    sports?: string[];
    pricing?: Record<string, Record<string, number>>;
    category?: string;
    location?: any; 
    openingHours?: string;
    amenities?: string[];
    services?: string[];
    codigo?: string; 
    priorityScore?: number;
    features?: {
        seo?: boolean;
        topPosition?: boolean;
        ads?: boolean;
        analytics?: boolean;
        marketing?: boolean;
        support?: boolean;
        api?: boolean;
        multiRecinto?: boolean;
    };
}

export interface Court {
    id: string;
    tenantId: string;
    name: string;
    sport: string;
    price?: number;
}

// EXTRACTOR MAESTRO DE DATOS (No resume coordenadas, mantiene fidelidad total)
const processTenantData = (id: string, raw: any): Tenant => {
    const data = tenantSchema.safeParse(raw).success ? raw : raw;
    const sport = (raw?.sports && raw.sports.length > 0) ? raw.sports[0].toLowerCase() : 'general';
    
    const stockImages: Record<string, string> = {
        padel: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8',
        futbol: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018',
        tenis: 'https://images.unsplash.com/photo-1595435064215-68d148332009',
        basketball: 'https://images.unsplash.com/photo-1544919982-b61976f0ba4a',
        general: 'https://images.unsplash.com/photo-1595435064215-68d148332009',
    };

    // 1. EXTRACCIÓN DE IMAGEN (Prioridad: coordinates.imageURL -> coordinates.imageUrl -> root.imageUrl -> codigo)
    const nestedImageUrl = raw.coordinates?.imageURL || raw.coordinates?.imageUrl;
    const directImageUrl = raw.imageUrl || raw.imageURL || raw.base64 || raw.codigo;
    let finalImageUrl = nestedImageUrl || directImageUrl || stockImages[sport] || stockImages.general;

    // 2. EXTRACCIÓN DE COORDENADAS (Fidelidad total, sin redondeos)
    const rawCoords = raw.coordinates || raw.location || raw;
    const coords = {
        ...raw.coordinates, // Mantiene todos los campos extras de tu captura (createdAt, debtStatus, etc)
        lat: Number(rawCoords?.lat ?? rawCoords?.latitude ?? rawCoords?._lat ?? 0),
        lng: Number(rawCoords?.lng ?? rawCoords?.longitude ?? rawCoords?._long ?? 0)
    };

    return {
        id,
        ...data,
        name: raw.name || 'Sin Nombre',
        imageUrl: finalImageUrl,
        rating: data.rating !== undefined ? data.rating : 0,
        coordinates: coords,
        address: raw.coordinates?.fullAddress || raw.address || 'Ubicación no disponible',
        priorityScore: raw.priorityScore !== undefined ? raw.priorityScore : 10,
        features: raw.features || { seo: true, topPosition: false, ads: false, analytics: true }
    } as Tenant;
};

const sortTenantsByPriority = (list: Tenant[]): Tenant[] => {
    return list.sort((a, b) => {
        const aTop = a.features?.topPosition ? 1 : 0;
        const bTop = b.features?.topPosition ? 1 : 0;
        if (aTop !== bTop) {
            return bTop - aTop; // 1 (true) va antes de 0 (false)
        }
        const aScore = a.priorityScore ?? 10;
        const bScore = b.priorityScore ?? 10;
        return bScore - aScore; // Mayor score primero
    });
};

export const venueService = {
    async getVenues(): Promise<Tenant[]> {
        try {
            const tenantsRef = collection(db, 'tenants');
            const querySnapshot = await getDocs(tenantsRef);
            const list = querySnapshot.docs.map(doc => processTenantData(doc.id, doc.data()));
            return sortTenantsByPriority(list);
        } catch (error) {
            console.error("Error fetching tenants:", error);
            throw error;
        }
    },

    async getVenueById(tenantId: string): Promise<Tenant | null> {
        try {
            const ref = doc(db, 'tenants', tenantId);
            const snap = await getDoc(ref);
            if (!snap.exists()) return null;
            return processTenantData(snap.id, snap.data());
        } catch (error) {
            console.error('Error fetching tenant:', error);
            return null;
        }
    },

    async getVenuesByIds(tenantIds: string[]): Promise<Tenant[]> {
        try {
            if (!tenantIds?.length) return [];
            const tenantsRef = collection(db, 'tenants');
            const chunkArray = (arr: string[], size: number) =>
                Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));

            const tenants: Tenant[] = [];
            const promises = chunkArray(tenantIds, 10).map(async (chunk) => {
                const qTenants = query(tenantsRef, where(documentId(), 'in', chunk));
                const snap = await getDocs(qTenants);
                snap.docs.forEach((d) => {
                    tenants.push(processTenantData(d.id, d.data()));
                });
            });

            await Promise.all(promises);
            return sortTenantsByPriority(tenants);
        } catch (error) {
            console.error('Error fetching tenants by ids:', error);
            return [];
        }
    },

    async getCourtsByTenant(tenantId: string): Promise<Court[]> {
        try {
            const courtsRef = collection(db, 'courts');
            const qCourts = query(courtsRef, where('tenantId', '==', tenantId));
            const snap = await getDocs(qCourts);
            return snap.docs.map((d) => {
                const raw: any = d.data();
                const data: any = courtSchema.safeParse(raw).success ? raw : raw;
                return {
                    id: d.id,
                    tenantId: data.tenantId,
                    name: data.name,
                    sport: data.sport || 'General',
                    price: data.price || 0,
                } as Court;
            });
        } catch (error) {
            console.error('Error fetching courts:', error);
            return [];
        }
    },

    async getVenuesBySport(sport: string): Promise<Tenant[]> {
        try {
            const courtsRef = collection(db, 'courts');
            const qCourts = query(courtsRef, where('sport', '==', sport));
            const courtsSnap = await getDocs(qCourts);

            const tenantIds = new Set<string>();
            courtsSnap.docs.forEach(doc => {
                const tenantId = doc.data().tenantId;
                if (tenantId) tenantIds.add(tenantId);
            });

            if (tenantIds.size === 0) return [];

            const tenantIdsArray = Array.from(tenantIds);
            const tenants: Tenant[] = [];
            const tenantsRef = collection(db, 'tenants');

            const chunkArray = (arr: string[], size: number) =>
                Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));

            const promises = chunkArray(tenantIdsArray, 10).map(async (chunk) => {
                const qTenants = query(tenantsRef, where(documentId(), 'in', chunk));
                const snap = await getDocs(qTenants);
                snap.docs.forEach(doc => {
                    tenants.push(processTenantData(doc.id, doc.data()));
                });
            });

            await Promise.all(promises);
            return sortTenantsByPriority(tenants);
        } catch (error) {
            console.error(`Error fetching venues for ${sport}:`, error);
            throw error;
        }
    },

    async getVenuesByOwner(ownerId: string): Promise<Tenant[]> {
        try {
            const tenantsRef = collection(db, 'tenants');
            const q = query(tenantsRef, where('ownerId', '==', ownerId));
            const snap = await getDocs(q);
            return snap.docs.map(doc => processTenantData(doc.id, doc.data()));
        } catch (error) {
            console.error('Error fetching owner venues:', error);
            return [];
        }
    },

    async submitVenueFeedback(tenantId: string, bookingId: string, rating: number, comment: string, userName: string, extraInfo?: { sport?: string, bookingDate?: any, bookingTime?: string }) {
        try {
            const tenantRef = doc(db, 'tenants', tenantId);
            const tenantSnap = await getDoc(tenantRef);
            
            if (!tenantSnap.exists()) return;
            const tenantData = tenantSnap.data();
            const ownerId = tenantData.ownerId;

            // 1. Guardar en la colección de reviews (compatible con web dashboard)
            const reviewsRef = collection(db, 'reviews');
            await addDoc(reviewsRef, {
                venueId: tenantId,
                venueName: tenantData.name || 'Recinto',
                bookingId,
                rating,
                comment,
                userName,
                ownerId: ownerId || null,
                date: Timestamp.now(),
                // Información extra de la reserva para mayor contexto en el dashboard
                sport: extraInfo?.sport || null,
                bookingDate: extraInfo?.bookingDate || null,
                bookingTime: extraInfo?.bookingTime || null
            });

            // Actualizar el rating real usando el nuevo método de recalculo total
            await this.recalculateVenueRating(tenantId);
        } catch (error) {
            console.error('Error submitting feedback:', error);
            throw error;
        }
    },

    // HELPER PARA NORMALIZAR Y DE-DUPLICAR (Asegura consistencia total)
    processFeedbackData(tenantId: string, reviews: any[], bookings: any[]) {
        const normalizedBookings = bookings.map((b: any) => ({
            id: b.id,
            venueId: b.tenantId || tenantId,
            userId: b.userId || b.clientId || b.createdBy || 'anon',
            userName: b.clientName || b.userName || 'Jugador MVP',
            rating: Number(b.rating || 0),
            comment: b.feedback || b.comment || 'Sin comentario',
            date: b.date,
            sport: b.sport,
            isFromBooking: true
        }));

        const feedbackMap = new Map();
        const getContentKey = (item: any) => {
            const commentNorm = (item.comment || '').trim().toLowerCase().substring(0, 30);
            const timeStr = item.date?.seconds || item.date?.toString() || '';
            const uid = item.userId || item.createdBy || 'anon';
            return `${uid}_${tenantId}_${item.rating}_${commentNorm}_${timeStr}`;
        };

        // 1. Reviews primero (prioridad)
        reviews.forEach(r => {
            const key = (r as any).bookingId || getContentKey(r);
            feedbackMap.set(key, r);
        });

        // 2. Bookings después (si no existe ya)
        normalizedBookings.forEach(b => {
            const key = (b as any).id;
            const ck = getContentKey(b);
            if (!feedbackMap.has(key) && !feedbackMap.has(ck)) {
                feedbackMap.set(key, b);
            }
        });

        return Array.from(feedbackMap.values()).sort((a: any, b: any) => {
            const dateA = (a.date as any)?.seconds || 0;
            const dateB = (b.date as any)?.seconds || 0;
            return dateB - dateA;
        });
    },

    async recalculateVenueRating(tenantId: string) {
        try {
            const qReviews = query(collection(db, 'reviews'), where('venueId', '==', tenantId));
            const snapReviews = await getDocs(qReviews);
            const reviewsList = snapReviews.docs.map(d => ({ id: d.id, ...d.data() }));

            const qBookings = query(collection(db, 'bookings'), where('tenantId', '==', tenantId));
            const snapBookings = await getDocs(qBookings);
            const bookingsList = snapBookings.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter((b: any) => b.rating > 0);

            const allEvals = this.processFeedbackData(tenantId, reviewsList, bookingsList);
            
            const rawAvg = allEvals.length > 0 
                ? (allEvals.reduce((acc, e) => acc + (e.rating || 0), 0) / allEvals.length)
                : 0;
            const realRating = Math.round(rawAvg * 10) / 10;

            const tenantRef = doc(db, 'tenants', tenantId);
            await updateDoc(tenantRef, {
                rating: realRating,
                totalFeedbacks: allEvals.length
            });
            return realRating;
        } catch (error) {
            console.error('Error recalculating rating:', error);
            return 0;
        }
    },

    async getVenueFeedback(tenantId: string) {
        try {
            const qReviews = query(
                collection(db, 'reviews'),
                where('venueId', '==', tenantId),
                orderBy('date', 'desc')
            );
            const snapReviews = await getDocs(qReviews);
            const reviewsList = snapReviews.docs.map(d => ({ id: d.id, ...d.data() }));

            const qBookings = query(
                collection(db, 'bookings'),
                where('tenantId', '==', tenantId),
                orderBy('date', 'desc')
            );
            const snapBookings = await getDocs(qBookings);
            const bookingsList = snapBookings.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter((b: any) => b.rating > 0);

            return this.processFeedbackData(tenantId, reviewsList, bookingsList);
        } catch (error) {
            console.error('Error fetching venue feedback:', error);
            return [];
        }
    }
};
