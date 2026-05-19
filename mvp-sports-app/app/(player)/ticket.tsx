import React, { useEffect, useMemo, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StatusBar, ActivityIndicator, Alert, Share, BackHandler, StyleSheet, Dimensions, Modal } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { CheckCircle, MapPin, Share2, Download, Calendar, Clock, Trophy, Zap, Target, CircleDot, Dribbble, Medal, ArrowRight, Home, ShieldCheck, AlertCircle, Receipt, X, FileText, ChevronLeft } from 'lucide-react-native';
import { useAuth } from '../../store/useAuth';
import { LinearGradient } from 'expo-linear-gradient';
import { bookingService, Booking } from '../../services/bookingService';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const DetailRow = ({ label, value, C }: any) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: C.sub, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>
        <Text style={{ color: C.text, fontSize: 11, fontWeight: '900' }}>{value}</Text>
    </View>
);

const LargeDetailRow = ({ label, value, C, highlightColor }: any) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 2 }}>
        <Text style={{ color: C.sub, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>
        <Text style={{ color: highlightColor || C.text, fontSize: 11, fontWeight: '900' }}>{value}</Text>
    </View>
);

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
    const [showClaimModal, setShowClaimModal] = useState(false);

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
                // Bloqueado: el usuario ya realizó el pago y está en el resumen del ticket.
                // Debe usar el botón oficial en pantalla para continuar su flujo.
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

    const isRefundFailed = useMemo(() => (booking?.paymentStatus as any) === 'refund_failed', [booking]);
    const heroColors = useMemo(() => isRefundFailed ? ['#ef4444', '#ef444480', 'transparent'] : [activeColor, activeColor + '80', 'transparent'], [isRefundFailed, activeColor]);
    const HeroIcon = isRefundFailed ? AlertCircle : CheckCircle;

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

    if (isRefundFailed) {
        return (
            <View style={{ flex: 1, backgroundColor: C.bg }}>
                <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
                
                {/* HEADER */}
                <View style={{ paddingTop: 60, paddingBottom: 20, paddingHorizontal: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.card }}>
                    <TouchableOpacity onPress={() => router.replace('/(player)/reservas')} style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}>
                        <ChevronLeft color="#ef4444" size={24} />
                    </TouchableOpacity>
                    <Text style={{ color: C.text, fontSize: 18, fontWeight: '900', textTransform: 'uppercase', letterSpacing: -0.5 }}>Detalle de Devolución</Text>
                    <View style={{ width: 44 }} /> 
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 25, paddingBottom: 100 }}>
                    
                    {/* CUSTOM CHECKOUT-ALERT STYLE CARD */}
                    <View style={{ 
                        backgroundColor: C.card, 
                        borderRadius: 30, 
                        padding: 30, 
                        borderWidth: 1, 
                        borderColor: C.border, 
                        shadowColor: '#000', 
                        shadowOpacity: isDark ? 0.4 : 0.08, 
                        shadowRadius: 25,
                        elevation: 5,
                        marginTop: 20
                    }}>
                        {/* SIMPLE TYPOGRAPHY HEADER */}
                        <View style={{ width: '100%', alignItems: 'center', marginBottom: 25 }}>
                            <Text style={{ color: '#ef4444', fontSize: 10, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>
                                Reversa Automática Fallida
                            </Text>
                            <Text style={{ color: C.text, fontSize: 32, fontWeight: '900', letterSpacing: -1 }}>
                                ${Number(booking?.totalPrice || 0).toLocaleString('es-CL')}
                            </Text>
                            <Text style={{ color: C.sub, fontSize: 10, fontWeight: '800', textAlign: 'center', marginTop: 4 }}>
                                Monto Pendiente de Devolución
                            </Text>
                        </View>

                        {/* DETAILS LIST CONTAINER */}
                        <View style={{ width: '100%', gap: 12, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 20, marginBottom: 20 }}>
                            <LargeDetailRow label="Jugador" value={booking?.clientName || '—'} C={C} />
                            <LargeDetailRow label="Recinto" value={booking?.tenantName || '—'} C={C} />
                            <LargeDetailRow label="Cancha" value={booking?.courtName || '—'} C={C} />
                            <LargeDetailRow label="Deporte" value={(booking?.sport || '—').toUpperCase()} C={C} />
                            <LargeDetailRow label="Fecha Partido" value={displayDate} C={C} />
                            <LargeDetailRow label="Horario" value={`${booking?.startTime} HRS`} C={C} />
                            <LargeDetailRow label="Método Pago" value="Online (Webpay Plus)" C={C} />
                            <LargeDetailRow label="Estado Reclamación" value="Manual Pendiente" highlightColor="#ef4444" C={C} />
                            <View style={{ height: 1, backgroundColor: C.border, marginVertical: 4 }} />
                            <LargeDetailRow label="ID Reserva" value={bookingId} C={C} />
                            <LargeDetailRow label="Código Validación" value={`MVP-REFUND-${bookingId?.toUpperCase() || '—'}`} highlightColor="#ef4444" C={C} />
                        </View>

                        {/* LEGAL/Warning TEXT WITHOUT ICONS */}
                        <View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#F8FAFC', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: C.border, width: '100%', gap: 8 }}>
                            <Text style={{ color: '#ef4444', fontSize: 10, fontWeight: '900', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                                Instrucciones para Devolución
                            </Text>
                            <Text style={{ color: C.sub, fontSize: 10, fontWeight: '600', lineHeight: 14 }}>
                                Debido a una desconexión temporal con la pasarela de pagos de Transbank, el sistema automático no pudo reversar tu dinero. Presenta este comprobante de validación digital directamente al administrador o dueño del recinto deportivo para solicitar tu transferencia manual por el monto total indicado arriba.
                            </Text>
                        </View>
                    </View>

                    {/* BUTTON ACTIONS */}
                    <View style={{ marginTop: 35, gap: 15 }}>
                        <TouchableOpacity
                            onPress={async () => {
                                if (!booking) return;
                                const shareText = `*COMPROBANTE DE DEVOLUCIÓN DE PAGO - MVP SPORTS*\n\n` +
                                    `Estimado Administrador de *${booking?.tenantName}*,\n\n` +
                                    `Presento el ticket oficial de solicitud de reembolso debido a una reversa automática fallida de Transbank. A continuación se detallan los datos de la transacción para su validación manual:\n\n` +
                                    `• *Código de Validación:* MVP-REFUND-${bookingId?.toUpperCase()}\n` +
                                    `• *ID de Reserva:* ${bookingId}\n` +
                                    `• *Jugador:* ${booking?.clientName}\n` +
                                    `• *Cancha:* ${booking?.courtName}\n` +
                                    `• *Fecha/Hora Reserva:* ${displayDate} a las ${booking?.startTime} HRS\n` +
                                    `• *Monto a Reembolsar:* $${Number(booking?.totalPrice || 0).toLocaleString('es-CL')} CLP\n` +
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
                                height: 70, 
                                borderRadius: 22, 
                                backgroundColor: '#25D366', 
                                flexDirection: 'row', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                shadowColor: '#25D366', 
                                shadowOpacity: 0.25, 
                                shadowRadius: 15, 
                                elevation: 8 
                            }}
                        >
                            <Share2 color="white" size={18} style={{ marginRight: 10 }} />
                            <Text style={{ color: 'white', fontWeight: '900', fontSize: 14, textTransform: 'uppercase', letterSpacing: 1 }}>COMPARTIR COMPROBANTE</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => router.replace('/(player)/reservas')}
                            style={{ 
                                height: 70, 
                                borderRadius: 22, 
                                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9', 
                                flexDirection: 'row', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                borderWidth: 1,
                                borderColor: C.border
                            }}
                        >
                            <Calendar color={C.sub} size={18} style={{ marginRight: 10 }} />
                            <Text style={{ color: C.text, fontWeight: '900', fontSize: 14, textTransform: 'uppercase', letterSpacing: 1 }}>Ir a mis Reservas</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

                {/* HERO SECTION DNA */}
                <View style={{ height: 240 }}>
                    <LinearGradient 
                        colors={heroColors as [string, string, string]} 
                        style={StyleSheet.absoluteFill}
                    />
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 20 }}>
                        <View style={{ width: 80, height: 80, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }}>
                            <HeroIcon color="white" size={40} />
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
                                         <View style={{ 
                                             backgroundColor: (booking?.paymentStatus as any) === 'refunded' ? '#10b98115' : ((booking?.paymentStatus as any) === 'refund_failed' ? '#ef444415' : (booking?.paymentStatus === 'paid' ? '#10b98115' : '#f59e0b15')), 
                                             paddingHorizontal: 10, 
                                             paddingVertical: 4, 
                                             borderRadius: 6 
                                         }}>
                                             <Text style={{ 
                                                 color: (booking?.paymentStatus as any) === 'refunded' ? '#10b981' : ((booking?.paymentStatus as any) === 'refund_failed' ? '#ef4444' : (booking?.paymentStatus === 'paid' ? '#10b981' : '#f59e0b')), 
                                                 fontSize: 10, 
                                                 fontWeight: '900', 
                                                 textTransform: 'uppercase' 
                                             }}>
                                                 {(booking?.paymentStatus as any) === 'refunded' ? 'Devolución' : ((booking?.paymentStatus as any) === 'refund_failed' ? 'Devolución Fallida' : (booking?.paymentStatus === 'paid' ? 'Pagado' : 'Pendiente'))}
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
                                         <Text style={{ color: C.sub, fontSize: 11, fontWeight: '700' }}>
                                             {(booking?.paymentStatus as any) === 'refunded' ? 'MONTO REEMBOLSADO' : ((booking?.paymentStatus as any) === 'refund_failed' ? 'MONTO PENDIENTE MANUAL' : (booking?.paymentStatus === 'paid' ? 'MONTO PAGADO' : 'MONTO POR PAGAR'))}
                                         </Text>
                                         <Text style={{ 
                                             color: (booking?.paymentStatus as any) === 'refunded' ? '#10b981' : ((booking?.paymentStatus as any) === 'refund_failed' ? '#ef4444' : (booking?.paymentStatus === 'paid' ? activeColor : '#f59e0b')), 
                                             fontSize: 11, 
                                             fontWeight: '900' 
                                         }}>
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

                            {/* AVISO REEMBOLSO FALLIDO */}
                            {isRefundFailed && (
                                <View style={{ marginTop: 10, padding: 20, backgroundColor: '#ef444410', borderRadius: 25, borderWidth: 1, borderColor: '#ef444430', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                    <AlertCircle color="#ef4444" size={20} />
                                    <Text style={{ color: '#ef4444', fontSize: 11, fontWeight: '800', flex: 1, textTransform: 'uppercase', letterSpacing: 0.5, lineHeight: 14 }}>
                                        Reversa Transbank automática fallida. Solicita tu devolución manual al administrador del recinto.
                                    </Text>
                                </View>
                            )}
                        </View>
                    </ViewShot>


                    {/* ACTIONS DNA */}
                    <View style={{ marginTop: 35, gap: 15 }}>
                        {isRefundFailed && (
                            <TouchableOpacity 
                                onPress={() => setShowClaimModal(true)} 
                                style={{ 
                                    height: 75, 
                                    borderRadius: 25, 
                                    backgroundColor: '#ef4444', 
                                    flexDirection: 'row', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    shadowColor: '#ef4444', 
                                    shadowOpacity: 0.3, 
                                    shadowRadius: 15, 
                                    elevation: 8 
                                }}
                            >
                                <Receipt color="white" size={20} style={{ marginRight: 15 }} />
                                <Text style={{ color: 'white', fontWeight: '900', fontSize: 16, textTransform: 'uppercase', letterSpacing: 1 }}>Comprobante Devolución</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity 
                            onPress={() => router.replace('/(player)/reservas')} 
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

            {/* MODAL COMPROBANTE OFICIAL DE RECLAMO / DEVOLUCIÓN MANUAL */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={showClaimModal}
                onRequestClose={() => setShowClaimModal(false)}
            >
                <View style={{ flex: 1, backgroundColor: 'rgba(2, 6, 23, 0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                    <View style={{ width: '100%', maxWidth: 400, backgroundColor: isDark ? '#0F172A' : '#FFFFFF', borderRadius: 35, borderWidth: 1, borderColor: isDark ? '#1E293B' : '#E2E8F0', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 30, elevation: 20 }}>
                        
                        {/* HEADER */}
                        <View style={{ padding: 25, backgroundColor: '#ef4444', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                <Receipt color="white" size={24} />
                                <View>
                                    <Text style={{ color: 'white', fontSize: 13, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.5 }}>MVP SPORTS CHILE</Text>
                                    <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 9, fontWeight: '800', textTransform: 'uppercase' }}>Solicitud de Reembolso</Text>
                                </View>
                            </View>
                            <TouchableOpacity onPress={() => setShowClaimModal(false)} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                                <X color="white" size={18} />
                            </TouchableOpacity>
                        </View>

                        {/* BODY */}
                        <ScrollView contentContainerStyle={{ padding: 25, gap: 20 }}>
                            <View style={{ alignItems: 'center', marginVertical: 5 }}>
                                <View style={{ paddingHorizontal: 15, paddingVertical: 6, borderRadius: 10, backgroundColor: '#ef444415', borderWidth: 1, borderColor: '#ef444430' }}>
                                    <Text style={{ color: '#ef4444', fontSize: 9, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' }}>
                                        REVERSA AUTOMÁTICA RECHAZADA
                                    </Text>
                                </View>
                                <Text style={{ color: isDark ? '#F8FAFC' : '#0F172A', fontSize: 26, fontWeight: '900', marginTop: 10 }}>
                                    ${Number(booking?.totalPrice || 0).toLocaleString('es-CL')}
                                </Text>
                                <Text style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 }}>
                                    Monto Pendiente de Reintegro Manual
                                </Text>
                            </View>

                            {/* VOUCHER DETAILS BLOCK */}
                            <View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#F8FAFC', padding: 20, borderRadius: 25, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.04)' : '#E2E8F0', gap: 12 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 10, fontWeight: '700' }}>JUGADOR</Text>
                                    <Text style={{ color: isDark ? '#F8FAFC' : '#0F172A', fontSize: 11, fontWeight: '900' }}>{booking?.clientName || '—'}</Text>
                                </View>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 10, fontWeight: '700' }}>RECINTO</Text>
                                    <Text style={{ color: isDark ? '#F8FAFC' : '#0F172A', fontSize: 11, fontWeight: '900' }}>{booking?.tenantName || '—'}</Text>
                                </View>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 10, fontWeight: '700' }}>CANCHA / DEPORTE</Text>
                                    <Text style={{ color: isDark ? '#F8FAFC' : '#0F172A', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' }}>{booking?.courtName} • {booking?.sport}</Text>
                                </View>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 10, fontWeight: '700' }}>FECHA RESERVA</Text>
                                    <Text style={{ color: isDark ? '#F8FAFC' : '#0F172A', fontSize: 11, fontWeight: '900' }}>{displayDate} • {booking?.startTime} HRS</Text>
                                </View>
                                <View style={{ height: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0', marginVertical: 4 }} />
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 10, fontWeight: '700' }}>ID DE RESERVA</Text>
                                    <Text style={{ color: isDark ? '#F8FAFC' : '#0F172A', fontSize: 10, fontWeight: '900', letterSpacing: 0.2 }}>{bookingId}</Text>
                                </View>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 10, fontWeight: '700' }}>MEDIO PAGO ORIG.</Text>
                                    <Text style={{ color: isDark ? '#F8FAFC' : '#0F172A', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' }}>TARJETA ONLINE (WEBPAY)</Text>
                                </View>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text style={{ color: isDark ? '#ef4444' : '#b91c1c', fontSize: 10, fontWeight: '800' }}>CÓDIGO VALIDACIÓN</Text>
                                    <Text style={{ color: isDark ? '#ef4444' : '#b91c1c', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 }}>
                                        MVP-REFUND-{bookingId?.toUpperCase() || '—'}
                                    </Text>
                                </View>
                            </View>

                            {/* EXPLANATORY BANK LEGAL TEXT */}
                            <View style={{ gap: 8 }}>
                                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                                    <FileText color="#ef4444" size={16} style={{ marginTop: 2 }} />
                                    <Text style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 10, fontWeight: '800', lineHeight: 14, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                        Instrucciones de Devolución
                                    </Text>
                                </View>
                                <Text style={{ color: isDark ? '#64748B' : '#94A3B8', fontSize: 9, fontWeight: '600', lineHeight: 13 }}>
                                    Este comprobante oficial certifica que la reserva fue cancelada bajo el reglamento de anticipación del recinto. Debido a una interrupción en la pasarela automatizada de Transbank, la reversa electrónica directa no pudo ser procesada. El administrador del recinto deberá realizar una transferencia electrónica manual al jugador para liquidar este reintegro, utilizando el ID de Reserva para la validación interna en su panel.
                                </Text>
                            </View>
                        </ScrollView>

                        {/* BOTTOM SHARE ACTIONS */}
                        <View style={{ padding: 25, borderTopWidth: 1, borderTopColor: isDark ? '#1E293B' : '#E2E8F0', flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity
                                onPress={async () => {
                                    if (!booking) return;
                                    const shareText = `*COMPROBANTE DE DEVOLUCIÓN DE PAGO - MVP SPORTS*\n\n` +
                                        `Estimado Administrador de *${booking?.tenantName}*,\n\n` +
                                        `Presento el ticket oficial de solicitud de reembolso debido a una reversa automática fallida de Transbank. A continuación se detallan los datos de la transacción para su validación manual:\n\n` +
                                        `• *Código de Validación:* MVP-REFUND-${bookingId?.toUpperCase()}\n` +
                                        `• *ID de Reserva:* ${bookingId}\n` +
                                        `• *Jugador:* ${booking?.clientName}\n` +
                                        `• *Cancha:* ${booking?.courtName}\n` +
                                        `• *Fecha/Hora Reserva:* ${displayDate} a las ${booking?.startTime} HRS\n` +
                                        `• *Monto a Reembolsar:* $${Number(booking?.totalPrice || 0).toLocaleString('es-CL')} CLP\n` +
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
                                style={{ flex: 1, height: 60, borderRadius: 20, backgroundColor: '#25D366', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, shadowColor: '#25D366', shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 }}
                            >
                                <Share2 color="white" size={18} />
                                <Text style={{ color: 'white', fontSize: 13, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 }}>COMPARTIR</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => setShowClaimModal(false)}
                                style={{ height: 60, paddingHorizontal: 25, borderRadius: 20, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#E2E8F0' }}
                            >
                                <Text style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 13, fontWeight: '900', textTransform: 'uppercase' }}>Cerrar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const Check = ({ color, size }: any) => (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <CheckCircle color={color} size={size} />
    </View>
);
