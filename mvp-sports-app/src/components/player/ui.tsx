import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { PLAYER, playerColors } from '../../theme/player';

// Piezas compartidas del área Jugador con el lenguaje de la PWA.

// Control segmentado para elegir función/vista dentro de una pantalla
export function SegmentedTabs<T extends string>({ isDark, value, onChange, options }: {
    isDark: boolean;
    value: T;
    onChange: (v: T) => void;
    options: { id: T; label: string; icon?: any }[];
}) {
    const C = playerColors(isDark);
    return (
        <View accessibilityRole="tablist" style={{ flexDirection: 'row', padding: 4, borderRadius: PLAYER.radius, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F1F5F9' }}>
            {options.map(({ id, label, icon: Icon }) => {
                const on = value === id;
                const color = on ? (isDark ? '#34d399' : '#059669') : C.sub;
                return (
                    <Pressable key={id} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => onChange(id)}
                        style={{ flex: 1, height: 36, borderRadius: PLAYER.radius, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, backgroundColor: on ? (isDark ? PLAYER.dark.card : '#FFFFFF') : 'transparent' }}>
                        {Icon ? <Icon size={14} color={color} /> : null}
                        <Text numberOfLines={1} style={{ fontSize: PLAYER.font.sm, fontWeight: '600', color }}>{label}</Text>
                    </Pressable>
                );
            })}
        </View>
    );
}

// Encabezado de sección con línea verde
export function SectionPill({ label }: { label: string }) {
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20, marginBottom: 10 }}>
            <View style={{ width: 24, height: 2, backgroundColor: PLAYER.accent, borderRadius: 2 }} />
            <Text style={{ fontSize: PLAYER.font.xs, fontWeight: '700', color: PLAYER.accent, letterSpacing: 1.3, textTransform: 'uppercase' }}>{label}</Text>
        </View>
    );
}

// Encabezado de pantalla: título centrado y botón opcional a la izquierda
export function ScreenHeader({ title, isDark, left, right }: { title: string; isDark: boolean; left?: React.ReactNode; right?: React.ReactNode }) {
    const C = playerColors(isDark);
    return (
        <View style={{ paddingTop: 52, paddingBottom: 12, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 40 }}>{left}</View>
            <Text style={{ flex: 1, textAlign: 'center', color: C.text, fontSize: PLAYER.font.lg, fontWeight: '900', textTransform: 'uppercase', letterSpacing: -0.3 }}>{title}</Text>
            <View style={{ width: 40, alignItems: 'flex-end' }}>{right}</View>
        </View>
    );
}
