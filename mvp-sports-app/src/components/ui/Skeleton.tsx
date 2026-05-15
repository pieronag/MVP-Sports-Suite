import React, { useEffect } from 'react';
import { View, ViewProps } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withSequence 
} from 'react-native-reanimated';
import { cn } from '../../lib/utils';

interface SkeletonProps extends ViewProps {
  className?: string;
}

export const Skeleton = ({ className, ...props }: SkeletonProps) => {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 1000 }),
        withTiming(0.3, { duration: 1000 })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  return (
    <Animated.View 
      style={animatedStyle}
      className={cn("bg-slate-200 dark:bg-slate-800 rounded-md", className)}
      {...props}
    />
  );
};
