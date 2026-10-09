import React, { useState, useEffect } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    ActivityIndicator, StatusBar, RefreshControl, BackHandler, Dimensions
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import {
    ChevronLeft, ShieldCheck, Clock, Receipt, CheckCircle2, CreditCard, Landmark, MapPin
} from 'lucide-react-native';
import { useAuth } from '../../store/useAuth';
import { bookingService, Booking } from '../../services/bookingService';

const { width } = Dimensions.get('window');

// 🎨 DYNAMIC REFINED PALETTE
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
    error: '#f43f5e'
};

export default function BilleteraScreen() {
    const router = useRouter();
    const { user, theme } = useAuth();
    const isDark = theme === 'dark';
    const C = isDark ? COLORS.dark : COLORS.light;

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [bookings, setBookings] = useState<Booking[]>([]);

    const loadData = async () => {
        if (!user) { setLoading(false); return; }
        if (!refreshing) setLoading(true);
        try {
            const userBookings = await bookingService.getUserBookings(user.uid);
            
            // Filtrar según especificaciones:
            // 1. Gastos relacionados a reservas finalizadas correctamente (completed/past/checkOut === true)
            // 2. Canceladas por jugador NO se consideran
            // 3. Canceladas por inasistencia (no-show) SOLO si hay pago online (paymentMethod === 'card')
            const filteredBookings = userBookings.filter(b => {
                const isNoShow = b.status === 'no-show' || 
                                 b.paymentStatus === 'no-show' || 
                                 b.noShow === true || 
                                 (b.notes && (b.notes.toLowerCase().includes('no-show') || b.notes.toLowerCase().includes('inasistencia')));

                const isCompleted = b.status === 'completed' || b.status === 'past' || b.checkOut === true;
                const isOnline = b.paymentMethod === 'card';

                if (isCompleted) {
                    return true;
                }
                
                if (isNoShow && isOnline) {
                    return true;
                }

                return false;
            });

            filteredBookings.sort((a, b) => {
                const dateA = (a.date as any)?.toMillis ? (a.date as any).toMillis() : new Date(a.date as any).getTime();
                const dateB = (b.date as any)?.toMillis ? (b.date as any).toMillis() : new Date(b.date as any).getTime();
                return dateB - dateA;
            });
            setBookings(filteredBookings.slice(0, 20));
        } catch (error) {
            console.error("Error loading wallet transactions:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            loadData();
        }, [user])
    );

    const formatMoney = (amount: number) => '$' + amount.toLocaleString('es-CL');

    // 📊 CÁLCULO DE BALANCES
    const totalOnline = bookings
        .filter(b => b.paymentMethod === 'card')
        .reduce((sum, b) => sum + (b.totalPrice || 0), 0);

    const totalVenue = bookings
        .filter(b => b.paymentMethod !== 'card')
        .reduce((sum, b) => sum + (b.totalPrice || 0), 0);

    if (loading && !refreshing) {
        return (
            <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color={COLORS.accent} size="large" />
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
            
            {/* TOP BAR */}
            <View style={{ paddingTop: 60, paddingBottom: 20, paddingHorizontal: 30, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: C.border }}>
                <TouchableOpacity onPress={() => router.back()} style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}>
                    <ChevronLeft color={COLORS.accent} size={24} />
                </TouchableOpacity>
                <Text style={{ color: C.text, fontSize: 18, fontWeight: '900', textTransform: 'uppercase', letterSpacing: -0.5 }}>Pagos Realizados</Text>
                <View style={{ width: 44 }} /> 
            </View>

            <ScrollView 
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 120 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={COLORS.accent} />}
            >
                {/* SALDO BANNER */}
                <View style={{ padding: 30, paddingBottom: 10 }}>
                    <View style={{ backgroundColor: C.card, borderRadius: 30, padding: 30, borderWidth: 1, borderColor: C.border, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 }}>
                        <Text style={{ color: C.sub, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 10 }}>Estado de Cuenta</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <View>
                                <Text style={{ color: C.text, fontSize: 32, fontWeight: '900', letterSpacing: -1 }}>Activa</Text>
                                <Text style={{ color: COLORS.accent, fontSize: 11, fontWeight: '800', marginTop: 5 }}>Historial de Pagos Verificado</Text>
                            </View>
                            <View style={{ width: 60, height: 60, borderRadius: 20, backgroundColor: COLORS.accent + '22', alignItems: 'center', justifyContent: 'center' }}>
                                <ShieldCheck color={COLORS.accent} size={32} />
                            </View>
                        </View>
                    </View>
                </View>

                {/* 📊 SUMMARY ROW PARA BALANCE CORRECTO */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 30, marginBottom: 10, gap: 15 }}>
                    <View style={{ flex: 1, backgroundColor: C.card, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: C.border }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                            <View style={{ width: 24, height: 24, borderRadius: 8, backgroundColor: COLORS.accent + '15', alignItems: 'center', justifyContent: 'center' }}>
                                <CreditCard color={COLORS.accent} size={14} />
                            </View>
                            <Text style={{ color: C.sub, fontSize: 9, fontWeight: '900', textTransform: 'uppercase', marginLeft: 8, letterSpacing: 0.5 }}>PAGO ONLINE</Text>
                        </View>
                        <Text style={{ color: C.text, fontSize: 18, fontWeight: '900' }}>{formatMoney(totalOnline)}</Text>
                        <Text style={{ color: C.sub, fontSize: 8, fontWeight: '700', marginTop: 4 }}>TRANSACCIONADO</Text>
                    </View>
                    
                    <View style={{ flex: 1, backgroundColor: C.card, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: C.border }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                            <View style={{ width: 24, height: 24, borderRadius: 8, backgroundColor: '#3b82f615', alignItems: 'center', justifyContent: 'center' }}>
                                <MapPin color="#3b82f6" size={14} />
                            </View>
                            <Text style={{ color: C.sub, fontSize: 9, fontWeight: '900', textTransform: 'uppercase', marginLeft: 8, letterSpacing: 0.5 }}>EN RECINTO</Text>
                        </View>
                        <Text style={{ color: C.text, fontSize: 18, fontWeight: '900' }}>{formatMoney(totalVenue)}</Text>
                        <Text style={{ color: C.sub, fontSize: 8, fontWeight: '700', marginTop: 4 }}>POR RENDIR</Text>
                    </View>
                </View>

                {/* HISTORIAL DE TRANSACCIONES */}
                <SectionLabel label="Movimientos & Transacciones" />
                <View style={{ marginHorizontal: 30, backgroundColor: C.card, borderRadius: 25, overflow: 'hidden', borderWidth: 1, borderColor: C.border }}>
                    {bookings.length > 0 ? (
                        bookings.map((match, idx) => {
                            const isOnline = match.paymentMethod === 'card';
                            const isNoShow = match.status === 'no-show' || 
                                             match.paymentStatus === 'no-show' || 
                                             match.noShow === true || 
                                             (match.notes && (match.notes.toLowerCase().includes('no-show') || match.notes.toLowerCase().includes('inasistencia')));

                            const methodBadgeColor = isNoShow 
                                ? COLORS.error 
                                : (isOnline ? COLORS.accent : '#3b82f6');
                            const methodBadgeBg = isNoShow 
                                ? COLORS.error + '15' 
                                : (isOnline ? COLORS.accent + '15' : '#3b82f615');
                            const methodLabel = isNoShow 
                                ? 'PAGO RETENIDO (INASISTENCIA)' 
                                : (isOnline ? 'PAGO ONLINE' : 'PAGO EN RECINTO');
                            
                            // Formato de fecha
                            let dateStr = 'Reciente';
                            if (match.date) {
                                const t = (match.date as any)?.seconds ? (match.date as any).seconds * 1000 : new Date(match.date as any).getTime();
                                dateStr = new Date(t).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
                            }

                            return (
                                <View key={match.id}>
                                    <View style={{ height: 95, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 25 }}>
                                        <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: methodBadgeBg, alignItems: 'center', justifyContent: 'center' }}>
                                            {isNoShow ? (
                                                <CreditCard color={methodBadgeColor} size={20} />
                                            ) : isOnline ? (
                                                <CreditCard color={methodBadgeColor} size={20} />
                                            ) : (
                                                <Landmark color={methodBadgeColor} size={20} />
                                            )}
                                        </View>
                                        <View style={{ marginLeft: 15, flex: 1 }}>
                                            <Text style={{ color: C.text, fontSize: 15, fontWeight: '800' }} numberOfLines={1}>
                                                {match.tenantName || 'Reserva de Cancha'}
                                            </Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                                <Text style={{ color: C.sub, fontSize: 10, fontWeight: '700' }}>
                                                    {dateStr}
                                                </Text>
                                                <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: C.sub, opacity: 0.4, marginHorizontal: 8 }} />
                                                <View style={{ backgroundColor: methodBadgeBg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                                                    <Text style={{ color: methodBadgeColor, fontSize: 8, fontWeight: '900', letterSpacing: 0.3 }}>
                                                        {methodLabel}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>
                                        <View style={{ alignItems: 'flex-end' }}>
                                            <Text style={{ color: C.text, fontSize: 16, fontWeight: '900' }}>
                                                -{formatMoney(match.totalPrice || 0)}
                                            </Text>
                                        </View>
                                    </View>
                                    {idx < bookings.length - 1 && <Separator isDark={isDark} />}
                                </View>
                            );
                        })
                    ) : (
                        <View style={{ padding: 50, alignItems: 'center', justifyContent: 'center' }}>
                            <Clock color={C.sub} size={36} strokeWidth={1.5} />
                            <Text style={{ color: C.sub, fontSize: 13, fontWeight: '800', marginTop: 15 }}>Sin movimientos registrados</Text>
                        </View>
                    )}
                </View>

                <Text style={{ textAlign: 'center', color: C.sub, fontSize: 8, fontWeight: '700', marginTop: 50, textTransform: 'uppercase', letterSpacing: 1 }}>
                    Pagos Protegidos y Registrados en Ecosistema MVP • 2026
                </Text>
            </ScrollView>
        </View>
    );
}

/** ═══ COMPONENTES SOPORTE ═══ **/

const SectionLabel = ({ label }: { label: string }) => (
    <Text style={{ color: '#10b981', fontWeight: '900', fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, marginHorizontal: 40, marginTop: 30, marginBottom: 10 }}>{label}</Text>
);

const Separator = ({ isDark }: { isDark: boolean }) => (
    <View style={{ height: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)', marginHorizontal: 25 }} />
);
