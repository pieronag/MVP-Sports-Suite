import React, { useState } from 'react';
import { TouchableOpacity, Text, View, ActivityIndicator, Alert } from 'react-native';
import { Database, PlusCircle } from 'lucide-react-native';
import { collection, addDoc, GeoPoint, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

const VENUES = [
    {
        name: 'Padel Pro Santiago',
        address: 'Av. Vitacura 2736, Vitacura',
        coordinates: new GeoPoint(-33.4189, -70.6033),
        imageUrl: 'https://images.unsplash.com/photo-1542144612-1b3641ec3459?q=80&w=1470&auto=format&fit=crop',
        sports: ['padel'],
        rating: 4.8
    },
    {
        name: 'Futbol Base 5 Recoleta',
        address: 'Av. Recoleta 1245, Recoleta',
        coordinates: new GeoPoint(-33.4372, -70.6506),
        imageUrl: 'https://images.unsplash.com/photo-1518605368461-1ee71ee8c310?q=80&w=1374&auto=format&fit=crop',
        sports: ['futbol'],
        rating: 4.5
    },
    {
        name: 'Club de Tenis Oriente',
        address: 'Las Condes 12000, Las Condes',
        coordinates: new GeoPoint(-33.4100, -70.5800),
        imageUrl: 'https://images.unsplash.com/photo-1595435064215-68d148332009?q=80&w=1470&auto=format&fit=crop',
        sports: ['tenis', 'padel'],
        rating: 4.9
    }
];

export function SeedHelper() {
    const [loading, setLoading] = useState(false);

    const handleSeed = async () => {
        setLoading(true);
        try {
            const venuesRef = collection(db, 'venues');
            const snap = await getDocs(venuesRef);

            // Delete current ones to avoid dupes for this demo
            for (const d of snap.docs) {
                await deleteDoc(d.ref);
            }

            for (const v of VENUES) {
                await addDoc(venuesRef, v);
            }
            Alert.alert("Éxito", "Información real inyectada correctamente.");
        } catch (error: any) {
            Alert.alert("Error", error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <TouchableOpacity
            onPress={handleSeed}
            disabled={loading}
            className="flex-row items-center justify-center bg-[#10b981]/10 border border-[#10b981]/20 p-4 rounded-2xl mb-6 mx-6"
        >
            {loading ? <ActivityIndicator color="#10b981" /> : (
                <>
                    <Database color="#10b981" size={20} className="mr-2" />
                    <Text className="text-[#10b981] font-black uppercase text-[10px] tracking-widest">Inyectar Información de Revisión</Text>
                </>
            )}
        </TouchableOpacity>
    );
}
