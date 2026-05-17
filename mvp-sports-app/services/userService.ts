import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';
import { UserProfile } from '../types/user';

export interface GamificationSettings {
    xpPerCheckin: number;
    xpPerMatch: number;
    xpPerWin: number;
    xpPerMvp: number;
    xpPerNoShow: number;
    tiers: {
        bronze: number;
        silver: number;
        gold: number;
        platinum: number;
        diamond: number;
        elite: number;
        legend: number;
    };
}

export const userService = {
    /**
     * Uploads a base64 image to Firebase Storage and returns the URL
     */
    async uploadProfileImage(uid: string, base64: string): Promise<string> {
        try {
            const storageRef = ref(storage, `avatars/${uid}.jpg`);
            // uploadString handles the data_url format
            await uploadString(storageRef, base64, 'data_url');
            const downloadURL = await getDownloadURL(storageRef);
            return downloadURL;
        } catch (error) {
            console.error('Error uploading image:', error);
            throw error;
        }
    },
    /**
     * Gets the global gamification settings
     */
    async getStaffProfile(uid: string): Promise<{ id: string, data: any } | null> {
        try {
            const staffRef = collection(db, 'staff');
            const q = query(staffRef, where('uid', '==', uid));
            const snap = await getDocs(q);
            if (!snap.empty) {
                return {
                    id: snap.docs[0].id,
                    data: snap.docs[0].data()
                };
            }
            return null;
        } catch (error) {
            console.error('Error fetching staff profile:', error);
            return null;
        }
    },

    async updateStaffProfile(uid: string, data: any): Promise<void> {
        try {
            const staffInfo = await this.getStaffProfile(uid);
            if (staffInfo) {
                const staffRef = doc(db, 'staff', staffInfo.id);
                await updateDoc(staffRef, data);
            }
        } catch (error) {
            console.error('Error updating staff profile:', error);
        }
    },

    async getGamificationSettings(): Promise<GamificationSettings> {
        try {
            const docRef = doc(db, 'settings', 'global');
            const snap = await getDoc(docRef);
            if (snap.exists() && snap.data()?.gamification) {
                return snap.data().gamification as GamificationSettings;
            }
            return {
                xpPerCheckin: 50,
                xpPerMatch: 100,
                xpPerWin: 150,
                xpPerMvp: 200,
                xpPerNoShow: 150,
                tiers: { bronze: 0, silver: 1000, gold: 5000, elite: 10000 }
            };
        } catch (error) {
            console.error('Error fetching gamification settings:', error);
            throw error;
        }
    },

    /**
     * Calculates the user's tier
     */
    calculateTier(xp: number, settings: GamificationSettings): string {
        const { tiers } = settings;
        if (xp >= tiers.legend) return 'Leyenda';
        if (xp >= tiers.elite) return 'Elite';
        if (xp >= tiers.diamond) return 'Diamante';
        if (xp >= tiers.platinum) return 'Platino';
        if (xp >= tiers.gold) return 'Oro';
        if (xp >= tiers.silver) return 'Plata';
        return 'Bronce';
    },

    /**
     * Fetch user profile data from 'users' collection
     */
    async getUserProfile(uid: string): Promise<UserProfile | null> {
        try {
            const userRef = doc(db, 'users', uid);
            const snap = await getDoc(userRef);
            if (!snap.exists()) return null;
            const data = snap.data();
            return {
                uid: snap.id,
                displayName: data.displayName || 'Staff',
                email: data.email || '',
                photoURL: data.photoURL,
                tier: data.tier || 'Bronce',
                ovr: data.ovr || 0,
                stats: data.stats || { 
                    played: 0, won: 0, lost: 0, goals: 0, 
                    skill: 70, stamina: 70, power: 70, fairplay: 90 
                },
                sportRatings: data.sportRatings || {},
                form: data.form || [],
                teamName: data.teamName || 'MVP Staff',
                xp: data.xp || 0,
                role: data.role || 'manager',
                tenantIds: data.tenantIds || []
            } as UserProfile;
        } catch (error) {
            console.error('Error fetching user profile:', error);
            return null;
        }
    },

    /**
     * Updates user profile data
     */
    async updateUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
        try {
            const userRef = doc(db, 'users', uid);
            await updateDoc(userRef, data as any);
        } catch (error) {
            console.error('Error updating user profile:', error);
            throw error;
        }
    },

    /**
     * Awards XP to a user
     */
    async awardXp(uid: string, action: 'checkin' | 'match' | 'win' | 'mvp'): Promise<void> {
        try {
            const [settings, profile] = await Promise.all([
                this.getGamificationSettings(),
                this.getUserProfile(uid)
            ]);
            if (!profile) return;
            let xpGained = 0;
            switch (action) {
                case 'checkin': xpGained = settings.xpPerCheckin; break;
                case 'match': xpGained = settings.xpPerMatch; break;
                case 'win': xpGained = settings.xpPerWin; break;
                case 'mvp': xpGained = settings.xpPerMvp; break;
            }
            const newXp = (profile.xp || 0) + xpGained;
            const newOvr = (profile.ovr || 0) + Math.floor(xpGained / 10);
            const newTier = this.calculateTier(newXp, settings);
            const userRef = doc(db, 'users', uid);
            await updateDoc(userRef, {
                xp: newXp,
                ovr: newOvr,
                tier: newTier,
            });
        } catch (error) {
            console.error('Error awarding XP:', error);
        }
    }
};
