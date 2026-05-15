import React, { useState, useEffect } from 'react';
import { 
    View, Text, TouchableOpacity, ScrollView, StatusBar, 
    StyleSheet, ActivityIndicator, Alert, Image, Dimensions 
} from 'react-native';
import { useRouter } from 'expo-router';
import { 
    User, Mail, Shield, LogOut, Camera, 
    Building2, MapPin, ChevronRight, FileText
} from 'lucide-react-native';
import { useAuth } from '../../store/useAuth';
import * as ImagePicker from 'expo-image-picker';
import { userService } from '../../services/userService';
import { venueService, Tenant } from '../../services/venueService';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const ACCENT = '#10b981'; // Emerald Premium

export default function ProfileScreen() {
    const router = useRouter();
    const { user, profile, signOut, theme } = useAuth();
    const isDark = theme === 'dark';

    const [loading, setLoading] = useState(false);
    const [userData, setUserData] = useState<any>(profile);
    const [managedVenues, setManagedVenues] = useState<Tenant[]>([]);

    useEffect(() => {
        const fetchStaffAndProfile = async () => {
            if (!user?.uid) return;
            
            // Search manually in 'staff' collection by UID
            const staffInfo = await userService.getStaffProfile(user.uid);
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
        };
        fetchStaffAndProfile();
    }, [user?.uid]);

    const handlePickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled && result.assets[0].uri) {
            setLoading(true);
            try {
                const newUri = result.assets[0].uri;
                await userService.updateUserProfile(user!.uid, { photoURL: newUri });
                setUserData({ ...userData, photoURL: newUri });
            } catch (error) {
                Alert.alert('Error', 'No se pudo actualizar la foto');
            } finally {
                setLoading(false);
            }
        }
    };

    const handleSignOut = async () => {
        Alert.alert(
            'Cerrar Sesión',
            '¿Deseas salir del sistema?',
            [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Salir', style: 'destructive', onPress: () => signOut() }
            ]
        );
    };

    return (
        <View className="flex-1 bg-white dark:bg-[#020617]">
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent />

            <View className="absolute inset-0 pointer-events-none">
                <LinearGradient
                    colors={isDark ? ['#020617', '#064e3b10', '#020617'] : ['#f8fafc', '#ffffff']}
                    style={StyleSheet.absoluteFill}
                />
            </View>

            <ScrollView 
                className="flex-1" 
                contentContainerStyle={{ paddingBottom: 20 }} // Espacio reducido al mínimo
                showsVerticalScrollIndicator={false}
            >
                {/* Header Unificado Estilo Inicio */}
                <View className="pt-20 pb-10 px-8">
                    <View className="flex-row justify-between items-start mb-2">
                        <View>
                            <View className="flex-row items-center mb-3">
                                <View className="px-3 h-6 rounded-full items-center justify-center shadow-lg" style={{ backgroundColor: ACCENT }}>
                                    <Text className="text-white font-black text-[8px] uppercase tracking-widest">Verificado</Text>
                                </View>
                                <Text className="ml-3 text-slate-400 font-black text-[9px] uppercase tracking-[0.3em]">Gestión Personal</Text>
                            </View>
                            <Text className="text-slate-900 dark:text-white font-black text-5xl tracking-tighter leading-none">
                                Perfil
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={handleSignOut}
                            className="w-14 h-14 bg-rose-500/10 dark:bg-rose-500/10 rounded-[22px] items-center justify-center border border-rose-500/20"
                        >
                            <LogOut color="#f43f5e" size={20} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Identidad con fullName Totalmente Mayúscula */}
                <View className="px-6 mb-12">
                    <View className="bg-white dark:bg-white/[0.03] rounded-[44px] p-8 border border-slate-100 dark:border-white/5 shadow-2xl items-center relative overflow-hidden">
                        <LinearGradient 
                            colors={[ACCENT + '10', 'transparent']} 
                            style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 100 }}
                        />
                        
                        <TouchableOpacity 
                            onPress={handlePickImage}
                            className="relative mb-8"
                            activeOpacity={0.9}
                        >
                            <View className="w-32 h-32 rounded-[44px] overflow-hidden border-4 border-white dark:border-[#0F172A] shadow-2xl bg-slate-50 dark:bg-[#0F172A]">
                                {userData?.photoURL ? (
                                    <Image source={{ uri: userData.photoURL }} className="w-full h-full" />
                                ) : (
                                    <View className="w-full h-full items-center justify-center">
                                        <User color={ACCENT} size={44} strokeWidth={1.5} />
                                    </View>
                                )}
                            </View>
                            <View className="absolute bottom-0 right-0 w-9 h-9 bg-emerald-500 rounded-full border-4 border-white dark:border-[#020617] items-center justify-center shadow-lg">
                                <Camera color="white" size={12} />
                            </View>
                        </TouchableOpacity>

                        <Text className="text-slate-900 dark:text-white font-black text-3xl tracking-tighter leading-none text-center mb-2 uppercase">
                            {userData?.fullName || 'CARGANDO...'}
                        </Text>
                        <View className="px-6 h-7 rounded-full bg-slate-50 dark:bg-white/10 items-center justify-center mb-10 border border-slate-100 dark:border-white/5">
                            <Text className="text-slate-400 dark:text-slate-400 font-bold text-[8px] uppercase tracking-[0.3em]">
                                Acceso de Gestión {userData?.role || 'MANAGER'}
                            </Text>
                        </View>

                        <View className="w-full h-[1px] bg-slate-100 dark:bg-white/5 mb-10" />

                        <View className="w-full space-y-6 px-2">
                            <InfoRow label="Correo Institucional" value={userData?.email || user?.email} icon={Mail} />
                            <InfoRow label="Nivel Operativo" value="VERIFICADO" icon={Shield} color={ACCENT} />
                            <InfoRow label="Registro Staff" value={user?.uid.substring(0, 18).toUpperCase()} icon={FileText} />
                        </View>
                    </View>
                </View>

                {/* Establecimientos Gestionados */}
                <View className="px-8 mb-6">
                    <Text className="text-slate-400 font-black text-[9px] uppercase tracking-[0.4em] mb-6 ml-2">Establecimientos que Administra</Text>
                    {managedVenues.length > 0 ? managedVenues.map(venue => (
                        <View 
                            key={venue.id}
                            className="bg-white dark:bg-white/[0.03] rounded-[36px] p-6 border border-slate-100 dark:border-white/5 flex-row items-center mb-4 shadow-sm"
                        >
                            <View className="w-14 h-14 rounded-2xl bg-emerald-500/10 items-center justify-center mr-5">
                                <Building2 color={ACCENT} size={24} strokeWidth={2.5} />
                            </View>
                            <View className="flex-1">
                                <Text className="text-slate-900 dark:text-white font-black text-lg tracking-tighter uppercase leading-none mb-1">{venue.name}</Text>
                                <View className="flex-row items-center">
                                    <MapPin size={8} color={ACCENT} className="mr-1" />
                                    <Text className="text-slate-400 font-bold text-[8px] uppercase tracking-widest leading-none">Ubicación Registrada</Text>
                                </View>
                            </View>
                            <ChevronRight color="#64748b" size={16} />
                        </View>
                    )) : (
                        <View className="p-10 border-2 border-dashed border-slate-100 dark:border-white/5 rounded-[44px] items-center">
                            <Text className="text-slate-400 font-bold text-[8px] uppercase tracking-widest text-center leading-relaxed">Sin centros asignados en esta cuenta</Text>
                        </View>
                    )}
                </View>
            </ScrollView>

            {loading && (
                <View className="absolute inset-0 bg-black/50 items-center justify-center z-50">
                    <ActivityIndicator color={ACCENT} size="large" />
                </View>
            )}
        </View>
    );
}

function InfoRow({ label, value, icon: Icon, color = '#64748b' }: any) {
    return (
        <View className="flex-row items-center justify-between py-1">
            <View className="flex-row items-center">
                <View className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-white/5 items-center justify-center mr-4">
                    <Icon size={12} color="#94a3b8" />
                </View>
                <Text className="text-slate-400 font-black text-[7px] uppercase tracking-widest">{label}</Text>
            </View>
            <Text className="text-slate-900 dark:text-white font-black text-[9px] uppercase tracking-widest" style={{ color: color !== '#64748b' ? color : undefined }}>
                {value}
            </Text>
        </View>
    );
}
