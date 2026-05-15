import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface GamificationSettings {
    tiers: {
        bronze: number;
        silver: number;
        gold: number;
        platinum: number;
        diamond: number;
        elite: number;
        legend: number;
    };
    xpPerCheckin: number;
    xpPerLoss: number;
    xpPerMatch: number;
    xpPerMvp: number;
    xpPerNoShow: number;
}

export const gamificationService = {
    async getSettings(): Promise<GamificationSettings | null> {
        try {
            const docRef = doc(db, 'settings', 'gamification');
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                return snap.data() as GamificationSettings;
            }
            return null;
        } catch (error) {
            console.error("Error fetching gamification settings:", error);
            return null;
        }
    },

    calculateTier(xp: number, settings: GamificationSettings) {
        const { tiers } = settings;
        if (xp >= tiers.legend) return { name: 'Leyenda', index: 6 };
        if (xp >= tiers.elite) return { name: 'Elite', index: 5 };
        if (xp >= tiers.diamond) return { name: 'Diamante', index: 4 };
        if (xp >= tiers.platinum) return { name: 'Platino', index: 3 };
        if (xp >= tiers.gold) return { name: 'Oro', index: 2 };
        if (xp >= tiers.silver) return { name: 'Plata', index: 1 };
        return { name: 'Bronce', index: 0 };
    },

    calculateOVR(xp: number, settings: GamificationSettings) {
        const base = 40;
        const maxXP = settings.tiers.legend;
        const range = 99 - base;
        const progress = Math.min(1, Math.sqrt(xp / maxXP));
        return Math.floor(base + (progress * range));
    }
};
