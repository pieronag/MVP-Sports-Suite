import { collection, query, where, getDocs, doc, getDoc, addDoc, serverTimestamp, updateDoc, arrayUnion, arrayRemove, Timestamp, deleteDoc } from 'firebase/firestore';
import { db, storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auditService } from './auditService';

export interface Team {
    id: string;
    name: string;
    sport: string;
    description?: string;
    imageUrl?: string;
    members: string[];
    ownerId: string;
    elo?: number;
    winRate?: number;
    trophies?: number;
    inviteCode?: string;
    createdAt: any;
}

/**
 * Generate a random 6-char alphanumeric invite code
 */
function generateInviteCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

export const teamService = {
    async getTeams(): Promise<Team[]> {
        try {
            const teamsRef = collection(db, 'teams');
            const snap = await getDocs(teamsRef);
            return snap.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                imageUrl: doc.data().imageUrl || undefined
            } as Team));
        } catch (error: any) {
            console.error("Error fetching teams listing:", error);
            return [];
        }
    },

    async getUserTeams(userId: string): Promise<Team[]> {
        try {
            const teamsRef = collection(db, 'teams');
            
            const q = query(teamsRef, where('members', 'array-contains', userId));
            const snap = await getDocs(q);
            const memberTeams = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));

            const qOwner = query(teamsRef, where('ownerId', '==', userId));
            const snapOwner = await getDocs(qOwner);
            const ownerTeams = snapOwner.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));

            const allTeams = [...memberTeams, ...ownerTeams];
            const uniqueTeams = allTeams.filter((team, index, self) =>
                index === self.findIndex((t) => t.id === team.id)
            );

            return uniqueTeams;
        } catch (error) {
            console.error("Error fetching user teams:", error);
            return [];
        }
    },

    async getTeamById(id: string): Promise<Team | null> {
        try {
            const teamDoc = await getDoc(doc(db, 'teams', id));
            if (teamDoc.exists()) {
                return { id: teamDoc.id, ...teamDoc.data() } as Team;
            }
            return null;
        } catch (error) {
            console.error("Error fetching team by ID:", error);
            throw error;
        }
    },

    async joinTeam(teamId: string, userId: string): Promise<void> {
        try {
            const teamRef = doc(db, 'teams', teamId);
            await updateDoc(teamRef, {
                members: arrayUnion(userId)
            });
            await auditService.logAuditEvent({
                action: 'EQUIPO_UNIRSE',
                module: 'Equipos/Móvil',
                details: `Usuario ${userId} se unió al equipo ${teamId}.`,
                severity: 'LOW',
                status: 'SUCCESS'
            });
        } catch (error: any) {
            await auditService.logAuditEvent({
                action: 'EQUIPO_UNIRSE',
                module: 'Equipos/Móvil',
                details: `Falla al unirse al equipo ${teamId} para el usuario ${userId}. Error: ${error.message || error}`,
                severity: 'LOW',
                status: 'FAILED'
            });
            throw error;
        }
    },

    async leaveTeam(teamId: string, userId: string): Promise<void> {
        try {
            const teamRef = doc(db, 'teams', teamId);
            await updateDoc(teamRef, {
                members: arrayRemove(userId)
            });
            await auditService.logAuditEvent({
                action: 'EQUIPO_SALIR',
                module: 'Equipos/Móvil',
                details: `Usuario ${userId} salió del equipo ${teamId}.`,
                severity: 'LOW',
                status: 'SUCCESS'
            });
        } catch (error: any) {
            await auditService.logAuditEvent({
                action: 'EQUIPO_SALIR',
                module: 'Equipos/Móvil',
                details: `Falla al salir del equipo ${teamId} para el usuario ${userId}. Error: ${error.message || error}`,
                severity: 'LOW',
                status: 'FAILED'
            });
            throw error;
        }
    },

    async createTeam(name: string, sport: string, ownerId: string): Promise<string> {
        try {
            const inviteCode = generateInviteCode();
            const teamData = {
                name,
                sport,
                ownerId,
                members: [ownerId],
                elo: 1000,
                winRate: 0,
                trophies: 0,
                inviteCode,
                createdAt: serverTimestamp()
            };
            const docRef = await addDoc(collection(db, 'teams'), teamData);

            await auditService.logAuditEvent({
                action: 'EQUIPO_CREAR',
                module: 'Equipos/Móvil',
                details: `Equipo "${name}" creado exitosamente (ID: ${docRef.id}, Deporte: ${sport}). Capitán: ${ownerId}.`,
                severity: 'LOW',
                status: 'SUCCESS'
            });

            return docRef.id;
        } catch (error: any) {
            await auditService.logAuditEvent({
                action: 'EQUIPO_CREAR',
                module: 'Equipos/Móvil',
                details: `Falla al crear el equipo "${name}". Error: ${error.message || error}`,
                severity: 'LOW',
                status: 'FAILED'
            });
            throw error;
        }
    },

    /**
     * Update team details (name, sport, description, imageUrl)
     */
    async updateTeam(teamId: string, data: Partial<Pick<Team, 'name' | 'sport' | 'description' | 'imageUrl'>>): Promise<void> {
        try {
            const teamRef = doc(db, 'teams', teamId);
            await updateDoc(teamRef, {
                ...data,
                updatedAt: serverTimestamp()
            });

            await auditService.logAuditEvent({
                action: 'EQUIPO_EDITAR',
                module: 'Equipos/Móvil',
                details: `Equipo ${teamId} actualizado exitosamente. Campos: ${Object.keys(data).join(', ')}.`,
                severity: 'LOW',
                status: 'SUCCESS'
            });
        } catch (error: any) {
            await auditService.logAuditEvent({
                action: 'EQUIPO_EDITAR',
                module: 'Equipos/Móvil',
                details: `Falla al actualizar el equipo ${teamId}. Error: ${error.message || error}`,
                severity: 'LOW',
                status: 'FAILED'
            });
            throw error;
        }
    },

    /**
     * Generate or regenerate invite code for a team
     */
    async generateInviteCode(teamId: string): Promise<string> {
        const code = generateInviteCode();
        const teamRef = doc(db, 'teams', teamId);
        await updateDoc(teamRef, { inviteCode: code });
        return code;
    },

    /**
     * Join a team using an invite code
     */
    async joinByInviteCode(code: string, userId: string): Promise<{ success: boolean; teamName?: string; error?: string }> {
        try {
            const teamsRef = collection(db, 'teams');
            const q = query(teamsRef, where('inviteCode', '==', code.toUpperCase()));
            const snap = await getDocs(q);

            if (snap.empty) {
                return { success: false, error: 'Código de invitación no válido.' };
            }

            const teamDoc = snap.docs[0];
            const teamData = teamDoc.data();

            if (teamData.members?.includes(userId)) {
                return { success: false, error: 'Ya eres miembro de este equipo.' };
            }

            if ((teamData.members?.length || 0) >= 15) {
                return { success: false, error: 'El equipo está lleno (máx. 15 agentes).' };
            }

            await updateDoc(doc(db, 'teams', teamDoc.id), {
                members: arrayUnion(userId)
            });

            await auditService.logAuditEvent({
                action: 'EQUIPO_UNIRSE',
                module: 'Equipos/Móvil',
                details: `Usuario ${userId} se unió al equipo "${teamData.name}" (ID: ${teamDoc.id}) usando código de invitación.`,
                severity: 'LOW',
                status: 'SUCCESS'
            });

            return { success: true, teamName: teamData.name };
        } catch (error: any) {
            console.error("Error joining by invite code:", error);
            await auditService.logAuditEvent({
                action: 'EQUIPO_UNIRSE',
                module: 'Equipos/Móvil',
                details: `Falla al unirse al equipo con código ${code} para el usuario ${userId}. Error: ${error.message || error}`,
                severity: 'LOW',
                status: 'FAILED'
            });
            return { success: false, error: 'Error al unirse. Intenta de nuevo.' };
        }
    },

    /**
     * Remove a member from a team (only owner can do this)
     */
    async removeMember(teamId: string, memberId: string, ownerId: string): Promise<void> {
        try {
            const team = await this.getTeamById(teamId);
            if (!team || team.ownerId !== ownerId) {
                throw new Error('Solo el capitán puede expulsar miembros.');
            }
            if (memberId === ownerId) {
                throw new Error('El capitán no puede expulsarse a sí mismo.');
            }
            const teamRef = doc(db, 'teams', teamId);
            await updateDoc(teamRef, {
                members: arrayRemove(memberId)
            });
            await auditService.logAuditEvent({
                action: 'EQUIPO_SALIR',
                module: 'Equipos/Móvil',
                details: `Miembro ${memberId} expulsado del equipo "${team.name}" (ID: ${teamId}) por el capitán ${ownerId}.`,
                severity: 'LOW',
                status: 'SUCCESS'
            });
        } catch (error: any) {
            await auditService.logAuditEvent({
                action: 'EQUIPO_SALIR',
                module: 'Equipos/Móvil',
                details: `Falla al expulsar miembro ${memberId} del equipo ${teamId}. Error: ${error.message || error}`,
                severity: 'LOW',
                status: 'FAILED'
            });
            throw error;
        }
    },

    /**
     * Transfer team ownership
     */
    async transferOwnership(teamId: string, currentOwnerId: string, newOwnerId: string): Promise<void> {
        const team = await this.getTeamById(teamId);
        if (!team || team.ownerId !== currentOwnerId) {
            throw new Error('Solo el capitán actual puede transferir liderazgo.');
        }
        const teamRef = doc(db, 'teams', teamId);
        await updateDoc(teamRef, {
            members: arrayUnion(currentOwnerId, newOwnerId)
        });
    },

    /**
     * Permanently delete a team
     */
    async deleteTeam(teamId: string): Promise<void> {
        const teamRef = doc(db, 'teams', teamId);
        await deleteDoc(teamRef);
    }
};
