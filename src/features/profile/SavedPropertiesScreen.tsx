import { supabase } from "@/shared/lib/supabase";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Heart } from "lucide-react-native";
import React, { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlashList } from "@shopify/flash-list";
import { PropertyListSkeleton, Skeleton } from "@/shared/components/Skeleton";
import {
  ActivityIndicator, DeviceEventEmitter, Image, TouchableOpacity, View } from "react-native";
import Text from "@/shared/components/Text";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackButton } from "@/shared/components/BackButton";


interface SavedProperty {
  saved_id: string;
  id: string;
  title_en: string;
  title_mm: string;
  price: number;
  currency_unit: string;
  deal_type: string;
  property_type: string;
  images: string[];
  ad_number: number;
  created_at: string;
  states_regions?: { name_en: string; name_mm: string } | null;
  townships?: { name_en: string; name_mm: string } | null;
}

export default function SavedPropertiesScreen() {
  const { t } = useTranslation();
  const [properties, setProperties] = useState<SavedProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [unsaving, setUnsaving] = useState<string | null>(null);

  const fetchSaved = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      router.replace("/(auth)/login");
      return;
    }
    const { data } = await supabase
      .from("saved_properties")
      .select("id, property_id, created_at, properties(*, views, states_regions(name_en, name_mm), townships(name_en, name_mm))")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    const mapped =
      data?.map((item: any) => ({
        saved_id: item.id,
        ...item.properties,
      })) || [];
    setProperties(mapped);
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { fetchSaved(); }, []));

  const handleUnsave = async (savedId: string) => {
    setUnsaving(savedId);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) { setUnsaving(null); return; }
    const { error } = await supabase
      .from("saved_properties")
      .delete()
      .eq("id", savedId)
      .eq("user_id", user.id);
    if (!error) {
      setProperties((prev) => prev.filter((p) => p.saved_id !== savedId));
      DeviceEventEmitter.emit("savedPropertiesChanged");
    }
    setUnsaving(null);
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-cream">
        <View className="flex-row items-center px-4 py-3 bg-white border-b border-primary-200">
          <Skeleton className="w-10 h-10 rounded-full" />
          <Skeleton className="h-6 w-36 mx-auto" />
        </View>
        <PropertyListSkeleton count={3} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <StatusBar style="dark" />
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-primary-200">
        <BackButton onPress={() => router.back()} />
        <Text className="flex-1 text-lg font-rubik-bold text-black-300 text-center mr-10">
          {t("profile.savedProperties")}
        </Text>
      </View>

      {properties.length === 0 ? (
        <View className="flex-1 items-center justify-center p-6">
          <Heart size={48} color="#C6D9F2" />
          <Text className="text-black-100 text-lg font-rubik-bold mt-4">
            {t("profile.noSavedProperties") || "No saved properties yet"}
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)")}
            className="mt-4 bg-primary-300 px-6 py-3 rounded-full"
          >
            <Text className="text-white font-rubik-bold">
              {t("profile.browseProperties") || "Browse Properties"}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlashList
          data={properties}
          keyExtractor={(item) => item.saved_id}
          contentContainerStyle={{ padding: 12, gap: 12 }}
          renderItem={({ item }) => {
            const price =
              item.currency_unit === "lakhs"
                ? `${item.price} Lakhs`
                  : item.currency_unit === "kyats"
                    ? `${item.price.toLocaleString()} ကျပ်`
                  : `$${item.price}`;
            const image = item.images?.[0];
            const regionName = item.states_regions
              ? item.states_regions.name_mm || item.states_regions.name_en
              : "";
            const townshipName = item.townships
              ? item.townships.name_mm || item.townships.name_en
              : "";
            return (
              <View className="bg-white rounded-2xl overflow-hidden border border-primary-200">
                <TouchableOpacity
                  onPress={() =>
                    router.push(`/detail?id=${item.id}` as any)
                  }
                >
                  {image && (
                    <Image
                      source={{ uri: image }}
                      className="w-full h-36"
                      resizeMode="cover"
                    />
                  )}
                  <View className="px-4 pt-3 pb-2 gap-1">
                    <Text className="text-black-100 text-xs font-rubik" numberOfLines={1}>
                      {regionName} | {townshipName}
                    </Text>
                    <View className="flex-row items-center gap-2">
                      <View className="bg-primary-100 px-2.5 py-0.5 rounded-full">
                        <Text className="text-primary-300 text-xs font-rubik-semibold capitalize">
                          {item.property_type || "Property"}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-primary-300 text-lg font-rubik-extrabold mt-1">
                      {price}
                    </Text>
                  </View>
                </TouchableOpacity>
                <View className="flex-row items-center justify-between px-4 py-2.5 border-t border-primary-100">
                  <View />
                  <View className="flex-row items-center gap-4">
                    <TouchableOpacity
                      onPress={() => handleUnsave(item.saved_id)}
                      disabled={unsaving === item.saved_id}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      {unsaving === item.saved_id ? (
                        <ActivityIndicator size="small" color="#ED3F27" />
                      ) : (
                        <Heart size={18} color="#ED3F27" fill="#ED3F27" />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
