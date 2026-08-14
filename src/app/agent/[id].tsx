import { useLocalSearchParams } from "expo-router";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";

import AgentScreen from "@/features/agent/AgentScreen";

export default function AgentRoute() {
  const { id, propertyId, phone } = useLocalSearchParams<{ id: string; propertyId?: string; phone?: string }>();

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
      <AgentScreen agentId={id!} propertyId={propertyId} phone={phone} />
    </SafeAreaView>
  );
}
