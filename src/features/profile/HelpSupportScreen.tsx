import { router } from "expo-router";
import {
  BookOpen,
  Building,
  FileText,
  Headphones,
  MessageCircle,
  Phone,
  PlusCircle,
  Save,
  Search,
} from "lucide-react-native";
import React from "react";
import { useTranslation } from "react-i18next";
import { Linking, ScrollView, TouchableOpacity, View } from "react-native";
import Text from "@/shared/components/Text";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackButton } from "@/shared/components/BackButton";

const GREEN = "#134686";

export default function HelpSupportScreen() {
  const { t } = useTranslation();

  const steps = [
    {
      icon: <Building size={20} color={GREEN} />,
      title: t("help.step1"),
      desc: t("help.step1Desc"),
    },
    {
      icon: <Search size={20} color={GREEN} />,
      title: t("help.step2"),
      desc: t("help.step2Desc"),
    },
    {
      icon: <BookOpen size={20} color={GREEN} />,
      title: t("help.step3"),
      desc: t("help.step3Desc"),
    },
    {
      icon: <Save size={20} color={GREEN} />,
      title: t("help.step4"),
      desc: t("help.step4Desc"),
    },
    {
      icon: <Phone size={20} color={GREEN} />,
      title: t("help.step5"),
      desc: t("help.step5Desc"),
    },
    {
      icon: <PlusCircle size={20} color={GREEN} />,
      title: t("help.step6"),
      desc: t("help.step6Desc"),
    },
    {
      icon: <FileText size={20} color={GREEN} />,
      title: t("help.step7"),
      desc: t("help.step7Desc"),
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <View className="px-4 py-4 flex-row items-center bg-white border-b border-slate-100">
        <BackButton onPress={() => router.back()} />
        <Text className="text-lg font-bold text-slate-800 ml-4">
          {t("help.title")}
        </Text>
      </View>

      <ScrollView
        className="flex-1 px-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View className="mt-6 bg-white rounded-2xl overflow-hidden border border-slate-100">
          <View className="px-5 py-4 flex-row items-center gap-3 border-b border-slate-100">
            <View className="w-10 h-10 bg-primary-100 rounded-xl items-center justify-center">
              <BookOpen size={20} color={GREEN} />
            </View>
            <View className="flex-1">
              <Text className="text-slate-800 font-bold">
                {t("help.howToUseTitle")}
              </Text>
              <Text className="text-slate-500 text-xs mt-0.5">
                {t("help.howToUseIntro")}
              </Text>
            </View>
          </View>

          {steps.map((step, i) => (
            <View
              key={i}
              className="flex-row px-5 py-4 border-b border-slate-100 last:border-b-0"
            >
              <View className="w-9 h-9 bg-primary-100 rounded-xl items-center justify-center">
                {step.icon}
              </View>
              <View className="flex-1 ml-3">
                <Text className="text-slate-800 font-semibold">
                  <Text className="text-primary-300">{i + 1}. </Text>
                  {step.title}
                </Text>
                <Text className="text-slate-500 text-sm mt-1 leading-5">
                  {step.desc}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View className="mt-6 bg-white rounded-2xl overflow-hidden border border-slate-100">
          <View className="px-5 py-4 flex-row items-center gap-3">
            <View className="w-10 h-10 bg-primary-100 rounded-xl items-center justify-center">
              <Headphones size={20} color={GREEN} />
            </View>
            <View className="flex-1">
              <Text className="text-slate-800 font-bold">
                {t("help.contactSupport")}
              </Text>
              <Text className="text-slate-500 text-xs mt-0.5">
                {t("help.contactSupportDesc")}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => Linking.openURL(`mailto:${t("help.email")}`)}
            className="flex-row items-center justify-center gap-2 py-4 border-t border-slate-100"
          >
            <MessageCircle size={16} color={GREEN} />
            <Text className="text-primary-300 font-semibold">{t("help.email")}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
