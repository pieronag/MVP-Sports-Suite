import React, { useEffect, useMemo, useState, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, RefreshControl, BackHandler, Dimensions, StyleSheet, Image } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { 
    ChevronLeft, Trophy, Target, Activity, Zap, Shield, 
    Crown, Medal, Clock, Ruler, Weight, Footprints, Sparkles, TrendingUp, Calendar,
    Dribbble, CircleDot, Swords, Star, Info
} from 'lucide-react-native';
import { doc, getDoc } from 'firebase/firestore';
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

    const loadData = async (isRefreshing = false) => {
        if (!user?.uid) return;
        if (!isRefreshing) setLoading(true);
        try {
            await reloadProfile();
            const gDoc = await getDoc(doc(db, 'settings', 'gamification'));
            if (gDoc.exists()) setGamification(gDoc.data());
            const data = await bookingService.getUserBookings(user.uid);
            setBookings(data);
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

        const bitacora = bookings.map(b => {
            const bStats = (b as any).stats || {};
            let puntosSesion = gamification?.xpPerMatch || 100;
            const logros = [];
            
            if (bStats.isWin || bStats.result === 'win') {
                puntosSesion += (gamification?.xpPerWin || 150);
                logros.push('VICTORIA');
            }
            if (bStats.mvp || bStats.isMvp) {
                puntosSesion += (gamification?.xpPerMvp || 200);
                logros.push('MÁS VALIOSO');
            }
            if (bStats.goals > 0) {
                puntosSesion += (bStats.goals * 50);
                logros.push(`${bStats.goals} GOLES`);
            }
            if (bStats.assists > 0) {
                puntosSesion += (bStats.assists * 25);
                logros.push(`${bStats.assists} ASIST.`);
            }

            return { ...b, puntosSesion, logros };
        });

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
                    <ReglaItem icono={Trophy} titulo="Por ganar" valor={`+${gamification?.xpPerWin || 150}`} C={C} accent={accent} isDark={isDark} />
                    <ReglaItem icono={Star} titulo="Por ser el más valioso" valor={`+${gamification?.xpPerMvp || 200}`} C={C} accent={accent} isDark={isDark} />
                    <ReglaItem icono={CircleDot} titulo="Por cada gol" valor="+50" C={C} accent={accent} isDark={isDark} />
                    <ReglaItem icono={Sparkles} titulo="Por asistencia" valor="+25" C={C} accent={accent} isDark={isDark} />
                    <View style={{ marginTop: 20, padding: 18, backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#F8FAFC', borderRadius: 20, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.border }}>
                        <Info size={16} color={accent} />
                        <Text style={{ marginLeft: 15, color: C.sub, fontSize: 11, fontWeight: '700', flex: 1 }}>Tus XP se actualizan automáticamente al finalizar el partido.</Text>
                    </View>
                </View>

                {/* HISTORIAL */}
                <Text style={{ color: accent, fontWeight: '900', fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, marginHorizontal: 40, marginTop: 30, marginBottom: 20 }}>Historial de XP</Text>
                <View style={{ paddingHorizontal: 25 }}>
                    {analytics.bitacora.length === 0 ? (
                        <View style={{ padding: 60, alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: C.border, borderRadius: 40 }}>
                            <TrendingUp color={C.sub} size={32} />
                            <Text style={{ color: C.sub, fontSize: 11, fontWeight: '800', marginTop: 15 }}>AÚN NO TIENES PUNTOS REGISTRADOS</Text>
                        </View>
                    ) : (
                        analytics.bitacora.slice(0, 15).map((b: any, i) => (
                            <View key={i} style={{ backgroundColor: C.card, borderRadius: 35, padding: 25, marginBottom: 15, borderWidth: 1, borderColor: C.border, shadowColor: '#000', shadowOpacity: isDark ? 0.2 : 0.02, shadowRadius: 10 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ color: C.text, fontSize: 17, fontWeight: '900', textTransform: 'uppercase', letterSpacing: -0.5 }}>{b.tenantName}</Text>
                                        <Text style={{ color: C.sub, fontSize: 11, fontWeight: '700', marginBottom: 15 }}>{b.date.toDate().toLocaleDateString('es-CL')} • {b.sport || 'Sesión'}</Text>
                                        
                                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                            {b.logros.map((tag: string, idx: number) => (
                                                <View key={idx} style={{ backgroundColor: tag === 'MÁS VALIOSO' ? '#f59e0b15' : (tag === 'VICTORIA' ? accent + '15' : (isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9')), paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: 'transparent' }}>
                                                    <Text style={{ color: tag === 'MÁS VALIOSO' ? '#f59e0b' : (tag === 'VICTORIA' ? accent : C.sub), fontSize: 10, fontWeight: '900' }}>{tag}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                    <View style={{ alignItems: 'flex-end', backgroundColor: accent + '10', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 15, borderWidth: 1, borderColor: accent + '20' }}>
                                        <Text style={{ color: accent, fontSize: 20, fontWeight: '900' }}>+{b.puntosSesion}</Text>
                                        <Text style={{ color: accent, fontSize: 9, fontWeight: '900', letterSpacing: 1 }}>XP</Text>
                                    </View>
                                </View>
                            </View>
                        ))
                    )}
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
