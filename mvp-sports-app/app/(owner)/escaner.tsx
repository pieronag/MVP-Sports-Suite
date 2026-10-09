import React, { useState, useEffect, useRef } from 'react';
import { 
    View, Text, TouchableOpacity, StatusBar, StyleSheet, 
    Dimensions, Animated, Easing, ActivityIndicator, ScrollView, Modal, Image
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNetInfo } from '@react-native-community/netinfo';
import { useRouter } from 'expo-router';
import { 
    X, ScanLine, RefreshCcw, User, AlertTriangle,
    ShieldCheck, Clock, CreditCard, Building2, CheckCircle2, Zap, ArrowUpRight, ChevronLeft
} from 'lucide-react-native';
import { useAuth } from '../../store/useAuth';
import { bookingService } from '../../services/bookingService';
import { Timestamp } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

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

export default function ScannerScreen() {
    const router = useRouter();
    const { theme, profile } = useAuth();
    const isDark = theme === 'dark';
    const C = isDark ? COLORS.dark : COLORS.light;
    const netInfo = useNetInfo();
    const isOffline = netInfo.isConnected === false;
    
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [loading, setLoading] = useState(false);
    const [scanResult, setScanResult] = useState<any>(null);
    const [scanError, setScanError] = useState<string | null>(null);

    const scanLineAnim = useRef(new Animated.Value(0)).current;

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

            setScanResult({ ...booking, id: bookingId });
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

    if (!permission) return <View style={{ flex: 1, backgroundColor: COLORS.dark.bg }} />;

    return (
        <View style={{ flex: 1, backgroundColor: '#000' }}>
            <StatusBar barStyle="light-content" translucent />

            {!scanned && permission.granted && (
                <View style={StyleSheet.absoluteFill}>
                    <CameraView
                        style={StyleSheet.absoluteFill}
                        facing="back"
                        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                    />

                    {/* HUD OVERLAY DNA */}
                    <View style={styles.hudOverlay}>
                        <View style={styles.scannerBox}>
                            {/* Bornes tácticos Elite */}
                            <View style={[styles.corner, { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 30 }]} />
                            <View style={[styles.corner, { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 30 }]} />
                            <View style={[styles.corner, { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 30 }]} />
                            <View style={[styles.corner, { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 30 }]} />

                            <Animated.View 
                                style={[styles.scanLine, { transform: [{ translateY: scanLineAnim }] }]} 
                            />
                        </View>
                        
                        <Text style={styles.scanText}>Apunta al código QR</Text>
                    </View>

                    {/* HEADER DNA */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
                            <ChevronLeft color={COLORS.accent} size={24} />
                        </TouchableOpacity>
                        <View style={{ alignItems: 'center' }}>
                            <Text style={styles.headerTitle}>Validar Ticket</Text>
                            {isOffline && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, backgroundColor: COLORS.error + '40', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.error, marginRight: 4 }} />
                                    <Text style={{ color: '#fff', fontSize: 8, fontWeight: '900', textTransform: 'uppercase' }}>Operando Local</Text>
                                </View>
                            )}
                        </View>
                        <View style={{ width: 44 }} />
                    </View>
                </View>
            )}

            {/* RESULTADO DNA (Inspirado en Preferencias/Billetera) */}
            <Modal visible={scanResult !== null && !loading} animationType="slide" transparent>
                <View style={{ flex: 1, backgroundColor: C.bg }}>
                    <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
                    
                    {/* CABECERA RESULTADO */}
                    <View style={{ paddingTop: 60, paddingBottom: 20, paddingHorizontal: 30, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: C.border }}>
                        <TouchableOpacity onPress={() => { setScanResult(null); setScanned(false); }} style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}>
                            <X color={COLORS.accent} size={24} />
                        </TouchableOpacity>
                        <Text style={{ color: C.text, fontSize: 18, fontWeight: '900', textTransform: 'uppercase' }}>Resumen de Acceso</Text>
                        <View style={{ width: 44 }} />
                    </View>

                    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 60 }}>
                        {/* BANNER CLIENTE (Saldo Style) */}
                        <View style={{ padding: 30, paddingBottom: 10 }}>
                            <View style={{ backgroundColor: C.card, borderRadius: 30, padding: 30, borderWidth: 1, borderColor: C.border, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                                    <View style={{ width: 60, height: 60, borderRadius: 20, backgroundColor: COLORS.accent + '15', alignItems: 'center', justifyContent: 'center' }}>
                                        <User color={COLORS.accent} size={32} />
                                    </View>
                                    <View style={{ marginLeft: 20 }}>
                                        <Text style={{ color: C.text, fontSize: 24, fontWeight: '900', textTransform: 'uppercase' }}>{scanResult?.clientName?.split(' ')[0]}</Text>
                                        <Text style={{ color: COLORS.accent, fontSize: 11, fontWeight: '800' }}>TICKET VERIFICADO</Text>
                                    </View>
                                </View>
                                <View style={{ height: 1, backgroundColor: C.border, marginBottom: 20 }} />
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <View>
                                        <Text style={{ color: C.sub, fontSize: 9, fontWeight: '900', textTransform: 'uppercase', marginBottom: 4 }}>Estado de Pago</Text>
                                        <Text style={{ color: scanResult?.paymentStatus === 'paid' ? COLORS.accent : '#f59e0b', fontSize: 16, fontWeight: '900' }}>
                                            {scanResult?.paymentStatus === 'paid' ? 'LIQUIDADO' : 'PENDIENTE'}
                                        </Text>
                                    </View>
                                    <ShieldCheck color={COLORS.accent} size={32} opacity={0.3} />
                                </View>
                            </View>
                        </View>

                        {/* DETALLES (Rows Style) */}
                        <SectionLabel label="Detalles de la Reserva" />
                        <View style={{ marginHorizontal: 30, backgroundColor: C.card, borderRadius: 25, overflow: 'hidden', borderWidth: 1, borderColor: C.border }}>
                            <RefinedRow icon={Building2} color="#3b82f6" label="Recinto" value={scanResult?.tenantName || 'MVP Arena'} isDark={isDark} />
                            <Separator isDark={isDark} />
                            <RefinedRow icon={Zap} color="#10b981" label="Servicio" value={scanResult?.courtName || 'Cancha Principal'} isDark={isDark} />
                            <Separator isDark={isDark} />
                            <RefinedRow icon={Clock} color="#f59e0b" label="Horario" value={`${scanResult?.startTime} a ${scanResult?.endTime}`} isDark={isDark} />
                            <Separator isDark={isDark} />
                            <RefinedRow icon={CreditCard} color="#6366f1" label="Total" value={'$' + (scanResult?.totalPrice || 0).toLocaleString('es-CL')} isDark={isDark} />
                        </View>

                        {/* ACCIONES DNA */}
                        <View style={{ padding: 30, marginTop: 10 }}>
                            {scanResult?.paymentStatus !== 'paid' ? (
                                <TouchableOpacity 
                                    onPress={() => confirmCheckIn(true)}
                                    style={{ backgroundColor: COLORS.accent, height: 70, borderRadius: 22, alignItems: 'center', justifyContent: 'center', shadowColor: COLORS.accent, shadowOpacity: 0.3, shadowRadius: 15 }}
                                >
                                    <Text style={{ color: 'white', fontSize: 14, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 }}>Liquidar y Validar</Text>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity 
                                    onPress={() => confirmCheckIn(false)}
                                    style={{ backgroundColor: COLORS.accent, height: 70, borderRadius: 22, alignItems: 'center', justifyContent: 'center', shadowColor: COLORS.accent, shadowOpacity: 0.3, shadowRadius: 15 }}
                                >
                                    <Text style={{ color: 'white', fontSize: 16, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 }}>Autorizar Ingreso</Text>
                                </TouchableOpacity>
                            )}
                            
                            <TouchableOpacity 
                                onPress={() => { setScanResult(null); setScanned(false); }}
                                style={{ height: 60, alignItems: 'center', justifyContent: 'center', marginTop: 15 }}
                            >
                                <Text style={{ color: C.sub, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' }}>Cancelar Validación</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </Modal>

            {/* MODAL ERROR DNA */}
            <Modal visible={scanError !== null} transparent animationType="fade">
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
                    <View style={{ backgroundColor: C.card, borderRadius: 35, padding: 30, alignItems: 'center', width: '100%', borderWidth: 1, borderColor: C.border }}>
                        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.error + '22', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                            <AlertTriangle color={COLORS.error} size={40} />
                        </View>
                        <Text style={{ color: C.text, fontSize: 20, fontWeight: '900', textAlign: 'center', marginBottom: 10, textTransform: 'uppercase' }}>Error de Acceso</Text>
                        <Text style={{ color: C.sub, fontSize: 14, fontWeight: '600', textAlign: 'center', marginBottom: 30, lineHeight: 20 }}>{scanError}</Text>
                        <TouchableOpacity 
                            onPress={() => { setScanned(false); setScanError(null); }}
                            style={{ backgroundColor: COLORS.error, height: 60, borderRadius: 20, width: '100%', alignItems: 'center', justifyContent: 'center' }}
                        >
                            <Text style={{ color: 'white', fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 }}>Reintentar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {loading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator color={COLORS.accent} size="large" />
                    <Text style={{ color: COLORS.accent, fontWeight: '900', fontSize: 10, textTransform: 'uppercase', marginTop: 20, letterSpacing: 2 }}>Procesando...</Text>
                </View>
            )}
        </View>
    );
}

function SectionLabel({ label }: { label: string }) {
    return (
        <Text style={{ color: COLORS.accent, fontWeight: '900', fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, marginHorizontal: 40, marginTop: 30, marginBottom: 10 }}>{label}</Text>
    );
}

function Separator({ isDark }: { isDark: boolean }) {
    return (
        <View style={{ height: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)', marginHorizontal: 25 }} />
    );
}

function RefinedRow({ icon: Icon, color, label, value, isDark }: any) {
    const C = isDark ? COLORS.dark : COLORS.light;
    return (
        <View style={{ height: 75, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 25 }}>
            <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
                <Icon color="white" size={18} />
            </View>
            <View style={{ marginLeft: 15, flex: 1 }}>
                <Text style={{ color: C.sub, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>{label}</Text>
                <Text style={{ color: C.text, fontSize: 15, fontWeight: '800', marginTop: 1 }}>{value}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    hudOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    scannerBox: {
        width: 260,
        height: 260,
        position: 'relative',
    },
    corner: {
        position: 'absolute',
        width: 40,
        height: 40,
        borderColor: COLORS.accent,
    },
    scanLine: {
        position: 'absolute',
        left: 10,
        right: 10,
        height: 2,
        backgroundColor: COLORS.accent,
        shadowColor: COLORS.accent,
        shadowOpacity: 0.8,
        shadowRadius: 10,
    },
    scanText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginTop: 40,
        opacity: 0.8
    },
    header: {
        position: 'absolute',
        top: 60,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 30,
    },
    headerBtn: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    headerTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '900',
        textTransform: 'uppercase',
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.8)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
    }
});
