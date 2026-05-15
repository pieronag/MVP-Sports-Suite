import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface QuickActionProps {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  colors: readonly [string, string, ...string[]];
  isDark: boolean;
}

export const QuickAction = ({ icon, label, onPress, colors, isDark }: QuickActionProps) => (
    <TouchableOpacity
        onPress={onPress}
        className="items-center"
        activeOpacity={0.7}
    >
        <View 
            className="w-16 h-16 rounded-[24px] overflow-hidden items-center justify-center border border-slate-200/50 dark:border-white/10 shadow-sm"
            style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.9)' }}
        >
            <LinearGradient
                colors={isDark ? ['rgba(255,255,255,0.05)', 'transparent'] : ['rgba(255,255,255,1)', 'rgba(255,255,255,0.5)']}
                className="absolute inset-0"
            />
            
            <View className="z-10 bg-transparent items-center justify-center">
                {React.isValidElement(icon) 
                  ? React.cloneElement(icon as React.ReactElement<any>, { 
                      color: colors[0], 
                      strokeWidth: 2,
                      size: 24
                    }) 
                  : icon
                }
            </View>
        </View>
        <Text className="text-slate-500 dark:text-slate-400 font-bold text-[8px] uppercase tracking-widest text-center mt-2.5">
          {label}
        </Text>
    </TouchableOpacity>
);
