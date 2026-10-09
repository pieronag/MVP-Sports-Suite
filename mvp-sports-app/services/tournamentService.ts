import { collection, query, where, getDocs, doc, getDoc, orderBy, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db, auth } from './firebase';

export interface Tournament {
    id: string;
    name: string;
    category: string;
    description: string;
    enrolledTeams: number;
    maxTeams: number;
    price: number;
    registrationEndDate: string;
    registrationStartDate: string;
    skillLevel: string;
    status: string;
    tournamentStartDate: string;
    tournamentEndDate: string;
    type: string;
    isVisibleInApp: boolean;
    image?: string; 
    imageUrl?: string;
    location?: string;
    venueName?: string;
    coordinates?: any;
    sport?: string;
    tenantId?: string;
    createdAt?: any;
    rules?: string;
    prizes?: string;
    prize1st?: string;
    prize2nd?: string;
    prize3rd?: string;
    prize1?: string;
    prize2?: string;
    prize3?: string;
    teams?: any[];
}

export const tournamentService = {
    async getTournaments(): Promise<Tournament[]> {
        try {
            const tournamentsRef = collection(db, 'tournaments');
            const q = query(
                tournamentsRef, 
                where('isVisibleInApp', '==', true)
            );
            
            const snap = await getDocs(q);
            
            const tournaments = snap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Tournament));
            
            return tournaments.sort((a, b) => {
                const dateA = a.createdAt?.seconds ? a.createdAt.toMillis() : (a.createdAt instanceof Date ? a.createdAt.getTime() : 0);
                const dateB = b.createdAt?.seconds ? b.createdAt.toMillis() : (b.createdAt instanceof Date ? b.createdAt.getTime() : 0);
                return dateB - dateA;
            });
        } catch (error: any) {
            console.error("Error al obtener torneos:", error.message);
            return [];
        }
    },

    async getTournamentById(id: string): Promise<Tournament | null> {
        try {
            const tournamentDoc = await getDoc(doc(db, 'tournaments', id));
            if (tournamentDoc.exists()) {
                return { id: tournamentDoc.id, ...tournamentDoc.data() } as Tournament;
            }
            return null;
        } catch (error) {
            console.error("Error fetching tournament by ID:", error);
            throw error;
        }
    },

    async isTeamRegistered(tournamentId: string, teamId: string): Promise<boolean> {
        try {
            // Lista pública de equipos del torneo (las inscripciones solo las lee su titular)
            const tSnap = await getDoc(doc(db, 'tournaments', tournamentId));
            return ((tSnap.data()?.teams || []) as any[]).some((t) => t.id === teamId);
        } catch (error) {
            console.error("Error checking registration:", error);
            return false;
        }
    },

    async isUserRegistered(tournamentId: string, userId: string): Promise<boolean> {
        try {
            const regRef = collection(db, 'tournament_registrations');
            const q = query(regRef, where('tournamentId', '==', tournamentId), where('userId', '==', userId));
            const snap = await getDocs(q);
            return !snap.empty;
        } catch (error) {
            console.error("Error checking user registration:", error);
            return false;
        }
    },

    /**
     * Inscripción vía servidor (valida capitán, cupos y duplicados; el estado de
     * pago lo define el servidor). payOnline devuelve la URL de Mercado Pago.
     */
    async registerTeam(tournamentId: string, teamId: string, payOnline = false): Promise<{ ok?: boolean; url?: string; registrationId: string }> {
        const token = await auth.currentUser?.getIdToken();
        if (!token) throw new Error('INICIA SESIÓN PARA INSCRIBIRTE');
        const base = (process.env.EXPO_PUBLIC_API_URL || 'https://mvpsports.cl').replace(/\/$/, '');
        const res = await fetch(`${base}/api/tournaments/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ tournamentId, teamId, payOnline }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error((data.error || 'NO SE PUDO COMPLETAR LA INSCRIPCIÓN').toUpperCase());
        return data;
    }
};
