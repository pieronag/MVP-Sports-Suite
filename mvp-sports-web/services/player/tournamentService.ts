import { collection, query, where, getDocs, doc, getDoc, addDoc, Timestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';

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

    // Inscripción vía servidor (valida capitán y cupos; el pago lo define el servidor)
    async registerTeam(tournamentId: string, teamId: string, payOnline = false): Promise<{ ok?: boolean; url?: string; registrationId: string }> {
        const token = await auth.currentUser?.getIdToken();
        if (!token) throw new Error('Inicia sesión para inscribirte');
        const res = await fetch('/api/tournaments/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ tournamentId, teamId, payOnline }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'No se pudo completar la inscripción');
        return data;
    },

    async isUserRegistered(tournamentId: string, userId: string): Promise<boolean> {
        const q = query(collection(db, 'tournament_registrations'), where('tournamentId', '==', tournamentId), where('userId', '==', userId));
        const snap = await getDocs(q);
        return !snap.empty;
    }
};
