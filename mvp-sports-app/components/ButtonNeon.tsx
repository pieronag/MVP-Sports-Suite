import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, View } from 'react-native';

interface ButtonNeonProps {
    title: string;
    onPress: () => void;
    isLoading?: boolean;
    type?: 'primary' | 'secondary' | 'danger';
    className?: string;
    icon?: React.ReactNode;
    color?: string;
}

export function ButtonNeon({
    title,
    onPress,
    isLoading = false,
    type = 'primary',
    className = '',
    icon,
    color
}: ButtonNeonProps) {
    const getStyles = () => {
        switch (type) {
            case 'primary':
                return {
                    bg: 'bg-[#10b981]',
                    text: 'text-white dark:text-[#0B0F19]',
                    shadow: 'shadow-lg shadow-[#10b981]/50'
                };
            case 'secondary':
                return {
                    bg: 'bg-transparent border border-[#10b981]/30',
                    text: 'text-[#10b981]',
                    shadow: ''
                };
            case 'danger':
                return {
                    bg: 'bg-transparent border border-red-500/30',
                    text: 'text-red-500',
                    shadow: ''
                };
        }
    };

    const styles = getStyles();

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={isLoading}
            activeOpacity={0.7}
            className={`w-full py-5 rounded-3xl items-center justify-center flex-row ${color ? '' : styles.bg} ${color ? '' : styles.shadow} ${className} ${isLoading ? 'opacity-70' : ''}`}
            style={color && type === 'primary' ? { backgroundColor: color, shadowColor: color, shadowOpacity: 0.5, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5 } : undefined}
        >
            {isLoading ? (
                <ActivityIndicator color={type === 'primary' ? '#fff' : '#10b981'} size="small" />
            ) : (
                <View className="flex-row items-center justify-center px-4">
                    <Text className={`${styles.text} font-black uppercase tracking-[0.2em] text-sm`}>
                        {title}
                    </Text>
                    {icon && <View className="ml-3">{icon}</View>}
                </View>
            )}
        </TouchableOpacity>
    );
}
