import { cached } from './cache';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

export interface GamificationSettings {
    tiers: { bronze: number; silver: number; gold: number; platinum: number; diamond: number; elite: number; legend: number };
    xpPerCheckin: number;
    xpPerMatch: number;
    xpPerWin: number;
    xpPerMvp: number;
    xpPerNoShow: number;
}

export const gamificationService = {
    async getSettings(): Promise<GamificationSettings | null> {
        return cached('gamification', 10 * 60_000, () => gamificationService._loadSettings());
    },

    async _loadSettings(): Promise<GamificationSettings | null> {
        try {
            const docRef = doc(db, 'settings', 'global');
            const snap = await getDoc(docRef);
            if (snap.exists() && snap.data()?.gamification) return snap.data().gamification as GamificationSettings;
            return null;
        } catch { return null; }
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

    // Progreso hacia el siguiente rango (null en el rango máximo)
    tierProgress(xp: number, settings: GamificationSettings) {
        const t = settings.tiers;
        const steps = [
            { name: 'Bronce', min: t.bronze || 0 }, { name: 'Plata', min: t.silver }, { name: 'Oro', min: t.gold },
            { name: 'Platino', min: t.platinum }, { name: 'Diamante', min: t.diamond }, { name: 'Elite', min: t.elite }, { name: 'Leyenda', min: t.legend },
        ].filter((x) => typeof x.min === 'number');
        let i = 0;
        while (i + 1 < steps.length && xp >= steps[i + 1].min) i++;
        const cur = steps[i], next = steps[i + 1];
        if (!next) return { current: cur.name, next: null as string | null, xpToNext: 0, pct: 100 };
        const span = Math.max(1, next.min - cur.min);
        return { current: cur.name, next: next.name, xpToNext: Math.max(0, next.min - xp), pct: Math.min(100, Math.max(0, Math.round(((xp - cur.min) / span) * 100))) };
    },

    calculateOVR(xp: number, settings: GamificationSettings) {
        const base = 40;
        const range = 99 - base;
        const progress = Math.min(1, Math.sqrt(xp / settings.tiers.legend));
        return Math.floor(base + (progress * range));
    }
};
