import { supabase } from "@/shared/lib/supabase";
import { router } from "expo-router";
import * as Location from "expo-location";
import { Locate, LocateFixed, X } from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { MapSkeleton } from "@/shared/components/Skeleton";
import {
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

interface Property {
  id: string;
  title_en: string | null;
  title_mm: string | null;
  price: number;
  currency_unit: string;
  deal_type: string;
  images: string[];
  latitude: number;
  longitude: number;
  distance?: number;
}

const haversineDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

function buildMapHtml(
  userLocation: { latitude: number; longitude: number } | null,
  properties: Property[],
) {
  const user =
    userLocation
      ? { lat: userLocation.latitude, lng: userLocation.longitude }
      : null;

  const markersJson = JSON.stringify(
    properties.map((p) => ({
      id: p.id,
      lat: p.latitude,
      lng: p.longitude,
      title: p.title_en || p.title_mm || "Property",
      price:
        p.currency_unit === "lakhs" ? `${p.price}L` : `$${p.price}`,
      img: p.images?.[0] || "",
      distance: p.distance?.toFixed(1) || "",
    })),
  );

  return `
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
    .leaflet-popup-content-wrapper{border-radius:12px;padding:4px}
    .leaflet-popup-content{margin:8px 12px;font-family:sans-serif}
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var userLoc = ${JSON.stringify(user)};
    var markers = ${markersJson};
    var map = L.map('map');

    if (userLoc) {
      map.setView([userLoc.lat, userLoc.lng], 13);
    } else if (markers.length > 0) {
      var bounds = markers.map(function(m) { return [m.lat, m.lng]; });
      map.fitBounds(bounds).fitBounds(bounds, {padding: [50, 50]});
    } else {
      map.setView([21.9162, 95.956], 5);
    }

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19
    }).addTo(map);

    if (userLoc) {
      L.circleMarker([userLoc.lat, userLoc.lng], {
        radius: 8,
        fillColor: '#4285F4',
        color: '#fff',
        weight: 2,
        fillOpacity: 1
      }).addTo(map);
    }

    markers.forEach(function(p) {
      var m = L.marker([p.lat, p.lng]).addTo(map);
      var popupHtml = '<div style="min-width:140px">' +
        (p.img ? '<img src="' + p.img + '" style="width:100%;height:80px;object-fit:cover;border-radius:8px;margin-bottom:6px"/>' : '') +
        '<b style="font-size:14px">' + p.title + '</b><br/>' +
        '<span style="color:#134686;font-weight:bold;font-size:16px">' + p.price + '</span>' +
        (p.distance ? '<br/><span style="color:#888;font-size:12px">' + p.distance + ' km away</span>' : '') +
        '</div>';
      m.bindPopup(popupHtml);
      m.on('click', function() {
        window.ReactNativeWebView.postMessage(JSON.stringify({type: 'select', id: p.id}));
      });
    });
  </script>
</body>
</html>`;
}

export default function MapTabScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(
    null,
  );
  const [htmlCache, setHtmlCache] = useState<string>("");
  const [ready, setReady] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");

  const categories = [
    { id: "all", label: t("categories.all") },
    { id: "for rent", label: t("categories.for rent") },
    { id: "for sale", label: t("categories.for sale") },
    { id: "apartment", label: t("categories.apartment") },
    { id: "condo", label: t("categories.condo") },
    { id: "hostel", label: t("categories.hostel") },
  ];

  const centerOnUser = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return;

    const loc = await Location.getCurrentPositionAsync({});
    const { latitude, longitude } = loc.coords;
    setUserLocation({ latitude, longitude });
    return { latitude, longitude };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const timeout = setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 15000);

    const loadProperties = async (loc: { latitude: number; longitude: number } | null) => {
        let query = supabase
          .from("properties")
          .select(
            "id, title_en, title_mm, price, currency_unit, deal_type, images, latitude, longitude",
          )
          .eq("is_flagged", false)
          .not("latitude", "is", null)
          .not("longitude", "is", null)
          .or("is_sold.is.null,is_sold.eq.false");

        if (activeCategory === "for rent") {
          query = query.eq("deal_type", "rent");
        } else if (activeCategory === "for sale") {
          query = query.eq("deal_type", "sale");
        } else if (activeCategory !== "all") {
          query = query.eq("property_type", activeCategory);
        }

        const { data } = await query;

        if (cancelled) return;

        let mapped = (data || []) as Property[];

        if (loc) {
          mapped = mapped
            .map((p) => ({
              ...p,
              distance: haversineDistance(
                loc.latitude,
                loc.longitude,
                p.latitude,
                p.longitude,
              ),
            }))
            .sort((a, b) => (a.distance || 0) - (b.distance || 0));
        }

        setProperties(mapped);
        const html = buildMapHtml(loc, mapped);
        setHtmlCache(html);
        setReady(true);
      };

      const init = async () => {
        try {
          const loc = userLocation ?? (await centerOnUser()) ?? null;
          if (loc) setUserLocation(loc);
          await loadProperties(loc);
        } catch (err) {
          console.error("Map init error:", err);
          await loadProperties(null);
        } finally {
          if (!cancelled) {
            setLoading(false);
            clearTimeout(timeout);
          }
        }
      };

      init();

      return () => {
        cancelled = true;
        clearTimeout(timeout);
      };
    }, [activeCategory]);

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "select") {
        const prop = properties.find((p) => p.id === data.id);
        if (prop) setSelectedProperty(prop);
      }
    } catch {}
  };

  if (loading && !ready) {
    return <MapSkeleton />;
  }

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
      <View className="flex-1">
        {htmlCache ? (
          <WebView
            ref={webViewRef}
            source={{ html: htmlCache }}
            style={{ flex: 1 }}
            javaScriptEnabled
            domStorageEnabled
            onMessage={handleMessage}
            originWhitelist={["*"]}
            onError={() => {}}
          />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Text className="text-black-200 font-rubik text-sm">Map unavailable</Text>
          </View>
        )}

        <View
          className="absolute left-4 right-4"
          style={{ bottom: 70 + insets.bottom + 12 }}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-2"
          >
            {categories.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setActiveCategory(cat.id)}
                  className={`px-5 py-2.5 rounded-full shadow-lg ${isActive ? "bg-primary-300" : "bg-white/90"}`}
                >
                  <Text
                    className={`text-sm font-rubik-medium ${isActive ? "text-white" : "text-black-200"}`}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <TouchableOpacity
          onPress={() => {
            const loc = userLocation;
            if (loc && webViewRef.current) {
              webViewRef.current.injectJavaScript(
                `map.flyTo([${loc.latitude}, ${loc.longitude}], 13, {duration: 0.5}); true;`,
              );
            } else {
              centerOnUser();
            }
          }}
          className="absolute top-4 right-4 bg-white rounded-full p-3 shadow-lg border border-primary-200"
          activeOpacity={0.7}
        >
          {userLocation ? (
            <LocateFixed size={22} color="#134686" />
          ) : (
            <Locate size={22} color="#8C8E98" />
          )}
        </TouchableOpacity>

        {selectedProperty && (
          <View
            className="absolute left-4 right-4 bg-white rounded-2xl shadow-lg border border-primary-200 p-4"
            style={{ bottom: 70 + insets.bottom + 68 }}
          >
            <TouchableOpacity
              onPress={() => setSelectedProperty(null)}
              className="absolute -top-3 -right-3 w-7 h-7 bg-white rounded-full items-center justify-center shadow-md border border-gray-200 z-10"
            >
              <X size={14} color="#666876" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push(`/property/${selectedProperty.id}`)}
              className="flex-row"
            >
              {selectedProperty.images?.[0] && (
                <Image
                  source={{ uri: selectedProperty.images[0] }}
                  className="w-20 h-20 rounded-xl"
                  resizeMode="cover"
                />
              )}
              <View className="flex-1 ml-3 justify-center">
                <Text
                  className="text-black-300 font-rubik-bold text-base"
                  numberOfLines={1}
                >
                  {selectedProperty.title_en || selectedProperty.title_mm}
                </Text>
                <Text className="text-primary-300 font-rubik-bold text-lg mt-1">
                  {selectedProperty.currency_unit === "lakhs"
                    ? `${selectedProperty.price} Lakhs`
                    : `$${selectedProperty.price}`}
                </Text>
                <Text className="text-black-100 text-xs font-rubik mt-1">
                  {selectedProperty.distance !== undefined
                    ? `${selectedProperty.distance.toFixed(1)} km away`
                    : ""}
                </Text>
                <Text className="text-black-100 text-xs font-rubik uppercase mt-0.5">
                  {selectedProperty.deal_type}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
