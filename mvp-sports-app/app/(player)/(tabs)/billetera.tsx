import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, TextInput, Image,
    ActivityIndicator, StatusBar, Switch, StyleSheet, Modal,
    RefreshControl, BackHandler, Dimensions, Platform, KeyboardAvoidingView,
    TouchableWithoutFeedback, Keyboard, Linking
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { WebView } from 'react-native-webview';
import {
    ChevronLeft, Plus, CreditCard, X, ShieldCheck, Zap, Clock, Receipt, Trash2, 
    CheckCircle2, AlertCircle, Wallet, ArrowUpRight, ArrowDownLeft, Landmark
} from 'lucide-react-native';
import { useAuth } from '../../../store/useAuth';
import { bookingService, Booking } from '../../../services/bookingService';
import { walletService, PaymentCard } from '../../../services/walletService';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

// 🎨 DYNAMIC REFINED PALETTE
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

export default function BilleteraScreen() {
    const scrollViewRef = useRef<ScrollView>(null);
    const router = useRouter();
    const { user, theme, profile: authProfile } = useAuth();
    const isDark = theme === 'dark';
    const C = isDark ? COLORS.dark : COLORS.light;

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [cards, setCards] = useState<PaymentCard[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);

    // FEEDBACK MODAL STATE
    const [modalVisible, setModalVisible] = useState(false);
    const [modalType, setModalType] = useState<'success' | 'error'>('success');
    const [modalMsg, setModalMsg] = useState('');

    // DELETE MODAL
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [cardToDelete, setCardToDelete] = useState<PaymentCard | null>(null);

    // ADD CARD STATE
    const [showAddCard, setShowAddCard] = useState(false);
    const [addingCard, setAddingCard] = useState(false);
    const [cardNumber, setCardNumber] = useState('');
    const [cardExpiry, setCardExpiry] = useState('');
    const [cardHolder, setCardHolder] = useState(authProfile?.displayName || '');
    const [inscriptionData, setInscriptionData] = useState<{ url: string; token: string } | null>(null);
    const [showWebView, setShowWebView] = useState(false);

    const loadData = async () => {
        if (!user) { setLoading(false); return; }
        if (!refreshing) setLoading(true);
        try {
            const [userBookings, userCards] = await Promise.all([
                bookingService.getUserBookings(user.uid),
                walletService.getCards(user.uid),
            ]);
            userBookings.sort((a, b) => (b.date as any).toMillis() - (a.date as any).toMillis());
            setBookings(userBookings.slice(0, 15));
            setCards(userCards);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            loadData();
            const backAction = () => { router.back(); return true; };
            const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
            return () => backHandler.remove();
        }, [user])
    );

    const showFeedback = (type: 'success' | 'error', msg: string) => {
        setModalType(type);
        setModalMsg(msg);
        setModalVisible(true);
    };

    const handleAddCard = async () => {
        if (!user) return;
        setAddingCard(true);
        try {
            const [expiryMonth, expiryYear] = cardExpiry.split('/').map(s => s.trim());
            const data = await walletService.startInscription(user.uid, user.email || '', {
                cardNumber,
                holderName: cardHolder,
                expiryMonth: expiryMonth || '12',
                expiryYear: expiryYear ? (expiryYear.length === 2 ? '20' + expiryYear : expiryYear) : '2030'
            });

            if (data.url === null) {
                setAddingCard(false);
                setShowAddCard(false);
                showFeedback('success', '¡Tarjeta vinculada con éxito en modo de prueba!');
                loadData();
                return;
            }

            setInscriptionData(data);
            setShowWebView(true);
        } catch (error) {
            showFeedback('error', 'No se pudo iniciar la vinculación con Transbank.');
        } finally {
            setAddingCard(false);
        }
    };

    const confirmDeleteCard = async () => {
        if (!user || !cardToDelete?.id) return;
        try {
            await walletService.deleteCard(user.uid, cardToDelete.id);
            setShowDeleteModal(false);
            setCardToDelete(null);
            showFeedback('success', 'Tarjeta eliminada correctamente.');
            loadData();
        } catch (error) {
            showFeedback('error', 'No se pudo eliminar la tarjeta.');
        }
    };

    const formatMoney = (amount: number) => '$' + amount.toLocaleString('es-CL');

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
            
            {/* TOP BAR */}
            <View style={{ paddingTop: 60, paddingBottom: 20, paddingHorizontal: 30, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: C.border }}>
                <TouchableOpacity onPress={() => router.back()} style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}>
                    <ChevronLeft color={COLORS.accent} size={24} />
                </TouchableOpacity>
                <Text style={{ color: C.text, fontSize: 20, fontWeight: '900', textTransform: 'uppercase' }}>Billetera</Text>
                <TouchableOpacity onPress={() => setShowAddCard(true)} style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center' }}>
                    <Plus color="white" size={24} />
                </TouchableOpacity>
            </View>

            <ScrollView 
                ref={scrollViewRef}
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 120 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={COLORS.accent} />}
            >
                {/* SALDO BANNER */}
                <View style={{ padding: 30, paddingBottom: 10 }}>
                    <View style={{ backgroundColor: C.card, borderRadius: 30, padding: 30, borderWidth: 1, borderColor: C.border, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 }}>
                        <Text style={{ color: C.sub, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 10 }}>Estado de Cuenta</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <View>
                                <Text style={{ color: C.text, fontSize: 32, fontWeight: '900', letterSpacing: -1 }}>Activa</Text>
                                <Text style={{ color: COLORS.accent, fontSize: 11, fontWeight: '800', marginTop: 5 }}>Nivel Verificado</Text>
                            </View>
                            <View style={{ width: 60, height: 60, borderRadius: 20, backgroundColor: COLORS.accent + '22', alignItems: 'center', justifyContent: 'center' }}>
                                <ShieldCheck color={COLORS.accent} size={32} />
                            </View>
                        </View>
                    </View>
                </View>

                {/* MÉTODOS DE PAGO */}
                <SectionLabel label="Mis Tarjetas" />
                <View style={{ marginHorizontal: 30, backgroundColor: C.card, borderRadius: 25, overflow: 'hidden', borderWidth: 1, borderColor: C.border }}>
                    {cards.length > 0 ? (
                        cards.map((card, idx) => (
                            <View key={card.id}>
                                <TouchableOpacity 
                                    style={{ height: 85, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 25 }}
                                    activeOpacity={0.7}
                                >
                                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#3b82f6', alignItems: 'center', justifyContent: 'center' }}>
                                        <CreditCard color="white" size={20} />
                                    </View>
                                    <View style={{ marginLeft: 20, flex: 1 }}>
                                        <Text style={{ color: C.text, fontSize: 18, fontWeight: '900' }}>•••• {card.last4}</Text>
                                        <Text style={{ color: C.sub, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>{card.brand || 'Tarjeta de Débito'}</Text>
                                    </View>
                                    <TouchableOpacity 
                                        onPress={() => { setCardToDelete(card); setShowDeleteModal(true); }}
                                        style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: isDark ? COLORS.error : '#fef2f2', alignItems: 'center', justifyContent: 'center' }}
                                    >
                                        <Trash2 color={isDark ? 'white' : COLORS.error} size={18} />
                                    </TouchableOpacity>
                                </TouchableOpacity>
                                {idx < cards.length - 1 && <Separator isDark={isDark} />}
                            </View>
                        ))
                    ) : (
                        <TouchableOpacity 
                            onPress={() => setShowAddCard(true)}
                            style={{ padding: 40, alignItems: 'center', justifyContent: 'center' }}
                        >
                            <Plus color={C.sub} size={32} strokeWidth={1} />
                            <Text style={{ color: C.sub, fontSize: 12, fontWeight: '800', marginTop: 15 }}>Añadir método de pago</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* ÚLTIMOS MOVIMIENTOS */}
                <SectionLabel label="Últimos Movimientos" />
                <View style={{ marginHorizontal: 30, backgroundColor: C.card, borderRadius: 25, overflow: 'hidden', borderWidth: 1, borderColor: C.border }}>
                    {bookings.length > 0 ? (
                        bookings.map((match, idx) => (
                            <View key={match.id}>
                                <View style={{ height: 85, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 25 }}>
                                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}>
                                        <Receipt color={COLORS.accent} size={20} />
                                    </View>
                                    <View style={{ marginLeft: 20, flex: 1 }}>
                                        <Text style={{ color: C.text, fontSize: 16, fontWeight: '800' }} numberOfLines={1}>{match.tenantName || 'Reserva de Cancha'}</Text>
                                        <Text style={{ color: C.sub, fontSize: 10, fontWeight: '700' }}>{new Date((match.date as any)?.seconds * 1000).toLocaleDateString('es-CL')}</Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={{ color: COLORS.accent, fontSize: 18, fontWeight: '900' }}>-{formatMoney(match.totalPrice || 0)}</Text>
                                    </View>
                                </View>
                                {idx < bookings.length - 1 && <Separator isDark={isDark} />}
                            </View>
                        ))
                    ) : (
                        <View style={{ padding: 40, alignItems: 'center', justifyContent: 'center' }}>
                            <Clock color={C.sub} size={32} strokeWidth={1} />
                            <Text style={{ color: C.sub, fontSize: 12, fontWeight: '800', marginTop: 15 }}>Sin movimientos recientes</Text>
                        </View>
                    )}
                </View>

                <Text style={{ textAlign: 'center', color: C.sub, fontSize: 8, fontWeight: '700', marginTop: 50 }}>PAGOS PROTEGIDOS POR TRANSBANK • 2026</Text>
            </ScrollView>

            {/* MODAL: AÑADIR TARJETA */}
            <Modal visible={showAddCard} animationType="slide" transparent={true}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' }}>
                            <View style={{ backgroundColor: C.card, borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 30, paddingBottom: 50, borderWidth: 1, borderColor: C.border }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
                                    <Text style={{ color: C.text, fontSize: 24, fontWeight: '900', textTransform: 'uppercase' }}>Vincular Tarjeta</Text>
                                    <TouchableOpacity onPress={() => setShowAddCard(false)} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}>
                                        <X color={C.text} size={20} />
                                    </TouchableOpacity>
                                </View>

                                <View style={{ marginBottom: 20 }}>
                                    <Text style={{ color: C.sub, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', marginBottom: 10, marginLeft: 5 }}>Número de Tarjeta</Text>
                                    <TextInput 
                                        placeholder="0000 0000 0000 0000" 
                                        placeholderTextColor={isDark ? '#334155' : '#CBD5E1'}
                                        value={cardNumber}
                                        onChangeText={t => setCardNumber(t.replace(/\W/gi, '').replace(/(.{4})/g, '$1 ').trim())}
                                        keyboardType="numeric"
                                        maxLength={19}
                                        style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC', borderRadius: 15, height: 60, paddingHorizontal: 20, color: C.text, fontSize: 18, fontWeight: '800', borderWidth: 1, borderColor: C.border }}
                                    />
                                </View>

                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 }}>
                                    <View style={{ width: '47%' }}>
                                        <Text style={{ color: C.sub, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', marginBottom: 10, marginLeft: 5 }}>Vence (MM/YY)</Text>
                                        <TextInput 
                                            placeholder="12/30" 
                                            placeholderTextColor={isDark ? '#334155' : '#CBD5E1'}
                                            value={cardExpiry}
                                            onChangeText={t => {
                                                const clean = t.replace(/\D/g, '');
                                                if (clean.length <= 2) setCardExpiry(clean);
                                                else setCardExpiry(`${clean.slice(0, 2)}/${clean.slice(2, 4)}`);
                                            }}
                                            keyboardType="numeric"
                                            maxLength={5}
                                            style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC', borderRadius: 15, height: 60, paddingHorizontal: 20, color: C.text, fontSize: 18, fontWeight: '800', borderWidth: 1, borderColor: C.border }}
                                        />
                                    </View>
                                    <View style={{ width: '47%' }}>
                                        <Text style={{ color: C.sub, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', marginBottom: 10, marginLeft: 5 }}>CVV</Text>
                                        <TextInput 
                                            placeholder="000" 
                                            placeholderTextColor={isDark ? '#334155' : '#CBD5E1'}
                                            secureTextEntry
                                            maxLength={4}
                                            keyboardType="numeric"
                                            style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC', borderRadius: 15, height: 60, paddingHorizontal: 20, color: C.text, fontSize: 18, fontWeight: '800', borderWidth: 1, borderColor: C.border }}
                                        />
                                    </View>
                                </View>

                                <TouchableOpacity 
                                    onPress={handleAddCard}
                                    disabled={addingCard}
                                    style={{ backgroundColor: COLORS.accent, height: 65, borderRadius: 20, alignItems: 'center', justifyContent: 'center', shadowColor: COLORS.accent, shadowOpacity: 0.3, shadowRadius: 10 }}
                                >
                                    {addingCard ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontSize: 14, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 }}>Vincular Ahora</Text>}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </KeyboardAvoidingView>
            </Modal>

            {/* MODAL: ELIMINAR CONFIRMACIÓN */}
            <Modal visible={showDeleteModal} transparent animationType="fade">
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
                    <View style={{ backgroundColor: C.card, borderRadius: 35, padding: 30, alignItems: 'center', width: '100%', borderWidth: 1, borderColor: C.border }}>
                        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: isDark ? COLORS.error : '#fef2f2', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                            <Trash2 color={isDark ? 'white' : COLORS.error} size={36} />
                        </View>
                        <Text style={{ color: C.text, fontSize: 20, fontWeight: '900', textAlign: 'center', marginBottom: 10 }}>¿Eliminar tarjeta?</Text>
                        <Text style={{ color: C.sub, fontSize: 14, fontWeight: '600', textAlign: 'center', marginBottom: 30 }}>Esta acción desvinculará la tarjeta de tu cuenta permanentemente.</Text>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
                            <TouchableOpacity onPress={() => setShowDeleteModal(false)} style={{ paddingVertical: 15, paddingHorizontal: 20, borderRadius: 15, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9', width: '48%', alignItems: 'center' }}>
                                <Text style={{ color: C.text, fontWeight: '900', textTransform: 'uppercase', fontSize: 11 }}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={confirmDeleteCard} style={{ paddingVertical: 15, paddingHorizontal: 20, borderRadius: 15, backgroundColor: COLORS.error, width: '48%', alignItems: 'center' }}>
                                <Text style={{ color: 'white', fontWeight: '900', textTransform: 'uppercase', fontSize: 11 }}>Eliminar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* WEBVIEW TRANSBANK */}
            <Modal visible={showWebView} animationType="slide">
                <View style={{ flex: 1, backgroundColor: 'white' }}>
                    <View style={{ paddingTop: 60, paddingBottom: 20, paddingHorizontal: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
                        <Text style={{ fontSize: 18, fontWeight: '900' }}>Vinculación Segura</Text>
                        <TouchableOpacity onPress={() => setShowWebView(false)}>
                            <X color="black" size={24} />
                        </TouchableOpacity>
                    </View>
                    {inscriptionData && (
                        <WebView
                            source={{ uri: inscriptionData.url, method: 'POST', body: `TBK_TOKEN=${inscriptionData.token}` }}
                            onNavigationStateChange={(navState) => {
                                if (navState.url.includes('wallet/success')) {
                                    setShowWebView(false); setShowAddCard(false);
                                    showFeedback('success', '¡Tarjeta vinculada con éxito!');
                                    loadData();
                                } else if (navState.url.includes('wallet/error')) {
                                    setShowWebView(false);
                                    showFeedback('error', 'La vinculación fue cancelada.');
                                }
                            }}
                            style={{ flex: 1 }}
                        />
                    )}
                </View>
            </Modal>

            {/* FEEDBACK MODAL */}
            <FeedbackModal visible={modalVisible} type={modalType} message={modalMsg} onClose={() => setModalVisible(false)} isDark={isDark} />
        </View>
    );
}

/** ═══ COMPONENTES SOPORTE ═══ **/

const SectionLabel = ({ label }: { label: string }) => (
    <Text style={{ color: '#10b981', fontWeight: '900', fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, marginHorizontal: 40, marginTop: 30, marginBottom: 10 }}>{label}</Text>
);

const Separator = ({ isDark }: { isDark: boolean }) => (
    <View style={{ height: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)', marginHorizontal: 25 }} />
);

const FeedbackModal = ({ visible, type, message, onClose, isDark }: any) => {
    const C = isDark ? COLORS.dark : COLORS.light;
    const isError = type === 'error';
    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
                <View style={{ backgroundColor: C.card, borderRadius: 35, padding: 30, alignItems: 'center', width: '100%', borderWidth: 1, borderColor: C.border }}>
                    <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: isError ? '#ef444422' : '#10b98122', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                        {isError ? <AlertCircle color="#ef4444" size={40} /> : <CheckCircle2 color="#10b981" size={40} />}
                    </View>
                    <Text style={{ color: C.text, fontSize: 20, fontWeight: '900', textAlign: 'center', marginBottom: 10 }}>{isError ? 'Ups... algo falló' : '¡Todo listo!'}</Text>
                    <Text style={{ color: C.sub, fontSize: 14, fontWeight: '600', textAlign: 'center', marginBottom: 30, lineHeight: 20 }}>{message}</Text>
                    <TouchableOpacity onPress={onClose} style={{ backgroundColor: isError ? (isDark ? '#f43f5e' : '#ef4444') : '#10b981', paddingVertical: 15, paddingHorizontal: 40, borderRadius: 20, width: '100%', alignItems: 'center' }}>
                        <Text style={{ color: 'white', fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 }}>Entendido</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};
