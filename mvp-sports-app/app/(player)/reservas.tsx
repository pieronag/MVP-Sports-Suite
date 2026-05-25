import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, RefreshControl,
    StatusBar, ActivityIndicator, Dimensions, StyleSheet,
    BackHandler, Modal, Linking, Platform, TextInput, Share, Alert
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import {
    ChevronLeft, Calendar, Clock, MapPin, CheckCircle2, AlertCircle,
    XCircle, ArrowRight, Activity, Receipt, MapPinned, Info, Ticket, X, Zap, Share2, Navigation, TrendingDown, Star,
    ShieldCheck, CalendarDays, Timer, LayoutDashboard, History, Trophy, CircleDot, Dribbble, Medal, Navigation2, Plus, Minus, Users,
    Trash2
} from 'lucide-react-native';
import { FutbolIcon, PadelIcon, TenisIcon, BasquetbolIcon, VoleibolIcon } from '../../components/icons/sports';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import { FlashList } from '@shopify/flash-list';
import BottomMenu from '../../components/BottomMenu';
import { useAuth } from '../../store/useAuth';
import { bookingService, Booking } from '../../services/bookingService';
import { venueService, Tenant } from '../../services/venueService';
import { teamService, Team } from '../../services/teamService';
import { tournamentService } from '../../services/tournamentService';
import { db, functions } from '../../services/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

const getSantiagoDateTime = (date: Date) => {
    try {
        const formatter = new Intl.DateTimeFormat("en-US", {
            timeZone: "America/Santiago",
            year: "numeric",
            month: "numeric",
            day: "numeric",
            hour: "numeric",
            minute: "numeric",
            second: "numeric",
            hour12: false
        });
        const parts = formatter.formatToParts(date);
        const getPart = (type: string) => Number(parts.find(p => p.type === type)?.value || 0);
        return new Date(getPart("year"), getPart("month") - 1, getPart("day"), getPart("hour"), getPart("minute"), 0, 0);
    } catch (e) {
        return new Date();
    }
};

const getBookingDateTimeChile = (bookingDate: Date, startTime: string) => {
    try {
        const formatter = new Intl.DateTimeFormat("en-US", {
            timeZone: "America/Santiago",
            year: "numeric",
            month: "numeric",
            day: "numeric",
            hour12: false
        });
        const parts = formatter.formatToParts(bookingDate);
        const getPart = (type: string) => Number(parts.find(p => p.type === type)?.value || 0);
        const [hours, minutes] = (startTime || "00:00").split(':').map(Number);
        const res = new Date(getPart("year"), getPart("month") - 1, getPart("day"), hours, minutes, 0, 0);
        return res;
    } catch (e) {
        return new Date();
    }
};

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
    'futbol': { color: '#10b981', icon: FutbolIcon },
    'padel': { color: '#3b82f6', icon: PadelIcon },
    'tenis': { color: '#f59e0b', icon: TenisIcon },
    'basquet': { color: '#6366f1', icon: BasquetbolIcon },
    'voley': { color: '#ec4899', icon: VoleibolIcon },
    'default': { color: '#10b981', icon: Medal }
};

const getSportInfo = (sportName: string) => {
    const s = (sportName || '').toLowerCase();
    if (s.includes('futbol') || s.includes('fútbol')) return SPORT_CONFIG['futbol'];
    if (s.includes('padel') || s.includes('pádel')) return SPORT_CONFIG['padel'];
    if (s.includes('tenis')) return SPORT_CONFIG['tenis'];
    if (s.includes('basquet') || s.includes('basket')) return SPORT_CONFIG['basquet'];
    if (s.includes('voley')) return SPORT_CONFIG['voley'];
    return SPORT_CONFIG['default'];
};

const LargeDetailRow = ({ label, value, C, highlightColor }: any) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 2 }}>
        <Text style={{ color: C.sub, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>
        <Text style={{ color: highlightColor || C.text, fontSize: 11, fontWeight: '900' }}>{value}</Text>
    </View>
);

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
    const isNoShow = booking.status === 'no-show' || 
                     booking.paymentStatus === 'no-show' || 
                     booking.noShow === true || 
                     (booking.notes && (booking.notes.toLowerCase().includes('no-show') || booking.notes.toLowerCase().includes('inasistencia')));

    if (isNoShow) return { label: 'CANCELADO POR INASISTENCIA', color: COLORS.error };
    if (booking.status === 'cancelled') {
        if ((booking.paymentStatus as any) === 'refund_failed') return { label: 'DEVOLUCIÓN FALLIDA', color: COLORS.error };
        if ((booking.paymentStatus as any) === 'refunded') return { label: 'DEVOLUCIÓN', color: '#10b981' };
        if (booking.cancelledBy) return { label: 'CANCELADO POR JUGADOR', color: COLORS.error };
        return { label: 'ANULADO', color: COLORS.error };
    }
    if (booking.status === 'active' && !booking.checkOut) return { label: 'EN JUEGO', color: '#3b82f6' };
    if (booking.status === 'completed' || booking.status === 'past' || booking.checkOut === true) return { label: 'FINALIZADO', color: C.sub };
    
    if (booking.paymentStatus === 'pending') {
        return { label: 'PAGO PENDIENTE', color: '#f59e0b' };
    }
    
    if (booking.status === 'confirmed') return { label: 'CONFIRMADO', color: COLORS.accent };
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
    const [historyLimit, setHistoryLimit] = useState(10);

    useEffect(() => {
        setHistoryLimit(10);
    }, [activeTab]);

    const [showTicket, setShowTicket] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

    const [fbVisible, setFbVisible] = useState(false);
    const [fbType, setFbType] = useState<'success' | 'error'>('success');
    const [fbMsg, setFbMsg] = useState('');


    const [showSurveyModal, setShowSurveyModal] = useState(false);
    const [surveyBooking, setSurveyBooking] = useState<Booking | null>(null);

    const [showCancelModal, setShowCancelModal] = useState(false);
    const [bookingToCancel, setBookingToCancel] = useState<string | null>(null);

    const [showCheckInModal, setShowCheckInModal] = useState(false);
    const [bookingForCheckIn, setBookingForCheckIn] = useState<Booking | null>(null);

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

    const handleCheckIn = (booking: Booking) => {
        if (booking.paymentStatus !== 'paid') {
            setFbType('error');
            setFbMsg('Para iniciar el partido debes completar el pago en la recepción del recinto.');
            setFbVisible(true);
            return;
        }
        setBookingForCheckIn(booking);
        setShowCheckInModal(true);
    };

    const confirmCheckIn = async () => {
        if (!bookingForCheckIn?.id) return;
        try {
            await bookingService.checkIn(bookingForCheckIn.id);
            loadData();
            setShowCheckInModal(false);
            setFbType('success');
            setFbMsg('¡Check-in exitoso! Ya puedes ingresar a la cancha.');
            setFbVisible(true);
        } catch (e) {
            setFbType('error');
            setFbMsg('No pudimos procesar tu llegada. Inténtalo de nuevo.');
            setFbVisible(true);
        }
    };

    const handleCheckOut = async (booking: Booking) => {
        if (!booking.id) return;
        setSurveyBooking(booking);
        setShowSurveyModal(true);
    };

    const handleSaveSurvey = async (rating: number, feedback: string) => {
        if (!surveyBooking?.id) return;
        try {
            await bookingService.checkOut(surveyBooking.id, { rating, feedback });
            await venueService.submitVenueFeedback(
                surveyBooking.tenantId,
                surveyBooking.id,
                rating,
                feedback,
                user?.displayName || 'Jugador MVP',
                {
                    sport: surveyBooking.sport,
                    bookingDate: surveyBooking.date,
                    bookingTime: surveyBooking.startTime
                }
            );

            loadData();
            setShowSurveyModal(false);
            setFbType('success');
            setFbMsg('¡Gracias por tu valoración! Partido finalizado con éxito.');
            setFbVisible(true);
        } catch (e) {
            setFbType('error');
            setFbMsg('Ocurrió un error al procesar el cierre. Intenta de nuevo.');
            setFbVisible(true);
        }
    };

    const handleCancel = (bookingId: string) => {
        setBookingToCancel(bookingId);
        setShowCancelModal(true);
    };

    const confirmCancel = async () => {
        if (!bookingToCancel) return;
        
        const targetBooking = bookings.find(b => b.id === bookingToCancel);
        const isPaid = targetBooking?.paymentStatus === 'paid' || targetBooking?.paymentStatus === 'partial';
        
        let isLessThan4Hours = false;
        if (targetBooking?.date && targetBooking?.startTime) {
            const nowChile = getSantiagoDateTime(new Date());
            let bookingDate: Date;
            if ((targetBooking.date as any).toDate) {
                bookingDate = (targetBooking.date as any).toDate();
            } else {
                bookingDate = new Date(targetBooking.date as any);
            }
            const startDateTime = getBookingDateTimeChile(bookingDate, targetBooking.startTime);
            const diffMs = startDateTime.getTime() - nowChile.getTime();
            const diffHours = diffMs / (1000 * 60 * 60);
            isLessThan4Hours = diffHours < 4;
        }

        try {
            if (isPaid && !isLessThan4Hours) {
                // LLAMAR A LA CLOUD FUNCTION DE REEMBOLSO PARCIAL AUTOMÁTICO
                const refundFn = httpsCallable(functions, 'refundBookingPayment');
                const res = await refundFn({ bookingId: bookingToCancel });
                
                const resultData = res.data as { success: boolean; refundAmount: number; fee: number; error?: string };
                
                loadData();
                setShowCancelModal(false);
                setFbType('success');
                if (resultData.success) {
                    setFbMsg(`¡Cancelado y Reembolsado! Se procesó un reembolso parcial de $${resultData.refundAmount.toLocaleString('es-CL')} (comisión del 3% retenida: $${resultData.fee.toLocaleString('es-CL')}).`);
                } else {
                    setFbMsg(`Reserva cancelada con éxito para liberar la cancha. Sin embargo, hubo un error al procesar el reembolso automático y debes contactar directamente al dueño del recinto para solicitar tu devolución.`);
                }
                setFbVisible(true);
            } else {
                // Cancelación regular sin reembolso (o impaga / menor a 4 horas)
                await bookingService.cancelBooking({ bookingId: bookingToCancel, cancelledBy: user?.displayName || user?.email || 'User' });
                loadData();
                setShowCancelModal(false);
                setFbType('success');
                setFbMsg(isPaid 
                    ? 'Reserva cancelada de última hora. De acuerdo con las políticas, el monto pagado no admite devolución.'
                    : 'Tu reserva ha sido cancelada correctamente.');
                setFbVisible(true);
            }
        } catch (e) {
            console.error("Error al cancelar:", e);
            setFbType('error');
            setFbMsg('Hubo un problema al cancelar. Contacta al soporte.');
            setFbVisible(true);
        }
    };

    const cancelModalInfo = useMemo(() => {
        if (!bookingToCancel) return { title: '¿Cancelar Reserva?', message: 'Esta acción no se puede deshacer. ¿Estás seguro?', danger: true };
        
        const targetBooking = bookings.find(b => b.id === bookingToCancel);
        if (!targetBooking) return { title: '¿Cancelar Reserva?', message: 'Esta acción no se puede deshacer. ¿Estás seguro?', danger: true };
        
        const nowChile = getSantiagoDateTime(new Date());
        let bookingDate: Date;
        if ((targetBooking.date as any).toDate) {
            bookingDate = (targetBooking.date as any).toDate();
        } else {
            bookingDate = new Date(targetBooking.date as any);
        }
        
        const startDateTime = getBookingDateTimeChile(bookingDate, targetBooking.startTime);
        const diffMs = startDateTime.getTime() - nowChile.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        const isLessThan4Hours = diffHours < 4;
        const isPaid = targetBooking.paymentStatus === 'paid' || targetBooking.paymentStatus === 'partial';

        if (isLessThan4Hours) {
            if (isPaid) {
                return {
                    title: '⚠️ Penalización por Cancelación',
                    message: '¡ATENCIÓN! Estás cancelando con menos de 4 horas de anticipación. Debido a las políticas de seguridad del recinto, el monto pagado online NO será devuelto. ¿Deseas continuar de todas formas?',
                    danger: true
                };
            } else {
                return {
                    title: '⚠️ Cancelación de Última Hora',
                    message: 'Estás cancelando con menos de 4 horas de anticipación. Tu cupo podría quedar vacío. ¿Estás seguro de que deseas cancelar?',
                    danger: true
                };
            }
        } else {
            if (isPaid) {
                return {
                    title: '🔄 Confirmar Devolución',
                    message: 'Tu reserva se encuentra en el período de cancelación permitido (más de 4 horas). Se gestionará la devolución o abono de tu dinero pagado online de manera automática. ¿Confirmas la cancelación y devolución de dinero?',
                    danger: false
                };
            } else {
                return {
                    title: '¿Confirmar Cancelación?',
                    message: 'Esta acción no se puede deshacer. ¿Estás seguro de que deseas cancelar tu turno?',
                    danger: true
                };
            }
        }
    }, [bookingToCancel, bookings]);

    useFocusEffect(
        React.useCallback(() => {
            loadData();
        }, [user])
    );

    const displayList = useMemo(() => {
        const filtered = bookings.filter(b => {
            const isActive = ['confirmed', 'active', 'pending'].includes(b.status as string) && !b.checkOut;
            if (activeTab === 'activas') {
                return isActive;
            } else {
                return !isActive;
            }
        });

        return filtered.sort((a, b) => {
            const timeA = (a.date as any)?.seconds || 0;
            const timeB = (b.date as any)?.seconds || 0;
            if (activeTab === 'activas') {
                if (timeA !== timeB) return timeA - timeB;
                return (a.startTime || "").localeCompare(b.startTime || "");
            } else {
                if (timeA !== timeB) return timeB - timeA;
                return (b.startTime || "").localeCompare(a.startTime || "");
            }
        });
    }, [bookings, activeTab]);

    const paginatedList = useMemo(() => {
        if (activeTab === 'activas') return displayList;
        return displayList.slice(0, historyLimit);
    }, [displayList, activeTab, historyLimit]);

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

            <View style={{ paddingTop: 60, paddingBottom: 20, paddingHorizontal: 30, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.card }}>
                <TouchableOpacity onPress={() => router.push('/(player)')} style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}>
                    <ChevronLeft color={COLORS.accent} size={24} />
                </TouchableOpacity>
                <Text style={{ color: C.text, fontSize: 20, fontWeight: '900', textTransform: 'uppercase', letterSpacing: -1 }}>Mis Reservas</Text>
                <View style={{ width: 44 }} />
            </View>

            <View style={{ flexDirection: 'row', padding: 20, paddingHorizontal: 30, gap: 10 }}>
                <TabButton label="ACTIVAS" active={activeTab === 'activas'} onPress={() => setActiveTab('activas')} isDark={isDark} />
                <TabButton label="HISTORIAL" active={activeTab === 'historial'} onPress={() => setActiveTab('historial')} isDark={isDark} />
            </View>

            <View style={{ flex: 1 }}>
                <FlashList
                    data={paginatedList}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(true); }} tintColor={COLORS.accent} />}
                    contentContainerStyle={{ paddingBottom: 120 }}
                    ListHeaderComponent={() => (
                        <SectionLabel label={activeTab === 'activas' ? "Próximos Partidos" : "Partidos Finalizados"} />
                    )}
                    ListEmptyComponent={() => (
                        <View style={{ padding: 60, alignItems: 'center', justifyContent: 'center' }}>
                            <CalendarDays color={C.sub} size={64} strokeWidth={1} />
                            <Text style={{ color: C.sub, fontSize: 12, fontWeight: '800', marginTop: 20, textAlign: 'center' }}>No hay partidos para mostrar</Text>
                        </View>
                    )}
                    renderItem={({ item: b }) => (
                        <BookingEliteCard
                            booking={b}
                            venueName={venues[b.tenantId]?.name || b.tenantName}
                            isDark={isDark}
                            onView={() => { setSelectedBooking(b); setShowTicket(true); }}
                            onMaps={() => handleOpenMaps(b)}
                            onCheckIn={() => { setSelectedBooking(b); setShowTicket(true); }}
                            onCheckOut={() => handleCheckOut(b)}
                            onStats={() => {}}
                            onCancel={() => b.id && handleCancel(b.id)}
                        />
                    )}
                    ListFooterComponent={() => (
                        activeTab === 'historial' && displayList.length > historyLimit ? (
                            <TouchableOpacity 
                                onPress={() => setHistoryLimit(prev => prev + 10)}
                                style={{ 
                                    marginHorizontal: 30, 
                                    marginTop: 10,
                                    marginBottom: 30,
                                    height: 55, 
                                    borderRadius: 20, 
                                    backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC', 
                                    borderWidth: 1, 
                                    borderColor: C.border, 
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    flexDirection: 'row',
                                    gap: 8
                                }}
                                activeOpacity={0.7}
                            >
                                <Text style={{ color: COLORS.accent, fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 }}>Cargar más reservas</Text>
                            </TouchableOpacity>
                        ) : null
                    )}
                />
            </View>

            <Modal visible={showTicket} animationType="slide" transparent={true}>
                {selectedBooking?.paymentStatus === 'refund_failed' ? (
                    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 }}>
                        <View style={{ backgroundColor: C.card, borderRadius: 30, borderWidth: 1, borderColor: C.border, overflow: 'hidden' }}>
                            {/* HEADER */}
                            <View style={{ padding: 20, borderBottomWidth: 1, borderBottomColor: C.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={{ color: C.text, fontSize: 16, fontWeight: '900', textTransform: 'uppercase', letterSpacing: -0.5 }}>Devolución Pendiente</Text>
                                <TouchableOpacity onPress={() => setShowTicket(false)} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}>
                                    <X color={C.text} size={18} />
                                </TouchableOpacity>
                            </View>

                            {/* BODY */}
                            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 25 }}>
                                <View style={{ alignItems: 'center', marginVertical: 10 }}>
                                    <Text style={{ color: '#ef4444', fontSize: 10, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>
                                        Reversa Automática Fallida
                                    </Text>
                                    <Text style={{ color: C.text, fontSize: 28, fontWeight: '900', letterSpacing: -1 }}>
                                        ${Number(selectedBooking?.totalPrice || selectedBooking?.price || 0).toLocaleString('es-CL')}
                                    </Text>
                                    <Text style={{ color: C.sub, fontSize: 10, fontWeight: '800', textAlign: 'center', marginTop: 4 }}>
                                        Monto Pendiente de Devolución
                                    </Text>
                                </View>

                                <View style={{ gap: 12, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 20, marginVertical: 15 }}>
                                    <LargeDetailRow label="Jugador" value={selectedBooking?.clientName || '—'} C={C} />
                                    <LargeDetailRow label="Recinto" value={selectedBooking?.tenantName || '—'} C={C} />
                                    <LargeDetailRow label="Cancha" value={selectedBooking?.courtName || '—'} C={C} />
                                    <LargeDetailRow label="Deporte" value={(selectedBooking?.sport || '—').toUpperCase()} C={C} />
                                    <LargeDetailRow label="Fecha Partido" value={getFormattedDate(selectedBooking?.date).full} C={C} />
                                    <LargeDetailRow label="Horario" value={`${selectedBooking?.startTime} HRS`} C={C} />
                                    <LargeDetailRow label="Método Pago" value="Online (Webpay Plus)" C={C} />
                                    <LargeDetailRow label="Estado Reclamación" value="Manual Pendiente" highlightColor="#ef4444" C={C} />
                                    <View style={{ height: 1, backgroundColor: C.border, marginVertical: 4 }} />
                                    <LargeDetailRow label="ID Reserva" value={selectedBooking?.id} C={C} />
                                    <LargeDetailRow label="Código Validación" value={`MVP-REFUND-${selectedBooking?.id?.substring(0, 8).toUpperCase() || '—'}`} highlightColor="#ef4444" C={C} />
                                </View>

                                <View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#F8FAFC', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: C.border, gap: 8, marginBottom: 15 }}>
                                    <Text style={{ color: '#ef4444', fontSize: 10, fontWeight: '900', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                                        Instrucciones para Devolución
                                    </Text>
                                    <Text style={{ color: C.sub, fontSize: 10, fontWeight: '600', lineHeight: 14 }}>
                                        Debido a una desconexión temporal con la pasarela de pagos de Transbank, el sistema automático no pudo reversar tu dinero. Presenta este comprobante de validación digital directamente al administrador o dueño del recinto deportivo para solicitar tu transferencia manual por el monto total indicado arriba.
                                    </Text>
                                </View>

                                <TouchableOpacity
                                    onPress={async () => {
                                        if (!selectedBooking) return;
                                        const displayD = getFormattedDate(selectedBooking.date).full;
                                        const shareText = `*COMPROBANTE DE DEVOLUCIÓN DE PAGO - MVP SPORTS*\n\n` +
                                            `Estimado Administrador de *${selectedBooking.tenantName}*,\n\n` +
                                            `Presento el ticket oficial de solicitud de reembolso debido a una reversa automática fallida de Transbank. A continuación se detallan los datos de la transacción para su validación manual:\n\n` +
                                            `• *Código de Validación:* MVP-REFUND-${selectedBooking.id?.substring(0, 8).toUpperCase()}\n` +
                                            `• *ID de Reserva:* ${selectedBooking.id}\n` +
                                            `• *Jugador:* ${selectedBooking.clientName}\n` +
                                            `• *Cancha:* ${selectedBooking.courtName}\n` +
                                            `• *Fecha/Hora Reserva:* ${displayD} a las ${selectedBooking.startTime} HRS\n` +
                                            `• *Monto a Reembolsar:* $${Number(selectedBooking.totalPrice || selectedBooking.price || 0).toLocaleString('es-CL')} CLP\n` +
                                            `• *Estado:* Devolución Pendiente por Transferencia Manual\n\n` +
                                            `Por favor, procese la devolución de forma manual a la brevedad. ¡Muchas gracias!`;
                                        try {
                                            await Share.share({
                                                message: shareText,
                                                title: 'Comprobante de Devolución'
                                            });
                                        } catch (error) {
                                            Alert.alert('Error', 'No se pudo compartir el comprobante.');
                                        }
                                    }}
                                    style={{ 
                                        height: 55, 
                                        borderRadius: 18, 
                                        backgroundColor: '#25D366', 
                                        flexDirection: 'row', 
                                        alignItems: 'center', 
                                        justifyContent: 'center', 
                                        shadowColor: '#25D366', 
                                        shadowOpacity: 0.2, 
                                        shadowRadius: 10, 
                                        elevation: 5,
                                        marginTop: 15
                                    }}
                                >
                                    <Share2 color="white" size={16} style={{ marginRight: 8 }} />
                                    <Text style={{ color: 'white', fontWeight: '900', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>COMPARTIR COMPROBANTE</Text>
                                </TouchableOpacity>
                            </ScrollView>
                        </View>
                    </View>
                ) : (
                    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 30 }}>
                        <View style={{ backgroundColor: C.card, borderRadius: 40, overflow: 'hidden', borderWidth: 1, borderColor: C.border }}>
                            <View style={{ padding: 30, borderBottomWidth: 2, borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : '#F8FAFC', borderStyle: 'dashed' }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                    <View style={{ width: 50, height: 50, borderRadius: 15, backgroundColor: modalSportInfo.color + '15', alignItems: 'center', justifyContent: 'center' }}>
                                        <modalSportInfo.icon color={modalSportInfo.color} size={24} />
                                    </View>
                                    <TouchableOpacity onPress={() => setShowTicket(false)} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}>
                                        <X color={C.text} size={20} />
                                    </TouchableOpacity>
                                </View>
                                <Text style={{ color: C.sub, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 5 }}>RECINTO</Text>
                                <Text style={{ color: C.text, fontSize: 24, fontWeight: '900', marginBottom: 20 }}>{selectedBooking?.tenantName}</Text>
                                <View style={{ flexDirection: 'row', gap: 30 }}>
                                    <View>
                                        <Text style={{ color: C.sub, fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>CANCHA</Text>
                                        <Text style={{ color: C.text, fontSize: 14, fontWeight: '800' }}>{selectedBooking?.courtName}</Text>
                                    </View>
                                    <View>
                                        <Text style={{ color: C.sub, fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>ESTADO</Text>
                                        <Text style={{ color: modalStatus.color, fontSize: 14, fontWeight: '800' }}>{modalStatus.label}</Text>
                                    </View>
                                </View>
                            </View>
                            <View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC', padding: 40, alignItems: 'center' }}>
                                <View style={{ backgroundColor: 'white', padding: 20, borderRadius: 25, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 }}>
                                    {selectedBooking?.id && <QRCode value={selectedBooking.id} size={150} color="#0F172A" backgroundColor="white" />}
                                </View>
                                <Text style={{ color: C.sub, fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 4, marginTop: 25 }}>ID: {(selectedBooking?.id as string)?.slice(-8).toUpperCase()}</Text>
                            </View>
                            <View style={{ padding: 30 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <View style={{ gap: 8 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Calendar color={modalSportInfo.color} size={14} />
                                            <Text style={{ color: C.text, fontSize: 13, fontWeight: '900', marginLeft: 10 }}>{getFormattedDate(selectedBooking?.date).full}</Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Clock color={modalSportInfo.color} size={14} />
                                            <Text style={{ color: C.text, fontSize: 13, fontWeight: '900', marginLeft: 10 }}>{selectedBooking?.startTime} HRS</Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        </View>
                    </View>
                )}
            </Modal>

            <FeedbackModal visible={fbVisible} type={fbType} message={fbMsg} onClose={() => setFbVisible(false)} isDark={isDark} />



            <SurveyModal
                visible={showSurveyModal}
                onClose={() => setShowSurveyModal(false)}
                onSave={handleSaveSurvey}
                isDark={isDark}
            />

            <EliteActionModal
                visible={showCancelModal}
                onClose={() => setShowCancelModal(false)}
                onConfirm={confirmCancel}
                title={cancelModalInfo.title}
                message={cancelModalInfo.message}
                confirmText="SÍ, CANCELAR"
                icon={<Trash2 color={cancelModalInfo.danger ? "#ef4444" : "#f59e0b"} size={40} />}
                isDark={isDark}
                danger={cancelModalInfo.danger}
            />

            <EliteActionModal
                visible={showCheckInModal}
                onClose={() => setShowCheckInModal(false)}
                onConfirm={confirmCheckIn}
                title="Confirmar Llegada"
                message="¿Confirmas que ya te encuentras en el recinto para iniciar tu partido?"
                confirmText="SÍ, INGRESAR"
                icon={<ShieldCheck color={COLORS.accent} size={40} />}
                isDark={isDark}
            />
        </View>
    );
}

const TabButton = ({ label, active, onPress, isDark }: any) => (
    <TouchableOpacity onPress={onPress} style={{ flex: 1, height: 50, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? COLORS.accent : (isDark ? 'rgba(255,255,255,0.03)' : '#F1F5F9'), borderWidth: active ? 0 : 1, borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#E2E8F0' }}>
        <Text style={{ color: active ? 'white' : (isDark ? '#94A3B8' : '#64748B'), fontWeight: '900', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</Text>
    </TouchableOpacity>
);

const BookingEliteCard = ({ booking, venueName, isDark, onView, onMaps, onCheckIn, onCheckOut, onStats, onCancel }: any) => {
    const C = isDark ? COLORS.dark : COLORS.light;
    const sportInfo = getSportInfo(booking.sport || '');
    const status = getStatusInfo(booking, C);
    const dateInfo = getFormattedDate(booking.date);
    const isConfirmed = booking.status === 'confirmed' && !booking.checkOut;
    const isActive = booking.status === 'active' && !booking.checkOut;
    const isCompleted = booking.status === 'completed' || booking.status === 'past' || booking.checkOut === true;
    const isCancelled = booking.status === 'cancelled';
    const showMapsAndTicket = (!isCompleted && !isCancelled) || booking.paymentStatus === 'refund_failed';
    const hasButtons = (isConfirmed && !booking.checkIn) || 
                       (isActive && !booking.checkOut) || 
                       showMapsAndTicket || 
                       (!isCompleted && !isCancelled && !isActive && !booking.checkIn);

    return (
        <View style={{ marginHorizontal: 25, marginBottom: 25, backgroundColor: C.card, borderRadius: 35, borderWidth: 1, borderColor: C.border, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 20, overflow: 'hidden' }}>
            <View style={{ padding: 25 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: sportInfo.color + '15', alignItems: 'center', justifyContent: 'center' }}>
                            <sportInfo.icon color={sportInfo.color} size={24} />
                        </View>
                        <View>
                            <Text style={{ color: C.text, fontSize: 18, fontWeight: '900', textTransform: 'uppercase', letterSpacing: -0.5 }}>{venueName || booking.tenantName}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                <MapPinned color={C.sub} size={10} />
                                <Text style={{ color: C.sub, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }}>{booking.courtName}</Text>
                            </View>
                        </View>
                    </View>
                    <View style={{ backgroundColor: status.color + '15', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: status.color + '20' }}>
                        <Text style={{ color: status.color, fontSize: 9, fontWeight: '900', letterSpacing: 0.5 }}>{status.label}</Text>
                    </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 15, marginBottom: 20 }}>
                    <View style={{ flex: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#F8FAFC', padding: 15, borderRadius: 20, gap: 4 }}>
                        <Text style={{ color: C.sub, fontSize: 8, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 }}>FECHA Y HORA</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <CalendarDays color={COLORS.accent} size={14} />
                            <Text style={{ color: C.text, fontSize: 12, fontWeight: '800' }}>{dateInfo.full}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Timer color={COLORS.accent} size={14} />
                            <Text style={{ color: C.text, fontSize: 12, fontWeight: '800' }}>{booking.startTime} HRS</Text>
                        </View>
                    </View>
                    <View style={{ flex: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#F8FAFC', padding: 15, borderRadius: 20, gap: 4 }}>
                        <Text style={{ color: C.sub, fontSize: 8, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 }}>PAGO Y VALOR</Text>
                        <Text style={{ color: C.text, fontSize: 16, fontWeight: '900' }}>${(booking.totalPrice || booking.price || 0).toLocaleString('es-CL')}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                            <View style={{ 
                                width: 6, 
                                height: 6, 
                                borderRadius: 3, 
                                backgroundColor: booking.paymentStatus === 'refunded' ? '#10b981' : (booking.paymentStatus === 'refund_failed' ? '#ef4444' : (booking.paymentStatus === 'paid' ? COLORS.accent : '#f59e0b')) 
                            }} />
                            <Text style={{ 
                                color: booking.paymentStatus === 'refunded' ? '#10b981' : (booking.paymentStatus === 'refund_failed' ? '#ef4444' : (booking.paymentStatus === 'paid' ? COLORS.accent : '#f59e0b')), 
                                fontSize: 9, 
                                fontWeight: '900', 
                                textTransform: 'uppercase' 
                            }}>
                                {booking.paymentStatus === 'refunded' ? 'DEVOLUCIÓN' : (booking.paymentStatus === 'refund_failed' ? 'DEVOLUCIÓN FALLIDA' : (booking.paymentStatus === 'paid' ? 'PAGADO' : 'PENDIENTE'))}
                            </Text>
                        </View>
                    </View>
                </View>
                {hasButtons && (
                    <View style={{ flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 15 }}>
                        {isConfirmed && !booking.checkIn && (
                        <TouchableOpacity onPress={onCheckIn} style={{ flex: 2, height: 50, borderRadius: 15, backgroundColor: COLORS.accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, shadowColor: COLORS.accent, shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } }}>
                            <ShieldCheck color="white" size={18} />
                            <Text style={{ color: 'white', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' }}>INGRESAR</Text>
                        </TouchableOpacity>
                    )}
                    {isActive && !booking.checkOut && (
                        <TouchableOpacity onPress={onCheckOut} style={{ flex: 2, height: 50, borderRadius: 15, backgroundColor: '#f59e0b', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, shadowColor: '#f59e0b', shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } }}>
                            <CheckCircle2 color="white" size={18} />
                            <Text style={{ color: 'white', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' }}>CHECK-OUT</Text>
                        </TouchableOpacity>
                    )}
                    {showMapsAndTicket && (
                        <TouchableOpacity onPress={onMaps} style={{ width: 50, height: 50, borderRadius: 15, backgroundColor: COLORS.maps + '10', alignItems: 'center', justifyContent: 'center' }}>
                            <Navigation color={COLORS.maps} size={20} />
                        </TouchableOpacity>
                    )}
                    {!isCompleted && !isCancelled && !isActive && !booking.checkIn && (
                        <TouchableOpacity onPress={onCancel} style={{ width: 50, height: 50, borderRadius: 15, backgroundColor: '#ef444410', alignItems: 'center', justifyContent: 'center' }}>
                            <XCircle color="#ef4444" size={20} />
                        </TouchableOpacity>
                    )}
                    {showMapsAndTicket && (!isConfirmed || booking.checkIn || booking.paymentStatus === 'refund_failed') && (
                        <TouchableOpacity 
                            onPress={onView} 
                            style={{ 
                                flex: booking.paymentStatus === 'refund_failed' ? 2 : undefined, 
                                width: booking.paymentStatus === 'refund_failed' ? undefined : 50, 
                                height: 50, 
                                borderRadius: 15, 
                                backgroundColor: booking.paymentStatus === 'refund_failed' ? '#ef4444' : C.sub + '10', 
                                flexDirection: booking.paymentStatus === 'refund_failed' ? 'row' : undefined, 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                gap: 8,
                                shadowColor: booking.paymentStatus === 'refund_failed' ? '#ef4444' : undefined,
                                shadowOpacity: booking.paymentStatus === 'refund_failed' ? 0.2 : undefined,
                                shadowRadius: booking.paymentStatus === 'refund_failed' ? 10 : undefined,
                                shadowOffset: booking.paymentStatus === 'refund_failed' ? { width: 0, height: 4 } : undefined
                            }}
                        >
                            {booking.paymentStatus === 'refund_failed' ? (
                                <>
                                    <Receipt color="white" size={18} />
                                    <Text style={{ color: 'white', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' }}>Solicitar Devolución</Text>
                                </>
                            ) : (
                                <Ticket color={C.sub} size={20} />
                            )}
                        </TouchableOpacity>
                    )}
                </View>
                )}
            </View>
        </View>
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
                    <Text style={{ color: C.text, fontSize: 18, fontWeight: '900', textAlign: 'center', marginBottom: 10 }}>{type === 'error' ? 'Oops' : '¡Éxito!'}</Text>
                    <Text style={{ color: C.sub, fontSize: 13, fontWeight: '600', textAlign: 'center', marginBottom: 25 }}>{message}</Text>
                    <TouchableOpacity onPress={onClose} style={{ backgroundColor: (type === 'error' ? '#ef4444' : '#10b981'), paddingVertical: 15, borderRadius: 15, width: '100%', alignItems: 'center' }}>
                        <Text style={{ color: 'white', fontWeight: '900' }}>ENTENDIDO</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const EliteActionModal = ({ visible, onClose, onConfirm, title, message, confirmText, icon, isDark, danger }: any) => {
    const C = isDark ? COLORS.dark : COLORS.light;
    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
                <View style={{ backgroundColor: C.card, borderRadius: 35, padding: 30, alignItems: 'center', width: '100%', borderWidth: 1, borderColor: C.border }}>
                    <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: (danger ? '#ef4444' : COLORS.accent) + '15', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                        {icon}
                    </View>
                    <Text style={{ color: C.text, fontSize: 20, fontWeight: '900', textAlign: 'center', marginBottom: 10 }}>{title}</Text>
                    <Text style={{ color: C.sub, fontSize: 13, fontWeight: '600', textAlign: 'center', marginBottom: 30, lineHeight: 20 }}>{message}</Text>
                    <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
                        <TouchableOpacity onPress={onClose} style={{ flex: 1, height: 55, borderRadius: 15, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ color: C.text, fontWeight: '900', fontSize: 12 }}>VOLVER</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={onConfirm} style={{ flex: 1, height: 55, borderRadius: 15, backgroundColor: danger ? '#ef4444' : COLORS.accent, alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ color: 'white', fontWeight: '900', fontSize: 12 }}>{confirmText}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};



const SurveyModal = ({ visible, onClose, onSave, isDark }: any) => {
    const C = isDark ? COLORS.dark : COLORS.light;
    const [rating, setRating] = useState(5);
    const [feedback, setFeedback] = useState('');
    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 25 }}>
                <View style={{ backgroundColor: C.bg, borderRadius: 35, padding: 30, borderWidth: 1, borderColor: C.border }}>
                    <View style={{ alignItems: 'center', marginBottom: 25 }}>
                        <View style={{ width: 60, height: 60, borderRadius: 20, backgroundColor: COLORS.accent + '15', alignItems: 'center', justifyContent: 'center', marginBottom: 15 }}>
                            <Star color={COLORS.accent} size={30} fill={COLORS.accent} />
                        </View>
                        <Text style={{ color: C.text, fontSize: 22, fontWeight: '900', textTransform: 'uppercase' }}>Tu Experiencia</Text>
                        <Text style={{ color: C.sub, fontSize: 12, fontWeight: '600', textAlign: 'center', marginTop: 5 }}>¿Qué te pareció el recinto y el servicio hoy?</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 30 }}>
                        {[1, 2, 3, 4, 5].map((s) => (
                            <TouchableOpacity key={s} onPress={() => setRating(s)}>
                                <Star size={35} color={rating >= s ? '#f59e0b' : C.sub} fill={rating >= s ? '#f59e0b' : 'transparent'} strokeWidth={2} />
                            </TouchableOpacity>
                        ))}
                    </View>
                    <TextInput value={feedback} onChangeText={setFeedback} placeholder="Comentarios adicionales (opcional)..." placeholderTextColor={C.sub} multiline style={{ backgroundColor: C.card, borderRadius: 20, padding: 20, color: C.text, fontSize: 14, height: 100, textAlignVertical: 'top', borderWidth: 1, borderColor: C.border, marginBottom: 25 }} />
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <TouchableOpacity onPress={onClose} style={{ flex: 1, height: 60, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: C.card, borderWidth: 1, borderColor: C.border }}><Text style={{ color: C.sub, fontWeight: '900' }}>CANCELAR</Text></TouchableOpacity>
                        <TouchableOpacity onPress={() => onSave(rating, feedback)} style={{ flex: 2, height: 60, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.accent }}><Text style={{ color: 'white', fontWeight: '900' }}>FINALIZAR PARTIDO</Text></TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};
