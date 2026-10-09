import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, RefreshControl,
    StatusBar, ActivityIndicator, Dimensions, StyleSheet, Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import {
    Bell, Sun, Moon, MapPin, Trophy, Wallet, Star, Calendar,
    ChevronRight, Users, User, Medal, BarChart3, Settings, Building2,
    Compass, Sparkles, Target, Activity, ClipboardList, LayoutGrid,
    CalendarRange, Map as MapIcon, ShieldCheck, Heart, Clock, Zap, TrendingUp,
    ArrowRight, GraduationCap, CalendarCheck, Shield, LineChart, UserCircle2, SlidersHorizontal,
    Navigation, Crown, Dumbbell, CreditCard, ShieldHalf, Settings2, CalendarDays, Ticket
} from 'lucide-react-native';
import { useAuth } from '../../store/useAuth';
import { useUserLocation } from '../../src/features/player/hooks/useDashboardData';
import { gamificationService, GamificationSettings } from '../../services/gamificationService';

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

const TIER_LIST = ['Bronce', 'Plata', 'Oro', 'Platino', 'Diamante', 'Elite', 'Leyenda'];

export default function PlayerDashboard() {
    const scrollViewRef = useRef<ScrollView>(null);
    const router = useRouter();
    const { user, profile, toggleTheme, theme: currentTheme } = useAuth();
    const isDark = currentTheme === 'dark';
    const C = isDark ? THEME.dark : THEME.light;
    const accent = THEME.accent;

    const { data: locationData, isLoading: loadingLocation } = useUserLocation();
    const [gamification, setGamification] = useState<GamificationSettings | null>(null);

    useFocusEffect(
        React.useCallback(() => {
            gamificationService.getSettings().then(setGamification);
            useAuth.getState().reloadProfile();
            return () => {};
        }, [])
    );

    const rawNameContext = profile?.displayName || user?.displayName || 'Jugador';
    const userName = rawNameContext.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
    const photoURL = profile?.photoURL || user?.photoURL || 'https://img.freepik.com/vector-premium/logotipo-mascota-pantera-negra-deportes-e-sports_195186-1335.jpg';

    const xp = profile?.xp || 0;
    const tier = gamification ? gamificationService.calculateTier(xp, gamification) : { name: 'Bronce', index: 0 };
    const ovr = gamification ? gamificationService.calculateOVR(xp, gamification) : 40;

    return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={C.bg} />

            <ScrollView
                ref={scrollViewRef}
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 120 }}
                showsVerticalScrollIndicator={false}
            >
                {/* HEADER SIMPLIFICADO */}
                <View style={{ paddingTop: 65, paddingBottom: 25, paddingHorizontal: 30 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View>
                            <Text style={{ color: C.text, fontSize: 44, fontWeight: '900', letterSpacing: -2 }}>Bienvenido</Text>
                            <Text style={{ color: accent, fontWeight: '900', fontSize: 10, letterSpacing: 3, marginTop: -5 }}>{userName.toUpperCase()}</Text>
                        </View>
                        <TouchableOpacity
                            onPress={toggleTheme}
                            style={{ width: 55, height: 55, borderRadius: 22, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 }}
                        >
                            {isDark ? <Sun color={accent} size={24} /> : <Moon color={accent} size={24} />}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* TARJETA DE IDENTIDAD PREMIUM (ADN PRO) */}
                <View style={{ paddingHorizontal: 25, marginBottom: 15 }}>
                    <TouchableOpacity
                        onPress={() => router.push('/(player)/perfil')}
                        activeOpacity={0.9}
                        style={{
                            borderRadius: 45,
                            overflow: 'hidden',
                            backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                            borderWidth: 1,
                            borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
                            shadowColor: accent,
                            shadowOpacity: isDark ? 0.2 : 0.1,
                            shadowRadius: 30,
                            elevation: 15
                        }}
                    >
                        <LinearGradient
                            colors={isDark ? ['#0F172A', '#064e3b'] : ['#FFFFFF', '#f0fdf4']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={{ padding: 30, flexDirection: 'row', alignItems: 'center' }}
                        >
                            {/* EFECTO DE LUZ DE FONDO */}
                            <View style={{ position: 'absolute', top: -50, right: -50, width: 150, height: 150, borderRadius: 75, backgroundColor: accent, opacity: 0.05 }} />

                            <View style={{ position: 'relative' }}>
                                <View style={{ width: 100, height: 100, borderRadius: 32, overflow: 'hidden', borderWidth: 4, borderColor: isDark ? '#1E293B' : '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 15 }}>
                                    <Image 
                                        source={profile?.photoURL ? { uri: profile.photoURL } : require('../../assets/images/mascot.jpg')} 
                                        style={{ width: '100%', height: '100%' }} 
                                    />
                                </View>
                                <View style={{ position: 'absolute', bottom: -5, right: -5, width: 34, height: 34, backgroundColor: accent, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: isDark ? '#0F172A' : '#FFFFFF' }}>
                                    <ShieldCheck color="white" size={16} />
                                </View>
                            </View>

                            <View style={{ marginLeft: 25, flex: 1 }}>
                                <Text style={{ color: C.sub, fontWeight: '900', fontSize: 9, letterSpacing: 2 }}>IDENTIDAD JUGADOR</Text>
                                <Text style={{ color: C.text, fontSize: 32, fontWeight: '900', letterSpacing: -1.5, marginBottom: 12 }} numberOfLines={1}>{userName}</Text>

                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <LinearGradient colors={[accent, '#059669']} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}>
                                        <Text style={{ color: 'white', fontWeight: '900', fontSize: 10 }}>{tier.name.toUpperCase()}</Text>
                                    </LinearGradient>
                                    <View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, marginLeft: 10, borderWidth: 1, borderColor: C.border }}>
                                        <Text style={{ color: C.text, fontWeight: '900', fontSize: 10 }}>{ovr} VALORACIÓN</Text>
                                    </View>
                                </View>

                                <View style={{ marginTop: 15, flexDirection: 'row', alignItems: 'center' }}>
                                    <Zap size={12} color={accent} fill={accent} />
                                    <Text style={{ color: C.sub, fontSize: 10, fontWeight: '800', marginLeft: 8 }}>{xp.toLocaleString()} XP ACUMULADOS</Text>
                                </View>
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* ACCESO RÁPIDO */}
                <View style={{ paddingHorizontal: 25, marginTop: 30 }}>
                    <View style={{ marginBottom: 20, paddingLeft: 10 }}>
                        <Text style={{ color: C.text, fontSize: 26, fontWeight: '900', letterSpacing: -1 }}>Acceso Rápido</Text>
                        <View style={{ height: 3, width: 40, backgroundColor: accent, borderRadius: 2, marginTop: 6 }} />
                    </View>

                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                        <QuickIcon bit={<CalendarCheck size={28} />} label="Reservas" color="#3b82f6" route="/(player)/reservas" C={C} isDark={isDark} />
                        <QuickIcon bit={<MapPin size={28} />} label="Mapa" color="#10b981" route="/(player)/mapa" C={C} isDark={isDark} />
                        <QuickIcon bit={<Trophy size={28} />} label="Torneos" color="#f43f5e" route="/(player)/torneos" C={C} isDark={isDark} />
                        <QuickIcon bit={<GraduationCap size={28} />} label="Academias" color="#8b5cf6" route="/(player)/academias" C={C} isDark={isDark} />
                        <QuickIcon bit={<CreditCard size={28} />} label="Pagos" color="#14b8a6" route="/(player)/billetera" C={C} isDark={isDark} />

                        <QuickIcon bit={<Building2 size={28} />} label="Recintos" color="#f59e0b" route="/(player)/clubes/explore" C={C} isDark={isDark} />
                        <QuickIcon bit={<Shield size={28} />} label="Equipos" color="#f97316" route="/(player)/equipos/explore" C={C} isDark={isDark} />
                        <QuickIcon bit={<TrendingUp size={28} />} label="Estadísticas" color="#ec4899" route="/(player)/estadisticas" C={C} isDark={isDark} />
                        <QuickIcon bit={<User size={28} />} label="Perfil" color="#8b5cf6" route="/(player)/perfil" C={C} isDark={isDark} />
                        <QuickIcon bit={<SlidersHorizontal size={28} />} label="Ajustes" color="#64748b" route="/(player)/preferencias" C={C} isDark={isDark} />
                    </View>
                </View>

                {/* TARJETA DE VALORACIÓN (MVP CARD PRO) */}
                <View style={{ paddingHorizontal: 25, marginTop: 40 }}>
                    <TouchableOpacity
                        onPress={() => router.push('/(player)/perfil')}
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
                                        <Sparkles color="rgba(255,255,255,0.7)" size={14} />
                                        <Text style={{ color: 'rgba(255,255,255,0.7)', fontWeight: '900', fontSize: 9, letterSpacing: 1.5, marginLeft: 8 }}>CARTA MVP 2026</Text>
                                    </View>
                                    <Text style={{ color: 'white', fontSize: 22, fontWeight: '900', textTransform: 'uppercase', letterSpacing: -0.5 }}>Tu Valoración</Text>
                                    <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '700', marginTop: 4 }}>Consulta tu rendimiento oficial.</Text>
                                </View>
                            </View>
                            <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', width: 55, height: 55, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' }}>
                                <ArrowRight color="white" size={24} />
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

            </ScrollView>
        </View>
    );
}

const QuickIcon = ({ bit, label, color, route, C, isDark }: any) => {
    const router = useRouter();
    return (
        <TouchableOpacity
            onPress={() => router.push(route as any)}
            activeOpacity={0.7}
            style={{ width: '19%', alignItems: 'center', marginBottom: 20 }}
        >
            <View style={{
                width: 60,
                height: 60,
                borderRadius: 24,
                backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'white',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: C.border,
                shadowColor: color,
                shadowOpacity: isDark ? 0.15 : 0.08,
                shadowRadius: 12,
                elevation: 3
            }}>
                {React.cloneElement(bit, { color, strokeWidth: 2 })}
            </View>
            <Text style={{ color: C.text, fontWeight: '900', fontSize: 8, textTransform: 'uppercase', letterSpacing: 1, marginTop: 12, textAlign: 'center' }} numberOfLines={1}>{label}</Text>
        </TouchableOpacity>
    );
};
