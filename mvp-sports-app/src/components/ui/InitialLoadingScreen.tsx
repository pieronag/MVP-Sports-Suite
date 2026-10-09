/// <reference types="nativewind/types" />
import React, { useEffect } from 'react';
import { View, Image, Text, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../../store/useAuth';

// Fix for TypeScript className errors
const StyledView = View as any;
const StyledText = Text as any;
const StyledImage = Image as any;
const StyledLinearGradient = LinearGradient as any;

export const InitialLoadingScreen = () => {
    const { theme } = useAuth();
    const isDark = theme === 'dark';

    const progress = React.useRef(new Animated.Value(0)).current;
    const fadeAnim = React.useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Fade in logo
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        }).start();

        // Animate progress bar simulating load
        Animated.loop(
            Animated.sequence([
                Animated.timing(progress, {
                    toValue: 1,
                    duration: 1500,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: false,
                }),
                Animated.timing(progress, {
                    toValue: 0,
                    duration: 0,
                    useNativeDriver: false,
                })
            ])
        ).start();
    }, []);

    const width = progress.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
    });

    return (
        <StyledView className="flex-1 bg-white dark:bg-[#020617] items-center justify-center">
            {/* Minimalist Background Gradients */}
            <StyledView className="absolute inset-0 pointer-events-none overflow-hidden">
                <StyledLinearGradient
                    colors={isDark ? ['#020617', '#0f172a'] : ['#f8fafc', '#ffffff']}
                    className="absolute inset-0"
                />
            </StyledView>

            <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
                {/* Extra Large Logo - Vectorized Style */}
                <StyledImage
                    source={require('../../../assets/images/Logo.png')}
                    style={{
                        width: 350,
                        height: 150,
                        tintColor: isDark ? undefined : '#0F172A',
                        marginBottom: 40
                    }}
                    resizeMode="contain"
                />

                {/* Loading Container */}
                <StyledView className="w-64 items-center">
                    <StyledText className="text-slate-400 dark:text-slate-500 font-bold text-[11px] uppercase tracking-[0.6em] mb-4">
                        CARGANDO...
                    </StyledText>

                    {/* Progress Bar Track */}
                    <StyledView className="w-full h-1.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden border border-slate-200/50 dark:border-white/5">
                        <Animated.View
                            style={{
                                width,
                                backgroundColor: '#10b981',
                                height: '100%',
                                borderRadius: 4,
                                shadowColor: '#10b981',
                                shadowOffset: { width: 0, height: 0 },
                                shadowOpacity: 0.8,
                                shadowRadius: 15,
                                elevation: 5,
                            }}
                        />
                    </StyledView>
                </StyledView>
            </Animated.View>
        </StyledView>
    );
};
