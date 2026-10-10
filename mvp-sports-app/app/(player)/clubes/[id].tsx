import { PLAYER } from '../../../src/theme/player';
import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
    StatusBar, Dimensions, Platform, StyleSheet, RefreshControl, Alert, Linking, Modal, BackHandler
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import {
    ChevronLeft, Clock, MapPin, Star, Zap, Calendar, Map as MapIcon,
    X, ShieldCheck, ChevronRight, Activity, Info, CreditCard,
    Smartphone, Trophy, Target, Navigation as NavIcon, Users,
    Timer, CalendarDays, Share2, ArrowRight, Sun, Moon, Sunrise,
    Dribbble, Flame, Medal, CircleDot, LayoutDashboard, Navigation2, CheckCircle2, ChevronDown, Check, ChevronUp, User
} from 'lucide-react-native';
import { 
    FutbolIcon, PadelIcon, TenisIcon, BasquetbolIcon, VoleibolIcon,
    CanchaFutbolIcon, CanchaPadelIcon, CanchaTenisIcon, CanchaBasquetbolIcon, CanchaVoleibolIcon
} from '../../../components/icons/sports';
import { Image } from 'expo-image';
import { useAuth } from '../../../store/useAuth';
import { LinearGradient } from 'expo-linear-gradient';
import { venueService, Court, Tenant } from '../../../services/venueService';
import { bookingService } from '../../../services/bookingService';
import { Timestamp } from 'firebase/firestore';
import { useUserLocation } from '../../../src/features/player/hooks/useDashboardData';
import { FlashList } from '@shopify/flash-list';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const THEME = {
    light: {
        bg: '#F8FAFC',
        card: '#FFFFFF',
        border: '#E2E8F0',
        text: '#0F172A',
        sub: '#64748B'
    },
    dark: {
        bg: '#020611',
        card: '#0A101D',
        border: 'rgba(255,255,255,0.05)',
        text: '#F8FAFC',
        sub: '#94A3B8'
    },
    accent: '#10b981'
};

const formatDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) return null;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distKM = R * c;
    return distKM < 1 ? `${Math.round(distKM * 1000)}m` : `${distKM.toFixed(1)}km`;
};

const getSportInfo = (sportName: string) => {
    const s = (sportName || '').toLowerCase();
    const config: any = {
        'futbol': { color: '#10b981', icon: FutbolIcon, courtIcon: CanchaFutbolIcon },
        'padel': { color: '#3b82f6', icon: PadelIcon, courtIcon: CanchaPadelIcon },
        'tenis': { color: '#f59e0b', icon: TenisIcon, courtIcon: CanchaTenisIcon },
        'basquet': { color: '#6366f1', icon: BasquetbolIcon, courtIcon: CanchaBasquetbolIcon },
        'voley': { color: '#ec4899', icon: VoleibolIcon, courtIcon: CanchaVoleibolIcon },
        'default': { color: '#10b981', icon: Medal, courtIcon: LayoutDashboard }
    };
    if (s.includes('futbol') || s.includes('fútbol')) return config['futbol'];
    if (s.includes('padel') || s.includes('pádel')) return config['padel'];
    if (s.includes('tenis')) return config['tenis'];
    if (s.includes('basquet') || s.includes('basket')) return config['basquet'];
    if (s.includes('voley')) return config['voley'];
    return config['default'];
};

const getLocalISODate = (date: Date) => {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const getOperationalDate = () => {
    const d = new Date();
    // Si es antes de las 6 AM, sigue siendo el día operativo anterior
    if (d.getHours() < 6) {
        d.setDate(d.getDate() - 1);
    }
    return getLocalISODate(d);
};

export default function VenueDetailsScreen() {
    const { id } = useLocalSearchParams();
    const { user, theme, profile } = useAuth();
    const router = useRouter();
    const isDark = theme === 'dark';
    const C = { ...(isDark ? THEME.dark : THEME.light), soft: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9' };
    const accent = THEME.accent;
    const scrollViewRef = useRef<ScrollView>(null);
    const userLoc = useUserLocation();

    const [venue, setVenue] = useState<Tenant | null>(null);
    const [courts, setCourts] = useState<Court[]>([]);
    const [selectedSport, setSelectedSport] = useState<string | null>(null);
    const [selectedCourtId, setSelectedCourtId] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState<string>(getOperationalDate());
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [bookingStep, setBookingStep] = useState(1);
    const [loading, setLoading] = useState(true);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [availableSlots, setAvailableSlots] = useState<string[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [isCreatingBooking, setIsCreatingBooking] = useState(false);
    const [reviews, setReviews] = useState<any[]>([]);
    const [visibleReviewsCount, setVisibleReviewsCount] = useState(0);

    const fetchData = useCallback(async () => {
        if (!id) return;
        try {
            const v = await venueService.getVenueById(id as string);
            setVenue(v);
            const c = await venueService.getCourtsByTenant(id as string);
            setCourts(c);
            const r = await venueService.getVenueFeedback(id as string);
            setReviews(r);

            // Sincronizar el rating real con el documento si hay discrepancia
            // (Comentado porque los jugadores no tienen permisos de escritura en tenants)
            /*
            if (r.length > 0 && v) {
                const currentAvg = Math.round((r.reduce((acc, rev) => acc + rev.rating, 0) / r.length) * 10) / 10;
                if (v.rating !== currentAvg || (v as any).totalFeedbacks !== r.length) {
                    venueService.recalculateVenueRating(id as string).catch(e => console.error("Sync rating failed:", e));
                }
            }
            */
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [id]);

    const handleBack = useCallback(() => {
        if (bookingStep > 1) {
            setBookingStep(prev => (prev === 4 ? 2 : prev - 1));
        } else {
            router.back();
        }
    }, [bookingStep, router]);

    useFocusEffect(
        React.useCallback(() => {
            fetchData();
            const backAction = () => {
                handleBack();
                return true;
            };
            const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
            return () => backHandler.remove();
        }, [fetchData, handleBack])
    );

    useEffect(() => {
        const fetchSlots = async () => {
            if (!id || !selectedCourtId || !selectedDate) return;
            setLoadingSlots(true);
            try {
                const slots = await bookingService.getAvailableTimeSlots(id as string, selectedCourtId, selectedDate);
                setAvailableSlots(slots);
            } catch (error) {
                console.error(error);
            } finally {
                setLoadingSlots(false);
            }
        };
        fetchSlots();
    }, [id, selectedCourtId, selectedDate]);

    // Paso "Día y hora": horarios de todas las canchas del deporte; la cancha libre se asigna sola
    const [slotsByCourt, setSlotsByCourt] = useState<Record<string, string[]>>({});
    const [loadingAll, setLoadingAll] = useState(false);
    useEffect(() => {
        if (!id || bookingStep !== 2 || !selectedSport || !selectedDate) return;
        let alive = true;
        const norm = (v: string) => v ? v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase() : '';
        const sel = norm(selectedSport);
        const list = courts.filter((c: any) => { const cs = norm(c.sport || ''); return (cs.includes(sel) || sel.includes(cs)) && c.status !== 'maintenance' && c.status !== 'occupied'; });
        setLoadingAll(true);
        Promise.all(list.map((c) => bookingService.getAvailableTimeSlots(id as string, c.id, selectedDate).then((t) => [c.id, t] as const).catch(() => [c.id, [] as string[]] as const)))
            .then((pairs) => { if (alive) setSlotsByCourt(Object.fromEntries(pairs)); })
            .finally(() => { if (alive) setLoadingAll(false); });
        return () => { alive = false; };
    }, [id, bookingStep, selectedSport, selectedDate, courts]);

    const availableSports = useMemo(() => {
        if (!venue?.pricing) return [];
        return Object.keys(venue.pricing).sort();
    }, [venue]);

    const [autoSport, setAutoSport] = useState(false);
    useEffect(() => {
        if (autoSport || availableSports.length === 0) return;
        const n = (v: string) => String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
        const pick = availableSports.length === 1 ? availableSports[0] : availableSports.find((sp) => n(sp) === n((profile as any)?.mainSport));
        if (pick) { setSelectedSport(pick); setBookingStep(2); }
        setAutoSport(true);
    }, [availableSports, profile, autoSport]);

    const filteredCourts = useMemo(() => {
        if (!selectedSport) return [];
        const normalizeSport = (s: string) => s ? s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : '';
        return courts.filter(c => {
            const courtSport = normalizeSport(c.sport || '');
            const selSport = normalizeSport(selectedSport);
            return courtSport.includes(selSport) || selSport.includes(courtSport);
        });
    }, [courts, selectedSport]);

    const groupedSlots = useMemo(() => {
        const slots = { mañana: [] as string[], tarde: [] as string[], noche: [] as string[] };
        
        // Ordenar los slots considerando que de 00:00 a 05:00 son horas tardías del día operativo
        const sortedSlots = [...availableSlots].sort((a, b) => {
            const parseToMinutes = (timeStr: string) => {
                const [h, m] = timeStr.split(':').map(Number);
                return h < 6 ? (h + 24) * 60 + m : h * 60 + m;
            };
            return parseToMinutes(a) - parseToMinutes(b);
        });

        sortedSlots.forEach(s => {
            const hour = parseInt(s.split(':')[0]);
            // De 6 AM a 12 PM es mañana
            if (hour >= 6 && hour < 12) {
                slots.mañana.push(s);
            }
            // De 12 PM a 6 PM es tarde
            else if (hour >= 12 && hour < 18) {
                slots.tarde.push(s);
            }
            // De 6 PM a 5:59 AM del día siguiente es noche (incluyendo de 00:00 a 05:00)
            else {
                slots.noche.push(s);
            }
        });
        return slots;
    }, [availableSlots]);

    const currentDayHours = useMemo(() => {
        if (!venue) return '08:00 - 23:00';
        
        const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const currentDayIndex = new Date(getOperationalDate() + "T12:00:00").getDay();
        const currentDayName = daysOfWeek[currentDayIndex];

        const sched = (venue as any).schedule;
        if (sched && typeof sched === 'object') {
            const dayConfig = sched[currentDayName];
            if (dayConfig) {
                if (dayConfig.isOpen === false) {
                    return 'Cerrado';
                }
                return `${dayConfig.open || '08:00'} - ${dayConfig.close || '23:00'}`;
            }
        }
        
        return venue.openingHours || '08:00 - 23:00';
    }, [venue]);

    const venueCoords = useMemo(() => {
        if (!venue) return null;
        const c = (venue as any).coordinates || (venue as any).location;
        if (!c) return null;
        return { latitude: c.lat || c._lat || c.latitude, longitude: c.lng || c._long || c.longitude };
    }, [venue]);

    const distance = useMemo(() => {
        if (!userLoc?.data?.coords || !venueCoords?.latitude) return null;
        return formatDistance(userLoc.data.coords.latitude, userLoc.data.coords.longitude, venueCoords.latitude, venueCoords.longitude);
    }, [userLoc, venueCoords]);

    const openMaps = () => {
        if (!venueCoords) return;
        const url = Platform.select({ ios: `maps:0,0?q=${venue?.name}@${venueCoords.latitude},${venueCoords.longitude}`, android: `geo:0,0?q=${venueCoords.latitude},${venueCoords.longitude}(${venue?.name})` });
        if (url) Linking.openURL(url);
    };

    const handleConfirm = async () => {
        if (!user) {
            Alert.alert('Inicia Sesión', 'Debes estar autenticado para reservar.');
            return;
        }
        if (isCreatingBooking) return;
        setIsCreatingBooking(true);

        try {
            const court = courts.find(c => c.id === selectedCourtId);
            const sportInfo = getSportInfo(selectedSport || '');
            const priceNum = venue?.pricing?.[selectedSport!]?.[selectedTime!] || venue?.pricing?.[selectedSport!]?.default || court?.price || 18000;

            // Redirigir directamente al checkout con los parámetros de reserva, SIN crear el documento en Firestore aún
            router.push({
                pathname: '/(player)/checkout',
                params: {
                    tenantId: id as string,
                    tenantName: venue?.name || 'Recinto',
                    courtId: selectedCourtId!,
                    courtName: court?.name || 'Cancha',
                    price: priceNum.toString(),
                    date: selectedDate,
                    startTime: selectedTime!,
                    sport: selectedSport!,
                    sportColor: sportInfo.color
                }
            });
        } catch (error) {
            console.error('Error initiating checkout:', error);
            Alert.alert('Error', 'No se pudo iniciar el proceso de reserva. Intenta de nuevo.');
        } finally {
            setIsCreatingBooking(false);
        }
    };

    if (loading) return (
        <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={accent} size="large" />
        </View>
    );

    const activeSportInfo = getSportInfo(selectedSport || '');

    return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            <FlashList
                data={reviews.slice(0, visibleReviewsCount)}
                contentContainerStyle={{ paddingBottom: 150 }}
                ListHeaderComponent={() => (
                    <>
                        {/* HERO SECTION */}
                <View style={{ width: SCREEN_WIDTH, aspectRatio: 1.6, backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }}>
                    {venue?.gallery && venue.gallery.length > 0 ? (
                        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={StyleSheet.absoluteFill}>
                            {venue.gallery.map((img: string, idx: number) => (
                                <View key={idx} style={{ width: SCREEN_WIDTH, height: '100%' }}>
                                    <Image source={{ uri: img }} style={StyleSheet.absoluteFill} contentFit="cover" />
                                    <LinearGradient colors={['rgba(0,0,0,0.4)', 'transparent', 'rgba(0,0,0,0.4)']} style={StyleSheet.absoluteFill} />
                                </View>
                            ))}
                        </ScrollView>
                    ) : (
                        <>
                            <Image
                                source={{ uri: venue?.imageUrl || 'https://images.unsplash.com/photo-1595435064215-68d148332009' }}
                                style={StyleSheet.absoluteFill}
                                contentFit="cover"
                            />
                            <LinearGradient colors={['rgba(0,0,0,0.3)', 'transparent']} style={StyleSheet.absoluteFill} />
                        </>
                    )}

                    {/* Pagination indicators for gallery */}
                    {venue?.gallery && venue.gallery.length > 1 && (
                        <View style={{ position: 'absolute', bottom: 20, width: '100%', flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
                            {venue.gallery.map((_: string, idx: number) => (
                                <View key={idx} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' }} />
                            ))}
                        </View>
                    )}

                    <TouchableOpacity onPress={handleBack} style={{ position: 'absolute', top: 50, left: 25, width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}>
                        <ChevronLeft color="white" size={24} />
                    </TouchableOpacity>
                </View>

                {/* INFO CARD PRO */}
                <View style={{ paddingHorizontal: 30, marginTop: 15 }}>
                    <View style={{ 
                        backgroundColor: C.card, 
                        borderRadius: 35, 
                        padding: 30, 
                        borderWidth: 1, 
                        borderColor: C.border, 
                        shadowColor: '#000', 
                        shadowOpacity: isDark ? 0.3 : 0.08, 
                        shadowRadius: 25,
                        elevation: isDark ? 10 : 0
                    }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ color: C.text, fontSize: 28, fontWeight: '900', letterSpacing: -1, flex: 1 }}>{venue?.name}</Text>
                            <View style={{ backgroundColor: accent + '15', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, flexDirection: 'row', alignItems: 'center' }}>
                                <Star color={accent} size={14} fill={accent} />
                                <Text style={{ color: accent, fontWeight: '900', fontSize: 13, marginLeft: 6 }}>
                                    {reviews.length > 0 
                                        ? (Math.round((reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length) * 10) / 10).toFixed(1)
                                        : '0.0'
                                    }
                                </Text>
                            </View>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
                            <MapPin color={C.sub} size={14} />
                            <Text style={{ color: C.sub, fontSize: 13, fontWeight: '700', marginLeft: 8 }}>{venue?.address}</Text>
                        </View>

                        <View style={{ flexDirection: 'row', marginTop: 30, gap: 15 }}>
                            <View style={{ flex: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC', borderRadius: 20, padding: 15, borderWidth: 1, borderColor: C.border }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                    <Clock color={accent} size={14} />
                                    <Text style={{ color: C.sub, fontSize: 9, fontWeight: '900', marginLeft: 6 }}>HORARIO DE HOY</Text>
                                </View>
                                <Text style={{ color: C.text, fontSize: 13, fontWeight: '800' }}>{currentDayHours}</Text>
                            </View>
                            <View style={{ flex: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC', borderRadius: 20, padding: 15, borderWidth: 1, borderColor: C.border }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                    <LayoutDashboard color={accent} size={14} />
                                    <Text style={{ color: C.sub, fontSize: 9, fontWeight: '900', marginLeft: 6 }}>CANCHAS</Text>
                                </View>
                                <Text style={{ color: C.text, fontSize: 14, fontWeight: '800' }}>{courts.length} Disponibles</Text>
                            </View>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 25, paddingTop: 25, borderTopWidth: 1, borderTopColor: C.border }}>
                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F1F5F9', paddingHorizontal: 15, borderRadius: 15, borderWidth: 1, borderColor: C.border }}>
                                    <Navigation2 color={accent} size={16} fill={accent} />
                                    <Text style={{ color: C.text, fontSize: 14, fontWeight: '900', marginLeft: 10 }}>{distance || '---'}</Text>
                                </View>
                                <TouchableOpacity onPress={openMaps} style={{ width: 50, height: 50, borderRadius: 15, backgroundColor: '#3b82f615', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(59,130,246,0.1)' }}>
                                    <Navigation2 color="#3b82f6" size={24} />
                                </TouchableOpacity>
                            </View>
                            <View style={{ backgroundColor: accent + '15', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 12 }}>
                                <Text style={{ color: accent, fontWeight: '900', fontSize: 11 }}>VERIFICADO</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* RESERVA WIZARD PRO */}
                <View style={{ marginTop: 30 }}>
                    <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 20, marginBottom: 16 }}>
                        {['Deporte', 'Día y hora', 'Confirmar'].map((label, i) => {
                            const cur = bookingStep === 1 ? 0 : bookingStep === 4 ? 2 : 1;
                            const done = cur > i, current = cur === i;
                            return (
                                <View key={label} style={{ flex: 1, gap: 6, alignItems: 'center' }}>
                                    <View style={{ height: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: done || current ? accent : C.soft }} />
                                    <Text style={{ fontSize: PLAYER.font.xs, fontWeight: '600', color: current ? C.text : done ? accent : C.sub }}>{label}</Text>
                                </View>
                            );
                        })}
                    </View>
                    
                    {bookingStep === 1 && (
                        <View style={{ paddingHorizontal: 30 }}>
                            <Text style={{ color: C.text, fontSize: 24, fontWeight: '900', marginBottom: 20 }}>Selecciona tu Disciplina</Text>
                            <View style={{ gap: 15 }}>
                                {availableSports.map(sport => {
                                    const info = getSportInfo(sport);
                                    return (
                                        <TouchableOpacity key={sport} onPress={() => { setSelectedSport(sport); setBookingStep(2); }} style={{ height: 90, backgroundColor: C.card, borderRadius: 25, borderWidth: 1, borderColor: selectedSport === sport ? info.color : C.border, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 25, shadowColor: info.color, shadowOpacity: selectedSport === sport ? 0.2 : 0, shadowRadius: 10, elevation: selectedSport === sport ? 5 : 0 }}>
                                            <View style={{ width: 50, height: 50, borderRadius: 15, backgroundColor: info.color + '15', alignItems: 'center', justifyContent: 'center' }}><info.icon color={info.color} size={24} /></View>
                                            <Text style={{ flex: 1, marginLeft: 20, color: C.text, fontSize: 18, fontWeight: '900', textTransform: 'uppercase' }}>{sport}</Text>
                                            <ArrowRight color={C.sub} size={20} />
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>
                    )}

                    {bookingStep === 2 && (() => {
                        const order = (t: string) => { const [h, m] = t.split(':').map(Number); return h < 6 ? (h + 24) * 60 + m : h * 60 + m; };
                        const isToday = selectedDate === getOperationalDate();
                        const nowMin = order(`${new Date().getHours()}:${new Date().getMinutes()}`);
                        const allTimes = Array.from(new Set(Object.values(slotsByCourt).flat())).filter((t) => !isToday || order(t) > nowMin).sort((a, b) => order(a) - order(b));
                        const courtsAt = (t: string) => filteredCourts.filter((c) => (slotsByCourt[c.id] || []).includes(t));
                        const priceOf = (c: any, t: string) => Number(venue?.pricing?.[selectedSport!]?.[t] || venue?.pricing?.[selectedSport!]?.default || c?.price || 0);
                        const periodOf = (t: string) => { const h = Number(t.split(':')[0]); return h >= 6 && h < 12 ? 'Mañana' : h >= 12 && h < 18 ? 'Tarde' : 'Noche'; };
                        const free = selectedTime ? courtsAt(selectedTime) : [];
                        const pick = (t: string) => { setSelectedTime(t); const f = courtsAt(t); if (!f.some((c) => c.id === selectedCourtId)) setSelectedCourtId(f[0]?.id || null); };
                        const shiftDay = (delta: number) => { const d = new Date(selectedDate + 'T12:00:00'); d.setDate(d.getDate() + delta); const today = new Date(getOperationalDate() + 'T00:00:00'); if (d >= today) { setSelectedDate(getLocalISODate(d)); setSelectedTime(null); } };
                        return (
                            <View style={{ paddingHorizontal: 20 }}>
                                <View style={{ backgroundColor: C.card, borderRadius: PLAYER.radius, padding: 12, borderWidth: 1, borderColor: C.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                                    <TouchableOpacity accessibilityLabel="Día anterior" onPress={() => shiftDay(-1)} style={{ width: 40, height: 40, borderRadius: PLAYER.radius, alignItems: 'center', justifyContent: 'center', backgroundColor: C.soft }}><ChevronLeft color={accent} size={18} /></TouchableOpacity>
                                    <View style={{ alignItems: 'center' }}>
                                        <Text style={{ color: C.sub, fontSize: PLAYER.font.xs, fontWeight: '600', textTransform: 'capitalize' }}>{isToday ? 'Hoy' : new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'long' })}</Text>
                                        <Text style={{ color: C.text, fontSize: PLAYER.font.xl, fontWeight: '700' }}>{new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })}</Text>
                                    </View>
                                    <TouchableOpacity accessibilityLabel="Día siguiente" onPress={() => shiftDay(1)} style={{ width: 40, height: 40, borderRadius: PLAYER.radius, alignItems: 'center', justifyContent: 'center', backgroundColor: C.soft }}><ChevronRight color={accent} size={18} /></TouchableOpacity>
                                </View>

                                {filteredCourts.length === 0 ? (
                                    <Text style={{ color: C.sub, fontSize: PLAYER.font.md, textAlign: 'center', paddingVertical: 24 }}>No hay canchas disponibles para este deporte</Text>
                                ) : loadingAll ? (
                                    <ActivityIndicator color={accent} style={{ margin: 32 }} />
                                ) : allTimes.length === 0 ? (
                                    <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                                        <Text style={{ color: C.sub, fontSize: PLAYER.font.md }}>No quedan horarios este día</Text>
                                        <TouchableOpacity onPress={() => shiftDay(1)} style={{ marginTop: 12, paddingHorizontal: 20, height: 40, borderRadius: PLAYER.radius, backgroundColor: accent, justifyContent: 'center' }}><Text style={{ color: 'white', fontWeight: '600', fontSize: PLAYER.font.md }}>Ver el día siguiente</Text></TouchableOpacity>
                                    </View>
                                ) : (
                                    <View>
                                        {['Mañana', 'Tarde', 'Noche'].map((period) => {
                                            const times = allTimes.filter((t) => periodOf(t) === period);
                                            if (!times.length) return null;
                                            return (
                                                <View key={period} style={{ marginBottom: 14 }}>
                                                    <Text style={{ color: C.sub, fontSize: PLAYER.font.sm, fontWeight: '600', marginBottom: 8 }}>{period}</Text>
                                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                                        {times.map((t) => {
                                                            const on = selectedTime === t;
                                                            return (
                                                                <TouchableOpacity key={t} onPress={() => pick(t)} style={{ width: '23%', height: 44, borderRadius: PLAYER.radius, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? accent : C.soft }}>
                                                                    <Text style={{ color: on ? 'white' : C.text, fontSize: PLAYER.font.base, fontWeight: '600' }}>{t}</Text>
                                                                </TouchableOpacity>
                                                            );
                                                        })}
                                                    </View>
                                                </View>
                                            );
                                        })}

                                        {selectedTime && free.length > 0 && (
                                            <View style={{ borderTopWidth: 1, borderTopColor: C.border, paddingTop: 14, marginTop: 4 }}>
                                                <Text style={{ color: C.sub, fontSize: PLAYER.font.sm, fontWeight: '600', marginBottom: 8 }}>{free.length === 1 ? 'Cancha disponible' : `Cancha · ${free.length} libres a las ${selectedTime}`}</Text>
                                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                                                    {free.map((c: any) => {
                                                        const on = selectedCourtId === c.id;
                                                        return (
                                                            <TouchableOpacity key={c.id} onPress={() => setSelectedCourtId(c.id)} style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: PLAYER.radius, borderWidth: 1, borderColor: on ? accent : C.border, backgroundColor: on ? accent + '1A' : 'transparent' }}>
                                                                <Text style={{ color: C.text, fontSize: PLAYER.font.md, fontWeight: '600' }}>{c.name}</Text>
                                                                <Text style={{ color: accent, fontSize: PLAYER.font.sm, fontWeight: '600' }}>${priceOf(c, selectedTime).toLocaleString('es-CL')}</Text>
                                                                {c.surface ? <Text style={{ color: C.sub, fontSize: PLAYER.font.xs }}>{c.surface}</Text> : null}
                                                            </TouchableOpacity>
                                                        );
                                                    })}
                                                </ScrollView>
                                                <TouchableOpacity disabled={!selectedCourtId} onPress={() => setBookingStep(4)} style={{ marginTop: 14, height: 48, borderRadius: PLAYER.radius, backgroundColor: accent, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, opacity: selectedCourtId ? 1 : 0.5 }}>
                                                    <Text style={{ color: 'white', fontSize: PLAYER.font.base, fontWeight: '700' }}>Continuar</Text>
                                                    <ChevronRight color="white" size={16} />
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </View>
                                )}
                            </View>
                        );
                    })()}

                    {bookingStep === 4 && (
                        <View style={{ paddingHorizontal: 30 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 25 }}><Text style={{ color: C.text, fontSize: 24, fontWeight: '900' }}>Resumen Elite</Text><TouchableOpacity onPress={() => setBookingStep(2)} style={{ backgroundColor: activeSportInfo.color + '15', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10 }}><Text style={{ color: activeSportInfo.color, fontWeight: '900', fontSize: 11 }}>EDITAR</Text></TouchableOpacity></View>
                            
                            <View style={{ backgroundColor: C.card, borderRadius: 35, padding: 30, borderWidth: 1, borderColor: activeSportInfo.color + '30', shadowColor: activeSportInfo.color, shadowOpacity: 0.1, shadowRadius: 20 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 25 }}>
                                    <View style={{ width: 55, height: 55, borderRadius: 18, backgroundColor: activeSportInfo.color + '15', alignItems: 'center', justifyContent: 'center' }}><activeSportInfo.icon color={activeSportInfo.color} size={24} /></View>
                                    <View style={{ marginLeft: 20 }}><Text style={{ color: C.text, fontSize: 20, fontWeight: '900' }}>{selectedSport}</Text><Text style={{ color: C.sub, fontSize: 11, fontWeight: '800' }}>{courts.find(c => c.id === selectedCourtId)?.name}</Text></View>
                                </View>
                                <ConfirmItem label="FECHA" value={new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })} C={C} />
                                <ConfirmItem label="HORARIO" value={`${selectedTime} HRS`} C={C} />
                                <View style={{ marginTop: 25, paddingTop: 25, borderTopWidth: 1, borderTopColor: C.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <View><Text style={{ color: C.sub, fontSize: 10, fontWeight: '900', letterSpacing: 1 }}>TOTAL A PAGAR</Text><Text style={{ color: C.text, fontSize: 32, fontWeight: '900', letterSpacing: -1 }}>${(venue?.pricing?.[selectedSport!]?.[selectedTime!] || venue?.pricing?.[selectedSport!]?.default || 18000).toLocaleString('es-CL')}</Text></View>
                                    <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: activeSportInfo.color, alignItems: 'center', justifyContent: 'center', shadowColor: activeSportInfo.color, shadowOpacity: 0.4, shadowRadius: 10, elevation: 5 }}><ShieldCheck color="white" size={24} /></View>
                                </View>
                            </View>
                            <TouchableOpacity 
                                onPress={handleConfirm} 
                                disabled={isCreatingBooking}
                                style={{ 
                                    height: 70, 
                                    backgroundColor: activeSportInfo.color, 
                                    borderRadius: 25, 
                                    marginTop: 35, 
                                    flexDirection: 'row', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    shadowColor: activeSportInfo.color, 
                                    shadowOpacity: 0.3, 
                                    shadowRadius: 15, 
                                    elevation: 8,
                                    opacity: isCreatingBooking ? 0.7 : 1
                                }}
                            >
                                {isCreatingBooking ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <>
                                        <Zap color="white" size={20} fill="white" />
                                        <Text style={{ color: 'white', fontWeight: '900', fontSize: 16, marginLeft: 15, letterSpacing: 1 }}>RESERVAR AHORA</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* SECCIÓN DE OPINIONES */}
                    <View style={{ marginTop: 40, paddingHorizontal: 30, marginBottom: 20 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Text style={{ color: C.text, fontSize: 22, fontWeight: '900' }}>Opiniones de Jugadores</Text>
                            <View style={{ backgroundColor: accent + '10', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}>
                                <Text style={{ color: accent, fontWeight: '900', fontSize: 12 }}>{reviews.length}</Text>
                            </View>
                        </View>
                    </View>
                    </View>
                    </>
                )}
                renderItem={({ item: rev }: any) => (
                    <View style={{ paddingHorizontal: 30, paddingBottom: 15 }}>
                        <View style={{ backgroundColor: C.card, borderRadius: 25, padding: 20, borderWidth: 1, borderColor: C.border }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                <View style={{ flex: 1, marginRight: 10 }}>
                                    <Text style={{ color: C.text, fontSize: 14, fontWeight: '900', textTransform: 'uppercase' }} numberOfLines={1}>
                                        {typeof rev.userName === 'string' ? rev.userName : (rev.userName?.userName || 'Jugador MVP')}
                                    </Text>
                                    <Text style={{ color: C.sub, fontSize: 9, fontWeight: '800' }}>
                                        {rev.date?.toDate ? rev.date.toDate().toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }) : 'Reciente'} • {typeof rev.sport === 'string' ? rev.sport : 'General'}
                                    </Text>
                                </View>
                                <View style={{ flexDirection: 'row', gap: 2 }}>
                                    {[1, 2, 3, 4, 5].map(s => (
                                        <Star key={s} size={10} color={s <= rev.rating ? '#f59e0b' : C.sub} fill={s <= rev.rating ? '#f59e0b' : 'transparent'} />
                                    ))}
                                </View>
                            </View>
                            <Text style={{ color: C.text, fontSize: 12, fontWeight: '600', lineHeight: 18, fontStyle: 'italic', opacity: 0.8 }}>
                                "{typeof rev.comment === 'string' ? rev.comment : 'Sin comentario'}"
                            </Text>
                        </View>
                    </View>
                )}
                ListEmptyComponent={() => (
                    reviews.length === 0 ? (
                        <View style={{ paddingHorizontal: 30 }}>
                            <View style={{ backgroundColor: C.card, borderRadius: 25, padding: 30, alignItems: 'center', borderWidth: 1, borderColor: C.border, borderStyle: 'dashed' }}>
                                <Info color={C.sub} size={30} strokeWidth={1.5} />
                                <Text style={{ color: C.sub, fontSize: 13, fontWeight: '700', marginTop: 15, textAlign: 'center' }}>Aún no hay valoraciones para este recinto. ¡Sé el primero en jugar y calificar!</Text>
                            </View>
                        </View>
                    ) : null
                )}
                ListFooterComponent={() => (
                    reviews.length > visibleReviewsCount ? (
                        <View style={{ paddingHorizontal: 30 }}>
                                    <TouchableOpacity
                                        onPress={() => setVisibleReviewsCount(prev => prev + 3)}
                                        activeOpacity={0.8}
                                        style={{
                                            backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF',
                                            height: 55,
                                            borderRadius: 20,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            marginTop: 5,
                                            borderWidth: 1,
                                            borderColor: C.border,
                                            shadowColor: '#000',
                                            shadowOpacity: isDark ? 0.2 : 0.02,
                                            shadowRadius: 5,
                                            elevation: 1
                                        }}
                                    >
                                        <Text style={{ color: accent, fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.5 }}>
                                            {visibleReviewsCount === 0 ? 'Ver Opiniones' : 'Cargar 3 opiniones más'}
                                        </Text>
                                    </TouchableOpacity>
                        </View>
                    ) : null
                )}
            />
        </View>
    );
}

const SlotGroup = ({ title, icon, slots, selectedTime, onSelect, C, activeColor, selectedDate, isDark }: any) => {
    if (slots.length === 0) return null;
    const isToday = selectedDate === getOperationalDate();
    const now = new Date();
    return (
        <View style={{ marginBottom: 25 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>{icon}<Text style={{ color: C.sub, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2, marginLeft: 10 }}>{title}</Text></View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {slots.map((time: string) => {
                    const [h, m] = time.split(':').map(Number);
                    
                    const parseToMinutes = (hourVal: number, minVal: number) => {
                        return hourVal < 6 ? (hourVal + 24) * 60 + minVal : hourVal * 60 + minVal;
                    };
                    const slotMinutes = parseToMinutes(h, m);
                    const currentMinutes = parseToMinutes(now.getHours(), now.getMinutes());
                    const isPast = isToday && slotMinutes <= currentMinutes;
                    return (
                        <TouchableOpacity 
                            key={time} 
                            disabled={isPast} 
                            onPress={() => onSelect(time)} 
                            style={{ 
                                width: '22%', 
                                height: 52, 
                                borderRadius: 16, 
                                backgroundColor: selectedTime === time ? activeColor : (isPast ? (isDark ? 'rgba(255,255,255,0.02)' : '#F1F5F9') : C.card), 
                                borderWidth: 1, 
                                borderColor: selectedTime === time ? activeColor : C.border, 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                opacity: isPast ? 0.3 : 1,
                                shadowColor: activeColor,
                                shadowOpacity: selectedTime === time ? 0.3 : 0,
                                shadowRadius: 10
                            }}
                        >
                            <Text style={{ color: selectedTime === time ? 'white' : (isPast ? C.sub : C.text), fontWeight: '900', fontSize: 14 }}>{time}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
};

const ConfirmItem = ({ label, value, C }: any) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}><Text style={{ color: C.sub, fontSize: 11, fontWeight: '800' }}>{label}</Text><Text style={{ color: C.text, fontSize: 14, fontWeight: '900' }}>{value}</Text></View>
);

const SectionLabel = ({ label, accent }: { label: string, accent: string }) => (
    <Text style={{ color: accent, fontWeight: '900', fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, marginHorizontal: 40, marginTop: 10, marginBottom: 20 }}>{label}</Text>
);
