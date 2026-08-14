import { supabase } from "@/shared/lib/supabase";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Building2, MessageSquare, Bell } from "lucide-react-native";
import React, { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlashList } from "@shopify/flash-list";
import {
  ActivityIndicator, TouchableOpacity, View } from "react-native";
import Text from "@/shared/components/Text";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackButton } from "@/shared/components/BackButton";

interface NotificationItem {
  id: string;
  type: "new_property" | "new_message";
  title: string | null;
  body: string | null;
  read_at: string | null;
  created_at: string;
  property_id: string | null;
  conversation_id: string | null;
  actor?: { full_name: string | null; avatar_url: string | null } | null;
}

const MOCK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "mock-1",
    type: "new_property",
    title: null,
    body: "နေပြည်တော် ကွန်ဒို အသစ် ရောက်ရှိလာပါသည်",
    read_at: null,
    created_at: new Date(Date.now() - 15 * 60000).toISOString(),
    property_id: null,
    conversation_id: null,
    actor: { full_name: "Aung Aung", avatar_url: null },
  },
  {
    id: "mock-2",
    type: "new_message",
    title: null,
    body: "မင်္ဂလာပါ ဆရာမ၊ အိမ်ကို ကြည့်ချင်လို့ပါ။",
    read_at: null,
    created_at: new Date(Date.now() - 60 * 60000).toISOString(),
    property_id: null,
    conversation_id: null,
    actor: { full_name: "Su Su", avatar_url: null },
  },
  {
    id: "mock-3",
    type: "new_property",
    title: null,
    body: "ရန်ကုန် မြို့လယ် ကွန်ဒို အသစ် ရောက်ရှိလာပါသည်",
    read_at: new Date(Date.now() - 3 * 3600000).toISOString(),
    created_at: new Date(Date.now() - 4 * 3600000).toISOString(),
    property_id: null,
    conversation_id: null,
    actor: { full_name: "Ko Ko", avatar_url: null },
  },
  {
    id: "mock-4",
    type: "new_message",
    title: null,
    body: "ဈေးနှုန်း ညှိနှိုင်းလို့ ရပါသလား ခင်ဗျာ။",
    read_at: new Date(Date.now() - 24 * 3600000).toISOString(),
    created_at: new Date(Date.now() - 26 * 3600000).toISOString(),
    property_id: null,
    conversation_id: null,
    actor: { full_name: "Mg Mg", avatar_url: null },
  },
];

function timeAgo(dateStr: string, isBurmese: boolean) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return isBurmese ? "အခုလေးတင်" : "Just now";
  if (mins < 60) return isBurmese ? `${mins} မိနစ်` : `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return isBurmese ? `${hours} နာရီ` : `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return isBurmese ? `${days} ရက်` : `${days} day${days > 1 ? "s" : ""} ago`;
}

export default function NotificationsScreen() {
  const { t, i18n } = useTranslation();
  const isBurmese = i18n.language === "mm" || i18n.language?.startsWith("my");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showingMock, setShowingMock] = useState(false);

  const fetchNotifications = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      router.replace("/(auth)/login");
      return;
    }
    const { data } = await supabase
      .from("notifications")
      .select("*, actor:profiles!actor_id(full_name, avatar_url)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setNotifications((data && data.length > 0) ? data : MOCK_NOTIFICATIONS);
    setShowingMock(!data || data.length === 0);
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, []),
  );

  const handlePress = (item: NotificationItem) => {
    if (item.type === "new_property" && item.property_id) {
      router.push(`/property/${item.property_id}`);
    } else if (item.type === "new_message" && item.conversation_id) {
      router.push(`/chat/${item.conversation_id}`);
    }
    if (!item.read_at) {
      supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", item.id)
        .then(() => {});
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === item.id ? { ...n, read_at: new Date().toISOString() } : n,
        ),
      );
    }
  };

  const handleClear = async () => {
    if (showingMock) {
      setNotifications([]);
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("notifications")
      .delete()
      .eq("user_id", user.id);
    setNotifications([]);
  };

  const renderItem = ({ item }: { item: NotificationItem }) => {
    const actorName = item.actor?.full_name || "User";
    let title: string;
    if (item.type === "new_property") {
      title = isBurmese
        ? `အိမ်ခြံမြေအသစ် ရောက်ရှိလာပါသည်`
        : "New property posted";
    } else {
      title = isBurmese
        ? `${actorName} ထံမှ စာတိုအသစ်`
        : `New message from ${actorName}`;
    }

    return (
      <TouchableOpacity
        onPress={() => handlePress(item)}
        className={`mx-4 my-1.5 flex-row rounded-2xl border border-primary-100 ${
          !item.read_at ? "bg-primary-50" : "bg-white"
        } ${isBurmese ? "p-5" : "p-4"}`}
        style={{
          shadowColor: "#134686",
          shadowOpacity: 0.06,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: 2,
        }}
      >
        <View className="size-11 rounded-full bg-primary-100 items-center justify-center overflow-hidden mr-3">
          {item.type === "new_property" ? (
            <Building2 size={20} color="#134686" />
          ) : (
            <MessageSquare size={20} color="#134686" />
          )}
        </View>
        <View className="flex-1">
          <Text
            className="text-sm font-rubik-medium text-black-300"
            numberOfLines={isBurmese ? 2 : 1}
          >
            {title}
          </Text>
          <Text
            className="text-sm font-rubik text-black-200 mt-0.5"
            numberOfLines={isBurmese ? 2 : 1}
          >
            {item.body}
          </Text>
          <Text className="text-xs font-rubik text-black-100 mt-1">
            {timeAgo(item.created_at, isBurmese)}
          </Text>
        </View>
        {!item.read_at && (
          <View className="w-2.5 h-2.5 rounded-full bg-danger ml-2" />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
      <StatusBar style="dark" />
      <View className="flex-row items-center px-4 py-3 border-b border-primary-100 bg-white">
        <BackButton onPress={() => router.back()} />
        <Text className="flex-1 text-lg font-rubik-bold text-black-300 ml-3">
          {t("settings.notifications")}
        </Text>
        {notifications.length > 0 && (
          <TouchableOpacity onPress={handleClear} className="px-2 py-1">
            <Text className="text-sm font-rubik-medium text-danger">
              {isBurmese ? "ရှင်းလင်းမည်" : "Clear"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#134686" />
        </View>
      ) : (
        <FlashList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerClassName="py-4 pb-10"
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="items-center pt-24 px-8">
              <View className="size-20 rounded-full bg-primary-100 items-center justify-center mb-4">
                <Bell size={32} color="#134686" />
              </View>
              <Text className="text-black-300 font-rubik-medium text-base text-center">
                {isBurmese
                  ? "အသိပေးချက်များ မရှိသေးပါ"
                  : "No notifications yet"}
              </Text>
              <Text className="text-black-100 font-rubik text-sm text-center mt-1">
                {isBurmese
                  ? "ကြော်ငြာအသစ်နှင့် စာတိုများ ရောက်ရှိလာသောအခါ ဤနေရာတွင် ပြသပါမည်။"
                  : "New properties and messages will appear here."}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
