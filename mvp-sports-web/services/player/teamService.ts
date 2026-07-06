import { collection, query, where, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, arrayUnion, arrayRemove, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

export interface Team {
    id: string;
    name: string;
    sport: string;
    description?: string;
    imageUrl?: string;
    ownerId: string;
    members: string[];
    membersMeta?: Record<string, { joinedAt: Timestamp }>;
    joinRequests?: string[];
    inviteCode?: string;
    elo?: number;
    winRate?: number;
    trophies?: number;
    lastMessageAt?: any;
    createdAt: Timestamp;
}

export const teamService = {
    async getUserTeams(userId: string): Promise<Team[]> {
        const teamsRef = collection(db, 'teams');
        const q = query(teamsRef, where('members', 'array-contains', userId));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as Team));
    },

    async getTeamById(teamId: string): Promise<Team | null> {
        const ref = doc(db, 'teams', teamId);
        const snap = await getDoc(ref);
        if (!snap.exists()) return null;
        return { id: snap.id, ...snap.data() } as Team;
    },

    async createTeam(teamData: { name: string; sport: string; ownerId: string }): Promise<string> {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
        const docRef = await addDoc(collection(db, 'teams'), {
            ...teamData,
            members: [teamData.ownerId],
            joinRequests: [],
            inviteCode: code,
            elo: 1000,
            winRate: 0,
            trophies: 0,
            createdAt: Timestamp.now()
        });
        return docRef.id;
    },

    async updateTeam(teamId: string, data: Partial<{ name: string; description: string; sport: string; imageUrl: string }>): Promise<void> {
        const ref = doc(db, 'teams', teamId);
        await updateDoc(ref, data);
    },

    async deleteTeam(teamId: string): Promise<void> {
        const ref = doc(db, 'teams', teamId);
        await deleteDoc(ref);
    },

    async getTeamByInviteCode(code: string): Promise<Team | null> {
        const teamsRef = collection(db, 'teams');
        const q = query(teamsRef, where('inviteCode', '==', code.toUpperCase()));
        const snap = await getDocs(q);
        if (snap.empty) return null;
        return { id: snap.docs[0].id, ...snap.docs[0].data() } as Team;
    },

    // Send join request (adds to joinRequests[], does NOT auto-join)
    async joinTeam(teamId: string, userId: string): Promise<void> {
        const ref = doc(db, 'teams', teamId);
        const snap = await getDoc(ref);
        if (!snap.exists()) throw new Error('Equipo no encontrado');
        const data = snap.data();
        if (data.members?.includes(userId)) throw new Error('Ya eres miembro de este equipo');
        if (data.joinRequests?.includes(userId)) throw new Error('Ya tienes una solicitud pendiente');
        if ((data.members?.length || 0) >= 25) throw new Error('El equipo está lleno (máximo 25 miembros)');
        if ((data.joinRequests?.length || 0) >= 10) throw new Error('El equipo tiene demasiadas solicitudes pendientes');
        await updateDoc(ref, { joinRequests: arrayUnion(userId) });
    },

    // Captain accepts a join request
    async acceptJoinRequest(teamId: string, requesterUid: string, ownerId: string): Promise<void> {
        const ref = doc(db, 'teams', teamId);
        const snap = await getDoc(ref);
        if (!snap.exists()) throw new Error('Equipo no encontrado');
        const data = snap.data();
        if (data.ownerId !== ownerId) throw new Error('Solo el capitán puede aceptar solicitudes');
        await updateDoc(ref, {
            members: arrayUnion(requesterUid),
            joinRequests: arrayRemove(requesterUid)
        });
    },

    // Captain rejects a join request
    async rejectJoinRequest(teamId: string, requesterUid: string, ownerId: string): Promise<void> {
        const ref = doc(db, 'teams', teamId);
        const snap = await getDoc(ref);
        if (!snap.exists()) throw new Error('Equipo no encontrado');
        const data = snap.data();
        if (data.ownerId !== ownerId) throw new Error('Solo el capitán puede rechazar solicitudes');
        await updateDoc(ref, { joinRequests: arrayRemove(requesterUid) });
    },

    // Remove a member (captain only)
    async removeMember(teamId: string, memberId: string, ownerId: string): Promise<void> {
        const ref = doc(db, 'teams', teamId);
        const snap = await getDoc(ref);
        if (!snap.exists()) throw new Error('Equipo no encontrado');
        const data = snap.data();
        if (data.ownerId !== ownerId) throw new Error('Solo el capitán puede expulsar miembros');
        if (memberId === ownerId) throw new Error('No puedes expulsarte a ti mismo');
        await updateDoc(ref, { members: arrayRemove(memberId) });
    },

    // Leave team (member only)
    async leaveTeam(teamId: string, userId: string): Promise<void> {
        const ref = doc(db, 'teams', teamId);
        const snap = await getDoc(ref);
        if (!snap.exists()) throw new Error('Equipo no encontrado');
        const data = snap.data();
        if (data.ownerId === userId) throw new Error('El capitán no puede abandonar el equipo. Transfiere la propiedad o elimina el equipo.');
        await updateDoc(ref, { members: arrayRemove(userId) });
    },

    // Fetch user profiles for a list of UIDs
    async getMemberProfiles(uids: string[]): Promise<Record<string, any>> {
        const result: Record<string, any> = {};
        const chunks: string[][] = [];
        for (let i = 0; i < uids.length; i += 10) chunks.push(uids.slice(i, i + 10));
        for (const chunk of chunks) {
            const q = query(collection(db, 'users'), where('__name__', 'in', chunk));
            const snap = await getDocs(q);
            snap.docs.forEach(d => {
                result[d.id] = { uid: d.id, ...d.data() };
            });
            // Fill missing UIDs with default data
            chunk.forEach(uid => {
                if (!result[uid]) result[uid] = { uid, displayName: uid.slice(0, 8), photoURL: null, tier: 'Bronce', ovr: 40 };
            });
        }
        return result;
    }
};
