import { collection, query, where, getDocs, doc, getDoc, orderBy, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

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
            const regRef = collection(db, 'tournament_registrations');
            const q = query(regRef, where('tournamentId', '==', tournamentId), where('teamId', '==', teamId));
            const snap = await getDocs(q);
            return !snap.empty;
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

    async registerTeamInTournament(tournamentId: string, teamData: { id: string, name: string, logo?: string }, userId: string, userName: string, price: number) {
        const tournamentRef = doc(db, 'tournaments', tournamentId);
        
        // 1. Verificar si ya existe el registro de pago (para no duplicar)
        const regQ = query(
            collection(db, 'tournament_registrations'),
            where('tournamentId', '==', tournamentId),
            where('teamId', '==', teamData.id)
        );
        const regSnap = await getDocs(regQ);
        
        if (regSnap.empty) {
            await addDoc(collection(db, 'tournament_registrations'), {
                tournamentId,
                teamId: teamData.id,
                teamName: teamData.name,
                userId,
                userName,
                paidAmount: price,
                status: 'confirmed',
                paymentStatus: 'paid',
                createdAt: serverTimestamp()
            });
        }

        // 2. Actualizar el listado de equipos en el torneo de forma segura
        const tDoc = await getDoc(tournamentRef);
        if (tDoc.exists()) {
            const currentData = tDoc.data();
            const currentTeams = currentData.teams || [];
            
            // Solo añadir si el equipo NO está en el array
            const alreadyIn = currentTeams.some((t: any) => t.id === teamData.id || t.userId === userId);
            if (!alreadyIn) {
                await updateDoc(tournamentRef, {
                    teams: [...currentTeams, { 
                        id: teamData.id, 
                        name: teamData.name, 
                        logo: teamData.logo || '',
                        userId: userId, // Guardamos el ID del usuario para verificación
                        registeredAt: new Date().toISOString()
                    }],
                    enrolledTeams: (currentData.enrolledTeams || 0) + 1
                });
            }
        }
    }
};
