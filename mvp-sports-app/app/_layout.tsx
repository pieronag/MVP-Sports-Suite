import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { View, Platform } from 'react-native';
import { useAuth } from '../store/useAuth';
import '../global.css';

import { useFonts, Inter_100Thin, Inter_400Regular, Inter_700Bold, Inter_900Black } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import { configureReanimatedLogger, ReanimatedLogLevel } from 'react-native-reanimated';

configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false,
});

import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../src/lib/query-client';

if (Platform.OS !== 'web') {
  SplashScreen.preventAutoHideAsync().catch(() => { });
}

export default function RootLayout() {
  const { user, role, isLoading, initSession, theme } = useAuth();
  const { setColorScheme } = useColorScheme();
  const segments = useSegments();
  const router = useRouter();

  const [fontsLoaded, fontError] = useFonts({
    Inter_100Thin, Inter_400Regular, Inter_700Bold, Inter_900Black,
  });

  // Sincronización de Tema (Premium Dark Mode)
  useEffect(() => {
    setColorScheme(theme as 'light' | 'dark');
  }, [theme]);

  useEffect(() => {
    return initSession();
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => { });
    }
  }, [fontsLoaded, fontError]);

  // Sistema de Protección de Rutas (Auth Guard)
  useEffect(() => {
    if (isLoading || !fontsLoaded) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      router.replace('/login');
    } else if (user) {
      const isPlayerPath = segments[0] === '(player)';
      const isOwnerPath = segments[0] === '(owner)';

      if ((role === 'player' || role === 'owner' || role === 'superadmin') && !isPlayerPath) {
        router.replace('/(player)');
      } else if (role === 'manager' && !isOwnerPath) {
        router.replace('/(owner)');
      } else if (!isPlayerPath && !isOwnerPath && !inAuthGroup) {
        router.replace('/');
      }
    }
  }, [user, role, isLoading, segments, fontsLoaded]);

  if (isLoading || !fontsLoaded) {
    return <View className="flex-1 bg-white dark:bg-[#020617]" />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <View className="flex-1 bg-white dark:bg-[#020617]">
          <Stack screenOptions={{ 
            headerShown: false, 
            animation: 'slide_from_right',
            contentStyle: { backgroundColor: theme === 'dark' ? '#020617' : '#F8FAFC' }
          }}>
            <Stack.Screen name="(auth)/login" />
            <Stack.Screen name="(player)" />
            <Stack.Screen name="(owner)" />
          </Stack>
        </View>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}