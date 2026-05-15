import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { cn } from '../../lib/utils';
import { useColorScheme } from 'nativewind';

interface GlassViewProps extends ViewProps {
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
  className?: string;
  children?: React.ReactNode;
  border?: boolean;
}

export const GlassView = ({
  intensity = 20,
  tint,
  className,
  children,
  border = true,
  ...props
}: GlassViewProps) => {
  const { colorScheme } = useColorScheme();
  const defaultTint = tint || (colorScheme === 'dark' ? 'dark' : 'light');

  return (
    <View 
      className={cn(
        "overflow-hidden rounded-3xl", 
        border && "border border-white/10 dark:border-white/5",
        className
      )}
      {...props}
    >
      <BlurView
        intensity={intensity}
        tint={defaultTint}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  );
};
