import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { MapPin, Star, Clock, ChevronRight } from 'lucide-react-native';

interface CardRecintoProps {
    name: string;
    distance: string;
    imageUrl?: string;
    sportColor?: string;
    onPress: () => void;
}

export function CardRecinto({ name, distance, imageUrl, sportColor = '#10b981', onPress }: CardRecintoProps) {
    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.9}
            className="bg-white dark:bg-[#0B0F19] rounded-[40px] overflow-hidden mb-8 border border-slate-100 dark:border-white/10 shadow-xl shadow-slate-200/50 dark:shadow-none"
        >
            <View className="relative">
                <Image
                    source={{ uri: imageUrl || 'https://images.unsplash.com/photo-1542144612-1b3641ec3459?q=80&w=1470&auto=format&fit=crop' }}
                    className="w-full h-56"
                    resizeMode="cover"
                />
                <View className="absolute top-5 left-5 bg-white/95 dark:bg-black/60 px-4 py-2 rounded-full border border-white/20 backdrop-blur-md flex-row items-center">
                    <Star color="#f59e0b" size={14} fill="#f59e0b" className="mr-1" />
                    <Text className="text-[#020617] dark:text-white text-[11px] font-black uppercase tracking-wider">4.9 • Premium</Text>
                </View>

                <View className="absolute bottom-5 right-5 px-4 py-2 rounded-2xl shadow-lg border border-white/20" style={{ backgroundColor: sportColor, shadowColor: sportColor }}>
                    <Text className="text-white font-black text-[10px] uppercase tracking-widest">Abierto</Text>
                </View>
            </View>

            <View className="p-7">
                <View className="flex-row justify-between items-start">
                    <View className="flex-1 mr-4">
                        <Text className="text-[#020617] dark:text-white font-black text-2xl leading-tight mb-3">{name}</Text>

                        <View className="flex-row items-center gap-4">
                            <View className="flex-row items-center bg-slate-50 dark:bg-white/5 py-1.5 px-3 rounded-xl">
                                <MapPin color="#64748B" size={12} className="mr-1.5" />
                                <Text className="text-slate-500 dark:text-slate-400 font-bold text-[10px] uppercase tracking-wider">{distance}</Text>
                            </View>

                            <View className="flex-row items-center bg-slate-50 dark:bg-white/5 py-1.5 px-3 rounded-xl">
                                <Clock color="#64748B" size={12} className="mr-1.5" />
                                <Text className="text-slate-500 dark:text-slate-400 font-bold text-[10px] uppercase tracking-wider">15 min</Text>
                            </View>
                        </View>
                    </View>

                    <View className="bg-slate-50 dark:bg-white/5 w-14 h-14 rounded-3xl items-center justify-center border border-slate-100 dark:border-white/10">
                        <ChevronRight color={sportColor} size={24} />
                    </View>
                </View>

                <View className="h-[1px] bg-slate-100 dark:bg-white/5 w-full my-6" />

                <View className="flex-row items-center justify-between">
                    <View className="flex-row items-baseline">
                        <Text className="text-[#020617] dark:text-white font-black text-2xl">$12.000</Text>
                        <Text className="text-slate-400 dark:text-slate-500 font-bold text-[10px] ml-1.5 uppercase tracking-widest">clp / hora</Text>
                    </View>

                    <View className="px-4 py-2 rounded-xl border" style={{ backgroundColor: `${sportColor}15`, borderColor: `${sportColor}30` }}>
                        <Text className="font-black text-[10px] uppercase tracking-widest" style={{ color: sportColor }}>Reserva Flash</Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
}
