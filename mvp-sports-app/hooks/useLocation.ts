import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { Platform } from 'react-native';

export const useLocation = () => {
    const [address, setAddress] = useState('Rancagua, Chile');
    const [coords, setCoords] = useState<{ lat: number, lng: number } | null>(null);

    const getAddress = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;

            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });

            if (Platform.OS !== 'web') {
                const rev = await Location.reverseGeocodeAsync({
                    latitude: loc.coords.latitude,
                    longitude: loc.coords.longitude
                });
                if (rev.length > 0) {
                    const item = rev[0];
                    setAddress(`${item.street || ''} ${item.district || item.city || ''}`.trim());
                }
            }
        } catch (e) {
            console.warn("Location error:", e);
        }
    };

    useEffect(() => { getAddress(); }, []);

    return { address, coords, refreshLocation: getAddress };
};