import { doc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs, Timestamp, increment } from 'firebase/firestore';
import { db, auth } from '@/services/client/firebase';
import { canonicalSport } from '@/utils/sports';
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
        const cleanData: any = { ...data };
        Object.keys(cleanData).forEach(key => cleanData[key] === undefined && delete cleanData[key]);
        if (cleanData.mainSport) cleanData.mainSport = canonicalSport(cleanData.mainSport);
        if (Array.isArray(cleanData.favSports)) cleanData.favSports = [...new Set(cleanData.favSports.map(canonicalSport))];
        await updateDoc(ref, cleanData);
    },

    // Requiere reautenticar justo antes: el servidor exige un inicio de sesión reciente.
    async deleteAccount(): Promise<void> {
        const token = await auth.currentUser?.getIdToken(true);
        const res = await fetch('/api/account/delete', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'No se pudo eliminar la cuenta.');
    },

    async getGamificationSettings(): Promise<any> {
        const snap = await getDoc(doc(db, 'settings', 'global'));
        const data = snap.exists() ? snap.data() || {} : {};
        return data.gamification || {
            xpPerCheckin: 50, xpPerMatch: 100, xpPerWin: 150, xpPerMvp: 200,
            xpPerGoal: 25, xpPerAssist: 15, xpPerLoss: 50, xpPerNoShow: 150,
            tiers: { bronze: 0, silver: 1000, gold: 3000, platinum: 6000, diamond: 10000, elite: 15000, legend: 25000 }
        };
    },
};
