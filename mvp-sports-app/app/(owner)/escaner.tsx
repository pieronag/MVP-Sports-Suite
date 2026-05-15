import React, { useState, useEffect, useRef } from 'react';
import { 
    View, Text, TouchableOpacity, StatusBar, StyleSheet, 
    Dimensions, Animated, Easing, ActivityIndicator, ScrollView, Modal
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { 
    X, ScanLine, RefreshCcw, User, AlertTriangle,
    ShieldCheck, Clock, CreditCard, Building2, CheckCircle2
} from 'lucide-react-native';
import { useAuth } from '../../store/useAuth';
import { bookingService } from '../../services/bookingService';
import { Timestamp } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');
const ACCENT = '#10b981'; // Emerald Premium

export default function ScannerScreen() {
    const router = useRouter();
    const { theme, profile } = useAuth();
    const isDark = theme === 'dark';
    const [permission, requestPermission] = useCameraPermissions();
    
    const [scanned, setScanned] = useState(false);
    const [loading, setLoading] = useState(false);
    const [scanResult, setScanResult] = useState<any>(null);
    const [scanError, setScanError] = useState<string | null>(null);

    const scanLineAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (!scanned) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(scanLineAnim, {
                        toValue: 240,
                        duration: 2000,
                        easing: Easing.linear,
                        useNativeDriver: true,
                    }),
                    Animated.timing(scanLineAnim, {
                        toValue: 0,
                        duration: 0,
                        useNativeDriver: true,
                    })
                ])
            ).start();
        }
    }, [scanned]);

    useEffect(() => {
        (async () => {
            if (!permission?.granted) {
                await requestPermission();
            }
        })();
    }, []);

    const validateWindow = (dateTs: any) => {
        const now = new Date();
        const start = dateTs?.toDate ? dateTs.toDate() : (dateTs instanceof Date ? dateTs : null);
        if (!start) return { ok: true, message: '' };

        const twoHoursBefore = new Date(start.getTime() - 2 * 60 * 60 * 1000);
        const fifteenAfter = new Date(start.getTime() + 15 * 60 * 1000);

        if (now < twoHoursBefore) {
            return { ok: false, message: 'Demasiado temprano para validar' };
        }
        if (now > fifteenAfter) {
            return { ok: false, message: 'La ventana de ingreso ya expiró' };
        }
        return { ok: true, message: '' };
    };

    const handleBarCodeScanned = async ({ data }: any) => {
        setScanned(true);
        setLoading(true);
        try {
            const bookingId = String(data || '').trim();
            if (!bookingId) throw new Error('Código no válido');

            const booking = await bookingService.getBooking(bookingId);
            if (!booking) {
                setScanError('Ticket no registrado en sistema');
                return;
            }

            const managerTenantIds = profile?.tenantIds || [];
            if (managerTenantIds.length > 0 && !managerTenantIds.includes(booking.tenantId)) {
                setScanError('Acceso denegado: recinto no asignado');
                return;
            }

            if (booking.checkIn) {
                setScanError('Este código ya fue validado anteriormente');
                return;
            }

            const window = validateWindow(booking.date);
            if (!window.ok) {
                setScanError(window.message);
                return;
            }

            setScanResult({ ...booking, id: bookingId });
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }).start();

        } catch (e) {
            setScanError('Error crítico al procesar código');
        } finally {
            setLoading(false);
        }
    };

    const confirmCheckIn = async (markAsPaid = false) => {
        if (!scanResult) return;
        setLoading(true);
        try {
            if (markAsPaid) {
                await bookingService.setPaymentStatus({ 
                    bookingId: scanResult.id, 
                    paymentStatus: 'paid' 
                });
            }

            await bookingService.updateBooking(scanResult.id, {
                checkIn: true,
                checkInTime: Timestamp.now(),
                status: 'confirmed',
            });

            router.replace('/(owner)');
        } catch (error) {
            setScanError('Error al registrar ingreso');
        } finally {
            setLoading(false);
        }
    };

    if (!permission) return <View className="flex-1 bg-black" />;

    return (
        <View style={styles.container} className="bg-black">
            <StatusBar barStyle="light-content" translucent />

            {!scanned && permission.granted && (
                <View style={styles.fullOverlay}>
                    <CameraView
                        style={StyleSheet.absoluteFill}
                        facing="back"
                        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                    />

                    {/* Visor HUD Centrado Absoluto */}
                    <View style={styles.hudOverlay}>
                        <View style={styles.scannerBox}>
                            {/* Bornes tácticos centrado total */}
                            <View className="absolute top-0 left-0 w-20 h-20 border-t-[5px] border-l-[5px] border-emerald-500 rounded-tl-[44px]" />
                            <View className="absolute top-0 right-0 w-20 h-20 border-t-[5px] border-r-[5px] border-emerald-500 rounded-tr-[44px]" />
                            <View className="absolute bottom-0 left-0 w-20 h-20 border-b-[5px] border-l-[5px] border-emerald-500 rounded-bl-[44px]" />
                            <View className="absolute bottom-0 right-0 w-20 h-20 border-b-[5px] border-r-[5px] border-emerald-500 rounded-br-[44px]" />

                            <View className="absolute inset-6 border border-emerald-500/20 rounded-[30px] bg-emerald-500/5 overflow-hidden flex-row items-center justify-center">
                                <Animated.View 
                                    style={{ 
                                        position: 'absolute', top: 0, left: 0, right: 0, height: 4, backgroundColor: '#10b981', 
                                        borderRadius: 2, shadowColor: '#10b981', shadowOpacity: 1, shadowRadius: 15,
                                        transform: [{ translateY: scanLineAnim }]
                                    }} 
                                />
                                <ScanLine color="#10b981" size={56} opacity={0.2} />
                            </View>
                        </View>
                    </View>

                    {/* Header Independiente */}
                    <View className="absolute top-0 left-0 right-0 z-[100] pt-20 px-8 flex-row justify-between items-start">
                        <View>
                            <View className="flex-row items-center mb-3">
                                <View className="px-3 h-6 rounded-full items-center justify-center shadow-lg bg-emerald-500">
                                    <Text className="text-white font-black text-[8px] uppercase tracking-widest">Activo</Text>
                                </View>
                                <Text className="ml-3 text-white/70 font-black text-[9px] uppercase tracking-[0.3em]">Scanner Instrumental</Text>
                            </View>
                            <Text className="text-white font-black text-5xl tracking-tighter leading-none">
                                Escáner
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => router.back()}
                            className="w-14 h-14 bg-white/10 rounded-[22px] items-center justify-center border border-white/20"
                        >
                            <X color="#fff" size={24} />
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* MODAL DE ERROR (Elite Alert) */}
            <Modal
                transparent
                visible={scanError !== null}
                animationType="fade"
            >
                <View className="flex-1 bg-black/95 items-center justify-center p-8">
                    <View className="w-full bg-[#020617] rounded-[50px] p-10 items-center border border-white/10 shadow-2xl">
                        <View className="bg-rose-500/10 p-10 rounded-[40px] mb-8 border border-rose-500/10">
                            <AlertTriangle color="#f43f5e" size={72} strokeWidth={1} />
                        </View>
                        <Text className="text-white font-black text-3xl text-center mb-4 tracking-tighter">Acceso Denegado</Text>
                        <Text className="text-slate-500 text-center mb-12 font-bold uppercase text-[9px] tracking-[0.3em] leading-relaxed px-4 text-center">{scanError}</Text>
                        
                        <TouchableOpacity
                            onPress={() => { setScanned(false); setScanError(null); }}
                            className="bg-white/10 h-18 w-full rounded-[28px] items-center justify-center border border-white/10 flex-row"
                        >
                            <RefreshCcw color="#fff" size={20} className="mr-4" />
                            <Text className="text-white font-black uppercase tracking-[0.3em] text-[10px]">Reintentar Lectura</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* PESTAÑA DE RESUMEN (Elite Result) */}
            {scanResult && !loading && (
                <View style={styles.fullOverlay} className="bg-[#020617]">
                    <LinearGradient colors={['#020617', '#064e3b15', '#020617']} style={StyleSheet.absoluteFill} />
                    
                    <ScrollView className="flex-1" contentContainerStyle={{ paddingTop: 80, paddingHorizontal: 32, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
                        <View className="mb-12">
                            <View className="flex-row items-center mb-4">
                                <View className="px-3 h-6 rounded-full items-center justify-center shadow-lg bg-emerald-500">
                                    <Text className="text-white font-black text-[8px] uppercase tracking-widest">Validado</Text>
                                </View>
                                <Text className="ml-3 text-slate-400 font-black text-[9px] uppercase tracking-[0.3em]">Resumen de Entrada</Text>
                            </View>
                            <Text className="text-white font-black text-5xl tracking-tighter leading-none mb-2 uppercase">{scanResult.clientName || 'CLIENTE'}</Text>
                        </View>

                        <View className="rounded-[44px] overflow-hidden border border-white/5 bg-white/[0.03] shadow-2xl mb-10">
                            <LinearGradient colors={[`${ACCENT}15`, 'transparent']} style={{ height: 100 }} />
                            
                            <View className="px-8 pb-12 items-center" style={{ marginTop: -40 }}>
                                <View className="w-24 h-24 rounded-[36px] bg-[#020617] items-center justify-center mb-10 shadow-3xl border border-white/10">
                                    <User color={ACCENT} size={48} strokeWidth={1.5} />
                                </View>

                                <View className="w-full space-y-6">
                                    <SummaryRow label="Recinto" icon={Building2} value={scanResult.tenantName || 'MVP Arena'} />
                                    <SummaryRow label="Actividad" icon={ShieldCheck} value={scanResult.courtName || 'Cancha'} />
                                    <SummaryRow label="Horario" icon={Clock} value={`${scanResult.startTime || '--:--'} a ${scanResult.endTime || '--:--'}`} />
                                    <SummaryRow 
                                        label="Estado Pago" 
                                        icon={CreditCard} 
                                        value={scanResult.paymentStatus?.toUpperCase() || 'Pendiente'} 
                                        color={scanResult.paymentStatus === 'paid' ? ACCENT : '#f59e0b'}
                                    />
                                </View>
                            </View>
                        </View>

                        {scanResult.paymentStatus !== 'paid' ? (
                            <View className="space-y-4">
                                <TouchableOpacity
                                    onPress={() => confirmCheckIn(true)}
                                    className="bg-emerald-500 h-22 rounded-[44px] items-center justify-center flex-row shadow-2xl shadow-emerald-500/30"
                                >
                                    <CheckCircle2 color="#fff" size={24} strokeWidth={3} />
                                    <Text className="text-white font-black text-[12px] uppercase tracking-[0.3em] ml-4">Registrar Pago & Ingreso</Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity
                                    onPress={() => confirmCheckIn(false)}
                                    className="h-16 w-full items-center justify-center"
                                >
                                    <Text className="text-slate-500 font-black text-[9px] uppercase tracking-[0.4em]">Ignorar Pago Pendiente</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <TouchableOpacity
                                onPress={() => confirmCheckIn(false)}
                                className="bg-emerald-500 h-24 rounded-[44px] items-center justify-center flex-row shadow-2xl shadow-emerald-500/40"
                            >
                                <CheckCircle2 color="#fff" size={32} strokeWidth={3} />
                                <Text className="text-white font-black text-xl uppercase tracking-[0.3em] ml-5">Confirmar Acceso</Text>
                            </TouchableOpacity>
                        )}
                    </ScrollView>
                </View>
            )}

            {loading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator color={ACCENT} size="large" />
                    <Text className="text-emerald-500 font-black text-[10px] uppercase tracking-[0.6em] mt-10 text-center">Validando Identidad...</Text>
                </View>
            )}
        </View>
    );
}

function SummaryRow({ label, icon: Icon, value, color }: any) {
    return (
        <View className="flex-row justify-between items-center py-1">
            <View className="flex-row items-center">
                <View className="w-7 h-7 rounded-xl bg-white/5 items-center justify-center mr-4">
                    <Icon size={12} color="#94a3b8" />
                </View>
                <Text className="text-slate-500 font-black text-[8px] uppercase tracking-[0.3em]">{label}</Text>
            </View>
            <Text 
                style={{ color: color || '#FFF' }} 
                className="font-black text-[10px] uppercase tracking-widest"
            >
                {value}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    fullOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999, // Blindaje total sobre el menú
        height: height,
        width: width,
    },
    hudOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    scannerBox: {
        width: 320,
        height: 320,
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10000,
        backgroundColor: 'rgba(0,0,0,0.85)',
        alignItems: 'center',
        justifyContent: 'center',
    }
});
