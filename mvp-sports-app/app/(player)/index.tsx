import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StatusBar, Image } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../store/useAuth';
import { gamificationService, GamificationSettings } from '../../services/gamificationService';
import { bookingService, Booking } from '../../services/bookingService';
import BottomMenu from '../../components/BottomMenu';
import { PLAYER, playerColors } from '../../src/theme/player';
import {
    Trophy, CreditCard, Shield, TrendingUp, Swords, GraduationCap,
    ArrowRight, Calendar, Clock, MapPin, ChevronRight,
} from '../../src/components/player/icons';

// Inicio igual a la PWA: saludo compacto, acción principal, próxima reserva, explorar y carta MVP.
// "Explorar" solo lleva a lo que no está en la barra inferior.
const QUICK_ITEMS = [
    { icon: Swords, label: 'Partidos', color: '#f97316', href: '/(player)/equipos/explore' },
    { icon: Shield, label: 'Equipos', color: '#3b82f6', href: '/(player)/equipos/explore' },
    { icon: Trophy, label: 'Torneos', color: '#f43f5e', href: '/(player)/torneos' },
    { icon: GraduationCap, label: 'Academias', color: '#eab308', href: '/(player)/academias' },
    { icon: TrendingUp, label: 'Estadísticas', color: '#ec4899', href: '/(player)/estadisticas' },
    { icon: CreditCard, label: 'Pagos', color: '#14b8a6', href: '/(player)/billetera' },
];

// Fecha de la reserva como Date local (acepta Timestamp o "YYYY-MM-DD")
const bookingDay = (b: any): Date | null => {
    const d = b?.date;
    if (!d) return null;
    if (d.toDate) return d.toDate();
    if (d.seconds) return new Date(d.seconds * 1000);
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(d))) return new Date(`${d}T12:00:00`);
    return new Date(d);
};

export default function PlayerHome() {
    const router = useRouter();
    const { user, profile, theme } = useAuth();
    const isDark = theme === 'dark';
    const C = playerColors(isDark);
    const [gamification, setGamification] = useState<GamificationSettings | null>(null);
    const [nextBooking, setNextBooking] = useState<Booking | null>(null);

    useFocusEffect(
        React.useCallback(() => {
            gamificationService.getSettings().then(setGamification);
            useAuth.getState().reloadProfile();
        }, [])
    );

    useEffect(() => {
        if (!user?.uid) return;
        bookingService.getUserBookings(user.uid).then((all) => {
            const today = new Date(); today.setHours(0, 0, 0, 0);
            const upcoming = all
                .filter((b) => !['cancelled', 'completed', 'past', 'no-show'].includes(b.status))
                .map((b) => ({ b, d: bookingDay(b) }))
                .filter((x) => x.d && x.d >= today)
                .sort((a, b) => (a.d!.getTime() - b.d!.getTime()) || String(a.b.startTime).localeCompare(String(b.b.startTime)));
            setNextBooking(upcoming[0]?.b || null);
        }).catch(() => {});
    }, [user?.uid]);

    const rawName = profile?.displayName || user?.displayName || 'Jugador';
    const firstName = rawName.split(' ')[0].replace(/^./, (c) => c.toUpperCase());
    const initials = rawName.split(' ').map((w) => w.charAt(0).toUpperCase()).slice(0, 2).join('');
    const xp = profile?.xp || 0;
    const tier = gamification ? gamificationService.calculateTier(xp, gamification) : { name: 'Bronce', index: 0 };
    const ovr = gamification ? gamificationService.calculateOVR(xp, gamification) : 40;

    const nb = nextBooking as any;
    const nbDay = nb ? bookingDay(nb) : null;
    const isTodayBooking = nbDay ? nbDay.toDateString() === new Date().toDateString() : false;
    const card = { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: PLAYER.radius } as const;

    return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={C.bg} />
            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 56, paddingBottom: 110, gap: 22 }} showsVerticalScrollIndicator={false}>
                {/* Saludo + identidad compacta */}
                <Pressable onPress={() => router.push('/(player)/perfil')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 48, height: 48, borderRadius: PLAYER.radius, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(16,185,129,0.1)' }}>
                        {profile?.photoURL
                            ? <Image source={{ uri: profile.photoURL }} style={{ width: 48, height: 48 }} />
                            : <Text style={{ color: PLAYER.accent, fontWeight: '700', fontSize: PLAYER.font.lg }}>{initials}</Text>}
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text numberOfLines={1} style={{ color: C.text, fontSize: PLAYER.font.display, fontWeight: '900', letterSpacing: -0.3 }}>Hola, {firstName}</Text>
                        <Text style={{ color: C.sub, fontSize: PLAYER.font.sm, fontWeight: '500' }}>
                            <Text style={{ color: PLAYER.accent, fontWeight: '600' }}>{tier.name}</Text> · {ovr} OVR · {xp.toLocaleString('es-CL')} XP
                        </Text>
                    </View>
                    <ChevronRight size={18} color={C.sub} />
                </Pressable>

                {/* Acción principal */}
                <Pressable onPress={() => router.push('/(player)/clubes/explore')} style={({ pressed }) => ({ backgroundColor: PLAYER.accent, borderRadius: PLAYER.radius, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14, opacity: pressed ? 0.9 : 1 })}>
                    <View style={{ width: 46, height: 46, borderRadius: PLAYER.radius, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                        <Calendar size={22} color="white" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: 'white', fontSize: PLAYER.font.xl, fontWeight: '900' }}>Reservar cancha</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: PLAYER.font.sm, fontWeight: '500' }}>Elige recinto, día y hora en segundos</Text>
                    </View>
                    <ArrowRight size={20} color="white" />
                </Pressable>

                {/* Próxima reserva */}
                {nb && nbDay && (
                    <Pressable onPress={() => router.push({ pathname: '/(player)/ticket', params: { bookingId: nb.id } } as any)} style={{ ...card, padding: 16 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <Text style={{ fontSize: PLAYER.font.xs, fontWeight: '600', color: isTodayBooking ? PLAYER.accent : C.sub }}>{isTodayBooking ? 'Juegas hoy' : 'Tu próxima reserva'}</Text>
                            {nb.paymentStatus !== 'paid' && (
                                <Text style={{ fontSize: PLAYER.font.xs, fontWeight: '600', color: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: PLAYER.radius, overflow: 'hidden' }}>Pago pendiente</Text>
                            )}
                        </View>
                        <Text style={{ fontSize: PLAYER.font.lg, fontWeight: '600', color: C.text }}>{nb.courtName || 'Cancha'}{nb.sport ? ` · ${nb.sport}` : ''}</Text>
                        <View style={{ flexDirection: 'row', gap: 16, marginTop: 6 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Calendar size={14} color={C.sub} /><Text style={{ color: C.sub, fontSize: PLAYER.font.sm }}>{nbDay.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' })}</Text></View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Clock size={14} color={C.sub} /><Text style={{ color: C.sub, fontSize: PLAYER.font.sm }}>{nb.startTime} hrs</Text></View>
                        </View>
                        {nb.tenantName ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}><MapPin size={14} color={C.sub} /><Text style={{ color: C.sub, fontSize: PLAYER.font.sm }}>{nb.tenantName}</Text></View> : null}
                    </Pressable>
                )}

                {/* Explorar */}
                <View>
                    <Text style={{ fontSize: PLAYER.font.sm, fontWeight: '600', color: C.sub, marginBottom: 10 }}>Explorar</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                        {QUICK_ITEMS.map((item) => (
                            <Pressable key={item.label} onPress={() => router.push(item.href as any)} style={({ pressed }) => ({ ...card, width: '31.2%', padding: 12, gap: 10, opacity: pressed ? 0.85 : 1 })}>
                                <item.icon size={22} color={item.color} strokeWidth={1.75} />
                                <Text style={{ fontSize: PLAYER.font.sm, fontWeight: '600', color: C.text }}>{item.label}</Text>
                            </Pressable>
                        ))}
                    </View>
                </View>

                {/* Carta MVP */}
                <Pressable onPress={() => router.push('/(player)/perfil')} style={{ ...card, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                    <View style={{ width: 52, height: 66, borderRadius: PLAYER.radius, backgroundColor: '#f59e0b', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-4deg' }] }}>
                        <Text style={{ color: 'rgba(0,0,0,0.6)', fontSize: 11, fontWeight: '500' }}>OVR</Text>
                        <Text style={{ color: 'black', fontSize: 16, fontWeight: '800' }}>{ovr}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: PLAYER.font.base, fontWeight: '600', color: C.text }}>Tu carta MVP 2026</Text>
                        <Text style={{ fontSize: PLAYER.font.sm, color: C.sub }}>Genérala y compártela con tus stats</Text>
                    </View>
                    <ChevronRight size={18} color={C.sub} />
                </Pressable>
            </ScrollView>
            <BottomMenu activeTab="home" />
        </View>
    );
}
