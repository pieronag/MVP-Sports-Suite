import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, RefreshControl,
    StatusBar, ActivityIndicator, Dimensions, StyleSheet,
    BackHandler, Modal, Linking, Platform
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import {
    ChevronLeft, Calendar, Clock, MapPin, CheckCircle2, AlertCircle,
    XCircle, ArrowRight, Activity, Receipt, MapPinned, Info, Ticket, X, Zap, Share2, Navigation, TrendingDown, Star,
    ShieldCheck, CalendarDays, Timer, LayoutDashboard, History, Trophy, CircleDot, Dribbble, Medal, Navigation2, Plus, Minus, Users
} from 'lucide-react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from '../../../store/useAuth';
import { bookingService, Booking } from '../../../services/bookingService';
import { venueService, Tenant } from '../../../services/venueService';
import { teamService, Team } from '../../../services/teamService';
import { tournamentService } from '../../../services/tournamentService';
import { db } from '../../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';

const { width, height: SCREEN_HEIGHT } = Dimensions.get('window');

const COLORS = {
    dark: {
        bg: '#020617',
        card: '#0F172A',
        border: 'rgba(255,255,255,0.08)',
        text: '#F8FAFC',
        sub: '#94A3B8'
    },
    light: {
        bg: '#F8FAFC',
        card: '#FFFFFF',
        border: 'rgba(15,23,42,0.08)',
        text: '#0F172A',
        sub: '#64748B'
    },
    accent: '#10b981',
    maps: '#3b82f6',
    error: '#f43f5e'
};

const SPORT_CONFIG: Record<string, { color: string, icon: any }> = {
    'futbol': { color: '#10b981', icon: Trophy },
    'padel': { color: '#3b82f6', icon: Zap },
    'tenis': { color: '#f59e0b', icon: CircleDot },
    'basquet': { color: '#6366f1', icon: Dribbble },
    'default': { color: '#10b981', icon: Medal }
};

const getSportInfo = (sportName: string) => {
    const s = (sportName || '').toLowerCase();
    if (s.includes('futbol') || s.includes('fútbol')) return SPORT_CONFIG['futbol'];
    if (s.includes('padel') || s.includes('pádel')) return SPORT_CONFIG['padel'];
    if (s.includes('tenis')) return SPORT_CONFIG['tenis'];
    if (s.includes('basquet') || s.includes('basket')) return SPORT_CONFIG['basquet'];
    return SPORT_CONFIG['default'];
};

const getFormattedDate = (date: any) => {
    try {
        if (!date) return { day: '--', month: '---', full: '-- --- ----' };
        const d = date.toDate ? date.toDate() : (date.seconds ? new Date(date.seconds * 1000) : new Date(date));
        return {
            day: d.getDate().toString().padStart(2, '0'),
            month: d.toLocaleDateString('es-CL', { month: 'short' }).toUpperCase().replace('.', ''),
            full: d.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' }),
            raw: d
        };
    } catch (e) {
        return { day: '--', month: '---', full: '-- --- ----' };
    }
};

const getStatusInfo = (booking: Booking | null, C: any) => {
    if (!booking) return { label: 'DESCONOCIDO', color: C.sub };
    const isCancelled = booking.status === 'cancelled';
    const isPast = booking.status === 'completed' || booking.status === 'past';
    if (isCancelled) return { label: 'ANULADO', color: COLORS.error };
    if (isPast) return { label: 'FINALIZADO', color: C.sub };
    // Si el pago está pendiente, mostrar estado de pago pendiente
    if ((booking as any).paymentStatus === 'pending') return { label: 'PAGO PENDIENTE', color: '#f59e0b' };
    if (booking.status === 'confirmed') return { label: 'CONFIRMADO', color: COLORS.accent };
    if (booking.status === 'pending') return { label: 'PAGO PENDIENTE', color: '#f59e0b' };
    return { label: 'PENDIENTE', color: '#f59e0b' };
};

export default function MisReservasScreen() {
    const { user, theme } = useAuth();
    const router = useRouter();
    const isDark = theme === 'dark';
    const C = isDark ? COLORS.dark : COLORS.light;

    const [bookings, setBookings] = useState<Booking[]>([]);
    const [venues, setVenues] = useState<Record<string, Tenant>>({});
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<'activas' | 'historial'>('activas');
    const [showTicket, setShowTicket] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

    const [fbVisible, setFbVisible] = useState(false);
    const [fbType, setFbType] = useState<'success' | 'error'>('success');
    const [fbMsg, setFbMsg] = useState('');
    const [showStatsModal, setShowStatsModal] = useState(false);
    const [statsBooking, setStatsBooking] = useState<Booking | null>(null);

    const loadData = async (isRefreshing = false) => {
        if (!user?.uid) return;
        if (!isRefreshing) setLoading(true);
        try {
            const all = await bookingService.getUserBookings(user.uid);
            const tenantIds = Array.from(new Set(all.map(b => b.tenantId)));
            const venueList = await venueService.getVenuesByIds(tenantIds);
            const venueMap: Record<string, Tenant> = {};
            venueList.forEach(v => { venueMap[v.id] = v; });
            setVenues(venueMap);
            setBookings(all.sort((a, b) => ((b.date as any)?.seconds || 0) - ((a.date as any)?.seconds || 0)));
        } catch (e) { console.error(e); } finally { setLoading(false); setRefreshing(false); }
    };

    const handleCheckIn = async (bookingId: string) => {
        try {
            await bookingService.checkIn(bookingId);
            loadData();
            setFbType('success');
            setFbMsg('¡CHECK-IN EXITOSO! YA PUEDES COMENZAR TU PARTIDO.');
            setFbVisible(true);
        } catch (e) {
            setFbType('error');
            setFbMsg('ERROR AL REALIZAR CHECK-IN.');
            setFbVisible(true);
        }
    };

    const handleCheckOut = async (booking: Booking) => {
        if (!booking.id) return;
        try {
            await bookingService.checkOut(booking.id);
            loadData();
            setStatsBooking(booking);
            setShowStatsModal(true);
        } catch (e) {
            setFbType('error');
            setFbMsg('ERROR AL REALIZAR CHECK-OUT.');
            setFbVisible(true);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            loadData();
            const backAction = () => { router.back(); return true; };
            const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
            return () => backHandler.remove();
        }, [user])
    );

    const displayList = useMemo(() => {
        const statuses = activeTab === 'activas' ? ['confirmed', 'active', 'pending'] : ['cancelled', 'completed', 'past'];
        const filtered = bookings.filter(b => statuses.includes(b.status as string));
        
        return filtered.sort((a, b) => {
            const timeA = (a.date as any)?.seconds || 0;
            const timeB = (b.date as any)?.seconds || 0;
            if (activeTab === 'activas') {
                // Próximas primero (Ascendente)
                if (timeA !== timeB) return timeA - timeB;
                return (a.startTime || "").localeCompare(b.startTime || "");
            } else {
                // Más recientes primero (Descendente)
                if (timeA !== timeB) return timeB - timeA;
                return (b.startTime || "").localeCompare(a.startTime || "");
            }
        });
    }, [bookings, activeTab]);

    const handleOpenMaps = (booking: Booking) => {
        const venue = venues[booking.tenantId];
        const coords = venue?.coordinates || (venue as any)?.location;
        if (!coords) return;
        const lat = coords.lat || coords._lat || coords.latitude;
        const lng = coords.lng || coords._long || coords.longitude;
        const url = Platform.select({ ios: `maps:0,0?q=${venue?.name}@${lat},${lng}`, android: `geo:0,0?q=${lat},${lng}(${venue?.name})` });
        if (url) Linking.openURL(url);
    };

    if (loading && !refreshing) {
        return (
            <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color={COLORS.accent} size="large" />
            </View>
        );
    }

    const modalSportInfo = getSportInfo(selectedBooking?.sport || '');
    const modalStatus = getStatusInfo(selectedBooking, C);

    return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
            
            {/* TOP BAR */}
            <View style={{ paddingTop: 60, paddingBottom: 20, paddingHorizontal: 30, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.card }}>
                <TouchableOpacity onPress={() => router.back()} style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}>
                    <ChevronLeft color={COLORS.accent} size={24} />
                </TouchableOpacity>
                <Text style={{ color: C.text, fontSize: 20, fontWeight: '900', textTransform: 'uppercase', letterSpacing: -1 }}>Mis Reservas</Text>
                <View style={{ width: 44 }} />
            </View>

            <View style={{ flexDirection: 'row', padding: 20, paddingHorizontal: 30, gap: 10 }}>
                <TabButton label="ACTIVAS" active={activeTab === 'activas'} onPress={() => setActiveTab('activas')} isDark={isDark} />
                <TabButton label="HISTORIAL" active={activeTab === 'historial'} onPress={() => setActiveTab('historial')} isDark={isDark} />
            </View>

            <ScrollView 
                style={{ flex: 1 }} 
                contentContainerStyle={{ paddingBottom: 120 }} 
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(true); }} tintColor={COLORS.accent} />}
            >
                <SectionLabel label={activeTab === 'activas' ? "Próximos Partidos" : "Partidos Finalizados"} />

                {displayList.length === 0 ? (
                    <View style={{ padding: 60, alignItems: 'center', justifyContent: 'center' }}>
                        <CalendarDays color={C.sub} size={64} strokeWidth={1} />
                        <Text style={{ color: C.sub, fontSize: 12, fontWeight: '800', marginTop: 20, textAlign: 'center' }}>No hay partidos para mostrar</Text>
                    </View>
                ) : (
                    displayList.map((b) => (
                        <BookingEliteCard 
                        key={b.id} 
                        booking={b} 
                        isDark={isDark} 
                        onView={() => { setSelectedBooking(b); setShowTicket(true); }}
                        onMaps={() => handleOpenMaps(b)}
                        onCheckIn={() => b.id && handleCheckIn(b.id)}
                        onCheckOut={() => handleCheckOut(b)}
                    />
                    ))
                )}
            </ScrollView>

            {/* MODAL TICKET ELITE */}
            <Modal visible={showTicket} animationType="slide" transparent={true}>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 30 }}>
                    <View style={{ backgroundColor: '#FFFFFF', borderRadius: 40, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0' }}>
                        
                        {/* TICKET TOP */}
                        <View style={{ padding: 30, borderBottomWidth: 2, borderBottomColor: '#F8FAFC', borderStyle: 'dashed' }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                <View style={{ width: 50, height: 50, borderRadius: 15, backgroundColor: modalSportInfo.color + '15', alignItems: 'center', justifyContent: 'center' }}>
                                    <modalSportInfo.icon color={modalSportInfo.color} size={24} />
                                </View>
                                <TouchableOpacity onPress={() => setShowTicket(false)} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}>
                                    <X color="#0F172A" size={20} />
                                </TouchableOpacity>
                            </View>

                            <Text style={{ color: '#64748B', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 5 }}>RECINTO</Text>
                            <Text style={{ color: '#0F172A', fontSize: 24, fontWeight: '900', marginBottom: 20 }}>{selectedBooking?.tenantName}</Text>

                            <View style={{ flexDirection: 'row', gap: 30 }}>
                                <View>
                                    <Text style={{ color: '#64748B', fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>CANCHA</Text>
                                    <Text style={{ color: '#0F172A', fontSize: 14, fontWeight: '800' }}>{selectedBooking?.courtName}</Text>
                                </View>
                                <View>
                                    <Text style={{ color: '#64748B', fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>ESTADO</Text>
                                    <Text style={{ color: modalStatus.color, fontSize: 14, fontWeight: '800' }}>{modalStatus.label}</Text>
                                </View>
                            </View>
                        </View>

                        {/* TICKET QR */}
                        <View style={{ backgroundColor: '#F8FAFC', padding: 40, alignItems: 'center' }}>
                            <View style={{ backgroundColor: 'white', padding: 20, borderRadius: 25, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 }}>
                                {selectedBooking?.id && <QRCode value={selectedBooking.id} size={150} color="#0F172A" backgroundColor="white" />}
                            </View>
                            <Text style={{ color: '#94A3B8', fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 4, marginTop: 25 }}>ID: {(selectedBooking?.id as string)?.slice(-8).toUpperCase()}</Text>
                        </View>

                        {/* TICKET BOTTOM */}
                        <View style={{ padding: 30 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <View style={{ gap: 8 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Calendar color={modalSportInfo.color} size={14} />
                                        <Text style={{ color: '#0F172A', fontSize: 13, fontWeight: '900', marginLeft: 10 }}>{getFormattedDate(selectedBooking?.date).full}</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Clock color={modalSportInfo.color} size={14} />
                                        <Text style={{ color: '#0F172A', fontSize: 13, fontWeight: '900', marginLeft: 10 }}>{selectedBooking?.startTime} HRS</Text>
                                    </View>
                                </View>
                                <TouchableOpacity style={{ width: 55, height: 55, borderRadius: 18, backgroundColor: modalSportInfo.color, alignItems: 'center', justifyContent: 'center' }}>
                                    <Share2 color="white" size={20} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>

            <FeedbackModal visible={fbVisible} type={fbType} message={fbMsg} onClose={() => setFbVisible(false)} isDark={isDark} />
            
            <MatchStatsModal 
                visible={showStatsModal} 
                booking={statsBooking} 
                onClose={() => setShowStatsModal(false)} 
                isDark={isDark}
                onSave={async (stats: any) => {
                    try {
                        await bookingService.saveMatchStats(stats);
                        setShowStatsModal(false);
                        setFbType('success');
                        setFbMsg('¡ESTADÍSTICAS GUARDADAS! LOS PUNTOS HAN SIDO ACTUALIZADOS.');
                        setFbVisible(true);
                    } catch (e) {
                        setFbType('error');
                        setFbMsg('ERROR AL GUARDAR ESTADÍSTICAS.');
                        setFbVisible(true);
                    }
                }}
            />
        </View>
    );
}

const TabButton = ({ label, active, onPress, isDark }: any) => (
    <TouchableOpacity onPress={onPress} style={{ flex: 1, height: 50, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? COLORS.accent : (isDark ? 'rgba(255,255,255,0.03)' : '#F1F5F9'), borderWidth: active ? 0 : 1, borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#E2E8F0' }}>
        <Text style={{ color: active ? 'white' : (isDark ? '#94A3B8' : '#64748B'), fontWeight: '900', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</Text>
    </TouchableOpacity>
);

const BookingEliteCard = ({ booking, isDark, onView, onMaps, onCheckIn, onCheckOut }: any) => {
    const C = isDark ? COLORS.dark : COLORS.light;
    const sportInfo = getSportInfo(booking.sport || '');
    const status = getStatusInfo(booking, C);
    const dateInfo = getFormattedDate(booking.date);

    return (
        <TouchableOpacity onPress={onView} activeOpacity={0.8} style={{ marginHorizontal: 30, marginBottom: 25, backgroundColor: C.card, borderRadius: 30, padding: 25, borderWidth: 1, borderColor: C.border, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 15 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 45, height: 45, borderRadius: 12, backgroundColor: sportInfo.color + '15', alignItems: 'center', justifyContent: 'center' }}>
                        <sportInfo.icon color={sportInfo.color} size={22} />
                    </View>
                    <View style={{ marginLeft: 15 }}>
                        <Text style={{ color: C.text, fontSize: 18, fontWeight: '900', textTransform: 'uppercase' }}>{booking.tenantName}</Text>
                        <Text style={{ color: C.sub, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 }}>{booking.sport} • {booking.courtName}</Text>
                    </View>
                </View>
                <View style={{ backgroundColor: status.color + '15', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }}>
                    <Text style={{ color: status.color, fontSize: 9, fontWeight: '900' }}>{status.label}</Text>
                </View>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 20, borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9' }}>
                <View style={{ gap: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Calendar color={C.sub} size={12} />
                        <Text style={{ color: C.text, fontSize: 13, fontWeight: '800', marginLeft: 8 }}>{dateInfo.full}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Clock color={C.sub} size={12} />
                        <Text style={{ color: C.text, fontSize: 13, fontWeight: '800', marginLeft: 8 }}>{booking.startTime} hrs</Text>
                    </View>
                </View>
                
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    {booking.status === 'confirmed' && !booking.checkIn && (
                        <TouchableOpacity onPress={onCheckIn} style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#10b98115', alignItems: 'center', justifyContent: 'center' }}>
                            <ShieldCheck color="#10b981" size={20} />
                        </TouchableOpacity>
                    )}
                    {booking.status === 'active' && !booking.checkOut && (
                        <TouchableOpacity onPress={onCheckOut} style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#f59e0b15', alignItems: 'center', justifyContent: 'center' }}>
                            <CheckCircle2 color="#f59e0b" size={20} />
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={onMaps} style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.maps + '15', alignItems: 'center', justifyContent: 'center' }}>
                        <MapPin color={COLORS.maps} size={20} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onView} style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.accent + '15', alignItems: 'center', justifyContent: 'center' }}>
                        <Ticket color={COLORS.accent} size={20} />
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity>
    );
};

const SectionLabel = ({ label }: { label: string }) => (
    <Text style={{ color: '#10b981', fontWeight: '900', fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, marginHorizontal: 40, marginTop: 10, marginBottom: 15 }}>{label}</Text>
);

const FeedbackModal = ({ visible, type, message, onClose, isDark }: any) => {
    const C = isDark ? COLORS.dark : COLORS.light;
    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
                <View style={{ backgroundColor: C.card, borderRadius: 35, padding: 30, alignItems: 'center', width: '100%', borderWidth: 1, borderColor: C.border }}>
                    <View style={{ width: 70, height: 70, borderRadius: 35, backgroundColor: (type === 'error' ? '#ef444422' : '#10b98122'), alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                        {type === 'error' ? <XCircle color="#ef4444" size={35} /> : <CheckCircle2 color="#10b981" size={35} />}
                    </View>
                    <Text style={{ color: C.text, fontSize: 18, fontWeight: '900', textAlign: 'center', marginBottom: 10 }}>{type === 'error' ? 'Error' : 'Éxito'}</Text>
                    <Text style={{ color: C.sub, fontSize: 13, fontWeight: '600', textAlign: 'center', marginBottom: 25 }}>{message}</Text>
                    <TouchableOpacity onPress={onClose} style={{ backgroundColor: (type === 'error' ? '#ef4444' : '#10b981'), paddingVertical: 15, borderRadius: 15, width: '100%', alignItems: 'center' }}>
                        <Text style={{ color: 'white', fontWeight: '900' }}>ENTENDIDO</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const MatchStatsModal = ({ visible, booking, onClose, isDark, onSave }: any) => {
    const C = isDark ? COLORS.dark : COLORS.light;
    const [scoreA, setScoreA] = useState(0);
    const [scoreB, setScoreB] = useState(0);
    const [playersA, setPlayersA] = useState<any[]>([]);
    const [playersB, setPlayersB] = useState<any[]>([]);
    const [teamMembers, setTeamMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible) {
            setScoreA(0);
            setScoreB(0);
            setPlayersA([]);
            setPlayersB([]);
            if (booking?.teamId) {
                fetchTeamMembers();
            }
        }
    }, [visible, booking]);

    const fetchTeamMembers = async () => {
        setLoading(true);
        try {
            const team = await teamService.getTeamById(booking.teamId);
            if (team && team.members) {
                const membersData = await Promise.all(
                    team.members.map(async (uid: string) => {
                        const pDoc = await getDoc(doc(db, 'profiles', uid));
                        return { userId: uid, name: pDoc.exists() ? pDoc.data().displayName : 'Jugador', goals: 0, assists: 0 };
                    })
                );
                setTeamMembers(membersData);
                // Dividir automáticamente los miembros entre Equipo A y Equipo B (Mitad y Mitad)
                const mid = Math.ceil(membersData.length / 2);
                setPlayersA(membersData.slice(0, mid));
                setPlayersB(membersData.slice(mid));
            }
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const addPlayer = (player: any, team: 'A' | 'B') => {
        if (team === 'A') {
            setPlayersA([...playersA, { ...player }]);
        } else {
            setPlayersB([...playersB, { ...player }]);
        }
    };

    const removePlayer = (userId: string, team: 'A' | 'B') => {
        if (team === 'A') {
            setPlayersA(playersA.filter(p => p.userId !== userId));
        } else {
            setPlayersB(playersB.filter(p => p.userId !== userId));
        }
    };

    const updateStat = (userId: string, team: 'A' | 'B', field: 'goals' | 'assists', delta: number) => {
        const list = team === 'A' ? [...playersA] : [...playersB];
        const idx = list.findIndex(p => p.userId === userId);
        if (idx !== -1) {
            list[idx][field] = Math.max(0, list[idx][field] + delta);
            team === 'A' ? setPlayersA(list) : setPlayersB(list);
        }
    };

    const handleSave = () => {
        let winner: 'teamA' | 'teamB' | 'draw' = 'draw';
        if (scoreA > scoreB) winner = 'teamA';
        else if (scoreB > scoreA) winner = 'teamB';

        onSave({
            bookingId: booking.id,
            teamA: { score: scoreA, players: playersA },
            teamB: { score: scoreB, players: playersB },
            winner
        });
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)' }}>
                <View style={{ flex: 1, marginTop: 100, backgroundColor: C.bg, borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 30 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
                        <Text style={{ color: C.text, fontSize: 24, fontWeight: '900' }}>RESULTADOS</Text>
                        <TouchableOpacity onPress={onClose} style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' }}>
                            <X color={C.text} size={24} />
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                            <ActivityIndicator color={COLORS.accent} size="large" />
                            <Text style={{ color: C.sub, marginTop: 20, fontWeight: '700' }}>CARGANDO JUGADORES...</Text>
                        </View>
                    ) : (
                        <ScrollView showsVerticalScrollIndicator={false}>
                        {/* SCOREBOARD DNA */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', backgroundColor: C.card, borderRadius: 30, padding: 30, borderWidth: 1, borderColor: C.border, marginBottom: 30 }}>
                            <View style={{ alignItems: 'center' }}>
                                <Text style={{ color: C.sub, fontSize: 10, fontWeight: '900', marginBottom: 10 }}>EQUIPO A</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
                                    <TouchableOpacity onPress={() => setScoreA(Math.max(0, scoreA - 1))}><Minus color={COLORS.accent} size={20} /></TouchableOpacity>
                                    <Text style={{ color: C.text, fontSize: 48, fontWeight: '900' }}>{scoreA}</Text>
                                    <TouchableOpacity onPress={() => setScoreA(scoreA + 1)}><Plus color={COLORS.accent} size={20} /></TouchableOpacity>
                                </View>
                            </View>
                            <Text style={{ color: C.sub, fontSize: 24, fontWeight: '900' }}>VS</Text>
                            <View style={{ alignItems: 'center' }}>
                                <Text style={{ color: C.sub, fontSize: 10, fontWeight: '900', marginBottom: 10 }}>EQUIPO B</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
                                    <TouchableOpacity onPress={() => setScoreB(Math.max(0, scoreB - 1))}><Minus color="#f59e0b" size={20} /></TouchableOpacity>
                                    <Text style={{ color: C.text, fontSize: 48, fontWeight: '900' }}>{scoreB}</Text>
                                    <TouchableOpacity onPress={() => setScoreB(scoreB + 1)}><Plus color="#f59e0b" size={20} /></TouchableOpacity>
                                </View>
                            </View>
                        </View>

                        <MatchTeamSection 
                            label="EQUIPO A" 
                            players={playersA} 
                            allMembers={teamMembers.filter(m => !playersA.find(p => p.userId === m.userId) && !playersB.find(p => p.userId === m.userId))}
                            onAdd={(p: any) => addPlayer(p, 'A')}
                            onRemove={(id: string) => removePlayer(id, 'A')}
                            onUpdateStat={(id: string, field: any, delta: number) => updateStat(id, 'A', field, delta)}
                            isDark={isDark}
                            color={COLORS.accent}
                        />

                        <MatchTeamSection 
                            label="EQUIPO B" 
                            players={playersB} 
                            allMembers={teamMembers.filter(m => !playersA.find(p => p.userId === m.userId) && !playersB.find(p => p.userId === m.userId))}
                            onAdd={(p: any) => addPlayer(p, 'B')}
                            onRemove={(id: string) => removePlayer(id, 'B')}
                            onUpdateStat={(id: string, field: any, delta: number) => updateStat(id, 'B', field, delta)}
                            isDark={isDark}
                            color="#f59e0b"
                        />

                        <TouchableOpacity onPress={handleSave} style={{ backgroundColor: COLORS.accent, height: 70, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginTop: 30, marginBottom: 50 }}>
                            <Text style={{ color: 'white', fontWeight: '900', fontSize: 16 }}>GUARDAR RESULTADOS Y ACTUALIZAR ELO</Text>
                        </TouchableOpacity>
                        </ScrollView>
                    )}
                </View>
            </View>
        </Modal>
    );
};

const MatchTeamSection = ({ label, players, allMembers, onAdd, onRemove, onUpdateStat, isDark, color }: any) => {
    const C = isDark ? COLORS.dark : COLORS.light;
    const [showPicker, setShowPicker] = useState(false);

    return (
        <View style={{ marginBottom: 30 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                <Text style={{ color: color, fontSize: 12, fontWeight: '900', letterSpacing: 1 }}>{label}</Text>
                <TouchableOpacity onPress={() => setShowPicker(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Plus color={color} size={16} />
                    <Text style={{ color: C.text, fontSize: 10, fontWeight: '800' }}>AGREGAR JUGADOR</Text>
                </TouchableOpacity>
            </View>

            <View style={{ backgroundColor: C.card, borderRadius: 25, overflow: 'hidden', borderWidth: 1, borderColor: C.border }}>
                {players.length === 0 && (
                    <Text style={{ color: C.sub, fontSize: 11, textAlign: 'center', padding: 20 }}>No hay jugadores asignados</Text>
                )}
                {players.map((p: any) => (
                    <View key={p.userId} style={{ padding: 20, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: C.border }}>
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: C.text, fontSize: 14, fontWeight: '800' }}>{p.name}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 15, alignItems: 'center' }}>
                            <View style={{ alignItems: 'center' }}>
                                <Text style={{ color: C.sub, fontSize: 8, fontWeight: '800' }}>GOLES</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <TouchableOpacity onPress={() => onUpdateStat(p.userId, 'goals', -1)}><Minus color={C.sub} size={14} /></TouchableOpacity>
                                    <Text style={{ color: C.text, fontWeight: '900' }}>{p.goals}</Text>
                                    <TouchableOpacity onPress={() => onUpdateStat(p.userId, 'goals', 1)}><Plus color={C.text} size={14} /></TouchableOpacity>
                                </View>
                            </View>
                            <View style={{ alignItems: 'center' }}>
                                <Text style={{ color: C.sub, fontSize: 8, fontWeight: '800' }}>ASIST.</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <TouchableOpacity onPress={() => onUpdateStat(p.userId, 'assists', -1)}><Minus color={C.sub} size={14} /></TouchableOpacity>
                                    <Text style={{ color: C.text, fontWeight: '900' }}>{p.assists}</Text>
                                    <TouchableOpacity onPress={() => onUpdateStat(p.userId, 'assists', 1)}><Plus color={C.text} size={14} /></TouchableOpacity>
                                </View>
                            </View>
                            <TouchableOpacity onPress={() => onRemove(p.userId)}>
                                <X color="#ef4444" size={18} />
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}
            </View>

            {showPicker && (
                <Modal visible={true} transparent animationType="fade">
                    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 30 }}>
                        <View style={{ backgroundColor: C.card, borderRadius: 30, padding: 20, maxHeight: 400 }}>
                            <Text style={{ color: C.text, fontWeight: '900', marginBottom: 20, textAlign: 'center' }}>SELECCIONAR JUGADOR</Text>
                            <ScrollView>
                                {allMembers.map((m: any) => (
                                    <TouchableOpacity key={m.userId} onPress={() => { onAdd(m); setShowPicker(false); }} style={{ padding: 15, borderBottomWidth: 1, borderBottomColor: C.border }}>
                                        <Text style={{ color: C.text, fontWeight: '700' }}>{m.name}</Text>
                                    </TouchableOpacity>
                                ))}
                                {allMembers.length === 0 && <Text style={{ color: C.sub, textAlign: 'center' }}>No hay más miembros</Text>}
                            </ScrollView>
                            <TouchableOpacity onPress={() => setShowPicker(false)} style={{ marginTop: 20, padding: 15, alignItems: 'center' }}>
                                <Text style={{ color: '#ef4444', fontWeight: '900' }}>CANCELAR</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            )}
        </View>
    );
};
