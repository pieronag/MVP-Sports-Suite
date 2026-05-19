import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StatusBar, KeyboardAvoidingView, Platform, ScrollView, Image, ActivityIndicator, BackHandler, Modal, Linking } from 'react-native';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, sendEmailVerification, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, Sun, Moon, AlertTriangle, CheckCircle2, Info, X, ShieldCheck, FileText, ExternalLink, Scale, Calendar, DollarSign, Cpu, Share2, Trash2, Users } from 'lucide-react-native';
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
    const [showRecoverModal, setShowRecoverModal] = useState(false);
    const [recoverEmail, setRecoverEmail] = useState('');
    const [recoverLoading, setRecoverLoading] = useState(false);
    const [showTermsModal, setShowTermsModal] = useState(false);
    const [showTermsContentModal, setShowTermsContentModal] = useState(false);
    const [showPrivacyContentModal, setShowPrivacyContentModal] = useState(false);
    
    const termsScrollRef = useRef<ScrollView>(null);
    const privacyScrollRef = useRef<ScrollView>(null);
    const termsSectionPositions = useRef<{ [key: string]: number }>({});
    const privacySectionPositions = useRef<{ [key: string]: number }>({});
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

    const openMailClient = async () => {
        try {
            if (Platform.OS === 'ios') {
                await Linking.openURL('message:');
            } else {
                await Linking.openURL('mailto:');
            }
        } catch (e) {
            Linking.openURL('https://mail.google.com');
        }
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

    const handleAuth = async (forceRegister: boolean = false) => {
        if (!validateFields()) return;

        if (!isLogin && !forceRegister) {
            setShowTermsModal(true);
            return;
        }

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
                const userDocRef = doc(db, 'users', user.uid);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    
                    // Si el correo ya está verificado pero no estaba registrado en Firestore,
                    // guardamos el estado.
                    if (!data.emailVerified) {
                        try {
                            await setDoc(userDocRef, { emailVerified: true }, { merge: true });
                        } catch (emailErr) {
                            console.error('Error al registrar verificación completa:', emailErr);
                        }
                    }

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
                    'Entendido',
                    async () => {
                        await signOut(auth);
                        setIsLogin(true);
                        setEmail('');
                        setConfirmEmail('');
                        setPassword('');
                        setConfirmPassword('');
                        setName('');
                        openMailClient();
                    },
                    'Abrir Correo'
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

    const handleForgotPassword = async (targetEmail: string) => {
        const cleanEmail = targetEmail.trim();
        if (!cleanEmail.includes('@')) {
            showAlert('Restablecer Contraseña', 'Por favor ingresa un correo electrónico válido.', 'error');
            return;
        }
        
        setRecoverLoading(true);
        try {
            await emailService.sendAuthEmail(cleanEmail, 'reset');
            setShowRecoverModal(false);
            showAlert(
                'Correo Enviado',
                `Se ha enviado un enlace para restablecer tu contraseña a ${cleanEmail}. Revisa tu bandeja de entrada o Spam.`,
                'success',
                () => {},
                'Cerrar',
                openMailClient,
                'Abrir Correo'
            );
        } catch (err: any) {
            let message = 'No se pudo enviar el correo de restablecimiento.';
            if (err.code === 'auth/user-not-found') message = 'No existe una cuenta registrada con este correo.';
            showAlert('Error', message, 'error');
        } finally {
            setRecoverLoading(false);
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
                            <Text className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 ml-1">Correo Electrónico</Text>
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
                                onPress={() => {
                                    setRecoverEmail(email);
                                    setShowRecoverModal(true);
                                }}
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
                            onPress={() => handleAuth(false)}
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

                    {/* Legal Disclaimer */}
                    <View className="mt-8 items-center px-4">
                        <Text className="text-center text-[10px] font-bold text-slate-400 dark:text-slate-500 leading-relaxed uppercase tracking-wider">
                            Al ingresar o registrarte, aceptas nuestros{' '}
                            <Text 
                                onPress={() => setShowTermsContentModal(true)} 
                                className="text-emerald-500 underline font-black"
                            >
                                Términos y Condiciones
                            </Text>{' '}
                            y la{' '}
                            <Text 
                                onPress={() => setShowPrivacyContentModal(true)} 
                                className="text-emerald-500 underline font-black"
                            >
                                Política de Privacidad
                            </Text>.
                        </Text>
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

            {/* Modal de Recuperar Contraseña */}
            <Modal
                transparent
                visible={showRecoverModal}
                animationType="slide"
                onRequestClose={() => setShowRecoverModal(false)}
            >
                <View className="flex-1 bg-black/75 justify-center px-6">
                    <View className="w-full bg-white dark:bg-[#0f172a] rounded-[2.5rem] p-8 border border-slate-100 dark:border-white/10 shadow-2xl">
                        {/* Header Close Button */}
                        <TouchableOpacity
                            onPress={() => setShowRecoverModal(false)}
                            className="absolute top-6 right-6 w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 items-center justify-center"
                        >
                            <X size={16} color={isDark ? '#94a3b8' : '#64748b'} />
                        </TouchableOpacity>

                        {/* Title & Description */}
                        <Text className="text-2xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">
                            Recuperar Contraseña
                        </Text>
                        <Text className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                            Ingresa tu dirección de correo registrado para recibir un enlace seguro de restablecimiento de contraseña.
                        </Text>

                        {/* Input Field */}
                        <View className="mb-6">
                            <Text className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 ml-1">Correo Electrónico</Text>
                            <View className="flex-row items-center bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/10 h-16 rounded-2xl px-5">
                                <Mail size={20} color="#10b981" />
                                <TextInput
                                    placeholder="usuario@mvpsports.com"
                                    placeholderTextColor="#64748b"
                                    className="flex-1 ml-4 text-slate-900 dark:text-white font-semibold text-base"
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                    value={recoverEmail}
                                    onChangeText={setRecoverEmail}
                                />
                            </View>
                        </View>

                        {/* Buttons / Actions */}
                        <View className="gap-y-3">
                            <TouchableOpacity
                                onPress={() => handleForgotPassword(recoverEmail)}
                                disabled={recoverLoading}
                                activeOpacity={0.9}
                                className="bg-emerald-500 h-16 rounded-2xl items-center justify-center shadow-lg shadow-emerald-500/20"
                            >
                                {recoverLoading ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text className="text-white font-black text-base uppercase tracking-widest">
                                        Enviar Enlace
                                    </Text>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => setShowRecoverModal(false)}
                                className="bg-slate-100 dark:bg-white/5 h-16 rounded-2xl items-center justify-center border border-slate-200 dark:border-white/10"
                            >
                                <Text className="text-slate-700 dark:text-slate-300 font-bold text-sm uppercase tracking-wider">
                                    Cancelar
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Modal de Aceptación de Términos y Condiciones */}
            <Modal
                transparent
                visible={showTermsModal}
                animationType="slide"
                onRequestClose={() => setShowTermsModal(false)}
            >
                <View className="flex-1 bg-black/75 justify-center px-6">
                    <View className="w-full bg-white dark:bg-[#0f172a] rounded-[2.5rem] p-8 border border-slate-100 dark:border-white/10 shadow-2xl">
                        {/* Header Close Button */}
                        <TouchableOpacity
                            onPress={() => setShowTermsModal(false)}
                            className="absolute top-6 right-6 w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 items-center justify-center"
                        >
                            <X size={16} color={isDark ? '#94a3b8' : '#64748b'} />
                        </TouchableOpacity>

                        {/* Icon */}
                        <View className="items-center mt-4 mb-4">
                            <View className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-500/10 items-center justify-center">
                                <ShieldCheck size={36} color="#10b981" />
                            </View>
                        </View>

                        {/* Title & Description */}
                        <Text className="text-2xl font-black text-slate-900 dark:text-white text-center mb-2 uppercase tracking-tight">
                            Contrato Legal y Privacidad
                        </Text>
                        <Text className="text-sm font-semibold text-slate-500 dark:text-slate-400 text-center mb-6 leading-relaxed">
                            Para crear tu cuenta en MVP Sports, debes aceptar nuestros términos de servicio y políticas de resguardo de datos.
                        </Text>

                        {/* Links Container */}
                        <View className="bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/10 rounded-2xl p-4 gap-y-3 mb-6">
                            <TouchableOpacity 
                                onPress={() => setShowTermsContentModal(true)}
                                className="flex-row items-center justify-between py-2 px-1"
                            >
                                <View className="flex-row items-center">
                                    <FileText size={18} color="#10b981" />
                                    <Text className="ml-3 text-sm font-bold text-slate-800 dark:text-slate-200">
                                        Términos y Condiciones
                                    </Text>
                                </View>
                                <ExternalLink size={16} color="#64748b" />
                            </TouchableOpacity>
                            
                            <View className="h-[1px] bg-slate-200/50 dark:bg-white/5" />

                            <TouchableOpacity 
                                onPress={() => setShowPrivacyContentModal(true)}
                                className="flex-row items-center justify-between py-2 px-1"
                            >
                                <View className="flex-row items-center">
                                    <ShieldCheck size={18} color="#10b981" />
                                    <Text className="ml-3 text-sm font-bold text-slate-800 dark:text-slate-200">
                                        Política de Privacidad
                                    </Text>
                                </View>
                                <ExternalLink size={16} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        {/* Buttons / Actions */}
                        <View className="gap-y-3">
                            <TouchableOpacity
                                onPress={() => {
                                    setShowTermsModal(false);
                                    handleAuth(true);
                                }}
                                activeOpacity={0.9}
                                className="bg-emerald-500 h-16 rounded-2xl items-center justify-center shadow-lg shadow-emerald-500/20"
                            >
                                <Text className="text-white font-black text-base uppercase tracking-widest">
                                    Aceptar y Registrar
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => setShowTermsModal(false)}
                                className="bg-slate-100 dark:bg-white/5 h-16 rounded-2xl items-center justify-center border border-slate-200 dark:border-white/10"
                            >
                                <Text className="text-slate-700 dark:text-slate-300 font-bold text-sm uppercase tracking-wider">
                                    Cancelar
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Modal - Términos y Condiciones */}
            <Modal
                visible={showTermsContentModal}
                animationType="slide"
                onRequestClose={() => setShowTermsContentModal(false)}
            >
                <View className="flex-1 bg-[#070b13] pt-12">
                    {/* Ambient Glows */}
                    <View className="w-80 h-80 rounded-full bg-emerald-500/[0.03] absolute top-12 left-[-100px]" />
                    <View className="w-72 h-72 rounded-full bg-cyan-500/[0.03] absolute top-80 right-[-100px]" />

                    {/* Header */}
                    <View className="flex-row items-center justify-between px-6 py-4 border-b border-white/[0.05] relative z-10">
                        <View className="flex-row items-center">
                            <Scale size={20} color="#00df82" />
                            <Text className="text-sm font-black text-white uppercase tracking-widest ml-3">
                                MVP SPORTS SUITE
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => setShowTermsContentModal(false)}
                            className="w-10 h-10 rounded-full bg-white/5 items-center justify-center border border-white/10"
                        >
                            <X size={18} color="#e2e8f0" />
                        </TouchableOpacity>
                    </View>

                    {/* INDEX SIDEBAR (Horizontal for mobile) */}
                    <View className="py-3 px-6 border-b border-white/[0.05] bg-white/[0.02]">
                        <Text className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">
                            Índice de Contenidos
                        </Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                            {[
                                { id: 'roles', label: '1. Roles' },
                                { id: 'saas', label: '2. Modelo SaaS' },
                                { id: 'cuentas', label: '3. Cuentas' },
                                { id: 'reservas', label: '4. Reservas' },
                                { id: 'cancelaciones', label: '5. Cancelaciones' },
                                { id: 'noshow', label: '6. No-Show' }
                            ].map((sec) => (
                                <TouchableOpacity
                                    key={sec.id}
                                    onPress={() => {
                                        const y = termsSectionPositions.current[sec.id];
                                        if (y !== undefined) {
                                            termsScrollRef.current?.scrollTo({ y: y - 10, animated: true });
                                        }
                                    }}
                                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 mr-2"
                                >
                                    <Text className="text-[10px] font-bold text-[#00df82] uppercase tracking-wider">
                                        {sec.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    {/* Scrollable Content */}
                    <ScrollView 
                        ref={termsScrollRef}
                        className="flex-1 px-6 pt-6" 
                        showsVerticalScrollIndicator={true}
                        contentContainerStyle={{ paddingBottom: 40 }}
                    >
                        {/* HERO HEADER */}
                        <View className="items-center mb-8">
                            <View className="bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-500/20">
                                <Text className="text-[9px] font-black uppercase tracking-[0.3em] text-[#00df82]">
                                    Documento Legal Oficial
                                </Text>
                            </View>
                            <Text className="text-3xl font-black uppercase tracking-tighter text-white mt-6 mb-2 text-center">
                                Términos y <Text className="text-[#00df82]">Condiciones</Text>
                            </Text>
                            <Text className="text-[10px] text-slate-400 uppercase tracking-widest text-center mt-2">
                                Última actualización: 18 de Mayo, 2026 • MVP Sports Chile
                            </Text>
                        </View>

                        {/* Intro Card */}
                        <View className="bg-slate-900/60 border border-white/5 rounded-2xl p-5 mb-8">
                            <Text className="text-xs text-slate-300 font-bold leading-relaxed">
                                Bienvenido a <Text className="text-[#00df82]">MVP Sports Suite</Text>. Este documento regula el acceso y uso del ecosistema multi-tenant para administradores, dueños de recintos y jugadores. Al ingresar o registrarse, usted acepta estar sujeto a estos términos.
                            </Text>
                        </View>

                        {/* 1. ROLES */}
                        <View 
                            onLayout={(e) => { termsSectionPositions.current['roles'] = e.nativeEvent.layout.y; }}
                            className="bg-slate-900/40 border border-white/[0.06] rounded-3xl p-6 mb-6"
                        >
                            <View className="flex-row items-center mb-4">
                                <View className="w-9 h-9 rounded-full bg-emerald-500/10 items-center justify-center mr-3">
                                    <ShieldCheck size={18} color="#00df82" />
                                </View>
                                <Text className="text-sm font-black text-white uppercase tracking-wider">
                                    1. Roles y Definiciones
                                </Text>
                            </View>
                            <Text className="text-xs text-slate-400 font-semibold mb-4 leading-relaxed">
                                • <Text className="text-white font-bold">MVP Sports Chile:</Text> Facilitador tecnológico y administrador del software SaaS.{'\n\n'}
                                • <Text className="text-white font-bold">Dueño de Recinto:</Text> Contratante del SaaS para gestionar canchas, torneos y cobros.{'\n\n'}
                                • <Text className="text-white font-bold">Mánager / Staff:</Text> Operadores del recinto encargados del check-in y agenda física.{'\n\n'}
                                • <Text className="text-white font-bold">Jugador (Player):</Text> Usuario final registrado para reservar canchas y participar de legiones.
                            </Text>
                        </View>

                        {/* 2. MODELO SAAS */}
                        <View 
                            onLayout={(e) => { termsSectionPositions.current['saas'] = e.nativeEvent.layout.y; }}
                            className="bg-slate-900/40 border border-white/[0.06] rounded-3xl p-6 mb-6"
                        >
                            <View className="flex-row items-center mb-4">
                                <View className="w-9 h-9 rounded-full bg-emerald-500/10 items-center justify-center mr-3">
                                    <Scale size={18} color="#00df82" />
                                </View>
                                <Text className="text-sm font-black text-white uppercase tracking-wider">
                                    2. Modelo SaaS y Planes
                                </Text>
                            </View>
                            <Text className="text-xs text-slate-400 font-semibold mb-3 leading-relaxed">
                                El acceso administrativo está segmentado en planes:
                            </Text>
                            <Text className="text-xs text-slate-400 font-semibold mb-4 leading-relaxed">
                                • <Text className="text-white font-bold">Free:</Text> 8% de comisión por reservas online. Limitado a sede única.{'\n\n'}
                                • <Text className="text-white font-bold">Elite:</Text> 5% de comisión por reservas online, habilitando integraciones avanzadas de facturación electrónica con el SII y pasarelas dedicadas.
                            </Text>
                        </View>

                        {/* 3. REGISTRO Y CUENTAS */}
                        <View 
                            onLayout={(e) => { termsSectionPositions.current['cuentas'] = e.nativeEvent.layout.y; }}
                            className="bg-slate-900/40 border border-white/[0.06] rounded-3xl p-6 mb-6"
                        >
                            <View className="flex-row items-center mb-4">
                                <View className="w-9 h-9 rounded-full bg-emerald-500/10 items-center justify-center mr-3">
                                    <User size={18} color="#00df82" />
                                </View>
                                <Text className="text-sm font-black text-white uppercase tracking-wider">
                                    3. Registro y Cuentas
                                </Text>
                            </View>
                            <Text className="text-xs text-slate-400 font-semibold mb-4 leading-relaxed">
                                Las credenciales de acceso son personales. Cualquier usuario puede solicitar la <Text className="text-white font-bold">eliminación definitiva de su cuenta</Text>. En tal caso, se purgarán los datos de perfil y Firebase Auth de forma irreversible, pero el <Text className="text-white font-bold">historial de reservas financieras se conservará anonimizado</Text> para resguardar balances fiscales.
                            </Text>
                        </View>

                        {/* 4. RESERVAS Y PAGOS */}
                        <View 
                            onLayout={(e) => { termsSectionPositions.current['reservas'] = e.nativeEvent.layout.y; }}
                            className="bg-slate-900/40 border border-white/[0.06] rounded-3xl p-6 mb-6"
                        >
                            <View className="flex-row items-center mb-4">
                                <View className="w-9 h-9 rounded-full bg-emerald-500/10 items-center justify-center mr-3">
                                    <Calendar size={18} color="#00df82" />
                                </View>
                                <Text className="text-sm font-black text-white uppercase tracking-wider">
                                    4. Reservas y Pagos
                                </Text>
                            </View>
                            <Text className="text-xs text-slate-400 font-semibold mb-4 leading-relaxed">
                                Las transacciones online se procesan de manera aislada y segura mediante <Text className="text-white font-bold">Transbank Webpay Plus</Text> integrado en un WebView seguro in-app. La plataforma no almacena credenciales ni información financiera bancaria.
                            </Text>
                        </View>

                        {/* 5. CANCELACIONES */}
                        <View 
                            onLayout={(e) => { termsSectionPositions.current['cancelaciones'] = e.nativeEvent.layout.y; }}
                            className="bg-slate-900/40 border border-white/[0.06] rounded-3xl p-6 mb-6"
                        >
                            <View className="flex-row items-center mb-4">
                                <View className="w-9 h-9 rounded-full bg-emerald-500/10 items-center justify-center mr-3">
                                    <DollarSign size={18} color="#00df82" />
                                </View>
                                <Text className="text-sm font-black text-white uppercase tracking-wider">
                                    5. Cancelaciones y Reembolsos
                                </Text>
                            </View>
                            <Text className="text-xs text-slate-400 font-semibold mb-4 leading-relaxed">
                                • <Text className="text-white font-bold">Ventana de 4 Horas:</Text> Cancelaciones con más de 4 horas tienen reembolso directo con un <Text className="text-white font-bold">descuento de 3%</Text> por aranceles transaccionales.{'\n\n'}
                                • <Text className="text-white font-bold">Menos de 4 Horas:</Text> Bloqueo absoluto de reembolso; el monto se transfiere completo al recinto.{'\n\n'}
                                • <Text className="text-white font-bold">Falla de Pasarela:</Text> Si el reembolso automático falla, se genera un código digital <Text className="text-white font-bold">MVP-REFUND</Text> para reembolso manual obligatorio por parte del recinto.
                            </Text>
                        </View>

                        {/* 6. NO-SHOW */}
                        <View 
                            onLayout={(e) => { termsSectionPositions.current['noshow'] = e.nativeEvent.layout.y; }}
                            className="bg-slate-900/40 border border-white/[0.06] rounded-3xl p-6 mb-6"
                        >
                            <View className="flex-row items-center mb-4">
                                <View className="w-9 h-9 rounded-full bg-emerald-500/10 items-center justify-center mr-3">
                                    <AlertTriangle size={18} color="#00df82" />
                                </View>
                                <Text className="text-sm font-black text-white uppercase tracking-wider">
                                    6. Política de No-Show
                                </Text>
                            </View>
                            <Text className="text-xs text-slate-400 font-semibold mb-4 leading-relaxed">
                                La inasistencia sin Check-In a la hora de reserva activa el protocolo No-Show. El pago online es retenido a favor del recinto. Para reservas sin pago previo, el sistema cancelará la reserva y registrará el comportamiento negativo en el perfil deportivo.
                            </Text>
                        </View>
                    </ScrollView>

                    {/* Footer button */}
                    <View className="px-6 py-6 border-t border-white/[0.05] bg-[#070b13]">
                        <TouchableOpacity
                            onPress={() => setShowTermsContentModal(false)}
                            className="bg-emerald-500 h-14 rounded-xl items-center justify-center shadow-lg shadow-emerald-500/20"
                        >
                            <Text className="text-white font-black text-sm uppercase tracking-wider">
                                Entendido y Cerrar
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Modal - Política de Privacidad */}
            <Modal
                visible={showPrivacyContentModal}
                animationType="slide"
                onRequestClose={() => setShowPrivacyContentModal(false)}
            >
                <View className="flex-1 bg-[#070b13] pt-12">
                    {/* Ambient Glows */}
                    <View className="w-80 h-80 rounded-full bg-[#00df82]/[0.03] absolute top-12 left-[-100px]" />
                    <View className="w-72 h-72 rounded-full bg-cyan-500/[0.03] absolute top-80 right-[-100px]" />

                    {/* Header */}
                    <View className="flex-row items-center justify-between px-6 py-4 border-b border-white/[0.05] relative z-10">
                        <View className="flex-row items-center">
                            <ShieldCheck size={20} color="#00df82" />
                            <Text className="text-sm font-black text-white uppercase tracking-widest ml-3">
                                MVP SPORTS SUITE
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => setShowPrivacyContentModal(false)}
                            className="w-10 h-10 rounded-full bg-white/5 items-center justify-center border border-white/10"
                        >
                            <X size={18} color="#e2e8f0" />
                        </TouchableOpacity>
                    </View>

                    {/* INDEX SIDEBAR (Horizontal for mobile) */}
                    <View className="py-3 px-6 border-b border-white/[0.05] bg-white/[0.02]">
                        <Text className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">
                            Índice de Contenidos
                        </Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                            {[
                                { id: 'datos', label: '1. Datos Recopilados' },
                                { id: 'finalidad', label: '2. Finalidad de Uso' },
                                { id: 'compartir', label: '3. Intercambio' },
                                { id: 'retencion', label: '4. Retención y Baja' },
                                { id: 'seguridad', label: '5. Seguridad' },
                                { id: 'derechos', label: '6. Derechos ARCO' }
                            ].map((sec) => (
                                <TouchableOpacity
                                    key={sec.id}
                                    onPress={() => {
                                        const y = privacySectionPositions.current[sec.id];
                                        if (y !== undefined) {
                                            privacyScrollRef.current?.scrollTo({ y: y - 10, animated: true });
                                        }
                                    }}
                                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 mr-2"
                                >
                                    <Text className="text-[10px] font-bold text-[#00df82] uppercase tracking-wider">
                                        {sec.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    {/* Scrollable Content */}
                    <ScrollView 
                        ref={privacyScrollRef}
                        className="flex-1 px-6 pt-6" 
                        showsVerticalScrollIndicator={true}
                        contentContainerStyle={{ paddingBottom: 40 }}
                    >
                        {/* HERO HEADER */}
                        <View className="items-center mb-8">
                            <View className="bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-500/20">
                                <Text className="text-[9px] font-black uppercase tracking-[0.3em] text-[#00df82]">
                                    Políticas de Privacidad
                                </Text>
                            </View>
                            <Text className="text-3xl font-black uppercase tracking-tighter text-white mt-6 mb-2 text-center">
                                Protección de <Text className="text-cyan-400">Datos</Text>
                            </Text>
                            <Text className="text-[10px] text-slate-400 uppercase tracking-widest text-center mt-2">
                                Última actualización: 18 de Mayo, 2026 • MVP Sports Chile
                            </Text>
                        </View>

                        {/* Intro Card */}
                        <View className="bg-slate-900/60 border border-white/5 rounded-2xl p-5 mb-8">
                            <Text className="text-xs text-slate-300 font-bold leading-relaxed">
                                En <Text className="text-[#00df82]">MVP Sports Chile</Text>, resguardamos tu información bajo la Ley N° 19.628 de la República de Chile. Esta política detalla la recopilación, almacenamiento y tratamiento de tu información personal.
                            </Text>
                        </View>

                        {/* 1. DATOS RECOPILADOS */}
                        <View 
                            onLayout={(e) => { privacySectionPositions.current['datos'] = e.nativeEvent.layout.y; }}
                            className="bg-slate-900/40 border border-white/[0.06] rounded-3xl p-6 mb-6"
                        >
                            <View className="flex-row items-center mb-4">
                                <View className="w-9 h-9 rounded-full bg-[#00df82]/10 items-center justify-center mr-3">
                                    <FileText size={18} color="#00df82" />
                                </View>
                                <Text className="text-sm font-black text-white uppercase tracking-wider">
                                    1. Datos Recopilados
                                </Text>
                            </View>
                            <Text className="text-xs text-slate-400 font-semibold mb-4 leading-relaxed">
                                • <Text className="text-white font-bold">Identidad:</Text> Nombre completo, RUT, correo, teléfono e imágenes codificadas en Base64.{'\n\n'}
                                • <Text className="text-white font-bold">Ubicación:</Text> Datos GPS para mapeo del buscador de recintos (sin almacenamiento histórico permanente).{'\n\n'}
                                • <Text className="text-white font-bold">Actividad:</Text> Reservas, partidas, puntos de experiencia (XP), nivel ELO, y chats grupales tácticos de Squads.{'\n\n'}
                                • <Text className="text-white font-bold">Financieros:</Text> Logs de transacciones Webpay sin almacenar información de tarjetas bancarias.
                            </Text>
                        </View>

                        {/* 2. FINALIDAD DEL USO */}
                        <View 
                            onLayout={(e) => { privacySectionPositions.current['finalidad'] = e.nativeEvent.layout.y; }}
                            className="bg-slate-900/40 border border-white/[0.06] rounded-3xl p-6 mb-6"
                        >
                            <View className="flex-row items-center mb-4">
                                <View className="w-9 h-9 rounded-full bg-[#00df82]/10 items-center justify-center mr-3">
                                    <Cpu size={18} color="#00df82" />
                                </View>
                                <Text className="text-sm font-black text-white uppercase tracking-wider">
                                    2. Finalidad del Uso
                                </Text>
                            </View>
                            <Text className="text-xs text-slate-400 font-semibold mb-4 leading-relaxed">
                                Los datos se tratan con fines operativos: facilitar la reserva progresiva mediante códigos QR, calcular el ranking de nivel ELO, gestionar de forma segura los cargos de cancelación/devolución y emitir facturación para recintos.
                            </Text>
                        </View>

                        {/* 3. INTERCAMBIO */}
                        <View 
                            onLayout={(e) => { privacySectionPositions.current['compartir'] = e.nativeEvent.layout.y; }}
                            className="bg-slate-900/40 border border-white/[0.06] rounded-3xl p-6 mb-6"
                        >
                            <View className="flex-row items-center mb-4">
                                <View className="w-9 h-9 rounded-full bg-[#00df82]/10 items-center justify-center mr-3">
                                    <Share2 size={18} color="#00df82" />
                                </View>
                                <Text className="text-sm font-black text-white uppercase tracking-wider">
                                    3. Intercambio de Datos
                                </Text>
                            </View>
                            <Text className="text-xs text-slate-400 font-semibold mb-4 leading-relaxed">
                                MVP Sports Chile no vende datos personales. La información se comparte únicamente con los recintos deportivos donde el jugador concreta reservas para validación del check-in, Transbank para procesar pagos y Google Firebase para alojamiento seguro en la nube.
                            </Text>
                        </View>

                        {/* 4. RETENCION Y BAJA */}
                        <View 
                            onLayout={(e) => { privacySectionPositions.current['retencion'] = e.nativeEvent.layout.y; }}
                            className="bg-slate-900/40 border border-white/[0.06] rounded-3xl p-6 mb-6"
                        >
                            <View className="flex-row items-center mb-4">
                                <View className="w-9 h-9 rounded-full bg-[#00df82]/10 items-center justify-center mr-3">
                                    <Trash2 size={18} color="#00df82" />
                                </View>
                                <Text className="text-sm font-black text-white uppercase tracking-wider">
                                    4. Retención y Baja
                                </Text>
                            </View>
                            <Text className="text-xs text-slate-400 font-semibold mb-4 leading-relaxed">
                                Al eliminar la cuenta, se borran permanentemente el perfil y credenciales del usuario de Firebase. Los logs contables y transaccionales se conservan indefinidamente bajo una estricta anonimización para protección contable de los recintos.
                            </Text>
                        </View>

                        {/* 5. MEDIDAS DE SEGURIDAD */}
                        <View 
                            onLayout={(e) => { privacySectionPositions.current['seguridad'] = e.nativeEvent.layout.y; }}
                            className="bg-slate-900/40 border border-white/[0.06] rounded-3xl p-6 mb-6"
                        >
                            <View className="flex-row items-center mb-4">
                                <View className="w-9 h-9 rounded-full bg-[#00df82]/10 items-center justify-center mr-3">
                                    <Lock size={18} color="#00df82" />
                                </View>
                                <Text className="text-sm font-black text-white uppercase tracking-wider">
                                    5. Medidas de Seguridad
                                </Text>
                            </View>
                            <Text className="text-xs text-slate-400 font-semibold mb-4 leading-relaxed">
                                Implementamos Firestore Security Rules para aislamiento estricto de accesos según roles de usuario. Todos los datos viajan mediante cifrado HTTPS/SSL y se almacenan en infraestructura segura.
                            </Text>
                        </View>

                        {/* 6. DERECHOS ARCO */}
                        <View 
                            onLayout={(e) => { privacySectionPositions.current['derechos'] = e.nativeEvent.layout.y; }}
                            className="bg-slate-900/40 border border-white/[0.06] rounded-3xl p-6 mb-6"
                        >
                            <View className="flex-row items-center mb-4">
                                <View className="w-9 h-9 rounded-full bg-[#00df82]/10 items-center justify-center mr-3">
                                    <Users size={18} color="#00df82" />
                                </View>
                                <Text className="text-sm font-black text-white uppercase tracking-wider">
                                    6. Derechos ARCO
                                </Text>
                            </View>
                            <Text className="text-xs text-slate-400 font-semibold mb-8 leading-relaxed">
                                En virtud de la Ley N° 19.628, usted tiene los derechos de Acceso, Rectificación, Cancelación y Oposición sobre el tratamiento de sus datos personales. Para solicitudes formales, contactar a soporte@mvpsports.cl.
                            </Text>
                        </View>
                    </ScrollView>

                    {/* Footer button */}
                    <View className="px-6 py-6 border-t border-white/[0.05] bg-[#070b13]">
                        <TouchableOpacity
                            onPress={() => setShowPrivacyContentModal(false)}
                            className="bg-emerald-500 h-14 rounded-xl items-center justify-center shadow-lg shadow-emerald-500/20"
                        >
                            <Text className="text-white font-black text-sm uppercase tracking-wider">
                                Entendido y Cerrar
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}