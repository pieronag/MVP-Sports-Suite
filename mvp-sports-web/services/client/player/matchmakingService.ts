import { collection, query, where, getDocs, addDoc, getDoc, doc, updateDoc, deleteDoc, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/services/client/firebase';
import { canonicalSport } from '@/utils/sports';

export interface MatchEntry {
    id: string;
    type: "team" | "player" | "need";
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
    // type "need": partido reservado que busca jugadores
    bookingId?: string; tenantName?: string; courtName?: string; day?: string; startTime?: string; needed?: number;
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
        const mine = await getDocs(query(collection(db, 'matchmaking'), where('userId', '==', userId), where('teamId', '==', data.teamId), where('status', '==', 'active')));
        if (!mine.empty) throw new Error('Este equipo ya está publicado');
        const clean: any = { type: 'team', teamId: data.teamId, teamName: data.teamName, sport: canonicalSport(data.sport), memberCount: data.memberCount, userId, status: 'active', createdAt: Timestamp.now() };
        if (data.teamImageUrl) clean.teamImageUrl = data.teamImageUrl;
        if (data.description) clean.description = data.description;
        if (data.region) clean.region = data.region;
        if (data.communes && data.communes.length > 0) clean.communes = data.communes;
        const docRef = await addDoc(collection(db, 'matchmaking'), clean);
        return docRef.id;
    },

    async publishPlayer(data: {
        userId: string; displayName: string; photoURL?: string;
        position: string; ovr: number; tier: string;
        sports: string[]; city?: string; description?: string;
        region?: string; communes?: string[];
    }): Promise<string> {
        const mine = await getDocs(query(collection(db, 'matchmaking'), where('userId', '==', data.userId), where('type', '==', 'player'), where('status', '==', 'active')));
        if (!mine.empty) throw new Error('Ya tienes tu disponibilidad publicada');
        const clean: any = {
            type: 'player',
            userId: data.userId,
            displayName: data.displayName,
            position: data.position || 'Jugador',
            ovr: data.ovr || 40,
            tier: data.tier || 'Bronce',
            sports: [...new Set((data.sports || []).map(canonicalSport))],
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

    // ── Completar equipo: un partido reservado que busca jugadores ──
    async publishNeed(data: { userId: string; displayName: string; photoURL?: string; sport: string; bookingId: string; tenantName: string; courtName: string; day: string; startTime: string; needed: number; communes?: string[] }): Promise<string> {
        const mine = await getDocs(query(collection(db, 'matchmaking'), where('userId', '==', data.userId), where('bookingId', '==', data.bookingId), where('status', '==', 'active')));
        if (!mine.empty) { await updateDoc(mine.docs[0].ref, { needed: data.needed }); return mine.docs[0].id; }
        const clean: any = { type: 'need', status: 'active', createdAt: Timestamp.now(), ...data };
        Object.keys(clean).forEach((k) => clean[k] === undefined && delete clean[k]);
        return (await addDoc(collection(db, 'matchmaking'), clean)).id;
    },

    async getNeeds(): Promise<MatchEntry[]> {
        const snap = await getDocs(query(collection(db, 'matchmaking'), where('type', '==', 'need'), where('status', '==', 'active')));
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const pad = (n: number) => String(n).padStart(2, '0');
        const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
        return snap.docs.map((d) => ({ id: d.id, ...d.data() } as MatchEntry))
            .filter((e) => (e.day || '') >= todayStr)
            .sort((a, b) => `${a.day} ${a.startTime}`.localeCompare(`${b.day} ${b.startTime}`));
    },

    async getMyNeed(userId: string, bookingId: string): Promise<MatchEntry | null> {
        const snap = await getDocs(query(collection(db, 'matchmaking'), where('userId', '==', userId), where('bookingId', '==', bookingId), where('status', '==', 'active')));
        return snap.empty ? null : ({ id: snap.docs[0].id, ...snap.docs[0].data() } as MatchEntry);
    },

    async closeEntry(entryId: string): Promise<void> {
        await updateDoc(doc(db, 'matchmaking', entryId), { status: 'closed' });
    },

    async updateEntry(entryId: string, data: Partial<{ sport: string; sports: string[]; description: string; position: string }>): Promise<void> {
        const clean: any = {};
        if (data.description !== undefined) clean.description = data.description;
        if (data.sport !== undefined) clean.sport = canonicalSport(data.sport);
        if (data.sports !== undefined) clean.sports = [...new Set(data.sports.map(canonicalSport))];
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
        const q1 = query(ref, where('senderId', '==', userId));
        const q2 = query(ref, where('receiverId', '==', userId));
        let snap1Cache: Challenge[] = [];
        let snap2Cache: Challenge[] = [];
        const merge = () => {
            const all = [...snap1Cache, ...snap2Cache];
            const seen = new Set<string>();
            callback(all.filter(c => { if (seen.has(c.id)) return false; seen.add(c.id); return true; })
                .sort((a, b) => ((b.updatedAt as any)?.seconds || 0) - ((a.updatedAt as any)?.seconds || 0)));
        };
        const unsub1 = onSnapshot(q1, (snap) => { snap1Cache = snap.docs.map(d => ({ id: d.id, ...d.data() } as Challenge)); merge(); });
        const unsub2 = onSnapshot(q2, (snap) => { snap2Cache = snap.docs.map(d => ({ id: d.id, ...d.data() } as Challenge)); merge(); });
        return () => { unsub1(); unsub2(); };
    },

    async sendMessage(challengeId: string, msg: { senderId: string; senderName: string; senderPhoto?: string; text: string }): Promise<void> {
        await addDoc(collection(db, 'challenges', challengeId, 'messages'), {
            ...msg,
            createdAt: Timestamp.now(),
        });
        await updateDoc(doc(db, 'challenges', challengeId), { updatedAt: Timestamp.now() });
    },
};
