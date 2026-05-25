import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, Image, StatusBar,
    ActivityIndicator, Dimensions, RefreshControl, Alert, BackHandler, StyleSheet, Modal
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import {
    Trophy, Activity, ChevronRight, Settings, LogOut, Sun, Moon,
    Camera, ChevronLeft, Users, Wallet, Star, Target, Shield,
    Zap, TrendingUp, Handshake, Download, Share2, CheckCircle2, AlertCircle, Info, BookOpen,
    Medal, Swords, Heart, Calendar, Crosshair, Timer, Dribbble, ShieldCheck
} from 'lucide-react-native';
import { useAuth } from '../../store/useAuth';
import {
    Artillero, Asistencias, Atleta, Capitan, Clutch, Competidor,
    Estrella, Fds, Fenix, Fiel, Francotirador, Ganador, Madrugador,
    Maestro, Motor, Muralla, Nocturno, Partidos, Racha, Sociable,
    Verdugo, Nivel, Victorias, Goles, Mvp, Carta
} from '../../components/icons/achievements';
import { LinearGradient } from 'expo-linear-gradient';
import BottomMenu from '../../components/BottomMenu';
import { userService } from '../../services/userService';
import { UserProfile } from '../../types/user';
import * as ImagePicker from 'expo-image-picker';
import { db } from '../../services/firebase';
import { doc, updateDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { teamService, Team } from '../../services/teamService';
import { gamificationService, GamificationSettings } from '../../services/gamificationService';

const { width } = Dimensions.get('window');

const COLORS = {
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
        border: '#1E293B',
        text: '#F8FAFC',
        sub: '#94A3B8'
    },
    accent: '#10b981',
    error: '#f43f5e'
};

export default function PerfilScreen() {
    const scrollViewRef = useRef<ScrollView>(null);
    const cardRef = useRef<View>(null);
    const { user, profile, reloadProfile, signOut, toggleTheme, theme } = useAuth();
    const router = useRouter();
    const isDark = theme === 'dark';
    const C = isDark ? COLORS.dark : COLORS.light;
    const [userTeams, setUserTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [gamification, setGamification] = useState<GamificationSettings | null>(null);

    const [generatingCard, setGeneratingCard] = useState(false);
    const [capturedUri, setCapturedUri] = useState<string | null>(null);
    const [showCardModal, setShowCardModal] = useState(false);
    const [showBadgeGlossary, setShowBadgeGlossary] = useState(false);
    const [badgeConfigs, setBadgeConfigs] = useState<Record<string, { bronze: number; silver: number; gold: number }>>({});

    const loadData = async (isRefreshing = false) => {
        if (!user) return;
        if (isRefreshing) setRefreshing(true);
        try {
            const [gamiData, myTeams] = await Promise.all([
                gamificationService.getSettings(),
                teamService.getUserTeams(user.uid)
            ]);
            setGamification(gamiData);
            setUserTeams(myTeams);
            await reloadProfile();

            // Cargar config de badges desde Firestore
            try {
                const settingsSnap = await getDoc(doc(db, 'settings', 'global'));
                if (settingsSnap.exists()) {
                    const gamificationData = settingsSnap.data().gamification || {};
                    if (gamificationData.badges) {
                        setBadgeConfigs(gamificationData.badges);
                    } else if (settingsSnap.data().badges) {
                        setBadgeConfigs(settingsSnap.data().badges);
                    }
                }
            } catch (e) { console.warn('Error cargando badges config:', e); }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            loadData();
        }, [user])
    );

    const handlePickImage = async () => {
        try {
            const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permResult.granted) return;
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.5,
                base64: true,
                legacy: true
            } as any);
            if (!result.canceled && result.assets[0].base64 && user) {
                setUploading(true);
                const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
                await updateDoc(doc(db, 'users', user.uid), { photoURL: base64Image });
                loadData();
            }
        } catch (error) {
            console.error(error);
        } finally {
            setUploading(false);
        }
    };

    const handleDownloadCard = async () => {
        if (!cardRef.current) return;
        setGeneratingCard(true);
        try {
            const uri = await captureRef(cardRef, { format: 'png', quality: 1 });
            setCapturedUri(uri);
            setShowCardModal(true);
        } catch (error) {
            Alert.alert('Error', 'No se pudo generar tu carta.');
        } finally {
            setGeneratingCard(false);
        }
    };

    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const handleSaveToGallery = async () => {
        if (!capturedUri) return;
        try {
            await MediaLibrary.saveToLibraryAsync(capturedUri);
            setSuccessMessage('¡Carta guardada con éxito en tu galería!');
            setShowSuccessModal(true);
        } catch (error) {
            await Sharing.shareAsync(capturedUri);
        }
    };

    const xp = profile?.xp || 0;
    const tierList = ['bronce', 'plata', 'oro', 'platino', 'diamante', 'elite', 'leyenda'];
    const tierInfo = gamification ? gamificationService.calculateTier(xp, gamification) : { name: 'Bronce', index: 0 };
    const tierIndex = tierInfo.index;
    const ovr = profile?.ovr || 40;
    const photoURL = profile?.photoURL;
    const displayName = profile?.displayName || 'Jugador';

    // Image source logic
    const imageSource = photoURL ? { uri: photoURL } : require('../../assets/images/mascot.jpg');

    // Cálculo de insignias ganadas para la ficha (sincronizado con el sistema real)
    const earnedBadgesCount = (() => {
        if (!profile) return 0;
        const savedBadges = (profile as any)?.badges as any[] || [];
        const stats = profile.stats || {};
        const config = badgeConfigs || {};
        const rawData = profile as any;
        const createdAt = rawData?.createdAt?.seconds
            ? new Date(rawData.createdAt.seconds * 1000)
            : new Date();
        const daysActive = Math.max(1, (new Date().getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

        const statsMap: Record<string, number> = {
            scorer: (stats as any).goals || 0, playmaker: (stats as any).assists || 0,
            defender: (stats as any).clean_sheets || 0, wins: (stats as any).won || 0,
            mvp: (stats as any).mvps || (stats as any).mvp || 0,
            experience: (stats as any).played || 0, multi_sport: (stats as any).sports_played || 1,
            captaincy: (stats as any).captain_matches || 0, comeback: (stats as any).comebacks || 0,
            precision: (stats as any).precision_matches || 0, clutch: (stats as any).clutch_goals || 0,
            tournaments: (stats as any).tournaments_played || 0, invictus: (stats as any).longest_win_streak || 0,
            rivalry: (stats as any).rivalries_won || 0, morning_player: (stats as any).morning_matches || 0,
            night_player: (stats as any).night_matches || 0, loyal: Math.floor(daysActive / 30),
            weekend_warrior: (stats as any).weekend_matches || 0,
            stamina: (stats as any).minutes_played || ((stats as any).played || 0) * 60,
            social: (stats as any).invited_players || 0
        };

        const computedBadgesMap = new Map<string, string>();

        // 1. Cargar las guardadas
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
        const allBadgeIds = [
            'scorer', 'playmaker', 'defender', 'wins', 'mvp', 'experience', 'multi_sport',
            'captaincy', 'comeback', 'precision', 'clutch', 'tournaments', 'invictus',
            'rivalry', 'morning_player', 'night_player', 'loyal', 'weekend_warrior', 'stamina', 'social'
        ];

        allBadgeIds.forEach(id => {
            const val = statsMap[id] || 0;
            const c = (config as any)[id] || { bronze: 5, silver: 15, gold: 30 };
            let computedTier: string | null = null;
            if (val >= c.gold) computedTier = 'gold';
            else if (val >= c.silver) computedTier = 'silver';
            else if (val >= c.bronze) computedTier = 'bronze';

            if (computedTier) {
                const existingTier = computedBadgesMap.get(id);
                if (!existingTier || (tierScores[computedTier] > tierScores[existingTier])) {
                    computedBadgesMap.set(id, computedTier);
                }
            }
        });

        return computedBadgesMap.size;
    })();

    if (loading && !refreshing) {
        return (
            <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color={COLORS.accent} size="large" />
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

            <View style={{ paddingTop: 60, paddingBottom: 20, paddingHorizontal: 30, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: C.border }}>
                <TouchableOpacity onPress={() => router.back()} style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}>
                    <ChevronLeft color={COLORS.accent} size={24} />
                </TouchableOpacity>
                <Text style={{ color: C.text, fontSize: 20, fontWeight: '900', textTransform: 'uppercase' }}>Perfil MVP</Text>
                <TouchableOpacity onPress={toggleTheme} style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}>
                    {isDark ? <Sun color="#facc15" size={20} /> : <Moon color="#1e293b" size={20} />}
                </TouchableOpacity>
            </View>

            <ScrollView ref={scrollViewRef} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 120 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor={COLORS.accent} />}>

                {/* GENERADOR DE FICHA (ESTILO CARTA MVP PRO) */}
                <View style={{ paddingHorizontal: 25, marginTop: 10, marginBottom: 15 }}>
                    <TouchableOpacity
                        onPress={handleDownloadCard}
                        disabled={generatingCard}
                        activeOpacity={0.9}
                    >
                        <LinearGradient
                            colors={isDark ? ['#1e1b4b', '#312e81'] : ['#4338ca', '#6366f1']}
                            style={{ borderRadius: 40, padding: 35, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: '#6366f1', shadowOpacity: 0.4, shadowRadius: 20, elevation: 12 }}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                <View style={{ backgroundColor: '#f59e0b', width: 65, height: 85, borderRadius: 18, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 12, transform: [{ rotate: '-5deg' }] }}>
                                    <Text style={{ color: 'black', fontWeight: '900', fontSize: 10 }}>VAL</Text>
                                    <Text style={{ color: 'black', fontWeight: '900', fontSize: 26 }}>{ovr}</Text>
                                </View>
                                <View style={{ marginLeft: 25, flex: 1 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
                                        <Text style={{ color: 'rgba(255,255,255,0.7)', fontWeight: '900', fontSize: 9, letterSpacing: 1.5 }}>CARTA MVP 2026</Text>
                                    </View>
                                    <Text style={{ color: 'white', fontSize: 22, fontWeight: '900', textTransform: 'uppercase', letterSpacing: -0.5 }}>Generar Carta</Text>
                                    <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '700', marginTop: 4 }}>Descarga tu edición coleccionista.</Text>
                                </View>
                            </View>
                            <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', width: 55, height: 55, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' }}>
                                {generatingCard ? <ActivityIndicator color="white" /> : <Download color="white" size={24} />}
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* FOTO Y NOMBRE */}
                <View style={{ padding: 30, alignItems: 'center' }}>
                    <View style={{ position: 'relative' }}>
                        <View style={{ width: 130, height: 130, borderRadius: 45, backgroundColor: COLORS.accent + '11', overflow: 'hidden', borderWidth: 4, borderColor: COLORS.accent }}>
                            {uploading ? <ActivityIndicator style={{ flex: 1 }} color={COLORS.accent} /> : <Image source={photoURL ? { uri: photoURL } : require('../../assets/images/mascot.jpg')} style={{ width: '100%', height: '100%' }} />}
                        </View>
                        <TouchableOpacity onPress={handlePickImage} style={{ position: 'absolute', bottom: -5, right: -5, width: 44, height: 44, borderRadius: 18, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 5, borderColor: C.bg }}>
                            <Camera color="white" size={20} />
                        </TouchableOpacity>
                    </View>
                    <Text style={{ color: C.text, fontSize: 32, fontWeight: '900', textTransform: 'uppercase', marginTop: 25, letterSpacing: -1 }}>{displayName}</Text>
                    <Text style={{ color: C.sub, fontSize: 10, fontWeight: '700', letterSpacing: 2 }}>{profile?.email}</Text>
                </View>

                {/* NIVELES */}
                <SectionLabel label="Nivel de Temporada" />
                <View style={{ marginHorizontal: 30, backgroundColor: C.card, borderRadius: 30, padding: 30, borderWidth: 1, borderColor: C.border }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <View>
                            <Text style={{ color: C.sub, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2 }}>Rango Actual</Text>
                            <Text style={{ color: COLORS.accent, fontSize: 24, fontWeight: '900' }}>{tierInfo.name}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={{ color: C.sub, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2 }}>Próximo Rango</Text>
                            <Text style={{ color: C.text, fontSize: 18, fontWeight: '900', opacity: 0.5 }}>{tierIndex < tierList.length - 1 ? tierList[tierIndex + 1].toUpperCase() : 'LÍMITE'}</Text>
                        </View>
                    </View>
                    <View style={{ height: 4, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9', borderRadius: 2, position: 'relative', marginVertical: 10 }}>
                        <View style={{ position: 'absolute', height: '100%', width: `${(tierIndex / (tierList.length - 1)) * 100}%`, backgroundColor: COLORS.accent, borderRadius: 2 }} />
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', position: 'absolute', width: '100%', top: -6 }}>
                            {tierList.map((t, i) => (
                                <View key={t} style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: i <= tierIndex ? COLORS.accent : (isDark ? '#1e293b' : '#E2E8F0'), borderWidth: 4, borderColor: C.card }} />
                            ))}
                        </View>
                    </View>
                </View>

                {/* ESTADÍSTICAS */}
                <SectionLabel label="Rendimiento del Jugador" />
                <View style={{ marginHorizontal: 30, backgroundColor: C.card, borderRadius: 25, overflow: 'hidden', borderWidth: 1, borderColor: C.border }}>
                    <View style={{ height: 100, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 25, borderBottomWidth: 1, borderBottomColor: C.border }}>
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: C.sub, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 }}>Nivel General</Text>
                            <Text style={{ color: C.text, fontSize: 42, fontWeight: '900', letterSpacing: -2 }}>{ovr}</Text>
                        </View>
                        <View style={{ width: 44, height: 44, borderRadius: 15, backgroundColor: COLORS.accent + '40', alignItems: 'center', justifyContent: 'center' }}>
                            <Nivel width={36} height={36} color={COLORS.accent} />
                        </View>
                    </View>
                    <ProfileRow icon={Partidos} color="#3b82f6" label="Partidos Jugados" value={profile?.stats?.played || 0} isDark={isDark} />
                    <Separator isDark={isDark} />
                    <ProfileRow icon={Victorias} color="#f59e0b" label="Victorias Totales" value={profile?.stats?.won || 0} isDark={isDark} />
                    <Separator isDark={isDark} />
                    <ProfileRow icon={Goles} color="#ef4444" label="Goles / Puntos" value={profile?.stats?.goals || 0} isDark={isDark} />
                    <Separator isDark={isDark} />
                    <ProfileRow icon={Asistencias} color="#10b981" label="Asistencias" value={profile?.stats?.assists || 0} isDark={isDark} />
                    <Separator isDark={isDark} />
                    <ProfileRow icon={Mvp} color="#8b5cf6" label="Premios MVP" value={profile?.stats?.mvps || 0} isDark={isDark} />
                </View>
                {/* INSIGNIAS GANADAS */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 40, marginTop: 30, marginBottom: 15 }}>
                    <Text style={{ color: '#10b981', fontWeight: '900', fontSize: 11, textTransform: 'uppercase', letterSpacing: 2 }}>Insignias Ganadas</Text>
                    <TouchableOpacity onPress={() => setShowBadgeGlossary(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: isDark ? 'rgba(16,185,129,0.1)' : '#ecfdf5', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 }}>
                        <BookOpen color={COLORS.accent} size={12} />
                        <Text style={{ color: COLORS.accent, fontSize: 8, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 }}>Glosario</Text>
                    </TouchableOpacity>
                </View>
                <View style={{ marginHorizontal: 30, backgroundColor: C.card, borderRadius: 25, padding: 20, borderWidth: 1, borderColor: C.border }}>
                    {(() => {
                        // Primero intentar usar badges guardadas por el sync
                        const savedBadges = (profile as any)?.badges as any[] | undefined;
                        const stats = profile?.stats || { played: 0, won: 0, lost: 0, goals: 0 };
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

                        const BADGE_INFO: Record<string, { name: string; icon: any }> = {
                            scorer: { name: 'Artillero', icon: Artillero },
                            playmaker: { name: 'Maestro', icon: Maestro },
                            defender: { name: 'Muralla', icon: Muralla },
                            wins: { name: 'Ganador', icon: Ganador },
                            mvp: { name: 'Estrella', icon: Estrella },
                            experience: { name: 'Leyenda', icon: Partidos },
                            multi_sport: { name: 'Atleta Total', icon: Atleta },
                            captaincy: { name: 'Capitán', icon: Capitan },
                            comeback: { name: 'Ave Fénix', icon: Fenix },
                            precision: { name: 'Francotirador', icon: Francotirador },
                            clutch: { name: 'Clutch', icon: Clutch },
                            tournaments: { name: 'Competidor', icon: Competidor },
                            invictus: { name: 'Invicto', icon: Racha },
                            rivalry: { name: 'Verdugo', icon: Verdugo },
                            morning_player: { name: 'Madrugador', icon: Madrugador },
                            night_player: { name: 'Nocturno', icon: Nocturno },
                            loyal: { name: 'Fiel', icon: Fiel },
                            weekend_warrior: { name: 'Guerrero FDS', icon: Fds },
                            stamina: { name: 'Motor', icon: Motor },
                            social: { name: 'Sociable', icon: Sociable },
                        };

                        const BADGE_XP_VALUES: Record<string, number> = (gamification as any)?.badgeXpValues || { bronze: 50, silver: 150, gold: 500 };
                        // Fusión híbrida consistente al 100% con estadísticas e historial
                        const statsMap: Record<string, number> = {
                            scorer: (stats as any).goals || 0, playmaker: (stats as any).assists || 0,
                            defender: (stats as any).clean_sheets || 0, wins: (stats as any).won || 0,
                            mvp: (stats as any).mvps || (stats as any).mvp || 0,
                            experience: (stats as any).played || 0, multi_sport: (stats as any).sports_played || 1,
                            captaincy: (stats as any).captain_matches || 0, comeback: (stats as any).comebacks || 0,
                            precision: (stats as any).precision_matches || 0, clutch: (stats as any).clutch_goals || 0,
                            tournaments: (stats as any).tournaments_played || 0, invictus: (stats as any).longest_win_streak || 0,
                            rivalry: (stats as any).rivalries_won || 0, morning_player: (stats as any).morning_matches || 0,
                            night_player: (stats as any).night_matches || 0, loyal: Math.floor(daysActive / 30),
                            weekend_warrior: (stats as any).weekend_matches || 0,
                            stamina: (stats as any).minutes_played || ((stats as any).played || 0) * 60,
                            social: (stats as any).invited_players || 0
                        };

                        const computedBadgesMap = new Map<string, string>();

                        // 1. Cargar las guardadas
                        if (savedBadges) {
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
                        }

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

                        const earned = Object.keys(BADGE_INFO).map(id => {
                            const info = BADGE_INFO[id];
                            const tier = computedBadgesMap.get(id) || null;
                            return {
                                id,
                                name: info.name,
                                icon: info.icon,
                                tier,
                                xpBonus: tier ? BADGE_XP_VALUES[tier] || 0 : 0
                            };
                        });
                        const earnedBadges = earned
                            .filter(b => b.tier !== null)
                            .sort((a, b) => (tierScores[b.tier!] || 0) - (tierScores[a.tier!] || 0));
                        const lockedBadges = earned.filter(b => b.tier === null);

                        const tierColors: Record<string, string> = {
                            gold: '#fbbf24',
                            silver: '#94a3b8',
                            bronze: '#b45309'
                        };

                        const tierNames: Record<string, string> = {
                            gold: 'ORO',
                            silver: 'PLATA',
                            bronze: 'BRONCE'
                        };

                        return (
                            <View>
                                {earnedBadges.length > 0 ? (
                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                        {earnedBadges.map((b, i) => (
                                            <View key={b.id} style={{
                                                width: (width - 130) / 3,
                                                backgroundColor: tierColors[b.tier!] + '20',
                                                borderRadius: 18,
                                                padding: 10,
                                                alignItems: 'center',
                                                borderWidth: 2,
                                                borderColor: tierColors[b.tier!] + '40'
                                            }}>
                                                <View style={{ marginBottom: 8, width: 40, height: 40, borderRadius: 12, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                                                    <b.icon width={32} height={32} color={tierColors[b.tier!]} />
                                                </View>
                                                <Text style={{ color: C.text, fontSize: 9, fontWeight: '900', textTransform: 'uppercase', textAlign: 'center', marginBottom: 3 }}>{b.name}</Text>
                                                <View style={{ backgroundColor: tierColors[b.tier!] + '20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                                                    <Text style={{ color: tierColors[b.tier!], fontSize: 7, fontWeight: '900', letterSpacing: 1 }}>{tierNames[b.tier!]}</Text>
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                ) : (
                                    <View style={{ alignItems: 'center', paddingVertical: 25 }}>
                                        <Text style={{ fontSize: 36, marginBottom: 10 }}>🎖️</Text>
                                        <Text style={{ color: C.sub, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>Juega más para desbloquear insignias</Text>
                                    </View>
                                )}
                            </View>
                        );
                    })()}
                </View>

            </ScrollView>

            {/* ═══ VISTA DE CAPTURA PLAYER CARD (ESTILO TOPPS NOW 2026 - ELONGATED) ═══ */}
            <View style={{ position: 'absolute', left: -5000 }}>
                <View ref={cardRef} collapsable={false} style={{ width: 750, height: 1250, backgroundColor: '#020617', borderRadius: 0, overflow: 'hidden' }}>

                    {/* PLAYER IMAGE AS FULL BACKGROUND */}
                    <Image
                        source={imageSource}
                        style={StyleSheet.absoluteFill}
                        resizeMode="cover"
                    />

                    {/* CINEMATIC OVERLAYS */}
                    <LinearGradient
                        colors={['rgba(2, 6, 23, 0.5)', 'transparent', 'rgba(2, 6, 23, 0.9)']}
                        style={StyleSheet.absoluteFill}
                    />

                    {/* Top Left: Zoomed Logo (Scaled & Aligned) */}
                    <View style={{ position: 'absolute', top: 60, left: 25, width: 180, height: 120, overflow: 'hidden' }}>
                        <Image
                            source={require('../../assets/images/Logo.png')}
                            style={{ width: '130%', height: '130%', position: 'absolute', top: '-15%', left: '-15%' }}
                            resizeMode="contain"
                            tintColor="white"
                        />
                    </View>

                    {/* Top Right: OVR Rating (Refined Style) */}
                    <View style={{ position: 'absolute', top: 60, right: 60, alignItems: 'flex-end' }}>
                        <Text style={{ color: 'white', fontSize: 140, fontWeight: '900', lineHeight: 140, textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 20 }}>{ovr}</Text>
                        <View style={{ height: 5, width: 140, backgroundColor: '#06b6d4', marginTop: -5, marginBottom: 10 }} />
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={{ color: '#06b6d4', fontSize: 14, fontWeight: '900', letterSpacing: 5 }}>VALORACIÓN</Text>
                            <Text style={{ color: '#06b6d4', fontSize: 14, fontWeight: '900', letterSpacing: 5 }}>GENERAL</Text>
                        </View>
                    </View>

                    {/* PLAYER POSITION VERTICAL */}
                    <View style={{ position: 'absolute', left: -500, top: '42%', width: 1200, transform: [{ rotate: '-90deg' }] }}>
                        <Text style={{ color: 'white', fontSize: 140, fontWeight: '900', opacity: 0.5, letterSpacing: 2, textAlign: 'center' }}>{(profile?.position || 'JUGADOR').toUpperCase()}</Text>
                    </View>

                    {/* Bottom Section: TOPPS NOW STYLE NAMEPLATE */}
                    <View style={{ position: 'absolute', bottom: 0, width: '100%', alignItems: 'center', paddingBottom: 0 }}>

                        {/* Name White Box (Larger) */}
                        <View style={{
                            backgroundColor: 'white',
                            paddingHorizontal: 90,
                            paddingVertical: 25,
                            transform: [{ skewX: '-10deg' }],
                            zIndex: 20,
                            shadowColor: '#000',
                            shadowOpacity: 0.4,
                            shadowRadius: 15,
                            elevation: 15,
                            borderWidth: 3,
                            borderColor: '#f1f5f9'
                        }}>
                            <Text style={{
                                color: '#000',
                                fontSize: 60,
                                fontWeight: '900',
                                textTransform: 'uppercase',
                                letterSpacing: -2,
                                transform: [{ skewX: '10deg' }]
                            }}>{displayName}</Text>
                        </View>

                        {/* Dark Info Bar (Full Width Banner) */}
                        <View style={{
                            backgroundColor: '#020617',
                            width: '100%',
                            height: 90,
                            marginTop: -20,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderTopWidth: 5,
                            borderTopColor: '#06b6d4',
                            zIndex: 10
                        }}>
                            <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: 'white', fontSize: 22, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 4 }}>
                                {profile?.mainSport ? `${profile.mainSport} • ` : ''}NIVEL {tierInfo.name} • 2026
                            </Text>
                        </View>

                        {/* Geometric Pattern Bar (Brand Colors: Cyan, Emerald, Blue) */}
                        <View style={{ flexDirection: 'row', width: '100%', height: 50 }}>
                            {['#06b6d4', '#10b981', '#3b82f6', '#0891b2', '#059669', '#2563eb', '#06b6d4', '#10b981', '#3b82f6', '#0891b2'].map((color, i) => (
                                <View key={i} style={{ flex: 1, backgroundColor: color }} />
                            ))}
                        </View>
                    </View>

                    {/* Bottom Branding Spanish */}
                    <View style={{ position: 'absolute', bottom: 65, width: '100%', alignItems: 'center', zIndex: 30 }}>
                        <Text style={{ color: 'white', fontSize: 12, fontWeight: '900', opacity: 0.5, letterSpacing: 2 }}>SISTEMA DE IDENTIDAD MVP SPORTS • TODOS LOS DERECHOS RESERVADOS</Text>
                    </View>
                </View>
            </View>

            {/* SUCCESS MODAL */}
            <Modal visible={showSuccessModal} transparent animationType="slide">
                <View style={{ flex: 1, backgroundColor: 'rgba(2, 6, 23, 0.95)', alignItems: 'center', justifyContent: 'center', padding: 30 }}>
                    <View style={{ backgroundColor: C.card, width: '100%', padding: 40, borderRadius: 40, alignItems: 'center', borderWidth: 1, borderColor: C.border }}>
                        <View style={{ width: 80, height: 80, borderRadius: 30, backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center', marginBottom: 25 }}>
                            <CheckCircle2 color="white" size={40} />
                        </View>
                        <Text style={{ color: C.text, fontSize: 24, fontWeight: '900', textAlign: 'center', marginBottom: 15 }}>{successMessage}</Text>
                        <Text style={{ color: C.sub, fontSize: 14, fontWeight: '700', textAlign: 'center', marginBottom: 35 }}>Ya puedes compartir tu carta con tus amigos o en tus redes sociales.</Text>
                        <TouchableOpacity onPress={() => setShowSuccessModal(false)} style={{ backgroundColor: '#10b981', width: '100%', height: 65, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ color: 'white', fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 }}>Entendido</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* PREVIEW MODAL */}
            <Modal visible={showCardModal} transparent animationType="fade" statusBarTranslucent>
                <View style={{ flex: 1, backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center', padding: 30 }}>
                    <View style={{ height: '75%', maxWidth: '100%', aspectRatio: 750 / 1250, borderRadius: 0, overflow: 'hidden', borderWidth: 2, borderColor: '#10b981' }}>
                        {capturedUri && <Image source={{ uri: capturedUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />}
                    </View>
                    <View style={{ flexDirection: 'row', marginTop: 30, gap: 15, width: '100%' }}>
                        <TouchableOpacity onPress={() => setShowCardModal(false)} style={{ flex: 1, height: 60, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ color: 'white', fontWeight: '900', textTransform: 'uppercase' }}>Cerrar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleSaveToGallery} style={{ flex: 1, height: 60, borderRadius: 20, backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ color: 'white', fontWeight: '900', textTransform: 'uppercase' }}>Descargar Carta</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* GLOSARIO DE INSIGNIAS MODAL */}
            <Modal visible={showBadgeGlossary} transparent animationType="slide">
                <View style={{ flex: 1, backgroundColor: isDark ? 'rgba(2, 6, 23, 0.97)' : 'rgba(0,0,0,0.6)' }}>
                    <View style={{ flex: 1, marginTop: 60, backgroundColor: C.bg, borderTopLeftRadius: 35, borderTopRightRadius: 35, overflow: 'hidden' }}>
                        {/* Header */}
                        <View style={{ padding: 25, borderBottomWidth: 1, borderBottomColor: C.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
                                <View style={{ width: 44, height: 44, borderRadius: 15, backgroundColor: COLORS.accent + '15', alignItems: 'center', justifyContent: 'center' }}>
                                    <Trophy color={COLORS.accent} size={22} />
                                </View>
                                <View>
                                    <Text style={{ color: C.text, fontSize: 18, fontWeight: '900', textTransform: 'uppercase', letterSpacing: -0.5 }}>Arsenal de Mérito</Text>
                                    <Text style={{ color: C.sub, fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 2 }}>Cómo ganar cada insignia</Text>
                                </View>
                            </View>
                            <TouchableOpacity onPress={() => setShowBadgeGlossary(false)} style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ color: C.sub, fontWeight: '900', fontSize: 16 }}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Lista de badges con progreso */}
                        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
                            {(() => {
                                const stats = profile?.stats || { played: 0, won: 0, lost: 0, goals: 0 };
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
                                    scorer: (stats as any).goals || 0, playmaker: (stats as any).assists || 0,
                                    defender: (stats as any).clean_sheets || 0, wins: (stats as any).won || 0,
                                    mvp: (stats as any).mvps || (stats as any).mvp || 0,
                                    experience: (stats as any).played || 0, multi_sport: (stats as any).sports_played || 1,
                                    captaincy: (stats as any).captain_matches || 0, comeback: (stats as any).comebacks || 0,
                                    precision: (stats as any).precision_matches || 0, clutch: (stats as any).clutch_goals || 0,
                                    tournaments: (stats as any).tournaments_played || 0, invictus: (stats as any).longest_win_streak || 0,
                                    rivalry: (stats as any).rivalries_won || 0, morning_player: (stats as any).morning_matches || 0,
                                    night_player: (stats as any).night_matches || 0, loyal: Math.floor(daysActive / 30),
                                    weekend_warrior: (stats as any).weekend_matches || 0,
                                    stamina: (stats as any).minutes_played || ((stats as any).played || 0) * 60,
                                    social: (stats as any).invited_players || 0
                                };

                                const savedBadges = (profile as any)?.badges || [];
                                const computedBadgesMap = new Map<string, string>();

                                // 1. Cargar las guardadas
                                if (savedBadges) {
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
                                }

                                // 2. Fusionar con cálculo local tomando el nivel más alto
                                const tierScores: Record<string, number> = { gold: 3, silver: 2, bronze: 1 };
                                Object.keys(statsMap).forEach(id => {
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

                                return [
                                    { id: 'scorer', icon: Artillero, name: 'Artillero', desc: 'Anota puntos o goles en tus partidos', unit: 'Goles' },
                                    { id: 'playmaker', icon: Maestro, name: 'Maestro', desc: 'Suma asistencias y pases clave', unit: 'Asistencias' },
                                    { id: 'defender', icon: Muralla, name: 'Muralla', desc: 'Logra defensas o vallas invictas', unit: 'Defensas' },
                                    { id: 'wins', icon: Ganador, name: 'Ganador', desc: 'Acumula partidos ganados', unit: 'Victorias' },
                                    { id: 'mvp', icon: Estrella, name: 'Estrella', desc: 'Sé elegido Mejor Jugador del partido', unit: 'MVPs' },
                                    { id: 'experience', icon: Partidos, name: 'Leyenda', desc: 'Disputa la mayor cantidad de partidos', unit: 'Partidos' },
                                    { id: 'multi_sport', icon: Atleta, name: 'Atleta Total', desc: 'Juega partidos en diferentes deportes', unit: 'Deportes' },
                                    { id: 'captaincy', icon: Capitan, name: 'Capitán', desc: 'Lidera a tu equipo como capitán', unit: 'Partidos' },
                                    { id: 'comeback', icon: Fenix, name: 'Ave Fénix', desc: 'Gana partidos remontando marcador', unit: 'Remontadas' },
                                    { id: 'precision', icon: Francotirador, name: 'Francotirador', desc: 'Mantén alta efectividad o precisión', unit: 'Partidos' },
                                    { id: 'clutch', icon: Clutch, name: 'Clutch', desc: 'Anota puntos decisivos al final', unit: 'Puntos' },
                                    { id: 'tournaments', icon: Competidor, name: 'Competidor', desc: 'Participa en torneos y ligas', unit: 'Torneos' },
                                    { id: 'invictus', icon: Racha, name: 'Invicto', desc: 'Logra rachas de victorias consecutivas', unit: 'Racha' },
                                    { id: 'rivalry', icon: Verdugo, name: 'Verdugo', desc: 'Gana clásicos o revanchas', unit: 'Partidos' },
                                    { id: 'morning_player', icon: Madrugador, name: 'Madrugador', desc: 'Juega partidos en horario matutino', unit: 'Partidos' },
                                    { id: 'night_player', icon: Nocturno, name: 'Nocturno', desc: 'Juega partidos en horario nocturno', unit: 'Partidos' },
                                    { id: 'loyal', icon: Fiel, name: 'Fiel', desc: 'Mantente activo mes a mes', unit: 'Meses' },
                                    { id: 'weekend_warrior', icon: Fds, name: 'Guerrero FDS', desc: 'Juega partidos los fines de semana', unit: 'Partidos' },
                                    { id: 'stamina', icon: Motor, name: 'Motor', desc: 'Acumula minutos jugados en cancha', unit: 'Minutos' },
                                    { id: 'social', icon: Sociable, name: 'Sociable', desc: 'Invita amigos a jugar contigo', unit: 'Invitados' },
                                ].map(b => {
                                    const dbKeys: Record<string, string> = {
                                        scorer: 'goals',
                                        playmaker: 'assists',
                                        defender: 'clean_sheets',
                                        wins: 'won',
                                        experience: 'played',
                                        multi_sport: 'sports_played',
                                        loyal: 'loyalty'
                                    };
                                    const dbKey = dbKeys[b.id] || b.id;
                                    const config = badgeConfigs[b.id] || badgeConfigs[dbKey] || { bronze: 5, silver: 15, gold: 30 };
                                    const val = statsMap[b.id] || 0;

                                    const hybridTier = computedBadgesMap.get(b.id) || null;
                                    let tierScore = 0;
                                    if (hybridTier === 'gold') tierScore = 3;
                                    else if (hybridTier === 'silver') tierScore = 2;
                                    else if (hybridTier === 'bronze') tierScore = 1;

                                    let nextThreshold = Number(config.bronze || 5);
                                    if (tierScore === 3) nextThreshold = Number(config.gold || 30);
                                    else if (tierScore === 2) nextThreshold = Number(config.gold || 30);
                                    else if (tierScore === 1) nextThreshold = Number(config.silver || 15);

                                    const progressPct = nextThreshold > 0 ? Math.min(1, val / nextThreshold) : 0;
                                    return { ...b, tierScore, progressPct, val, config, hybridTier };
                                })
                                    .sort((a, b) => {
                                        if (b.tierScore !== a.tierScore) return b.tierScore - a.tierScore;
                                        return b.progressPct - a.progressPct;
                                    })
                                    .map((b, i) => {
                                        const { config, val: currentVal } = b;

                                        let nextThreshold = Number(config.bronze || 5);
                                        let currentTierLabel = "BLOQUEADA";
                                        let nextTierLabel = "BRONCE";
                                        let progressColor = COLORS.accent;

                                        if (b.hybridTier === 'gold') {
                                            nextThreshold = Number(config.gold || 30);
                                            currentTierLabel = "ORO";
                                            nextTierLabel = "MÁXIMO";
                                            progressColor = '#fbbf24';
                                        } else if (b.hybridTier === 'silver') {
                                            nextThreshold = Number(config.gold || 30);
                                            currentTierLabel = "PLATA";
                                            nextTierLabel = "ORO";
                                            progressColor = '#94a3b8';
                                        } else if (b.hybridTier === 'bronze') {
                                            nextThreshold = Number(config.silver || 15);
                                            currentTierLabel = "BRONCE";
                                            nextTierLabel = "PLATA";
                                            progressColor = '#b45309';
                                        }

                                        const progress = nextThreshold > 0 ? Math.min(1, currentVal / nextThreshold) : 0;

                                        return (
                                            <View key={i} style={{ backgroundColor: C.card, borderRadius: 30, padding: 25, marginBottom: 15, borderWidth: 1, borderColor: C.border }}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
                                                    {/* CONTENEDOR ICONO */}
                                                    <View style={{ width: 65, height: 65, borderRadius: 22, backgroundColor: progressColor + '40', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: progressColor + '40' }}>
                                                        <b.icon width={36} height={36} color={progressColor} />
                                                    </View>

                                                    {/* INFO Y TÍTULO */}
                                                    <View style={{ flex: 1 }}>
                                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                            <View style={{ flex: 1 }}>
                                                                <Text style={{ color: C.text, fontSize: 16, fontWeight: '900', textTransform: 'uppercase', letterSpacing: -0.5 }}>{b.name}</Text>
                                                                <Text style={{ color: C.sub, fontSize: 10, fontWeight: '600', marginTop: 2, lineHeight: 14 }}>{b.desc}</Text>
                                                            </View>
                                                            <View style={{ backgroundColor: progressColor, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginLeft: 10 }}>
                                                                <Text style={{ color: 'white', fontSize: 8, fontWeight: '900' }}>{currentTierLabel}</Text>
                                                            </View>
                                                        </View>

                                                        {/* BARRA DE PROGRESO INTEGRADA */}
                                                        <View style={{ marginTop: 15 }}>
                                                            <View style={{ height: 10, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9', borderRadius: 5, overflow: 'hidden' }}>
                                                                <View style={{ height: '100%', width: `${progress * 100}%`, backgroundColor: progressColor, borderRadius: 5 }} />
                                                            </View>
                                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                                                                <Text style={{ color: C.text, fontSize: 9, fontWeight: '900' }}>{currentVal} {b.unit}</Text>
                                                                <Text style={{ color: C.sub, fontSize: 9, fontWeight: '900' }}>{Math.floor(progress * 100)}% COMPLETADO</Text>
                                                            </View>
                                                        </View>
                                                    </View>
                                                </View>

                                                {/* FOOTER DE HITOS (MILESTONES) */}
                                                <View style={{ flexDirection: 'row', marginTop: 20, paddingTop: 15, borderTopWidth: 1, borderTopColor: C.border, gap: 15 }}>
                                                    {['bronze', 'silver', 'gold'].map((t: any) => {
                                                        const milestoneColors: any = { bronze: '#b45309', silver: '#94a3b8', gold: '#fbbf24' };
                                                        const milestoneNames: any = { bronze: 'BRONCE', silver: 'PLATA', gold: 'ORO' };
                                                        const isActive = currentVal >= (config as any)[t];
                                                        return (
                                                            <View key={t} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, opacity: isActive ? 1 : 0.2 }}>
                                                                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: milestoneColors[t] }} />
                                                                <View>
                                                                    <Text style={{ color: C.text, fontSize: 9, fontWeight: '900' }}>{milestoneNames[t]}</Text>
                                                                    <Text style={{ color: C.sub, fontSize: 9, fontWeight: '800' }}>{(config as any)[t]} {b.unit}</Text>
                                                                </View>
                                                            </View>
                                                        );
                                                    })}
                                                </View>
                                            </View>
                                        );
                                    });
                            })()}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const SectionLabel = ({ label }: { label: string }) => (
    <Text style={{ color: '#10b981', fontWeight: '900', fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, marginHorizontal: 40, marginTop: 30, marginBottom: 15 }}>{label}</Text>
);

const Separator = ({ isDark }: { isDark: boolean }) => (
    <View style={{ height: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)', marginHorizontal: 25 }} />
);

const ProfileRow = ({ icon: Icon, color, label, value, isDark }: any) => {
    const C = isDark ? COLORS.dark : COLORS.light;
    return (
        <View style={{ height: 80, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 25 }}>
            <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: color + '40', alignItems: 'center', justifyContent: 'center' }}>
                <Icon color={color} size={20} strokeWidth={1.25} width={30} height={30} />
            </View>
            <View style={{ marginLeft: 20, flex: 1 }}>
                <Text style={{ color: C.sub, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</Text>
                <Text style={{ color: C.text, fontSize: 18, fontWeight: '900' }}>{value}</Text>
            </View>
        </View>
    );
};
