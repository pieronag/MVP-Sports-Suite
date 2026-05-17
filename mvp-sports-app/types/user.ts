export interface UserStats {
    played: number;
    won: number;
    lost: number;
    goals: number;
    skill: number;
    stamina: number;
    power: number;
    fairplay?: number;
    cleanSheets?: number;
    assists?: number;
    mvps?: number;
    streak?: number;
}


export interface SportRating {
    ovr: number;
    played: number;
    won: number;
    lost: number;
}

export interface UserProfile {
    uid: string;
    email: string;
    displayName: string;
    role: 'player' | 'owner' | 'manager' | 'superadmin';
    /**
     * Recintos permitidos para rol manager/staff (modelo usado por mvp-sports-web).
     * En mobile lo usamos para validar check-in y filtrar dashboard.
     */
    tenantIds?: string[];
    photoURL?: string;
    phoneNumber?: string;
    createdAt: string;
    lastLogin?: string;
    // Player specific / Gamification
    tier?: string;
    ovr?: number;
    stats?: UserStats;
    sportRatings?: Record<string, SportRating>;
    form?: string[];
    teamName?: string;
    xp?: number;
    position?: string;
}

