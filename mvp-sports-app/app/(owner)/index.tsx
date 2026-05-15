import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StatusBar, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { QrCode, CheckCircle2, Clock, Sun, Moon, Calendar, Users, Building2 } from 'lucide-react-native';
import { useAuth } from '../../store/useAuth';
import { bookingService, Booking } from '../../services/bookingService';
import { venueService, Court, Tenant } from '../../services/venueService';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const ACCENT = '#10b981'; // Emerald Premium

export default function ManagerHome() {
    const router = useRouter();
    const { profile, theme, toggleTheme } = useAuth();
    const isDark = theme === 'dark';

    const [loading, setLoading] = useState(true);
    const [venues, setVenues] = useState<Tenant[]>([]);
    const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
    const [bookings, setBookings] = useState<Booking[]>([]);

    useEffect(() => {
        const run = async () => {
            const tenantIds = profile?.tenantIds || [];
            if (!tenantIds.length) {
                setLoading(false);
                return;
            }
            const list = await venueService.getVenuesByIds(tenantIds);
            setVenues(list);
            if (list.length && !selectedTenantId) setSelectedTenantId(list[0].id);
        };
        run();
    }, [profile?.tenantIds]);

    useEffect(() => {
        const run = async () => {
            if (!selectedTenantId) return;
            setLoading(true);
            const today = new Date();
            const b = await bookingService.getBookingsByTenantForDate(selectedTenantId, today);
            setBookings(b);
            setLoading(false);
        };
        run();
    }, [selectedTenantId]);

    const metrics = useMemo(() => {
        const todayCount = bookings.length;
        const checkedIn = bookings.filter(b => b.checkIn).length;
        const pending = todayCount - checkedIn;
        return { todayCount, checkedIn, pending };
    }, [bookings]);

    const reservasHoy = useMemo(() => {
        return bookings
            .slice()
            .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
            .map((b) => ({
                id: b.id || '',
                time: b.startTime,
                player: b.clientName,
                court: b.courtName || 'Cancha',
                status: b.checkIn ? 'checked_in' : 'pending',
                paid: b.paymentStatus === 'paid'
            }));
    }, [bookings]);

    return (
        <View className="flex-1 bg-white dark:bg-[#020617]">
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
            
            <View className="absolute inset-0 pointer-events-none">
                <LinearGradient
                    colors={isDark ? ['#020617', '#064e3b15', '#020617'] : ['#f8fafc', '#ffffff']}
                    style={StyleSheet.absoluteFill}
                />
            </View>

            <ScrollView 
                className="flex-1" 
                contentContainerStyle={{ paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
            >
                <View className="pt-20 pb-10 px-8">
                    <View className="flex-row justify-between items-start mb-2">
                        <View>
                            <View className="flex-row items-center mb-3">
                                <View className="px-3 h-6 rounded-full items-center justify-center shadow-lg" style={{ backgroundColor: ACCENT }}>
                                    <Text className="text-white font-black text-[8px] uppercase tracking-widest">Operativo</Text>
                                </View>
                                <Text className="ml-3 text-slate-400 font-black text-[9px] uppercase tracking-[0.3em]">Gestión de Recinto</Text>
                            </View>
                            <Text className="text-slate-900 dark:text-white font-black text-5xl tracking-tighter leading-none">
                                Inicio
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={toggleTheme}
                            className="w-14 h-14 bg-white/40 dark:bg-white/10 rounded-[24px] items-center justify-center border border-white dark:border-white/10"
                        >
                            {isDark ? <Sun color={ACCENT} size={22} /> : <Moon color="#0F172A" size={22} />}
                        </TouchableOpacity>
                    </View>
                </View>

                <View className="px-6 mb-12">
                    <TouchableOpacity
                        onPress={() => router.push('/(owner)/escaner')}
                        activeOpacity={0.9}
                        className="w-full relative overflow-hidden rounded-[44px] shadow-2xl shadow-emerald-500/30"
                        style={{ height: 260 }}
                    >
                        <LinearGradient
                            colors={[ACCENT, '#064e3b']}
                            className="flex-1 items-center justify-center p-8"
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <View className="bg-white/10 w-28 h-28 rounded-[36px] items-center justify-center mb-6 border border-white/10">
                                <QrCode color="white" size={56} strokeWidth={2.5} />
                            </View>
                            <Text className="text-white font-black uppercase tracking-[0.4em] text-2xl">Validar QR</Text>
                            <Text className="text-white/60 font-black text-[9px] uppercase tracking-[0.2em] mt-2">Control de ingresos del día</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                <View className="px-8 mb-12">
                    <Text className="text-slate-400 font-black text-[9px] uppercase tracking-[0.4em] mb-6 ml-2">Resumen de hoy</Text>
                    <View className="flex-row justify-between">
                        <MetricCard label="Total Reservas" value={metrics.todayCount} icon={Calendar} color="#64748b" />
                        <MetricCard label="Check-In" value={metrics.checkedIn} icon={Users} color={ACCENT} />
                        <MetricCard label="Pendientes" value={metrics.pending} icon={Clock} color="#f59e0b" />
                    </View>
                </View>

                {venues.length > 1 && (
                    <View className="mb-12 px-8">
                        <Text className="text-slate-400 font-black text-[9px] uppercase tracking-[0.4em] mb-6 ml-2">Selector de Recinto</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-2 px-2">
                            {venues.map(v => (
                                <TouchableOpacity
                                    key={v.id}
                                    onPress={() => setSelectedTenantId(v.id)}
                                    className={`h-14 px-8 rounded-[20px] items-center justify-center flex-row border mr-3 ${selectedTenantId === v.id ? 'bg-[#10b981]/10 border-[#10b981]/30' : 'bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/5'}`}
                                >
                                    <Building2 size={16} color={selectedTenantId === v.id ? ACCENT : '#64748b'} className="mr-3" />
                                    <Text className={`font-black text-[10px] uppercase tracking-widest ${selectedTenantId === v.id ? 'text-[#10b981]' : 'text-slate-400'}`}>
                                        {v.name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}

                <View className="px-8">
                    <View className="flex-row justify-between items-center mb-8 px-2">
                        <Text className="text-slate-900 dark:text-white font-black text-2xl tracking-tighter uppercase">Agenda del Día</Text>
                        <View className="bg-slate-100 dark:bg-white/5 px-4 h-8 rounded-full items-center justify-center">
                            <Text className="text-slate-500 font-black text-[8px] uppercase tracking-widest">{new Date().toLocaleDateString('es-CL', { weekday: 'long' })}</Text>
                        </View>
                    </View>

                    {loading ? (
                        <ActivityIndicator color={ACCENT} size="large" />
                    ) : (
                        <View className="space-y-4">
                            {reservasHoy.length === 0 ? (
                                <View className="py-20 items-center justify-center border-2 border-dashed border-slate-100 dark:border-white/5 rounded-[44px]">
                                    <Text className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.4em]">Sin actividad programada</Text>
                                </View>
                            ) : reservasHoy.map((reserva) => (
                                <View
                                    key={reserva.id}
                                    className={`rounded-[32px] p-6 flex-row items-center justify-between border ${reserva.status === 'checked_in' ? 'bg-slate-50/50 dark:bg-white/[0.02] border-slate-100 dark:border-white/5 opacity-60' : 'bg-white dark:bg-white/[0.04] border-slate-100 dark:border-white/10 shadow-lg'}`}
                                >
                                    <View className="flex-row items-center flex-1">
                                        <View className={`w-14 h-14 rounded-2xl items-center justify-center mr-5 ${reserva.status === 'checked_in' ? 'bg-emerald-500/10' : 'bg-slate-100 dark:bg-white/10'}`}>
                                            <Clock color={reserva.status === 'checked_in' ? ACCENT : (isDark ? '#FFF' : '#0F172A')} size={24} strokeWidth={2.5} />
                                        </View>
                                        <View className="flex-1">
                                            <Text className={`font-black text-lg tracking-tighter uppercase leading-none mb-1 ${reserva.status === 'checked_in' ? 'text-slate-400' : 'text-slate-900 dark:text-white'}`}>{reserva.player.split(' ')[0]}</Text>
                                            <Text className="text-slate-500 font-black text-[9px] uppercase tracking-[0.2em]">{reserva.time} • {reserva.court}</Text>
                                        </View>
                                    </View>
                                    
                                    <View>
                                        {reserva.status === 'checked_in' ? (
                                            <CheckCircle2 color={ACCENT} size={24} />
                                        ) : (
                                            <View className={`px-4 h-7 rounded-full items-center justify-center border ${reserva.paid ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
                                                <Text className={`font-black text-[8px] uppercase tracking-widest ${reserva.paid ? 'text-emerald-500' : 'text-amber-500'}`}>
                                                    {reserva.paid ? 'PAGADO' : 'PENDIENTE'}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

function MetricCard({ label, value, icon: Icon, color = '#64748b' }: any) {
    return (
        <View className="bg-white dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 rounded-[32px] p-5 items-center justify-center" style={{ width: (width - 76) / 3 }}>
            <View className="w-10 h-10 rounded-2xl bg-slate-50 dark:bg-white/5 items-center justify-center mb-3">
                <Icon size={18} color={color} />
            </View>
            <Text className="text-slate-900 dark:text-white font-black text-2xl tracking-tighter leading-none">{value}</Text>
            <Text className="text-slate-400 font-bold text-[7px] uppercase tracking-[0.2em] mt-2 text-center">{label}</Text>
        </View>
    );
}
