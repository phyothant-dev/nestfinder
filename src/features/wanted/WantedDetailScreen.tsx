import { supabase } from "@/shared/lib/supabase";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Eye, EyeOff, Phone } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Linking, ScrollView, TouchableOpacity, View } from "react-native";
import Text from "@/shared/components/Text";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackButton } from "@/shared/components/BackButton";

export default function WantedDetailScreen() {
  const { i18n } = useTranslation();
  const isBurmese = i18n.language === "mm" || i18n.language?.startsWith("my");
  const { id } = useLocalSearchParams<{ id: string }>();

  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [phoneRevealed, setPhoneRevealed] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from("wanted_listings")
          .select(
            "*, profiles(full_name, phone), states_regions(name_en, name_mm), townships(name_en, name_mm)",
          )
          .eq("id", id)
          .single();
        setListing(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      supabase.rpc("increment_wanted_listing_views", { listing_view_id: id })
        .then(({ error }) => {
          if (error) console.error("View increment error:", error);
        });
    }, [id])
  );

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-cream items-center justify-center">
        <ActivityIndicator size="large" color="#134686" />
      </SafeAreaView>
    );
  }

  if (!listing) {
    return (
      <SafeAreaView className="flex-1 bg-cream items-center justify-center">
        <Text className="text-gray-500 font-rubik">
          {isBurmese ? "ကြော်ငြာမတွေ့ပါ" : "Listing not found"}
        </Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4">
          <Text className="text-primary-300 font-rubik-medium">
            {isBurmese ? "နောက်သို့ပြန်သွားရန်" : "Go back"}
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const region = listing.states_regions
    ? isBurmese ? listing.states_regions.name_mm : listing.states_regions.name_en
    : null;
  const township = listing.townships
    ? isBurmese ? listing.townships.name_mm : listing.townships.name_en
    : null;

  const propertyTypeLabel = listing.property_type
    ? listing.property_type.charAt(0).toUpperCase() + listing.property_type.slice(1)
    : null;

  const floorLabel = listing.floor
    ? listing.floor === "ground"
      ? isBurmese ? "မြေညီ" : "Ground Floor"
      : listing.floor === "ground_attic"
        ? isBurmese ? "မြေညီ + attic" : "Ground + Attic"
        : listing.floor === "low"
          ? isBurmese ? "အောက်ခြေ (၁-၄)" : "Low Floor (1-4)"
          : listing.floor === "mid"
            ? isBurmese ? "အလယ် (၅-၈)" : "Mid Floor (5-8)"
            : listing.floor === "high"
              ? isBurmese ? "အထက် (၉+)" : "High Floor (9+)"
              : /^\d+$/.test(listing.floor)
                ? isBurmese ? `${listing.floor} လွှာ` : `${listing.floor}th Floor`
                : listing.floor
    : null;

  const furnishedLabel = listing.furnished_status
    ? listing.furnished_status === "not_furnished"
      ? isBurmese ? "မပါဝင်" : "Not Furnished"
      : listing.furnished_status === "half_furnished"
        ? isBurmese ? "တစ်ဝက်ပါဝင်" : "Half Furnished"
        : isBurmese ? "အပြည့်ပါဝင်" : "Full Furnished"
    : null;

  const currencyLabel = listing.currency_unit === "usd" ? "USD" : (isBurmese ? "သိန်း" : "Lakhs");

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = d.getDate();
    const month = d.getMonth() + 1;
    const year = d.getFullYear();
    const hh = d.getHours().toString().padStart(2, "0");
    const mm = d.getMinutes().toString().padStart(2, "0");
    if (isBurmese) {
      return `${day}/${month}/${year} ${hh}:${mm}`;
    }
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${months[month - 1]} ${day}, ${year} ${hh}:${mm}`;
  };

  const specRows = [
    propertyTypeLabel && { label: isBurmese ? "အမျိုးအစား" : "Category", value: propertyTypeLabel },
    floorLabel && { label: isBurmese ? "အလွှာ" : "Floor", value: floorLabel },
    region && { label: isBurmese ? "တိုင်းဒေသကြီး" : "State | Division", value: region },
    township && { label: isBurmese ? "မြို့နယ်" : "Township", value: township },
    (listing.budget_min || listing.budget_max) && {
      label: isBurmese ? "ငှားရမ်းခ နှုန်းထား" : "Monthly Fee",
      value: listing.budget_min && listing.budget_max
        ? `${listing.budget_min.toLocaleString()} - ${listing.budget_max.toLocaleString()} ${currencyLabel}`
        : listing.budget_min
          ? `${listing.budget_min.toLocaleString()}+ ${currencyLabel}`
          : `${isBurmese ? "အမြင့်ဆုံး" : "Up to"} ${listing.budget_max.toLocaleString()} ${currencyLabel}`,
      accent: true,
    },
    furnishedLabel && { label: isBurmese ? "ဖာနီးရှားပါဝင်မှု" : "Furnished", value: furnishedLabel },
    listing.bedrooms != null && listing.bedrooms > 0 && { label: isBurmese ? "အိပ်ခန်း" : "Bedroom", value: String(listing.bedrooms) },
    listing.bathrooms != null && listing.bathrooms > 0 && { label: isBurmese ? "ရေချိုးခန်း" : "Bathroom", value: String(listing.bathrooms) },
  ].filter(Boolean) as { label: string; value: string; accent?: boolean }[];

  const DESCRIPTION_TRUNCATE = 150;
  const isLongDesc = listing.description && listing.description.length > DESCRIPTION_TRUNCATE;

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <View className="px-5 pt-2 pb-3 border-b border-gray-200 bg-white flex-row items-center">
        <BackButton onPress={() => router.back()} />
        <Text className="text-lg font-rubik-bold text-gray-950 flex-1 ml-3">
          {isBurmese ? "ကြော်ငြာအသေးစိတ်" : "Listing Details"}
        </Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        <View className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-4">
          <View className="px-4 pt-4 pb-3">
            <Text className="text-amber text-xl font-rubik-bold">
              {listing.title}
            </Text>
          </View>
          <View className="bg-gray-50 px-4 py-3 flex-row items-center justify-between border-t border-gray-100">
            <Text className="text-gray-500 text-sm font-rubik">
              {isBurmese ? "စတင်ခဲ့သည်" : "Since"} {formatDate(listing.created_at)}
            </Text>
            <View className="flex-row items-center gap-1.5">
              <Eye size={14} color="#6B7280" />
              <Text className="text-gray-500 text-sm font-rubik-medium">
                {listing.views || 0} {isBurmese ? "ကြည့်ရှုမှု" : "Views"}
              </Text>
            </View>
          </View>
        </View>

        <View className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-4">
          {specRows.map((row, i) => (
            <View key={i}>
              <View className="flex-row justify-between items-center px-4 py-3.5 border-b border-gray-100">
                <Text className="text-gray-500 font-rubik-medium text-sm">
                  {row.label}
                </Text>
                <Text className={`font-rubik-semibold text-sm ${row.accent ? "text-primary-300 font-rubik-bold" : "text-amber"}`}>
                  {row.value}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {listing.contact_phone && (
          <View className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-4">
            <View className="px-4 py-3 border-b border-gray-100">
              <Text className="text-amber font-rubik-bold text-sm">
                {isBurmese ? "ဖုန်းနံပါတ်" : "Phone Number"}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                if (phoneRevealed) {
                  Linking.openURL(`tel:${listing.contact_phone}`);
                } else {
                  setPhoneRevealed(true);
                }
              }}
              className="flex-row items-center gap-3 px-4 py-4"
              activeOpacity={0.7}
            >
              <View className="w-10 h-10 rounded-full bg-cream items-center justify-center">
                <Phone size={18} color="#134686" />
              </View>
              <View className="flex-1">
                {phoneRevealed ? (
                  <Text className="text-primary-300 font-rubik-extrabold text-xl">
                    {listing.contact_phone}
                  </Text>
                ) : (
                  <Text className="text-gray-700 font-rubik-semibold text-base">
                    {isBurmese ? "ဖုန်းနံပါတ်ကြည့်ရန်" : "Click to view phone number"}
                  </Text>
                )}
              </View>
              {phoneRevealed ? (
                <EyeOff size={20} color="#6B7280" />
              ) : (
                <Eye size={20} color="#134686" />
              )}
            </TouchableOpacity>
          </View>
        )}

        {listing.description && (
          <View className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-4">
            <View className="px-4 py-3 border-b border-gray-100">
              <Text className="text-amber font-rubik-bold text-sm">
                {isBurmese ? "အသေးစိတ်" : "Detail Description"}
              </Text>
            </View>
            <View className="px-4 py-4">
              <Text className="text-gray-600 font-rubik text-sm leading-6">
                {descExpanded || !isLongDesc
                  ? listing.description
                  : `${listing.description.slice(0, DESCRIPTION_TRUNCATE)}...`}
              </Text>
              {isLongDesc && (
                <TouchableOpacity onPress={() => setDescExpanded(!descExpanded)} className="mt-2">
                  <Text className="text-primary-300 font-rubik-semibold text-sm">
                    {descExpanded
                      ? isBurmese ? "ပိုနည်း" : "Read less"
                      : isBurmese ? "ပိုဖတ်ရန်" : "Read more"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}
