import React, { useEffect } from 'react';
import { View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useAuth } from '../../store/useAuth';
import { useColorScheme } from 'nativewind';
import { InitialLoadingScreen } from '../../src/components/ui/InitialLoadingScreen';

export default function PlayerLayout() {
    const { user, theme, profile, isLoading } = useAuth();
    const { setColorScheme } = useColorScheme();
    const router = useRouter();
    const segments = useSegments();
    const [minTimeElapsed, setMinTimeElapsed] = React.useState(false);

    // Profile Completion Logic
    useEffect(() => {
        // Solo actuar si ya pasó el tiempo de carga mínimo y tenemos un usuario
        if (!minTimeElapsed || isLoading || !user) return;

        // Si el perfil es null, es que aún no existe en Firestore (registro nuevo)
        // o hubo un error de carga. En cualquier caso, debemos ir a preferencias.
        const isPreferencias = segments.includes('preferencias');
        
        const isComplete = profile && 
            profile.displayName?.trim() && 
            profile.phone?.trim() && 
            profile.rut?.trim() && 
            profile.mainSport?.trim();

        if (!isComplete && !isPreferencias) {
            // Usar setImmediate o un pequeño timeout para asegurar que el stack esté listo
            const timer = setTimeout(() => {
                router.replace('/(player)/(tabs)/preferencias');
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [user, profile, isLoading, segments, minTimeElapsed]);

    React.useEffect(() => {
        // Sync NativeWind with useAuth theme
        setColorScheme(theme);
    }, [theme]);

    React.useEffect(() => {
        // Minimum loading time
        const timer = setTimeout(() => {
            setMinTimeElapsed(true);
        }, 1500); 

        return () => {
            clearTimeout(timer);
        };
    }, []);

    if (!minTimeElapsed && !user) {
        return <InitialLoadingScreen />;
    }

    return (
        <Stack
            screenOptions={{
                headerShown: false,
                animation: 'fade_from_bottom'
            }}
        >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="estadisticas" options={{ presentation: 'card' }} />
            <Stack.Screen name="reporte" options={{ presentation: 'card' }} />
            <Stack.Screen name="clubes/[id]" />
        </Stack>
    );
}
