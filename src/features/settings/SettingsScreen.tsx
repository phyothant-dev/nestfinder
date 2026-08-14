import { router } from "expo-router";
import { ChevronRight, Bell, User } from "lucide-react-native";
import React from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, TouchableOpacity, View } from "react-native";
import Text from "@/shared/components/Text";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackButton } from "@/shared/components/BackButton";

export default function SettingsScreen() {
  const { t } = useTranslation();

  const rows = [
    { icon: <User size={20} color="#64748b" />, label: t("settings.account"), route: "/settings/account" },
    { icon: <Bell size={20} color="#64748b" />, label: t("settings.notifications"), route: "/settings/notifications" },
  ];

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <View className="bg-white px-4 py-4 flex-row items-center border-b border-primary-200">
        <BackButton onPress={() => router.back()} />
        <Text className="text-black-300 text-lg font-rubik-bold ml-2 flex-1 text-center mr-10">{t("settings.title")}</Text>
      </View>
      <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
        {/* Menu items */}
        <View className="bg-white rounded-2xl overflow-hidden border border-slate-100 mt-6">
          {rows.map((row, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => router.push(row.route as any)}
              className="flex-row items-center justify-between px-5 py-4 border-b border-slate-100 active:bg-slate-50"
            >
              <View className="flex-row items-center">
                <View className="w-9 h-9 bg-slate-50 rounded-xl items-center justify-center mr-3">
                  {row.icon}
                </View>
                <Text className="text-slate-700 font-semibold">{row.label}</Text>
              </View>
              <ChevronRight size={18} color="#cbd5e1" />
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
