import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, StatusBar, ActivityIndicator, Platform, ScrollView, Image, Dimensions, StyleSheet, RefreshControl, BackHandler } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { MapPin, Navigation, Locate, Map as MapIcon, ChevronLeft, ArrowRight, Star, Plus, Minus, Compass, Search, Activity, Target, Trophy, Circle, Dribbble, Dumbbell } from 'lucide-react-native';
import { useAuth } from '../../../store/useAuth';
import * as Location from 'expo-location';
import { venueService } from '../../../services/venueService';
import { useUserLocation, useVenues } from '../../../src/features/player/hooks/useDashboardData';
import { LinearGradient } from 'expo-linear-gradient';

import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
const GoogleMaps = MapView;

import { FutbolIcon, PadelIcon, TenisIcon, BasquetbolIcon, VoleibolIcon } from '../../../components/icons/sports';

const { width } = Dimensions.get('window');

// PALETA DE COLORES ELITE (Sincronizada con Perfil y Reservas)
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

const CATEGORIAS = [
    { id: 'todo', name: 'Todos' },
    { id: 'futbol', name: 'Fútbol', icon: FutbolIcon },
    { id: 'futbolito', name: 'Futbolito', icon: FutbolIcon },
    { id: 'padel', name: 'Pádel', icon: PadelIcon },
    { id: 'tenis', name: 'Tenis', icon: TenisIcon },
    { id: 'basquet', name: 'Básquet', icon: BasquetbolIcon },
    { id: 'voley', name: 'Voley', icon: VoleibolIcon },
    { id: 'entrenamiento', name: 'Training', icon: Dumbbell },
];

const formatDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;
    return d < 1 ? `${Math.round(d * 1000)}m` : `${d.toFixed(1)}km`;
};

export default function MapaBusquedaScreen() {
    const scrollViewRef = useRef<ScrollView>(null);
    const router = useRouter();
    const { theme } = useAuth();
    const isDark = theme === 'dark';
    const C = isDark ? THEME.dark : THEME.light;
    const accent = THEME.accent;
    
    const [activeSport, setActiveSport] = useState('todo');
    const { data: locationData, isLoading: loadingLocation, refetch: refetchLocation } = useUserLocation();
    const { data: rawVenues, isLoading: loadingVenues, refetch: refetchVenues } = useVenues('todo');
    const [venues, setVenues] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    const [region, setRegion] = useState({
        latitude: -33.4489,
        longitude: -70.6693,
        latitudeDelta: 0.05,
        longitudeDelta: 0.02,
    });

    const handleZoom = (type: 'in' | 'out') => {
        setRegion(prev => ({
            ...prev,
            latitudeDelta: type === 'in' ? prev.latitudeDelta / 2 : prev.latitudeDelta * 2,
            longitudeDelta: type === 'out' ? prev.longitudeDelta * 2 : prev.longitudeDelta / 2,
        }));
    };

    const extractCoords = (v: any) => {
        const target = v.location || v.coordinates || v.coords || v;
        let lat = target?.latitude ?? target?.lat ?? target?._lat ?? v.latitude ?? v.lat;
        let lng = target?.longitude ?? target?.lng ?? target?._long ?? v.longitude ?? v.lng;
        return { lat: parseFloat(lat), lng: parseFloat(lng) };
    };

    useFocusEffect(
        React.useCallback(() => {
            refetchLocation();
            refetchVenues();
        }, [])
    );

    useEffect(() => {
        if (locationData?.coords) {
            setRegion(r => ({
                ...r,
                latitude: locationData.coords.latitude,
                longitude: locationData.coords.longitude,
            }));
        }
    }, [locationData]);



    useEffect(() => {
        if (rawVenues) {
            const filtered = rawVenues.filter((v: any) => {
                if (activeSport === 'todo') return true;
                const venueSports = [
                    ...(v.sports || []),
                    ...(v.activeSports || []),
                    ...(v.pricing ? Object.keys(v.pricing) : [])
                ].map((s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase());
                
                if (activeSport === 'futbol') {
                    return venueSports.some((s: string) => s.includes('futbol') && !s.includes('futbolito'));
                }
                if (activeSport === 'futbolito') {
                    return venueSports.some((s: string) => s.includes('futbolito'));
                }
                
                const searchKey = activeSport === 'entrenamiento' ? 'training' : activeSport.toLowerCase();
                return venueSports.some((s: string) => s.includes(searchKey));
            });

            const processed = filtered.map((v: any) => {
                const { lat, lng } = extractCoords(v);
                const displaySports = [
                    ...(v.activeSports || v.sports || []),
                    ...(v.pricing ? Object.keys(v.pricing) : [])
                ].filter((item, pos, self) => self.indexOf(item) === pos);

                let distLabel = 'Cerca';
                if (locationData?.coords && !isNaN(lat) && !isNaN(lng)) {
                    distLabel = formatDistance(locationData.coords.latitude, locationData.coords.longitude, lat, lng);
                }

                return { ...v, lat, lng, displaySports: displaySports.length > 0 ? displaySports.join(' • ') : 'Sesión', distance: distLabel };
            }).filter((v: any) => !isNaN(v.lat) && !isNaN(v.lng));

            setVenues(processed);
        }
    }, [rawVenues, activeSport, locationData]);

    const activeCategories = useMemo(() => {
        if (!rawVenues) return [CATEGORIAS[0]];
        const availableSports = new Set<string>();
        rawVenues.forEach((v: any) => {
            const venueSports = [
                ...(v.sports || []),
                ...(v.activeSports || []),
                ...(v.pricing ? Object.keys(v.pricing) : [])
            ].map((s: string) => s.toLowerCase());
            venueSports.forEach((s: string) => {
                if (s.includes('futbolito')) availableSports.add('futbolito');
                else if (s.includes('futbol')) availableSports.add('futbol');
                if (s.includes('padel')) availableSports.add('padel');
                if (s.includes('tenis')) availableSports.add('tenis');
                if (s.includes('basquet') || s.includes('basket')) availableSports.add('basquet');
                if (s.includes('voley')) availableSports.add('voley');
                if (s.includes('entrenamiento') || s.includes('training')) availableSports.add('entrenamiento');
            });
        });
        return CATEGORIAS.filter(cat => cat.id === 'todo' || availableSports.has(cat.id));
    }, [rawVenues]);

    return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={C.card} />

            {/* CABECERA PRO */}
            <View style={{ paddingTop: 60, paddingBottom: 20, paddingHorizontal: 30, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border }}>
                <TouchableOpacity onPress={() => router.back()} style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : C.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}>
                    <ChevronLeft color={accent} size={24} />
                </TouchableOpacity>
                <Text style={{ color: C.text, fontSize: 20, fontWeight: '900', textTransform: 'uppercase', letterSpacing: -1 }}>Mapa de Clubes</Text>
                <TouchableOpacity onPress={() => refetchLocation()} style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : C.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}>
                    <Locate color={accent} size={20} />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => refetchVenues()} tintColor={accent} />}>
                
                {/* FILTROS GLASSY */}
                <View style={{ paddingVertical: 20, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border }}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 25 }}>
                        {activeCategories.map(cat => (
                            <TouchableOpacity
                                key={cat.id}
                                onPress={() => setActiveSport(cat.id)}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    paddingHorizontal: 18,
                                    height: 40,
                                    borderRadius: 12,
                                    marginRight: 10,
                                    backgroundColor: activeSport === cat.id ? accent : (isDark ? 'rgba(255,255,255,0.03)' : THEME.light.bg),
                                    borderWidth: 1,
                                    borderColor: activeSport === cat.id ? accent : C.border
                                }}
                            >
                                {cat.icon && <cat.icon color={activeSport === cat.id ? 'white' : C.sub} size={14} />}
                                <Text style={{ marginLeft: cat.icon ? 8 : 0, color: activeSport === cat.id ? 'white' : C.text, fontWeight: '900', fontSize: 10, textTransform: 'uppercase' }}>{cat.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* MAPA ELITE PRO */}
                <View style={{ padding: 25 }}>
                    <View style={{ height: 380, borderRadius: 30, overflow: 'hidden', borderWidth: 1, borderColor: C.border, backgroundColor: C.card, shadowColor: '#000', shadowOpacity: isDark ? 0.3 : 0.05, shadowRadius: 20, elevation: isDark ? 10 : 0 }}>
                        <GoogleMaps
                            style={StyleSheet.absoluteFill}
                            provider={PROVIDER_GOOGLE}
                            customMapStyle={isDark ? DARK_MAP_STYLE : LIGHT_MAP_STYLE}
                            region={region}
                            onRegionChangeComplete={setRegion}
                            showsUserLocation={true}
                            showsMyLocationButton={false} // Desactiva el botón nativo interno
                        >
                            {venues.map((venue: any) => (
                                <Marker
                                    key={venue.id}
                                    coordinate={{ latitude: venue.lat, longitude: venue.lng }}
                                    onPress={() => router.push({ pathname: '/(player)/clubes/[id]', params: { id: venue.id } } as any)}
                                    anchor={{ x: 0.5, y: 0.5 }}
                                >
                                    <View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                                        <View 
                                            collapsable={false}
                                            style={{ 
                                                width: 40, 
                                                height: 40, 
                                                borderRadius: 20, 
                                                backgroundColor: accent, 
                                                borderWidth: 3, 
                                                borderColor: isDark ? C.card : 'white', 
                                                alignItems: 'center', 
                                                justifyContent: 'center',
                                                overflow: 'hidden',
                                                shadowColor: '#000',
                                                shadowOpacity: 0.5,
                                                shadowRadius: 5,
                                                elevation: 8
                                            }}
                                        >
                                            <Image 
                                                source={require('../../../assets/images/Logo.png')} 
                                                style={{ width: '70%', height: '70%', tintColor: 'white' }} 
                                                resizeMode="contain" 
                                            />
                                        </View>
                                    </View>
                                </Marker>
                            ))}
                        </GoogleMaps>

                        <View style={{ position: 'absolute', bottom: 20, right: 20, gap: 8 }}>
                            <TouchableOpacity onPress={() => handleZoom('in')} style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 5, borderWidth: 1, borderColor: C.border }}>
                                <Plus color={C.text} size={20} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleZoom('out')} style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 5, borderWidth: 1, borderColor: C.border }}>
                                <Minus color={C.text} size={20} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* LISTADO DE CLUBES PRO */}
                <View style={{ paddingHorizontal: 25 }}>
                    <Text style={{ color: accent, fontWeight: '900', fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, marginHorizontal: 15, marginBottom: 15 }}>Clubes Cercanos</Text>
                    
                    {loadingVenues ? (
                        <ActivityIndicator color={accent} style={{ marginTop: 40 }} />
                    ) : venues.length === 0 ? (
                        <View style={{ padding: 60, alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: C.border, borderRadius: 25 }}>
                            <Compass color={C.sub} size={32} />
                            <Text style={{ color: C.sub, fontWeight: '800', fontSize: 10, marginTop: 15 }}>SIN RECINTOS DETECTADOS</Text>
                        </View>
                    ) : (
                        venues.map(v => (
                            <TouchableOpacity
                                key={v.id}
                                onPress={() => router.push({ pathname: '/(player)/clubes/[id]', params: { id: v.id } } as any)}
                                activeOpacity={0.9}
                                style={{ 
                                    backgroundColor: C.card, 
                                    borderRadius: 25, 
                                    marginBottom: 20, 
                                    overflow: 'hidden', 
                                    borderWidth: 1, 
                                    borderColor: C.border, 
                                    shadowColor: '#000', 
                                    shadowOpacity: isDark ? 0.4 : 0.05, 
                                    shadowRadius: 15,
                                    elevation: isDark ? 8 : 0
                                }}
                            >
                                <View style={{ width: '100%', aspectRatio: 1.6, backgroundColor: isDark ? '#0F172A' : '#FFFFFF' }}>
                                    <Image 
                                        source={{ uri: v.imageURL || v.imageUrl || 'https://images.unsplash.com/photo-1599566150163-29194dcaad36' }} 
                                        style={{ width: '100%', height: '100%' }} 
                                        resizeMode="cover" 
                                    />
                                    <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%' }} />
                                    <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 25 }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={{ color: 'white', fontSize: 20, fontWeight: '900', textTransform: 'uppercase', letterSpacing: -0.5 }}>{v.name}</Text>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                                                    <View style={{ backgroundColor: 'rgba(16,185,129,0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, flexDirection: 'row', alignItems: 'center', marginRight: 10 }}>
                                                        <Star color={accent} size={10} fill={accent} />
                                                        <Text style={{ color: accent, fontSize: 10, fontWeight: '900', marginLeft: 4 }}>{Number(v.rating || 0).toFixed(1)}</Text>
                                                    </View>
                                                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '800' }}>{v.displaySports}</Text>
                                                </View>
                                            </View>
                                            <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                                                <Navigation color="white" size={12} />
                                                <Text style={{ color: 'white', fontSize: 11, fontWeight: '900', marginLeft: 8 }}>{v.distance}</Text>
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

// ESTILO DE MAPA DARK ELITE PRO
const DARK_MAP_STYLE = [
    { "elementType": "geometry", "stylers": [{ "color": "#020617" }] },
    { "elementType": "labels.text.fill", "stylers": [{ "color": "#64748B" }] },
    { "elementType": "labels.text.stroke", "stylers": [{ "color": "#020617" }] },
    { "featureType": "administrative", "elementType": "geometry", "stylers": [{ "color": "#1e293b" }] },
    { "featureType": "poi", "stylers": [{ "visibility": "off" }] },
    { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#0f172a" }] },
    { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#1e293b" }] },
    { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#1e293b" }] },
    { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#083344" }] }
];

const LIGHT_MAP_STYLE = [
    { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#BAE6FD" }] }, 
    { "featureType": "landscape", "elementType": "geometry", "stylers": [{ "color": "#F8FAFC" }] }, 
    { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#FFFFFF" }] }, 
    { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#E2E8F0" }] }, 
    { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#DCFCE7" }] }, 
    { "featureType": "poi", "elementType": "labels", "stylers": [{ "visibility": "off" }] },
    { "featureType": "transit", "stylers": [{ "visibility": "off" }] },
    { "featureType": "administrative", "elementType": "labels.text.fill", "stylers": [{ "color": "#64748B" }] } 
];


