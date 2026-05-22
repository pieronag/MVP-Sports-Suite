import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, TextInput, Image,
    ActivityIndicator, StatusBar, Switch, StyleSheet, Modal,
    RefreshControl, BackHandler, Dimensions, Platform, KeyboardAvoidingView, Keyboard, Alert
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import {
    ChevronLeft, Save, User, Phone,
    Zap, Bell, Moon, Sun, Lock, LogOut, Target, Eye, EyeOff,
    ShieldCheck, Calendar, Ruler, Weight, 
    ChevronRight, Sparkles, Activity, Award, Mail, 
    Smartphone, MapPin, AtSign, Cpu, Globe, CheckCircle2, AlertCircle, XCircle, Shield
} from 'lucide-react-native';
import { useAuth } from '../../store/useAuth';
import { auth, db } from '../../services/firebase';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { LinearGradient } from 'expo-linear-gradient';
import { userService } from '../../services/userService';

const { width, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 🎨 PALETA REFINADA
const COLORS = {
    light: {
        bg: '#F8FAFC',
        card: '#FFFFFF',
        border: '#E2E8F0',
        text: '#0F172A',
        sub: '#64748B'
    },
    dark: {
        bg: '#020617',
        card: '#0F172A',
        border: '#1E293B',
        text: '#F8FAFC',
        sub: '#94A3B8'
    },
    accent: '#10b981'
};

// 🏆 POSICIONES POR DEPORTE
const SPORT_POSITIONS: Record<string, string[]> = {
    'Fútbol': ['Arquero', 'Defensa', 'Lateral', 'Volante', 'Delantero'],
    'Pádel': ['Lado Derecho', 'Lado Izquierdo'],
    'Tenis': ['Individual', 'Dobles'],
    'Básquetbol': ['Base', 'Escolta', 'Alero', 'Ala-Pívot', 'Pívot'],
    'Voleibol': ['Armador', 'Atacante', 'Central', 'Líbero']
};

const formatBirthDate = (text: string) => {
    let clean = text.replace(/\D/g, '');
    clean = clean.slice(0, 8);
    if (clean.length <= 2) return clean;
    if (clean.length <= 4) return `${clean.slice(0, 2)}/${clean.slice(2)}`;
    return `${clean.slice(0, 2)}/${clean.slice(2, 4)}/${clean.slice(4)}`;
};

const validateAge = (birthDateStr: string) => {
    if (!birthDateStr) return false;
    const parts = birthDateStr.split('/');
    if (parts.length !== 3) return false;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    
    if (isNaN(day) || isNaN(month) || isNaN(year)) return false;
    if (day < 1 || day > 31 || month < 0 || month > 11 || year < 1900 || year > new Date().getFullYear()) {
        return false;
    }
    
    const birthDate = new Date(year, month, day);
    const today = new Date();
    
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age >= 18;
};

export default function SettingsScreen() {
    const scrollViewRef = useRef<ScrollView>(null);
    const router = useRouter();
    const { user, theme, toggleTheme, signOut, profile } = useAuth();
    const isDark = theme === 'dark';
    const C = isDark ? COLORS.dark : COLORS.light;

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [saving, setSaving] = useState(false);

    // FEEDBACK MODAL STATE
    const [modalVisible, setModalVisible] = useState(false);
    const [modalType, setModalType] = useState<'success' | 'error'>('success');
    const [modalMsg, setModalMsg] = useState('');
    const [isRUTFocused, setIsRUTFocused] = useState(false);

    // UNSAVED CHANGES ALERT STATE
    const [initialData, setInitialData] = useState<any>(null);
    const [showUnsavedModal, setShowUnsavedModal] = useState(false);

    // PASSWORD MODAL STATE
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [showSignOutModal, setShowSignOutModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [loadingDelete, setLoadingDelete] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [onFeedbackClose, setOnFeedbackClose] = useState<(() => void) | null>(null);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [formData, setFormData] = useState({
        displayName: '',
        phone: '',
        bio: '',
        rut: '',
        birthDate: '',
        gender: '',
        city: '',
        favSports: [] as string[],
        privacyMode: false,
        position: '',
        dominantFoot: '',
        height: '',
        weight: '',
        mainSport: '',
        favTime: '',
        frequency: '',
        intensity: ''
    });

    const loadPrefs = async () => {
        if (!user) { setLoading(false); return; }
        try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
                const data = userDoc.data();
                const loaded = {
                    displayName: data.displayName || '',
                    phone: data.phone || '',
                    bio: data.bio || '',
                    rut: data.rut || '',
                    birthDate: data.birthDate || '',
                    gender: data.gender || '',
                    city: data.city || '',
                    favSports: data.favSports || [],
                    privacyMode: data.privacyMode || false,
                    position: data.position || '',
                    dominantFoot: data.dominantFoot || '',
                    height: data.height || '',
                    weight: data.weight || '',
                    mainSport: data.mainSport || '',
                    favTime: data.favTime || '',
                    frequency: data.frequency || '',
                    intensity: data.intensity || ''
                };
                setFormData(loaded);
                setInitialData(loaded);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const formDataRef = useRef(formData);
    const initialDataRef = useRef(initialData);

    useEffect(() => {
        formDataRef.current = formData;
    }, [formData]);

    useEffect(() => {
        initialDataRef.current = initialData;
    }, [initialData]);

    const checkUnsavedChanges = () => {
        const currentData = formDataRef.current;
        const baseData = initialDataRef.current;
        if (!baseData) return false;

        const keys = Object.keys(currentData) as Array<keyof typeof formData>;
        for (const key of keys) {
            if (key === 'favSports') {
                const arr1 = currentData.favSports || [];
                const arr2 = baseData.favSports || [];
                if (arr1.length !== arr2.length) return true;
                if (arr1.some((val, idx) => val !== arr2[idx])) return true;
            } else {
                if (currentData[key] !== baseData[key]) return true;
            }
        }
        return false;
    };

    const handleBack = () => {
        if (checkUnsavedChanges()) {
            setShowUnsavedModal(true);
        } else {
            router.back();
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            loadPrefs();
            const backAction = () => {
                handleBack();
                return true;
            };
            const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
            return () => backHandler.remove();
        }, [user])
    );

    const validateChileanRut = (rut: string) => {
        if (!rut) return true; // Permmitir vacío si no es obligatorio
        let value = rut.replace(/\./g, '').replace('-', '');
        if (value.length < 8) return false;
        
        let cuerpo = value.slice(0, -1);
        let dv = value.slice(-1).toUpperCase();
        
        let suma = 0;
        let multiplo = 2;
        
        for (let i = 1; i <= cuerpo.length; i++) {
            let index = multiplo * parseInt(value.charAt(cuerpo.length - i));
            suma += index;
            if (multiplo < 7) multiplo += 1; else multiplo = 2;
        }
        
        let dvEsperado = 11 - (suma % 11);
        let dvFinal = dvEsperado === 11 ? '0' : dvEsperado === 10 ? 'K' : dvEsperado.toString();
        
        return dv === dvFinal;
    };

    const cleanRut = (rut: string) => {
        return rut.replace(/[^0-9kK]/g, '').toUpperCase();
    };

    const formatRutFinal = (rut: string) => {
        let value = cleanRut(rut);
        if (value.length <= 1) return value;
        let cuerpo = value.slice(0, -1);
        let dv = value.slice(-1);
        return cuerpo.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.") + '-' + dv;
    };

    const formatPhone = (phone: string) => {
        // Limpiar todo lo que no sea número
        let digits = phone.replace(/\D/g, '');
        
        // Si el usuario borró el 56 inicial, lo mantenemos como base si hay otros números
        // o si simplemente borró todo.
        if (digits.startsWith('56')) {
            digits = digits.slice(2);
        }
        
        // Limitar a 9 dígitos (celular chileno típico)
        digits = digits.slice(0, 9);
        
        if (digits.length === 0) return '+56 ';
        
        // Formato: +56 9 1234 5678 o similar
        // Para simplicidad por ahora: +56 9XXXXXXXX
        return '+56 ' + digits;
    };

    const handleSave = async () => {
        if (!user) return;
        
        if (formData.rut && !validateChileanRut(formData.rut)) {
            showFeedback('error', 'El RUT ingresado no es válido. Por favor, revísalo.');
            return;
        }

        if (!formData.birthDate) {
            showFeedback('error', 'La Fecha de Nacimiento es obligatoria para verificar tu edad.');
            return;
        }

        if (!validateAge(formData.birthDate)) {
            showFeedback('error', 'Restricción de Edad: Debes ser mayor de edad (18+ años) para poder utilizar la aplicación.');
            return;
        }

        setSaving(true);
        try {
            await userService.updateUserProfile(user.uid, {
                ...formData,
                updatedAt: new Date().toISOString()
            } as any);
            await useAuth.getState().reloadProfile();
            setInitialData(formData); // Sincronizar datos iniciales con los guardados para evitar alerta al salir
            showFeedback('success', '¡Excelente! Tus cambios se han sincronizado correctamente.');
            
            // Redirigir al inicio después de un breve momento para que vea el mensaje
            setTimeout(() => {
                setModalVisible(false);
                router.replace('/(player)/(tabs)/');
            }, 1500);
        } catch (error) {
            showFeedback('error', 'Ocurrió un problema al intentar guardar tus ajustes.');
        } finally {
            setSaving(false);
        }
    };

    const showFeedback = (type: 'success' | 'error', msg: string, onCloseAction?: () => void) => {
        setModalType(type);
        setModalMsg(msg);
        setOnFeedbackClose(() => onCloseAction || null);
        setModalVisible(true);
    };

    const handleChangePassword = async () => {
        if (!currentPassword || !newPassword || !confirmNewPassword) {
            showFeedback('error', 'Por favor, completa todos los campos.');
            return;
        }

        if (newPassword !== confirmNewPassword) {
            showFeedback('error', 'La nueva contraseña y su confirmación no coinciden.');
            return;
        }

        if (newPassword.length < 6) {
            showFeedback('error', 'La nueva contraseña debe tener al menos 6 caracteres.');
            return;
        }

        setPasswordLoading(true);
        try {
            const currentUser = auth.currentUser;
            if (!currentUser || !currentUser.email) {
                showFeedback('error', 'No se pudo obtener el usuario actual.');
                return;
            }

            // Re-authenticate user
            const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
            await reauthenticateWithCredential(currentUser, credential);

            // Update password
            await updatePassword(currentUser, newPassword);

            setShowPasswordModal(false);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmNewPassword('');
            
            showFeedback('success', '¡Tu contraseña ha sido cambiada correctamente!', () => {
                // Stay on preferences screen
            });
        } catch (error: any) {
            console.error(error);
            let errMsg = 'Ocurrió un error al cambiar la contraseña.';
            if (error.code === 'auth/wrong-password') {
                errMsg = 'La contraseña actual ingresada es incorrecta.';
            } else if (error.code === 'auth/weak-password') {
                errMsg = 'La nueva contraseña es muy débil (debe tener al menos 6 caracteres).';
            } else if (error.code === 'auth/user-mismatch' || error.code === 'auth/invalid-credential') {
                errMsg = 'La contraseña actual ingresada no es válida.';
            }
            showFeedback('error', errMsg);
        } finally {
            setPasswordLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!user) return;
        setLoadingDelete(true);
        try {
            // 1. Eliminar documento del usuario en Firestore
            await userService.deleteAccount(user.uid);

            // 2. Eliminar el usuario de Firebase Auth
            await user.delete();

            setShowDeleteModal(false);
            Alert.alert("Cuenta Eliminada", "Tu perfil y credenciales de acceso han sido eliminados de forma definitiva. Tus reservas se han mantenido para registros administrativos.");
        } catch (err: any) {
            console.error("Error deleting user account:", err);
            if (err.code === 'auth/requires-recent-login') {
                Alert.alert(
                    "Seguridad Activa",
                    "Por motivos de seguridad, debes cerrar sesión e iniciar sesión nuevamente para renovar tu sesión antes de poder eliminar tu perfil definitivamente."
                );
            } else {
                Alert.alert("Error de Sistema", "No se pudo borrar la cuenta. Por favor reintenta en unos instantes.");
            }
        } finally {
            setLoadingDelete(false);
        }
    };

    const getAvailablePositions = () => {
        if (!formData.mainSport) return [];
        return SPORT_POSITIONS[formData.mainSport] || [];
    };

    if (loading && !refreshing) {
        return (
            <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color={COLORS.accent} size="large" />
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
            
            {/* CABECERA */}
            <View style={{ paddingTop: 60, paddingBottom: 20, paddingHorizontal: 30, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: C.border }}>
                <TouchableOpacity onPress={handleBack} style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}>
                    <ChevronLeft color={COLORS.accent} size={24} />
                </TouchableOpacity>
                <Text style={{ color: C.text, fontSize: 20, fontWeight: '900', textTransform: 'uppercase' }}>Preferencias</Text>
                <TouchableOpacity onPress={handleSave} disabled={saving} style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center' }}>
                    {saving ? <ActivityIndicator color="white" size="small" /> : <Save color="white" size={20} />}
                </TouchableOpacity>
            </View>

            <ScrollView 
                ref={scrollViewRef}
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 100 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadPrefs(); }} tintColor={COLORS.accent} />}
            >
                {/* AVISO PERFIL INCOMPLETO */}
                {(!formData.displayName || !formData.phone || !formData.rut || !formData.mainSport || !formData.birthDate || !validateAge(formData.birthDate)) && (
                    <View style={{ margin: 30, marginBottom: 10, padding: 25, backgroundColor: isDark ? '#ef444411' : '#fef2f2', borderRadius: 25, borderWidth: 1, borderColor: '#ef444444' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                            <AlertCircle color="#ef4444" size={20} />
                            <Text style={{ color: '#ef4444', fontSize: 14, fontWeight: '900', marginLeft: 10, textTransform: 'uppercase' }}>Perfil Incompleto</Text>
                        </View>
                        <Text style={{ color: C.sub, fontSize: 13, fontWeight: '600', lineHeight: 18 }}>
                            Para poder realizar reservas y usar todas las funciones de MVP Sports, debes completar tus datos obligatorios:
                        </Text>
                        <View style={{ marginTop: 15, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                            {!formData.displayName && <Badge label="Nombre" />}
                            {!formData.phone && <Badge label="Teléfono" />}
                            {!formData.rut && <Badge label="RUT" />}
                            {(!formData.birthDate || !validateAge(formData.birthDate)) && <Badge label="F. Nacimiento (18+)" />}
                            {!formData.mainSport && <Badge label="Deporte" />}
                        </View>
                    </View>
                )}

                {/* BANNER JUGADOR */}
                <View style={{ padding: 30, paddingBottom: 10 }}>
                    <View style={{ backgroundColor: C.card, borderRadius: 30, padding: 25, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.border }}>
                        <View style={{ width: 65, height: 65, borderRadius: 20, backgroundColor: COLORS.accent + '11', overflow: 'hidden', borderWidth: 2, borderColor: COLORS.accent }}>
                            <Image 
                                source={profile?.photoURL ? { uri: profile.photoURL } : require('../../assets/images/mascot.jpg')} 
                                style={{ width: '100%', height: '100%' }} 
                            />
                        </View>
                        <View style={{ marginLeft: 20, flex: 1 }}>
                            <Text style={{ color: C.text, fontSize: 22, fontWeight: '900', textTransform: 'uppercase' }}>{formData.displayName || 'Jugador'}</Text>
                            <Text style={{ color: C.sub, fontSize: 10, fontWeight: '700' }}>{user?.email}</Text>
                        </View>
                    </View>
                </View>

                {/* MIS DATOS */}
                <SectionLabel label="Mis Datos" />
                <View style={{ marginHorizontal: 30, backgroundColor: C.card, borderRadius: 25, overflow: 'hidden', borderWidth: 1, borderColor: C.border }}>
                    <RefinedRow icon={User} color="#3b82f6" label="Nombre y Apellido" value={formData.displayName} onChange={(t: string) => setFormData(f => ({ ...f, displayName: t }))} isDark={isDark} />
                    <Separator isDark={isDark} />
                    <RefinedRow 
                        icon={Phone} 
                        color="#10b981" 
                        label="Tu Teléfono" 
                        value={formData.phone} 
                        onChange={(t: string) => setFormData(f => ({ ...f, phone: formatPhone(t) }))} 
                        isDark={isDark} 
                        keyboardType="number-pad"
                        maxLength={13}
                    />
                    <Separator isDark={isDark} />
                    <RefinedRow 
                        icon={ShieldCheck} 
                        color="#6366f1" 
                        label="Tu RUT" 
                        value={formData.rut} 
                        onChange={(t: string) => setFormData(f => ({ ...f, rut: cleanRut(t) }))} 
                        onFocus={() => setIsRUTFocused(true)}
                        onBlur={() => {
                            setIsRUTFocused(false);
                            setFormData(f => ({ ...f, rut: formatRutFinal(formData.rut) }));
                        }}
                        isDark={isDark}
                        error={formData.rut && formData.rut.includes('-') && !validateChileanRut(formData.rut)}
                        maxLength={15}
                        autoCorrect={false}
                        autoComplete="off"
                        keyboardType="numeric"
                    />
                    <Separator isDark={isDark} />
                    <RefinedRow 
                        icon={Calendar} 
                        color="#ec4899" 
                        label="Fecha de Nacimiento (DD/MM/YYYY)" 
                        value={formData.birthDate} 
                        onChange={(t: string) => setFormData(f => ({ ...f, birthDate: formatBirthDate(t) }))} 
                        isDark={isDark}
                        keyboardType="number-pad"
                        maxLength={10}
                        error={formData.birthDate && formData.birthDate.length === 10 && !validateAge(formData.birthDate)}
                    />
                </View>

                {/* TALLA Y PESO */}
                <SectionLabel label="Talla y Peso" />
                <View style={{ marginHorizontal: 30, backgroundColor: C.card, borderRadius: 25, overflow: 'hidden', borderWidth: 1, borderColor: C.border }}>
                    <RefinedRow icon={Ruler} color="#f59e0b" label="¿Cuánto mides? (cm)" value={formData.height} onChange={(t: string) => setFormData(f => ({ ...f, height: t }))} isDark={isDark} />
                    <Separator isDark={isDark} />
                    <RefinedRow icon={Weight} color="#ef4444" label="¿Cuánto pesas? (kg)" value={formData.weight} onChange={(t: string) => setFormData(f => ({ ...f, weight: t }))} isDark={isDark} />
                </View>

                {/* MI JUEGO */}
                <SectionLabel label="Mi Juego" />
                <View style={{ marginHorizontal: 30, backgroundColor: C.card, borderRadius: 25, overflow: 'hidden', borderWidth: 1, borderColor: C.border }}>
                    <RefinedSelectRow icon={Activity} color="#10b981" label="¿Qué deporte juegas?" value={formData.mainSport} options={['Fútbol', 'Pádel', 'Tenis', 'Básquetbol', 'Voleibol']} onSelect={(v: string) => setFormData(f => ({ ...f, mainSport: v, position: '' }))} isDark={isDark} />
                    <Separator isDark={isDark} />
                    <RefinedSelectRow icon={Award} color="#facc15" label="¿En qué posición juegas?" value={formData.position} options={getAvailablePositions()} disabled={!formData.mainSport} onSelect={(v: string) => setFormData(f => ({ ...f, position: v }))} isDark={isDark} />
                    <Separator isDark={isDark} />
                    <RefinedSelectRow icon={Target} color="#3b82f6" label="¿Cuál es tu lado hábil?" value={formData.dominantFoot} options={['Derecho', 'Izquierdo', 'Ambidiestro']} onSelect={(v: string) => setFormData(f => ({ ...f, dominantFoot: v }))} isDark={isDark} />
                </View>

                {/* PREFERENCIAS */}
                <SectionLabel label="Preferencias" />
                <View style={{ marginHorizontal: 30, backgroundColor: C.card, borderRadius: 25, overflow: 'hidden', borderWidth: 1, borderColor: C.border }}>
                    <RefinedSelectRow icon={Calendar} color="#3b82f6" label="¿A qué hora prefieres jugar?" value={formData.favTime} options={['Mañana', 'Tarde', 'Noche']} onSelect={(v: string) => setFormData(f => ({ ...f, favTime: v }))} isDark={isDark} />
                    <Separator isDark={isDark} />
                    <RefinedSelectRow icon={Zap} color="#facc15" label="¿Qué tan seguido juegas?" value={formData.frequency} options={['De vez en cuando', '1-2 veces por semana', 'Casi todos los días']} onSelect={(v: string) => setFormData(f => ({ ...f, frequency: v }))} isDark={isDark} />
                    <Separator isDark={isDark} />
                    <RefinedToggleRow icon={Moon} color="#1e293b" label="Modo Oscuro" value={isDark} onValueChange={toggleTheme} isDark={isDark} />
                </View>

                {/* SEGURIDAD */}
                <SectionLabel label="Seguridad" />
                <View style={{ marginHorizontal: 30, backgroundColor: C.card, borderRadius: 25, overflow: 'hidden', borderWidth: 1, borderColor: C.border }}>
                    <TouchableOpacity onPress={() => setShowPasswordModal(true)} style={{ height: 80, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 25 }}>
                        <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: '#f43f5e', alignItems: 'center', justifyContent: 'center' }}>
                            <Lock color="white" size={20} />
                        </View>
                        <Text style={{ color: C.text, fontSize: 17, fontWeight: '800', textTransform: 'uppercase', marginLeft: 20, flex: 1 }}>Cambiar Contraseña</Text>
                        <ChevronRight color="#10b981" size={20} />
                    </TouchableOpacity>
                </View>

                {/* SOPORTE Y AYUDA */}
                <SectionLabel label="Soporte y Ayuda" />
                <View style={{ marginHorizontal: 30, backgroundColor: C.card, borderRadius: 25, overflow: 'hidden', borderWidth: 1, borderColor: C.border }}>
                    <TouchableOpacity onPress={() => router.push('/(player)/reporte')} style={{ height: 80, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 25 }}>
                        <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center' }}>
                            <Mail color="white" size={20} />
                        </View>
                        <Text style={{ color: C.text, fontSize: 17, fontWeight: '800', textTransform: 'uppercase', marginLeft: 20, flex: 1 }}>Reportar un Problema</Text>
                        <ChevronRight color="#10b981" size={20} />
                    </TouchableOpacity>
                </View>

                {/* ACCIONES DE SESIÓN Y SEGURIDAD */}
                <View style={{ marginHorizontal: 30, marginTop: 35, gap: 15 }}>
                    <TouchableOpacity 
                        onPress={() => setShowSignOutModal(true)}
                        style={{ 
                            height: 65, 
                            borderRadius: 22, 
                            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9', 
                            flexDirection: 'row', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            borderWidth: 1, 
                            borderColor: C.border 
                        }}
                    >
                        <LogOut color={C.text} size={20} style={{ marginRight: 10 }} />
                        <Text style={{ color: C.text, fontSize: 14, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 }}>Cerrar Sesión Activa</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        onPress={() => setShowDeleteModal(true)}
                        style={{ 
                            height: 65, 
                            borderRadius: 22, 
                            backgroundColor: isDark ? '#f43f5e11' : '#fef2f2', 
                            flexDirection: 'row', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            borderWidth: 1, 
                            borderColor: isDark ? '#f43f5e33' : '#fee2e2' 
                        }}
                    >
                        <Shield color="#f43f5e" size={20} style={{ marginRight: 10 }} />
                        <Text style={{ color: '#f43f5e', fontSize: 14, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 }}>Eliminar Cuenta Definitivamente</Text>
                    </TouchableOpacity>
                </View>

                <Text style={{ textAlign: 'center', color: C.sub, fontSize: 8, fontWeight: '700', marginTop: 40 }}>© MVP SPORTS CHILE • 2026</Text>
            </ScrollView>

            {/* BARRA ACCESORIO TECLADO (K) */}
            {isRUTFocused && (
                <View style={{ 
                    position: 'absolute', 
                    bottom: Platform.OS === 'ios' ? 0 : 0, // En Android el KeyboardAvoidingView lo moverá
                    left: 0, 
                    right: 0, 
                    backgroundColor: isDark ? '#1e293b' : '#f1f5f9', 
                    padding: 10, 
                    flexDirection: 'row', 
                    justifyContent: 'center',
                    borderTopWidth: 1,
                    borderColor: C.border,
                    zIndex: 1000
                }}>
                    <TouchableOpacity 
                        onPress={() => setFormData(f => ({ ...f, rut: cleanRut(f.rut + 'K') }))}
                        style={{ 
                            backgroundColor: COLORS.accent, 
                            paddingHorizontal: 40, 
                            paddingVertical: 12, 
                            borderRadius: 15,
                            shadowColor: COLORS.accent,
                            shadowOpacity: 0.3,
                            shadowRadius: 10,
                            elevation: 5
                        }}
                    >
                        <Text style={{ color: 'white', fontWeight: '900', fontSize: 20 }}>INGRESAR K</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        onPress={() => Keyboard.dismiss()}
                        style={{ 
                            position: 'absolute',
                            right: 20,
                            top: 15
                        }}
                    >
                        <Text style={{ color: C.sub, fontWeight: '700', fontSize: 14 }}>LISTO</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* FEEDBACK MODAL */}
            <FeedbackModal 
                visible={modalVisible} 
                type={modalType} 
                message={modalMsg} 
                onClose={() => {
                    setModalVisible(false);
                    if (onFeedbackClose) {
                        onFeedbackClose();
                    } else if (modalType === 'success') {
                        router.replace('/(player)/(tabs)/');
                    }
                }} 
                isDark={isDark}
            />

            {/* MODAL CAMBIAR CONTRASEÑA */}
            <Modal visible={showPasswordModal} transparent animationType="slide">
                <KeyboardAvoidingView 
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 25 }}
                >
                    <View style={{ backgroundColor: C.bg, borderRadius: 35, padding: 30, borderWidth: 1, borderColor: C.border }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 }}>
                            <Text style={{ color: C.text, fontSize: 20, fontWeight: '900', textTransform: 'uppercase' }}>Cambiar Contraseña</Text>
                            <TouchableOpacity 
                                onPress={() => {
                                    setShowPasswordModal(false);
                                    setCurrentPassword('');
                                    setNewPassword('');
                                    setConfirmNewPassword('');
                                    setShowCurrentPassword(false);
                                    setShowNewPassword(false);
                                    setShowConfirmPassword(false);
                                }} 
                                style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}
                            >
                                <XCircle color={C.text} size={18} />
                            </TouchableOpacity>
                        </View>

                        <Text style={{ color: C.sub, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 8 }}>Contraseña Actual</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 15, borderWidth: 1, borderColor: C.border, marginBottom: 20 }}>
                            <TextInput
                                secureTextEntry={!showCurrentPassword}
                                value={currentPassword}
                                onChangeText={setCurrentPassword}
                                placeholder="••••••••"
                                placeholderTextColor={C.sub + '80'}
                                style={{ 
                                    flex: 1,
                                    color: C.text, 
                                    padding: 15, 
                                    fontSize: 16, 
                                    fontWeight: '700', 
                                }}
                            />
                            <TouchableOpacity onPress={() => setShowCurrentPassword(!showCurrentPassword)} style={{ paddingHorizontal: 15 }}>
                                {showCurrentPassword ? <EyeOff color={C.sub} size={20} /> : <Eye color={C.sub} size={20} />}
                            </TouchableOpacity>
                        </View>

                        <Text style={{ color: C.sub, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 8 }}>Nueva Contraseña</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 15, borderWidth: 1, borderColor: C.border, marginBottom: 20 }}>
                            <TextInput
                                secureTextEntry={!showNewPassword}
                                value={newPassword}
                                onChangeText={setNewPassword}
                                placeholder="••••••••"
                                placeholderTextColor={C.sub + '80'}
                                style={{ 
                                    flex: 1,
                                    color: C.text, 
                                    padding: 15, 
                                    fontSize: 16, 
                                    fontWeight: '700', 
                                }}
                            />
                            <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)} style={{ paddingHorizontal: 15 }}>
                                {showNewPassword ? <EyeOff color={C.sub} size={20} /> : <Eye color={C.sub} size={20} />}
                            </TouchableOpacity>
                        </View>

                        <Text style={{ color: C.sub, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 8 }}>Confirmar Nueva Contraseña</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 15, borderWidth: 1, borderColor: C.border, marginBottom: 30 }}>
                            <TextInput
                                secureTextEntry={!showConfirmPassword}
                                value={confirmNewPassword}
                                onChangeText={setConfirmNewPassword}
                                placeholder="••••••••"
                                placeholderTextColor={C.sub + '80'}
                                style={{ 
                                    flex: 1,
                                    color: C.text, 
                                    padding: 15, 
                                    fontSize: 16, 
                                    fontWeight: '700', 
                                }}
                            />
                            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={{ paddingHorizontal: 15 }}>
                                {showConfirmPassword ? <EyeOff color={C.sub} size={20} /> : <Eye color={C.sub} size={20} />}
                            </TouchableOpacity>
                        </View>

                        <View style={{ flexDirection: 'row', gap: 15 }}>
                            <TouchableOpacity 
                                onPress={() => {
                                    setShowPasswordModal(false);
                                    setCurrentPassword('');
                                    setNewPassword('');
                                    setConfirmNewPassword('');
                                    setShowCurrentPassword(false);
                                    setShowNewPassword(false);
                                    setShowConfirmPassword(false);
                                }} 
                                style={{ flex: 1, backgroundColor: isDark ? '#1e293b' : '#e2e8f0', height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}
                            >
                                <Text style={{ color: C.text, fontWeight: '900', textTransform: 'uppercase', fontSize: 12 }}>Cancelar</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                onPress={handleChangePassword} 
                                disabled={passwordLoading}
                                style={{ flex: 2, backgroundColor: COLORS.accent, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}
                            >
                                {passwordLoading ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text style={{ color: 'white', fontWeight: '900', textTransform: 'uppercase', fontSize: 12 }}>Actualizar</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* UNSAVED CHANGES ALERT MODAL */}
            <Modal visible={showUnsavedModal} transparent animationType="fade">
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
                    <View style={{ backgroundColor: C.card, borderRadius: 35, padding: 30, alignItems: 'center', width: '100%', borderWidth: 1, borderColor: C.border }}>
                        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.accent + '11', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                            <AlertCircle color={COLORS.accent} size={40} />
                        </View>
                        <Text style={{ color: C.text, fontSize: 20, fontWeight: '900', textAlign: 'center', marginBottom: 10 }}>
                            ¿Guardar tus cambios?
                        </Text>
                        <Text style={{ color: C.sub, fontSize: 14, fontWeight: '600', textAlign: 'center', marginBottom: 30, lineHeight: 20 }}>
                            Has realizado modificaciones en tu perfil. ¿Deseas guardarlas antes de salir?
                        </Text>
                        
                        <View style={{ width: '100%', gap: 12 }}>
                            <TouchableOpacity 
                                onPress={() => {
                                    setShowUnsavedModal(false);
                                    handleSave();
                                }} 
                                style={{ 
                                    backgroundColor: COLORS.accent, 
                                    paddingVertical: 15, 
                                    borderRadius: 20, 
                                    width: '100%', 
                                    alignItems: 'center' 
                                }}
                            >
                                <Text style={{ color: 'white', fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 }}>Guardar y Salir</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                onPress={() => {
                                    setShowUnsavedModal(false);
                                    setFormData(initialData);
                                    router.back();
                                }} 
                                style={{ 
                                    backgroundColor: isDark ? '#f43f5e22' : '#fef2f2',
                                    borderWidth: 1,
                                    borderColor: '#fee2e2',
                                    paddingVertical: 15, 
                                    borderRadius: 20, 
                                    width: '100%', 
                                    alignItems: 'center' 
                                }}
                            >
                                <Text style={{ color: '#f43f5e', fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 }}>Descartar Cambios</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                onPress={() => setShowUnsavedModal(false)} 
                                style={{ 
                                    paddingVertical: 12, 
                                    width: '100%', 
                                    alignItems: 'center' 
                                }}
                            >
                                <Text style={{ color: C.sub, fontWeight: '800', textTransform: 'uppercase', fontSize: 12, letterSpacing: 1 }}>Seguir Editando</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* MODAL DE CONFIRMACIÓN DE CERRAR SESIÓN */}
            <Modal
                visible={showSignOutModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowSignOutModal(false)}
            >
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 30 }}>
                    <View style={{ backgroundColor: C.card, borderRadius: 30, padding: 35, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: C.border }}>
                        <View style={{ width: 80, height: 80, borderRadius: 30, backgroundColor: '#f43f5e22', alignItems: 'center', justifyContent: 'center', marginBottom: 25 }}>
                            <LogOut color="#f43f5e" size={36} />
                        </View>
                        <Text style={{ color: C.text, fontSize: 22, fontWeight: '900', textAlign: 'center', textTransform: 'uppercase', marginBottom: 10 }}>¿Cerrar Sesión?</Text>
                        <Text style={{ color: C.sub, fontSize: 13, fontWeight: '700', textAlign: 'center', textTransform: 'uppercase', marginBottom: 30 }}>¿Estás seguro de que deseas salir de tu cuenta?</Text>
                        
                        <View style={{ flexDirection: 'row', gap: 15, width: '100%' }}>
                            <TouchableOpacity 
                                onPress={() => setShowSignOutModal(false)}
                                style={{ flex: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9', paddingVertical: 18, borderRadius: 18, alignItems: 'center', borderWidth: 1, borderColor: C.border }}
                            >
                                <Text style={{ color: C.text, fontWeight: '900', fontSize: 12, textTransform: 'uppercase' }}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                onPress={() => {
                                    setShowSignOutModal(false);
                                    signOut();
                                }}
                                style={{ flex: 1, backgroundColor: '#f43f5e', paddingVertical: 18, borderRadius: 18, alignItems: 'center', shadowColor: '#f43f5e', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20 }}
                            >
                                <Text style={{ color: 'white', fontWeight: '900', fontSize: 12, textTransform: 'uppercase' }}>Sí, Salir</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* MODAL DE CONFIRMACIÓN DE ELIMINAR CUENTA */}
            <Modal visible={showDeleteModal} transparent animationType="slide">
                <View style={{ flex: 1, backgroundColor: 'rgba(2, 6, 23, 0.98)', alignItems: 'center', justifyContent: 'center', padding: 30 }}>
                    <View style={{ backgroundColor: C.card, width: '100%', padding: 40, borderRadius: 40, alignItems: 'center', borderWidth: 2, borderColor: '#f43f5e40' }}>
                        <View style={{ width: 80, height: 80, borderRadius: 30, backgroundColor: '#f43f5e22', alignItems: 'center', justifyContent: 'center', marginBottom: 25 }}>
                            <AlertCircle color="#f43f5e" size={40} />
                        </View>
                        <Text style={{ color: '#f43f5e', fontSize: 22, fontWeight: '900', textAlign: 'center', marginBottom: 15, textTransform: 'uppercase', letterSpacing: -0.5 }}>¿ELIMINAR TU CUENTA?</Text>
                        <Text style={{ color: C.text, fontSize: 13, fontWeight: '800', textAlign: 'center', marginBottom: 25, lineHeight: 20 }}>
                            Esta acción es <Text style={{ color: '#f43f5e' }}>completamente irreversible</Text>. Se eliminarán de forma definitiva tus credenciales de acceso y perfil:
                        </Text>

                        <View style={{ width: '100%', backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc', padding: 20, borderRadius: 20, marginBottom: 35, gap: 10, borderWidth: 1, borderColor: C.border }}>
                            <Text style={{ color: C.sub, fontSize: 11, fontWeight: '700' }}>• Ficha de Jugador Topps Now 2026.</Text>
                            <Text style={{ color: C.sub, fontSize: 11, fontWeight: '700' }}>• Credenciales de acceso de Firebase Auth.</Text>
                            <Text style={{ color: C.sub, fontSize: 11, fontWeight: '700' }}>• Tus reservas e historial se conservarán de forma anónima para registros de los recintos.</Text>
                        </View>

                        <View style={{ flexDirection: 'row', gap: 15, width: '100%' }}>
                            <TouchableOpacity onPress={() => setShowDeleteModal(false)} style={{ flex: 1, height: 60, borderRadius: 20, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}>
                                <Text style={{ color: C.text, fontWeight: '900', textTransform: 'uppercase' }}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleDeleteAccount} disabled={loadingDelete} style={{ flex: 1, height: 60, borderRadius: 20, backgroundColor: '#f43f5e', alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}>
                                {loadingDelete ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text style={{ color: 'white', fontWeight: '900', textTransform: 'uppercase' }}>Eliminar</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

/** ═══ COMPONENTES ADICIONALES ═══ **/

const FeedbackModal = ({ visible, type, message, onClose, isDark }: any) => {
    const C = isDark ? COLORS.dark : COLORS.light;
    const isError = type === 'error';
    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
                <View style={{ backgroundColor: C.card, borderRadius: 35, padding: 30, alignItems: 'center', width: '100%', borderWidth: 1, borderColor: C.border }}>
                    <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: isError ? '#ef444422' : '#10b98122', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                        {isError ? <AlertCircle color="#ef4444" size={40} /> : <CheckCircle2 color="#10b981" size={40} />}
                    </View>
                    <Text style={{ color: C.text, fontSize: 20, fontWeight: '900', textAlign: 'center', marginBottom: 10 }}>
                        {isError ? 'Ups... algo falló' : '¡Todo listo!'}
                    </Text>
                    <Text style={{ color: C.sub, fontSize: 14, fontWeight: '600', textAlign: 'center', marginBottom: 30, lineHeight: 20 }}>
                        {message}
                    </Text>
                    <TouchableOpacity 
                        onPress={onClose} 
                        style={{ 
                            backgroundColor: isError ? '#ef4444' : '#10b981', 
                            paddingVertical: 15, 
                            paddingHorizontal: 40, 
                            borderRadius: 20, 
                            width: '100%', 
                            alignItems: 'center' 
                        }}
                    >
                        <Text style={{ color: 'white', fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 }}>Entendido</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const Badge = ({ label }: { label: string }) => (
    <View style={{ backgroundColor: '#ef4444', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}>
        <Text style={{ color: 'white', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' }}>{label}</Text>
    </View>
);

const SectionLabel = ({ label }: { label: string }) => (
    <Text style={{ color: '#10b981', fontWeight: '900', fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, marginHorizontal: 40, marginTop: 30, marginBottom: 10 }}>{label}</Text>
);

const Separator = ({ isDark }: { isDark: boolean }) => (
    <View style={{ height: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)', marginHorizontal: 20 }} />
);

const RefinedRow = ({ icon: Icon, color, label, value, onChange, onBlur, onFocus, isDark, error, maxLength, autoCorrect = true, autoComplete = 'on', keyboardType = 'default', rightElement }: any) => {
    const C = isDark ? COLORS.dark : COLORS.light;
    return (
        <View style={{ height: 80, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 25, backgroundColor: error ? (isDark ? '#ef444411' : '#fef2f2') : 'transparent' }}>
            <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: error ? '#ef4444' : color, alignItems: 'center', justifyContent: 'center' }}>
                {error ? <AlertCircle color="white" size={20} /> : <Icon color="white" size={20} />}
            </View>
            <View style={{ marginLeft: 20, flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: error ? '#ef4444' : C.sub, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>{label}</Text>
                    {error && <Text style={{ color: '#ef4444', fontSize: 9, fontWeight: '900' }}>INVÁLIDO</Text>}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TextInput 
                        value={value} 
                        onChangeText={onChange} 
                        onBlur={onBlur}
                        onFocus={onFocus}
                        maxLength={maxLength}
                        keyboardType={keyboardType}
                        autoCapitalize="characters"
                        autoCorrect={autoCorrect}
                        autoComplete={autoComplete}
                        style={{ flex: 1, color: error ? '#ef4444' : C.text, fontSize: 18, fontWeight: '800', padding: 0, marginTop: 2 }} 
                    />
                    {rightElement}
                </View>
            </View>
        </View>
    );
};

const RefinedSelectRow = ({ icon: Icon, color, label, value, options, onSelect, isDark, disabled }: any) => {
    const [open, setOpen] = useState(false);
    const C = isDark ? COLORS.dark : COLORS.light;
    return (
        <View style={{ opacity: disabled ? 0.4 : 1 }}>
            <TouchableOpacity disabled={disabled} onPress={() => setOpen(!open)} style={{ height: 80, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 25 }}>
                <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon color="white" size={20} />
                </View>
                <View style={{ marginLeft: 15, flex: 1 }}>
                    <Text style={{ color: C.sub, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>{label}</Text>
                    <Text style={{ color: disabled ? C.sub : C.text, fontSize: 22, fontWeight: '900' }}>{disabled ? 'Elige deporte primero...' : (value || '---')}</Text>
                </View>
                {!disabled && <ChevronRight color="#10b981" size={20} />}
            </TouchableOpacity>
            {open && !disabled && (
                <View style={{ padding: 25, flexDirection: 'row', flexWrap: 'wrap', gap: 12, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
                    {options.map((opt: string) => (
                        <TouchableOpacity key={opt} onPress={() => { onSelect(opt); setOpen(false); }} style={{ paddingHorizontal: 18, paddingVertical: 10, borderRadius: 14, backgroundColor: value === opt ? '#10b981' : (isDark ? '#1e293b' : '#f1f5f9') }}>
                            <Text style={{ color: value === opt ? 'white' : C.text, fontWeight: '800', fontSize: 14 }}>{opt}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </View>
    );
};

const RefinedToggleRow = ({ icon: Icon, color, label, value, onValueChange, isDark }: any) => {
    const C = isDark ? COLORS.dark : COLORS.light;
    return (
        <View style={{ height: 80, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 25 }}>
            <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
                <Icon color="white" size={20} />
            </View>
            <Text style={{ color: C.text, fontSize: 17, fontWeight: '800', textTransform: 'uppercase', marginLeft: 20, flex: 1 }}>{label}</Text>
            <Switch value={value} onValueChange={onValueChange} trackColor={{ false: '#e2e8f0', true: '#10b981' }} thumbColor="#FFF" />
        </View>
    );
};
