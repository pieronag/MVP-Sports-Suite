import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StatusBar, ActivityIndicator, BackHandler, StyleSheet, Dimensions, Modal } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, CreditCard, ShieldCheck, Zap, Calendar, Clock, Trophy, MapPin, Users, CheckCircle2, XCircle, X, Plus } from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import { useAuth } from '../../store/useAuth';
import { bookingService } from '../../services/bookingService';
import { walletService, PaymentCard } from '../../services/walletService';
import { teamService, Team } from '../../services/teamService';
import { tournamentService } from '../../services/tournamentService';
import { db } from '../../services/firebase';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

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
    const [cards, setCards] = useState<PaymentCard[]>([]);
    const [loadingCards, setLoadingCards] = useState(true);
    const [customAlert, setCustomAlert] = useState<{
        visible: boolean;
        title: string;
        message: string;
        type: 'success' | 'error';
        onClose?: () => void;
    }>({ visible: false, title: '', message: '', type: 'success' });
    const [userTeams, setUserTeams] = useState<Team[]>([]);
    const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
    const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<'card' | 'venue'>('venue');
    const [showWebView, setShowWebView] = useState(false);
    const [inscriptionData, setInscriptionData] = useState<any>(null);

    // Parámetros dinámicos (pueden ser de Reserva o de Torneo)
    const { 
        type, // 'booking' | 'tournament'
        tenantId, tenantName, courtId, courtName, price, date, startTime, sport, sportColor,
        tournamentId, teamId, teamName, tournamentName,
        venueName, location, category, tournamentType,
        bookingId
    } = params;

    const activeColor = (sportColor as string) || '#10b981';
    const isTournament = type === 'tournament';

    useEffect(() => {
        if (user) {
            walletService.getCards(user.uid).then((userCards) => {
                setCards(userCards);
                setLoadingCards(false);
                if (userCards.length > 0) {
                    setPaymentMethod('card');
                    const defaultCard = userCards.find(c => c.isDefault) || userCards[0];
                    setSelectedCardId(defaultCard.id || null);
                }
            });
            teamService.getUserTeams(user.uid).then(teams => {
                const filtered = teams.filter(t => t.sport.toLowerCase() === (sport as string).toLowerCase());
                setUserTeams(filtered);
            });
        }

        const backAction = () => {
            router.back();
            return true;
        };
        const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
        return () => backHandler.remove();
    }, [user]);

    const handleConfirm = async () => {
        if (!user) return;

        // Validar si eligió tarjeta pero no tiene ninguna (aunque el UI ya lo previene)
        if (paymentMethod === 'card' && cards.length === 0) {
            handleAddCard();
            return;
        }

        setProcessing(true);
        try {
            const priceNum = Number(price);
            const userProfile = profile as any;
            const clientName = userProfile?.displayName || userProfile?.fullName || user.displayName || 'Jugador MVP';

            if (isTournament) {
                // FLUJO DE TORNEO
                if (!tournamentId || !teamId) throw new Error("Datos de torneo incompletos.");
                
                // 1. Autorizar pago
                const authResult = await walletService.authorizePayment(
                    user.uid, 
                    priceNum, 
                    tournamentId as string, 
                    tenantId as string || 'system',
                    selectedCardId || undefined
                );
                if (!authResult.success) throw new Error(authResult.error || "Pago rechazado.");

                // 2. Registrar oficialmente al equipo en el torneo
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

            } else {
                // FLUJO DE RESERVA (Optimizado para evitar registros con error)
                const priceNum = Number(price);
                const [startH, startM] = (startTime as string).split(':').map(Number);
                const endH = startH + 1;
                const endTime = `${endH.toString().padStart(2, '0')}:${(startM || 0).toString().padStart(2, '0')}`;
                
                // 1. Preparar los datos básicos
                const userProfile = profile as any;
                const clientName = userProfile?.displayName || userProfile?.fullName || user.displayName || 'Jugador MVP';
                
                const bookingData: any = {
                    userId: user.uid,
                    tenantId: tenantId as string,
                    tenantName: tenantName as string || 'Recinto',
                    courtId: courtId as string,
                    courtName: courtName as string || 'Cancha',
                    clientName: clientName,
                    clientPhone: userProfile?.phone || '+56900000000',
                    date: Timestamp.fromDate(new Date(`${date}T${startTime}`)),
                    startTime: startTime as string,
                    endTime: endTime,
                    totalPrice: priceNum,
                    status: paymentMethod === 'card' ? 'confirmed' : 'pending',
                    paymentStatus: 'pending' as const,
                    source: 'mobile_app' as const,
                    createdBy: user.email || user.uid,
                    paymentMethod: paymentMethod === 'card' ? 'card' : 'cash',
                    sport: sport as string,
                    teamId: selectedTeamId || undefined,
                    createdAt: Timestamp.now()
                };

                let finalBookingId = bookingId as string;

                if (paymentMethod === 'card') {
                    // PROCESO CON TARJETA: PRIMERO COBRAMOS, LUEGO GUARDAMOS
                    // Generamos un ID temporal para el buyOrder si no existe uno
                    const tempId = finalBookingId || `TEMP_${Date.now()}_${user.uid.slice(0,5)}`;
                    
                    const authResult = await walletService.authorizePayment(
                        user.uid, 
                        priceNum, 
                        tempId, 
                        tenantId as string,
                        selectedCardId || undefined
                    );
                    
                    if (!authResult.success) {
                        throw new Error(authResult.error || "PAGO RECHAZADO POR EL BANCO.");
                    }

                    // PAGO EXITOSO -> GUARDAMOS EN FIREBASE
                    bookingData.paymentStatus = 'paid';
                    if (finalBookingId) {
                        await bookingService.updateBooking(finalBookingId, bookingData);
                    } else {
                        finalBookingId = await bookingService.createBooking(bookingData);
                    }
                } else {
                    // PAGO EN RECINTO: GUARDAMOS DIRECTAMENTE
                    bookingData.paymentStatus = 'pending';
                    bookingData.paymentMethod = 'cash';
                    if (finalBookingId) {
                        await bookingService.updateBooking(finalBookingId, bookingData);
                    } else {
                        finalBookingId = await bookingService.createBooking(bookingData);
                    }
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

    const handleAddCard = async () => {
        if (!user) return;
        setProcessing(true);
        try {
            const data = await walletService.startInscription(user.uid, user.email || '', {
                returnUrl: 'mvpdeportes://wallet/success',
                userName: profile?.displayName || user.displayName || user.email || 'Jugador MVP'
            });
            
            if (data.url === null) {
                setCustomAlert({
                    visible: true,
                    title: 'TARJETA VINCULADA',
                    message: 'SE HA VINCULADO TU TARJETA DE PRUEBA EXITOSAMENTE.',
                    type: 'success',
                    onClose: () => {
                        walletService.getCards(user.uid).then(c => {
                            setCards(c);
                            setPaymentMethod('card');
                        });
                    }
                });
            } else {
                setInscriptionData(data);
                setShowWebView(true);
            }
        } catch (error) {
            setCustomAlert({ visible: true, title: 'ERROR', message: 'NO SE PUDO INICIAR LA VINCULACIÓN CON TRANSBANK.', type: 'error' });
        } finally {
            setProcessing(false);
        }
    };

    if (loadingCards) {
        return (
            <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color={activeColor} size="large" />
            </View>
        );
    }

    const hasCards = cards.length > 0;

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
                            <Text style={{ color: C.sub, fontSize: 9, fontWeight: '900', letterSpacing: 1 }}>COSTO DE INSCRIPCIÓN</Text>
                            <Text style={{ color: C.text, fontSize: 32, fontWeight: '900', letterSpacing: -1 }}>
                                ${Number(price).toLocaleString('es-CL')}
                            </Text>
                        </View>
                        <View style={{ backgroundColor: activeColor + '10', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}>
                            <Text style={{ color: activeColor, fontWeight: '900', fontSize: 10 }}>MVP</Text>
                        </View>
                    </View>
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
                <View style={{ marginHorizontal: 30, gap: 12 }}>
                    {/* OPCIÓN 1: PAGO EN RECINTO */}
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

                    {/* OPCIÓN 2: TARJETA(S) REGISTRADA(S) */}
                    {hasCards ? (
                        <>
                            {cards.map((card) => (
                                <TouchableOpacity 
                                    key={card.id}
                                    onPress={() => {
                                        setPaymentMethod('card');
                                        setSelectedCardId(card.id || null);
                                    }}
                                    style={{ 
                                        backgroundColor: C.card, borderRadius: 25, padding: 20, 
                                        borderWidth: 2, 
                                        borderColor: (paymentMethod === 'card' && selectedCardId === card.id) ? activeColor : C.border,
                                        flexDirection: 'row', alignItems: 'center'
                                    }}
                                >
                                    <View style={{ width: 45, height: 45, borderRadius: 12, backgroundColor: (paymentMethod === 'card' && selectedCardId === card.id) ? activeColor + '15' : C.bg, alignItems: 'center', justifyContent: 'center' }}>
                                        <CreditCard color={(paymentMethod === 'card' && selectedCardId === card.id) ? activeColor : C.sub} size={22} />
                                    </View>
                                    <View style={{ marginLeft: 15, flex: 1 }}>
                                        <Text style={{ color: C.text, fontSize: 15, fontWeight: '900', textTransform: 'uppercase' }}>{card.brand} Registrada</Text>
                                        <Text style={{ color: C.sub, fontSize: 10, fontWeight: '700' }}>•••• {card.last4} {card.isDefault ? '(PRINCIPAL)' : ''}</Text>
                                    </View>
                                    {(paymentMethod === 'card' && selectedCardId === card.id) && <CheckCircle2 color={activeColor} size={20} />}
                                </TouchableOpacity>
                            ))}
                            
                            <TouchableOpacity 
                                onPress={handleAddCard}
                                style={{ 
                                    backgroundColor: C.card, borderRadius: 25, padding: 15, 
                                    borderStyle: 'dashed', borderWidth: 1, borderColor: C.border, 
                                    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                                    marginTop: 5
                                }}
                            >
                                <Plus color={C.sub} size={16} />
                                <Text style={{ color: C.sub, fontSize: 11, fontWeight: '900', marginLeft: 10, textTransform: 'uppercase' }}>Agregar otra tarjeta</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <TouchableOpacity 
                            onPress={handleAddCard}
                            style={{ 
                                backgroundColor: C.card, borderRadius: 25, padding: 20, 
                                borderStyle: 'dashed', borderWidth: 2, borderColor: activeColor, 
                                flexDirection: 'row', alignItems: 'center'
                            }}
                        >
                            <View style={{ width: 45, height: 45, borderRadius: 12, backgroundColor: activeColor + '10', alignItems: 'center', justifyContent: 'center' }}>
                                <Plus color={activeColor} size={22} />
                            </View>
                            <View style={{ marginLeft: 15, flex: 1 }}>
                                <Text style={{ color: C.text, fontSize: 15, fontWeight: '900', textTransform: 'uppercase' }}>Vincular Tarjeta</Text>
                                <Text style={{ color: activeColor, fontSize: 10, fontWeight: '700' }}>USA TUS TARJETAS PARA PAGAR RÁPIDO</Text>
                            </View>
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
                        <Text style={{ color: C.text, fontSize: 18, fontWeight: '900', textAlign: 'center', textTransform: 'uppercase', marginBottom: 10 }}>{customAlert.title}</Text>
                        <Text style={{ color: C.sub, fontSize: 13, fontWeight: '700', textAlign: 'center', lineHeight: 20, marginBottom: 30 }}>{customAlert.message}</Text>
                        
                        <TouchableOpacity 
                            onPress={() => {
                                setCustomAlert({ ...customAlert, visible: false });
                                if (customAlert.onClose) customAlert.onClose();
                            }}
                            style={{ backgroundColor: customAlert.type === 'success' ? '#10b981' : '#ef4444', height: 60, width: '100%', borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}
                        >
                            <Text style={{ color: 'white', fontWeight: '900', fontSize: 14 }}>{customAlert.type === 'success' ? 'VER MI TICKET' : 'ENTENDIDO'}</Text>
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
            {/* WEBVIEW TRANSBANK */}
            <Modal visible={showWebView} animationType="slide">
                <View style={{ flex: 1, backgroundColor: 'white' }}>
                    <View style={{ paddingTop: 60, paddingBottom: 20, paddingHorizontal: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
                        <Text style={{ fontSize: 18, fontWeight: '900' }}>VINCULACIÓN SEGURA</Text>
                        <TouchableOpacity onPress={() => setShowWebView(false)}>
                            <X color="black" size={24} />
                        </TouchableOpacity>
                    </View>
                    {inscriptionData && (
                        <WebView
                            source={{ uri: inscriptionData.url, method: 'POST', body: `TBK_TOKEN=${inscriptionData.token}` }}
                            onNavigationStateChange={(navState) => {
                                if (navState.url.includes('wallet/success')) {
                                    setShowWebView(false);
                                    setCustomAlert({
                                        visible: true,
                                        title: '¡ÉXITO!',
                                        message: 'TARJETA VINCULADA CORRECTAMENTE.',
                                        type: 'success',
                                        onClose: () => {
                                            walletService.getCards(user!.uid).then(c => {
                                                setCards(c);
                                                setPaymentMethod('card');
                                            });
                                        }
                                    });
                                } else if (navState.url.includes('wallet/error')) {
                                    setShowWebView(false);
                                    setCustomAlert({ visible: true, title: 'CANCELADO', message: 'LA VINCULACIÓN FUE CANCELADA.', type: 'error' });
                                }
                            }}
                            style={{ flex: 1 }}
                        />
                    )}
                </View>
            </Modal>
        </View>
    );
}
