import React, { useState, useEffect } from 'react';
import { 
    View, Text, TouchableOpacity, ScrollView, StatusBar, 
    StyleSheet, ActivityIndicator, Image, Dimensions, Modal 
} from 'react-native';
import { useRouter } from 'expo-router';
import { 
    User, Mail, Shield, LogOut, Camera, 
    Building2, MapPin, ChevronRight, FileText, Sun, Moon, Zap, ShieldCheck, ChevronLeft, Save
} from 'lucide-react-native';
import { useAuth } from '../../store/useAuth';
import * as ImagePicker from 'expo-image-picker';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { userService } from '../../services/userService';
import { venueService, Tenant } from '../../services/venueService';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

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
    accent: '#10b981',
    error: '#f43f5e'
};

export default function ProfileScreen() {
    const router = useRouter();
    const { user, profile, signOut, theme, toggleTheme } = useAuth();
    const isDark = theme === 'dark';
    const C = isDark ? COLORS.dark : COLORS.light;

    const [loading, setLoading] = useState(false);
    const [userData, setUserData] = useState<any>(profile);
    const [managedVenues, setManagedVenues] = useState<Tenant[]>([]);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');

    useEffect(() => {
        const fetchStaffAndProfile = async () => {
            if (!user?.uid) return;
            try {
                const staffRes = await userService.getStaffProfile(user.uid);
                const staffInfo = staffRes?.data;
                const userProfile = await userService.getUserProfile(user.uid);
                
                const mergedData = {
                    ...userProfile,
                    fullName: staffInfo?.fullName || userProfile?.displayName || user.displayName || 'MANAGER'
                };
                
                setUserData(mergedData);

                const tenantIds = staffInfo?.tenantIds || mergedData.tenantIds || [];
                if (tenantIds.length) {
                    const venues = await venueService.getVenuesByIds(tenantIds);
                    setManagedVenues(venues);
                }
            } catch (err) {
                console.error("Profile Load Error:", err);
            }
        };
        fetchStaffAndProfile();
    }, [user?.uid]);

    const handlePickImage = async () => {
        try {
            const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permResult.granted) {
                Alert.alert('Permiso denegado', 'Necesitamos acceso a tu galería para cambiar la foto.');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.5,
                base64: true,
            });

            if (!result.canceled && result.assets[0].base64 && user) {
                setLoading(true);
                const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
                
                // 1. Actualizar Firestore (users)
                await updateDoc(doc(db, 'users', user.uid), { 
                    photoURL: base64Image 
                });

                // 2. Actualizar Firestore (staff) - si existe
                await userService.updateStaffProfile(user.uid, {
                    photoURL: base64Image
                });

                // 3. Actualizar Firebase Auth Profile
                try {
                    await updateProfile(user, {
                        photoURL: base64Image
                    });
                } catch (e) {
                    console.warn("Auth update failed:", e);
                }
                
                setUserData({ ...userData, photoURL: base64Image });
                await useAuth.getState().reloadProfile();
                
                setSuccessMsg('Tu foto de perfil ha sido actualizada con éxito.');
                setShowSuccessModal(true);
            }
        } catch (error) {
            console.error("Photo Update Error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSignOut = async () => {
        signOut();
    };

    return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent />

            {/* CABECERA DNA ELITE */}
            <View style={{ paddingTop: 60, paddingBottom: 20, paddingHorizontal: 30, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: C.border }}>
                <TouchableOpacity onPress={() => router.back()} style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}>
                    <ChevronLeft color={COLORS.accent} size={24} />
                </TouchableOpacity>
                <Text style={{ color: C.text, fontSize: 20, fontWeight: '900', textTransform: 'uppercase' }}>Perfil Staff</Text>
                <TouchableOpacity onPress={handleSignOut} style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: isDark ? COLORS.error + '22' : '#fef2f2', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: isDark ? COLORS.error + '44' : '#fee2e2' }}>
                    <LogOut color={COLORS.error} size={20} />
                </TouchableOpacity>
            </View>

            <ScrollView 
                className="flex-1" 
                contentContainerStyle={{ paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
            >
                {/* BANNER IDENTIDAD DNA */}
                <View style={{ padding: 30, paddingBottom: 10 }}>
                    <View style={{ backgroundColor: C.card, borderRadius: 30, padding: 25, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.border }}>
                        <TouchableOpacity onPress={handlePickImage} style={{ width: 70, height: 70, borderRadius: 22, backgroundColor: COLORS.accent + '11', overflow: 'hidden', borderWidth: 2, borderColor: COLORS.accent }}>
                            {userData?.photoURL ? (
                                <Image source={{ uri: userData.photoURL }} style={{ width: '100%', height: '100%' }} />
                            ) : (
                                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                                    <User color={COLORS.accent} size={32} strokeWidth={1} />
                                </View>
                            )}
                            <View style={{ position: 'absolute', bottom: 0, right: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.5)', height: 20, alignItems: 'center', justifyContent: 'center' }}>
                                <Camera color="white" size={10} />
                            </View>
                        </TouchableOpacity>
                        <View style={{ marginLeft: 20, flex: 1 }}>
                            <Text style={{ color: C.text, fontSize: 22, fontWeight: '900', textTransform: 'uppercase' }}>{userData?.fullName || 'Manager'}</Text>
                            <Text style={{ color: COLORS.accent, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 }}>Acceso {userData?.role || 'Staff'}</Text>
                        </View>
                    </View>
                </View>

                {/* MIS DATOS */}
                <SectionLabel label="Mis Credenciales" />
                <View style={{ marginHorizontal: 30, backgroundColor: C.card, borderRadius: 25, overflow: 'hidden', borderWidth: 1, borderColor: C.border }}>
                    <RefinedRow icon={Mail} color="#3b82f6" label="Correo Institucional" value={userData?.email || user?.email} isDark={isDark} />
                    <Separator isDark={isDark} />
                    <RefinedRow icon={ShieldCheck} color={COLORS.accent} label="Nivel Operativo" value="VERIFICADO" isDark={isDark} />
                    <Separator isDark={isDark} />
                    <RefinedRow icon={FileText} color="#6366f1" label="ID de Staff" value={user?.uid.substring(0, 16).toUpperCase()} isDark={isDark} />
                </View>

                {/* CENTROS DE OPERACIÓN */}
                <SectionLabel label="Sedes Administradas" />
                <View style={{ marginHorizontal: 30 }}>
                    {managedVenues.length > 0 ? managedVenues.map((venue, idx) => (
                        <View key={venue.id} style={{ backgroundColor: C.card, borderRadius: 25, padding: 25, marginBottom: 15, borderWidth: 1, borderColor: C.border, flexDirection: 'row', alignItems: 'center' }}>
                            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: COLORS.accent + '11', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.accent + '22' }}>
                                <Building2 color={COLORS.accent} size={22} />
                            </View>
                            <View style={{ marginLeft: 15, flex: 1 }}>
                                <Text style={{ color: C.text, fontSize: 16, fontWeight: '900', textTransform: 'uppercase' }}>{venue.name}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                    <MapPin size={10} color={C.sub} className="mr-1" />
                                    <Text style={{ color: C.sub, fontSize: 9, fontWeight: '700' }}>Centro de Control Activo</Text>
                                </View>
                            </View>
                            <ChevronRight color={C.border} size={20} />
                        </View>
                    )) : (
                        <View style={{ padding: 40, alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', borderWidth: 2, borderColor: C.border, borderRadius: 30 }}>
                            <Text style={{ color: C.sub, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }}>Sin sedes asignadas</Text>
                        </View>
                    )}
                </View>

                {/* AJUSTES */}
                <SectionLabel label="Preferencias" />
                <View style={{ marginHorizontal: 30, backgroundColor: C.card, borderRadius: 25, overflow: 'hidden', borderWidth: 1, borderColor: C.border }}>
                    <TouchableOpacity onPress={toggleTheme} style={{ height: 75, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 25 }}>
                        <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}>
                            {isDark ? <Sun color={COLORS.accent} size={20} /> : <Moon color="#1e293b" size={20} />}
                        </View>
                        <Text style={{ color: C.text, fontSize: 14, fontWeight: '800', textTransform: 'uppercase', marginLeft: 15, flex: 1 }}>{isDark ? 'Modo Claro' : 'Modo Oscuro'}</Text>
                        <ChevronRight color={C.border} size={18} />
                    </TouchableOpacity>
                </View>

                <Text style={{ textAlign: 'center', color: C.sub, fontSize: 8, fontWeight: '700', marginTop: 40 }}>STAFF IDENTITY v1.2 • MVP SPORTS</Text>
            </ScrollView>

            {loading && (
                <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                    <ActivityIndicator color={COLORS.accent} size="large" />
                </View>
            )}

            {/* MODAL DE ÉXITO PREMIUM */}
            <Modal
                visible={showSuccessModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowSuccessModal(false)}
            >
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 30 }}>
                    <View style={{ backgroundColor: C.card, borderRadius: 30, padding: 35, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: C.border }}>
                        <View style={{ width: 80, height: 80, borderRadius: 30, backgroundColor: COLORS.accent + '22', alignItems: 'center', justifyContent: 'center', marginBottom: 25 }}>
                            <ShieldCheck color={COLORS.accent} size={40} />
                        </View>
                        <Text style={{ color: C.text, fontSize: 22, fontWeight: '900', textAlign: 'center', textTransform: 'uppercase', marginBottom: 10 }}>¡Operación Exitosa!</Text>
                        <Text style={{ color: C.sub, fontSize: 13, fontWeight: '700', textAlign: 'center', textTransform: 'uppercase', marginBottom: 30 }}>{successMsg}</Text>
                        
                        <TouchableOpacity 
                            onPress={() => setShowSuccessModal(false)}
                            style={{ backgroundColor: COLORS.accent, paddingVertical: 18, paddingHorizontal: 40, borderRadius: 18, width: '100%', alignItems: 'center', shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20 }}
                        >
                            <Text style={{ color: 'white', fontWeight: '900', fontSize: 14, textTransform: 'uppercase' }}>Continuar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

function SectionLabel({ label }: { label: string }) {
    return (
        <Text style={{ color: COLORS.accent, fontWeight: '900', fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, marginHorizontal: 40, marginTop: 35, marginBottom: 15 }}>{label}</Text>
    );
}

function Separator({ isDark }: { isDark: boolean }) {
    return (
        <View style={{ height: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', marginHorizontal: 25 }} />
    );
}

function RefinedRow({ icon: Icon, color, label, value, isDark }: any) {
    const C = isDark ? COLORS.dark : COLORS.light;
    return (
        <View style={{ height: 80, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 25 }}>
            <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
                <Icon color="white" size={20} />
            </View>
            <View style={{ marginLeft: 20, flex: 1 }}>
                <Text style={{ color: C.sub, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>{label}</Text>
                <Text style={{ color: C.text, fontSize: 16, fontWeight: '800', marginTop: 2 }}>{value}</Text>
            </View>
        </View>
    );
}
