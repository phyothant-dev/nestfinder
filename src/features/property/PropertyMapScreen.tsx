import { router, useLocalSearchParams } from "expo-router";
import { Navigation } from "lucide-react-native";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Linking, Platform, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackButton } from "@/shared/components/BackButton";
import { WebView } from "react-native-webview";

export default function MapScreen() {
  const { t } = useTranslation();
  const { latitude, longitude, title, address } = useLocalSearchParams<{
    latitude: string;
    longitude: string;
    title: string;
    address: string;
  }>();

  const [loading, setLoading] = useState(true);
  const lat = parseFloat(latitude || "0") || 21.9162;
  const lng = parseFloat(longitude || "0") || 95.956;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    *{margin:0;padding:0}
    html,body,#map{width:100%;height:100%}
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map').setView([${lat}, ${lng}], 15);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19
    }).addTo(map);
    L.marker([${lat}, ${lng}]).addTo(map);
  </script>
</body>
</html>`;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <View className="flex-row items-center px-4 py-3 border-b border-primary-200 bg-white">
        <BackButton onPress={() => router.back()} />
        <View className="flex-1 mx-3">
          <Text className="text-black-300 font-rubik-semibold text-sm" numberOfLines={1}>
            {title || t("mapScreen.propertyLocation")}
          </Text>
          <Text className="text-black-100 font-rubik text-xs" numberOfLines={1}>
            {address || ""}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() =>
            Linking.openURL(`https://www.google.com/maps?q=${lat},${lng}`)
          }
          className="flex-row items-center gap-1 bg-primary-100 px-3 py-2 rounded-full"
        >
          <Navigation size={14} color="#134686" />
          <Text className="text-primary-300 font-rubik-semibold text-xs">{t("mapScreen.googleMaps")}</Text>
        </TouchableOpacity>
      </View>

      <View className="flex-1 relative">
        {loading && (
          <View className="absolute inset-0 items-center justify-center bg-white z-10">
            <ActivityIndicator size="large" color="#134686" />
          </View>
        )}
        <WebView
          source={{ html }}
          style={{ flex: 1 }}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          onLoad={() => setLoading(false)}
          onError={() => setLoading(false)}
          onHttpError={() => setLoading(false)}
          scalesPageToFit={Platform.OS === "android"}
          originWhitelist={["*"]}
        />
      </View>
    </SafeAreaView>
  );
}
