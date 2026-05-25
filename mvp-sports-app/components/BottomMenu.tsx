import React from 'react';
import { View, TouchableOpacity, Platform, Dimensions } from 'react-native';
import { Home, MapPin, User, CalendarRange } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../store/useAuth';

const { width } = Dimensions.get('window');

const THEME = {
    home: '#10b981',
    mapa: '#10b981',
    reservas: '#3b82f6',
    perfil: '#8b5cf6'
};

interface BottomMenuProps {
    activeTab: 'home' | 'mapa' | 'reservas' | 'perfil';
}

export default function BottomMenu({ activeTab }: BottomMenuProps) {
    const router = useRouter();
    const { theme } = useAuth();
    const isDark = theme === 'dark';

    const C = {
        bg: isDark ? '#0F172A' : '#FFFFFF',
        border: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
        inactive: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(15,23,42,0.3)',
        activeIcon: '#FFFFFF'
    };

    const handlePress = (tab: 'home' | 'mapa' | 'reservas' | 'perfil') => {
        if (tab === activeTab) return;
        
        if (tab === 'home') {
            // Regresar al Home limpio en el stack
            router.replace('/(player)/');
        } else {
            router.push(`/(player)/${tab}` as any);
        }
    };

    const renderItem = (tab: 'home' | 'mapa' | 'reservas' | 'perfil', Icon: any, activeColor: string) => {
        const focused = activeTab === tab;
        return (
            <TouchableOpacity
                key={tab}
                onPress={() => handlePress(tab)}
                activeOpacity={0.8}
                style={{
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%'
                }}
            >
                <View style={{
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: focused ? 58 : 44,
                    height: focused ? 58 : 44,
                    borderRadius: 22,
                    backgroundColor: focused ? activeColor : 'transparent',
                    marginTop: focused ? -25 : 0,
                    shadowColor: activeColor,
                    shadowOpacity: focused ? 0.4 : 0,
                    shadowRadius: 12,
                    elevation: focused ? 10 : 0,
                    borderWidth: focused ? 2 : 0,
                    borderColor: 'rgba(255,255,255,0.2)'
                }}>
                    <Icon 
                        color={focused ? C.activeIcon : C.inactive} 
                        size={focused ? 24 : 22} 
                        strokeWidth={focused ? 2.5 : 2} 
                    />
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: Platform.OS === 'ios' ? 95 : 85,
            backgroundColor: C.bg,
            borderTopWidth: 1,
            borderTopColor: C.border,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: Platform.OS === 'ios' ? 30 : 25,
            paddingTop: 12,
            shadowColor: '#000',
            shadowOpacity: 0.1,
            shadowRadius: 15,
            elevation: 10,
            zIndex: 9999
        }}>
            {renderItem('home', Home, THEME.home)}
            {renderItem('mapa', MapPin, THEME.mapa)}
            {renderItem('reservas', CalendarRange, THEME.reservas)}
            {renderItem('perfil', User, THEME.perfil)}
        </View>
    );
}
