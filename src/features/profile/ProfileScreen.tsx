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
import { supabase } from "@/shared/lib/supabase";
import { router } from "expo-router";
import {
  BadgeCheck,
  ChevronRight,
  Home,
  LogOut,
  MapPin,
  Pencil,
  User,
} from "lucide-react-native";
import { useLanguageStore } from "@/shared/store/useLanguageStore";
import { ProfileSkeleton } from "@/shared/components/Skeleton";
import React, { Component, useEffect, useState } from "react";
import {
  DeviceEventEmitter,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

const GREEN = "#134686";
const SECONDARY = "#9CA3AF";
const CARD_SHADOW = { boxShadow: "0px 6px 20px rgba(0,0,0,0.08)" } as any;

class NavBoundary extends Component<{ children: React.ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError(e: Error) {
    if (e.message?.includes("navigation context") || e.message?.includes("NavigationContainer")) {
      return { error: true };
    }
    throw e;
  }
  componentDidCatch() {
    setTimeout(() => this.setState({ error: false }), 32);
  }
  render() {
    if (this.state.error) return <View className="flex-1 bg-primary-100" />;
    return this.props.children;
  }
}

function ProfileContent() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const { t } = useTranslation();
  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);

  useEffect(() => {
    fetchProfile();
    const sub = DeviceEventEmitter.addListener("profileUpdated", fetchProfile);
    return () => sub.remove();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/(auth)/login");
      return;
    }
    const { data: profileData } = await supabase
      .from("profiles")
      .select("full_name, email, avatar_url, phone, city, region")
      .eq("id", user.id)
      .single();
    setProfile(profileData);
    setLoading(false);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error during complete logout:", error);
    } finally {
      setShowLogoutDialog(false);
      router.replace({
        pathname: "/(auth)/login",
        params: { logout: "success" },
      });
    }
  };

  if (loading)
    return (
      <SafeAreaView className="flex-1 bg-cream">
        <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
          <ProfileSkeleton />
        </ScrollView>
      </SafeAreaView>
    );

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1"
        contentContainerStyle={{ padding: 24, paddingBottom: 86 }}
      >
        <View className="flex-row justify-end mb-8">
          <TouchableOpacity
            onPress={() => setShowLogoutDialog(true)}
            className="bg-primary-100 rounded-full px-4 py-2.5 active:opacity-80"
          >
            <Text className="text-[#134686] text-lg font-rubik-semibold">{t("profile.signOut")}</Text>
          </TouchableOpacity>
        </View>

        <View
          className="relative bg-white rounded-[24px] px-6 pt-10 pb-8 items-center border border-primary-200"
          style={CARD_SHADOW}
        >
          <TouchableOpacity
            onPress={() => router.push("/edit-profile")}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-primary-100 items-center justify-center"
          >
            <Pencil size={16} color="#134686" />
          </TouchableOpacity>

          <View className="w-24 h-24 rounded-full bg-primary-100 items-center justify-center overflow-hidden">
            {profile?.avatar_url && !avatarError ? (
              <Image
                source={{ uri: profile.avatar_url }}
                className="w-full h-full"
                resizeMode="cover"
                onError={() => setAvatarError(true)}
              />
            ) : (
              <User size={44} color={GREEN} />
            )}
          </View>

          <View className="flex-row items-center mt-5">
            <Text className="text-[22px] font-rubik-bold text-[#1F2937]">
              {profile?.full_name || t("profile.user")}
            </Text>
            <BadgeCheck size={20} color={GREEN} className="ml-1.5" />
          </View>
          <Text className="text-[15px] text-[#9CA3AF] mt-1.5">
            {profile?.email || "—"}
          </Text>
        </View>

        <View
          className="bg-white rounded-[24px] mt-6 overflow-hidden border border-primary-200"
          style={CARD_SHADOW}
        >
          <InfoRow label={t("editProfile.phone")} value={profile?.phone || "09 123 456 789"} />
          <InfoRow label={t("editProfile.city")} value={profile?.city || "Yangon"} />
          <InfoRow label={t("editProfile.region")} value={profile?.region || "Yangon Region"} last />
        </View>

        <View
          className="bg-white rounded-[24px] mt-6 overflow-hidden border border-primary-200"
          style={CARD_SHADOW}
        >
          <Text className="px-6 pt-6 pb-4 text-lg font-rubik-semibold text-[#1F2937] border-b border-primary-200">
            {t("profile.myContent")}
          </Text>
          <MenuLinkRow
            icon={<Home size={18} color={GREEN} />}
            label={t("profile.myListings")}
            onPress={() => router.push("/my-listings")}
          />
          <MenuLinkRow
            icon={<MapPin size={18} color={GREEN} />}
            label={t("profile.savedProperties")}
            onPress={() => router.push("/saved-properties")}
            last
          />
        </View>

        <View
          className="bg-white rounded-[24px] mt-6 overflow-hidden border border-primary-200"
          style={CARD_SHADOW}
        >
          <Text className="px-6 pt-6 pb-4 text-lg font-rubik-semibold text-[#1F2937] border-b border-primary-200">
            {t("profile.settings")}
          </Text>

          <View className="flex-row items-center justify-between px-6 py-4 border-b border-primary-200">
            <Text className="text-base font-rubik-medium text-[#1F2937]">
              {t("profile.language")}
            </Text>
            <SegmentedToggle
              options={[
                { key: "en", label: "EN" },
                { key: "mm", label: "MM" },
              ]}
              value={language}
              onChange={(key) => setLanguage(key as "en" | "mm")}
            />
          </View>

          <SettingsLinkRow
            label={t("profile.helpSupport")}
            last
            onPress={() => router.push("/help-support")}
          />
        </View>

      </ScrollView>

      <AlertDialog
        isOpen={showLogoutDialog}
        onClose={() => setShowLogoutDialog(false)}
      >
        <AlertDialogBackdrop />
        <AlertDialogContent className="p-6 rounded-3xl bg-white items-center">
          <AlertDialogHeader>
            <Heading className="text-black-300">{t("profile.logoutTitle")}</Heading>
          </AlertDialogHeader>
          <AlertDialogBody>
            <Text className="text-center text-black-200">
              {t("profile.logoutConfirm")}
            </Text>
          </AlertDialogBody>
          <AlertDialogFooter className="w-full">
            <Button
              onPress={() => setShowLogoutDialog(false)}
              className="flex-1 mr-2"
            >
              <ButtonText>{t("profile.cancel")}</ButtonText>
            </Button>
            <Button onPress={handleLogout} className="bg-danger flex-1">
              <ButtonText>{t("profile.logout")}</ButtonText>
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SafeAreaView>
  );
}

export default function ProfileScreen() {
  return (
    <NavBoundary>
      <ProfileContent />
    </NavBoundary>
  );
}

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View
      className={`flex-row items-center justify-between px-6 py-4 ${
        last ? "" : "border-b border-primary-200"
      }`}
    >
      <Text className="text-base font-rubik-medium text-[#1F2937]">{label}</Text>
      <Text className="text-base text-[#1F2937]">{value}</Text>
    </View>
  );
}

function SettingsLinkRow({
  label,
  last,
  onPress,
}: {
  label: string;
  last?: boolean;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      className={`flex-row items-center justify-between px-6 py-4 ${
        last ? "" : "border-b border-primary-200"
      }`}
    >
      <Text className="text-base font-rubik-medium text-[#1F2937]">
        {label}
      </Text>
      <ChevronRight size={18} color={SECONDARY} />
    </TouchableOpacity>
  );
}

function MenuLinkRow({
  icon,
  label,
  onPress,
  last,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`flex-row items-center justify-between px-6 py-4 ${
        last ? "" : "border-b border-primary-200"
      } active:bg-primary-100`}
    >
      <View className="flex-row items-center">
        <View className="w-9 h-9 bg-primary-100 rounded-xl items-center justify-center mr-3">
          {icon}
        </View>
        <Text className="text-base font-rubik-medium text-[#1F2937]">
          {label}
        </Text>
      </View>
      <ChevronRight size={18} color={SECONDARY} />
    </TouchableOpacity>
  );
}

function SegmentedToggle({
  options,
  value,
  onChange,
  segmentWidth = 48,
}: {
  options: readonly { key: string; label: string }[];
  value: string;
  onChange: (key: string) => void;
  segmentWidth?: number;
}) {
  const index = Math.max(
    0,
    options.findIndex((opt) => opt.key === value),
  );
  const progress = useSharedValue(index);

  useEffect(() => {
    progress.value = withTiming(index, {
      duration: 250,
      easing: Easing.inOut(Easing.cubic),
    });
  }, [index, progress]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * segmentWidth }],
  }));

  return (
    <View className="relative bg-primary-100 rounded-full p-0.5 flex-row">
      <Animated.View
        className="absolute top-0.5 left-0.5 h-[26px] rounded-full bg-white shadow-sm"
        style={[indicatorStyle, { width: segmentWidth }]}
      />
      {options.map((opt) => {
        const active = value === opt.key;
        return (
          <TouchableOpacity
            key={opt.key}
            onPress={() => onChange(opt.key)}
            style={{ width: segmentWidth, height: 26 }}
            className="items-center justify-center"
          >
            <Text
              className={`text-xs font-rubik-bold ${
                active ? "text-primary-300" : "text-black-100"
              }`}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
