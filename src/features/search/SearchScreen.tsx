import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Animated, Dimensions, ScrollView, TouchableOpacity, View } from "react-native";
import Text from "@/shared/components/Text";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackButton } from "@/shared/components/BackButton";


import AdsSearchForm from "@/features/search/searchadsscreen";
import PropertySearchForm from "@/features/search/searchpropertyscreen";

const SCREEN_PADDING = 24;
const TRACK_PADDING = 4;
const SEGMENT_WIDTH =
  (Dimensions.get("window").width - SCREEN_PADDING * 2 - TRACK_PADDING * 2) / 2;

export default function SearchScreen() {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState("properties");
  const slideValue = useRef(new Animated.Value(0)).current;

  const searchcategories = [
    { id: "properties", label: t("searchcategories.search properties") },
    { id: "ads", label: t("searchcategories.search by ads number") },
  ];

  const handleToggle = (id: string, index: number) => {
    setActiveCategory(id);
    Animated.timing(slideValue, {
      toValue: index * SEGMENT_WIDTH,
      duration: 230,
      useNativeDriver: true,
    }).start();
  };

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <StatusBar style="dark" />
      <View className="bg-white px-4 py-4 flex-row items-center border-b border-primary-200">
        <BackButton onPress={() => router.back()} />
        <Text className="text-black-300 text-lg font-rubik-bold ml-2 flex-1 text-center mr-10">
          {t("findyourDreamProperty", {
            defaultValue: "သင့်အိမ်မက်ကို ရှာဖွေပါ",
          })}
        </Text>
      </View>
      <View className="bg-white border-b border-primary-200 pt-2">
        <View className="px-6 mb-4">
          <View className="flex-row w-full bg-primary-100 p-1 rounded-full relative">
            <Animated.View
              style={{
                width: SEGMENT_WIDTH,
                transform: [{ translateX: slideValue }],
              }}
              className="absolute top-1 bottom-1 left-1 bg-white rounded-full shadow-sm"
            />

            {searchcategories.map((cat, index) => {
              const isActive = activeCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => handleToggle(cat.id, index)}
                  activeOpacity={0.8}
                  className="flex-1 py-3 rounded-full items-center justify-center z-10"
                >
                  <Text
                    className={`font-rubik-bold text-sm text-center duration-150 ${
                      isActive ? "text-black-300" : "text-black-100"
                    }`}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        className="flex-1 mt-4"
      >
        <View className="px-6">
          {activeCategory === "properties" ? (
            <PropertySearchForm />
          ) : (
            <AdsSearchForm />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
