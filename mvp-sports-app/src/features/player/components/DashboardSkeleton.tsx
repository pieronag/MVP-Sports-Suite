import React from 'react';
import { View } from 'react-native';
import { Skeleton } from '../../../components/ui/Skeleton';

export const DashboardSkeleton = () => (
  <View className="flex-1 bg-white dark:bg-[#020617] px-8 pt-14">
    <View className="flex-row justify-between items-center mb-10">
      <View className="flex-1">
        <Skeleton className="w-24 h-4 mb-2" />
        <Skeleton className="w-48 h-10" />
      </View>
      <View className="flex-row gap-x-3">
        <Skeleton className="w-12 h-12 rounded-2xl" />
        <Skeleton className="w-12 h-12 rounded-2xl" />
      </View>
    </View>
    
    <Skeleton className="w-full h-14 rounded-3xl mb-10" />
    
    <View className="flex-row justify-between mb-8">
      {[1, 2, 3, 4, 5].map(i => (
        <View key={i} className="items-center">
          <Skeleton className="w-16 h-16 rounded-[24px] mb-2" />
          <Skeleton className="w-10 h-2" />
        </View>
      ))}
    </View>
    
    <Skeleton className="w-full h-48 rounded-[44px] mb-10" />
    
    <View className="flex-row justify-between items-end mb-8">
      <View>
        <Skeleton className="w-40 h-8 mb-2" />
        <Skeleton className="w-32 h-3" />
      </View>
    </View>
    
    {[1, 2].map(i => (
      <Skeleton key={i} className="w-full h-60 rounded-[40px] mb-8" />
    ))}
  </View>
);
