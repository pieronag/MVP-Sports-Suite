import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StatusBar, StyleSheet, ActivityIndicator, Dimensions, RefreshControl, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { QrCode, CheckCircle2, Clock, Calendar, Building2, TrendingUp, DollarSign, ChevronRight, Zap, Target, ShieldCheck, ArrowUpRight, XCircle, ChevronDown } from 'lucide-react-native';
import { useAuth } from '../../store/useAuth';
import { bookingService, Booking } from '../../services/bookingService';
import { venueService, Tenant } from '../../services/venueService';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Modal } from 'react-native';
import { db } from '../../services/firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';

const { width, height } = Dimensions.get('window');
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
        if (hours < 6) {
            res.setDate(res.getDate() + 1);
        }
        return res;
    } catch (e) {
        return new Date();
    }
};

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
    const [isSelectOpen, setIsSelectOpen] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [pendingTenant, setPendingTenant] = useState<Tenant | null>(null);
    const [isNoShowConfirmOpen, setIsNoShowConfirmOpen] = useState(false);
    const [isNoShowSuccessOpen, setIsNoShowSuccessOpen] = useState(false);

    useEffect(() => {
        const loadSavedTenant = async () => {
            const uid = profile?.uid || (profile as any)?.id;
            if (!uid) return;
            try {
                const saved = await AsyncStorage.getItem('mvp-active-tenant-id');
                
                // Buscar documento en la colección staff
                const staffQuery = query(
                    collection(db, "staff"), 
                    where("uid", "==", uid),
                    where("status", "==", "active")
                );
                const staffSnap = await getDocs(staffQuery);
                let tenantIds: string[] = [];
                if (!staffSnap.empty) {
                    const staffData = staffSnap.docs[0].data();
                    tenantIds = staffData.tenantIds || (staffData.tenantId ? [staffData.tenantId] : []);
                } else {
                    tenantIds = profile?.tenantIds || [];
                }

                if (saved && tenantIds.includes(saved)) {
                    setSelectedTenantId(saved);
                }
            } catch (err) {
                console.error("Error loading persisted tenant:", err);
            }
        };
        loadSavedTenant();
    }, [profile?.uid, profile?.tenantIds]);

    const fetchData = useCallback(async () => {
        const uid = profile?.uid || (profile as any)?.id;
        if (!uid) {
            setLoading(false);
            return;
        }
        
        try {
            // Buscar documento activo en colección staff
            const staffQuery = query(
                collection(db, "staff"), 
                where("uid", "==", uid),
                where("status", "==", "active")
            );
            const staffSnap = await getDocs(staffQuery);
            let tenantIds: string[] = [];
            if (!staffSnap.empty) {
                const staffData = staffSnap.docs[0].data();
                tenantIds = staffData.tenantIds || (staffData.tenantId ? [staffData.tenantId] : []);
            } else {
                tenantIds = profile?.tenantIds || ((profile as any)?.tenantId ? [(profile as any).tenantId] : []);
            }

            if (!tenantIds.length) {
                setVenues([]);
                setLoading(false);
                return;
            }
            
            const list = await venueService.getVenuesByIds(tenantIds);
            setVenues(list);
            
            const currentTenantId = selectedTenantId || list[0].id;
            if (!selectedTenantId) setSelectedTenantId(currentTenantId);

            const today = new Date();
            const b = await bookingService.getBookingsByTenantForDate(currentTenantId, today);
            
            // Auto check-in local / no-show validation on loaded bookings
            const nowChile = getSantiagoDateTime(new Date());

            const verifiedBookings = await Promise.all(b.map(async (booking) => {
                if (
                    booking.status !== 'cancelled' && 
                    booking.status !== 'completed' &&
                    booking.checkIn !== true && 
                    booking.date && 
                    booking.startTime
                ) {
                    let bookingDate: Date;
                    if ((booking.date as any).toDate) {
                        bookingDate = (booking.date as any).toDate();
                    } else {
                        bookingDate = new Date(booking.date as any);
                    }
                    
                    const startDateTime = getBookingDateTimeChile(bookingDate, booking.startTime);
                    
                    if (nowChile >= startDateTime) {
                        try {
                            const bookingRef = doc(db, 'bookings', booking.id as string);
                            await updateDoc(bookingRef, {
                                status: 'cancelled',
                                paymentStatus: 'no-show',
                                notes: 'Cancelación automática por inasistencia sin check-in (No-Show).',
                                updatedAt: new Date()
                            });
                            return {
                                ...booking,
                                status: 'cancelled' as const,
                                paymentStatus: 'no-show' as any,
                                notes: 'Cancelación automática por inasistencia sin check-in (No-Show).'
                            };
                        } catch (e) {
                            console.error("No-show update error:", e);
                        }
                    }
                }
                return booking;
            }));

            setBookings(verifiedBookings);
        } catch (error) {
            console.error("Dashboard Load Error:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [profile?.uid, profile?.tenantIds, selectedTenantId]);

    useEffect(() => {
        fetchData();

        // Configurar intervalo para actualizar y verificar no-shows automáticamente cada 15 minutos (900,000 ms)
        const interval = setInterval(() => {
            fetchData();
        }, 900000);

        return () => clearInterval(interval);
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
                {/* SELECTBOX DE RECINTO ACTIVO */}
                {venues.length > 0 && (
                    <View style={{ paddingHorizontal: 30, paddingTop: 10, paddingBottom: 5, zIndex: 1000, position: 'relative' }}>
                        <Text style={{ color: C.sub, fontSize: 8, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>
                            Recinto de Trabajo Activo
                        </Text>
                        <TouchableOpacity
                            onPress={() => {
                                if (venues.length > 1) {
                                    setIsSelectOpen(prev => !prev);
                                }
                            }}
                            activeOpacity={venues.length > 1 ? 0.8 : 1}
                            style={{
                                paddingHorizontal: 20,
                                paddingVertical: 14,
                                borderRadius: 20,
                                backgroundColor: C.card,
                                borderWidth: 1,
                                borderColor: C.border,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                shadowColor: '#000',
                                shadowOpacity: isDark ? 0.2 : 0.03,
                                shadowRadius: 10,
                                shadowOffset: { width: 0, height: 4 }
                            }}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                <Building2 size={16} color={COLORS.accent} style={{ marginRight: 10 }} />
                                <Text style={{ color: C.text, fontSize: 13, fontWeight: '900', textTransform: 'uppercase', flex: 1 }} numberOfLines={1}>
                                    {venues.find(v => v.id === selectedTenantId)?.name || venues[0].name}
                                </Text>
                            </View>
                            {venues.length > 1 && (
                                <ChevronDown 
                                    size={16} 
                                    color={C.sub} 
                                    style={{ transform: [{ rotate: isSelectOpen ? '180deg' : '0deg' }] }}
                                />
                            )}
                        </TouchableOpacity>

                        {/* LISTA DESPLEGABLE INLINE ABSOLUTA */}
                        {isSelectOpen && venues.length > 1 && (
                            <View style={{
                                position: 'absolute',
                                top: 75,
                                left: 30,
                                right: 30,
                                backgroundColor: C.card,
                                borderRadius: 20,
                                borderWidth: 1,
                                borderColor: C.border,
                                shadowColor: '#000',
                                shadowOpacity: 0.15,
                                shadowRadius: 15,
                                shadowOffset: { width: 0, height: 10 },
                                zIndex: 2000,
                                paddingVertical: 8,
                                overflow: 'hidden'
                            }}>
                                <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
                                    {venues.map((v, idx, arr) => {
                                        const isSelected = selectedTenantId === v.id;
                                        return (
                                            <View key={v.id}>
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        if (!isSelected) {
                                                            setPendingTenant(v);
                                                            setIsConfirmOpen(true);
                                                        } else {
                                                            setIsSelectOpen(false);
                                                        }
                                                    }}
                                                    activeOpacity={0.7}
                                                    style={{ 
                                                        flexDirection: 'row', 
                                                        alignItems: 'center', 
                                                        justifyContent: 'space-between', 
                                                        paddingVertical: 14,
                                                        paddingHorizontal: 20,
                                                        backgroundColor: isSelected ? (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)') : 'transparent'
                                                    }}
                                                >
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                                        <Building2 size={14} color={isSelected ? COLORS.accent : C.sub} style={{ marginRight: 10 }} />
                                                        <Text style={{ color: isSelected ? COLORS.accent : C.text, fontSize: 12, fontWeight: '900', textTransform: 'uppercase', flex: 1 }} numberOfLines={1}>
                                                            {v.name}
                                                        </Text>
                                                    </View>
                                                    {isSelected && (
                                                        <CheckCircle2 color={COLORS.accent} size={14} />
                                                    )}
                                                </TouchableOpacity>
                                                {idx < arr.length - 1 && (
                                                    <View style={{ height: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }} />
                                                )}
                                            </View>
                                        );
                                    })}
                                </ScrollView>
                            </View>
                        )}
                    </View>
                )}

                {/* BOTÓN MANUAL DE VERIFICACIÓN NO-SHOW */}
                <View style={{ paddingHorizontal: 30, paddingTop: 5, paddingBottom: 5 }}>
                    <TouchableOpacity
                        onPress={() => setIsNoShowConfirmOpen(true)}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            paddingVertical: 14,
                            paddingHorizontal: 20,
                            borderRadius: 20,
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            borderWidth: 1,
                            borderColor: 'rgba(16, 185, 129, 0.25)',
                        }}
                    >
                        <Zap size={14} color={COLORS.accent} style={{ marginRight: 8 }} />
                        <Text style={{ color: COLORS.accent, fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 }}>
                            Validar y Limpiar No-Shows
                        </Text>
                    </TouchableOpacity>
                </View>

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
                                    {b.status === 'cancelled' && (
                                        <View style={{ marginTop: 6, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: COLORS.error + '12', borderRadius: 8, alignSelf: 'flex-start' }}>
                                            <Text style={{ color: COLORS.error, fontSize: 8, fontWeight: '900', textTransform: 'uppercase' }}>
                                                {(b as any).paymentStatus === 'no-show' 
                                                    ? 'Cancelado por No-Show' 
                                                    : ((b as any).notes && ((b as any).notes.toLowerCase().includes('no-show') || (b as any).notes.toLowerCase().includes('inasistencia'))
                                                        ? 'Cancelado por No-Show'
                                                        : 'Cancelado por Jugador'
                                                    )
                                                }
                                            </Text>
                                        </View>
                                    )}
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

            {/* MODAL DE CONFIRMACIÓN DE CAMBIO DE RECINTO */}
            <Modal visible={isConfirmOpen} animationType="fade" transparent>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 }}>
                    <View style={{ 
                        backgroundColor: C.card, 
                        borderRadius: 30, 
                        padding: 30, 
                        width: '100%', 
                        borderWidth: 1, 
                        borderColor: C.border,
                        alignItems: 'center',
                        shadowColor: '#000',
                        shadowOpacity: 0.25,
                        shadowRadius: 20,
                        shadowOffset: { width: 0, height: 10 }
                    }}>
                        <View style={{ width: 60, height: 60, borderRadius: 20, backgroundColor: COLORS.accent + '15', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                            <Building2 color={COLORS.accent} size={28} />
                        </View>

                        <Text style={{ color: C.text, fontSize: 16, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center', marginBottom: 10 }}>
                            ¿Cambiar de Recinto?
                        </Text>
                        
                        <Text style={{ color: C.sub, fontSize: 13, fontWeight: '700', textAlign: 'center', lineHeight: 20, marginBottom: 25 }}>
                            Estás a punto de cambiar al recinto {"\n"}
                            <Text style={{ color: C.text, fontWeight: '900' }}>"{pendingTenant?.name}"</Text>.{"\n"}
                            Se actualizarán de inmediato todas las estadísticas del día, balances e ingresos del nuevo recinto.
                        </Text>

                        <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
                            <TouchableOpacity
                                onPress={() => {
                                    setIsConfirmOpen(false);
                                    setPendingTenant(null);
                                }}
                                activeOpacity={0.8}
                                style={{
                                    flex: 1,
                                    paddingVertical: 14,
                                    borderRadius: 18,
                                    borderWidth: 1,
                                    borderColor: C.border,
                                    backgroundColor: 'transparent',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <Text style={{ color: C.sub, fontSize: 12, fontWeight: '900', textTransform: 'uppercase' }}>Cancelar</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={async () => {
                                    if (pendingTenant) {
                                        setSelectedTenantId(pendingTenant.id);
                                        setLoading(true);
                                        setIsConfirmOpen(false);
                                        setIsSelectOpen(false);
                                        try {
                                            await AsyncStorage.setItem('mvp-active-tenant-id', pendingTenant.id);
                                        } catch (e) {}
                                        setPendingTenant(null);
                                    }
                                }}
                                activeOpacity={0.8}
                                style={{
                                    flex: 1,
                                    paddingVertical: 14,
                                    borderRadius: 18,
                                    backgroundColor: COLORS.accent,
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <Text style={{ color: 'white', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' }}>Confirmar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* MODAL DE CONFIRMACIÓN DE VALIDACIÓN NO-SHOW */}
            <Modal visible={isNoShowConfirmOpen} animationType="fade" transparent>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 }}>
                    <View style={{ 
                        backgroundColor: C.card, 
                        borderRadius: 30, 
                        padding: 30, 
                        width: '100%', 
                        borderWidth: 1, 
                        borderColor: C.border,
                        alignItems: 'center',
                        shadowColor: '#000',
                        shadowOpacity: 0.25,
                        shadowRadius: 20,
                        shadowOffset: { width: 0, height: 10 }
                    }}>
                        <View style={{ width: 60, height: 60, borderRadius: 20, backgroundColor: COLORS.accent + '15', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                            <Zap color={COLORS.accent} size={28} />
                        </View>

                        <Text style={{ color: C.text, fontSize: 16, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center', marginBottom: 10 }}>
                            ¿Validar No-Shows?
                        </Text>
                        
                        <Text style={{ color: C.sub, fontSize: 13, fontWeight: '700', textAlign: 'center', lineHeight: 20, marginBottom: 25 }}>
                            Esta acción buscará y cancelará automáticamente todas las reservas pendientes impagas que hayan excedido su hora de inicio. ¿Deseas continuar?
                        </Text>

                        <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
                            <TouchableOpacity
                                onPress={() => setIsNoShowConfirmOpen(false)}
                                activeOpacity={0.8}
                                style={{
                                    flex: 1,
                                    paddingVertical: 14,
                                    borderRadius: 18,
                                    borderWidth: 1,
                                    borderColor: C.border,
                                    backgroundColor: 'transparent',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <Text style={{ color: C.sub, fontSize: 12, fontWeight: '900', textTransform: 'uppercase' }}>Volver</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={async () => {
                                    setIsNoShowConfirmOpen(false);
                                    setRefreshing(true);
                                    await fetchData();
                                    setIsNoShowSuccessOpen(true);
                                }}
                                activeOpacity={0.8}
                                style={{
                                    flex: 1,
                                    paddingVertical: 14,
                                    borderRadius: 18,
                                    backgroundColor: COLORS.accent,
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <Text style={{ color: 'white', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' }}>Ejecutar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* MODAL DE ÉXITO DE VALIDACIÓN NO-SHOW */}
            <Modal visible={isNoShowSuccessOpen} animationType="fade" transparent>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 }}>
                    <View style={{ 
                        backgroundColor: C.card, 
                        borderRadius: 30, 
                        padding: 30, 
                        width: '100%', 
                        borderWidth: 1, 
                        borderColor: C.border,
                        alignItems: 'center',
                        shadowColor: '#000',
                        shadowOpacity: 0.25,
                        shadowRadius: 20,
                        shadowOffset: { width: 0, height: 10 }
                    }}>
                        <View style={{ width: 60, height: 60, borderRadius: 20, backgroundColor: COLORS.accent + '15', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                            <ShieldCheck color={COLORS.accent} size={28} />
                        </View>

                        <Text style={{ color: C.text, fontSize: 16, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center', marginBottom: 10 }}>
                            ¡Limpieza Completada!
                        </Text>
                        
                        <Text style={{ color: C.sub, fontSize: 13, fontWeight: '700', textAlign: 'center', lineHeight: 20, marginBottom: 25 }}>
                            Se ha ejecutado la validación y limpieza de No-Shows de manera exitosa en tiempo real.
                        </Text>

                        <TouchableOpacity
                            onPress={() => setIsNoShowSuccessOpen(false)}
                            activeOpacity={0.8}
                            style={{
                                width: '100%',
                                paddingVertical: 14,
                                borderRadius: 18,
                                backgroundColor: COLORS.accent,
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <Text style={{ color: 'white', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' }}>Entendido</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
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
