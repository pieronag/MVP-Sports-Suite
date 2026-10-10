import React, { useState } from 'react';
import { View, Text, Pressable, Modal, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../store/useAuth';
import { PLAYER, playerColors } from '../src/theme/player';
import {
    Home, Calendar, MapPin, User, Menu, Building2, Shield, Trophy, GraduationCap,
    TrendingUp, CreditCard, Settings, ClipboardList, X, LogOut,
} from '../src/components/player/icons';

// Barra inferior igual a la PWA: Inicio, Reservas, Mapa, Perfil y Más (hoja con el resto).
type Tab = 'home' | 'reservas' | 'mapa' | 'perfil';

const TABS: { id: Tab; label: string; icon: any; href: string }[] = [
    { id: 'home', label: 'Inicio', icon: Home, href: '/(player)/' },
    { id: 'reservas', label: 'Reservas', icon: Calendar, href: '/(player)/reservas' },
    { id: 'mapa', label: 'Mapa', icon: MapPin, href: '/(player)/mapa' },
    { id: 'perfil', label: 'Perfil', icon: User, href: '/(player)/perfil' },
];

// El menú Más no repite la barra: solo lo que no cabe en ella
const PLAY_LINKS = [
    { href: '/(player)/clubes/explore', icon: Building2, label: 'Recintos' },
    { href: '/(player)/equipos/explore', icon: Shield, label: 'Equipos' },
    { href: '/(player)/torneos', icon: Trophy, label: 'Torneos' },
    { href: '/(player)/academias', icon: GraduationCap, label: 'Academias' },
];
const ACCOUNT_LINKS = [
    { href: '/(player)/estadisticas', icon: TrendingUp, label: 'Estadísticas' },
    { href: '/(player)/billetera', icon: CreditCard, label: 'Pagos' },
    { href: '/(player)/preferencias', icon: Settings, label: 'Ajustes' },
    { href: '/(player)/reporte', icon: ClipboardList, label: 'Soporte' },
];

export default function BottomMenu({ activeTab }: { activeTab: Tab }) {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { theme, signOut } = useAuth();
    const isDark = theme === 'dark';
    const C = playerColors(isDark);
    const [moreOpen, setMoreOpen] = useState(false);

    const go = (tab: Tab, href: string) => {
        if (tab === activeTab) return;
        if (tab === 'home') router.replace(href as any);
        else router.push(href as any);
    };
    const open = (href: string) => { setMoreOpen(false); router.push(href as any); };

    const Item = ({ label, icon: Icon, active, onPress }: { label: string; icon: any; active: boolean; onPress: () => void }) => (
        <Pressable onPress={onPress} accessibilityRole="tab" accessibilityState={{ selected: active }} accessibilityLabel={label}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 8 }}>
            <Icon size={22} color={active ? PLAYER.accent : C.muted} strokeWidth={active ? 2 : 1.6} />
            <Text style={{ fontSize: 10, fontWeight: '600', marginTop: 3, color: active ? PLAYER.accent : C.muted }}>{label}</Text>
        </Pressable>
    );

    const Link = ({ href, icon: Icon, label }: { href: string; icon: any; label: string }) => (
        <Pressable onPress={() => open(href)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingHorizontal: 16, borderRadius: PLAYER.radius, backgroundColor: pressed ? C.soft : 'transparent' })}>
            <Icon size={22} color={C.sub} />
            <Text style={{ marginLeft: 14, fontSize: PLAYER.font.lg, fontWeight: '600', color: C.text }}>{label}</Text>
        </Pressable>
    );

    return (
        <>
            <View style={{
                position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 50,
                flexDirection: 'row', backgroundColor: isDark ? PLAYER.dark.bg : '#FFFFFF',
                borderTopWidth: 1, borderTopColor: C.border,
                paddingBottom: Math.max(insets.bottom, Platform.OS === 'web' ? 8 : 10), height: 60 + Math.max(insets.bottom, 8),
            }}>
                {TABS.map(t => <Item key={t.id} label={t.label} icon={t.icon} active={activeTab === t.id} onPress={() => go(t.id, t.href)} />)}
                <Item label="Más" icon={Menu} active={moreOpen} onPress={() => setMoreOpen(true)} />
            </View>

            <Modal visible={moreOpen} transparent animationType="slide" onRequestClose={() => setMoreOpen(false)}>
                <Pressable onPress={() => setMoreOpen(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} />
                <View style={{ backgroundColor: isDark ? PLAYER.dark.card : '#FFFFFF', borderTopLeftRadius: 12, borderTopRightRadius: 12, borderTopWidth: 1, borderColor: C.border, paddingBottom: Math.max(insets.bottom, 12), maxHeight: '80%' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 }}>
                        <Text style={{ fontSize: PLAYER.font.xl, fontWeight: '700', color: C.text }}>Más</Text>
                        <Pressable onPress={() => setMoreOpen(false)} accessibilityLabel="Cerrar" style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
                            <X size={20} color={C.sub} />
                        </Pressable>
                    </View>
                    <ScrollView contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 8 }}>
                        <Text style={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 4, fontSize: PLAYER.font.sm, fontWeight: '600', color: C.muted }}>Jugar</Text>
                        {PLAY_LINKS.map(l => <Link key={l.href} {...l} />)}
                        <Text style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4, fontSize: PLAYER.font.sm, fontWeight: '600', color: C.muted }}>Mi cuenta</Text>
                        {ACCOUNT_LINKS.map(l => <Link key={l.href} {...l} />)}
                        {(
                            <Pressable onPress={async () => { setMoreOpen(false); await signOut(); router.replace('/(auth)/login' as any); }} style={{ flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingHorizontal: 16, marginTop: 8 }}>
                                <LogOut size={22} color="#ef4444" />
                                <Text style={{ marginLeft: 14, fontSize: PLAYER.font.lg, fontWeight: '600', color: '#ef4444' }}>Cerrar sesión</Text>
                            </Pressable>
                        )}
                    </ScrollView>
                </View>
            </Modal>
        </>
    );
}
