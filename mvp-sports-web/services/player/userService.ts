import { doc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { deleteUser } from 'firebase/auth';

export interface PlayerProfile {
    uid: string;
    email: string;
    displayName?: string;
    fullName?: string;
    phone?: string;
    photoURL?: string;
    rut?: string;
    birthDate?: string;
    height?: number;
    weight?: number;
    mainSport?: string;
    position?: string;
    dominantFoot?: string;
    favTime?: string;
    frequency?: string;
    intensity?: string;
    xp?: number;
    ovr?: number;
    tier?: string;
    role: string;
    status?: string;
    createdAt?: any;
    stats?: Record<string, number>;
    badges?: Record<string, number>;
    theme?: 'dark' | 'light';
    city?: string;
    gender?: string;
}

export const userService = {
    async getUserProfile(uid: string): Promise<PlayerProfile | null> {
        try {
            const ref = doc(db, 'users', uid);
            const snap = await getDoc(ref);
            if (!snap.exists()) {
                // Fallback: check profiles collection
                const profileRef = doc(db, 'profiles', uid);
                const profileSnap = await getDoc(profileRef);
                if (!profileSnap.exists()) return null;
                return { uid: profileSnap.id, ...profileSnap.data() } as PlayerProfile;
            }
            return { uid: snap.id, ...snap.data() } as PlayerProfile;
        } catch { return null; }
    },

    async updateUserProfile(uid: string, data: Partial<PlayerProfile>): Promise<void> {
        const ref = doc(db, 'users', uid);
        const cleanData = { ...data };
        Object.keys(cleanData).forEach(key => (cleanData as any)[key] === undefined && delete (cleanData as any)[key]);
        await updateDoc(ref, cleanData as any);
    },

    async deleteAccount(uid: string): Promise<void> {
        const ref = doc(db, 'users', uid);
        await deleteDoc(ref);
        const bookingsRef = collection(db, 'bookings');
        const q = query(bookingsRef, where('userId', '==', uid));
        const snap = await getDocs(q);
        await Promise.all(snap.docs.map(d => updateDoc(doc(db, 'bookings', d.id), { userId: null, clientName: 'Usuario eliminado' })));
        if (auth.currentUser) await deleteUser(auth.currentUser);
    }
};
