import { doc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs, Timestamp, increment } from 'firebase/firestore';
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

    async awardInternalMatchXpAndStats(
        teamAssignments: Record<string, 'A' | 'B' | 'N'>,
        memberGoals: Record<string, number>,
        memberAssists: Record<string, number>,
        _scoreA: number,
        _scoreB: number,
        mvpUid: string | null,
        activeUserUid: string,
        activeUserOutcome: 'win' | 'loss' | 'draw'
    ): Promise<void> {
        try {
            const activeAssignment = teamAssignments[activeUserUid] || 'A';
            const promises = Object.entries(teamAssignments).map(async ([uid, assignment]) => {
                if (assignment === 'N' || !assignment) return;
                const profile = await this.getUserProfile(uid);
                if (!profile) return;

                let playerOutcome: 'win' | 'loss' | 'draw' = 'draw';
                if (activeUserOutcome === 'draw') { playerOutcome = 'draw'; }
                else {
                    const sameTeam = assignment === activeAssignment;
                    playerOutcome = activeUserOutcome === 'win' ? (sameTeam ? 'win' : 'loss') : (sameTeam ? 'loss' : 'win');
                }

                const isWin = playerOutcome === 'win';
                const isLoss = playerOutcome === 'loss';
                const goalsScored = memberGoals[uid] || 0;
                const assistsGiven = memberAssists[uid] || 0;
                const isMVP = uid === mvpUid;

                const ref = doc(db, 'profiles', uid);
                await updateDoc(ref, {
                    'stats.played': increment(1),
                    'stats.won': increment(isWin ? 1 : 0),
                    'stats.lost': increment(isLoss ? 1 : 0),
                    'stats.goals': increment(goalsScored),
                    'stats.assists': increment(assistsGiven),
                    'stats.mvps': increment(isMVP ? 1 : 0),
                    lastStatsUpdate: Timestamp.now(),
                });
            });
            await Promise.all(promises);
        } catch (error) {
            console.warn('Could not award internal match stats:', error);
        }
    },
};
