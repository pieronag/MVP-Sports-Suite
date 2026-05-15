import React from 'react';
import { View } from 'react-native';
import { Skeleton } from '../../../components/ui/Skeleton';

export const VenueListSkeleton = () => (
  <View className="gap-y-8">
    {[1, 2].map(i => (
      <Skeleton key={i} className="w-full h-60 rounded-[40px]" />
    ))}
  </View>
);
