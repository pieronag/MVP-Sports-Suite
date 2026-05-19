import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StatusBar, KeyboardAvoidingView, Platform, ScrollView, Image, ActivityIndicator, BackHandler, Modal } from 'react-native';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, sendEmailVerification, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, Sun, Moon, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react-native';
import { useAuth } from '../../store/useAuth';
import { useRouter } from 'expo-router';
import { emailService } from '../../services/emailService';

export default function AuthScreen() {
    const { theme, toggleTheme } = useAuth();
    const router = useRouter();
    const isDark = theme === 'dark';

    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [confirmEmail, setConfirmEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [modalConfig, setModalConfig] = useState<{
        visible: boolean;
        title: string;
        message: string;
        type: 'success' | 'error' | 'info' | 'verify';
        primaryActionLabel?: string;
        onPrimaryAction?: () => void;
        secondaryActionLabel?: string;
        onSecondaryAction?: () => void;
    }>({
        visible: false,
        title: '',
        message: '',
        type: 'info'
    });

    const showAlert = (
        title: string,
        message: string,
        type: 'success' | 'error' | 'info' | 'verify' = 'info',
        onPrimary?: () => void,
        primaryLabel?: string,
        onSecondary?: () => void,
        secondaryLabel?: string
    ) => {
        setModalConfig({
            visible: true,
            title,
            message,
            type,
            onPrimaryAction: onPrimary,
            primaryActionLabel: primaryLabel,
            onSecondaryAction: onSecondary,
            secondaryActionLabel: secondaryLabel
        });
    };
    
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
            showAlert('Error de Validación', 'Por favor ingresa un correo electrónico válido.', 'error');
            return false;
        }
        if (!isLogin && email.toLowerCase().trim() !== confirmEmail.toLowerCase().trim()) {
            showAlert('Error de Validación', 'Los correos electrónicos ingresados no coinciden.', 'error');
            return false;
        }
        if (password.length < 6) {
            showAlert('Error de Validación', 'La contraseña debe tener al menos 6 caracteres.', 'error');
            return false;
        }
        if (!isLogin && password !== confirmPassword) {
            showAlert('Error de Validación', 'Las contraseñas ingresadas no coinciden.', 'error');
            return false;
        }
        if (!isLogin && name.trim().length < 3) {
            showAlert('Error de Validación', 'Por favor, ingresa tu nombre completo.', 'error');
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

                if (!user.emailVerified) {
                    showAlert(
                        'Correo no verificado',
                        'Por favor verifica tu correo electrónico para activar tu cuenta. ¿Deseas recibir otro correo de verificación?',
                        'verify',
                        async () => {
                            try {
                                await emailService.sendAuthEmail(user.email || email.trim(), 'verify', name);
                                showAlert('Reenviado', 'Se ha enviado el correo de verificación.', 'success');
                            } catch (err: any) {
                                showAlert('Error', 'No se pudo enviar el correo de verificación.', 'error');
                            } finally {
                                await signOut(auth);
                            }
                        },
                        'Reenviar',
                        async () => {
                            await signOut(auth);
                        },
                        'Cancelar'
                    );
                    setLoading(false);
                    return;
                }

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

                // Registro normalizado en Firestore con Mascota Oficial MVP
                await setDoc(doc(db, 'users', user.uid), {
                    uid: user.uid,
                    displayName: name,
                    email: email.toLowerCase().trim(),
                    photoURL: '', // Defaults to mascot.jpg locally
                    role: 'player',
                    createdAt: new Date().toISOString(),
                    lastLogin: new Date().toISOString()
                });

                // Enviar correo de verificación personalizado
                await emailService.sendAuthEmail(email.trim(), 'verify', name);

                showAlert(
                    'Cuenta Creada',
                    'Te hemos enviado un correo de verificación. Por favor, confirma tu cuenta en tu correo para poder iniciar sesión.',
                    'success',
                    async () => {
                        await signOut(auth);
                        setIsLogin(true);
                        setEmail('');
                        setConfirmEmail('');
                        setPassword('');
                        setConfirmPassword('');
                        setName('');
                    },
                    'Entendido'
                );
            }
        } catch (error: any) {
            let message = 'Error de conexión. Inténtalo más tarde.';
            if (error.code === 'auth/invalid-credential') message = 'Correo o contraseña incorrectos.';
            if (error.code === 'auth/email-already-in-use') message = 'Este correo ya está registrado.';

            showAlert('MVP Sports', message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!email.includes('@')) {
            showAlert('Restablecer Contraseña', 'Por favor ingresa un correo electrónico válido en el campo superior.', 'error');
            return;
        }
        
        try {
            await emailService.sendAuthEmail(email.trim(), 'reset');
            showAlert('Éxito', `Se ha enviado un enlace para restablecer tu contraseña a ${email.trim()}.`, 'success');
        } catch (err: any) {
            let message = 'No se pudo enviar el correo de restablecimiento.';
            if (err.code === 'auth/user-not-found') message = 'No existe una cuenta registrada con este correo.';
            showAlert('Error', message, 'error');
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

                        {!isLogin && (
                            <View>
                                <Text className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 ml-1">Confirmar Email</Text>
                                <View className="flex-row items-center bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/10 h-16 rounded-2xl px-5">
                                    <Mail size={20} color="#10b981" />
                                    <TextInput
                                        placeholder="usuario@mvpsports.com"
                                        placeholderTextColor="#64748b"
                                        className="flex-1 ml-4 text-slate-900 dark:text-white font-semibold text-base"
                                        autoCapitalize="none"
                                        keyboardType="email-address"
                                        value={confirmEmail}
                                        onChangeText={setConfirmEmail}
                                    />
                                </View>
                            </View>
                        )}

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

                        {isLogin && (
                            <TouchableOpacity 
                                onPress={handleForgotPassword}
                                className="mt-1"
                            >
                                <Text className="text-emerald-500 font-bold text-xs text-right mr-1">
                                    ¿Olvidaste tu contraseña?
                                </Text>
                            </TouchableOpacity>
                        )}

                        {!isLogin && (
                            <View>
                                <Text className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 ml-1">Confirmar Contraseña</Text>
                                <View className="flex-row items-center bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/10 h-16 rounded-2xl px-5">
                                    <Lock size={20} color="#10b981" />
                                    <TextInput
                                        placeholder="••••••••"
                                        placeholderTextColor="#64748b"
                                        className="flex-1 ml-4 text-slate-900 dark:text-white font-semibold text-base"
                                        secureTextEntry={!showPassword}
                                        value={confirmPassword}
                                        onChangeText={setConfirmPassword}
                                    />
                                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                        {showPassword ? <EyeOff size={20} color="#64748b" /> : <Eye size={20} color="#64748b" />}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

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
                            onPress={() => {
                                setIsLogin(!isLogin);
                                setEmail('');
                                setConfirmEmail('');
                                setPassword('');
                                setConfirmPassword('');
                                setName('');
                            }}
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

                    <Text className="mt-12 text-center text-[10px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-[0.4em]">
                         MVP SPORTS CHILE • 2026
                    </Text>
                </ScrollView>
            </KeyboardAvoidingView>
            {/* Custom Modal Notification */}
            <Modal
                transparent
                visible={modalConfig.visible}
                animationType="fade"
                onRequestClose={() => setModalConfig(prev => ({ ...prev, visible: false }))}
            >
                <View className="flex-1 bg-black/60 items-center justify-center px-6">
                    <View className="w-full max-w-sm bg-white dark:bg-[#0f172a] rounded-[2.5rem] p-6 border border-slate-100 dark:border-white/10 shadow-2xl">
                        {/* Header Close Button */}
                        <TouchableOpacity
                            onPress={() => setModalConfig(prev => ({ ...prev, visible: false }))}
                            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 items-center justify-center"
                        >
                            <X size={16} color={isDark ? '#94a3b8' : '#64748b'} />
                        </TouchableOpacity>

                        {/* Icon based on Type */}
                        <View className="items-center mt-4 mb-4">
                            {modalConfig.type === 'success' && (
                                <View className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-500/10 items-center justify-center">
                                    <CheckCircle2 size={36} color="#10b981" />
                                </View>
                            )}
                            {modalConfig.type === 'error' && (
                                <View className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-500/10 items-center justify-center">
                                    <AlertTriangle size={36} color="#ef4444" />
                                </View>
                            )}
                            {(modalConfig.type === 'info' || modalConfig.type === 'verify') && (
                                <View className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-500/10 items-center justify-center">
                                    <Info size={36} color="#10b981" />
                                </View>
                            )}
                        </View>

                        {/* Title & Message */}
                        <Text className="text-xl font-black text-slate-900 dark:text-white text-center tracking-tight mb-2 uppercase">
                            {modalConfig.title}
                        </Text>
                        <Text className="text-sm font-semibold text-slate-500 dark:text-slate-400 text-center leading-relaxed mb-6">
                            {modalConfig.message}
                        </Text>

                        {/* Buttons / Actions */}
                        <View className="gap-y-3">
                            <TouchableOpacity
                                onPress={() => {
                                    setModalConfig(prev => ({ ...prev, visible: false }));
                                    if (modalConfig.onPrimaryAction) {
                                        modalConfig.onPrimaryAction();
                                    }
                                }}
                                className="bg-emerald-500 h-14 rounded-2xl items-center justify-center shadow-lg shadow-emerald-500/20"
                            >
                                <Text className="text-white font-black text-sm uppercase tracking-wider">
                                    {modalConfig.primaryActionLabel || 'Entendido'}
                                </Text>
                            </TouchableOpacity>

                            {modalConfig.secondaryActionLabel && (
                                <TouchableOpacity
                                    onPress={() => {
                                        setModalConfig(prev => ({ ...prev, visible: false }));
                                        if (modalConfig.onSecondaryAction) {
                                            modalConfig.onSecondaryAction();
                                        }
                                    }}
                                    className="bg-slate-100 dark:bg-white/5 h-14 rounded-2xl items-center justify-center border border-slate-200 dark:border-white/10"
                                >
                                    <Text className="text-slate-700 dark:text-slate-300 font-bold text-sm uppercase tracking-wider">
                                        {modalConfig.secondaryActionLabel}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}