import { collection, query, where, getDocs, addDoc, getDoc, doc, updateDoc, deleteDoc, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

export interface MatchEntry {
    id: string;
    type: "team" | "player";
    teamId?: string;
    teamName?: string;
    teamImageUrl?: string;
    sport: string;
    sports?: string[];
    memberCount?: number;
    userId?: string;
    displayName?: string;
    photoURL?: string;
    position?: string;
    ovr?: number;
    tier?: string;
    city?: string;
    region?: string;
    commune?: string;
    communes?: string[];
    description?: string;
    status: "active" | "matched" | "closed";
    createdAt: Timestamp;
}

export interface Challenge {
    id: string;
    type: "team_vs_team" | "captain_to_player";
    challengerTeamId?: string;
    challengerTeamName?: string;
    challengedTeamId?: string;
    challengedTeamName?: string;
    captainId?: string;
    captainName?: string;
    playerId?: string;
    playerName?: string;
    sport: string;
    status: "pending" | "active" | "declined" | "closed";
    senderId: string;
    receiverId: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface ChatMessage {
    id: string;
    senderId: string;
    senderName: string;
    senderPhoto?: string;
    text: string;
    createdAt: Timestamp;
}

export const matchmakingService = {
    // ── Matchmaking entries ──

    async getTeamsLooking(sport?: string): Promise<MatchEntry[]> {
        const ref = collection(db, 'matchmaking');
        const conditions = [where('type', '==', 'team'), where('status', '==', 'active')];
        if (sport) conditions.push(where('sport', '==', sport));
        const q = query(ref, ...conditions);
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as MatchEntry))
            .sort((a, b) => ((b.createdAt as any)?.seconds || 0) - ((a.createdAt as any)?.seconds || 0));
    },

    async getPlayersAvailable(sport?: string, position?: string): Promise<MatchEntry[]> {
        const ref = collection(db, 'matchmaking');
        const conditions = [where('type', '==', 'player'), where('status', '==', 'active')];
        if (sport) conditions.push(where('sports', 'array-contains', sport));
        const q = query(ref, ...conditions);
        const snap = await getDocs(q);
        let results = snap.docs.map(d => ({ id: d.id, ...d.data() } as MatchEntry))
            .sort((a, b) => ((b.createdAt as any)?.seconds || 0) - ((a.createdAt as any)?.seconds || 0));
        if (position) results = results.filter(r => r.position === position);
        return results;
    },

    async getMyEntries(userId: string): Promise<MatchEntry[]> {
        const ref = collection(db, 'matchmaking');
        const q = query(ref, where('userId', '==', userId));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as MatchEntry));
    },

    async publishTeam(data: {
        teamId: string; teamName: string; teamImageUrl?: string;
        sport: string; memberCount: number; description?: string;
        region?: string; communes?: string[];
    }, userId: string): Promise<string> {
        const clean: any = { type: 'team', ...data, userId, status: 'active', createdAt: Timestamp.now() };
        if (!clean.city) delete clean.city;
        if (!clean.region) delete clean.region;
        if (!clean.communes || clean.communes.length === 0) delete clean.communes;
        const docRef = await addDoc(collection(db, 'matchmaking'), clean);
        return docRef.id;
    },

    async publishPlayer(data: {
        userId: string; displayName: string; photoURL?: string;
        position: string; ovr: number; tier: string;
        sports: string[]; city?: string; description?: string;
        region?: string; communes?: string[];
    }): Promise<string> {
        const clean: any = {
            type: 'player',
            userId: data.userId,
            displayName: data.displayName,
            position: data.position || 'Jugador',
            ovr: data.ovr || 40,
            tier: data.tier || 'Bronce',
            sports: data.sports || [],
            status: 'active',
            createdAt: Timestamp.now(),
        };
        if (data.photoURL) clean.photoURL = data.photoURL;
        if (data.city) clean.city = data.city;
        if (data.region) clean.region = data.region;
        if (data.communes && data.communes.length > 0) clean.communes = data.communes;
        if (data.description) clean.description = data.description;
        const docRef = await addDoc(collection(db, 'matchmaking'), clean);
        return docRef.id;
    },

    async closeEntry(entryId: string): Promise<void> {
        await updateDoc(doc(db, 'matchmaking', entryId), { status: 'closed' });
    },

    async updateEntry(entryId: string, data: Partial<{ sport: string; sports: string[]; description: string; position: string }>): Promise<void> {
        const clean: any = {};
        if (data.description !== undefined) clean.description = data.description;
        if (data.sport !== undefined) clean.sport = data.sport;
        if (data.sports !== undefined) clean.sports = data.sports;
        if (data.position !== undefined) clean.position = data.position;
        await updateDoc(doc(db, 'matchmaking', entryId), clean);
    },

    // ── Challenges ──

    async createChallenge(data: {
        type: "team_vs_team" | "captain_to_player";
        challengerTeamId?: string; challengerTeamName?: string;
        challengedTeamId?: string; challengedTeamName?: string;
        captainId?: string; captainName?: string;
        playerId?: string; playerName?: string;
        sport: string;
        senderId: string; receiverId: string;
    }): Promise<string> {
        const docRef = await addDoc(collection(db, 'challenges'), {
            ...data,
            status: data.type === 'captain_to_player' ? 'active' : 'pending',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        });
        return docRef.id;
    },

    async getMyChallenges(userId: string): Promise<Challenge[]> {
        const ref = collection(db, 'challenges');
        const [snap1, snap2] = await Promise.all([
            getDocs(query(ref, where('senderId', '==', userId))),
            getDocs(query(ref, where('receiverId', '==', userId))),
        ]);
        const all = [...snap1.docs, ...snap2.docs].map(d => ({ id: d.id, ...d.data() } as Challenge));
        const seen = new Set<string>();
        return all.filter(c => { if (seen.has(c.id)) return false; seen.add(c.id); return true; })
            .sort((a, b) => ((b.updatedAt as any)?.seconds || 0) - ((a.updatedAt as any)?.seconds || 0));
    },

    async acceptChallenge(challengeId: string): Promise<void> {
        await updateDoc(doc(db, 'challenges', challengeId), { status: 'active', updatedAt: Timestamp.now() });
    },

    async declineChallenge(challengeId: string): Promise<void> {
        await updateDoc(doc(db, 'challenges', challengeId), { status: 'declined', updatedAt: Timestamp.now() });
    },

    async closeChallenge(challengeId: string): Promise<void> {
        await updateDoc(doc(db, 'challenges', challengeId), { status: 'closed', updatedAt: Timestamp.now() });
    },

    // ── Chat Messages ──

    subscribeToMessages(challengeId: string, callback: (msgs: ChatMessage[]) => void): () => void {
        const ref = collection(db, 'challenges', challengeId, 'messages');
        const q = query(ref, orderBy('createdAt', 'asc'));
        return onSnapshot(q, (snap) => {
            callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage)));
        });
    },

    // ── Real-time subscriptions ──

    subscribeToTeamsLooking(sport: string | undefined, callback: (entries: MatchEntry[]) => void): () => void {
        const ref = collection(db, 'matchmaking');
        const conditions = [where('type', '==', 'team'), where('status', '==', 'active')];
        if (sport) conditions.push(where('sport', '==', sport));
        const q = query(ref, ...conditions);
        return onSnapshot(q, (snap) => {
            const entries = snap.docs.map(d => ({ id: d.id, ...d.data() } as MatchEntry))
                .sort((a, b) => ((b.createdAt as any)?.seconds || 0) - ((a.createdAt as any)?.seconds || 0));
            callback(entries);
        });
    },

    subscribeToPlayersAvailable(sport: string | undefined, callback: (entries: MatchEntry[]) => void): () => void {
        const ref = collection(db, 'matchmaking');
        const conditions = [where('type', '==', 'player'), where('status', '==', 'active')];
        if (sport) conditions.push(where('sports', 'array-contains', sport));
        const q = query(ref, ...conditions);
        return onSnapshot(q, (snap) => {
            const entries = snap.docs.map(d => ({ id: d.id, ...d.data() } as MatchEntry))
                .sort((a, b) => ((b.createdAt as any)?.seconds || 0) - ((a.createdAt as any)?.seconds || 0));
            callback(entries);
        });
    },

    subscribeToMyEntries(userId: string, callback: (entries: MatchEntry[]) => void): () => void {
        const ref = collection(db, 'matchmaking');
        const q = query(ref, where('userId', '==', userId));
        return onSnapshot(q, (snap) => {
            callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as MatchEntry)));
        });
    },

    subscribeToMyChallenges(userId: string, callback: (challenges: Challenge[]) => void): () => void {
        const ref = collection(db, 'challenges');
        const unsub1 = onSnapshot(query(ref, where('senderId', '==', userId)), (snap1) => {
            const fromSender = snap1.docs.map(d => ({ id: d.id, ...d.data() } as Challenge));
            const unsub2 = onSnapshot(query(ref, where('receiverId', '==', userId)), (snap2) => {
                const fromReceiver = snap2.docs.map(d => ({ id: d.id, ...d.data() } as Challenge));
                const all = [...fromSender, ...fromReceiver];
                const seen = new Set<string>();
                callback(all.filter(c => { if (seen.has(c.id)) return false; seen.add(c.id); return true; })
                    .sort((a, b) => ((b.updatedAt as any)?.seconds || 0) - ((a.updatedAt as any)?.seconds || 0)));
            });
            // Return combined unsubscribe
            return () => unsub2();
        });
        return () => {}; // outer unsub handled by the caller
    },

    async sendMessage(challengeId: string, msg: { senderId: string; senderName: string; senderPhoto?: string; text: string }): Promise<void> {
        await addDoc(collection(db, 'challenges', challengeId, 'messages'), {
            ...msg,
            createdAt: Timestamp.now(),
        });
        await updateDoc(doc(db, 'challenges', challengeId), { updatedAt: Timestamp.now() });
    },
};
