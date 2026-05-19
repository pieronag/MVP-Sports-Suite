import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, Image,
    StatusBar, ActivityIndicator, Dimensions, StyleSheet,
    RefreshControl, BackHandler, Modal, Linking,
    Alert
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import {
    ChevronLeft, Trophy, Calendar, MapPin, Users,
    Activity, Zap, Info, ArrowRight,
    LayoutGrid, CreditCard, ShieldCheck, Star,
    Compass, Target, Dribbble, Medal, X, CheckCircle2, XCircle, ChevronRight
} from 'lucide-react-native';
import { useAuth } from '../../store/useAuth';
import { LinearGradient } from 'expo-linear-gradient';
import { tournamentService, Tournament } from '../../services/tournamentService';
import { teamService, Team } from '../../services/teamService';
import { venueService } from '../../services/venueService';

const { width, height } = Dimensions.get('window');

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
    accent: '#f43f5e'
};

const CATEGORIAS = [
    { id: 'todo', name: 'Todos', icon: Compass },
    { id: 'futbol', name: 'Fútbol', icon: Activity },
    { id: 'padel', name: 'Pádel', icon: Target },
    { id: 'tenis', name: 'Tenis', icon: Trophy },
    { id: 'basquet', name: 'Básquet', icon: Dribbble },
];

const statusMap: Record<string, string> = {
    'upcoming': 'PRÓXIMAMENTE',
    'active': 'EN CURSO',
    'completed': 'FINALIZADO',
    'open': 'ABIERTO'
};

export default function TorneosScreen() {
    const router = useRouter();
    const { theme, user } = useAuth();
    const isDark = theme === 'dark';
    const C = isDark ? THEME.dark : THEME.light;
    const accent = THEME.accent;
    const scrollViewRef = useRef<ScrollView>(null);

    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [userTeams, setUserTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeSport, setActiveSport] = useState('todo');

    // ESTADO PARA ALERTAS CUSTOM
    const [customAlert, setCustomAlert] = useState<{
        visible: boolean;
        title: string;
        message: string;
        type: 'success' | 'error';
    }>({ visible: false, title: '', message: '', type: 'success' });

    // Modales
    const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
    const [showInfoModal, setShowInfoModal] = useState(false);
    const [showTeamModal, setShowTeamModal] = useState(false);
    const [showTeamsListModal, setShowTeamsListModal] = useState(false);
    const [checkingReg, setCheckingReg] = useState(false);
    const [userRegistrations, setUserRegistrations] = useState<string[]>([]);

    const fetchTournaments = async () => {
        if (!refreshing) setLoading(true);
        try {
            const [data, teams] = await Promise.all([
                tournamentService.getTournaments(),
                user ? teamService.getUserTeams(user.uid) : Promise.resolve([])
            ]);
            setTournaments(data);
            if (teams) setUserTeams(teams);

            if (user) {
                const regs = [];
                for (const t of data) {
                    const isReg = await tournamentService.isUserRegistered(t.id, user.uid);
                    if (isReg) {
                        regs.push(t.id);
                        // AUTO-REPARACIÓN: Si está registrado pero no aparece en el listado de teams
                        const teamInList = t.teams?.some((team: any) => team.userId === user.uid || team.id === (teams.length > 0 ? teams[0].id : null));
                        if (!teamInList && teams.length > 0) {
                            const myTeam = teams[0]; // Usamos el primer equipo del usuario por defecto para la sincronización
                            await tournamentService.registerTeamInTournament(t.id, { id: myTeam.id, name: myTeam.name, logo: myTeam.imageUrl }, user.uid, user.displayName || 'Usuario MVP', t.price);
                        }
                    }
                }
                setUserRegistrations(regs);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            fetchTournaments();
        }, [user])
    );

    const handleInscribirse = async (torneo: Tournament) => {
        setSelectedTournament(torneo);
        setShowTeamModal(true);
        
        // REFRESCAR EQUIPOS PARA VER FOTO ACTUAL
        if (user) {
            const freshTeams = await teamService.getUserTeams(user.uid);
            setUserTeams(freshTeams);
        }

        if (torneo.tenantId) {
            const tenant = await venueService.getVenueById(torneo.tenantId);
            if (tenant) {
                setSelectedTournament({
                    ...torneo,
                    location: tenant.address || torneo.location,
                    venueName: tenant.name,
                    coordinates: tenant.location
                });
            }
        }
    };

    const handleVerInfo = async (torneo: Tournament) => {
        setSelectedTournament(torneo);
        setShowInfoModal(true);

        if (torneo.tenantId) {
            const tenant = await venueService.getVenueById(torneo.tenantId);
            if (tenant) {
                setSelectedTournament({
                    ...torneo,
                    location: tenant.address || torneo.location,
                    venueName: tenant.name,
                    coordinates: tenant.location
                });
            }
        }
    };

    const handleOpenMap = () => {
        if (!selectedTournament?.location) return;
        const query = encodeURIComponent(selectedTournament.location);
        const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
        Linking.openURL(url);
    };

    const processRegistration = async (team: Team) => {
        if (!selectedTournament || !user) return;

        setCheckingReg(true);
        try {
            const isAlready = await tournamentService.isTeamRegistered(selectedTournament.id, team.id);
            if (isAlready) {
                setCustomAlert({
                    visible: true,
                    title: 'YA REGISTRADO',
                    message: 'TU EQUIPO YA SE ENCUENTRA INSCRITO EN ESTE TORNEO.',
                    type: 'error'
                });
                setCheckingReg(false);
                return;
            }

            setShowTeamModal(false);

            router.push({
                pathname: '/checkout',
                params: {
                    type: 'tournament',
                    tournamentId: selectedTournament.id,
                    teamId: team.id,
                    tournamentName: selectedTournament.name,
                    price: selectedTournament.price,
                    venueName: selectedTournament.venueName || 'POR CONFIRMAR',
                    location: selectedTournament.location || 'UBICACIÓN POR CONFIRMAR',
                    category: selectedTournament.category,
                    tournamentType: selectedTournament.type,
                    teamName: team.name,
                    tenantId: selectedTournament.tenantId || 'system'
                }
            } as any);

        } catch (error) {
            Alert.alert("Error", "No pudimos verificar tu inscripción.");
        } finally {
            setCheckingReg(false);
        }
    };

    const filteredTournaments = useMemo(() => {
        if (activeSport === 'todo') return tournaments;
        return tournaments.filter(t => {
            const cat = t.category?.toLowerCase() || '';
            const sport = t.sport?.toLowerCase() || '';
            return cat.includes(activeSport) || sport.includes(activeSport);
        });
    }, [tournaments, activeSport]);

    return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
            {/* PRÓXIMAMENTE MODAL OVERLAY */}
            <Modal visible={true} transparent={false} animationType="fade">
                <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: 30 }}>
                    <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
                    <View style={{ width: 140, height: 140, borderRadius: 50, backgroundColor: accent + '15', alignItems: 'center', justifyContent: 'center', marginBottom: 35, borderWidth: 2, borderColor: accent + '30' }}>
                        <Trophy color={accent} size={64} strokeWidth={1.5} />
                    </View>
                    <Text style={{ color: C.text, fontSize: 32, fontWeight: '900', textAlign: 'center', textTransform: 'uppercase', letterSpacing: -1, marginBottom: 15 }}>Torneos MVP</Text>
                    <View style={{ backgroundColor: accent, paddingHorizontal: 15, paddingVertical: 6, borderRadius: 10, marginBottom: 25 }}>
                        <Text style={{ color: 'white', fontSize: 10, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase' }}>Próximamente</Text>
                    </View>
                    <Text style={{ color: C.sub, fontSize: 14, fontWeight: '700', textAlign: 'center', lineHeight: 22, maxWidth: 300, marginBottom: 45 }}>
                        Estamos preparando las ligas y copas más competitivas con premios exclusivos y seguimiento de estadísticas en tiempo real. ¡Prepárate para la gloria!
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
            <View style={{ paddingTop: 60, paddingBottom: 20, paddingHorizontal: 30, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border }}>
                <TouchableOpacity onPress={() => router.back()} style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : C.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}>
                    <ChevronLeft color={accent} size={24} />
                </TouchableOpacity>
                <Text style={{ color: C.text, fontSize: 20, fontWeight: '900', textTransform: 'uppercase', letterSpacing: -1 }}>Torneos</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView
                ref={scrollViewRef}
                contentContainerStyle={{ paddingBottom: 120 }}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchTournaments(); }} tintColor={accent} />}
            >
                {/* FILTROS */}
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

                {/* BANNER */}
                <View style={{ padding: 25 }}>
                    <LinearGradient
                        colors={[accent, '#be123c']}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        style={{ borderRadius: 35, padding: 30, overflow: 'hidden', shadowColor: accent, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 }}
                    >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                            <View style={{ width: 44, height: 44, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                                <Trophy color="white" size={24} />
                            </View>
                            <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                                <Text style={{ color: 'white', fontWeight: '900', fontSize: 8, letterSpacing: 1 }}>TEMPORADA 2026</Text>
                            </View>
                        </View>
                        <Text style={{ color: 'white', fontSize: 28, fontWeight: '900', textTransform: 'uppercase', letterSpacing: -1 }}>Gloria Máxima</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '700', marginTop: 5 }}>Compite en la liga más prestigiosa y gana premios exclusivos.</Text>
                    </LinearGradient>
                </View>

                <Text style={{ color: accent, fontWeight: '900', fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, marginHorizontal: 40, marginTop: 10, marginBottom: 20 }}>Torneos Disponibles</Text>

                <View style={{ paddingHorizontal: 25 }}>
                    {loading && !refreshing ? (
                        <ActivityIndicator color={accent} style={{ marginTop: 40 }} />
                    ) : filteredTournaments.length === 0 ? (
                        <View style={{ padding: 60, alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: C.border, borderRadius: 35 }}>
                            <Trophy color={C.sub} size={32} />
                            <Text style={{ color: C.sub, fontWeight: '800', fontSize: 10, marginTop: 15, textTransform: 'uppercase' }}>No hay torneos disponibles</Text>
                        </View>
                    ) : (
                        filteredTournaments.map((torneo) => (
                            <TournamentEliteCard
                                key={torneo.id}
                                torneo={torneo}
                                isDark={isDark}
                                C={C}
                                accent={accent}
                                isRegistered={userRegistrations.includes(torneo.id)}
                                onInfo={() => handleVerInfo(torneo)}
                                onRegister={() => handleInscribirse(torneo)}
                                onSeeTeams={async () => {
                                    setSelectedTournament(torneo);
                                    setShowTeamsListModal(true);
                                    // Refrescar datos del torneo específico al abrir
                                    try {
                                        const freshTournament = await tournamentService.getTournamentById(torneo.id);
                                        if (freshTournament) setSelectedTournament(freshTournament);
                                    } catch (e) { console.error("Error refreshing tournament info", e); }
                                }}
                            />
                        ))
                    )}
                </View>

                {/* MODAL DE ALERTA CUSTOM */}
                <Modal visible={customAlert.visible} transparent animationType="fade">
                    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', alignItems: 'center', justifyContent: 'center', padding: 30 }}>
                        <View style={{ backgroundColor: C.card, borderRadius: 35, width: '100%', padding: 35, alignItems: 'center', borderWidth: 1, borderColor: C.border }}>
                            <View style={{ width: 80, height: 80, borderRadius: 30, backgroundColor: customAlert.type === 'success' ? '#10b98120' : '#ef444420', alignItems: 'center', justifyContent: 'center', marginBottom: 25 }}>
                                {customAlert.type === 'success' ? (
                                    <CheckCircle2 color="#10b981" size={40} />
                                ) : (
                                    <XCircle color="#ef4444" size={40} />
                                )}
                            </View>
                            <Text style={{ color: C.text, fontSize: 20, fontWeight: '900', textAlign: 'center', textTransform: 'uppercase', marginBottom: 10 }}>{customAlert.title}</Text>
                            <Text style={{ color: C.sub, fontSize: 13, fontWeight: '700', textAlign: 'center', lineHeight: 20, marginBottom: 30 }}>{customAlert.message}</Text>

                            <TouchableOpacity
                                onPress={() => setCustomAlert({ ...customAlert, visible: false })}
                                style={{ backgroundColor: customAlert.type === 'success' ? '#10b981' : '#ef4444', height: 55, width: '100%', borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}
                            >
                                <Text style={{ color: 'white', fontWeight: '900', fontSize: 14 }}>ENTENDIDO</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            </ScrollView>

            <Modal visible={showInfoModal} transparent animationType="fade">
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', padding: 30 }}>
                    <View style={{ backgroundColor: C.card, borderRadius: 40, padding: 35, maxHeight: '85%', borderWidth: 1, borderColor: C.border }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 }}>
                            <View>
                                <Text style={{ color: C.text, fontSize: 20, fontWeight: '900', textTransform: 'uppercase' }}>Detalles del Torneo</Text>
                                <Text style={{ color: C.sub, fontSize: 10, fontWeight: '700' }}>INFORMACIÓN Y REGLAMENTOS</Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowInfoModal(false)} style={{ width: 40, height: 40, borderRadius: 15, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}>
                                <X color={C.text} size={18} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={{ marginBottom: 25 }}>
                                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                                    <View style={{ backgroundColor: accent + '15', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, alignSelf: 'flex-start', borderWidth: 1, borderColor: accent + '30' }}>
                                        <Text style={{ color: accent, fontWeight: '900', fontSize: 10, letterSpacing: 1 }}>{selectedTournament?.sport?.toUpperCase() || 'DEPORTE'}</Text>
                                    </View>
                                    <View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#f1f5f9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, alignSelf: 'flex-start', borderWidth: 1, borderColor: C.border }}>
                                        <Text style={{ color: C.sub, fontWeight: '900', fontSize: 10, letterSpacing: 1 }}>{selectedTournament?.category?.toUpperCase()}</Text>
                                    </View>
                                </View>
                                <Text style={{ color: C.text, fontSize: 28, fontWeight: '900', letterSpacing: -1 }}>{selectedTournament?.name}</Text>
                            </View>

                            <View style={{ marginBottom: 20, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC', padding: 20, borderRadius: 25, borderWidth: 1, borderColor: C.border }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: accent + '20', alignItems: 'center', justifyContent: 'center' }}>
                                        <MapPin size={18} color={accent} />
                                    </View>
                                    <View style={{ marginLeft: 15, flex: 1 }}>
                                        <Text style={{ color: C.sub, fontSize: 8, fontWeight: '900', textTransform: 'uppercase' }}>Recinto Oficial</Text>
                                        <Text style={{ color: C.text, fontSize: 14, fontWeight: '900' }}>{selectedTournament?.venueName || 'Sede por confirmar'}</Text>
                                    </View>
                                </View>
                            </View>

                            <View style={{ marginBottom: 20 }}>
                                <View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC', borderRadius: 25, padding: 20, borderWidth: 1, borderColor: C.border }}>
                                    <Text style={{ color: C.sub, fontSize: 9, fontWeight: '900', letterSpacing: 1, marginBottom: 15 }}>🏆 PREMIOS PRINCIPALES</Text>
                                    <View style={{ gap: 12 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Trophy size={14} color="#fbbf24" />
                                            <Text style={{ color: C.text, fontSize: 12, fontWeight: '900', marginLeft: 10, textTransform: 'uppercase' }}>1° {selectedTournament?.prize1st || selectedTournament?.prize1 || 'POR DEFINIR'}</Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Medal size={14} color="#94a3b8" />
                                            <Text style={{ color: C.text, fontSize: 12, fontWeight: '900', marginLeft: 10, textTransform: 'uppercase' }}>2° {selectedTournament?.prize2nd || selectedTournament?.prize2 || 'POR DEFINIR'}</Text>
                                        </View>
                                    </View>
                                </View>
                            </View>

                            <View style={{ marginBottom: 20 }}>
                                <View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC', borderRadius: 25, padding: 20, borderWidth: 1, borderColor: C.border }}>
                                    <Text style={{ color: C.sub, fontSize: 9, fontWeight: '900', letterSpacing: 1, marginBottom: 8 }}>REGLAS Y DESCRIPCIÓN</Text>
                                    <Text style={{ color: C.text, fontSize: 12, fontWeight: '700', lineHeight: 18 }}>{selectedTournament?.description}</Text>
                                </View>
                            </View>
                        </ScrollView>

                        <TouchableOpacity
                            onPress={() => { setShowInfoModal(false); if (selectedTournament) handleInscribirse(selectedTournament); }}
                            style={{ backgroundColor: accent, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', marginTop: 10 }}
                        >
                            <Zap color="white" size={18} />
                            <Text style={{ color: 'white', fontWeight: '900', fontSize: 13, marginLeft: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Inscribirme Ahora</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal visible={showTeamModal} transparent animationType="fade">
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', padding: 30 }}>
                    <View style={{ backgroundColor: C.card, borderRadius: 40, padding: 35, maxHeight: '70%', borderWidth: 1, borderColor: C.border }}>
                        <Text style={{ color: C.text, fontSize: 22, fontWeight: '900', textAlign: 'center', marginBottom: 10 }}>Postular Equipo</Text>
                        <Text style={{ color: C.sub, fontSize: 11, fontWeight: '700', textAlign: 'center', marginBottom: 30 }}>SELECCIONA EL CLUB PARA EL TORNEO</Text>

                        {checkingReg ? (
                            <ActivityIndicator color={accent} size="large" style={{ marginVertical: 40 }} />
                        ) : (
                            <ScrollView showsVerticalScrollIndicator={false}>
                                {userTeams.filter(team => {
                                    const tSport = selectedTournament?.sport?.toLowerCase() || '';
                                    const teamSport = team.sport?.toLowerCase() || '';
                                    return !tSport || teamSport === tSport;
                                }).length === 0 ? (
                                    <View style={{ alignItems: 'center', padding: 20 }}>
                                        <Users color={C.sub} size={32} />
                                        <Text style={{ color: C.sub, fontSize: 12, fontWeight: '800', marginTop: 15, textAlign: 'center' }}>
                                            NO TIENES EQUIPOS DE {selectedTournament?.sport?.toUpperCase() || 'ESTE DEPORTE'}
                                        </Text>
                                    </View>
                                ) : (
                                    userTeams
                                        .filter(team => {
                                            const tSport = selectedTournament?.sport?.toLowerCase() || '';
                                            const teamSport = team.sport?.toLowerCase() || '';
                                            return !tSport || teamSport === tSport;
                                        })
                                        .map(team => (
                                            <TouchableOpacity
                                                key={team.id}
                                                onPress={() => processRegistration(team)}
                                                style={{
                                                    flexDirection: 'row', alignItems: 'center', padding: 15,
                                                    backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC',
                                                    borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: C.border
                                                }}
                                            >
                                                <View style={{ width: 45, height: 45, borderRadius: 15, backgroundColor: accent + '20', alignItems: 'center', justifyContent: 'center' }}>
                                                    {team.imageUrl ? (
                                                        <Image source={{ uri: team.imageUrl }} style={{ width: '100%', height: '100%', borderRadius: 15 }} />
                                                    ) : (
                                                        <Users color={accent} size={20} />
                                                    )}
                                                </View>
                                                <View style={{ marginLeft: 15, flex: 1 }}>
                                                    <Text style={{ color: C.text, fontSize: 16, fontWeight: '900' }}>{team.name}</Text>
                                                    <Text style={{ color: C.sub, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>{team.sport}</Text>
                                                </View>
                                                <ChevronRight color={C.sub} size={18} />
                                            </TouchableOpacity>
                                        ))
                                )}
                            </ScrollView>
                        )}

                        <TouchableOpacity
                            onPress={() => setShowTeamModal(false)}
                            style={{ marginTop: 25, height: 55, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9' }}
                        >
                            <Text style={{ color: C.text, fontWeight: '900', fontSize: 12, textTransform: 'uppercase' }}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <TeamsListModal 
                visible={showTeamsListModal}
                onClose={() => setShowTeamsListModal(false)}
                tournament={selectedTournament}
                isDark={isDark}
                C={C}
                accent={accent}
            />
        </View>
    );
}

const TournamentEliteCard = ({ 
    torneo, 
    isDark, 
    C, 
    accent, 
    onInfo, 
    onRegister, 
    onSeeTeams, 
    isRegistered 
}: any) => {
    const getPlaceholderImage = () => {
        if (torneo.imageUrl) return torneo.imageUrl;
        if (torneo.image) return torneo.image;
        const cat = torneo.category?.toLowerCase() || '';
        if (cat.includes('futbol')) return 'https://images.unsplash.com/photo-1574629810360-7efbbe195018';
        if (cat.includes('padel')) return 'https://images.unsplash.com/photo-1595435064215-68d148332009';
        return 'https://images.unsplash.com/photo-1579952975225-451631742911';
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '--';
        const parts = dateStr.split('-');
        if (parts.length !== 3) return dateStr;
        const [year, month, day] = parts;
        const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
        return `${day} ${months[parseInt(month) - 1]}`;
    };

    return (
        <View
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
                <Image source={{ uri: getPlaceholderImage() }} style={StyleSheet.absoluteFill} />
                <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={StyleSheet.absoluteFill} />

                <View style={{ position: 'absolute', top: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}>
                    <CreditCard size={12} color="#fbbf24" />
                    <Text style={{ color: 'white', fontWeight: '900', fontSize: 11, marginLeft: 8 }}>${torneo.price.toLocaleString('es-CL')}</Text>
                </View>

                <View style={{ position: 'absolute', bottom: 20, left: 25 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                        <View style={{ backgroundColor: accent, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                            <Text style={{ color: 'white', fontWeight: '900', fontSize: 8 }}>{statusMap[torneo.status] || torneo.status.toUpperCase()}</Text>
                        </View>
                        <Text style={{ color: '#fbbf24', fontWeight: '900', fontSize: 9, marginLeft: 10, textTransform: 'uppercase', letterSpacing: 1 }}>{torneo.sport || 'General'}</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.6)', fontWeight: '900', fontSize: 9, marginLeft: 8, textTransform: 'uppercase', letterSpacing: 1 }}>• {torneo.category}</Text>
                    </View>
                    <Text style={{ color: 'white', fontSize: 24, fontWeight: '900', textTransform: 'uppercase', letterSpacing: -0.5 }}>{torneo.name}</Text>
                </View>
            </View>

            <View style={{ padding: 25 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9' }}>
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: C.sub, fontSize: 8, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 }}>INICIO</Text>
                        <Text style={{ color: C.text, fontSize: 16, fontWeight: '900' }}>{formatDate(torneo.tournamentStartDate)}</Text>
                    </View>
                    <View style={{ flex: 1, alignItems: 'center', borderLeftWidth: 1, borderRightWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9' }}>
                        <Text style={{ color: C.sub, fontSize: 8, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 }}>EQUIPOS</Text>
                        <Text style={{ color: C.text, fontSize: 16, fontWeight: '900' }}>{torneo.enrolledTeams}/{torneo.maxTeams}</Text>
                    </View>
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                        <Text style={{ color: C.sub, fontSize: 8, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 }}>MODALIDAD</Text>
                        <Text style={{ color: C.text, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' }}>{torneo.type || 'LIGA'}</Text>
                    </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
                    <TouchableOpacity
                        onPress={onSeeTeams}
                        style={{ flex: 1, height: 50, borderRadius: 18, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}
                    >
                        <Users size={18} color={C.sub} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={onInfo}
                        style={{ flex: 1, height: 50, borderRadius: 18, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}
                    >
                        <Info size={18} color={C.sub} />
                    </TouchableOpacity>

                    {isRegistered ? (
                        <View style={{ flex: 3, backgroundColor: '#10b98120', height: 50, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', borderWidth: 1, borderColor: '#10b98140' }}>
                            <ShieldCheck color="#10b981" size={18} />
                            <Text style={{ color: '#10b981', fontWeight: '900', fontSize: 13, marginLeft: 10, textTransform: 'uppercase' }}>Ya Inscrito</Text>
                        </View>
                    ) : (
                        <TouchableOpacity 
                            onPress={onRegister}
                            style={{ flex: 3, backgroundColor: accent, height: 50, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', shadowColor: accent, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 }}
                        >
                            <Zap color="white" size={18} />
                            <Text style={{ color: 'white', fontWeight: '900', fontSize: 13, marginLeft: 10, textTransform: 'uppercase' }}>Inscribirse</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </View>
    );
};

// MODAL PARA VER EQUIPOS INSCRITOS
const TeamsListModal = ({ visible, onClose, tournament, isDark, C, accent }: any) => {
    const [refreshing, setRefreshing] = useState(false);
    const [localTournament, setLocalTournament] = useState(tournament);
    const [liveTeams, setLiveTeams] = useState<any[]>([]);

    useEffect(() => {
        setLocalTournament(tournament);
    }, [tournament]);

    useEffect(() => {
        if (visible && localTournament?.teams) {
            fetchLiveTeams();
        }
    }, [visible, localTournament]);

    const fetchLiveTeams = async () => {
        if (!localTournament?.teams) return;
        const teams = localTournament.teams || [];
        
        try {
            const updatedTeams = await Promise.all(
                teams.map(async (t: any) => {
                    try {
                        const liveData = await teamService.getTeamById(t.id);
                        return liveData ? { ...t, ...liveData } : t;
                    } catch {
                        return t;
                    }
                })
            );
            setLiveTeams(updatedTeams);
        } catch (error) {
            console.error("Error fetching live teams:", error);
            setLiveTeams(teams);
        }
    };

    if (!localTournament) return null;

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            const data = await tournamentService.getTournamentById(localTournament.id);
            if (data) {
                setLocalTournament(data);
                // Also fetch live data for the new teams list
                const teams = data.teams || [];
                const updatedTeams = await Promise.all(
                    teams.map(async (t: any) => {
                        const liveData = await teamService.getTeamById(t.id);
                        return liveData ? { ...t, ...liveData } : t;
                    })
                );
                setLiveTeams(updatedTeams);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setRefreshing(false);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', padding: 25 }}>
                <View style={{ backgroundColor: C.card, borderRadius: 45, padding: 35, maxHeight: '80%', borderWidth: 1, borderColor: C.border }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
                        <View>
                            <Text style={{ color: C.text, fontSize: 22, fontWeight: '900', textTransform: 'uppercase', letterSpacing: -1 }}>Inscritos</Text>
                            <Text style={{ color: accent, fontSize: 10, fontWeight: '900', letterSpacing: 1 }}>{liveTeams.length} / {localTournament.maxTeams} ESCUADRAS</Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <TouchableOpacity onPress={handleRefresh} style={{ width: 45, height: 45, borderRadius: 18, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}>
                                <Activity color={accent} size={20} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={onClose} style={{ width: 45, height: 45, borderRadius: 18, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}>
                                <X color={C.text} size={20} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {refreshing ? (
                        <ActivityIndicator color={accent} size="large" style={{ marginVertical: 60 }} />
                    ) : (
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                            {liveTeams.length === 0 ? (
                                <View style={{ padding: 60, alignItems: 'center' }}>
                                    <View style={{ width: 80, height: 80, borderRadius: 30, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                                        <Users color={C.sub} size={35} strokeWidth={1} />
                                    </View>
                                    <Text style={{ color: C.sub, fontSize: 12, fontWeight: '900', textAlign: 'center', textTransform: 'uppercase', letterSpacing: 1.5, lineHeight: 18 }}>El campo está esperando...{'\n'}Aún no hay inscritos</Text>
                                </View>
                            ) : (
                                liveTeams.map((team: any, index: number) => (
                                    <View 
                                        key={team.id || index}
                                        style={{ 
                                            flexDirection: 'row', alignItems: 'center', padding: 18, 
                                            backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#F8FAFC', 
                                            borderRadius: 25, marginBottom: 15, borderWidth: 1, borderColor: C.border 
                                        }}
                                    >
                                        <View style={{ width: 55, height: 55, borderRadius: 18, backgroundColor: accent + '10', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: accent + '20', overflow: 'hidden' }}>
                                            {team.imageUrl ? (
                                                <Image source={{ uri: team.imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                                            ) : (
                                                <Trophy color={accent} size={24} />
                                            )}
                                        </View>
                                        <View style={{ marginLeft: 20, flex: 1 }}>
                                            <Text style={{ color: C.text, fontSize: 18, fontWeight: '900', textTransform: 'uppercase' }}>{team.name}</Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#10b981', marginRight: 8 }} />
                                                <Text style={{ color: C.sub, fontSize: 10, fontWeight: '900', textTransform: 'uppercase' }}>Escuadra Confirmada</Text>
                                            </View>
                                        </View>
                                        <Star color="#fbbf24" size={16} />
                                    </View>
                                ))
                            )}
                        </ScrollView>
                    )}

                    <TouchableOpacity
                        onPress={onClose}
                        style={{ marginTop: 25, height: 70, borderRadius: 25, alignItems: 'center', justifyContent: 'center', backgroundColor: accent, shadowColor: accent, shadowOpacity: 0.4, shadowRadius: 15, elevation: 10 }}
                    >
                        <Text style={{ color: 'white', fontWeight: '900', fontSize: 15, letterSpacing: 2, textTransform: 'uppercase' }}>Volver al Torneo</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};
