import { cached } from '@/services/client/player/cache';
import { collection, query, where, getDocs, documentId, doc, getDoc, orderBy } from 'firebase/firestore';
import { db } from '@/services/client/firebase';
import { postApi } from '@/services/client/apiClient';

export interface Tenant {
    id: string;
    name: string;
    address?: string;
    description?: string;
    phone?: string;
    instagram?: string;
    whatsapp?: string;
    coordinates?: { lat: number; lng: number; [key: string]: any };
    imageUrl?: string;
    rating?: number;
    sports?: string[];
    pricing?: Record<string, Record<string, number>>;
    location?: any;
    openingHours?: string;
    amenities?: string[];
    gallery?: string[];
    commune?: string;
    features?: { seo?: boolean; topPosition?: boolean; ads?: boolean; analytics?: boolean; marketing?: boolean; support?: boolean; api?: boolean; multiRecinto?: boolean };
    openTime?: string;
    closeTime?: string;
    schedule?: any;
    paymentApiActive?: boolean;
    transbankCommerceCode?: string;
}

export interface Court {
    id: string;
    tenantId: string;
    name: string;
    sport: string;
    price?: number;
}

const processTenantData = (id: string, raw: any): Tenant => {
    const stockImages: Record<string, string> = {
        padel: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8',
        futbol: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018',
        tenis: 'https://images.unsplash.com/photo-1595435064215-68d148332009',
        basketball: 'https://images.unsplash.com/photo-1544919982-b61976f0ba4a',
        general: 'https://images.unsplash.com/photo-1595435064215-68d148332009',
    };
    const sport = raw?.sports?.[0]?.toLowerCase() || 'general';
    const nestedImageUrl = raw.coordinates?.imageURL || raw.coordinates?.imageUrl;
    const directImageUrl = raw.imageUrl || raw.imageURL;
    let finalImageUrl = nestedImageUrl || directImageUrl || stockImages[sport] || stockImages.general;
    const rawCoords = raw.coordinates || raw.location || raw;
    const coords = {
        ...raw.coordinates,
        lat: Number(rawCoords?.lat ?? rawCoords?.latitude ?? rawCoords?._lat ?? 0),
        lng: Number(rawCoords?.lng ?? rawCoords?.longitude ?? rawCoords?._long ?? 0)
    };
    return {
        id, ...raw, name: raw.name || 'Sin Nombre',
        imageUrl: finalImageUrl,
        rating: raw.rating ?? 0,
        coordinates: coords,
        address: raw.coordinates?.fullAddress || raw.address || 'Ubicación no disponible',
        features: raw.features || { seo: true, topPosition: false, ads: false, analytics: true },
        gallery: Array.isArray(raw.gallery) ? raw.gallery : [],
        openTime: raw.openTime,
        closeTime: raw.closeTime,
        schedule: raw.schedule,
    } as Tenant;
};

export const venueService = {
    async getVenues(): Promise<Tenant[]> {
        return cached('venues', 5 * 60_000, () => venueService._loadVenues());
    },

    async _loadVenues(): Promise<Tenant[]> {
        const tenantsRef = collection(db, 'tenants');
        const querySnapshot = await getDocs(tenantsRef);
        return querySnapshot.docs
            .filter(doc => { const s = (doc.data().status || '').toLowerCase(); return s !== 'suspended' && s !== 'suspendido' && s !== 'inactive'; })
            .map(doc => processTenantData(doc.id, doc.data()))
            .sort((a, b) => ((b.features?.topPosition ? 1 : 0) - (a.features?.topPosition ? 1 : 0)) || ((b as any).priorityScore ?? 10) - ((a as any).priorityScore ?? 10));
    },

    async getVenueById(tenantId: string): Promise<Tenant | null> {
        const ref = doc(db, 'tenants', tenantId);
        const snap = await getDoc(ref);
        if (!snap.exists()) return null;
        return processTenantData(snap.id, snap.data());
    },

    async getVenuesByIds(tenantIds: string[]): Promise<Tenant[]> {
        if (!tenantIds?.length) return [];
        const tenantsRef = collection(db, 'tenants');
        const chunkArray = (arr: string[], size: number) => Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));
        const tenants: Tenant[] = [];
        await Promise.all(chunkArray(tenantIds, 10).map(async (chunk) => {
            const q = query(tenantsRef, where(documentId(), 'in', chunk));
            const snap = await getDocs(q);
            snap.docs.forEach(d => tenants.push(processTenantData(d.id, d.data())));
        }));
        return tenants;
    },

    async getCourtsByTenant(tenantId: string): Promise<Court[]> {
        const courtsRef = collection(db, 'courts');
        const q = query(courtsRef, where('tenantId', '==', tenantId));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as Court));
    },

    // La reseña la valida y guarda el servidor (solo quien jugó, una por reserva) y recalcula el promedio del recinto
    async submitVenueFeedback(_tenantId: string, bookingId: string, rating: number, comment: string) {
        await postApi('/api/reviews', { bookingId, rating, comment });
    },

    async getVenueFeedback(tenantId: string) {
        const q = query(collection(db, 'reviews'), where('venueId', '==', tenantId), orderBy('date', 'desc'));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
};
