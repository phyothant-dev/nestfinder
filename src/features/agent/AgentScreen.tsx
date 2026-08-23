import { supabase } from "@/shared/lib/supabase";
import { router } from "expo-router";
import { BadgeCheck, MapPin, MessageCircle, Phone, Share2 } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Alert, DeviceEventEmitter, Image, Linking, ScrollView, Share, TouchableOpacity, View } from "react-native";
import Text from "@/shared/components/Text";

import { Card } from "@/features/home/Cards";
import { BackButton } from "@/shared/components/BackButton";
import { useCompareStore } from "@/features/property/useCompareStore";

const GREEN = "#134686";
const GRAY = "#8C8E98";

interface AgentScreenProps {
  agentId: string;
  propertyId?: string;
  phone?: string;
}

export default function AgentScreen({ agentId, propertyId, phone: detailPhone }: AgentScreenProps) {
  const { t, i18n } = useTranslation();
  const isBurmese = i18n.language === "mm" || i18n.language?.startsWith("my");

  const [agent, setAgent] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, sold: 0 });
  const [filterTab, setFilterTab] = useState<"sale" | "rent">("sale");
  const [loading, setLoading] = useState(true);
  const [isSelf, setIsSelf] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [fallbackPhone, setFallbackPhone] = useState("");
  const compareItems = useCompareStore((s) => s.items);

  const fetchSavedIds = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: saved } = await supabase
      .from("saved_properties")
      .select("property_id")
      .eq("user_id", user.id);
    setSavedIds(new Set(saved?.map((s) => s.property_id) || []));
  };

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener("savedPropertiesChanged", fetchSavedIds);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setIsSelf(user?.id === agentId);
        await fetchSavedIds();

        const { data: profile } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, phone, city, region, created_at")
          .eq("id", agentId)
          .single();
        if (!profile) return;
        setAgent(profile);

        if (propertyId) {
          const { data: prop } = await supabase
            .from("properties")
            .select("search_value, phone")
            .eq("id", propertyId)
            .single();
          setFallbackPhone(prop?.search_value || prop?.phone || "");
        }

        const { data: statsData } = await supabase
          .from("properties")
          .select("is_sold")
          .eq("user_id", agentId)
          .eq("is_flagged", false);
        setStats({
          total: statsData?.length || 0,
          sold: statsData?.filter((s) => s.is_sold).length || 0,
        });

        const { data: listingsData } = await supabase
          .from("properties")
          .select("*, states_regions(name_en, name_mm), townships(name_en, name_mm)")
          .eq("user_id", agentId)
          .eq("is_flagged", false)
          .order("created_at", { ascending: false })
          .limit(30);
        setListings(listingsData || []);
      } catch (err) {
        console.error("Error fetching agent:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [agentId]);

  const phone = agent?.phone || detailPhone || fallbackPhone;

  const handleCall = () => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    } else {
      Alert.alert(
        t("agent.noPhoneTitle"),
        t("agent.noPhoneMessage"),
      );
    }
  };

  const handleChat = async () => {
    if (!propertyId) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/(auth)/login");
      return;
    }
    if (user.id === agentId) return;
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("property_id", propertyId)
      .eq("buyer_id", user.id)
      .eq("seller_id", agentId)
      .maybeSingle();
    let conversationId = existing?.id;
    if (!conversationId) {
      const { data: created } = await supabase
        .from("conversations")
        .insert({
          property_id: propertyId,
          buyer_id: user.id,
          seller_id: agentId,
        })
        .select("id")
        .single();
      conversationId = created?.id;
    }
    if (conversationId) router.push(`/chat/${conversationId}` as any);
  };

  const handleShare = async () => {
    await Share.share({
      message: `${agent?.full_name || "Agent"} - Nestfinder\nhttps://warm-bublanina-7b1ea2.netlify.app/agent/${agentId}`,
    });
  };

  const handleSave = async (propertyId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/(auth)/login");
      return;
    }
    if (savedIds.has(propertyId)) {
      await supabase
        .from("saved_properties")
        .delete()
        .eq("user_id", user.id)
        .eq("property_id", propertyId);
      setSavedIds((prev) => {
        const next = new Set(prev);
        next.delete(propertyId);
        return next;
      });
    } else {
      await supabase
        .from("saved_properties")
        .insert({ user_id: user.id, property_id: propertyId });
      setSavedIds((prev) => new Set(prev).add(propertyId));
    }
    DeviceEventEmitter.emit("savedPropertiesChanged");
  };

  const handleCompare = (property: any) => {
    useCompareStore.getState().add(property);
  };

  if (loading) {
    return (
      <View className="flex-1 bg-cream items-center justify-center">
        <ActivityIndicator size="large" color={GREEN} />
      </View>
    );
  }

  if (!agent) {
    return (
      <View className="flex-1 bg-cream items-center justify-center">
        <Text className="text-gray-500 font-rubik">
          {t("agent.notFound")}
        </Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4">
          <Text className="text-primary-300 font-rubik-medium">
            {t("agent.goBack")}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const memberSince = agent.created_at
    ? new Date(agent.created_at).toLocaleDateString(isBurmese ? "my-MM" : "en-US", {
        month: "short",
        year: "numeric",
      })
    : "";
  const location = [agent.city, agent.region].filter(Boolean).join(", ");
  const filteredListings = listings.filter((p) => p.deal_type === filterTab);

  return (
    <View className="flex-1 bg-cream">
      <View className="px-5 pt-2 pb-3 border-b border-primary-200 bg-white flex-row items-center">
        <BackButton onPress={() => router.back()} />
        <Text className="text-lg font-rubik-bold text-gray-950 flex-1 ml-3">
          {t("agent.title")}
        </Text>
        <TouchableOpacity onPress={handleShare} className="w-10 h-10 items-center justify-center rounded-full bg-primary-100">
          <Share2 size={20} color={GREEN} />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View className="bg-white rounded-2xl border border-primary-200 overflow-hidden mb-4">
          <View className="flex-row items-center px-5 pt-6 pb-5">
            <View className="w-20 h-20 rounded-full items-center justify-center overflow-hidden bg-primary-100">
              {agent.avatar_url ? (
                <Image
                  source={{ uri: agent.avatar_url }}
                  className="w-20 h-20 rounded-full"
                  resizeMode="cover"
                />
              ) : (
                <Text className="text-2xl font-rubik-bold" style={{ color: GREEN }}>
                  {(agent.full_name || "A")[0]}
                </Text>
              )}
            </View>
            <View className="flex-1 ml-4">
              <View className="flex-row items-center gap-1.5">
                <Text className="text-lg font-rubik-extrabold text-gray-950 flex-shrink">
                  {agent.full_name || "Agent"}
                </Text>
                <BadgeCheck size={18} color="#134686" fill="#134686" />
              </View>
              <Text className="text-sm font-rubik mt-0.5" style={{ color: GRAY }}>
                {t("agent.realEstateAgent")}
              </Text>
              {location ? (
                <View className="flex-row items-center gap-1 mt-1">
                  <MapPin size={12} color={GRAY} />
                  <Text className="text-xs font-rubik" style={{ color: GRAY }}>
                    {location}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {!isSelf && (
            <View className="flex-row gap-3 px-5 pb-5">
              <TouchableOpacity
                onPress={handleCall}
                activeOpacity={0.8}
                className="flex-1 flex-row items-center justify-center gap-2 py-3 rounded-xl"
                style={{ backgroundColor: GREEN }}
              >
                <Phone size={16} color="#fff" />
                <Text className="text-white text-sm font-rubik-bold">
                  {t("agent.call")}
                </Text>
              </TouchableOpacity>
              {propertyId ? (
                <TouchableOpacity
                  onPress={handleChat}
                  activeOpacity={0.8}
                  className="flex-1 flex-row items-center justify-center gap-2 py-3 rounded-xl border"
                  style={{ borderColor: GREEN }}
                >
                  <MessageCircle size={16} color={GREEN} />
                  <Text className="text-sm font-rubik-bold" style={{ color: GREEN }}>
                    {t("agent.chat")}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )}
        </View>

        <View className="bg-white rounded-2xl border border-primary-200 overflow-hidden mb-4">
          <View className="flex-row px-5 py-4">
            <View className="flex-1 items-center border-r border-primary-100">
              <Text className="text-xl font-rubik-extrabold text-gray-950">{stats.total}</Text>
              <Text className="text-xs font-rubik mt-0.5" style={{ color: GRAY }}>
                {t("agent.listings")}
              </Text>
            </View>
            <View className="flex-1 items-center">
              <Text className="text-xl font-rubik-extrabold text-gray-950">{stats.sold}</Text>
              <Text className="text-xs font-rubik mt-0.5" style={{ color: GRAY }}>
                {t("agent.sold")}
              </Text>
            </View>
          </View>
          {memberSince ? (
            <View className="border-t border-primary-100 px-5 py-2.5">
              <Text className="text-xs font-rubik text-center" style={{ color: GRAY }}>
                {t("agent.memberSince")} {memberSince}
              </Text>
            </View>
          ) : null}
        </View>

        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-lg font-rubik-extrabold text-gray-950">
            {t("agent.listings")}
          </Text>
          <View className="flex-row rounded-full border border-primary-200 overflow-hidden bg-white">
            {(["sale", "rent"] as const).map((key) => {
              const isActive = filterTab === key;
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => setFilterTab(key)}
                  className={`px-4 py-1.5 ${isActive ? "bg-primary-300" : ""}`}
                >
                  <Text
                    className={`text-xs font-rubik-semibold ${isActive ? "text-white" : "text-gray-500"}`}
                  >
                    {key === "sale"
                      ? t("profile.tabForSale") || "For Sale"
                      : t("profile.tabForRent") || "For Rent"}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
        {filteredListings.length === 0 ? (
          <View className="bg-white rounded-2xl border border-primary-200 py-10 items-center">
            <Text className="text-sm font-rubik" style={{ color: GRAY }}>
              {t("agent.noListings")}
            </Text>
          </View>
        ) : (
          filteredListings.map((p) => (
            <Card
              key={p.id}
              item={p}
              onPress={() => router.push(`/property/${p.id}` as any)}
              isSaved={savedIds.has(p.id)}
              onSave={() => handleSave(p.id)}
              onCompare={() => handleCompare(p)}
              compareSelected={compareItems.some((i) => i.id === p.id)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}
