import React, { useEffect, useMemo, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StatusBar, ActivityIndicator, Alert, Share, BackHandler, StyleSheet, Dimensions } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { CheckCircle, MapPin, Share2, Download, Calendar, Clock, Trophy, Zap, Target, CircleDot, Dribbble, Medal, ArrowRight, Home, ShieldCheck, AlertCircle } from 'lucide-react-native';
import { useAuth } from '../../store/useAuth';
import { LinearGradient } from 'expo-linear-gradient';
import { bookingService, Booking } from '../../services/bookingService';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
    accent: '#10b981'
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

export default function TicketScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { theme } = useAuth();
    const isDark = theme === 'dark';
    const C = isDark ? COLORS.dark : COLORS.light;
    const { bookingId, sportColor } = params as any;

    const viewRef = useRef<View>(null);
    const [booking, setBooking] = useState<Booking | null>(null);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const [sharing, setSharing] = useState(false);

    useFocusEffect(
        React.useCallback(() => {
            const run = async () => {
                if (!bookingId || typeof bookingId !== 'string') {
                    setLoading(false);
                    return;
                }
                const b = await bookingService.getBooking(bookingId);
                setBooking(b);
                setLoading(false);
            };
            run();

            const backAction = () => {
                router.back();
                return true;
            };
            const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
            return () => backHandler.remove();
        }, [bookingId])
    );

    const sportInfo = useMemo(() => getSportInfo(booking?.sport || ''), [booking]);
    const activeColor = sportInfo.color;

    const displayDate = useMemo(() => {
        if (!booking?.date) return '—';
        try {
            const d = (booking.date as any).toDate ? (booking.date as any).toDate() : new Date();
            return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
        } catch {
            return '—';
        }
    }, [booking?.date]);

    const handleShare = async () => {
        if (!booking) return;
        setSharing(true);
        try {
            const uri = await captureRef(viewRef, { format: 'png', quality: 0.9 });
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri, { dialogTitle: 'Mi Ticket MVP Sports', mimeType: 'image/png' });
            }
        } catch (error) {
            Alert.alert('Error', 'No se pudo generar la imagen del ticket.');
        } finally {
            setSharing(false);
        }
    };

    if (loading) return (
        <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={activeColor} size="large" />
        </View>
    );

    return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

                {/* HERO SECTION DNA */}
                <View style={{ height: 240 }}>
                    <LinearGradient 
                        colors={[activeColor, activeColor + '80', 'transparent']} 
                        style={StyleSheet.absoluteFill}
                    />
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 20 }}>
                        <View style={{ width: 80, height: 80, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }}>
                            <CheckCircle color="white" size={40} />
                        </View>
                    </View>
                </View>

                {/* MAIN CONTENT CARD (MATCHING [ID].TSX DNA) */}
                <View style={{ paddingHorizontal: 25, marginTop: -40 }}>
                    <ViewShot ref={viewRef} options={{ format: 'png', quality: 1.0 }} style={{ backgroundColor: 'transparent' }}>
                        <View style={{ 
                            backgroundColor: C.card, 
                            borderRadius: 35, 
                            padding: 30, 
                            borderWidth: 1, 
                            borderColor: C.border, 
                            shadowColor: '#000', 
                            shadowOpacity: isDark ? 0.4 : 0.08, 
                            shadowRadius: 30,
                            elevation: 10
                        }}>
                            {/* DATOS DEL RECINTO SECTION */}
                            <View style={{ gap: 18, marginBottom: 30 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
                                    <View style={{ width: 15, height: 2, backgroundColor: activeColor, marginRight: 10 }} />
                                    <Text style={{ color: C.sub, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2 }}>Información del Recinto</Text>
                                </View>

                                <View style={{ gap: 15 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text style={{ color: C.sub, fontSize: 11, fontWeight: '700' }}>RECINTO</Text>
                                        <Text style={{ color: C.text, fontSize: 11, fontWeight: '900' }}>{booking?.tenantName}</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text style={{ color: C.sub, fontSize: 11, fontWeight: '700' }}>CANCHA</Text>
                                        <Text style={{ color: C.text, fontSize: 11, fontWeight: '900' }}>{booking?.courtName}</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text style={{ color: C.sub, fontSize: 11, fontWeight: '700' }}>DEPORTE</Text>
                                        <Text style={{ color: C.text, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' }}>{booking?.sport}</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text style={{ color: C.sub, fontSize: 11, fontWeight: '700' }}>FECHA</Text>
                                        <Text style={{ color: C.text, fontSize: 11, fontWeight: '900' }}>{displayDate}</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text style={{ color: C.sub, fontSize: 11, fontWeight: '700' }}>HORARIO</Text>
                                        <Text style={{ color: C.text, fontSize: 11, fontWeight: '900' }}>{booking?.startTime} HRS</Text>
                                    </View>
                                </View>
                            </View>

                            {/* TRANSACTION SUMMARY SECTION */}
                            <View style={{ paddingVertical: 30, gap: 18, borderTopWidth: 1, borderTopColor: C.border }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
                                    <View style={{ width: 15, height: 2, backgroundColor: activeColor, marginRight: 10 }} />
                                    <Text style={{ color: C.sub, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2 }}>Detalles de Transacción</Text>
                                </View>

                                <View style={{ gap: 15 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text style={{ color: C.sub, fontSize: 11, fontWeight: '700' }}>ID DE RESERVA</Text>
                                        <Text style={{ color: C.text, fontSize: 11, fontWeight: '900', letterSpacing: 0.5 }}>{bookingId}</Text>
                                    </View>

                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text style={{ color: C.sub, fontSize: 11, fontWeight: '700' }}>ESTADO</Text>
                                        <View style={{ backgroundColor: activeColor + '15', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}>
                                            <Text style={{ color: activeColor, fontSize: 10, fontWeight: '900' }}>CONFIRMADO</Text>
                                        </View>
                                    </View>

                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text style={{ color: C.sub, fontSize: 11, fontWeight: '700' }}>MÉTODO</Text>
                                        <Text style={{ color: C.text, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' }}>
                                            {(booking as any)?.paymentMethod === 'card' ? 'Tarjeta (Online)' : 'Pago en Recinto'}
                                        </Text>
                                    </View>

                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text style={{ color: C.sub, fontSize: 11, fontWeight: '700' }}>ESTADO PAGO</Text>
                                        <View style={{ backgroundColor: booking?.paymentStatus === 'paid' ? '#10b98115' : '#f59e0b15', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}>
                                            <Text style={{ color: booking?.paymentStatus === 'paid' ? '#10b981' : '#f59e0b', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' }}>
                                                {booking?.paymentStatus === 'paid' ? 'Pagado' : 'Pendiente'}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text style={{ color: C.sub, fontSize: 11, fontWeight: '700' }}>FECHA COMPRA</Text>
                                        <Text style={{ color: C.text, fontSize: 11, fontWeight: '900' }}>
                                            {booking?.createdAt ? (booking.createdAt as any).toDate().toLocaleString('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                                        </Text>
                                    </View>

                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text style={{ color: C.sub, fontSize: 11, fontWeight: '700' }}>MONTO {booking?.paymentStatus === 'paid' ? 'PAGADO' : 'POR PAGAR'}</Text>
                                        <Text style={{ color: booking?.paymentStatus === 'paid' ? activeColor : '#f59e0b', fontSize: 11, fontWeight: '900' }}>
                                            ${Number(booking?.totalPrice || 0).toLocaleString('es-CL')}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* AVISO PAGO PENDIENTE */}
                            {booking?.paymentStatus === 'pending' && (
                                <View style={{ marginTop: 5, padding: 20, backgroundColor: '#f59e0b10', borderRadius: 25, borderWidth: 1, borderColor: '#f59e0b30', flexDirection: 'row', alignItems: 'center' }}>
                                    <AlertCircle color="#f59e0b" size={20} />
                                    <Text style={{ color: '#f59e0b', fontSize: 11, fontWeight: '800', marginLeft: 12, flex: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                        Recuerda pagar en el recinto antes de tu partido.
                                    </Text>
                                </View>
                            )}
                        </View>
                    </ViewShot>


                    {/* ACTIONS DNA */}
                    <View style={{ marginTop: 35 }}>
                        <TouchableOpacity 
                            onPress={() => router.replace('/(player)/(tabs)/reservas')} 
                            style={{ 
                                height: 75, 
                                borderRadius: 25, 
                                backgroundColor: activeColor, 
                                flexDirection: 'row', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                shadowColor: activeColor, 
                                shadowOpacity: 0.3, 
                                shadowRadius: 15, 
                                elevation: 8 
                            }}
                        >
                            <Calendar color="white" size={20} style={{ marginRight: 15 }} />
                            <Text style={{ color: 'white', fontWeight: '900', fontSize: 16, textTransform: 'uppercase', letterSpacing: 1 }}>Ir a mis Reservas</Text>
                        </TouchableOpacity>
                    </View>
                </View>

            </ScrollView>
        </View>
    );
}

const Check = ({ color, size }: any) => (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <CheckCircle color={color} size={size} />
    </View>
);
