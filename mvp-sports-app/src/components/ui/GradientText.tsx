import React from 'react';
import { Text, TextProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { cn } from '../../lib/utils';

interface GradientTextProps extends TextProps {
  colors: string[];
  children: string;
  className?: string;
  start?: { x: number; y: number };
  end?: { x: number; y: number };
}

export const GradientText = ({ 
  colors, 
  children, 
  className, 
  start = { x: 0, y: 0 }, 
  end = { x: 1, y: 0 },
  ...props 
}: GradientTextProps) => {
  return (
    <MaskedView
      maskElement={
        <Text {...props} className={cn("bg-transparent", className)}>
          {children}
        </Text>
      }
    >
      <LinearGradient colors={colors as any} start={start} end={end}>
        <Text {...props} className={cn("opacity-0", className)}>
          {children}
        </Text>
      </LinearGradient>
    </MaskedView>
  );
};
