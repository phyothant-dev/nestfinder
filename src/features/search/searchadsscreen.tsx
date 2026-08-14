import { supabase } from "@/shared/lib/supabase";
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface Property {
  id: string;
  title_en: string;
  title_mm: string;
  price: number;
  currency_unit: string;
  deal_type: string;
  images: string[];
  ad_number: number;
  phone: string;
  search_value: string;
}

export default function AdsSearchForm() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const isBurmese = i18n.language === "mm" || i18n.language?.startsWith("my");

  const toMyanmarNum = (n: number) =>
    n.toString().replace(/\d/g, (d) => "၀၁၂၃၄၅၆၇၈၉"[parseInt(d)]);

  const [adsSearchMethod, setAdsSearchMethod] = useState("id");
  const [searchValue, setSearchValue] = useState("");

  const [results, setResults] = useState<Property[] | null>(null);
  const [searching, setSearching] = useState(false);

  const handleAdsSearchSubmit = async () => {
    if (!searchValue.trim()) return;
    setSearching(true);
    setResults(null);
    try {
      let query = supabase.from("properties").select("*").eq("is_flagged", false).order("created_at", { ascending: false });

      if (adsSearchMethod === "id") {
        const raw = searchValue.replace(/[^0-9]/g, "");
        const num = parseInt(raw);
        if (!isNaN(num)) {
          const storedNum = num > 10000 ? num - 10000 : num;
          query = query.eq("ad_number", storedNum);
        } else return;
      } else {
        query = query.ilike("search_value", `%${searchValue}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setResults(data || []);
    } catch (err) {
      console.error("Ads search error:", err);
    } finally {
      setSearching(false);
    }
  };

  const handleBackToForm = () => {
    setResults(null);
    setSearchValue("");
  };

  if (results !== null) {
    return (
      <View className="flex-1">
        <TouchableOpacity onPress={handleBackToForm} className="flex-row items-center gap-2 mb-4">
          <ChevronLeft size={22} color="#134686" />
          <Text className="text-primary-300 font-rubik-bold">{t("adsFilter.backToSearch")}</Text>
        </TouchableOpacity>
        <Text className="text-black-300 font-rubik-bold text-lg mb-3">
          {t("adsFilter.resultsFound", { num: isBurmese ? toMyanmarNum(results.length) : results.length })}
        </Text>
        {results.length === 0 ? (
          <View className="py-12 items-center">
            <Text className="text-black-100 font-rubik">{t("adsFilter.noResults")}</Text>
          </View>
        ) : (
          <View style={{ gap: 12, paddingBottom: 24 }}>
            {results.map((item) => {
              const title = isBurmese && item.title_mm ? item.title_mm : item.title_en;
              const price = item.currency_unit === "lakhs" ? `${item.price} Lakhs` : `$${item.price}`;
              const image = item.images?.[0];
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => router.push(`/detail?id=${item.id}` as any)}
                  className="bg-white rounded-2xl overflow-hidden border border-primary-200"
                >
                  {image && (
                    <Image source={{ uri: image }} className="w-full h-40" resizeMode="cover" />
                  )}
                  <View className="p-4">
                    <Text className="text-black-300 font-rubik-bold text-base" numberOfLines={1}>{title}</Text>
                    <Text className="text-primary-300 font-rubik-bold text-lg mt-1">{price}</Text>
                    <Text className="text-black-100 font-rubik text-xs mt-1">Ad #{item.ad_number}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    );
  }

  return (
    <View className="gap-5">
      <View className="flex-row gap-6 items-center py-1">
        <TouchableOpacity onPress={() => { setAdsSearchMethod("id"); setSearchValue(""); }} className="flex-row items-center gap-2">
          <View className={`w-5 h-5 rounded-full border-2 items-center justify-center ${adsSearchMethod === "id" ? "border-primary-300" : "border-primary-200"}`}>
            {adsSearchMethod === "id" && <View className="w-2.5 h-2.5 bg-primary-300 rounded-full" />}
          </View>
          <Text className="text-black-300 font-rubik-bold text-sm">{t("adsFilter.byIdNumber")}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { setAdsSearchMethod("phone"); setSearchValue(""); }} className="flex-row items-center gap-2">
          <View className={`w-5 h-5 rounded-full border-2 items-center justify-center ${adsSearchMethod === "phone" ? "border-primary-300" : "border-primary-200"}`}>
            {adsSearchMethod === "phone" && <View className="w-2.5 h-2.5 bg-primary-300 rounded-full" />}
          </View>
          <Text className="text-black-300 font-rubik-bold text-sm">{t("adsFilter.byPhoneNumber")}</Text>
        </TouchableOpacity>
      </View>

      <View className="bg-white border border-primary-200 rounded-xl px-4 py-3.5">
        <TextInput
          value={searchValue}
          onChangeText={setSearchValue}
          placeholder={adsSearchMethod === "id" ? t("adsFilter.placeholder") : t("adsFilter.phonePlaceholder")}
          keyboardType={adsSearchMethod === "id" ? "numeric" : "default"}
          className="w-full text-black-300 font-rubik-medium text-base text-left"
          placeholderTextColor="#8C8E98"
        />
      </View>

      <TouchableOpacity
        onPress={handleAdsSearchSubmit}
        disabled={searching || !searchValue.trim()}
        className="bg-primary-300 w-full py-4 rounded-xl items-center justify-center mt-2"
      >
        {searching ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text className="text-white font-rubik-bold text-lg">{t("adsFilter.searchButton")}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
