import React from 'react';
import { Tabs } from 'expo-router';
import { LayoutDashboard, ScanLine, User } from 'lucide-react-native';
import { useAuth } from '../../store/useAuth';

export default function ManagerLayout() {
    const { theme } = useAuth();
    const isDark = theme === 'dark';

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: isDark ? '#0B0F19' : '#ffffff',
                    borderTopColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                    height: 90,
                    paddingBottom: 30,
                    paddingTop: 10,
                    elevation: 0,
                    shadowOpacity: 0,
                },
                tabBarActiveTintColor: '#10b981',
                tabBarInactiveTintColor: isDark ? '#475569' : '#94a3b8',
                tabBarLabelStyle: {
                    fontFamily: 'System',
                    fontWeight: '900',
                    fontSize: 10,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                }
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Check-in',
                    tabBarIcon: ({ color }) => <ScanLine color={color} size={24} />,
                }}
            />
            <Tabs.Screen
                name="escaner"
                options={{
                    href: null, // Ocultar del botón inferior
                    tabBarStyle: { display: 'none' }, // BLINDAJE: Apaga el menú por completo en esta pantalla
                }}
            />
            <Tabs.Screen
                name="perfil"
                options={{
                    title: 'Perfil',
                    tabBarIcon: ({ color }) => <User color={color} size={24} />,
                }}
            />
        </Tabs>
    );
}
