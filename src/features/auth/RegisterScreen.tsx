import { handleAuthCallbackUrl, resetAuthCallbackLock } from "@/shared/lib/handleAuthCallback";
import { supabase } from "@/shared/lib/supabase";
import { router } from "expo-router";

import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Eye, EyeOff, Lock, Mail, User } from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator, Image, ScrollView, TextInput, TouchableOpacity, View } from "react-native";
import Text from "@/shared/components/Text";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackButton } from "@/shared/components/BackButton";

import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
} from "@/shared/components/alertdialog/alertdialog";

import { Button, ButtonText } from "@/shared/components/button/button";
import { Heading } from "@/shared/components/heading/heading";
import { useTranslation } from "react-i18next";

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

export default function RegisterScreen() {
  const { t } = useTranslation();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errorDialog, setErrorDialog] = useState({
    visible: false,
    title: "",
    message: "",
  });

  const [successDialog, setSuccessDialog] = useState(false);

  const openError = (title: string, message: string) => {
    setErrorDialog({ visible: true, title, message });
  };

  const handleRegister = async () => {
    try {
      if (!name || !email || !password || !confirmPassword) {
        openError(t("register.errors.error"), t("register.errors.fillAll"));
        return;
      }

      if (password !== confirmPassword) {
        openError(t("register.errors.error"), t("register.errors.passwordMismatch"));
        return;
      }

      setLoading(true);

      const { data: signUpData, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
        },
      });

      if (error) {
        openError(t("register.errors.invalid"), error.message);
        return;
      }

      if (signUpData.user) {
        const { error: profileError } = await supabase
          .from("profiles")
          .upsert({
            id: signUpData.user.id,
            full_name: name,
            email: email,
          });

        if (profileError) {
          openError(t("register.errors.invalid"), profileError.message);
          return;
        }
      }

      setSuccessDialog(true);

      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      openError(t("register.errors.error"), err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      await signInWithGoogle();
    } catch (err: any) {
      openError(t("register.errors.error"), err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <View className="px-4 pt-4 pb-1 flex-row items-center">
        <BackButton onPress={() => router.back()} />
      </View>

      <ScrollView
        className="flex-1 px-6"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View className="flex-1 justify-center">
          <View className="mb-3">
            <Text className="text-2xl font-rubik-extrabold text-black-300">
              {t("register.title")}
            </Text>
            <Text className="text-black-100 font-rubik mt-1 text-sm">
              {t("register.subtitle")}
            </Text>
          </View>

          <View className="mb-2">
            <Text className="text-black-200 font-rubik-medium mb-1 text-sm">
              {t("register.name")}
            </Text>
            <View className="flex-row items-center bg-white border border-primary-200 rounded-xl px-4 py-3">
              <User size={18} color="#8C8E98" />
              <TextInput
                value={name}
                onChangeText={setName}
                className="flex-1 ml-3 font-rubik text-black-300"
                placeholder={t("register.namePlaceholder")}
              />
            </View>
          </View>

          <View className="mb-2">
            <Text className="text-black-200 font-rubik-medium mb-1 text-sm">
              {t("register.email")}
            </Text>
            <View className="flex-row items-center bg-white border border-primary-200 rounded-xl px-4 py-3">
              <Mail size={18} color="#8C8E98" />
              <TextInput
                value={email}
                onChangeText={setEmail}
                className="flex-1 ml-3 font-rubik text-black-300"
                placeholder={t("register.emailPlaceholder")}
                autoCapitalize="none"
              />
            </View>
          </View>

          <View className="mb-2">
            <Text className="text-black-200 font-rubik-medium mb-1 text-sm">
              {t("register.password")}
            </Text>
            <View className="flex-row items-center bg-white border border-primary-200 rounded-xl px-4 py-3">
              <Lock size={18} color="#8C8E98" />
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                className="flex-1 ml-3 font-rubik text-black-300"
                placeholder={t("register.passwordPlaceholder")}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={18} color="#666876" /> : <Eye size={18} color="#666876" />}
              </TouchableOpacity>
            </View>
          </View>

          <View className="mb-2">
            <Text className="text-black-200 font-rubik-medium mb-1 text-sm">
              {t("register.confirmPassword")}
            </Text>
            <View className="flex-row items-center bg-white border border-primary-200 rounded-xl px-4 py-3">
              <Lock size={18} color="#8C8E98" />
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                className="flex-1 ml-3 font-rubik text-black-300"
                placeholder={t("register.passwordPlaceholder")}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                {showConfirmPassword ? <EyeOff size={18} color="#666876" /> : <Eye size={18} color="#666876" />}
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleRegister}
            disabled={loading}
            className="bg-primary-300 py-3 rounded-xl items-center mt-2"
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-rubik-bold text-base">{t("register.button")}</Text>
            )}
          </TouchableOpacity>

          <View className="flex-row items-center my-2">
            <View className="flex-1 h-px bg-primary-200" />
            <Text className="mx-3 text-black-100 text-sm font-rubik">or</Text>
            <View className="flex-1 h-px bg-primary-200" />
          </View>

          <TouchableOpacity
            onPress={handleGoogleSignIn}
            disabled={loading}
            className="flex-row items-center justify-center bg-white border border-primary-200 rounded-xl py-3 active:opacity-80"
          >
            <Image
              source={{
                uri: "https://cdn-icons-png.flaticon.com/512/2991/2991148.png",
              }}
              className="w-6 h-6 mr-3"
              resizeMode="contain"
            />
            <Text className="text-black-300 font-rubik-semibold text-base">
              {t("register.googleButton")}
            </Text>
          </TouchableOpacity>

          <View className="flex-row justify-center items-center mt-2 mb-1">
            <Text className="text-black-100 font-rubik">
              {t("register.haveAccount")}
            </Text>
            <TouchableOpacity onPress={() => router.replace("/(auth)/login")}>
              <Text className="text-primary-300 font-rubik-bold text-sm ml-1">
                {t("register.login")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <AlertDialog
        isOpen={successDialog}
        onClose={() => setSuccessDialog(false)}
      >
        <AlertDialogBackdrop />
        <AlertDialogContent className="p-6 rounded-3xl bg-white items-center">
          <AlertDialogHeader>
            <Heading>{t("register.successTitle")}</Heading>
          </AlertDialogHeader>
          <AlertDialogBody>
            <Text className="text-center text-black-200 font-rubik">
              {t("register.successMessage")}
            </Text>
          </AlertDialogBody>
          <AlertDialogFooter>
            <Button
              className="bg-primary-300 w-full"
              onPress={() => {
                setSuccessDialog(false);
                router.replace("/(auth)/login");
              }}
            >
              <ButtonText>{t("alerts_and_dialogs.button_confirm")}</ButtonText>
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        isOpen={errorDialog.visible}
        onClose={() => setErrorDialog((p) => ({ ...p, visible: false }))}
      >
        <AlertDialogBackdrop />
        <AlertDialogContent className="p-6 rounded-3xl bg-white items-center">
          <AlertDialogHeader>
            <Heading>{errorDialog.title}</Heading>
          </AlertDialogHeader>
          <AlertDialogBody>
            <Text className="text-center text-black-200 font-rubik">
              {errorDialog.message}
            </Text>
          </AlertDialogBody>
          <AlertDialogFooter>
            <Button
              className="bg-primary-300 w-full"
              onPress={() => setErrorDialog((p) => ({ ...p, visible: false }))}
            >
              <ButtonText>{t("alerts_and_dialogs.button_confirm")}</ButtonText>
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SafeAreaView>
  );
}
