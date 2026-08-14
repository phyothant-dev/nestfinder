import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";

import Details from "@/features/property/details";

export default function PropertyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <Details propertyId={id!} onBack={() => router.back()} />
    </SafeAreaView>
  );
}
