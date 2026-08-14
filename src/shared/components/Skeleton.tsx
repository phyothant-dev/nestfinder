import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

export function Skeleton({
  className = "",
  style,
}: {
  className?: string;
  style?: any;
}) {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      className={`bg-gray-200 rounded-lg ${className}`}
      style={[animatedStyle, style]}
    />
  );
}

export function PropertyCardSkeleton() {
  return (
    <View className="bg-white rounded-[20px] overflow-hidden border border-primary-200 mb-4">
      <Skeleton className="w-full h-48 rounded-none" />
      <View className="p-4">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2 mt-2" />
        <View className="flex-row justify-between mt-4">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-16" />
        </View>
      </View>
    </View>
  );
}

export function PropertyListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <View className="p-5">
      {Array.from({ length: count }).map((_, i) => (
        <PropertyCardSkeleton key={i} />
      ))}
    </View>
  );
}

export function ChatListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <View className="flex-1 bg-white">
      <View className="px-4 pt-4 pb-1">
        <Skeleton className="h-6 w-32" />
      </View>
      <View className="mx-4 my-3">
        <Skeleton className="h-9 w-full rounded-xl" />
      </View>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} className="flex-row items-center px-4 py-3.5">
          <Skeleton className="w-12 h-12 rounded-full" />
          <View className="flex-1 ml-3">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-3/4 mt-2" />
          </View>
        </View>
      ))}
    </View>
  );
}

export function ProfileSkeleton() {
  return (
    <View className="flex-1 bg-cream p-6">
      <View className="flex-row justify-end mb-8">
        <Skeleton className="h-10 w-24 rounded-full" />
      </View>

      <View className="bg-white rounded-[24px] px-6 pt-10 pb-8 items-center border border-primary-200">
        <Skeleton className="w-24 h-24 rounded-full" />
        <Skeleton className="h-6 w-40 mt-5" />
        <Skeleton className="h-4 w-56 mt-2" />
      </View>

      <View className="bg-white rounded-[24px] mt-6 overflow-hidden border border-primary-200">
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            className="flex-row items-center justify-between px-6 py-4 border-b border-primary-200 last:border-b-0"
          >
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
          </View>
        ))}
      </View>

      <View className="bg-white rounded-[24px] mt-6 overflow-hidden border border-primary-200">
        <View className="px-6 pt-6 pb-4">
          <Skeleton className="h-6 w-32" />
        </View>
        <Skeleton className="h-12 w-full rounded-none" />
        <Skeleton className="h-12 w-full rounded-none" />
        <Skeleton className="h-12 w-full rounded-none" />
      </View>
    </View>
  );
}

export function MapSkeleton() {
  return (
    <SafeAreaContainer>
      <View className="flex-row flex-wrap gap-2 mb-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-full" />
        ))}
      </View>
      <Skeleton className="flex-1 rounded-[24px]" />
    </SafeAreaContainer>
  );
}

function SafeAreaContainer({ children }: { children: React.ReactNode }) {
  return (
    <View className="flex-1 bg-cream p-5 pt-6">{children}</View>
  );
}
