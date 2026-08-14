import { supabase } from "@/shared/lib/supabase";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Camera, User } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator, Alert, DeviceEventEmitter, Image, ScrollView, TextInput, TouchableOpacity, View } from "react-native";
import Text from "@/shared/components/Text";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackButton } from "@/shared/components/BackButton";

export default function AccountSettingsScreen() {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<any>(null);
  const [avatarError, setAvatarError] = useState(false);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarCacheKey, setAvatarCacheKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [screenKey, setScreenKey] = useState(0);

  const loadProfile = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setProfile(data || user);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadProfile();
  }, [screenKey]);

  const startEditing = () => {
    setFullName(profile?.full_name || "");
    setAvatarUrl(profile?.avatar_url || null);
    setEditing(true);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setAvatarUrl(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!fullName.trim()) return;
    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert(t("common.error"), t("editProfile.notLoggedIn"));
        return;
      }

      let finalAvatarUrl = avatarUrl;

      if (avatarUrl && !avatarUrl.startsWith("http")) {
        const ext = avatarUrl.split(".").pop()?.toLowerCase() || "jpg";
        const mimeType = ext === "png" ? "image/png" : "image/jpeg";
        const filePath = `${user.id}/avatar_${Date.now()}.${ext}`;

        const formData = new FormData();
        formData.append("file", {
          uri: avatarUrl,
          type: mimeType,
          name: `avatar.${ext}`,
        } as any);

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, formData, {
            upsert: true,
          });

        if (uploadError) {
          Alert.alert(t("editProfile.uploadError"), uploadError.message);
          return;
        }

        const { data: urlData } = supabase.storage
          .from("avatars")
          .getPublicUrl(uploadData.path);
        finalAvatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      }

      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName.trim(), avatar_url: finalAvatarUrl })
        .eq("id", user.id);

      if (error) {
        Alert.alert(t("editProfile.saveError"), error.message);
        return;
      }

      setEditing(false);
      setAvatarCacheKey((k) => k + 1);
      setAvatarError(false);
      setLoading(true);
      setScreenKey((k) => k + 1);
      DeviceEventEmitter.emit("profileUpdated");
    } catch (err: any) {
      Alert.alert(t("common.error"), err?.message || t("editProfile.failedToSave"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <View className="px-4 py-4 flex-row items-center bg-white border-b border-slate-100">
        <BackButton onPress={() => router.back()} />
        <Text className="text-lg font-bold text-slate-800 ml-4">
          {editing ? t("editProfile.title") : t("settings.account")}
        </Text>
      </View>

      <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator size="large" color="#134686" className="mt-20" />
        ) : editing ? (
          <View className="pt-8">
            <TouchableOpacity
              onPress={pickImage}
              className="self-center mb-10 items-center"
            >
              <View className="w-28 h-28 rounded-full bg-primary-100 items-center justify-center overflow-hidden border-4 border-primary-200">
                {avatarUrl ? (
                  <Image
                    source={{ uri: avatarUrl }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                ) : (
                  <User size={44} color="#134686" />
                )}
              </View>
              <View className="flex-row items-center mt-3">
                <Camera size={16} color="#134686" />
                <Text className="text-primary-300 font-semibold text-sm ml-1.5">
                  {t("editProfile.changePhoto")}
                </Text>
              </View>
            </TouchableOpacity>

            <Text className="text-slate-500 text-xs font-bold mb-1.5 uppercase tracking-wider">
              {t("editProfile.username")}
            </Text>
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              placeholder={t("editProfile.namePlaceholder")}
              placeholderTextColor="#94a3b8"
              className="bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-slate-900 text-base mb-6"
            />

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setEditing(false)}
                className="flex-1 rounded-xl px-5 py-3 items-center justify-center border border-slate-200"
                activeOpacity={0.7}
              >
                <Text className="text-slate-600 font-semibold text-sm">
                  {t("editProfile.cancel")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving || !fullName.trim()}
                className={`flex-1 rounded-xl px-5 py-3 items-center justify-center ${
                  saving || !fullName.trim()
                    ? "bg-primary-200"
                    : "bg-primary-300"
                }`}
                activeOpacity={0.7}
              >
                <Text className="text-white font-semibold text-sm">
                  {saving ? t("editProfile.saving") : t("editProfile.saveChanges")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View className="items-center mt-10">
            <View className="w-20 h-20 bg-primary-100 rounded-full items-center justify-center overflow-hidden">
              {profile?.avatar_url && !avatarError ? (
                <Image
                  key={avatarCacheKey}
                  source={{ uri: profile.avatar_url }}
                  className="w-full h-full"
                  resizeMode="cover"
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <User size={40} color="#134686" />
              )}
            </View>
            <Text className="text-lg font-bold text-slate-800 mt-4">
              {profile?.full_name ||
                profile?.email?.split("@")[0] ||
                t("editProfile.user")}
            </Text>
            <Text className="text-slate-400">
              {profile?.email || ""}
            </Text>
            <Text className="text-slate-400 text-sm mt-1">
              {profile?.phone || ""}
            </Text>

            <TouchableOpacity
              onPress={startEditing}
              className="mt-8 bg-primary-300 rounded-xl px-8 py-3 items-center"
              activeOpacity={0.7}
            >
              <Text className="text-white font-semibold text-sm">
                {t("editProfile.editProfileButton")}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
