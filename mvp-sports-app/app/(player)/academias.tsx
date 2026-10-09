import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StatusBar, ActivityIndicator, RefreshControl, BackHandler, Dimensions, StyleSheet, Modal } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { 
    ChevronLeft, GraduationCap, BookOpen, Award, Sparkles, 
    Calendar, Users, Shield, Ruler, Weight, Footprints, Clock,
    Star, ArrowRight, TrendingUp, Zap, MapPin, CreditCard,
    Compass, Target, Activity, Dribbble, Trophy
} from 'lucide-react-native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../store/useAuth';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

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
    accent: '#8b5cf6' // Morado para Academias
};

import { FutbolIcon, PadelIcon, TenisIcon, BasquetbolIcon, VoleibolIcon } from '../../components/icons/sports';

const CATEGORIAS = [
    { id: 'todo', name: 'Todos', icon: Compass },
    { id: 'futbol', name: 'Fútbol', icon: FutbolIcon },
    { id: 'futbolito', name: 'Futbolito', icon: FutbolIcon },
    { id: 'padel', name: 'Pádel', icon: PadelIcon },
    { id: 'tenis', name: 'Tenis', icon: TenisIcon },
    { id: 'basquetbol', name: 'Básquetbol', icon: BasquetbolIcon },
    { id: 'voleibol', name: 'Vóleibol', icon: VoleibolIcon },
];

export default function AcademiasScreen() {
    const router = useRouter();
    const { theme } = useAuth();
    const isDark = theme === 'dark';
    const C = isDark ? THEME.dark : THEME.light;
    const accent = THEME.accent;
    const scrollViewRef = useRef<ScrollView>(null);

    const [academias, setAcademias] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeSport, setActiveSport] = useState('todo');

    const fetchAcademias = async () => {
        try {
            const ref = collection(db, 'academy_classes');
            const q = query(ref); 
            const snap = await getDocs(q);
            const data = snap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setAcademias(data);
        } catch (error) {
            console.error("Error al obtener academias:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            fetchAcademias();
        }, [])
    );

    const filteredAcademias = useMemo(() => {
        if (activeSport === 'todo') return academias;
        const normalizeSport = (s: string) => s ? s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : '';
        return academias.filter(a => {
            const sport = normalizeSport(a.sport || a.deporte || '');
            const category = normalizeSport(a.category || a.categoria || '');
            const name = normalizeSport(a.name || a.nombre || '');
            const normActive = normalizeSport(activeSport);
            return sport.includes(normActive) || category.includes(normActive) || name.includes(normActive);
        });
    }, [academias, activeSport]);

    return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
            {/* PRÓXIMAMENTE MODAL OVERLAY */}
            <Modal visible={true} transparent={true} animationType="fade">
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, backgroundColor: isDark ? 'rgba(2,6,23,0.98)' : 'rgba(248,250,252,0.98)' }}>
                    <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
                    <View style={{ width: 140, height: 140, borderRadius: 50, backgroundColor: accent + '15', alignItems: 'center', justifyContent: 'center', marginBottom: 35, borderWidth: 2, borderColor: accent + '30' }}>
                        <GraduationCap color={accent} size={64} strokeWidth={1.5} />
                    </View>
                    <Text style={{ color: C.text, fontSize: 32, fontWeight: '900', textAlign: 'center', textTransform: 'uppercase', letterSpacing: -1, marginBottom: 15 }}>Academias MVP</Text>
                    <View style={{ backgroundColor: accent, paddingHorizontal: 15, paddingVertical: 6, borderRadius: 10, marginBottom: 25 }}>
                        <Text style={{ color: 'white', fontSize: 10, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase' }}>Próximamente</Text>
                    </View>
                    <Text style={{ color: C.sub, fontSize: 14, fontWeight: '700', textAlign: 'center', lineHeight: 22, maxWidth: 300, marginBottom: 45 }}>
                        Potencia tu rendimiento con clases impartidas por instructores certificados, planes personalizados y seguimiento de tu progreso semanal.
                    </Text>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9', height: 65, width: '100%', borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}
                    >
                        <Text style={{ color: C.text, fontWeight: '900', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>Volver</Text>
                    </TouchableOpacity>
                </View>
            </Modal>

            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={C.card} />

            {/* HEADER */}
            <View style={{ paddingTop: 60, paddingBottom: 20, paddingHorizontal: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.card }}>
                <TouchableOpacity onPress={() => router.back()} style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : C.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}>
                    <ChevronLeft color={accent} size={24} />
                </TouchableOpacity>
                <Text style={{ color: C.text, fontSize: 20, fontWeight: '900', textTransform: 'uppercase', letterSpacing: -1 }}>Academias</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView 
                ref={scrollViewRef} 
                showsVerticalScrollIndicator={false} 
                contentContainerStyle={{ paddingBottom: 120 }} 
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAcademias(); }} tintColor={accent} />}
            >
                {/* FILTROS DE DEPORTE */}
                <View style={{ paddingVertical: 20, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border }}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 25 }}>
                        {CATEGORIAS.map(cat => (
                            <TouchableOpacity
                                key={cat.id}
                                onPress={() => setActiveSport(cat.id)}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    paddingHorizontal: 18,
                                    height: 40,
                                    borderRadius: 12,
                                    marginRight: 10,
                                    backgroundColor: activeSport === cat.id ? accent : (isDark ? 'rgba(255,255,255,0.03)' : '#F1F5F9'),
                                    borderWidth: 1,
                                    borderColor: activeSport === cat.id ? accent : C.border
                                }}
                            >
                                <cat.icon color={activeSport === cat.id ? 'white' : C.sub} size={14} />
                                <Text style={{ marginLeft: 8, color: activeSport === cat.id ? 'white' : C.text, fontWeight: '900', fontSize: 10, textTransform: 'uppercase' }}>{cat.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* BANNER INFORMATIVO */}
                <View style={{ padding: 25 }}>
                    <LinearGradient
                        colors={[accent, '#6d28d9']}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        style={{ borderRadius: 35, padding: 30, shadowColor: accent, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 }}
                    >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                            <View style={{ width: 44, height: 44, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                                <GraduationCap color="white" size={24} />
                            </View>
                            <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                                <Text style={{ color: 'white', fontWeight: '900', fontSize: 8, letterSpacing: 1 }}>INSCRIPCIONES 2026</Text>
                            </View>
                        </View>
                        <Text style={{ color: 'white', fontSize: 28, fontWeight: '900', textTransform: 'uppercase', letterSpacing: -1 }}>Aprende de los Mejores</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '700', marginTop: 5 }}>Inscríbete en una academia y sube tu nivel de juego con XP garantizados.</Text>
                    </LinearGradient>
                </View>

                <Text style={{ color: accent, fontWeight: '900', fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, marginHorizontal: 40, marginTop: 10, marginBottom: 20 }}>Academias Disponibles</Text>

                {/* LISTA DE ACADEMIAS FILTRADA */}
                <View style={{ paddingHorizontal: 25 }}>
                    {loading && !refreshing ? (
                        <ActivityIndicator color={accent} style={{ marginTop: 40 }} />
                    ) : filteredAcademias.length === 0 ? (
                        <View style={{ padding: 60, alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: C.border, borderRadius: 35 }}>
                            <BookOpen color={C.sub} size={32} />
                            <Text style={{ color: C.sub, fontWeight: '800', fontSize: 10, marginTop: 15, textTransform: 'uppercase' }}>No hay academias para este deporte</Text>
                        </View>
                    ) : (
                        filteredAcademias.map((academia) => (
                            <TouchableOpacity 
                                key={academia.id}
                                activeOpacity={0.95}
                                style={{ 
                                    backgroundColor: C.card, 
                                    borderRadius: 35, 
                                    marginBottom: 25, 
                                    overflow: 'hidden', 
                                    borderWidth: 1, 
                                    borderColor: C.border, 
                                    shadowColor: '#000', 
                                    shadowOpacity: isDark ? 0.3 : 0.05, 
                                    shadowRadius: 15,
                                    elevation: isDark ? 10 : 0
                                }}
                            >
                                <View style={{ height: 180 }}>
                                    <Image source={{ uri: academia.image || academia.imagen || 'https://images.unsplash.com/photo-1526232759583-d6f44a2a4bba' }} style={StyleSheet.absoluteFill} />
                                    <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={StyleSheet.absoluteFill} />
                                    
                                    <View style={{ position: 'absolute', top: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}>
                                        <CreditCard size={12} color="#fbbf24" />
                                        <Text style={{ color: 'white', fontWeight: '900', fontSize: 11, marginLeft: 8 }}>${(academia.price || academia.precio || 0).toLocaleString('es-CL')}</Text>
                                    </View>

                                    <View style={{ position: 'absolute', bottom: 20, left: 25 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                            <View style={{ backgroundColor: accent, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                                                <Text style={{ color: 'white', fontWeight: '900', fontSize: 8 }}>{academia.status === 'active' ? 'ACTIVA' : 'DISPONIBLE'}</Text>
                                            </View>
                                            <Text style={{ color: 'rgba(255,255,255,0.8)', fontWeight: '900', fontSize: 9, marginLeft: 10, textTransform: 'uppercase', letterSpacing: 1 }}>{academia.level || academia.nivel || 'General'}</Text>
                                        </View>
                                        <Text style={{ color: 'white', fontSize: 24, fontWeight: '900', textTransform: 'uppercase', letterSpacing: -0.5 }}>{academia.name || academia.nombre}</Text>
                                    </View>
                                </View>

                                <View style={{ padding: 25 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
                                        <MapPin size={12} color={C.sub} />
                                        <Text style={{ color: C.sub, fontSize: 11, fontWeight: '700', marginLeft: 8 }}>{academia.location || academia.ubicacion || 'Sede Central'}</Text>
                                    </View>

                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 15, borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9' }}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ color: C.sub, fontSize: 8, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 }}>HORARIO</Text>
                                            <Text style={{ color: C.text, fontSize: 13, fontWeight: '900' }}>{academia.schedule || academia.horario || 'Por confirmar'}</Text>
                                        </View>
                                        <View style={{ flex: 1, alignItems: 'center', borderLeftWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9' }}>
                                            <Text style={{ color: C.sub, fontSize: 8, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 }}>ALUMNOS</Text>
                                            <Text style={{ color: C.text, fontSize: 16, fontWeight: '900' }}>{academia.enrolled || academia.cupos || '0/20'}</Text>
                                        </View>
                                    </View>

                                    <TouchableOpacity 
                                        activeOpacity={0.8}
                                        style={{ backgroundColor: accent, height: 50, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginTop: 10, flexDirection: 'row', shadowColor: accent, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 }}
                                    >
                                        <Text style={{ color: 'white', fontWeight: '900', fontSize: 13, letterSpacing: 1 }}>VER DETALLES</Text>
                                        <ArrowRight size={16} color="white" style={{ marginLeft: 10 }} />
                                    </TouchableOpacity>
                                </View>
                            </TouchableOpacity>
                        ))
                    )}
                </View>

            </ScrollView>
        </View>
    );
}
