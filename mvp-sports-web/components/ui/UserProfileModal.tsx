"use client";
import React, { useEffect, useState } from 'react';
import { db } from '@/services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import {
    XMarkIcon,
    EnvelopeIcon,
    UserGroupIcon,
    TrophyIcon,
    ShieldCheckIcon,
    StarIcon,
    ClockIcon,
    FireIcon,
    SparklesIcon,
    BoltIcon,
    CursorArrowRippleIcon,
    HandRaisedIcon,
    ArrowPathRoundedSquareIcon,
    VariableIcon,
    HeartIcon,
    CpuChipIcon,
    AcademicCapIcon
} from '@heroicons/react/24/outline';

interface UserProfileModalProps {
    user: any;
    isOpen: boolean;
    onClose: () => void;
}

export default function UserProfileModal({ user, isOpen, onClose }: UserProfileModalProps) {
    const [gamification, setGamification] = useState<any>(null);

    useEffect(() => {
        if (isOpen) {
            const fetchGamification = async () => {
                try {
                    const snap = await getDoc(doc(db, 'settings', 'global'));
                    if (snap.exists()) {
                        const data = snap.data();
                        setGamification({
                            ...data.gamification,
                            badges: data.badges || data.gamification?.badges || {}
                        });
                    }
                } catch (error) {
                    console.error("Error fetching gamification settings in UserProfileModal:", error);
                }
            };
            fetchGamification();
        }
    }, [isOpen]);

    if (!isOpen || !user) return null;

    const name = user.name || user.displayName || 'Sin Nombre';
    const email = user.email || '---';
    const role = user.role || 'Jugador';
    const ovr = user.ovr || 40;
    const tier = user.tier || 'Bronce';
    const teamList = user.teamList || [];
    const photoURL = user.photoURL || '';
    const stats = user.stats || { played: 0, won: 0, lost: 0, goals: 0 };
    const efficiency = user.efficiency || 0;
    const joinedStr = user.joined || '---';

    // Rango y Experiencia
    const xp = user.xp || 0;
    const tiers = gamification?.tiers || {
        bronze: 0,
        silver: 1000,
        gold: 3000,
        platinum: 6000,
        diamond: 10000,
        elite: 15000,
        legend: 25000
    };

    const RANGOS = [
        { id: 'bronze', name: 'BRONCE', min: tiers.bronze || 0, color: 'text-amber-700 bg-amber-700/10' },
        { id: 'silver', name: 'PLATA', min: tiers.silver || 1000, color: 'text-slate-400 bg-slate-400/10' },
        { id: 'gold', name: 'ORO', min: tiers.gold || 3000, color: 'text-amber-500 bg-amber-500/10' },
        { id: 'platinum', name: 'PLATINO', min: tiers.platinum || 6000, color: 'text-blue-500 bg-blue-500/10' },
        { id: 'diamond', name: 'DIAMANTE', min: tiers.diamond || 10000, color: 'text-cyan-500 bg-cyan-500/10' },
        { id: 'elite', name: 'ELITE', min: tiers.elite || 15000, color: 'text-emerald-500 bg-emerald-500/10' },
        { id: 'legend', name: 'LEYENDA', min: tiers.legend || 25000, color: 'text-purple-500 bg-purple-500/10' }
    ];

    let rangoActual = RANGOS[0];
    let siguienteRango = RANGOS[1];

    for (let i = 0; i < RANGOS.length; i++) {
        if (xp >= RANGOS[i].min) {
            rangoActual = RANGOS[i];
            siguienteRango = RANGOS[i + 1] || RANGOS[i];
        }
    }

    const puntosEnEsteRango = xp - rangoActual.min;
    const puntosNecesarios = siguienteRango.min - rangoActual.min;
    const progreso = siguienteRango.id === rangoActual.id ? 100 : Math.min(100, Math.round((puntosEnEsteRango / puntosNecesarios) * 100));

    // Fusión híbrida de insignias ganadas (sincronizada 100% con móvil y bulk recalculate)
    const savedBadges = user?.badges || [];
    let rawJoined = new Date();
    if (user?.rawJoined) {
        rawJoined = new Date(user.rawJoined);
    } else if (user?.raw?.createdAt?.toDate) {
        rawJoined = user.raw.createdAt.toDate();
    } else if (user?.raw?.createdAt?.seconds) {
        rawJoined = new Date(user.raw.createdAt.seconds * 1000);
    } else if (user?.raw?.createdAt) {
        rawJoined = new Date(user.raw.createdAt);
    } else if (user?.createdAt?.toDate) {
        rawJoined = user.createdAt.toDate();
    } else if (user?.createdAt?.seconds) {
        rawJoined = new Date(user.createdAt.seconds * 1000);
    } else if (user?.createdAt) {
        rawJoined = new Date(user.createdAt);
    } else if (user?.joinedDate) {
        rawJoined = new Date(user.joinedDate);
    } else if (user?.joined) {
        rawJoined = new Date(user.joined);
    }
    const daysActive = Math.max(1, (new Date().getTime() - rawJoined.getTime()) / (1000 * 60 * 60 * 24));

    const statsMap: Record<string, number> = {
        scorer: stats.goals || 0,
        playmaker: stats.assists || 0,
        defender: stats.clean_sheets || 0,
        wins: stats.won || 0,
        mvp: stats.mvps || stats.mvp || 0,
        experience: stats.played || 0,
        multi_sport: stats.sports_played || 1,
        captaincy: stats.captain_matches || 0,
        comeback: stats.comebacks || 0,
        precision: stats.precision_matches || 0,
        clutch: stats.clutch_goals || 0,
        tournaments: stats.tournaments_played || 0,
        invictus: stats.longest_win_streak || 0,
        rivalry: stats.rivalries_won || 0,
        morning_player: stats.morning_matches || 0,
        night_player: stats.night_matches || 0,
        loyal: Math.floor(daysActive / 30), 
        weekend_warrior: stats.weekend_matches || 0,
        stamina: stats.minutes_played || (stats.played || 0) * 60,
        social: stats.invited_players || 0
    };

    const badgeConfigs = gamification?.badges || {};
    const computedBadgesMap = new Map<string, string>();

    // 1. Guardadas
    const normalizeBadgeId = (id: string): string => {
        const normMap: Record<string, string> = {
            goals: 'scorer', assists: 'playmaker', clean_sheets: 'defender',
            won: 'wins', played: 'experience', sports_played: 'multi_sport',
            loyalty: 'loyal'
        };
        return normMap[id] || id;
    };
    savedBadges.forEach((b: any) => {
        if (b.tier) {
            const normId = normalizeBadgeId(b.id);
            computedBadgesMap.set(normId, b.tier);
        }
    });

    // 2. Fusionar
    const tierScores: Record<string, number> = { gold: 3, silver: 2, bronze: 1 };
    const ALL_BADGE_IDS = [
        'scorer', 'playmaker', 'defender', 'wins', 'mvp', 'experience', 'multi_sport',
        'captaincy', 'comeback', 'precision', 'clutch', 'tournaments', 'invictus',
        'rivalry', 'morning_player', 'night_player', 'loyal', 'weekend_warrior', 'stamina', 'social'
    ];
    ALL_BADGE_IDS.forEach(id => {
        const dbKeys: Record<string, string> = {
            scorer: 'goals',
            playmaker: 'assists',
            defender: 'clean_sheets',
            wins: 'won',
            experience: 'played',
            multi_sport: 'sports_played',
            loyal: 'loyalty'
        };
        const dbKey = dbKeys[id] || id;
        const config = badgeConfigs[id] || badgeConfigs[dbKey] || { bronze: 5, silver: 15, gold: 30 };
        const userVal = statsMap[id] || 0;
        let computedTier: string | null = null;

        const goldVal = Number(config.gold || 0);
        const silverVal = Number(config.silver || 0);
        const bronzeVal = Number(config.bronze || 0);

        if (userVal > 0) {
            if (goldVal > 0 && userVal >= goldVal) computedTier = 'gold';
            else if (silverVal > 0 && userVal >= silverVal) computedTier = 'silver';
            else if (bronzeVal > 0 && userVal >= bronzeVal) computedTier = 'bronze';
        }

        if (computedTier) {
            const existingTier = computedBadgesMap.get(id);
            if (!existingTier || (tierScores[computedTier] > tierScores[existingTier])) {
                computedBadgesMap.set(id, computedTier);
            }
        } else {
            computedBadgesMap.delete(id);
        }
    });

    const finalBadges = Array.from(computedBadgesMap.entries())
        .map(([id, tier]) => ({ id, tier }))
        .sort((a, b) => (tierScores[b.tier] || 0) - (tierScores[a.tier] || 0));

    const getTierConfig = (t: string) => {
        const lowerT = t.toLowerCase();
        if (lowerT.includes('elite') || lowerT.includes('legend')) return { color: 'from-emerald-500 to-teal-700', badge: 'bg-emerald-600' };
        if (lowerT.includes('diamond')) return { color: 'from-cyan-500 to-blue-600', badge: 'bg-cyan-600' };
        if (lowerT.includes('gold')) return { color: 'from-amber-400 to-yellow-600', badge: 'bg-amber-500' };
        return { color: 'from-slate-400 to-slate-600', badge: 'bg-slate-500' };
    };

    const tierStyle = getTierConfig(rangoActual.name);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div
                className="bg-white dark:bg-[#0B0F19] w-full max-w-4xl rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.3)] border border-slate-100 dark:border-white/5 overflow-hidden flex flex-col relative max-h-[90vh] animate-in zoom-in duration-500"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Cabecera con Degradado Sutil */}
                <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-slate-50 dark:from-white/[0.03] to-transparent pointer-events-none"></div>

                {/* Botón Cerrar Minimalista */}
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all z-50 bg-white/50 dark:bg-white/5 rounded-full backdrop-blur-md"
                >
                    <XMarkIcon className="w-5 h-5" />
                </button>

                {/* CONTENIDO PRINCIPAL DEL PERFIL */}
                <div className="p-8 md:p-12 space-y-10 overflow-y-auto max-h-[85vh] custom-scrollbar relative z-10">
                        
                        {/* Identidad */}
                        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                            <div className="relative shrink-0 group">
                                <div className="w-24 h-24 rounded-3xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 shadow-2xl overflow-hidden flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                                    {photoURL ? (
                                        <img src={photoURL} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-4xl font-black text-slate-200 dark:text-slate-700">{name.charAt(0)}</span>
                                    )}
                                </div>
                                <div className={`absolute -bottom-1 -right-1 w-8 h-8 rounded-xl flex items-center justify-center font-black border-4 border-white dark:border-[#0B0F19] shadow-xl bg-gradient-to-br ${tierStyle.color} text-white text-xs`}>
                                    {ovr}
                                </div>
                            </div>

                            <div className="flex-1 text-center md:text-left">
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-2">
                                    <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border shadow-sm ${user.status === 'Activo' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' : 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20'}`}>
                                        {user.status ? user.status.toUpperCase() : 'ACTIVO'}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest bg-slate-50 text-slate-500 border border-slate-100 dark:bg-white/5 dark:text-slate-400 dark:border-white/10 shadow-sm">
                                        {role.toUpperCase()}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border shadow-sm ${rangoActual.color}`}>
                                        RANGO {rangoActual.name}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-sm font-mono">
                                        {xp.toLocaleString()} XP
                                    </span>
                                </div>
                                <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tighter leading-none mb-2 uppercase">
                                    {name}
                                </h2>

                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-1">
                                    <span className="text-slate-400 dark:text-slate-500 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
                                        <EnvelopeIcon className="w-3.5 h-3.5 text-emerald-500" /> {email.toUpperCase()}
                                    </span>
                                    <span className="text-slate-400 dark:text-slate-500 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
                                        <ClockIcon className="w-3.5 h-3.5 text-emerald-500" /> MIEMBRO DESDE {joinedStr.toUpperCase()}
                                    </span>
                                </div>
                            </div>
                        </div>
                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                            {[
                                { label: 'Partidos', val: stats.played, color: 'text-slate-600 dark:text-slate-300', icon: <UserGroupIcon /> },
                                { label: 'Ganados', val: stats.won, color: 'text-emerald-500', icon: <TrophyIcon /> },
                                { label: 'Perdidos', val: stats.lost, color: 'text-rose-400', icon: <HandRaisedIcon /> },
                                { label: 'Goles', val: stats.goals, color: 'text-amber-500', icon: <FireIcon /> },
                                { label: 'Asistencias', val: stats.assists || 0, color: 'text-teal-500', icon: <SparklesIcon /> },
                            ].map((s, i) => (
                                <div key={i} className="group relative p-4 rounded-2xl border border-slate-50 dark:border-white/5 bg-white dark:bg-[#0B0F19] shadow-sm">
                                    <div className="relative z-10 flex flex-col items-center">
                                        <div className={`w-6 h-6 mb-1 rounded-lg flex items-center justify-center bg-slate-50 dark:bg-white/5 ${s.color}`}>
                                            <div className="w-3 h-3">{s.icon}</div>
                                        </div>
                                        <span className={`text-xl font-black leading-none ${s.color}`}>{s.val}</span>
                                        <span className="text-[7px] font-black uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500 mt-1">{s.label.toUpperCase()}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Clubes Registrados */}
                        <div className="space-y-3">
                            <h3 className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-[0.2em] flex items-center gap-2">
                                <StarIcon className="w-3.5 h-3.5 text-emerald-500" /> Clubes
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {teamList.length > 0 ? (
                                    teamList.map((t: string, idx: number) => (
                                        <div key={idx} className="px-3 py-1.5 bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-300 text-[8px] font-black rounded-lg uppercase border border-slate-100 dark:border-white/10 flex items-center gap-2 shadow-sm">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                            {t.toUpperCase()}
                                        </div>
                                    ))
                                ) : (
                                    <span className="text-[9px] font-bold text-slate-300 dark:text-slate-700 uppercase">SIN AFILIACIÓN DE EQUIPO</span>
                                )}
                            </div>
                        </div>

                        {/* Vitrina de Insignias Dinámicas */}
                        <div className="space-y-6">
                            <h3 className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-[0.3em] flex items-center gap-2">
                                <TrophyIcon className="w-4 h-4 text-amber-500" /> VITRINA DE INSIGNIAS GANADAS
                            </h3>

                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {finalBadges && finalBadges.length > 0 ? (
                                    finalBadges.map((badge: any, idx: number) => {
                                        const config = getBadgeUIConfig(badge.id, badge.tier);
                                        const Icon = config.icon;
                                        const BADGE_XP_VALUES: Record<string, number> = gamification?.badgeXpValues || { bronze: 50, silver: 150, gold: 500 };
                                        const xpBonus = BADGE_XP_VALUES[badge.tier] || 0;
                                        return (
                                            <div key={idx} title={config.desc} className={`p-4 rounded-3xl border flex items-center gap-4 transition-all hover:-translate-y-1 cursor-help shadow-sm hover:shadow-xl ${config.bg} ${config.border} dark:bg-white/[0.02] dark:border-white/5`}>
                                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-inner shrink-0 ${config.iconColor}`}>
                                                    <Icon className="w-6 h-6" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className={`text-[10px] font-black uppercase truncate ${config.textColor} dark:text-white`}>{config.name.toUpperCase()}</p>
                                                    <div className="flex flex-col gap-0.5 opacity-60">
                                                        <span className="text-[8px] font-bold uppercase dark:text-slate-400">NVL {badge.tier === 'gold' ? 'ORO' : badge.tier === 'silver' ? 'PLATA' : 'BRONCE'}</span>
                                                        <span className="text-[7px] font-black uppercase text-emerald-500 bg-emerald-500/10 px-1 py-0.2 rounded w-fit">+{xpBonus} XP</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="col-span-full py-16 border-2 border-dashed border-slate-100 dark:border-white/5 rounded-[3rem] flex flex-col items-center justify-center text-slate-300 dark:text-slate-800">
                                        <TrophyIcon className="w-12 h-12 mb-3 opacity-20" />
                                        <span className="text-[11px] font-black uppercase tracking-widest">SIN INSIGNIAS OBTENIDAS AÚN</span>
                                    </div>
                                )}
                            </div>
                        </div>

                </div>
            </div>
        </div>
    );
}

// --- UTILIDAD: CONFIGURACIÓN DE UI DE INSIGNIAS ---
function getBadgeUIConfig(id: string, tier: string) {
    const tierColors: any = {
        gold: { bg: 'bg-yellow-50', border: 'border-yellow-200', textColor: 'text-yellow-700', iconColor: 'bg-yellow-500 text-white' },
        silver: { bg: 'bg-slate-50', border: 'border-slate-200', textColor: 'text-slate-600', iconColor: 'bg-slate-400 text-white' },
        bronze: { bg: 'bg-orange-50', border: 'border-orange-200', textColor: 'text-orange-800', iconColor: 'bg-orange-600 text-white' }
    };

    const badgeMap: any = {
        scorer: { name: 'ARTILLERO', icon: FireIcon, desc: 'Recompensa por alta cantidad de puntos o goles anotados' },
        playmaker: { name: 'MAESTRO', icon: SparklesIcon, desc: 'Recompensa por generar múltiples asistencias y pases clave' },
        defender: { name: 'MURALLA', icon: ShieldCheckIcon, desc: 'Reconocimiento a la labor defensiva, quites y vallas invictas' },
        wins: { name: 'GANADOR', icon: TrophyIcon, desc: 'Acumulación de victorias aseguradas en partidos competitivos' },
        mvp: { name: 'ESTRELLA', icon: StarIcon, desc: 'Galardón por ser elegido Mejor Jugador (MVP) del partido' },
        experience: { name: 'LEYENDA', icon: UserGroupIcon, desc: 'Otorgado por una trayectoria extensa y gran cantidad de partidos jugados' },
        multi_sport: { name: 'ATLETA TOTAL', icon: VariableIcon, desc: 'Capacidad multideportiva: partidos jugados en deportes distintos' },
        captaincy: { name: 'CAPITÁN', icon: AcademicCapIcon, desc: 'Reconocimiento al liderazgo por guiar o convocar equipos' },
        comeback: { name: 'AVE FÉNIX', icon: ArrowPathRoundedSquareIcon, desc: 'Logro por ganar partidos viniendo desde atrás (remontadas)' },
        precision: { name: 'FRANCOTIRADOR', icon: CursorArrowRippleIcon, desc: 'Alta efectividad y precisión en pases o tiros' },
        clutch: { name: 'CLUTCH', icon: ClockIcon, desc: 'Especialista en anotar puntos decisivos en los últimos minutos' },
        tournaments: { name: 'COMPETIDOR', icon: TrophyIcon, desc: 'Participación constante en torneos o ligas oficiales' },
        invictus: { name: 'INVICTO', icon: FireIcon, desc: 'Rachas prolongadas de victorias consecutivas sin conocer la derrota' },
        rivalry: { name: 'VERDUGO', icon: BoltIcon, desc: 'Habilidad para ganar partidos clásicos o revanchas intensas' },
        morning_player: { name: 'MADRUGADOR', icon: SparklesIcon, desc: 'Dedicación matutina: partidos jugados a primera hora' },
        night_player: { name: 'NOCTURNO', icon: StarIcon, desc: 'Especialista bajo las luces: partidos jugados de noche' },
        loyal: { name: 'FIEL', icon: HeartIcon, desc: 'Lealtad comprobada: tiempo de membresía activa sostenida' },
        weekend_warrior: { name: 'GUERRERO FDS', icon: UserGroupIcon, desc: 'Actividad intensa durante los fines de semana' },
        stamina: { name: 'MOTOR', icon: CpuChipIcon, desc: 'Resistencia pura: gran cantidad de minutos jugados acumulados' },
        social: { name: 'SOCIABLE', icon: UserGroupIcon, desc: 'Promotor del deporte: partidos jugados con múltiples invitados' }
    };

    const config = badgeMap[id] || { name: id, icon: TrophyIcon };
    const colors = tierColors[tier] || tierColors.bronze;

    return { ...config, ...colors };
}
