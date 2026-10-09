import { doc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';
import { UserProfile } from '../types/user';
import { auditService } from './auditService';

export interface GamificationSettings {
    xpPerCheckin: number;
    xpPerMatch: number;
    xpPerWin: number;
    xpPerMvp: number;
    xpPerNoShow: number;
    xpPerLoss?: number;
    xpPerGoal?: number;
    xpPerAssist?: number;
    tiers: {
        bronze: number;
        silver: number;
        gold: number;
        platinum: number;
        diamond: number;
        elite: number;
        legend: number;
    };
}

export const userService = {
    /**
     * Uploads a base64 image to Firebase Storage and returns the URL
     */
    async uploadProfileImage(uid: string, base64: string): Promise<string> {
        try {
            const storageRef = ref(storage, `avatars/${uid}.jpg`);
            // uploadString handles the data_url format
            await uploadString(storageRef, base64, 'data_url');
            const downloadURL = await getDownloadURL(storageRef);
            return downloadURL;
        } catch (error) {
            console.error('Error uploading image:', error);
            throw error;
        }
    },
    /**
     * Gets the global gamification settings
     */
    async getStaffProfile(uid: string): Promise<{ id: string, data: any } | null> {
        try {
            const staffRef = collection(db, 'staff');
            const q = query(staffRef, where('uid', '==', uid));
            const snap = await getDocs(q);
            if (!snap.empty) {
                return {
                    id: snap.docs[0].id,
                    data: snap.docs[0].data()
                };
            }
            return null;
        } catch (error) {
            console.error('Error fetching staff profile:', error);
            return null;
        }
    },

    async updateStaffProfile(uid: string, data: any): Promise<void> {
        try {
            const staffInfo = await this.getStaffProfile(uid);
            if (staffInfo) {
                const staffRef = doc(db, 'staff', staffInfo.id);
                await updateDoc(staffRef, data);
            }
        } catch (error) {
            console.error('Error updating staff profile:', error);
        }
    },

    async getGamificationSettings(): Promise<GamificationSettings> {
        try {
            const docRef = doc(db, 'settings', 'global');
            const snap = await getDoc(docRef);
            const data = snap.exists() ? snap.data() || {} : {};
            const gamification = data.gamification || {
                xpPerCheckin: 50,
                xpPerMatch: 100,
                xpPerWin: 150,
                xpPerMvp: 200,
                xpPerGoal: 25,
                xpPerAssist: 15,
                xpPerLoss: 50,
                xpPerNoShow: 150,
                tiers: { bronze: 0, silver: 1000, gold: 3000, platinum: 6000, diamond: 10000, elite: 15000, legend: 25000 }
            };
            return {
                ...gamification,
                sportsOverrides: data.sportsOverrides || gamification.sportsOverrides || {},
                badges: data.badges || gamification.badges || {},
                badgeXpValues: data.badgeXpValues || gamification.badgeXpValues || { bronze: 50, silver: 150, gold: 500 },
                tiers: gamification.tiers || data.tiers || { bronze: 0, silver: 1000, gold: 3000, platinum: 6000, diamond: 10000, elite: 15000, legend: 25000 }
            } as any;
        } catch (error) {
            console.error('Error fetching gamification settings:', error);
            throw error;
        }
    },

    /**
     * Calculates the user's tier
     */
    calculateTier(xp: number, settings: GamificationSettings): string {
        const { tiers } = settings;
        if (xp >= tiers.legend) return 'Leyenda';
        if (xp >= tiers.elite) return 'Elite';
        if (xp >= tiers.diamond) return 'Diamante';
        if (xp >= tiers.platinum) return 'Platino';
        if (xp >= tiers.gold) return 'Oro';
        if (xp >= tiers.silver) return 'Plata';
        return 'Bronce';
    },

    /**
     * Fetch user profile data from 'users' collection
     */
    async getUserProfile(uid: string): Promise<UserProfile | null> {
        try {
            const userRef = doc(db, 'users', uid);
            const snap = await getDoc(userRef);
            if (!snap.exists()) return null;
            const data = snap.data();
            return {
                uid: snap.id,
                displayName: data.displayName || 'Staff',
                email: data.email || '',
                photoURL: data.photoURL,
                createdAt: data.createdAt ? (typeof data.createdAt === 'string' ? data.createdAt : new Date(data.createdAt.seconds ? data.createdAt.seconds * 1000 : data.createdAt).toISOString()) : new Date().toISOString(),
                tier: data.tier || 'Bronce',
                ovr: data.ovr || 0,
                stats: data.stats || { 
                    played: 0, won: 0, lost: 0, goals: 0, 
                    skill: 70, stamina: 70, power: 70, fairplay: 90 
                },
                sportRatings: data.sportRatings || {},
                form: data.form || [],
                teamName: data.teamName || 'MVP Staff',
                xp: data.xp || 0,
                role: data.role || 'manager',
                tenantIds: data.tenantIds || [],
                readReceipts: data.readReceipts || {}
            } as UserProfile;
        } catch (error) {
            console.error('Error fetching user profile:', error);
            return null;
        }
    },

    /**
     * Updates user profile data
     */
    async updateUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
        try {
            const userRef = doc(db, 'users', uid);
            await updateDoc(userRef, data as any);

            const internalFields = ['xp', 'ovr', 'tier', 'badges', 'badgeXpBonus', 'stats', 'lastELOUpdate', 'lastBulkSync'];
            const isManualEdit = Object.keys(data).some(key => !internalFields.includes(key));

            if (isManualEdit) {
                await auditService.logAuditEvent({
                    action: 'PERFIL_EDITAR',
                    module: 'Perfil/Móvil',
                    details: `Perfil de usuario ${uid} actualizado manualmente. Campos: ${Object.keys(data).join(', ')}.`,
                    severity: 'LOW',
                    status: 'SUCCESS'
                });
            }
        } catch (error: any) {
            await auditService.logAuditEvent({
                action: 'PERFIL_EDITAR',
                module: 'Perfil/Móvil',
                details: `Falla al actualizar perfil del usuario ${uid}. Error: ${error.message || error}`,
                severity: 'LOW',
                status: 'FAILED'
            });
            throw error;
        }
    },

    /**
     * Deletes user profile document and logs audit event
     */
    async deleteAccount(uid: string): Promise<void> {
        try {
            const userRef = doc(db, 'users', uid);
            await deleteDoc(userRef);

            await auditService.logAuditEvent({
                action: 'CUENTA_ELIMINAR',
                module: 'Perfil/Móvil',
                details: `Cuenta del usuario ${uid} eliminada del sistema de forma definitiva.`,
                severity: 'HIGH',
                status: 'SUCCESS'
            });
        } catch (error: any) {
            await auditService.logAuditEvent({
                action: 'CUENTA_ELIMINAR',
                module: 'Perfil/Móvil',
                details: `Falla al eliminar cuenta del usuario ${uid}. Error: ${error.message || error}`,
                severity: 'HIGH',
                status: 'FAILED'
            });
            throw error;
        }
    },

    /**
     * Awards XP to a user
     */
    async awardXp(uid: string, action: 'checkin' | 'match' | 'win' | 'mvp' | 'noshow'): Promise<void> {
        try {
            const [settings, profile] = await Promise.all([
                this.getGamificationSettings(),
                this.getUserProfile(uid)
            ]);
            if (!profile) return;
            let xpGained = 0;
            switch (action) {
                case 'checkin': xpGained = settings.xpPerCheckin; break;
                case 'match': xpGained = settings.xpPerMatch; break;
                case 'win': xpGained = settings.xpPerWin; break;
                case 'mvp': xpGained = settings.xpPerMvp; break;
                case 'noshow': xpGained = -(settings.xpPerNoShow || 150); break;
            }
            const newXp = Math.max(0, (profile.xp || 0) + xpGained);
            const userRef = doc(db, 'users', uid);
            await updateDoc(userRef, {
                xp: newXp
            });
            await this.recalculateUserStatsAndELO(uid);
        } catch (error) {
            console.error('Error awarding XP:', error);
        }
    },

    /**
     * Recalculates all stats, badges and ELO (OVR) for a user based on Firebase stats and their reserved bookings.
     */
    async recalculateUserStatsAndELO(uid: string, pendingStats?: any): Promise<void> {
        try {
            const [settings, profile] = await Promise.all([
                this.getGamificationSettings(),
                this.getUserProfile(uid)
            ]);
            if (!profile) return;

            // 1. Obtener bookings solo donde el usuario es el que reserva (para checkin, noshow, partido jugado base)
            const bookingsRef = collection(db, "bookings");
            const qByPlayer = query(bookingsRef, where('userId', '==', uid));
            const queries = [getDocs(qByPlayer).catch(() => ({ docs: [] as any[] }))];
            
            if (profile.email && profile.email !== '---') {
                const qByCreator = query(bookingsRef, where('createdBy', '==', profile.email));
                queries.push(getDocs(qByCreator).catch(() => ({ docs: [] as any[] })));
            }

            const snaps = await Promise.all(queries);
            const allDocsMap = new Map<string, any>();
            snaps.forEach(snap => {
                snap.docs.forEach((d) => {
                    if (!allDocsMap.has(d.id)) allDocsMap.set(d.id, d.data());
                });
            });

            let totalCheckins = 0;
            let totalNoShows = 0;
            let matchesReservedAndPlayed = 0;

            Array.from(allDocsMap.values()).forEach(b => {
                const s = b.status;
                const isNoShow = s === 'no-show' || 
                                 b.paymentStatus === 'no-show' || 
                                 b.noShow === true || 
                                 (b.notes && (b.notes.toLowerCase().includes('no-show') || b.notes.toLowerCase().includes('inasistencia')));
                
                if (isNoShow) {
                    totalNoShows++;
                } else if (s === 'completed' || s === 'confirmed' || b.checkOut === true) {
                    matchesReservedAndPlayed++;
                    if (b.checkIn) totalCheckins++;
                }
            });

            // Merge any pending stats (from a match just played) with the existing stats
            const existingStats = {
                ...((profile.stats || {}) as any),
                ...(pendingStats || {})
            };
            
            // 2. Calcular XP basado en los stats existentes en Firebase (Performance) + Reservas (Base)
            let calculatedXp = 0;
            const mainSportKey = ((profile as any).mainSport || 'Fútbol').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const defaultOverrides = { 
                winXP: settings.xpPerWin !== undefined ? settings.xpPerWin : 150, 
                lossXP: settings.xpPerLoss !== undefined ? settings.xpPerLoss : 50, 
                countGoals: true, 
                countAssists: true,
                goalXP: settings.xpPerGoal !== undefined ? settings.xpPerGoal : 25,
                assistXP: settings.xpPerAssist !== undefined ? settings.xpPerAssist : 15
            };
            const overrides = {
                ...defaultOverrides,
                ...((settings as any).sportsOverrides?.[mainSportKey] || {})
            };

            const statsPlayed = Number(existingStats.played || 0);
            const statsWins = Number(existingStats.won || existingStats.wins || 0);
            const statsLosses = Number(existingStats.lost || 0);
            const statsGoals = Number(existingStats.goals || existingStats.scorer || 0);
            const statsAssists = Number(existingStats.assists || existingStats.playmaker || 0);
            const statsMVPs = Number(existingStats.mvps || existingStats.mvp || 0);

            // XP por Performance
            calculatedXp += statsWins * overrides.winXP;
            calculatedXp -= statsLosses * overrides.lossXP;
            if (overrides.countGoals) calculatedXp += statsGoals * overrides.goalXP;
            if (overrides.countAssists) calculatedXp += statsAssists * overrides.assistXP;
            calculatedXp += statsMVPs * (settings.xpPerMvp !== undefined ? settings.xpPerMvp : 200);

            // XP por Juego (Partidos Jugados) + Check-in y No-show (Solo para el que reserva)
            calculatedXp += statsPlayed * (settings.xpPerMatch !== undefined ? settings.xpPerMatch : 100);
            calculatedXp += totalCheckins * (settings.xpPerCheckin !== undefined ? settings.xpPerCheckin : 50);
            calculatedXp -= totalNoShows * (settings.xpPerNoShow !== undefined ? settings.xpPerNoShow : 150);

            calculatedXp = Math.max(0, calculatedXp);

            let rawJoined = new Date();
            if ((profile as any).rawJoined) {
                rawJoined = new Date((profile as any).rawJoined);
            } else if ((profile as any).createdAt?.toDate) {
                rawJoined = (profile as any).createdAt.toDate();
            } else if ((profile as any).createdAt?.seconds) {
                rawJoined = new Date((profile as any).createdAt.seconds * 1000);
            } else if ((profile as any).createdAt) {
                rawJoined = new Date((profile as any).createdAt);
            }
            const daysActive = Math.max(1, (new Date().getTime() - rawJoined.getTime()) / (1000 * 60 * 60 * 24));

            const statsMap: Record<string, number> = {
                scorer: statsGoals, goals: statsGoals,
                playmaker: statsAssists, assists: statsAssists,
                defender: Number(existingStats.clean_sheets || existingStats.defender || 0), clean_sheets: Number(existingStats.clean_sheets || existingStats.defender || 0),
                wins: statsWins, won: statsWins,
                mvp: statsMVPs, mvps: statsMVPs,
                experience: Number(existingStats.played || existingStats.experience || 0), played: Number(existingStats.played || existingStats.experience || 0),
                multi_sport: Number(existingStats.sports_played || existingStats.multi_sport || 1), sports_played: Number(existingStats.sports_played || existingStats.multi_sport || 1),
                captaincy: Number(existingStats.captain_matches || existingStats.captaincy || 0), captain_matches: Number(existingStats.captain_matches || existingStats.captaincy || 0),
                comeback: Number(existingStats.comebacks || existingStats.comeback || 0), comebacks: Number(existingStats.comebacks || existingStats.comeback || 0),
                precision: Number(existingStats.precision_matches || existingStats.precision || 0), precision_matches: Number(existingStats.precision_matches || existingStats.precision || 0),
                clutch: Number(existingStats.clutch_goals || existingStats.clutch || 0), clutch_goals: Number(existingStats.clutch_goals || existingStats.clutch || 0),
                tournaments: Number(existingStats.tournaments_played || existingStats.tournaments || 0), tournaments_played: Number(existingStats.tournaments_played || existingStats.tournaments || 0),
                invictus: Number(existingStats.longest_win_streak || existingStats.invictus || 0), longest_win_streak: Number(existingStats.longest_win_streak || existingStats.invictus || 0),
                rivalry: Number(existingStats.rivalries_won || existingStats.rivalry || 0), rivalries_won: Number(existingStats.rivalries_won || existingStats.rivalry || 0),
                morning_player: Number(existingStats.morning_matches || existingStats.morning_player || 0), morning_matches: Number(existingStats.morning_matches || existingStats.morning_player || 0),
                night_player: Number(existingStats.night_matches || existingStats.night_player || 0), night_matches: Number(existingStats.night_matches || existingStats.night_player || 0),
                loyal: Math.max(Number(existingStats.loyal || existingStats.loyalty || 0), Math.floor(daysActive / 30)), loyalty: Math.max(Number(existingStats.loyal || existingStats.loyalty || 0), Math.floor(daysActive / 30)),
                weekend_warrior: Number(existingStats.weekend_matches || existingStats.weekend_warrior || 0), weekend_matches: Number(existingStats.weekend_matches || existingStats.weekend_warrior || 0),
                stamina: Number(existingStats.minutes_played || existingStats.stamina || 0), minutes_played: Number(existingStats.minutes_played || existingStats.stamina || 0),
                social: Number(existingStats.invited_players || existingStats.social || 0), invited_players: Number(existingStats.invited_players || existingStats.social || 0)
            };

            const badgeConfigs = (settings as any).badges || {};
            const BADGE_XP = (settings as any).badgeXpValues || { bronze: 50, silver: 150, gold: 500 };
            const earnedBadges: any[] = [];
            let badgeXpBonus = 0;

            const normalizeBadgeId = (id: string): string => {
                const normMap: Record<string, string> = {
                    goals: 'scorer', assists: 'playmaker', clean_sheets: 'defender',
                    won: 'wins', played: 'experience', sports_played: 'multi_sport',
                    loyalty: 'loyal'
                };
                return normMap[id] || id;
            };

            Object.keys(badgeConfigs).forEach(badgeId => {
                const config = badgeConfigs[badgeId] || { bronze: 5, silver: 15, gold: 30 };
                const userVal = statsMap[badgeId] || 0;
                let tier = null;

                const goldVal = Number(config.gold || 0);
                const silverVal = Number(config.silver || 0);
                const bronzeVal = Number(config.bronze || 0);

                if (userVal > 0) {
                    if (goldVal > 0 && userVal >= goldVal) { 
                        tier = 'gold'; 
                        badgeXpBonus += BADGE_XP.gold; 
                    } else if (silverVal > 0 && userVal >= silverVal) { 
                        tier = 'silver'; 
                        badgeXpBonus += BADGE_XP.silver; 
                    } else if (bronzeVal > 0 && userVal >= bronzeVal) { 
                        tier = 'bronze'; 
                        badgeXpBonus += BADGE_XP.bronze; 
                    }
                }
                if (tier) {
                    const normId = normalizeBadgeId(badgeId);
                    if (!earnedBadges.some(b => b.id === normId)) {
                        earnedBadges.push({ id: normId, tier, value: userVal });
                    }
                }
            });

            calculatedXp += badgeXpBonus;

            let projectedTier = 'BRONCE';
            if (settings.tiers) {
                const t = settings.tiers;
                if (calculatedXp >= t.legend) projectedTier = 'LEYENDA';
                else if (calculatedXp >= t.elite) projectedTier = 'ÉLITE';
                else if (calculatedXp >= t.diamond) projectedTier = 'DIAMANTE';
                else if (calculatedXp >= t.platinum) projectedTier = 'PLATINO';
                else if (calculatedXp >= t.gold) projectedTier = 'ORO';
                else if (calculatedXp >= t.silver) projectedTier = 'PLATA';
            }

            const maxXP = settings.tiers?.legend || 25000;
            const progress = Math.min(1, Math.sqrt(Math.max(0, calculatedXp) / maxXP));
            const projectedOvr = Math.floor(40 + (progress * 59));

            await this.updateUserProfile(uid, {
                xp: calculatedXp,
                ovr: projectedOvr,
                tier: projectedTier as any,
                badges: earnedBadges,
                badgeXpBonus,
                stats: {
                    ...existingStats,
                    played: statsMap.experience,
                    won: statsMap.wins,
                    lost: Math.max(0, statsMap.experience - statsMap.wins),
                    goals: statsMap.scorer,
                    assists: statsMap.playmaker,
                    mvp: statsMap.mvp,
                    minutes_played: statsMap.stamina,
                    sports_played: statsMap.multi_sport,
                    clean_sheets: statsMap.defender,
                    weekend_matches: statsMap.weekend_warrior,
                    morning_matches: statsMap.morning_player,
                    night_matches: statsMap.night_player,
                    longest_win_streak: statsMap.invictus,
                    loyal: statsMap.loyal
                } as any,
                lastELOUpdate: new Date().toISOString(),
                lastBulkSync: new Date().toISOString()
            } as any);

        } catch (error) {
            console.warn('Could not recalculate ELO (likely permission denied for other players):', error);
        }
    },

    /**
     * Awards XP and updates stats for all participants of an internal match
     */
    async awardInternalMatchXpAndStats(
        teamAssignments: Record<string, 'A' | 'B' | 'N'>,
        memberGoals: Record<string, number>,
        memberAssists: Record<string, number>,
        scoreA: number,
        scoreB: number,
        mvpUid: string | null,
        activeUserUid: string,
        activeUserOutcome: 'win' | 'loss' | 'draw'
    ): Promise<void> {
        try {
            const settings = await this.getGamificationSettings();
            const activeAssignment = teamAssignments[activeUserUid] || 'A';
            
            const promises = Object.entries(teamAssignments).map(async ([uid, assignment]) => {
                if (assignment === 'N' || !assignment) return; // Did not play

                const profile = await this.getUserProfile(uid);
                if (!profile) return;

                let playerOutcome: 'win' | 'loss' | 'draw' = 'draw';
                if (activeUserOutcome === 'draw') {
                    playerOutcome = 'draw';
                } else {
                    const sameTeamAsActive = assignment === activeAssignment;
                    if (activeUserOutcome === 'win') {
                        playerOutcome = sameTeamAsActive ? 'win' : 'loss';
                    } else {
                        playerOutcome = sameTeamAsActive ? 'loss' : 'win';
                    }
                }

                const isWin = playerOutcome === 'win';
                const isLoss = playerOutcome === 'loss';
                const isDraw = playerOutcome === 'draw';
                const goalsScored = memberGoals[uid] || 0;
                const assistsGiven = memberAssists[uid] || 0;
                const isMVP = uid === mvpUid;

                const currentStats = profile.stats || {
                    played: 0, won: 0, lost: 0, goals: 0, assists: 0,
                    skill: 70, stamina: 70, power: 70, fairplay: 90
                };

                const newStats = {
                    ...currentStats,
                    played: (currentStats.played || 0) + 1,
                    won: isWin ? (currentStats.won || 0) + 1 : (currentStats.won || 0),
                    lost: isLoss ? (currentStats.lost || 0) + 1 : (currentStats.lost || 0),
                    goals: (currentStats.goals || 0) + goalsScored,
                    assists: (currentStats.assists || 0) + assistsGiven,
                    mvps: isMVP ? (currentStats.mvps || 0) + 1 : (currentStats.mvps || 0)
                };

                // Pasamos las nuevas stats directamente al recalculador para evitar
                // problemas de concurrencia y lecturas en caché de Firebase (Race Condition)
                await this.recalculateUserStatsAndELO(uid, newStats);
            });

            await Promise.all(promises);
        } catch (error) {
            console.warn('Could not award internal match XP and stats to all players:', error);
        }
    },

    /**
     * Mark a team's chat as read for the user
     */
    async markChatAsRead(uid: string, teamId: string): Promise<void> {
        try {
            const userRef = doc(db, 'users', uid);
            await updateDoc(userRef, {
                [`readReceipts.${teamId}`]: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error marking chat as read:', error);
        }
    }
};

