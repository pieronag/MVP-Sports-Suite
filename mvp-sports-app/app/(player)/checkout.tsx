import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StatusBar, ActivityIndicator, BackHandler, StyleSheet, Dimensions, Modal } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, CreditCard, ShieldCheck, Zap, Calendar, Clock, Trophy, MapPin, Users, CheckCircle2, XCircle, X, Plus } from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import { TextInput } from 'react-native';
import { couponService, Coupon } from '../../services/couponService';
import { useAuth } from '../../store/useAuth';
import { bookingService } from '../../services/bookingService';
import { walletService } from '../../services/walletService';
import { teamService, Team } from '../../services/teamService';
import { tournamentService } from '../../services/tournamentService';
import { venueService, Tenant } from '../../services/venueService';
import { db } from '../../services/firebase';
import { collection, addDoc, serverTimestamp, Timestamp, deleteDoc, doc } from 'firebase/firestore';

const { width } = Dimensions.get('window');

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

const DetailRow = ({ icon, label, value, C }: any) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {icon}
            <Text style={{ color: C.sub, fontSize: 10, fontWeight: '900', marginLeft: 10, letterSpacing: 0.5 }}>{label}</Text>
        </View>
        <Text style={{ color: C.text, fontSize: 12, fontWeight: '900' }}>{value}</Text>
    </View>
);

const SectionLabel = ({ label }: { label: string }) => (
    <Text style={{ color: '#10b981', fontWeight: '900', fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, marginHorizontal: 40, marginTop: 30, marginBottom: 15 }}>{label}</Text>
);

export default function CheckoutScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { theme, user, profile } = useAuth();
    const isDark = theme === 'dark';
    const C = isDark ? COLORS.dark : COLORS.light;
    
    const [processing, setProcessing] = useState(false);
    const [customAlert, setCustomAlert] = useState<{
        visible: boolean;
        title: string;
        message: string;
        type: 'success' | 'error';
        onClose?: () => void;
    }>({ visible: false, title: '', message: '', type: 'success' });
    const [userTeams, setUserTeams] = useState<Team[]>([]);
    const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<'card' | 'venue'>('venue');
    const [showWebView, setShowWebView] = useState(false);
    const [tenant, setTenant] = useState<Tenant | null>(null);
    const [loadingTenant, setLoadingTenant] = useState(true);
    const [webpayData, setWebpayData] = useState<any>(null);
    const [isNewBookingCreated, setIsNewBookingCreated] = useState(false);
    const [pendingBooking, setPendingBooking] = useState<any>(null);
    const [hasCashNoShow, setHasCashNoShow] = useState(false);
    const [couponInput, setCouponInput] = useState('');
    const [validatingCoupon, setValidatingCoupon] = useState(false);
    const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);

    // Parámetros dinámicos (pueden ser de Reserva o de Torneo)
    const { 
        type, // 'booking' | 'tournament'
        tenantId, tenantName, courtId, courtName, price, date, startTime, sport, sportColor,
        tournamentId, teamId, teamName, tournamentName,
        venueName, location, category, tournamentType,
        bookingId, requireOnlinePayment
    } = params;

    const activeColor = (sportColor as string) || '#10b981';
    const isTournament = type === 'tournament';

    // 1. CARGAR CONFIGURACIÓN DEL DUEÑO/TENANT PARA EL CHECKOUT
    useEffect(() => {
        if (tenantId) {
            setLoadingTenant(true);
            venueService.getVenueById(tenantId as string).then((data) => {
                setTenant(data);
                setLoadingTenant(false);
            }).catch((err) => {
                console.error("Error loading tenant in checkout:", err);
                setLoadingTenant(false);
            });
        } else {
            setLoadingTenant(false);
        }
    }, [tenantId]);

    // 2. DETECTAR SI LA API DE PAGO ESTÁ CONFIGURADA Y ACTIVA
    const isPaymentApiActive = 
        (tenant as any)?.paymentApiActive === true || 
        (tenant as any)?.isPaymentApiActive === true || 
        ((tenant as any)?.transbankCommerceCode !== undefined && (tenant as any)?.transbankCommerceCode !== '') ||
        ((tenant as any)?.availableGateways?.webpay === true || (tenant as any)?.availableGateways?.mercadoPago === true);

    // Si la API del recinto no está configurada, forzar pago en recinto
    useEffect(() => {
        if (requireOnlinePayment === 'true') {
            setPaymentMethod('card');
        } else if (!loadingTenant && !isPaymentApiActive && !hasCashNoShow) {
            setPaymentMethod('venue');
        }
    }, [loadingTenant, isPaymentApiActive, hasCashNoShow, requireOnlinePayment]);

    useEffect(() => {
        if (user) {
            teamService.getUserTeams(user.uid).then(teams => {
                const normalizeSport = (s: string) => s ? s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : '';
                const filtered = teams.filter(t => normalizeSport(t.sport) === normalizeSport(sport as string));
                setUserTeams(filtered);
            });
        }
    }, [user]);

    useEffect(() => {
        if (user?.uid) {
            bookingService.checkUserHasCashNoShow(user.uid).then(banned => {
                setHasCashNoShow(banned);
                if (banned) {
                    setPaymentMethod('card');
                }
            });
        }
    }, [user?.uid]);

    const handleApplyCoupon = async () => {
        if (!couponInput.trim()) return;
        setValidatingCoupon(true);
        try {
            const coupon = await couponService.validateCoupon(couponInput, tenantId as string, Number(price));
            setAppliedCoupon(coupon);
            setCustomAlert({
                visible: true,
                title: 'CUPÓN APLICADO',
                message: `Se ha aplicado un ${coupon.discount}% de descuento exitosamente.`,
                type: 'success'
            });
        } catch (error: any) {
            setAppliedCoupon(null);
            setCustomAlert({
                visible: true,
                title: 'CUPÓN INVÁLIDO',
                message: error.message,
                type: 'error'
            });
        } finally {
            setValidatingCoupon(false);
        }
    };

    const handleConfirm = async () => {
        if (!user) return;

        if (hasCashNoShow && !isPaymentApiActive) {
            setCustomAlert({
                visible: true,
                title: 'RESERVA NO PERMITIDA',
                message: 'ESTE RECINTO SÓLO ACEPTA PAGO EN EFECTIVO. DEBIDO A TUS INASISTENCIAS PREVIAS (NO-SHOW), TU OPCIÓN DE PAGO EN RECINTO ESTÁ DESHABILITADA.',
                type: 'error'
            });
            return;
        }

        setProcessing(true);
        try {
            const basePriceNum = Number(price);
            const discountAmount = appliedCoupon ? (basePriceNum * appliedCoupon.discount / 100) : 0;
            const priceNum = basePriceNum - discountAmount;
            const userProfile = profile as any;
            const clientName = userProfile?.displayName || userProfile?.fullName || user.displayName || 'Jugador MVP';

            if (isTournament) {
                // FLUJO DE TORNEO
                if (!tournamentId || !teamId) throw new Error("Datos de torneo incompletos.");
                
                if (paymentMethod === 'card') {
                    // PAGO ONLINE EXTERNO DIRECTO PARA TORNEO
                    const buyOrder = `TOR-${Date.now()}`;
                    const webpayRes = await walletService.createWebpayTransaction(
                        tournamentId as string,
                        tenantId as string || 'system',
                        priceNum,
                        buyOrder
                    );

                    setWebpayData({
                        url: webpayRes.url,
                        token: webpayRes.token,
                        tournamentId: tournamentId as string,
                        teamId: teamId as string,
                        teamName: teamName as string,
                        price: priceNum
                    });
                    setShowWebView(true);
                } else {
                    // PAGO EN EL RECINTO PARA TORNEO
                    await tournamentService.registerTeamInTournament(
                        tournamentId as string,
                        { id: teamId as string, name: teamName as string },
                        user.uid,
                        clientName,
                        priceNum
                    );

                    setCustomAlert({
                        visible: true,
                        title: '¡INSCRIPCIÓN EXITOSA!',
                        message: `TU EQUIPO ${teamName?.toString().toUpperCase()} HA SIDO INSCRITO EN EL TORNEO ${(tournamentName as string).toUpperCase()}.`,
                        type: 'success',
                        onClose: () => router.back()
                    });
                }

            } else {
                // FLUJO DE RESERVA
                const [startH, startM] = (startTime as string).split(':').map(Number);
                const endH = startH + 1;
                const endTime = `${endH.toString().padStart(2, '0')}:${(startM || 0).toString().padStart(2, '0')}`;
                
                const bookingDate = new Date(`${date}T00:00:00`);
                bookingDate.setHours(startH, startM || 0, 0, 0);
                if (startH < 6) bookingDate.setDate(bookingDate.getDate() + 1);

                const bookingData: any = {
                    userId: user.uid,
                    tenantId: tenantId as string,
                    tenantName: tenantName as string || 'Recinto',
                    courtId: courtId as string,
                    courtName: courtName as string || 'Cancha',
                    clientName: clientName,
                    clientPhone: userProfile?.phone || '+56900000000',
                    date: Timestamp.fromDate(bookingDate),
                    startTime: startTime as string,
                    endTime: endTime,
                    totalPrice: priceNum,
                    originalPrice: basePriceNum,
                    couponCode: appliedCoupon ? appliedCoupon.code : null,
                    discountApplied: appliedCoupon ? appliedCoupon.discount : 0,
                    status: 'confirmed', 
                    paymentStatus: 'pending',
                    source: 'mobile_app',
                    createdBy: user.email || user.uid,
                    paymentMethod: paymentMethod === 'card' ? 'card' : 'cash',
                    sport: sport as string || 'futbol',
                    createdAt: Timestamp.now()
                };

                if (selectedTeamId) {
                    bookingData.teamId = selectedTeamId;
                }

                let finalBookingId = bookingId as string;

                if (paymentMethod === 'card') {
                    // RESERVA PAGO ONLINE: No se crea el documento en Firestore antes de que el pago esté confirmado.
                    // Generamos un ID de documento único localmente en memoria
                    if (!finalBookingId) {
                        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
                        let generatedId = '';
                        for (let i = 0; i < 6; i++) {
                            generatedId += chars.charAt(Math.floor(Math.random() * chars.length));
                        }
                        finalBookingId = generatedId;
                        setIsNewBookingCreated(true);
                    } else {
                        setIsNewBookingCreated(false);
                    }

                    setPendingBooking(bookingData);

                    // AHORA LLAMAMOS AL SISTEMA EXTERNO PARA INICIAR EL PAGO, PASANDO EL bookingData COMPLETO
                    const buyOrder = `ORD-${Date.now()}`;
                    const webpayRes = await walletService.createWebpayTransaction(
                        finalBookingId,
                        tenantId as string,
                        priceNum,
                        buyOrder,
                        bookingData // Enviamos la data completa para crear la reserva solo al confirmarse el pago
                    );

                    setWebpayData({
                        url: webpayRes.url,
                        token: webpayRes.token,
                        bookingId: finalBookingId
                    });
                    setShowWebView(true);
                } else {
                    // PAGO EN RECINTO: REGISTRO DIRECTO Y RUTA DE TICKET
                    bookingData.paymentStatus = 'pending';
                    bookingData.paymentMethod = 'cash';
                    if (finalBookingId) {
                        await bookingService.updateBooking(finalBookingId, bookingData);
                    } else {
                        finalBookingId = await bookingService.createBooking(bookingData);
                    }

                    if (appliedCoupon) {
                        await couponService.incrementCouponUsage(appliedCoupon.id);
                    }

                    router.replace({
                        pathname: '/ticket',
                        params: { 
                            bookingId: finalBookingId, sport, sportColor, 
                            tenantName: (tenantName as string || '').toUpperCase(), 
                            courtName: (courtName as string || '').toUpperCase(), 
                            startTime, date, price: priceNum.toString() 
                        }
                    } as any);
                }
            }

        } catch (error: any) {
            setCustomAlert({
                visible: true,
                title: 'ERROR DE PAGO',
                message: (error.message || 'ERROR PROCESANDO TRANSACCIÓN.').toUpperCase(),
                type: 'error'
            });
        } finally {
            setProcessing(false);
        }
    };

    // handleAddCard removido dado que el enrolamiento de tarjetas físicas fue descontinuado.

    if (loadingTenant) {
        return (
            <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color={activeColor} size="large" />
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

            <View style={{ paddingTop: 60, paddingBottom: 20, paddingHorizontal: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.card }}>
                <TouchableOpacity onPress={() => router.back()} style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}>
                    <ChevronLeft color={activeColor} size={24} />
                </TouchableOpacity>
                <Text style={{ color: C.text, fontSize: 20, fontWeight: '900', textTransform: 'uppercase', letterSpacing: -1 }}>{isTournament ? 'Inscripción Torneo' : 'Finalizar Reserva'}</Text>
                <View style={{ width: 44 }} /> 
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 150 }}>
                
                <SectionLabel label={isTournament ? "Detalles del Torneo" : "Resumen de Turno"} />
                <View style={{ marginHorizontal: 30, backgroundColor: C.card, borderRadius: 35, padding: 30, borderWidth: 1, borderColor: C.border, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 20 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 25 }}>
                        <View style={{ width: 50, height: 50, borderRadius: 15, backgroundColor: activeColor + '15', alignItems: 'center', justifyContent: 'center' }}>
                            {isTournament ? <Trophy color={activeColor} size={24} /> : <Calendar color={activeColor} size={24} />}
                        </View>
                        <View style={{ marginLeft: 15, flex: 1 }}>
                            <Text style={{ color: C.text, fontSize: 18, fontWeight: '900', textTransform: 'uppercase' }} numberOfLines={1}>
                                {isTournament ? (tournamentName as string).toUpperCase() : (tenantName as string).toUpperCase()}
                            </Text>
                            <Text style={{ color: C.sub, fontSize: 10, fontWeight: '800', letterSpacing: 1 }}>
                                {isTournament ? `INSCRIPCIÓN DE EQUIPO` : `${(sport as string).toUpperCase()} • ${(courtName as string).toUpperCase()}`}
                            </Text>
                        </View>
                    </View>

                    <View style={{ gap: 15 }}>
                        {isTournament ? (
                            <>
                                <DetailRow icon={<Users size={14} color={C.sub} />} label="EQUIPO" value={(teamName as string || '').toUpperCase()} C={C} />
                                <DetailRow icon={<Trophy size={14} color={C.sub} />} label="MODALIDAD" value={(tournamentType as string || 'LIGA').toUpperCase()} C={C} />
                                <DetailRow icon={<Zap size={14} color={C.sub} />} label="CATEGORÍA" value={(category as string || 'LIBRE').toUpperCase()} C={C} />
                                <DetailRow icon={<MapPin size={14} color={C.sub} />} label="RECINTO" value={(venueName as string || 'POR CONFIRMAR').toUpperCase()} C={C} />
                                <DetailRow icon={<ShieldCheck size={14} color={C.sub} />} label="UBICACIÓN" value={(location as string || 'POR CONFIRMAR').toUpperCase()} C={C} />
                            </>
                        ) : (
                            <>
                                <DetailRow icon={<Calendar size={14} color={C.sub} />} label="FECHA" value={new Date(date as string + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })} C={C} />
                                <DetailRow icon={<Clock size={14} color={C.sub} />} label="HORARIO" value={`${startTime} HRS`} C={C} />
                                <DetailRow icon={<MapPin size={14} color={C.sub} />} label="RECINTO" value={tenantName as string} C={C} />
                            </>
                        )}
                    </View>

                    <View style={{ marginTop: 25, paddingTop: 25, borderTopWidth: 1, borderTopColor: C.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View>
                            <Text style={{ color: C.sub, fontSize: 9, fontWeight: '900', letterSpacing: 1 }}>{appliedCoupon ? 'SUBTOTAL' : 'COSTO TOTAL'}</Text>
                            <Text style={{ color: appliedCoupon ? C.sub : C.text, fontSize: appliedCoupon ? 20 : 32, fontWeight: '900', letterSpacing: -1, textDecorationLine: appliedCoupon ? 'line-through' : 'none' }}>
                                ${Number(price).toLocaleString('es-CL')}
                            </Text>
                            {appliedCoupon && (
                                <>
                                    <Text style={{ color: activeColor, fontSize: 10, fontWeight: '900', marginTop: 2 }}>DESCUENTO ({appliedCoupon.discount}%)</Text>
                                    <Text style={{ color: C.text, fontSize: 32, fontWeight: '900', letterSpacing: -1 }}>
                                        ${(Number(price) - (Number(price) * appliedCoupon.discount / 100)).toLocaleString('es-CL')}
                                    </Text>
                                </>
                            )}
                        </View>
                        <View style={{ backgroundColor: activeColor + '10', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}>
                            <Text style={{ color: activeColor, fontWeight: '900', fontSize: 10 }}>MVP</Text>
                        </View>
                    </View>
                </View>

                {/* CÓDIGO PROMOCIONAL */}
                <SectionLabel label="CÓDIGO PROMOCIONAL" />
                <View style={{ marginHorizontal: 30, flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1, backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: appliedCoupon ? '#10b981' : C.border, paddingHorizontal: 16, justifyContent: 'center', height: 50 }}>
                        <TextInput 
                            placeholder="Ej. MVP2026"
                            placeholderTextColor={C.sub}
                            value={couponInput}
                            onChangeText={(t) => setCouponInput(t.toUpperCase())}
                            editable={!appliedCoupon && !validatingCoupon}
                            style={{ color: appliedCoupon ? '#10b981' : C.text, fontSize: 13, fontWeight: '900', letterSpacing: 1 }}
                        />
                    </View>
                    {appliedCoupon ? (
                        <TouchableOpacity 
                            onPress={() => setAppliedCoupon(null)}
                            style={{ backgroundColor: '#ef4444', width: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center', height: 50 }}
                        >
                            <XCircle color="white" size={20} />
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity 
                            onPress={handleApplyCoupon}
                            disabled={validatingCoupon || !couponInput.trim()}
                            style={{ backgroundColor: validatingCoupon || !couponInput.trim() ? C.border : activeColor, paddingHorizontal: 20, borderRadius: 16, justifyContent: 'center', alignItems: 'center', height: 50 }}
                        >
                            {validatingCoupon ? <ActivityIndicator color="white" size="small" /> : <Text style={{ color: 'white', fontWeight: '900', fontSize: 11 }}>APLICAR</Text>}
                        </TouchableOpacity>
                    )}
                </View>

                {/* SELECCIÓN DE EQUIPO (SOLO PARA RESERVAS) */}
                {!isTournament && (
                    <View style={{ marginHorizontal: 30, marginTop: 30 }}>
                        <Text style={{ color: C.text, fontSize: 16, fontWeight: '900', marginBottom: 15 }}>¿JUEGAS CON UN EQUIPO?</Text>
                        <View style={{ gap: 10 }}>
                            <TouchableOpacity 
                                onPress={() => setSelectedTeamId(null)}
                                style={{ 
                                    height: 70, 
                                    borderRadius: 20, 
                                    backgroundColor: selectedTeamId === null ? activeColor + '20' : C.card,
                                    borderWidth: 2,
                                    borderColor: selectedTeamId === null ? activeColor : C.border,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    paddingHorizontal: 20
                                }}
                            >
                                <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
                                    <Users color={selectedTeamId === null ? activeColor : C.sub} size={20} />
                                </View>
                                <Text style={{ color: C.text, fontSize: 14, fontWeight: '800', marginLeft: 15, flex: 1 }}>Partido Amistoso (Sin Equipo)</Text>
                                {selectedTeamId === null && <CheckCircle2 color={activeColor} size={20} />}
                            </TouchableOpacity>

                            {userTeams.map((team) => (
                                <TouchableOpacity 
                                    key={team.id}
                                    onPress={() => setSelectedTeamId(team.id)}
                                    style={{ 
                                        height: 70, 
                                        borderRadius: 20, 
                                        backgroundColor: selectedTeamId === team.id ? activeColor + '20' : C.card,
                                        borderWidth: 2,
                                        borderColor: selectedTeamId === team.id ? activeColor : C.border,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        paddingHorizontal: 20
                                    }}
                                >
                                    <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
                                        <Trophy color={selectedTeamId === team.id ? activeColor : C.sub} size={20} />
                                    </View>
                                    <Text style={{ color: C.text, fontSize: 14, fontWeight: '800', marginLeft: 15, flex: 1 }}>{team.name}</Text>
                                    {selectedTeamId === team.id && <CheckCircle2 color={activeColor} size={20} />}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}

                {/* MÉTODO DE PAGO */}
                <SectionLabel label="Método de Pago" />

                {hasCashNoShow && (
                    <View style={{ marginHorizontal: 30, marginBottom: 15, backgroundColor: '#ef444415', padding: 15, borderRadius: 15, borderWidth: 1, borderColor: '#ef444430', flexDirection: 'row', alignItems: 'center' }}>
                        <XCircle color="#ef4444" size={20} />
                        <Text style={{ flex: 1, marginLeft: 10, color: '#ef4444', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', lineHeight: 14 }}>
                            Opción de pago en recinto deshabilitada debido a inasistencias previas. Sólo pago online.
                        </Text>
                    </View>
                )}

                <View style={{ marginHorizontal: 30, gap: 12 }}>
                    {/* OPCIÓN 1: PAGO EN RECINTO */}
                    {!hasCashNoShow && requireOnlinePayment !== 'true' && (
                        <TouchableOpacity 
                            onPress={() => setPaymentMethod('venue')}
                            style={{ 
                                backgroundColor: C.card, borderRadius: 25, padding: 20, 
                                borderWidth: 2, borderColor: paymentMethod === 'venue' ? activeColor : C.border,
                                flexDirection: 'row', alignItems: 'center'
                            }}
                        >
                            <View style={{ width: 45, height: 45, borderRadius: 12, backgroundColor: paymentMethod === 'venue' ? activeColor + '15' : C.bg, alignItems: 'center', justifyContent: 'center' }}>
                                <MapPin color={paymentMethod === 'venue' ? activeColor : C.sub} size={22} />
                            </View>
                            <View style={{ marginLeft: 15, flex: 1 }}>
                                <Text style={{ color: C.text, fontSize: 15, fontWeight: '900', textTransform: 'uppercase' }}>Pagar en el Recinto</Text>
                                <Text style={{ color: C.sub, fontSize: 10, fontWeight: '700' }}>PAGA AL LLEGAR (EFECTIVO/TRANSF)</Text>
                            </View>
                            {paymentMethod === 'venue' && <CheckCircle2 color={activeColor} size={20} />}
                        </TouchableOpacity>
                    )}

                    {/* OPCIÓN 2: PAGO ONLINE DIRECTO (Con llave de configuración) */}
                    {isPaymentApiActive && (
                        <TouchableOpacity 
                            onPress={() => setPaymentMethod('card')}
                            style={{ 
                                backgroundColor: C.card, borderRadius: 25, padding: 20, 
                                borderWidth: 2, borderColor: paymentMethod === 'card' ? activeColor : C.border,
                                flexDirection: 'row', alignItems: 'center'
                            }}
                        >
                            <View style={{ width: 45, height: 45, borderRadius: 12, backgroundColor: paymentMethod === 'card' ? activeColor + '15' : C.bg, alignItems: 'center', justifyContent: 'center' }}>
                                <CreditCard color={paymentMethod === 'card' ? activeColor : C.sub} size={22} />
                            </View>
                            <View style={{ marginLeft: 15, flex: 1 }}>
                                <Text style={{ color: C.text, fontSize: 15, fontWeight: '900', textTransform: 'uppercase' }}>Pago Online con Tarjeta</Text>
                                <Text style={{ color: activeColor, fontSize: 10, fontWeight: '700' }}>PAGO SEGURO CON WEBPAY / REDCOMPRA</Text>
                            </View>
                            {paymentMethod === 'card' && <CheckCircle2 color={activeColor} size={20} />}
                        </TouchableOpacity>
                    )}
                </View>

                <View style={{ marginTop: 40, alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', opacity: 0.6 }}>
                        <ShieldCheck color={activeColor} size={14} />
                        <Text style={{ color: C.sub, fontSize: 10, fontWeight: '900', marginLeft: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Transacción Protegida PCI-DSS</Text>
                    </View>
                </View>
            </ScrollView>

            {/* MODAL DE ALERTA ELITE */}
            <Modal visible={customAlert.visible} transparent animationType="fade">
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
                    <View style={{ backgroundColor: C.card, borderRadius: 35, padding: 35, alignItems: 'center', width: '100%', borderWidth: 1, borderColor: C.border }}>
                        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: (customAlert.type === 'success' ? '#10b981' : '#ef4444') + '15', alignItems: 'center', justifyContent: 'center', marginBottom: 25 }}>
                            {customAlert.type === 'success' ? <CheckCircle2 color="#10b981" size={40} /> : <XCircle color="#ef4444" size={40} />}
                        </View>
                        <Text style={{ color: C.text, fontSize: 20, fontWeight: '900', textAlign: 'center', marginBottom: 10 }}>{customAlert.title}</Text>
                        <Text style={{ color: C.sub, fontSize: 13, fontWeight: '600', textAlign: 'center', marginBottom: 30, lineHeight: 20 }}>{customAlert.message}</Text>

                        <TouchableOpacity 
                            onPress={() => {
                                setCustomAlert({ ...customAlert, visible: false });
                                if (customAlert.onClose) customAlert.onClose();
                            }}
                            style={{ backgroundColor: customAlert.type === 'success' ? '#10b981' : '#ef4444', height: 60, width: '100%', borderRadius: 18, alignItems: 'center', justifyContent: 'center', shadowColor: (customAlert.type === 'success' ? '#10b981' : '#ef4444'), shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 }}
                        >
                            <Text style={{ color: 'white', fontWeight: '900', fontSize: 13 }}>{customAlert.type === 'success' ? 'ENTENDIDO' : 'REINTENTAR'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <View style={{ position: 'absolute', bottom: 40, left: 30, right: 30 }}>
                <TouchableOpacity 
                    onPress={handleConfirm}
                    disabled={processing}
                    style={{ 
                        height: 65, backgroundColor: activeColor, borderRadius: 22, 
                        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', 
                        shadowColor: activeColor, shadowOpacity: 0.3, shadowRadius: 15, elevation: 5
                    }}
                >
                    {processing ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <>
                            <Zap color="white" size={20} />
                            <Text style={{ color: 'white', fontWeight: '900', fontSize: 14, marginLeft: 15, textTransform: 'uppercase', letterSpacing: 1.5 }}>
                                {isTournament ? 'Confirmar Inscripción' : 'Confirmar Reserva'}
                            </Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

            {/* WEBVIEW TRANSBANK DIRECT ONLINE PAYMENT */}
            <Modal 
                visible={showWebView} 
                animationType="slide"
                onRequestClose={async () => {
                    setShowWebView(false);
                    if (webpayData?.bookingId && !isTournament && isNewBookingCreated) {
                        try {
                            await deleteDoc(doc(db, 'bookings', webpayData.bookingId));
                        } catch (e) {
                            console.error("Error deleting back-closed booking:", e);
                        }
                    }
                }}
            >
                <View style={{ flex: 1, backgroundColor: C.bg }}>
                    <View style={{ paddingTop: 60, paddingBottom: 20, paddingHorizontal: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.card }}>
                        <Text style={{ fontSize: 18, fontWeight: '900', color: C.text, letterSpacing: -0.5 }}>PAGO ONLINE SEGURO</Text>
                        <TouchableOpacity onPress={async () => {
                            setShowWebView(false);
                            if (webpayData?.bookingId && !isTournament && isNewBookingCreated) {
                                try {
                                    await deleteDoc(doc(db, 'bookings', webpayData.bookingId));
                                } catch (e) {
                                    console.error("Error deleting closed booking:", e);
                                }
                            }
                        }}>
                            <X color={C.text} size={24} />
                        </TouchableOpacity>
                    </View>
                    {webpayData && (
                        <WebView
                            source={{ uri: webpayData.url, method: 'POST', body: `token_ws=${webpayData.token}` }}
                            onNavigationStateChange={async (navState) => {
                                if (navState.url.includes('checkout/success')) {
                                    setShowWebView(false);
                                    if (!user) return;
                                    if (isTournament) {
                                        setProcessing(true);
                                        try {
                                            const priceNum = Number(price);
                                            const userProfile = profile as any;
                                            const clientName = userProfile?.displayName || userProfile?.fullName || user.displayName || 'Jugador MVP';
                                            
                                            await tournamentService.registerTeamInTournament(
                                                tournamentId as string,
                                                { id: teamId as string, name: teamName as string },
                                                user.uid,
                                                clientName,
                                                priceNum
                                            );
                                            
                                            setCustomAlert({
                                                visible: true,
                                                title: '¡INSCRIPCIÓN EXITOSA!',
                                                message: `TU EQUIPO ${teamName?.toString().toUpperCase()} HA SIDO INSCRITO EN EL TORNEO ${(tournamentName as string).toUpperCase()}.`,
                                                type: 'success',
                                                onClose: () => router.back()
                                            });
                                        } catch (err: any) {
                                            setCustomAlert({
                                                visible: true,
                                                title: 'ERROR INSCRIPCIÓN',
                                                message: 'PAGO APROBADO PERO HUBO UN ERROR AL REGISTRAR EL EQUIPO.',
                                                type: 'error'
                                            });
                                        } finally {
                                            setProcessing(false);
                                        }
                                    } else {
                                        // CREAR LA RESERVA AHORA EN FIRESTORE EN EL CLIENTE COMO CAPA DE SEGURIDAD
                                        try {
                                            const { doc: fsDoc, setDoc: fsSetDoc, serverTimestamp: fsServerTimestamp } = require('firebase/firestore');
                                            const finalData = {
                                                ...pendingBooking,
                                                paymentStatus: 'paid',
                                                status: 'confirmed',
                                                updatedAt: fsServerTimestamp()
                                            };
                                            await fsSetDoc(fsDoc(db, 'bookings', webpayData.bookingId), finalData);

                                            if (appliedCoupon) {
                                                await couponService.incrementCouponUsage(appliedCoupon.id);
                                            }
                                        } catch (err) {
                                            console.error("Error creating booking in success callback:", err);
                                        }

                                        setCustomAlert({
                                            visible: true,
                                            title: '¡RESERVA CONFIRMADA!',
                                            message: 'TU PAGO ONLINE HA SIDO PROCESADO Y TU RESERVA ESTÁ COMPLETADA.',
                                            type: 'success',
                                            onClose: () => {
                                                router.replace({
                                                    pathname: '/ticket',
                                                    params: { 
                                                        bookingId: webpayData.bookingId, sport, sportColor, 
                                                        tenantName: (tenantName as string || '').toUpperCase(), 
                                                        courtName: (courtName as string || '').toUpperCase(), 
                                                        startTime, date, price: price.toString() 
                                                    }
                                                } as any);
                                            }
                                        });
                                    }
                                } else if (navState.url.includes('checkout/error')) {
                                    setShowWebView(false);
                                    
                                    // Borrar la reserva si el pago falló o fue cancelado
                                    if (webpayData?.bookingId && !isTournament && isNewBookingCreated) {
                                        try {
                                            await deleteDoc(doc(db, 'bookings', webpayData.bookingId));
                                        } catch (e) {
                                            console.error("Error deleting failed booking:", e);
                                        }
                                    }
                                    
                                    setCustomAlert({ 
                                        visible: true, 
                                        title: 'PAGO CANCELADO', 
                                        message: 'EL PAGO ONLINE CON TARJETA FUE CANCELADO O RECHAZADO POR EL BANCO.', 
                                        type: 'error' 
                                    });
                                }
                            }}
                            style={{ flex: 1, backgroundColor: C.bg }}
                            containerStyle={{ backgroundColor: C.bg }}
                        />
                    )}
                </View>
            </Modal>
        </View>
    );
}
