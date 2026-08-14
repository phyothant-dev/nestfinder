import { router } from "expo-router";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, Switch, View } from "react-native";
import Text from "@/shared/components/Text";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackButton } from "@/shared/components/BackButton";

export default function NotificationSettingsScreen() {
  const { t } = useTranslation();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [smsEnabled, setSmsEnabled] = useState(false);

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <View className="px-4 py-4 flex-row items-center bg-white border-b border-slate-100">
        <BackButton onPress={() => router.back()} />
        <Text className="text-lg font-bold text-slate-800 ml-4">{t("settings.notifications")}</Text>
      </View>
      <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
        <View className="bg-white rounded-2xl overflow-hidden border border-slate-100 mt-6">
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-slate-100">
            <View>
              <Text className="text-slate-700 font-semibold">{t("settings.pushNotifications")}</Text>
              <Text className="text-slate-400 text-xs mt-0.5">{t("settings.pushDescription")}</Text>
            </View>
            <Switch value={pushEnabled} onValueChange={setPushEnabled} trackColor={{ false: "#d1d5db", true: "#134686" }} thumbColor="#fff" />
          </View>
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-slate-100">
            <View>
              <Text className="text-slate-700 font-semibold">{t("settings.emailNotifications")}</Text>
              <Text className="text-slate-400 text-xs mt-0.5">{t("settings.emailDescription")}</Text>
            </View>
            <Switch value={emailEnabled} onValueChange={setEmailEnabled} trackColor={{ false: "#d1d5db", true: "#134686" }} thumbColor="#fff" />
          </View>
          <View className="flex-row items-center justify-between px-5 py-4">
            <View>
              <Text className="text-slate-700 font-semibold">{t("settings.smsNotifications")}</Text>
              <Text className="text-slate-400 text-xs mt-0.5">{t("settings.smsDescription")}</Text>
            </View>
            <Switch value={smsEnabled} onValueChange={setSmsEnabled} trackColor={{ false: "#d1d5db", true: "#134686" }} thumbColor="#fff" />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
