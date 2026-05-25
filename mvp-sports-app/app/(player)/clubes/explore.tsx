import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, RefreshControl, BackHandler, Dimensions, StyleSheet, TextInput } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import {
    ChevronLeft, Search, Filter as FilterIcon, Star, MapPin,
    ArrowRight, Compass, Navigation, Phone,
    Clock, CircleDot, Info, X, ChevronDown,
    Dribbble, Activity, TrendingUp, Zap, Heart,
    Trophy, MapPinned, Dumbbell, Medal
} from 'lucide-react-native';
import { FutbolIcon, PadelIcon, TenisIcon, BasquetbolIcon, VoleibolIcon } from '../../../components/icons/sports';
import { Image } from 'expo-image';
import { useAuth } from '../../../store/useAuth';
import { venueService, Tenant } from '../../../services/venueService';
import { LinearGradient } from 'expo-linear-gradient';
import { useUserLocation } from '../../../src/features/player/hooks/useDashboardData';

const { width } = Dimensions.get('window');

const THEME = {
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
        border: 'rgba(255,255,255,0.05)',
        text: '#F8FAFC',
        sub: '#94A3B8'
    },
    accent: '#10b981'
};

const formatDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;
    return d < 1 ? `${Math.round(d * 1000)}m` : `${d.toFixed(1)}km`;
};

const getSportIcon = (sportName: string) => {
    const s = (sportName || '').toLowerCase();
    if (s === 'todos' || s === 'todo') return null;
    if (s.includes('futbol') || s.includes('fútbol')) return FutbolIcon;
    if (s.includes('padel') || s.includes('pádel')) return PadelIcon;
    if (s.includes('tenis')) return TenisIcon;
    if (s.includes('basquet') || s.includes('basket')) return BasquetbolIcon;
    if (s.includes('voley') || s.includes('vóley')) return VoleibolIcon;
    if (s.includes('entrenamiento') || s.includes('training')) return Dumbbell;
    return Medal;
};

export default function ExploreClubesScreen() {
    const { theme } = useAuth();
    const router = useRouter();
    const isDark = theme === 'dark';
    const C = isDark ? THEME.dark : THEME.light;
    const accent = THEME.accent;

    const [search, setSearch] = useState('');
    const [venues, setVenues] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [selectedSport, setSelectedSport] = useState('Todos');
    const [selectedCommune, setSelectedCommune] = useState('Todas');

    const userLoc = useUserLocation();

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await venueService.getVenues();
            setVenues(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            loadData();
        }, [])
    );

    const sportsList = useMemo(() => {
        const sports = new Set(['Todos']);
        venues.forEach(v => {
            const allSports = (v as any).activeSports || (v as any).sports || [];
            allSports.forEach((s: string) => {
                if (s) sports.add(s);
            });
        });
        return Array.from(sports);
    }, [venues]);

    const communesList = useMemo(() => {
        const communes = new Set(['Todas']);
        venues.forEach(v => {
            const c = (v as any).commune || (v as any).comuna;
            if (c) communes.add(c);
        });
        return Array.from(communes);
    }, [venues]);

    const filteredVenues = useMemo(() => {
        const normalizeSport = (s: string) => s ? s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : '';
        const normalizedSelected = normalizeSport(selectedSport);

        return venues.filter(v => {
            const matchesSearch = v.name.toLowerCase().includes(search.toLowerCase());
            const allSports = (v as any).activeSports || (v as any).sports || [];
            const matchesSport = selectedSport === 'Todos' || allSports.some((s: string) => normalizeSport(s).includes(normalizedSelected) || normalizedSelected.includes(normalizeSport(s)));
            const commune = (v as any).commune || (v as any).comuna;
            const matchesCommune = selectedCommune === 'Todas' || commune === selectedCommune;
            return matchesSearch && matchesSport && matchesCommune;
        });
    }, [venues, search, selectedSport, selectedCommune]);

    if (loading && !refreshing) {
        return (
            <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color={accent} size="large" />
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={C.card} />

            <View style={{ paddingTop: 60, paddingBottom: 20, paddingHorizontal: 30, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border }}>
                <TouchableOpacity onPress={() => router.back()} style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : C.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}>
                    <ChevronLeft color={accent} size={24} />
                </TouchableOpacity>
                <Text style={{ color: C.text, fontSize: 20, fontWeight: '900', textTransform: 'uppercase', letterSpacing: -1 }}>Recintos</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 120 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={accent} />}
            >
                <View style={{ padding: 25, paddingBottom: 10 }}>
                    <View style={{ backgroundColor: C.card, borderRadius: 20, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, height: 55, borderWidth: 1, borderColor: C.border }}>
                        <Search color={accent} size={18} />
                        <TextInput
                            placeholder="Buscar club o recinto..."
                            placeholderTextColor={isDark ? '#334155' : '#CBD5E1'}
                            value={search}
                            onChangeText={setSearch}
                            style={{ flex: 1, marginLeft: 15, color: C.text, fontSize: 14, fontWeight: '700' }}
                        />
                    </View>
                </View>

                <View style={{ marginBottom: 10 }}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 25, paddingVertical: 10 }}>
                        {sportsList.map(sport => {
                            const Icon = getSportIcon(sport);
                            return (
                                <FilterChip
                                    key={sport} label={sport} active={selectedSport === sport} icon={Icon}
                                    onPress={() => setSelectedSport(sport)} isDark={isDark} C={C} accent={accent}
                                />
                            );
                        })}
                    </ScrollView>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 25 }}>
                        {communesList.map(commune => (
                            <FilterChip
                                key={commune} label={commune} active={selectedCommune === commune}
                                onPress={() => setSelectedCommune(commune)} isDark={isDark} C={C} accent={accent}
                            />
                        ))}
                    </ScrollView>
                </View>

                <SectionLabel label={`Resultados (${filteredVenues.length})`} accent={accent} />

                {filteredVenues.map((venue) => (
                    <RecintoVerticalEliteCard key={venue.id} venue={venue} isDark={isDark} userLoc={userLoc} C={C} accent={accent} />
                ))}
            </ScrollView>
        </View>
    );
}

const FilterChip = ({ label, active, onPress, isDark, C, accent, icon: IconComponent }: any) => (
    <TouchableOpacity
        onPress={onPress}
        style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, marginRight: 8,
            backgroundColor: active ? accent : (isDark ? 'rgba(255,255,255,0.03)' : '#F1F5F9'),
            borderWidth: 1, borderColor: active ? accent : C.border
        }}
    >
        {IconComponent && <IconComponent color={active ? 'white' : C.sub} size={14} />}
        <Text style={{ marginLeft: IconComponent ? 8 : 0, color: active ? 'white' : C.sub, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' }}>{label}</Text>
    </TouchableOpacity>
);

const RecintoVerticalEliteCard = ({ venue, isDark, userLoc, C, accent }: any) => {
    const router = useRouter();
    const data = venue as any;
    const vComuna = data.commune || data.comuna || 'Santiago';
    const allSports = (data.activeSports || data.sports || ['Multicancha']) as string[];
    const firstSport = allSports[0] || 'Multicancha';

    const getVenueImage = () => {
        const url = data.imageURL || data.imageUrl || venue.imageUrl;
        if (url && (url.startsWith('data:image') || url.startsWith('http'))) return url;
        const s = firstSport.toLowerCase();
        if (s.includes('padel')) return 'https://images.unsplash.com/photo-1626248801379-51a0748a5f96';
        if (s.includes('tenis')) return 'https://images.unsplash.com/photo-1595435064215-68d148332009';
        return 'https://images.unsplash.com/photo-1574629810360-7efbbe195018';
    };

    const venueCoords = useMemo(() => {
        const c = data?.coordinates || data?.location;
        if (!c) return null;
        return { latitude: c.latitude || c._lat || c.lat, longitude: c.longitude || c._long || c.lng };
    }, [data]);

    const distance = useMemo(() => {
        if (!userLoc?.data?.coords || !venueCoords?.latitude) return null;
        return formatDistance(userLoc.data.coords.latitude, userLoc.data.coords.longitude, venueCoords.latitude, venueCoords.longitude);
    }, [userLoc, venueCoords]);

    return (
        <View style={{ 
            marginHorizontal: 30, 
            marginBottom: 25, 
            backgroundColor: C.card, 
            borderRadius: 30, 
            overflow: 'hidden', 
            borderWidth: 1, 
            borderColor: C.border, 
            shadowColor: '#000', 
            shadowOpacity: isDark ? 0.4 : 0.05, 
            shadowRadius: 15,
            elevation: isDark ? 10 : 0
        }}>
            <TouchableOpacity onPress={() => router.push({ pathname: '/(player)/clubes/[id]', params: { id: venue.id } } as any)} activeOpacity={0.9} style={{ width: '100%', aspectRatio: 1.6, backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }}>
                <Image source={{ uri: getVenueImage() }} style={StyleSheet.absoluteFill} contentFit="cover" />
                <LinearGradient colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.8)']} style={StyleSheet.absoluteFill} />
                <View style={{ position: 'absolute', top: 20, left: 20, flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
                    {allSports.slice(0,3).map(s => (
                        <View key={s} style={{ backgroundColor: 'rgba(16,185,129,0.9)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 }}>
                            <Text style={{ color: 'white', fontSize: 9, fontWeight: '900', letterSpacing: 1 }}>{s.toUpperCase()}</Text>
                        </View>
                    ))}
                    {allSports.length > 3 && (
                        <View style={{ backgroundColor: 'rgba(16,185,129,0.9)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 }}>
                            <Text style={{ color: 'white', fontSize: 9, fontWeight: '900' }}>+{allSports.length - 3}</Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>

            <View style={{ padding: 25 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 }}>
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: C.text, fontSize: 22, fontWeight: '900', letterSpacing: -0.5 }}>{venue.name}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                            <MapPin color={C.sub} size={12} />
                            <Text style={{ color: C.sub, fontSize: 13, fontWeight: '700', marginLeft: 6 }}>{vComuna}</Text>
                        </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: accent + '15', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }}>
                        <Star color={accent} size={14} fill={accent} />
                        <Text style={{ color: accent, fontWeight: '900', fontSize: 14, marginLeft: 6 }}>{Number(venue.rating || 0).toFixed(1)}</Text>
                    </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 20, borderTopWidth: 1, borderTopColor: C.border }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Navigation color={accent} size={16} />
                        <Text style={{ color: C.sub, fontSize: 13, fontWeight: '800', marginLeft: 8 }}>{distance || 'Cerca de ti'}</Text>
                    </View>
                    <TouchableOpacity onPress={() => router.push({ pathname: '/(player)/clubes/[id]', params: { id: venue.id } } as any)} style={{ backgroundColor: accent, paddingHorizontal: 25, height: 50, borderRadius: 18, alignItems: 'center', justifyContent: 'center', shadowColor: accent, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 }}>
                        <Text style={{ color: 'white', fontWeight: '900', fontSize: 13 }}>RESERVAR</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const SectionLabel = ({ label, accent }: { label: string, accent: string }) => (
    <Text style={{ color: accent, fontWeight: '900', fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, marginHorizontal: 40, marginTop: 10, marginBottom: 20 }}>{label}</Text>
);
