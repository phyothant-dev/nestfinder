import { WifiOff } from "lucide-react-native";
import React from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNetworkStore } from "@/shared/store/useNetworkStore";

export default function OfflineOverlay() {
  const isConnected = useNetworkStore((s) => s.isConnected);
  const isInternetReachable = useNetworkStore((s) => s.isInternetReachable);
  const insets = useSafeAreaInsets();

  const isOffline = !isConnected || isInternetReachable === false;

  if (!isOffline) return null;

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        backgroundColor: "#ED3F27",
        paddingTop: insets.top + 4,
        paddingBottom: 10,
        paddingHorizontal: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
      }}
    >
      <WifiOff size={16} color="#ffffff" />
      <Text
        style={{
          color: "#ffffff",
          fontSize: 13,
          fontWeight: "600",
        }}
      >
        No Internet Connection
      </Text>
    </View>
  );
}
