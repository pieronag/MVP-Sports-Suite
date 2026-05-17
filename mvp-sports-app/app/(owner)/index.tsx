import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StatusBar, StyleSheet, ActivityIndicator, Dimensions, RefreshControl, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { QrCode, CheckCircle2, Clock, Calendar, Building2, TrendingUp, DollarSign, ChevronRight, Zap, Target, ShieldCheck, ArrowUpRight, XCircle } from 'lucide-react-native';
import { useAuth } from '../../store/useAuth';
import { bookingService, Booking } from '../../services/bookingService';
import { venueService, Tenant } from '../../services/venueService';
import { LinearGradient } from 'expo-linear-gradient';

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
    accent: '#10b981',
    error: '#f43f5e'
};

export default function ManagerDashboard() {
    const router = useRouter();
    const { profile, theme } = useAuth();
    const isDark = theme === 'dark';
    const C = isDark ? COLORS.dark : COLORS.light;

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [venues, setVenues] = useState<Tenant[]>([]);
    const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [activeTab, setActiveTab] = useState<'pending' | 'completed' | 'cancelled'>('pending');

    const fetchData = useCallback(async () => {
        const tenantIds = profile?.tenantIds || [];
        if (!tenantIds.length) {
            setLoading(false);
            return;
        }
        
        try {
            const list = await venueService.getVenuesByIds(tenantIds);
            setVenues(list);
            
            const currentTenantId = selectedTenantId || list[0].id;
            if (!selectedTenantId) setSelectedTenantId(currentTenantId);

            const today = new Date();
            const b = await bookingService.getBookingsByTenantForDate(currentTenantId, today);
            setBookings(b);
        } catch (error) {
            console.error("Dashboard Load Error:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [profile?.tenantIds, selectedTenantId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const stats = useMemo(() => {
        const activeBookings = bookings.filter(b => b.status !== 'cancelled');
        const checkedIn = activeBookings.filter(b => b.checkIn).length;
        const cancelled = bookings.filter(b => b.status === 'cancelled').length;
        const revenue = activeBookings.reduce((acc, curr) => {
            if (curr.paymentStatus === 'paid') return acc + (curr.totalPrice || curr.price || 0);
            if (curr.paymentStatus === 'partial') return acc + (curr.deposit || 0);
            return acc;
        }, 0);
        return { 
            todayCount: activeBookings.length, 
            checkedIn, 
            pending: activeBookings.length - checkedIn,
            cancelled,
            revenue 
        };
    }, [bookings]);

    const filteredBookings = useMemo(() => {
        return bookings
            .filter(b => {
                if (activeTab === 'cancelled') return b.status === 'cancelled';
                if (b.status === 'cancelled') return false;
                return activeTab === 'pending' ? !b.checkIn : !!b.checkIn;
            })
            .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
    }, [bookings, activeTab]);

    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(amount);
    };

    return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
            
            <View style={{ paddingTop: 60, paddingBottom: 20, paddingHorizontal: 30, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                    <Text style={{ color: COLORS.accent, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2 }}>Operativo</Text>
                    <Text style={{ color: C.text, fontSize: 24, fontWeight: '900', textTransform: 'uppercase' }}>Dashboard</Text>
                </View>
                <TouchableOpacity 
                    onPress={() => router.push('/(owner)/perfil')}
                    style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}
                >
                    <Image 
                        source={profile?.photoURL ? { uri: profile.photoURL } : require('../../assets/images/mascot.png')} 
                        style={{ width: 40, height: 40, borderRadius: 12 }} 
                    />
                </TouchableOpacity>
            </View>

            <ScrollView 
                className="flex-1" 
                contentContainerStyle={{ paddingBottom: 120 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />
                }
            >
                {/* RESUMEN BANNER */}
                <View style={{ padding: 30, paddingBottom: 10 }}>
                    <View style={{ backgroundColor: C.card, borderRadius: 35, padding: 30, borderWidth: 1, borderColor: C.border, shadowColor: '#000', shadowOpacity: isDark ? 0.3 : 0.05, shadowRadius: 15 }}>
                        <Text style={{ color: C.sub, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 15 }}>Balance de Hoy</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <View>
                                <Text style={{ color: C.text, fontSize: 36, fontWeight: '900', letterSpacing: -1 }}>{formatMoney(stats.revenue)}</Text>
                                <View className="flex-row items-center mt-2">
                                    <View style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, backgroundColor: COLORS.accent + '15', borderWidth: 1, borderColor: COLORS.accent + '33' }}>
                                        <Text style={{ color: COLORS.accent, fontSize: 10, fontWeight: '800' }}>{stats.checkedIn} INGRESOS OK</Text>
                                    </View>
                                </View>
                            </View>
                            <View style={{ width: 64, height: 64, borderRadius: 22, backgroundColor: COLORS.accent + '15', alignItems: 'center', justifyContent: 'center' }}>
                                <ShieldCheck color={COLORS.accent} size={32} />
                            </View>
                        </View>
                    </View>
                </View>

                {/* ACCIÓN RÁPIDA: ESCANEAR */}
                <View style={{ paddingHorizontal: 30, marginTop: 10 }}>
                    <TouchableOpacity
                        onPress={() => router.push('/(owner)/escaner')}
                        activeOpacity={0.9}
                        style={{ backgroundColor: COLORS.accent, borderRadius: 30, padding: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: COLORS.accent, shadowOpacity: 0.3, shadowRadius: 15 }}
                    >
                        <View className="flex-row items-center">
                            <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                                <QrCode color="white" size={24} />
                            </View>
                            <View className="ml-5">
                                <Text style={{ color: 'white', fontSize: 18, fontWeight: '900', textTransform: 'uppercase' }}>Validar Acceso</Text>
                                <Text style={{ color: 'white', fontSize: 10, fontWeight: '700', opacity: 0.8 }}>Escanear código QR del jugador</Text>
                            </View>
                        </View>
                        <ArrowUpRight color="white" size={20} />
                    </TouchableOpacity>
                </View>

                {/* KPI SECTION */}
                <SectionLabel label="Estadísticas" />
                <View style={{ paddingHorizontal: 30, flexDirection: 'row', justifyContent: 'space-between' }}>
                    <KpiBox label="Reservas" value={stats.todayCount} icon={Calendar} color="#3b82f6" isDark={isDark} />
                    <KpiBox label="Pendientes" value={stats.pending} icon={Clock} color="#f59e0b" isDark={isDark} />
                    <KpiBox label="Canceladas" value={stats.cancelled} icon={XCircle} color={COLORS.error} isDark={isDark} />
                </View>

                {/* TABS DE AGENDA */}
                <View style={{ marginHorizontal: 30, marginTop: 40, flexDirection: 'row', backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderRadius: 20, padding: 6 }}>
                    <TabItem label="Pendientes" count={stats.pending} active={activeTab === 'pending'} onPress={() => setActiveTab('pending')} C={C} />
                    <TabItem label="Listos" count={stats.checkedIn} active={activeTab === 'completed'} onPress={() => setActiveTab('completed')} C={C} />
                    <TabItem label="Anuladas" count={stats.cancelled} active={activeTab === 'cancelled'} onPress={() => setActiveTab('cancelled')} C={C} />
                </View>

                {/* LISTA DE AGENDA */}
                <View style={{ marginHorizontal: 30, marginTop: 20, backgroundColor: C.card, borderRadius: 30, overflow: 'hidden', borderWidth: 1, borderColor: C.border }}>
                    {loading ? (
                        <View style={{ padding: 60 }}><ActivityIndicator color={COLORS.accent} /></View>
                    ) : filteredBookings.length === 0 ? (
                        <View style={{ padding: 60, alignItems: 'center' }}>
                            <Target color={C.border} size={48} />
                            <Text style={{ color: C.sub, fontSize: 12, fontWeight: '800', marginTop: 15 }}>Sin actividad en esta sección</Text>
                        </View>
                    ) : filteredBookings.map((b, idx, arr) => (
                        <View key={b.id}>
                            <TouchableOpacity
                                activeOpacity={0.7}
                                style={{ padding: 25, flexDirection: 'row', alignItems: 'center' }}
                            >
                                <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: b.status === 'cancelled' ? COLORS.error + '15' : (b.checkIn ? (isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9') : COLORS.accent + '11'), alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: b.status === 'cancelled' ? COLORS.error + '22' : (b.checkIn ? 'transparent' : COLORS.accent + '22') }}>
                                    {b.status === 'cancelled' ? <XCircle color={COLORS.error} size={24} /> : (b.checkIn ? <CheckCircle2 color={COLORS.accent} size={24} /> : <Clock color={COLORS.accent} size={24} />)}
                                </View>
                                <View style={{ marginLeft: 20, flex: 1 }}>
                                    <Text style={{ color: C.text, fontSize: 20, fontWeight: '900', textTransform: 'uppercase', letterSpacing: -0.5 }}>{b.clientName.split(' ')[0]}</Text>
                                    <View className="flex-row items-center mt-1">
                                        <Text style={{ color: b.status === 'cancelled' ? COLORS.error : COLORS.accent, fontSize: 13, fontWeight: '900' }}>{b.startTime}</Text>
                                        <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: C.sub, marginHorizontal: 8, opacity: 0.3 }} />
                                        <Text style={{ color: C.sub, fontSize: 13, fontWeight: '800' }}>{b.courtName}</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                        <Zap size={10} color={b.status === 'cancelled' ? COLORS.error : COLORS.accent} style={{ marginRight: 4 }} />
                                        <Text style={{ color: b.status === 'cancelled' ? COLORS.error : COLORS.accent, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }}>{b.sport || 'Pádel'}</Text>
                                    </View>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: b.status === 'cancelled' ? COLORS.error + '15' : (b.paymentStatus === 'paid' ? COLORS.accent + '22' : '#f59e0b22') }}>
                                        <Text style={{ color: b.status === 'cancelled' ? COLORS.error : (b.paymentStatus === 'paid' ? COLORS.accent : '#f59e0b'), fontSize: 9, fontWeight: '900' }}>{b.status === 'cancelled' ? 'X' : (b.paymentStatus === 'paid' ? 'OK' : '$')}</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                            {idx < arr.length - 1 && <Separator isDark={isDark} />}
                        </View>
                    ))}
                </View>

            </ScrollView>
        </View>
    );
}

function TabItem({ label, count, active, onPress, C }: any) {
    return (
        <TouchableOpacity 
            onPress={onPress}
            style={{ flex: 1, height: 45, borderRadius: 15, backgroundColor: active ? C.card : 'transparent', alignItems: 'center', justifyContent: 'center', borderWidth: active ? 1 : 0, borderColor: C.border }}
        >
            <Text style={{ color: active ? COLORS.accent : C.sub, fontSize: 10, fontWeight: '900', textTransform: 'uppercase' }}>{label} ({count})</Text>
        </TouchableOpacity>
    );
}

function SectionLabel({ label }: { label: string }) {
    return (
        <Text style={{ color: COLORS.accent, fontWeight: '900', fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, marginHorizontal: 40, marginTop: 35, marginBottom: 15 }}>{label}</Text>
    );
}

function Separator({ isDark }: { isDark: boolean }) {
    return (
        <View style={{ height: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', marginHorizontal: 25 }} />
    );
}

function KpiBox({ label, value, icon: Icon, color, isDark }: any) {
    const C = isDark ? COLORS.dark : COLORS.light;
    return (
        <View style={{ backgroundColor: C.card, borderRadius: 22, padding: 20, width: (width - 76) / 3, borderWidth: 1, borderColor: C.border, alignItems: 'center' }}>
            <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: color + '15', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <Icon color={color} size={18} />
            </View>
            <Text style={{ color: C.text, fontSize: 22, fontWeight: '900', letterSpacing: -1 }}>{value}</Text>
            <Text style={{ color: C.sub, fontSize: 8, fontWeight: '800', textTransform: 'uppercase', marginTop: 4 }}>{label}</Text>
        </View>
    );
}
