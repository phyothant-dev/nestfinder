import { router } from "expo-router";
import { Eye, Lock, Shield, UserX } from "lucide-react-native";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, Switch, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackButton } from "@/shared/components/BackButton";

export default function PrivacySettingsScreen() {
  const { t } = useTranslation();
  const [showOnline, setShowOnline] = useState(true);
  const [showPhone, setShowPhone] = useState(true);
  const [profilePublic, setProfilePublic] = useState(true);

  const items = [
    { icon: <Eye size={20} color="#134686" />, label: t("settings.showOnlineStatus"), value: showOnline, set: setShowOnline },
    { icon: <Shield size={20} color="#134686" />, label: t("settings.showPhoneNumber"), value: showPhone, set: setShowPhone },
    { icon: <UserX size={20} color="#134686" />, label: t("settings.privateProfile"), value: !profilePublic, set: (v: boolean) => setProfilePublic(!v) },
  ];

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="px-4 py-4 flex-row items-center bg-white border-b border-slate-100">
        <BackButton onPress={() => router.back()} />
        <Text className="text-lg font-bold text-slate-800 ml-4">{t("settings.privacySecurity")}</Text>
      </View>
      <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
        <View className="bg-white rounded-2xl overflow-hidden border border-slate-100 mt-6">
          <View className="px-5 py-3 border-b border-slate-100">
            <Text className="text-slate-500 text-xs font-semibold uppercase tracking-wider">{t("settings.privacyControls")}</Text>
          </View>
          {items.map((item, i) => (
            <View
              key={i}
              className="flex-row items-center justify-between px-5 py-4 border-b border-slate-100 last:border-b-0"
            >
              <View className="flex-row items-center gap-3">
                <View className="w-9 h-9 bg-primary-100 rounded-xl items-center justify-center">
                  {item.icon}
                </View>
                <Text className="text-slate-700 font-semibold">{item.label}</Text>
              </View>
              <Switch value={item.value} onValueChange={item.set} trackColor={{ false: "#d1d5db", true: "#134686" }} thumbColor="#fff" />
            </View>
          ))}
        </View>

        <View className="bg-white rounded-2xl overflow-hidden border border-slate-100 mt-6">
          <View className="px-5 py-3 border-b border-slate-100">
            <Text className="text-slate-500 text-xs font-semibold uppercase tracking-wider">{t("settings.security")}</Text>
          </View>
          <TouchableOpacity className="flex-row items-center gap-3 px-5 py-4 active:bg-slate-50">
            <View className="w-9 h-9 bg-primary-100 rounded-xl items-center justify-center">
              <Lock size={20} color="#134686" />
            </View>
            <Text className="text-slate-700 font-semibold">{t("settings.changePassword")}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
