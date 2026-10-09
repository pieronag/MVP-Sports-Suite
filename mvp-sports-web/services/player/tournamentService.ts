import { collection, query, where, getDocs, doc, getDoc, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

export const tournamentService = {
    async getTournaments(tenantId?: string) {
        const tournamentsRef = collection(db, 'tournaments');
        const q = tenantId ? query(tournamentsRef, where('tenantId', '==', tenantId)) : query(tournamentsRef);
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },

    async getTournamentById(tournamentId: string) {
        const ref = doc(db, 'tournaments', tournamentId);
        const snap = await getDoc(ref);
        if (!snap.exists()) return null;
        return { id: snap.id, ...snap.data() };
    },

    async registerTeamInTournament(tournamentId: string, team: { id: string; name: string }, userId: string, clientName: string, price: number) {
        const registrationsRef = collection(db, 'tournament_registrations');
        await addDoc(registrationsRef, {
            tournamentId, teamId: team.id, teamName: team.name, userId, clientName, price,
            createdAt: Timestamp.now(), status: 'registered'
        });
    },

    async isUserRegistered(tournamentId: string, userId: string): Promise<boolean> {
        const q = query(collection(db, 'tournament_registrations'), where('tournamentId', '==', tournamentId), where('userId', '==', userId));
        const snap = await getDocs(q);
        return !snap.empty;
    }
};
