import { useQuery } from '@tanstack/react-query';
import { venueService, Tenant } from '../../../../services/venueService';
import * as Location from 'expo-location';
import { Platform } from 'react-native';

export const useVenues = (sport: string = 'todo') => {
  return useQuery({
    queryKey: ['venues', sport],
    queryFn: async () => {
      if (sport === 'todo') {
        return await venueService.getVenues();
      }
      return await venueService.getVenuesBySport(sport);
    },
    staleTime: 1000 * 60 * 10, // 10 minutos
  });
};

export const useUserLocation = () => {
  return useQuery({
    queryKey: ['user-location'],
    queryFn: async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return { address: 'Santiago, Chile', coords: null };

      // Optimized: Get last known position first (instant)
      let loc = await Location.getLastKnownPositionAsync();
      
      // If no last known, get current position with lower accuracy for speed
      if (!loc) {
        loc = await Location.getCurrentPositionAsync({ 
          accuracy: Location.Accuracy.Balanced,
        });
      }
      
      let address = 'Santiago, Chile';
      if (Platform.OS !== 'web' && loc) {
        try {
          const rev = await Location.reverseGeocodeAsync({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude
          });
          if (rev.length > 0) {
            const item = rev[0];
            const street = item.street || '';
            const number = item.name && item.name !== item.street ? item.name : '';
            const district = item.district || item.city || '';
            address = `${street} ${number}${number ? ', ' : ''}${district}`.trim() || 'Santiago, Chile';
          }
        } catch (e) {
          console.warn("Geocoding failed", e);
        }
      }
      return { address, coords: loc.coords };
    },
    staleTime: 1000 * 60 * 30, // 30 minutos
  });
};
