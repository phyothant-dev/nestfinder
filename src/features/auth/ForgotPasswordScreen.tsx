import { supabase } from "@/shared/lib/supabase";
import { router } from "expo-router";
import { Mail } from "lucide-react-native";
import * as Linking from "expo-linking";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator, ScrollView, TextInput, TouchableOpacity, View } from "react-native";
import Text from "@/shared/components/Text";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackButton } from "@/shared/components/BackButton";

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSend = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError("");

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: Linking.createURL("reset-password"),
    });

    setLoading(false);
    if (resetError) {
      setError(resetError.message);
    } else {
      setSent(true);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <View className="px-4 py-4">
        <BackButton onPress={() => router.back()} />
      </View>
      <ScrollView
        className="flex-1 px-6"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="mt-4 mb-8">
          <Text className="text-3xl font-rubik-extrabold text-black-300">
            {t("forgotPassword.title")}
          </Text>
          <Text className="text-black-100 font-rubik mt-2 text-sm">
            {t("forgotPassword.subtitle")}
          </Text>
        </View>

        {sent ? (
          <View className="bg-primary-100 border border-primary-200 rounded-2xl p-6 items-center">
            <Text className="text-primary-300 font-rubik-bold text-lg text-center">
              {t("forgotPassword.checkEmail")}
            </Text>
            <Text className="text-primary-300 font-rubik mt-2 text-center">
              {t("forgotPassword.sentMessage", { email })}
            </Text>
          </View>
        ) : (
          <View>
            <Text className="text-black-200 font-rubik-semibold mb-2 text-sm">
              {t("forgotPassword.email")}
            </Text>
            <View className="flex-row items-center bg-white border border-primary-200 rounded-xl px-4 py-3">
              <Mail size={20} color="#8C8E98" />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder={t("forgotPassword.emailPlaceholder")}
                keyboardType="email-address"
                autoCapitalize="none"
                className="flex-1 ml-3 font-rubik text-black-300"
              />
            </View>
            {error ? (
              <Text className="text-danger text-sm mt-2 font-rubik">{error}</Text>
            ) : null}
            <TouchableOpacity
              onPress={handleSend}
              disabled={loading}
              className="bg-primary-300 py-4 rounded-xl items-center mt-8"
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-rubik-bold">
                  {t("forgotPassword.sendResetLink")}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          onPress={() => router.push("/(auth)/login")}
          className="items-center mt-6"
        >
          <Text className="text-primary-300 font-rubik-bold">
            {t("forgotPassword.backToLogin")}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
