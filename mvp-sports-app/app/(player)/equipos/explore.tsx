import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
    View, Text, ScrollView, TouchableOpacity, TextInput, Image, 
    StatusBar, ActivityIndicator, Dimensions, StyleSheet,
    RefreshControl, Modal, BackHandler, KeyboardAvoidingView, Platform
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { 
    ChevronLeft, Plus, Search, Users, User, Shield, ChevronRight, 
    Compass, ArrowRight, X, Trophy, Zap, UserPlus, CheckCircle2, AlertCircle
} from 'lucide-react-native';
import { useAuth } from '../../../store/useAuth';
import { LinearGradient } from 'expo-linear-gradient';
import { teamService, Team } from '../../../services/teamService';

const { width } = Dimensions.get('window');

// 🎨 PALETA REFINADA ELITE 2026
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
    orange: '#f97316',
    error: '#f43f5e'
};

const CATEGORIAS = [
    { id: 'todo', name: 'Todos' },
    { id: 'futbol', name: 'Fútbol' },
    { id: 'futbolito', name: 'Futbolito' },
    { id: 'padel', name: 'Pádel' },
    { id: 'tenis', name: 'Tenis' },
    { id: 'basketball', name: 'Basket' }
];

export default function EquiposExploreScreen() {
    const scrollViewRef = useRef<ScrollView>(null);
    const router = useRouter();
    const { user, theme } = useAuth();
    const isDark = theme === 'dark';
    const C = isDark ? COLORS.dark : COLORS.light;

    const [teams, setTeams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [activeSport, setActiveSport] = useState('todo');
    
    // MODALS STATE
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [newTeamName, setNewTeamName] = useState('');
    const [newTeamSport, setNewTeamSport] = useState('futbol');
    const [inviteCode, setInviteCode] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    // FEEDBACK MODAL
    const [feedbackVisible, setFeedbackVisible] = useState(false);
    const [feedbackType, setFeedbackType] = useState<'success' | 'error'>('success');
    const [feedbackMsg, setFeedbackMsg] = useState('');

    const fetchTeams = async () => {
        if (!user) return;
        if (!refreshing) setLoading(true);
        try {
            const data = await teamService.getTeams();
            setTeams(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            fetchTeams();
        }, [user])
    );

    const showFeedback = (type: 'success' | 'error', msg: string) => {
        setFeedbackType(type);
        setFeedbackMsg(msg);
        setFeedbackVisible(true);
    };

    const handleCreateTeam = async () => {
        if (!user || !newTeamName.trim()) return;
        setActionLoading(true);
        try {
            await teamService.createTeam(newTeamName.trim(), newTeamSport, user.uid);
            setShowCreateModal(false);
            setNewTeamName('');
            fetchTeams();
            showFeedback('success', '¡Tu equipo ha sido creado con éxito!');
        } catch (error) {
            showFeedback('error', 'No pudimos crear el equipo en este momento.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleJoinByCode = async () => {
        if (!user || !inviteCode.trim()) return;
        setActionLoading(true);
        try {
            const result = await teamService.joinByInviteCode(inviteCode.trim(), user.uid);
            if (result.success) {
                setShowJoinModal(false);
                setInviteCode('');
                fetchTeams();
                showFeedback('success', `¡Bienvenido a ${result.teamName}!`);
            } else {
                showFeedback('error', result.error || 'Código inválido o equipo lleno.');
            }
        } catch (error) {
            showFeedback('error', 'Error al procesar el código.');
        } finally {
            setActionLoading(false);
        }
    };

    const filteredTeams = useMemo(() => {
        let result = teams;
        if (search) result = result.filter(t => t.name?.toLowerCase().includes(search.toLowerCase()));
        if (activeSport !== 'todo') result = result.filter(t => (t.sport?.toLowerCase() || '').includes(activeSport));
        return result;
    }, [teams, search, activeSport]);

    if (loading && !refreshing) {
        return (
            <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color={COLORS.orange} size="large" />
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

            {/* TOP BAR */}
            <View style={{ paddingTop: 60, paddingBottom: 20, paddingHorizontal: 30, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: C.border }}>
                <TouchableOpacity onPress={() => router.back()} style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}>
                    <ChevronLeft color={COLORS.orange} size={24} />
                </TouchableOpacity>
                <Text style={{ color: C.text, fontSize: 20, fontWeight: '900', textTransform: 'uppercase' }}>Equipos</Text>
                <TouchableOpacity onPress={() => setShowJoinModal(true)} style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}>
                    <UserPlus color={COLORS.orange} size={22} />
                </TouchableOpacity>
            </View>

            <ScrollView 
                ref={scrollViewRef} 
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 120 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchTeams(); }} tintColor={COLORS.orange} />}
            >
                {/* BANNER CREAR EQUIPO */}
                <View style={{ padding: 30, paddingTop: 40 }}>
                    <TouchableOpacity onPress={() => setShowCreateModal(true)} style={{ borderRadius: 35, overflow: 'hidden' }}>
                        <LinearGradient colors={['#f97316', '#ea580c']} style={{ padding: 30, flexDirection: 'row', alignItems: 'center' }}>
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: 'white', fontSize: 24, fontWeight: '900', textTransform: 'uppercase', letterSpacing: -1 }}>Crea tu Equipo</Text>
                                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '700', marginTop: 5 }}>Lidera tu propia franquicia MVP</Text>
                            </View>
                            <View style={{ width: 50, height: 50, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                                <Plus color="white" size={30} />
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* LISTA DE EQUIPOS (MIS SQUADS) */}
                <View>
                    <SectionLabel label="Mis Escuadrones" />
                    {teams.filter(t => t.members?.includes(user?.uid) || t.ownerId === user?.uid).length === 0 ? (
                        <View style={{ padding: 60, alignItems: 'center' }}>
                            <Users color={C.sub} size={50} strokeWidth={1} />
                            <Text style={{ color: C.sub, fontSize: 11, fontWeight: '800', marginTop: 15, textTransform: 'uppercase', letterSpacing: 2, textAlign: 'center' }}>Aún no perteneces a ningún equipo</Text>
                        </View>
                    ) : (
                        teams.filter(t => t.members?.includes(user?.uid) || t.ownerId === user?.uid).map(team => (
                            <TeamIsland key={`my-${team.id}`} team={team} isDark={isDark} router={router} isMember />
                        ))
                    )}
                </View>
            </ScrollView>

            {/* MODAL: CREAR EQUIPO */}
            <Modal visible={showCreateModal} animationType="slide" transparent={true}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' }}>
                        <View style={{ backgroundColor: C.card, borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 30, paddingBottom: 50, borderWidth: 1, borderColor: C.border }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
                                <Text style={{ color: C.text, fontSize: 24, fontWeight: '900', textTransform: 'uppercase' }}>Nuevo Equipo</Text>
                                <TouchableOpacity onPress={() => setShowCreateModal(false)} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}>
                                    <X color={C.text} size={20} />
                                </TouchableOpacity>
                            </View>

                            <TextInput 
                                placeholder="Ej: Los Galácticos" 
                                placeholderTextColor={isDark ? '#334155' : '#CBD5E1'}
                                value={newTeamName}
                                onChangeText={setNewTeamName}
                                style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC', borderRadius: 15, height: 65, paddingHorizontal: 20, color: C.text, fontSize: 18, fontWeight: '800', borderWidth: 1, borderColor: C.border, marginBottom: 20 }}
                            />

                            <Text style={{ color: C.sub, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', marginBottom: 10, marginLeft: 5 }}>Especialidad del Equipo</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 30 }} contentContainerStyle={{ gap: 10 }}>
                                {['futbol', 'futbolito', 'padel', 'tenis', 'basketball'].map((s) => (
                                    <TouchableOpacity 
                                        key={s}
                                        onPress={() => setNewTeamSport(s)}
                                        style={{ 
                                            paddingHorizontal: 20, height: 45, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
                                            backgroundColor: newTeamSport === s ? COLORS.orange : (isDark ? 'rgba(255,255,255,0.03)' : '#F1F5F9'),
                                            borderWidth: 1, borderColor: newTeamSport === s ? COLORS.orange : C.border
                                        }}
                                    >
                                        <Text style={{ color: newTeamSport === s ? 'white' : C.sub, fontSize: 8, fontWeight: '900', textTransform: 'uppercase' }}>{s === 'basketball' ? 'Basket' : s}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            <TouchableOpacity 
                                onPress={handleCreateTeam}
                                disabled={actionLoading || !newTeamName.trim()}
                                style={{ backgroundColor: COLORS.orange, height: 65, borderRadius: 20, alignItems: 'center', justifyContent: 'center', shadowColor: COLORS.orange, shadowOpacity: 0.3, shadowRadius: 10, opacity: newTeamName.trim() ? 1 : 0.6 }}
                            >
                                {actionLoading ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontSize: 14, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 }}>Crear Mi Equipo</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* MODAL: UNIRSE POR CÓDIGO */}
            <Modal visible={showJoinModal} animationType="fade" transparent={true}>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', alignItems: 'center', justifyContent: 'center', padding: 30 }}>
                    <View style={{ width: '100%', backgroundColor: C.card, borderRadius: 40, padding: 30, borderWidth: 1, borderColor: C.border }}>
                        <Text style={{ color: C.text, fontSize: 22, fontWeight: '900', textTransform: 'uppercase', textAlign: 'center', marginBottom: 10 }}>Unirse a Escuadrón</Text>
                        <Text style={{ color: C.sub, fontSize: 12, fontWeight: '600', textAlign: 'center', marginBottom: 30 }}>Ingresa el código secreto de invitación</Text>
                        
                        <TextInput 
                            placeholder="CÓDIGO" 
                            placeholderTextColor={C.sub}
                            value={inviteCode}
                            onChangeText={t => setInviteCode(t.toUpperCase())}
                            maxLength={6}
                            style={{ height: 80, borderRadius: 25, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9', textAlign: 'center', fontSize: 32, fontWeight: '900', color: C.text, letterSpacing: 5, marginBottom: 30, borderWidth: 1, borderColor: C.border }}
                        />

                        <TouchableOpacity 
                            onPress={handleJoinByCode}
                            disabled={actionLoading || inviteCode.length !== 6}
                            style={{ backgroundColor: COLORS.orange, height: 65, borderRadius: 20, alignItems: 'center', justifyContent: 'center', shadowColor: COLORS.orange, shadowOpacity: 0.3, shadowRadius: 10, opacity: inviteCode.length === 6 ? 1 : 0.6 }}
                        >
                            {actionLoading ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontSize: 14, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 }}>Validar Invitación</Text>}
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => setShowJoinModal(false)} style={{ marginTop: 20, alignItems: 'center' }}>
                            <Text style={{ color: C.sub, fontSize: 10, fontWeight: '900', textTransform: 'uppercase' }}>Cerrar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* FEEDBACK MODAL */}
            <FeedbackModal visible={feedbackVisible} type={feedbackType} message={feedbackMsg} onClose={() => setFeedbackVisible(false)} isDark={isDark} />
        </View>
    );
}

/** ═══ COMPONENTES SOPORTE ═══ **/

const SectionLabel = ({ label }: { label: string }) => (
    <Text style={{ color: '#f97316', fontWeight: '900', fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, marginHorizontal: 40, marginTop: 30, marginBottom: 15 }}>{label}</Text>
);

const TeamIsland = ({ team, router, isMember, isDark }: { team: any; router: any; isMember?: boolean; isDark: boolean }) => {
    const C = isDark ? COLORS.dark : COLORS.light;
    return (
        <TouchableOpacity 
            onPress={() => router.push(`/equipos/${team.id}` as any)} 
            activeOpacity={0.95} 
            style={{ marginHorizontal: 25, marginBottom: 20, backgroundColor: C.card, borderRadius: 30, borderWidth: 1, borderColor: C.border, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 }}
        >
            <View style={{ height: 160, position: 'relative' }}>
                <Image 
                    source={{ uri: team.imageUrl || 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?q=80&w=800' }} 
                    style={{ width: '100%', height: '100%' }} 
                    resizeMode="cover"
                />
                <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', padding: 25, justifyContent: 'flex-end' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                        <View style={{ backgroundColor: COLORS.orange, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 }}>
                            <Text style={{ color: 'white', fontSize: 8, fontWeight: '900', textTransform: 'uppercase' }}>{team.sport || 'POLIDEPORTIVO'}</Text>
                        </View>
                        {isMember && (
                            <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, marginLeft: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }}>
                                <Text style={{ color: 'white', fontSize: 8, fontWeight: '900', textTransform: 'uppercase' }}>MIEMBRO</Text>
                            </View>
                        )}
                    </View>
                    <Text style={{ color: 'white', fontSize: 26, fontWeight: '900', textTransform: 'uppercase', letterSpacing: -1 }}>{team.name}</Text>
                </View>
            </View>
            <View style={{ padding: 20, paddingHorizontal: 25, backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#F8FAFC', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Users color={C.sub} size={16} />
                    <Text style={{ color: C.sub, fontSize: 11, fontWeight: '800', marginLeft: 8 }}>{team.members?.length || 1} JUGADORES</Text>
                </View>
                <ArrowRight color={COLORS.orange} size={20} />
            </View>
        </TouchableOpacity>
    );
};

const FeedbackModal = ({ visible, type, message, onClose, isDark }: any) => {
    const C = isDark ? COLORS.dark : COLORS.light;
    const isError = type === 'error';
    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
                <View style={{ backgroundColor: C.card, borderRadius: 35, padding: 30, alignItems: 'center', width: '100%', borderWidth: 1, borderColor: C.border }}>
                    <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: isError ? '#ef444422' : '#10b98122', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                        {isError ? <AlertCircle color="#ef4444" size={40} /> : <CheckCircle2 color="#10b981" size={40} />}
                    </View>
                    <Text style={{ color: C.text, fontSize: 20, fontWeight: '900', textAlign: 'center', marginBottom: 10 }}>{isError ? 'Ups... algo falló' : '¡Acción exitosa!'}</Text>
                    <Text style={{ color: C.sub, fontSize: 14, fontWeight: '600', textAlign: 'center', marginBottom: 30, lineHeight: 20 }}>{message}</Text>
                    <TouchableOpacity onPress={onClose} style={{ backgroundColor: isError ? (isDark ? '#f43f5e' : '#ef4444') : '#10b981', paddingVertical: 15, paddingHorizontal: 40, borderRadius: 20, width: '100%', alignItems: 'center' }}>
                        <Text style={{ color: 'white', fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 }}>Entendido</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};
