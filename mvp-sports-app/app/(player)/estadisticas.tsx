import React, { useEffect, useMemo, useState, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, RefreshControl, BackHandler, Dimensions, StyleSheet, Image } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { 
    ChevronLeft, Trophy, Target, Activity, Zap, Shield, 
    Crown, Medal, Clock, Ruler, Weight, Footprints, Sparkles, TrendingUp, Calendar,
    Dribbble, CircleDot, Swords, Star, Info, AlertCircle, Users, Crosshair, ShieldCheck, Sun, Moon, Heart, Share2, Timer
} from 'lucide-react-native';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../store/useAuth';
import { bookingService, Booking } from '../../services/bookingService';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const THEME = {
    light: {
        bg: '#F8FAFC',
        card: '#FFFFFF',
        border: '#E2E8F0',
        text: '#0F172A',
        sub: '#64748B'
    },
    dark: {
        bg: '#020617',
        card: '#0F172A',
        border: 'rgba(255,255,255,0.05)',
        text: '#F8FAFC',
        sub: '#94A3B8'
    },
    accent: '#10b981'
};

const RANGOS_CONFIG = [
    { id: 'bronze', name: 'BRONCE', min: 0, color: '#cd7f32' },
    { id: 'silver', name: 'PLATA', min: 1000, color: '#94A3B8' },
    { id: 'gold', name: 'ORO', min: 3000, color: '#f59e0b' },
    { id: 'platinum', name: 'PLATINO', min: 6000, color: '#3b82f6' },
    { id: 'diamond', name: 'DIAMANTE', min: 10000, color: '#0ea5e9' },
    { id: 'elite', name: 'ELITE', min: 15000, color: '#10b981' },
    { id: 'legend', name: 'LEYENDA', min: 25000, color: '#8b5cf6' }
];

export default function EstadisticasScreen() {
    const router = useRouter();
    const { profile, reloadProfile, user, theme } = useAuth();
    const isDark = theme === 'dark';
    const C = isDark ? THEME.dark : THEME.light;
    const accent = THEME.accent;
    const scrollViewRef = useRef<ScrollView>(null);

    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [gamification, setGamification] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'partidos' | 'logros'>('partidos');

    const loadData = async (isRefreshing = false) => {
        if (!user?.uid) return;
        if (!isRefreshing) setLoading(true);
        try {
            await reloadProfile();
            const data = await bookingService.getUserBookings(user.uid);
            setBookings(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Escucha en tiempo real de la configuración de gamificación
    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setGamification({
                    ...data.gamification,
                    badges: data.badges || data.gamification?.badges || {}
                });
            }
        });
        return () => unsub();
    }, []);

    useFocusEffect(
        React.useCallback(() => {
            loadData();
            const backAction = () => { router.back(); return true; };
            const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
            return () => backHandler.remove();
        }, [user?.uid])
    );

    const userProfile = profile as any;

    const analytics = useMemo(() => {
        const puntosTotales = userProfile?.xp || 0;
        
        let rangoActual = RANGOS_CONFIG[0];
        let siguienteRango = RANGOS_CONFIG[1];
        for (let i = RANGOS_CONFIG.length - 1; i >= 0; i--) {
            if (puntosTotales >= RANGOS_CONFIG[i].min) {
                rangoActual = RANGOS_CONFIG[i];
                siguienteRango = RANGOS_CONFIG[i + 1] || RANGOS_CONFIG[i];
                break;
            }
        }

        const puntosEnEsteRango = puntosTotales - rangoActual.min;
        const puntosNecesarios = siguienteRango.min - rangoActual.min;
        const progreso = siguienteRango.id === rangoActual.id ? 100 : Math.round((puntosEnEsteRango / puntosNecesarios) * 100);

        const savedBadges = (profile as any)?.badges as any[] || [];
        const BADGE_XP_VALUES: Record<string, number> = gamification?.badgeXpValues || { bronze: 50, silver: 150, gold: 500 };
        const BADGE_INFO: Record<string, { name: string; icon: any }> = {
            scorer: { name: 'Artillero', icon: Target },
            playmaker: { name: 'Maestro', icon: Zap },
            defender: { name: 'Muralla', icon: Shield },
            wins: { name: 'Ganador', icon: Trophy },
            mvp: { name: 'Estrella', icon: Star },
            experience: { name: 'Leyenda', icon: Timer },
            multi_sport: { name: 'Atleta Total', icon: Dribbble },
            captaincy: { name: 'Capitán', icon: Users },
            comeback: { name: 'Ave Fénix', icon: TrendingUp },
            precision: { name: 'Francotirador', icon: Crosshair },
            clutch: { name: 'Clutch', icon: Zap },
            tournaments: { name: 'Competidor', icon: Medal },
            invictus: { name: 'Invicto', icon: ShieldCheck },
            rivalry: { name: 'Verdugo', icon: Swords },
            morning_player: { name: 'Madrugador', icon: Sun },
            night_player: { name: 'Nocturno', icon: Moon },
            loyal: { name: 'Fiel', icon: Heart },
            weekend_warrior: { name: 'Guerrero FDS', icon: Calendar },
            stamina: { name: 'Motor', icon: Activity },
            social: { name: 'Sociable', icon: Share2 },
        };

        const BADGE_DESCRIPTIONS: Record<string, string> = {
            scorer: 'Goles anotados en la carrera deportiva',
            playmaker: 'Asistencias que terminaron en gol',
            defender: 'Partidos defendidos con valla invicta',
            wins: 'Victorias acumuladas en partidos competitivos',
            mvp: 'Premios al Jugador Más Valioso (MVP)',
            experience: 'Partidos totales completados en la plataforma',
            multi_sport: 'Complejos deportivos diferentes visitados',
            captaincy: 'Partidos oficiales liderados como capitán',
            comeback: 'Victorias épicas logradas remontando el marcador',
            precision: 'Goles convertidos con precisión milimétrica',
            clutch: 'Goles decisivos anotados en los últimos minutos',
            tournaments: 'Participaciones en campeonatos y torneos oficiales',
            invictus: 'Racha de victorias consecutivas sin perder',
            rivalry: 'Clásicos y partidos de alta rivalidad ganados',
            morning_player: 'Partidos jugados en horario de mañana',
            night_player: 'Partidos jugados en horario nocturno',
            loyal: 'Meses de constancia y fidelidad en la plataforma',
            weekend_warrior: 'Partidos jugados los sábados o domingos',
            stamina: 'Minutos de juego totales acumulados en cancha',
            social: 'Nuevos jugadores recomendados e invitados a unirse'
        };

        const stats = (profile as any)?.stats || {};
        const rawData = profile as any;
        let rawJoined = new Date();
        if (rawData?.createdAt?.toDate) {
            rawJoined = rawData.createdAt.toDate();
        } else if (rawData?.createdAt?.seconds) {
            rawJoined = new Date(rawData.createdAt.seconds * 1000);
        } else if (rawData?.createdAt) {
            rawJoined = new Date(rawData.createdAt);
        } else if (rawData?.joinedDate) {
            rawJoined = new Date(rawData.joinedDate);
        } else if (rawData?.joined) {
            rawJoined = new Date(rawData.joined);
        }
        const daysActive = Math.max(1, (new Date().getTime() - rawJoined.getTime()) / (1000 * 60 * 60 * 24));
        
        const statsMap: Record<string, number> = {
            scorer: stats.goals || 0, playmaker: stats.assists || 0,
            defender: stats.clean_sheets || 0, wins: stats.won || 0,
            mvp: stats.mvps || stats.mvp || 0,
            experience: stats.played || 0, multi_sport: stats.sports_played || 1,
            captaincy: stats.captain_matches || 0, comeback: stats.comebacks || 0,
            precision: stats.precision_matches || 0, clutch: stats.clutch_goals || 0,
            tournaments: stats.tournaments_played || 0, invictus: stats.longest_win_streak || 0,
            rivalry: stats.rivalries_won || 0, morning_player: stats.morning_matches || 0,
            night_player: stats.night_matches || 0, loyal: Math.floor(daysActive / 30),
            weekend_warrior: stats.weekend_matches || 0,
            stamina: stats.minutes_played || (stats.played || 0) * 60,
            social: stats.invited_players || 0
        };

        const badgeConfigs = gamification?.badges || {};
        const computedBadgesMap = new Map<string, string>(); // badgeId -> tier

        // 1. Cargar las guardadas por Bulk Sync
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

        // 2. Fusionar con cálculo local tomando el nivel más alto
        const tierScores: Record<string, number> = { gold: 3, silver: 2, bronze: 1 };
        Object.keys(BADGE_INFO).forEach(id => {
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

        const badgeHistory = finalBadges.map((badge: any, idx: number) => {
            const info = BADGE_INFO[badge.id] || { name: 'Logro', icon: Trophy };
            const xpBonus = BADGE_XP_VALUES[badge.tier] || 0;
            const tierNames: Record<string, string> = { gold: 'ORO', silver: 'PLATA', bronze: 'BRONCE' };
            const tierColors: Record<string, string> = { gold: '#fbbf24', silver: '#94a3b8', bronze: '#b45309' };
            
            const dateObj = userProfile?.lastBulkSync ? new Date(userProfile.lastBulkSync) : new Date();
            dateObj.setSeconds(dateObj.getSeconds() - idx * 60);

            return {
                isBadge: true,
                id: badge.id,
                badgeName: info.name,
                badgeTier: tierNames[badge.tier] || 'BRONCE',
                badgeColor: tierColors[badge.tier] || '#b45309',
                badgeDesc: BADGE_DESCRIPTIONS[badge.id] || 'Hito deportivo superado',
                xpBonus,
                dateObj,
                icon: info.icon
            };
        });

        const matchesList = bookings.filter(b => {
            const isCompleted = b.status === 'completed' || b.checkIn || b.checkOut === true;
            const isNoShow = b.status === 'no-show' || 
                             b.paymentStatus === 'no-show' || 
                             b.noShow === true || 
                             (b.notes && (b.notes.toLowerCase().includes('no-show') || b.notes.toLowerCase().includes('inasistencia')));
            return isCompleted || b.status === 'cancelled' || isNoShow;
        }).map(b => {
            const dateObj = b.date?.seconds ? new Date(b.date.seconds * 1000) : (b.date?.toDate ? b.date.toDate() : new Date());
            const bStats = b as any;
            
            // 1. Determinar estado de la reserva
            const isCompleted = b.status === 'completed' || b.checkIn || b.checkOut === true;
            const isNoShow = b.status === 'no-show' || 
                             b.paymentStatus === 'no-show' || 
                             b.noShow === true || 
                             (b.notes && (b.notes.toLowerCase().includes('no-show') || b.notes.toLowerCase().includes('inasistencia')));

            let displayStatus = 'pending';
            if (isNoShow) displayStatus = 'no-show';
            else if (isCompleted) displayStatus = 'completed';
            else if (b.status === 'confirmed') displayStatus = 'confirmed';
            else if (b.status === 'cancelled') displayStatus = 'cancelled';
            else if (b.status === 'pending') displayStatus = 'pending';

            const isWin = bStats.isWin === true && isCompleted;
            const isLoss = bStats.isWin === false && isCompleted;

            let resultText = 'EN PROCESO';
            let resultType = 'process';
            if (isWin) { resultText = 'VICTORIA'; resultType = 'win'; }
            else if (isLoss) { resultText = 'DERROTA'; resultType = 'loss'; }
            else if (displayStatus === 'completed') { resultText = 'FINALIZADO'; resultType = 'completed'; }
            else if (displayStatus === 'no-show') { resultText = 'CANCELADO POR INASISTENCIA'; resultType = 'no-show'; }
            else if (displayStatus === 'cancelled') { 
                resultText = b.cancelledBy ? 'CANCELADO POR JUGADOR' : 'ANULADO'; 
                resultType = 'cancelled'; 
            }
            else if (displayStatus === 'confirmed') { resultText = 'CONFIRMADO'; resultType = 'confirmed'; }
            else if (displayStatus === 'pending') { resultText = 'PENDIENTE'; resultType = 'pending'; }

            // 2. Calcular XP
            let matchXP: number | null = null;
            if (displayStatus === 'no-show') {
                matchXP = -(gamification?.xpPerNoShow || 50);
            } else if (isCompleted && displayStatus !== 'cancelled') {
                matchXP = 0;
                const sportKey = b.sport ? b.sport.toLowerCase() : 'futbol';
                const defaultOverrides = { 
                    winXP: gamification?.xpPerWin || 150, 
                    lossXP: gamification?.xpPerLoss || 50, 
                    countGoals: true, 
                    countAssists: true,
                    goalXP: gamification?.xpPerGoal || 25,
                    assistXP: gamification?.xpPerAssist || 15
                };
                const overrides = {
                    ...defaultOverrides,
                    ...(gamification?.sportsOverrides?.[sportKey] || {})
                };

                matchXP += (gamification?.xpPerMatch || 100);
                if (b.checkIn) matchXP += (gamification?.xpPerCheckin || 50);

                if (isWin) matchXP += overrides.winXP;
                else if (isLoss) matchXP -= overrides.lossXP;

                if (overrides.countGoals && bStats.goals) {
                    matchXP += bStats.goals * (overrides.goalXP !== undefined ? overrides.goalXP : 25);
                }
                if (overrides.countAssists && bStats.assists) {
                    matchXP += bStats.assists * (overrides.assistXP !== undefined ? overrides.assistXP : 15);
                }
                if (bStats.isMVP) matchXP += (gamification?.xpPerMvp || 200);
            }

            // 3. Logros Performance
            const performance = [];
            if (bStats.goals > 0) performance.push({ text: `${bStats.goals} GOLES`, icon: Target, color: '#ef4444' });
            if (bStats.isMVP) performance.push({ text: 'MVP', icon: Star, color: '#f59e0b' });

            return { ...b, dateObj, displayStatus, resultText, resultType, matchXP, performance, formattedTime: b.startTime || '--:--' };
        });

        const bitacora = [
            ...matchesList,
            ...badgeHistory
        ].sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());

        return { 
            nivel: userProfile?.ovr || 0,
            puntosTotales, progreso, rangoActual, siguienteRango, bitacora 
        };
    }, [bookings, profile, gamification]);

    if (loading && !refreshing) return (
        <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={accent} size="large" />
        </View>
    );

    return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={C.card} />

            {/* HEADER */}
            <View style={{ paddingTop: 60, paddingBottom: 20, paddingHorizontal: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.card }}>
                <TouchableOpacity onPress={() => router.back()} style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : C.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}>
                    <ChevronLeft color={accent} size={24} />
                </TouchableOpacity>
                <Text style={{ color: C.text, fontSize: 20, fontWeight: '900', textTransform: 'uppercase', letterSpacing: -1 }}>Estadísticas</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView ref={scrollViewRef} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor={accent} />}>
                
                {/* PANEL DE PROGRESO */}
                <View style={{ padding: 25 }}>
                    <View style={{ 
                        backgroundColor: C.card, 
                        borderRadius: 45, 
                        padding: 35, 
                        borderWidth: 1, 
                        borderColor: C.border, 
                        shadowColor: '#000', 
                        shadowOpacity: isDark ? 0.3 : 0.08, 
                        shadowRadius: 25,
                        elevation: isDark ? 10 : 0
                    }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <View>
                                <Text style={{ color: C.sub, fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 }}>Rango Actual</Text>
                                <Text style={{ color: analytics.rangoActual.color, fontSize: 38, fontWeight: '900', letterSpacing: -1 }}>{analytics.rangoActual.name}</Text>
                                <View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, marginTop: 10, alignSelf: 'flex-start', borderWidth: 1, borderColor: C.border }}>
                                    <Text style={{ color: C.text, fontSize: 10, fontWeight: '900' }}>VALORACIÓN GENERAL: {analytics.nivel}</Text>
                                </View>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={{ color: C.sub, fontSize: 9, fontWeight: '900', textTransform: 'uppercase' }}>Puntos Totales</Text>
                                <Text style={{ color: C.text, fontSize: 32, fontWeight: '900' }}>{analytics.puntosTotales.toLocaleString()}</Text>
                                <Text style={{ color: accent, fontSize: 9, fontWeight: '900', letterSpacing: 1 }}>XP ACUMULADOS</Text>
                            </View>
                        </View>

                        <View style={{ marginTop: 40 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                                <Text style={{ color: C.sub, fontSize: 10, fontWeight: '900' }}>
                                    {analytics.rangoActual.id === analytics.siguienteRango.id ? 'NIVEL MÁXIMO ALCANZADO' : `SIGUIENTE NIVEL: ${analytics.siguienteRango.name}`}
                                </Text>
                                <Text style={{ color: C.text, fontSize: 11, fontWeight: '900' }}>{analytics.progreso}%</Text>
                            </View>
                            <View style={{ height: 12, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9', borderRadius: 6, overflow: 'hidden' }}>
                                <LinearGradient 
                                    colors={[analytics.rangoActual.color, analytics.rangoActual.color + '90']}
                                    start={{x:0, y:0}} end={{x:1, y:0}}
                                    style={{ height: '100%', width: `${analytics.progreso}%`, borderRadius: 6 }} 
                                />
                            </View>
                        </View>
                    </View>
                </View>

                {/* DATOS FÍSICOS */}
                <View style={{ paddingHorizontal: 25, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 }}>
                    <Ficha etiqueta="ALTURA" valor={userProfile?.height ? `${userProfile.height} CM` : '---'} icono={Ruler} C={C} accent={accent} isDark={isDark} />
                    <Ficha etiqueta="PESO" valor={userProfile?.weight ? `${userProfile.weight} KG` : '---'} icono={Weight} C={C} accent={accent} isDark={isDark} />
                    <Ficha etiqueta="PIE HÁBIL" valor={userProfile?.dominantFoot || '---'} icono={Footprints} C={C} accent={accent} isDark={isDark} />
                </View>

                {/* REGLAS DE PUNTOS */}
                <Text style={{ color: accent, fontWeight: '900', fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, marginHorizontal: 40, marginTop: 10, marginBottom: 20 }}>¿Cómo ganar XP?</Text>
                <View style={{ marginHorizontal: 25, backgroundColor: C.card, borderRadius: 40, padding: 30, borderWidth: 1, borderColor: C.border, shadowColor: '#000', shadowOpacity: isDark ? 0.2 : 0.03, shadowRadius: 15 }}>
                    <ReglaItem icono={Activity} titulo="Por jugar partido" valor={`+${gamification?.xpPerMatch || 100}`} C={C} accent={accent} isDark={isDark} />
                    <ReglaItem icono={Zap} titulo="Asistencia por Check-In" valor={`+${gamification?.xpPerCheckin || 50}`} C={C} accent={accent} isDark={isDark} />
                    <ReglaItem icono={Star} titulo="Por ser el más valioso (MVP)" valor={`+${gamification?.xpPerMvp || 200}`} C={C} accent={accent} isDark={isDark} />
                    <ReglaItem icono={AlertCircle} titulo="Inasistencia (No-Show)" valor={`-${gamification?.xpPerNoShow || 150}`} C={C} accent="#ef4444" isDark={isDark} />
                    <View style={{ marginTop: 20, padding: 18, backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#F8FAFC', borderRadius: 20, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.border }}>
                        <Info size={16} color={accent} />
                        <Text style={{ marginLeft: 15, color: C.sub, fontSize: 11, fontWeight: '700', flex: 1 }}>Tus XP se actualizan automáticamente al finalizar el partido.</Text>
                    </View>
                </View>

                {/* HISTORIAL */}
                {/* Selector de Pestañas */}
                <View style={{ flexDirection: 'row', paddingHorizontal: 25, gap: 10, marginTop: 30, marginBottom: 10 }}>
                    <TouchableOpacity 
                        onPress={() => setActiveTab('partidos')}
                        style={{
                            flex: 1,
                            backgroundColor: activeTab === 'partidos' ? accent : (isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9'),
                            paddingVertical: 12,
                            borderRadius: 18,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderWidth: 1,
                            borderColor: activeTab === 'partidos' ? 'transparent' : C.border
                        }}
                    >
                        <Text style={{ color: activeTab === 'partidos' ? '#FFF' : C.text, fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            ⚽ Partidos ({analytics.bitacora.filter((h: any) => !h.isBadge).length})
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        onPress={() => setActiveTab('logros')}
                        style={{
                            flex: 1,
                            backgroundColor: activeTab === 'logros' ? accent : (isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9'),
                            paddingVertical: 12,
                            borderRadius: 18,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderWidth: 1,
                            borderColor: activeTab === 'logros' ? 'transparent' : C.border
                        }}
                    >
                        <Text style={{ color: activeTab === 'logros' ? '#FFF' : C.text, fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            🏆 Logros ({analytics.bitacora.filter((h: any) => h.isBadge).length})
                        </Text>
                    </TouchableOpacity>
                </View>

                <Text style={{ color: accent, fontWeight: '900', fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, marginHorizontal: 40, marginTop: 20, marginBottom: 20 }}>
                    {activeTab === 'partidos' ? 'Historial de Partidos' : 'Logros Conseguidos'}
                </Text>
                <View style={{ paddingHorizontal: 25 }}>
                    {(() => {
                        const filteredBitacora = analytics.bitacora.filter((item: any) => {
                            if (activeTab === 'partidos') return !item.isBadge;
                            return item.isBadge;
                        });

                        if (activeTab === 'logros') {
                            const tierOrder: Record<string, number> = { 'ORO': 3, 'PLATA': 2, 'BRONCE': 1 };
                            filteredBitacora.sort((a: any, b: any) => (tierOrder[b.badgeTier] || 0) - (tierOrder[a.badgeTier] || 0));
                        }

                        if (filteredBitacora.length === 0) {
                            return (
                                <View style={{ padding: 60, alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: C.border, borderRadius: 40 }}>
                                    <TrendingUp color={C.sub} size={32} />
                                    <Text style={{ color: C.sub, fontSize: 11, fontWeight: '800', marginTop: 15, textTransform: 'uppercase', textAlign: 'center' }}>
                                        {activeTab === 'partidos' ? 'AÚN NO TIENES PARTIDOS REGISTRADOS' : 'SIN LOGROS CONSEGUIDOS TODAVÍA'}
                                    </Text>
                                </View>
                            );
                        }

                        return filteredBitacora.slice(0, 15).map((b: any, i) => {
                            if (b.isBadge) {
                                const BIcon = b.icon || Trophy;
                                return (
                                    <View key={`badge-${b.id}-${i}`} style={{ 
                                        backgroundColor: C.card, 
                                        borderRadius: 35, 
                                        padding: 25, 
                                        marginBottom: 15, 
                                        borderWidth: 2, 
                                        borderColor: b.badgeColor + '30',
                                        shadowColor: b.badgeColor,
                                        shadowOpacity: isDark ? 0.15 : 0.03,
                                        shadowRadius: 10,
                                        elevation: 2
                                    }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 15 }}>
                                                <View style={{ 
                                                    width: 46, 
                                                    height: 46, 
                                                    borderRadius: 15, 
                                                    backgroundColor: b.badgeColor + '15', 
                                                    alignItems: 'center', 
                                                    justifyContent: 'center',
                                                    borderWidth: 1,
                                                    borderColor: b.badgeColor + '30'
                                                }}>
                                                    <BIcon color={b.badgeColor} size={22} strokeWidth={2.5} />
                                                </View>
                                                
                                                <View style={{ flex: 1 }}>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                        <Text style={{ color: C.text, fontSize: 14, fontWeight: '900', textTransform: 'uppercase', letterSpacing: -0.5 }}>
                                                            {b.badgeName}
                                                        </Text>
                                                        <View style={{ backgroundColor: b.badgeColor + '20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                                                            <Text style={{ color: b.badgeColor, fontSize: 7, fontWeight: '900', letterSpacing: 1 }}>{b.badgeTier}</Text>
                                                        </View>
                                                    </View>
                                                    <Text style={{ color: C.sub, fontSize: 10, fontWeight: '700', marginTop: 4 }}>
                                                        {b.badgeDesc}
                                                    </Text>
                                                </View>
                                            </View>
                                            
                                            <View style={{ alignItems: 'flex-end', marginLeft: 15 }}>
                                                <View style={{ 
                                                    backgroundColor: b.badgeColor + '15', 
                                                    paddingHorizontal: 12, 
                                                    paddingVertical: 8, 
                                                    borderRadius: 15, 
                                                    borderWidth: 1, 
                                                    borderColor: b.badgeColor + '30', 
                                                    alignItems: 'center' 
                                                }}>
                                                    <Text style={{ color: b.badgeColor, fontSize: 18, fontWeight: '900' }}>
                                                        +{b.xpBonus}
                                                    </Text>
                                                    <Text style={{ color: b.badgeColor, fontSize: 8, fontWeight: '900', letterSpacing: 0.5 }}>XP BONUS</Text>
                                                </View>
                                            </View>
                                        </View>
                                    </View>
                                );
                            }

                            const resultColors: any = {
                                win: { bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)', text: '#10b981' },
                                loss: { bg: 'rgba(244,63,94,0.1)', border: 'rgba(244,63,94,0.2)', text: '#f43f5e' },
                                completed: { bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.2)', text: '#94a3b8' },
                                'no-show': { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)', text: '#ef4444' },
                                cancelled: { bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.2)', text: '#94a3b8' },
                                confirmed: { bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.2)', text: '#3b82f6' },
                                pending: { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', text: '#f59e0b' },
                                process: { bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.2)', text: '#6366f1' },
                            };
                            const cStyles = resultColors[b.resultType] || resultColors.process;

                            return (
                                <View key={i} style={{ backgroundColor: C.card, borderRadius: 35, padding: 25, marginBottom: 15, borderWidth: 1, borderColor: C.border, shadowColor: '#000', shadowOpacity: isDark ? 0.2 : 0.02, shadowRadius: 10 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <View style={{ flex: 1 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                                <View style={{ backgroundColor: cStyles.bg, borderWidth: 1, borderColor: cStyles.border, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                                                    <Text style={{ color: cStyles.text, fontSize: 8, fontWeight: '900', letterSpacing: 1 }}>{b.resultText}</Text>
                                                </View>
                                                <Text style={{ color: C.sub, fontSize: 10, fontWeight: '800' }}>{b.formattedTime}</Text>
                                            </View>
                                            
                                            <Text style={{ color: C.text, fontSize: 17, fontWeight: '900', textTransform: 'uppercase', letterSpacing: -0.5 }}>{b.tenantName}</Text>
                                            <Text style={{ color: C.sub, fontSize: 11, fontWeight: '700', marginBottom: 15 }}>{b.dateObj.toLocaleDateString('es-CL')} • {b.sport || 'FÚTBOL'}</Text>
                                            
                                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                                {b.performance.map((perf: any, idx: number) => {
                                                    const PIcon = perf.icon;
                                                    return (
                                                        <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: C.border }}>
                                                            <PIcon size={12} color={perf.color} strokeWidth={3} />
                                                            <Text style={{ color: C.text, fontSize: 10, fontWeight: '900' }}>{perf.text}</Text>
                                                        </View>
                                                    );
                                                })}
                                            </View>
                                        </View>
                                        <View style={{ alignItems: 'flex-end', marginLeft: 15 }}>
                                            {b.resultType === 'cancelled' ? (
                                                <View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 15, borderWidth: 1, borderColor: C.border, alignItems: 'center' }}>
                                                    <Text style={{ color: C.sub, fontSize: 16, fontWeight: '900' }}>0 XP</Text>
                                                    <Text style={{ color: C.sub, fontSize: 8, fontWeight: '900', letterSpacing: 1 }}>SIN PUNTOS</Text>
                                                </View>
                                            ) : b.matchXP !== null ? (
                                                <View style={{ backgroundColor: b.matchXP >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 15, borderWidth: 1, borderColor: b.matchXP >= 0 ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.2)', alignItems: 'center' }}>
                                                    <Text style={{ color: b.matchXP >= 0 ? '#10b981' : '#f43f5e', fontSize: 20, fontWeight: '900' }}>
                                                        {b.matchXP >= 0 ? `+${b.matchXP}` : b.matchXP}
                                                    </Text>
                                                    <Text style={{ color: b.matchXP >= 0 ? '#10b981' : '#f43f5e', fontSize: 9, fontWeight: '900', letterSpacing: 1 }}>PUNTOS ELO</Text>
                                                </View>
                                            ) : (
                                                <View style={{ backgroundColor: 'transparent', paddingHorizontal: 8, paddingVertical: 8, alignItems: 'center' }}>
                                                    <Text style={{ color: C.sub, fontSize: 10, fontWeight: '900', letterSpacing: 1 }}>PROCESANDO</Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                </View>
                            );
                        });
                    })()}
                </View>

            </ScrollView>
        </View>
    );
}

const Ficha = ({ etiqueta, valor, icono: Icono, C, accent, isDark }: any) => (
    <View style={{ width: (width - 70) / 3, backgroundColor: C.card, borderRadius: 25, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: C.border, shadowColor: '#000', shadowOpacity: isDark ? 0.2 : 0.05, shadowRadius: 10 }}>
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: accent + '15', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <Icono color={accent} size={22} />
        </View>
        <Text style={{ color: C.text, fontSize: 15, fontWeight: '900' }}>{valor}</Text>
        <Text style={{ color: C.sub, fontSize: 9, fontWeight: '900', textTransform: 'uppercase', marginTop: 4 }}>{etiqueta}</Text>
    </View>
);

const ReglaItem = ({ icono: Icono, titulo, valor, C, accent, isDark }: any) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F1F5F9', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}>
                <Icono color={C.sub} size={18} />
            </View>
            <Text style={{ marginLeft: 15, color: C.text, fontSize: 14, fontWeight: '700' }}>{titulo}</Text>
        </View>
        <View style={{ backgroundColor: accent + '10', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}>
            <Text style={{ color: accent, fontSize: 14, fontWeight: '900' }}>{valor}</Text>
        </View>
    </View>
);
