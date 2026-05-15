import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StatusBar, KeyboardAvoidingView, Platform, ScrollView, Image, ActivityIndicator, BackHandler } from 'react-native';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, Sun, Moon } from 'lucide-react-native';
import { useAuth } from '../../store/useAuth';
import { useRouter } from 'expo-router';

export default function AuthScreen() {
    const { theme, toggleTheme } = useAuth();
    const router = useRouter();
    const isDark = theme === 'dark';

    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    
    useEffect(() => {
        const backAction = () => {
            if (!isLogin) {
                setIsLogin(true);
                return true;
            }
            // En login, el back sale de la app para evitar volver a splash o estados raros
            BackHandler.exitApp();
            return true;
        };
        const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
        return () => backHandler.remove();
    }, [isLogin]);

    const validateFields = () => {
        if (!email.includes('@')) {
            Alert.alert('Error', 'Ingresa un correo electrónico válido.');
            return false;
        }
        if (password.length < 6) {
            Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres.');
            return false;
        }
        if (!isLogin && name.trim().length < 3) {
            Alert.alert('Error', 'Por favor, ingresa tu nombre completo.');
            return false;
        }
        return true;
    };

    const handleAuth = async () => {
        if (!validateFields()) return;

        setLoading(true);
        try {
            if (isLogin) {
                const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
                const user = userCredential.user;

                // REDIRECCIÓN PROACTIVA POR ROL
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    if (data.role === 'manager') {
                        router.replace('/(owner)');
                    } else {
                        router.replace('/(player)');
                    }
                }
            } else {
                const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
                const user = userCredential.user;

                await updateProfile(user, { displayName: name });

                // Registro normalizado en Firestore con Mascota Oficial MVP (Pantera Elite)
                await setDoc(doc(db, 'users', user.uid), {
                    uid: user.uid,
                    displayName: name,
                    email: email.toLowerCase().trim(),
                    photoURL: 'https://img.freepik.com/vector-premium/logotipo-mascota-pantera-negra-deportes-e-sports_195186-1335.jpg', // Mascota Pantera (MVP ADN)
                    role: 'player',
                    createdAt: new Date().toISOString(),
                    lastLogin: new Date().toISOString()
                });
            }
        } catch (error: any) {
            let message = 'Error de conexión. Inténtalo más tarde.';
            if (error.code === 'auth/invalid-credential') message = 'Correo o contraseña incorrectos.';
            if (error.code === 'auth/email-already-in-use') message = 'Este correo ya está registrado.';

            Alert.alert('MVP Sports', message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View className="flex-1 bg-white dark:bg-[#020617]">
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
            >
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 28, paddingTop: 60, paddingBottom: 40 }}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Theme Toggle Header */}
                    <View className="flex-row justify-end mb-6">
                        <TouchableOpacity
                            onPress={toggleTheme}
                            className="w-11 h-11 bg-slate-50 dark:bg-white/5 rounded-full items-center justify-center border border-slate-100 dark:border-white/10"
                        >
                            {isDark ? <Sun color="#10b981" size={20} /> : <Moon color="#0F172A" size={20} />}
                        </TouchableOpacity>
                    </View>

                    {/* Branding Section */}
                    <View className="items-center mb-12">
                        <Image
                            source={require('../../assets/images/Logo.png')}
                            style={{ width: 280, height: 130 }}
                            resizeMode="contain"
                            tintColor={isDark ? undefined : '#0F172A'}
                        />
                        <Text className="mt-6 text-4xl font-black tracking-tighter text-slate-900 dark:text-white uppercase">
                            MVP <Text className="text-emerald-500">Sports</Text>
                        </Text>
                        <View className="h-1 w-8 bg-emerald-500 rounded-full mt-2" />
                    </View>

                    {/* Form Section */}
                    <View className="gap-y-6">
                        {!isLogin && (
                            <View>
                                <Text className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 ml-1">Nombre Completo</Text>
                                <View className="flex-row items-center bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/10 h-16 rounded-2xl px-5">
                                    <User size={20} color="#10b981" />
                                    <TextInput
                                        placeholder="Tu nombre"
                                        placeholderTextColor="#64748b"
                                        className="flex-1 ml-4 text-slate-900 dark:text-white font-semibold text-base"
                                        value={name}
                                        onChangeText={setName}
                                    />
                                </View>
                            </View>
                        )}

                        <View>
                            <Text className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 ml-1">Email Corporativo</Text>
                            <View className="flex-row items-center bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/10 h-16 rounded-2xl px-5">
                                <Mail size={20} color="#10b981" />
                                <TextInput
                                    placeholder="usuario@mvpsports.com"
                                    placeholderTextColor="#64748b"
                                    className="flex-1 ml-4 text-slate-900 dark:text-white font-semibold text-base"
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                    value={email}
                                    onChangeText={setEmail}
                                />
                            </View>
                        </View>

                        <View>
                            <Text className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 ml-1">Contraseña</Text>
                            <View className="flex-row items-center bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/10 h-16 rounded-2xl px-5">
                                <Lock size={20} color="#10b981" />
                                <TextInput
                                    placeholder="••••••••"
                                    placeholderTextColor="#64748b"
                                    className="flex-1 ml-4 text-slate-900 dark:text-white font-semibold text-base"
                                    secureTextEntry={!showPassword}
                                    value={password}
                                    onChangeText={setPassword}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                    {showPassword ? <EyeOff size={20} color="#64748b" /> : <Eye size={20} color="#64748b" />}
                                </TouchableOpacity>
                            </View>
                        </View>

                        <TouchableOpacity
                            onPress={handleAuth}
                            disabled={loading}
                            activeOpacity={0.9}
                            className="mt-4"
                        >
                            <View className="bg-emerald-500 h-16 rounded-2xl items-center justify-center shadow-lg shadow-emerald-500/30 flex-row">
                                {loading ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <>
                                        <Text className="text-white font-black text-base uppercase tracking-widest mr-2">
                                            {isLogin ? 'Ingresar ahora' : 'Crear Cuenta'}
                                        </Text>
                                        <ArrowRight size={20} color="white" strokeWidth={3} />
                                    </>
                                )}
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Footer Nav */}
                    <View className="mt-10 items-center">
                        <TouchableOpacity
                            onPress={() => setIsLogin(!isLogin)}
                            className="flex-row items-center py-3 px-6 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/10"
                        >
                            <Text className="text-slate-500 dark:text-slate-400 font-bold text-sm">
                                {isLogin ? '¿No tienes cuenta?' : '¿Ya eres socio?'}
                            </Text>
                            <Text className="ml-2 text-emerald-500 font-black uppercase text-xs tracking-widest">
                                {isLogin ? 'Regístrate' : 'Inicia Sesión'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <Text className="mt-12 text-center text-[10px] font-bold text-slate-300 dark:text-slate-700 uppercase tracking-[0.4em]">
                        MVP Sports Premium v1.0.0
                    </Text>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}