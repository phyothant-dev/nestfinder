import { handleAuthCallbackUrl, resetAuthCallbackLock } from "@/shared/lib/handleAuthCallback";
import { registerForPushNotifications, savePushToken } from "@/shared/lib/notifications";
import { supabase } from "@/shared/lib/supabase";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";

import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Eye, EyeOff, Lock, Mail } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator, BackHandler, Image, KeyboardAvoidingView, Platform, ScrollView, StatusBar, TextInput, TouchableOpacity, View } from "react-native";
import Text from "@/shared/components/Text";
import { SafeAreaView } from "react-native-safe-area-context";

const signInWithGoogle = async () => {
  const redirectUrl = Linking.createURL("auth/callback");

  resetAuthCallbackLock();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: redirectUrl,
      queryParams: {
        prompt: "select_account",
      },
    },
  });

  if (error) throw error;
  if (!data?.url) throw new Error("Failed to get OAuth URL. Is Google provider enabled in Supabase?");

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
  await WebBrowser.maybeCompleteAuthSession();

  if (result.type === "success") {
    await handleAuthCallbackUrl(result.url);
  }
};

export default function LoginScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [, setInfoDialog] = useState({
    visible: false,
    title: "",
    message: "",
    isSuccess: false,
  });

  useEffect(() => {
    if (params.logout === "success") {
      setInfoDialog({
        visible: true,
        title: "Logged Out",
        message: "You have been logged out successfully.",
        isSuccess: true,
      });
    }
  }, [params.logout]);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        router.replace("/(tabs)");
        return true;
      };
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );
      return () => subscription.remove();
    }, []),
  );

  const openInfo = (
    title: string,
    message: string,
    isSuccess: boolean = false,
  ) => {
    setInfoDialog({ visible: true, title, message, isSuccess });
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      openInfo(t("login.errorTitle"), t("login.enterEmailPassword"), false);
      return;
    }
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        openInfo(t("login.loginFailed"), error.message, false);
        return;
      }

      const token = await registerForPushNotifications();
      if (token) await savePushToken(token);

      router.replace("/(tabs)");
    } catch (err: any) {
      openInfo(t("login.errorTitle"), err.message, false);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      await signInWithGoogle();

      const token = await registerForPushNotifications();
      if (token) await savePushToken(token);
    } catch (err: any) {
      openInfo(t("login.errorTitle"), err.message, false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "padding"}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 20}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="px-6 py-8 flex-1 justify-center">
            <View className="items-center mb-5">
              <Image
                source={{
                  uri: "https://cdn-icons-png.flaticon.com/512/895/895448.png",
                }}
                className="w-20 h-20 mb-2"
                resizeMode="contain"
              />
              <Text className="text-2xl font-rubik-bold text-black-300 mt-2">
                {t("login.title")}
              </Text>
              <Text className="text-black-100 font-rubik mt-1 text-sm text-center">
                {t("login.subtitle")}
              </Text>
            </View>

            <View>
              <Text className="text-black-200 font-rubik-medium mb-1 text-sm">
                {t("login.email")}
              </Text>
              <View className="flex-row items-center bg-white border border-primary-200 rounded-xl px-4 py-3">
                <Mail size={18} color="#8C8E98" />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder={t("login.emailPlaceholder")}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor="#94a3b8"
                  className="flex-1 ml-3 font-rubik text-black-300"
                />
              </View>
              <Text className="text-black-200 font-rubik-medium mb-1 mt-3 text-sm">
                {t("login.password")}
              </Text>
              <View className="flex-row items-center bg-white border border-primary-200 rounded-xl px-4 py-3">
                <Lock size={18} color="#8C8E98" />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  textContentType="oneTimeCode"
                  autoComplete="off"
                  placeholder={t("login.passwordPlaceholder")}
                  placeholderTextColor="#94a3b8"
                  className="flex-1 ml-3 font-rubik text-black-300"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={18} color="#666876" /> : <Eye size={18} color="#666876" />}
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={() => router.push("/(auth)/forgot_password")} className="self-end mt-2">
                <Text className="text-primary-300 font-rubik-semibold text-sm">
                  {t("login.forgotPassword") || "Forgot Password?"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleLogin}
                disabled={loading}
                className="bg-primary-300 rounded-2xl py-3 items-center mt-5"
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white font-rubik-bold text-base">
                    {t("login.signIn")}
                  </Text>
                )}
              </TouchableOpacity>

              <View className="flex-row items-center my-4">
                <View className="flex-1 h-px bg-primary-200" />
                <Text className="mx-4 text-black-100 text-sm font-rubik">or</Text>
                <View className="flex-1 h-px bg-primary-200" />
              </View>

              <TouchableOpacity
                onPress={handleGoogleSignIn}
                disabled={loading}
                className="flex-row items-center justify-center bg-white border border-primary-200 rounded-2xl py-3 active:opacity-80"
              >
                <Image
                  source={{
                    uri: "https://cdn-icons-png.flaticon.com/512/2991/2991148.png",
                  }}
                  className="w-6 h-6 mr-3"
                  resizeMode="contain"
                />
                <Text className="text-black-300 font-rubik-semibold text-base">
                  {t("login.googleButton")}
                </Text>
              </TouchableOpacity>

            <View className="flex-row justify-center mt-4 pb-2">
                <Text className="text-black-100 font-rubik">{t("login.noAccount")} </Text>
                <TouchableOpacity onPress={() => router.push("/register")}>
                  <Text className="text-primary-300 font-rubik-bold">{t("login.register")}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
