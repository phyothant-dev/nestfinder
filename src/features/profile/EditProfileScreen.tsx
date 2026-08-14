import { supabase } from "@/shared/lib/supabase";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { User } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { DeviceEventEmitter } from "react-native";
import {
  ActivityIndicator,
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackButton } from "@/shared/components/BackButton";
import { AlertDialog } from "@/shared/components/alert-dialog";
import { Button, ButtonText } from "@/shared/components/button/button";
import { Heading } from "@/shared/components/heading/heading";

export default function EditProfileScreen() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, phone, city, region")
        .eq("id", user.id)
        .single();

      if (data) {
        setFullName(data.full_name || "");
        setAvatarUrl(data.avatar_url);
        setPhone(data.phone || "");
        setCity(data.city || "");
        setRegion(data.region || "");
      }
    } catch (err) {
      console.error("Error loading profile:", err);
    } finally {
      setLoading(false);
    }
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
      if (!user) return;

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

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("avatars")
          .getPublicUrl(uploadData.path);
        finalAvatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          avatar_url: finalAvatarUrl,
          phone: phone.trim(),
          city: city.trim(),
          region: region.trim(),
        })
        .eq("id", user.id);

      if (error) throw error;
      DeviceEventEmitter.emit("profileUpdated");
      router.back();
    } catch (err) {
      console.error("Error saving profile:", err);
      setShowError(true);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-50">
        <ActivityIndicator size="large" color="#134686" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="flex-row items-center px-4 py-3 border-b border-slate-100 bg-white">
        <BackButton onPress={() => router.back()} />
        <Text className="flex-1 text-center text-lg font-bold text-slate-900 mr-6">
          {t("editProfile.title")}
        </Text>
      </View>

      <View className="flex-1 px-6 pt-8">
        <TouchableOpacity
          onPress={pickImage}
          className="self-center mb-10 items-center"
        >
          <View className="w-28 h-28 rounded-full bg-slate-200 items-center justify-center overflow-hidden border-4 border-primary-200">
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                className="w-full h-full"
                resizeMode="cover"
              />
            ) : (
              <User size={44} color="#94a3b8" />
            )}
          </View>
          <Text className="text-primary-300 font-semibold text-sm mt-3">
            {t("editProfile.changePhoto")}
          </Text>
        </TouchableOpacity>

        <Text className="text-slate-500 text-xs font-bold mb-1.5 uppercase tracking-wider">
          {t("editProfile.username")}
        </Text>
        <TextInput
          value={fullName}
          onChangeText={setFullName}
          placeholder={t("editProfile.namePlaceholder")}
          placeholderTextColor="#94a3b8"
          className="bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-slate-900 text-base mb-4"
        />

        <Text className="text-slate-500 text-xs font-bold mb-1.5 uppercase tracking-wider">
          {t("editProfile.phone")}
        </Text>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          placeholder={t("editProfile.phonePlaceholder")}
          placeholderTextColor="#94a3b8"
          keyboardType="phone-pad"
          className="bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-slate-900 text-base mb-4"
        />

        <Text className="text-slate-500 text-xs font-bold mb-1.5 uppercase tracking-wider">
          {t("editProfile.city")}
        </Text>
        <TextInput
          value={city}
          onChangeText={setCity}
          placeholder={t("editProfile.cityPlaceholder")}
          placeholderTextColor="#94a3b8"
          className="bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-slate-900 text-base mb-4"
        />

        <Text className="text-slate-500 text-xs font-bold mb-1.5 uppercase tracking-wider">
          {t("editProfile.region")}
        </Text>
        <TextInput
          value={region}
          onChangeText={setRegion}
          placeholder={t("editProfile.regionPlaceholder")}
          placeholderTextColor="#94a3b8"
          className="bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-slate-900 text-base mb-8"
        />

        <TouchableOpacity
          onPress={handleSave}
          disabled={saving || !fullName.trim()}
          className={`rounded-xl px-5 py-2.5 items-center justify-center ${saving || !fullName.trim() ? "bg-primary-200" : "bg-primary-300"}`}
          activeOpacity={0.7}
        >
          <Text className="text-white font-semibold text-sm">
            {saving ? t("editProfile.saving") : t("editProfile.saveChanges")}
          </Text>
        </TouchableOpacity>
      </View>

      <AlertDialog
        isOpen={showError}
        onClose={() => setShowError(false)}
        useRNModal={true}
      >
        <AlertDialog.Backdrop />
        <AlertDialog.Content className="p-6 rounded-3xl bg-white w-5/6 items-center shadow-xl">
          <AlertDialog.Header>
            <Heading>{t("editProfile.saveError")}</Heading>
          </AlertDialog.Header>
          <AlertDialog.Body>
            <Text className="text-center text-slate-500">
              {t("editProfile.failedToSave")}
            </Text>
          </AlertDialog.Body>
          <AlertDialog.Footer className="w-full flex-row justify-center">
            <Button
              onPress={() => setShowError(false)}
              className="flex-1"
            >
              <ButtonText>{t("createWanted.ok")}</ButtonText>
            </Button>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog>
    </SafeAreaView>
  );
}
