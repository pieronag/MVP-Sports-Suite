import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
    View, Text, ScrollView, TouchableOpacity, Image, StatusBar, 
    ActivityIndicator, StyleSheet, Dimensions, RefreshControl,
    ImageBackground, TextInput, Modal, BackHandler, Alert
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { 
    ChevronLeft, ChevronRight, MoreVertical, Users, User, Shield, Trophy, MessageCircle, 
    TrendingUp, ArrowRight, Plus, Crown, Calendar, MapPin,
    X, Clock, Info, Zap, Activity, CheckCircle2, AlertCircle, Copy,
    Camera, Star
} from 'lucide-react-native';
import { useAuth } from '../../../store/useAuth';
import { LinearGradient } from 'expo-linear-gradient';
import { db } from '../../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { userService } from '../../../services/userService';
import { teamService } from '../../../services/teamService';
import { bookingService, Booking } from '../../../services/bookingService';

const { width, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CATEGORIAS = [
    { id: 'todo', name: 'Todos' },
    { id: 'futbol', name: 'Fútbol' },
    { id: 'futbolito', name: 'Futbolito' },
    { id: 'padel', name: 'Pádel' },
    { id: 'tenis', name: 'Tenis' },
    { id: 'basketball', name: 'Basket' }
];

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
    accent: '#f97316',
    success: '#10b981',
    error: '#f43f5e'
};

interface MemberProfile {
    uid: string;
    displayName: string;
    photoURL: string | null;
    tier?: string;
    ovr?: number;
}

export default function TeamDetailsScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { user, theme } = useAuth();
    const isDark = theme === 'dark';
    const C = isDark ? COLORS.dark : COLORS.light;
    const scrollViewRef = useRef<ScrollView>(null);

    const [teamInfo, setTeamInfo] = useState<any>(null);
    const [memberProfiles, setMemberProfiles] = useState<MemberProfile[]>([]);
    const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [showOptions, setShowOptions] = useState(false);

    // Modals
    const [showEditModal, setShowEditModal] = useState(false);
    const [editName, setEditName] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editSport, setEditSport] = useState('futbol');
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [codeCopied, setCodeCopied] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    // Feedback
    const [fbVisible, setFbVisible] = useState(false);
    const [fbType, setFbType] = useState<'success' | 'error'>('success');
    const [fbMsg, setFbMsg] = useState('');

    const fetchTeam = useCallback(async () => {
        if (!id) return;
        try {
            const teamDoc = await getDoc(doc(db, 'teams', id as string));
            if (teamDoc.exists()) {
                const data = { id: teamDoc.id, ...teamDoc.data() };
                setTeamInfo(data);
                const members = (data as any).members || [];
                const profiles: MemberProfile[] = [];
                for (const memberId of members.slice(0, 15)) {
                    const mp = await userService.getUserProfile(memberId);
                    profiles.push({ 
                        uid: memberId, 
                        displayName: mp?.displayName || 'Jugador', 
                        photoURL: mp?.photoURL || null, 
                        tier: mp?.tier, 
                        ovr: mp?.ovr 
                    });
                }
                setMemberProfiles(profiles);
                
                // Fetch bookings
                const allB: Booking[] = [];
                for (const mid of members.slice(0, 3)) {
                    const ub = await bookingService.getUserBookings(mid);
                    allB.push(...ub);
                }
                const now = new Date();
                setUpcomingBookings(allB
                    .filter(b => b.status === 'confirmed')
                    .filter((b, i, self) => i === self.findIndex(x => x.id === b.id))
                    .slice(0, 5)
                );
            }
        } catch (error) { console.error(error); } finally { setLoading(false); setRefreshing(false); }
    }, [id]);

    useFocusEffect(
        React.useCallback(() => {
            fetchTeam();
            const backAction = () => { router.back(); return true; };
            const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
            return () => backHandler.remove();
        }, [fetchTeam])
    );

    const showFeedback = (type: 'success' | 'error', msg: string) => {
        setFbType(type);
        setFbMsg(msg);
        setFbVisible(true);
    };

    const handleJoin = async () => {
        if (!user || !teamInfo) return;
        setActionLoading(true);
        try { 
            await teamService.joinTeam(teamInfo.id, user.uid); 
            fetchTeam(); 
            showFeedback('success', '¡Te has unido al equipo!');
        } catch (error) { 
            showFeedback('error', 'No pudimos procesar tu solicitud.'); 
        } finally { setActionLoading(false); }
    };

    const handleLeave = async () => {
        if (!user || !teamInfo || isOwner) return;
        setShowOptions(false);
        try { 
            await teamService.leaveTeam(teamInfo.id, user.uid); 
            router.back(); 
        } catch (error) { 
            showFeedback('error', 'No pudimos procesar tu salida.'); 
        }
    };

    const handleDelete = async () => {
        if (!user || !teamInfo || !isOwner) return;
        setShowDeleteModal(false);
        setActionLoading(true);
        try {
            await teamService.deleteTeam(teamInfo.id);
            router.replace('/(player)/(tabs)/equipos/explore');
        } catch (error) {
            showFeedback('error', 'No pudimos eliminar el equipo.');
        } finally {
            setActionLoading(false);
        }
    };

    const handlePickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5, // Reduced quality for base64 storage
            base64: true,
        });

        if (!result.canceled && result.assets[0].base64) {
            setActionLoading(true);
            try {
                const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
                await teamService.updateTeam(teamInfo.id as string, { imageUrl: base64Image });
                fetchTeam();
                showFeedback('success', '¡Foto del equipo actualizada!');
            } catch (error) {
                showFeedback('error', 'Error al guardar la imagen.');
            } finally {
                setActionLoading(false);
            }
        }
    };

    const handleSaveEdit = async () => {
        if (!editName.trim()) return;
        setActionLoading(true);
        try { 
            await teamService.updateTeam(teamInfo.id, { 
                name: editName.trim(), 
                description: editDescription.trim(),
                sport: editSport 
            }); 
            setShowEditModal(false); 
            fetchTeam(); 
            showFeedback('success', 'Equipo actualizado correctamente.');
        } catch (error) { 
            showFeedback('error', 'Error al guardar cambios.'); 
        } finally { setActionLoading(false); }
    };

    const isMember = user ? (teamInfo?.members?.includes(user.uid) || teamInfo?.ownerId === user.uid) : false;
    const isOwner = user ? teamInfo?.ownerId === user.uid : false;

    if (loading) return (
        <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={COLORS.accent} size="large" />
        </View>
    );

    return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* TOP ACTIONS */}
            <View style={{ position: 'absolute', top: 60, left: 30, right: 30, flexDirection: 'row', justifyContent: 'space-between', zIndex: 100 }}>
                <TouchableOpacity onPress={() => router.back()} style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}>
                    <ChevronLeft color="white" size={24} />
                </TouchableOpacity>
                {isMember && (
                    <TouchableOpacity onPress={() => setShowOptions(!showOptions)} style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}>
                        <MoreVertical color="white" size={24} />
                    </TouchableOpacity>
                )}
            </View>

            {/* OPTIONS MENU */}
            {showOptions && (
                <View style={{ position: 'absolute', top: 110, right: 30, zIndex: 110, backgroundColor: C.card, borderRadius: 20, width: 220, borderWidth: 1, borderColor: C.border, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10 }}>
                    {isOwner && (
                        <TouchableOpacity onPress={() => { 
                            setShowOptions(false); 
                            setShowEditModal(true); 
                            setEditName(teamInfo.name); 
                            setEditDescription(teamInfo.description || ''); 
                            setEditSport(teamInfo.sport || 'futbol');
                        }} style={{ padding: 20, borderBottomWidth: 1, borderBottomColor: C.border }}>
                            <Text style={{ color: C.text, fontWeight: '800', fontSize: 12, textTransform: 'uppercase' }}>Editar Perfil</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={() => { setShowOptions(false); setShowInviteModal(true); }} style={{ padding: 20, borderBottomWidth: 1, borderBottomColor: C.border }}>
                        <Text style={{ color: COLORS.accent, fontWeight: '800', fontSize: 12, textTransform: 'uppercase' }}>Invitar Amigos</Text>
                    </TouchableOpacity>
                    {!isOwner && (
                        <TouchableOpacity onPress={handleLeave} style={{ padding: 20 }}>
                            <Text style={{ color: COLORS.error, fontWeight: '800', fontSize: 12, textTransform: 'uppercase' }}>Salir del Equipo</Text>
                        </TouchableOpacity>
                    )}
                    {isOwner && (
                        <TouchableOpacity onPress={() => { setShowOptions(false); setShowDeleteModal(true); }} style={{ padding: 20 }}>
                            <Text style={{ color: COLORS.error, fontWeight: '800', fontSize: 12, textTransform: 'uppercase' }}>Eliminar Equipo</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            <ScrollView ref={scrollViewRef} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchTeam(); }} tintColor={COLORS.accent} />}>
                
                {/* HERO ADN SECTION */}
                <View style={{ height: 420, width: '100%', position: 'relative' }}>
                    <Image 
                        source={{ uri: teamInfo?.imageUrl || 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?q=80&w=800' }} 
                        style={{ width: '100%', height: '100%' }} 
                        resizeMode="cover"
                    />
                    <LinearGradient 
                        colors={['rgba(0,0,0,0.7)', 'transparent', 'rgba(0,0,0,0.8)', C.bg]} 
                        locations={[0, 0.3, 0.7, 0.98]} 
                        style={StyleSheet.absoluteFill} 
                    />
                    
                    <View style={{ position: 'absolute', bottom: 40, left: 30, right: 30 }}>
                        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                            <View style={{ backgroundColor: COLORS.accent, paddingHorizontal: 15, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}>
                                <Text style={{ color: 'white', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.5 }}>{teamInfo?.sport?.toUpperCase() || 'GENERAL'}</Text>
                            </View>
                            {isOwner && (
                                <TouchableOpacity 
                                    onPress={handlePickImage}
                                    style={{ backgroundColor: 'rgba(255,255,255,0.2)', width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }}
                                >
                                    <Camera color="white" size={18} />
                                </TouchableOpacity>
                            )}
                        </View>
                        <Text style={{ color: 'white', fontSize: 48, fontWeight: '900', textTransform: 'uppercase', letterSpacing: -2, lineHeight: 48 }}>{teamInfo?.name}</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '800', marginTop: 10, textTransform: 'uppercase', letterSpacing: 2 }}>Fundado en 2026 • EQUIPO</Text>
                    </View>
                </View>

                {/* STATS ELITE GRID */}
                <View style={{ flexDirection: 'row', paddingHorizontal: 25, gap: 12, marginTop: -35, zIndex: 10 }}>
                    <View style={{ flex: 1, backgroundColor: C.card, borderRadius: 28, padding: 16, borderWidth: 1, borderColor: C.border, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 }}>
                        <Users color={COLORS.accent} size={24} />
                        <Text style={{ color: C.text, fontSize: 18, fontWeight: '900', marginTop: 8 }} numberOfLines={1}>{teamInfo?.members?.length || 1}</Text>
                        <Text style={{ color: C.sub, fontSize: 7, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.2, marginTop: 2 }}>MIEMBROS</Text>
                    </View>
                    <View style={{ flex: 1, backgroundColor: C.card, borderRadius: 28, padding: 16, borderWidth: 1, borderColor: C.border, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 }}>
                        <Trophy color="#f59e0b" size={24} />
                        <Text style={{ color: C.text, fontSize: 13, fontWeight: '900', marginTop: 12, textTransform: 'uppercase' }} numberOfLines={1}>
                            {teamInfo?.sport ? (teamInfo.sport === 'basketball' ? 'BASKET' : teamInfo.sport.toUpperCase()) : 'GENERAL'}
                        </Text>
                        <Text style={{ color: C.sub, fontSize: 7, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.2, marginTop: 4 }}>DEPORTE</Text>
                    </View>
                    <TouchableOpacity 
                        onPress={() => {
                            if (teamInfo?.inviteCode) {
                                Clipboard.setStringAsync(teamInfo.inviteCode);
                                showFeedback('success', '¡Código copiado al portapapeles!');
                            }
                        }}
                        style={{ flex: 1, backgroundColor: C.card, borderRadius: 28, padding: 16, borderWidth: 1, borderColor: C.border, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 }}
                    >
                        <Copy color={COLORS.success} size={22} />
                        <Text style={{ color: COLORS.success, fontSize: 16, fontWeight: '900', marginTop: 10, letterSpacing: 1 }} numberOfLines={1}>
                            {teamInfo?.inviteCode || '----'}
                        </Text>
                        <Text style={{ color: C.sub, fontSize: 7, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.2, marginTop: 4 }}>CÓDIGO</Text>
                    </TouchableOpacity>
                </View>

                {/* ROSTER ELITE LIST */}
                <SectionLabel label="Plantilla de Élite" />
                <View style={{ marginHorizontal: 30, backgroundColor: C.card, borderRadius: 35, borderWidth: 1, borderColor: C.border, overflow: 'hidden' }}>
                    {memberProfiles.map((m, i) => (
                        <React.Fragment key={m.uid}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 25 }}>
                                <View style={{ width: 60, height: 60, borderRadius: 20, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
                                    {m.photoURL ? <Image source={{ uri: m.photoURL }} style={{ width: '100%', height: '100%' }} /> : <User color={C.sub} size={28} />}
                                    {m.uid === teamInfo?.ownerId && (
                                        <View style={{ position: 'absolute', top: 0, right: 0, width: 22, height: 22, backgroundColor: '#f59e0b', borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.card }}>
                                            <Crown color="white" size={12} />
                                        </View>
                                    )}
                                </View>
                                <View style={{ marginLeft: 20, flex: 1 }}>
                                    <Text style={{ color: C.text, fontSize: 18, fontWeight: '900' }}>{m.displayName.toUpperCase()}</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                        <View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#f1f5f9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                                            <Text style={{ color: C.sub, fontSize: 9, fontWeight: '900' }}>{m.tier || 'PRO'}</Text>
                                        </View>
                                        <Text style={{ color: COLORS.accent, fontSize: 10, fontWeight: '900', marginLeft: 10 }}>OVR {m.ovr || 75}</Text>
                                    </View>
                                </View>
                            </View>
                            {i < memberProfiles.length - 1 && <View style={{ height: 1, backgroundColor: C.border, marginHorizontal: 25 }} />}
                        </React.Fragment>
                    ))}
                </View>

                {/* ACTION BUTTON AT THE END */}
                <View style={{ paddingHorizontal: 30, marginTop: 40 }}>
                    {isMember ? (
                        <TouchableOpacity 
                            onPress={() => router.push({ pathname: '/(player)/equipos/chat', params: { teamId: teamInfo.id, teamName: teamInfo.name } } as any)}
                            style={{ height: 75, backgroundColor: COLORS.accent, borderRadius: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: COLORS.accent, shadowOpacity: 0.4, shadowRadius: 15, elevation: 10 }}
                        >
                            <MessageCircle color="white" size={26} />
                            <Text style={{ color: 'white', fontWeight: '900', fontSize: 16, textTransform: 'uppercase', marginLeft: 15, letterSpacing: 2 }}>Entrar al Vestuario</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity 
                            onPress={handleJoin}
                            disabled={actionLoading}
                            style={{ height: 75, backgroundColor: COLORS.accent, borderRadius: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: COLORS.accent, shadowOpacity: 0.4, shadowRadius: 15, elevation: 10 }}
                        >
                            {actionLoading ? <ActivityIndicator color="white" /> : (
                                <>
                                    <Shield color="white" size={26} />
                                    <Text style={{ color: 'white', fontWeight: '900', fontSize: 16, textTransform: 'uppercase', marginLeft: 15, letterSpacing: 2 }}>Solicitar Ingreso</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>

            {/* MODALS */}
            <Modal visible={showEditModal} animationType="slide" transparent>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' }}>
                    <View style={{ backgroundColor: C.card, borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 30, paddingBottom: 50 }}>
                        <Text style={{ color: C.text, fontSize: 24, fontWeight: '900', textTransform: 'uppercase', marginBottom: 30 }}>Editar Equipo</Text>
                        
                        <Text style={{ color: C.sub, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', marginBottom: 10, marginLeft: 5 }}>Nombre del Club</Text>
                        <TextInput value={editName} onChangeText={setEditName} placeholder="Nombre del Equipo" placeholderTextColor={C.sub} style={{ height: 60, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F1F5F9', borderRadius: 15, color: C.text, fontWeight: '800', marginBottom: 20, paddingHorizontal: 20, borderWidth: 1, borderColor: C.border }} />
                        
                        <Text style={{ color: C.sub, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', marginBottom: 10, marginLeft: 5 }}>Especialidad / Deporte</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }} contentContainerStyle={{ gap: 10 }}>
                            {['futbol', 'futbolito', 'padel', 'tenis', 'basketball'].map((s) => (
                                <TouchableOpacity 
                                    key={s}
                                    onPress={() => setEditSport(s)}
                                    style={{ 
                                        paddingHorizontal: 20, height: 45, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
                                        backgroundColor: editSport === s ? COLORS.accent : (isDark ? 'rgba(255,255,255,0.03)' : '#F1F5F9'),
                                        borderWidth: 1, borderColor: editSport === s ? COLORS.accent : C.border
                                    }}
                                >
                                    <Text style={{ color: editSport === s ? 'white' : C.sub, fontSize: 8, fontWeight: '900', textTransform: 'uppercase' }}>{s === 'basketball' ? 'Basket' : s}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <Text style={{ color: C.sub, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', marginBottom: 10, marginLeft: 5 }}>Biografía del Equipo</Text>
                        <TextInput value={editDescription} onChangeText={setEditDescription} placeholder="Biografía..." placeholderTextColor={C.sub} multiline style={{ height: 100, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F1F5F9', borderRadius: 15, color: C.text, fontWeight: '600', marginBottom: 30, textAlignVertical: 'top', padding: 20, borderWidth: 1, borderColor: C.border }} />
                        <TouchableOpacity onPress={handleSaveEdit} style={{ height: 65, backgroundColor: COLORS.accent, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ color: 'white', fontWeight: '900', textTransform: 'uppercase' }}>Guardar Cambios</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setShowEditModal(false)} style={{ marginTop: 20, alignItems: 'center' }}>
                            <Text style={{ color: C.sub, fontSize: 10, fontWeight: '900' }}>CANCELAR</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal visible={showInviteModal} transparent animationType="fade">
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', alignItems: 'center', justifyContent: 'center', padding: 30 }}>
                    <View style={{ width: '100%', backgroundColor: C.card, borderRadius: 40, padding: 35, alignItems: 'center' }}>
                        <Zap color={COLORS.accent} size={40} />
                        <Text style={{ color: C.text, fontSize: 22, fontWeight: '900', marginTop: 20 }}>Código de Invitación</Text>
                        <View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9', padding: 30, borderRadius: 25, width: '100%', alignItems: 'center', marginVertical: 30 }}>
                            <Text style={{ color: COLORS.accent, fontSize: 48, fontWeight: '900', letterSpacing: 5 }}>{teamInfo?.inviteCode || '----'}</Text>
                        </View>
                        <TouchableOpacity onPress={() => { Clipboard.setStringAsync(teamInfo.inviteCode); setCodeCopied(true); setTimeout(() => setCodeCopied(false), 2000); }} style={{ height: 60, backgroundColor: C.text, borderRadius: 20, width: '100%', alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ color: C.bg, fontWeight: '900', textTransform: 'uppercase' }}>{codeCopied ? '¡Copiado!' : 'Copiar Código'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setShowInviteModal(false)} style={{ marginTop: 20 }}>
                            <Text style={{ color: C.sub, fontSize: 10, fontWeight: '900' }}>CERRAR</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <FeedbackModal visible={fbVisible} type={fbType} message={fbMsg} onClose={() => setFbVisible(false)} isDark={isDark} />

            {/* DELETE CONFIRMATION MODAL */}
            <Modal visible={showDeleteModal} transparent animationType="fade">
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', alignItems: 'center', justifyContent: 'center', padding: 30 }}>
                    <View style={{ width: '100%', backgroundColor: C.card, borderRadius: 40, padding: 35, alignItems: 'center', borderWidth: 1, borderColor: C.border }}>
                        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#ef444422', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                            <AlertCircle color="#ef4444" size={40} />
                        </View>
                        <Text style={{ color: C.text, fontSize: 22, fontWeight: '900', textAlign: 'center' }}>¿Disolver Equipo?</Text>
                        <Text style={{ color: C.sub, fontSize: 14, fontWeight: '600', textAlign: 'center', marginTop: 15, lineHeight: 22 }}>
                            Esta acción es irreversible. Se perderán todos los datos del roster, estadísticas y el código de invitación dejará de funcionar.
                        </Text>
                        
                        <TouchableOpacity 
                            onPress={handleDelete}
                            style={{ height: 60, backgroundColor: '#ef4444', borderRadius: 20, width: '100%', alignItems: 'center', justifyContent: 'center', marginTop: 30 }}
                        >
                            <Text style={{ color: 'white', fontWeight: '900', textTransform: 'uppercase' }}>SÍ, ELIMINAR EQUIPO</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity onPress={() => setShowDeleteModal(false)} style={{ marginTop: 20 }}>
                            <Text style={{ color: C.sub, fontSize: 10, fontWeight: '900', textTransform: 'uppercase' }}>CANCELAR</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const SectionLabel = ({ label }: { label: string }) => (
    <Text style={{ color: '#f97316', fontWeight: '900', fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, marginHorizontal: 40, marginTop: 30, marginBottom: 15 }}>{label}</Text>
);

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
