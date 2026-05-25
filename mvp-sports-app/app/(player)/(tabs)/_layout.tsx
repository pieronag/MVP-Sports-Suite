import React from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Home, MapPin, User, CalendarRange } from 'lucide-react-native';
import { View, Platform } from 'react-native';
import { useAuth } from '../../../store/useAuth';

const THEME = {
    home: '#10b981',
    mapa: '#10b981',
    reservas: '#3b82f6',
    perfil: '#8b5cf6'
};

export default function TabsLayout() {
    const { theme } = useAuth();
    const isDark = theme === 'dark';
    const router = useRouter();

    const C = {
        bg: isDark ? '#0F172A' : '#FFFFFF',
        border: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
        inactive: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(15,23,42,0.3)'
    };

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    display: 'none',
                    backgroundColor: C.bg,
                    borderTopWidth: 1,
                    borderTopColor: C.border,
                    height: Platform.OS === 'ios' ? 95 : 85,
                    paddingBottom: Platform.OS === 'ios' ? 30 : 25,
                    paddingTop: 12,
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    elevation: 0,
                    shadowColor: '#000',
                    shadowOpacity: 0.1,
                    shadowRadius: 15,
                },
                tabBarActiveTintColor: isDark ? '#FFFFFF' : '#0F172A',
                tabBarInactiveTintColor: C.inactive,
                tabBarShowLabel: false,
            }}
        >
            {/* INICIO */}
            <Tabs.Screen
                name="index"
                options={{
                    tabBarIcon: ({ focused, color }) => (
                        <View style={{
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: focused ? 58 : 44,
                            height: focused ? 58 : 44,
                            borderRadius: 22,
                            backgroundColor: focused ? THEME.home : 'transparent',
                            marginTop: focused ? -25 : 0,
                            shadowColor: THEME.home,
                            shadowOpacity: focused ? 0.4 : 0,
                            shadowRadius: 12,
                            elevation: focused ? 10 : 0,
                            borderWidth: focused ? 2 : 0,
                            borderColor: 'rgba(255,255,255,0.2)'
                        }}>
                            <Home color={focused ? '#FFFFFF' : color} size={focused ? 24 : 22} strokeWidth={focused ? 2.5 : 2} />
                        </View>
                    ),
                }}
            />

        </Tabs>
    );
}
