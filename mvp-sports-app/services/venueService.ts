import { collection, query, where, getDocs, GeoPoint, documentId, doc, getDoc } from 'firebase/firestore';
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
        rating: data.rating || 4.8,
        coordinates: coords,
        address: raw.coordinates?.fullAddress || raw.address || 'Ubicación no disponible'
    } as Tenant;
};

export const venueService = {
    async getVenues(): Promise<Tenant[]> {
        try {
            const tenantsRef = collection(db, 'tenants');
            const querySnapshot = await getDocs(tenantsRef);
            return querySnapshot.docs.map(doc => processTenantData(doc.id, doc.data()));
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
            return tenants;
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
            return tenants;
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
    }
};
