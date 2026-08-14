import { supabase } from "@/shared/lib/supabase";
import { Card } from "@/features/home/Cards";
import { useCompareStore } from "@/features/property/useCompareStore";
import { PropertyListSkeleton } from "@/shared/components/Skeleton";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ChevronDown, Search, User, ClipboardList, Bell } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlashList } from "@shopify/flash-list";
import {
  DeviceEventEmitter,
  Image,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const isBurmese = i18n.language === "mm" || i18n.language?.startsWith("my");

  const [properties, setProperties] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [saleSubFilter, setSaleSubFilter] = useState("all");
  const [showSaleDropdown, setShowSaleDropdown] = useState(false);
  const [rentSubFilter, setRentSubFilter] = useState("all");
  const [showRentDropdown, setShowRentDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const fetchProperties = async (category: string, isPullRefresh = false) => {
    try {
      if (isPullRefresh) setIsRefreshing(true); else setIsLoading(true);
      let query = supabase
        .from("properties")
        .select(
          `*, views, states_regions(name_en, name_mm), townships(name_en, name_mm)`,
        )
        .eq("is_flagged", false)
        .order("created_at", { ascending: false });

      if (category === "for rent") {
        query = query.eq("deal_type", "rent");
        if (rentSubFilter === "rented") {
          query = query.eq("is_sold", true);
        } else {
          query = query.eq("is_sold", false);
        }
      } else if (category === "for sale") {
        query = query.eq("deal_type", "sale");
        if (saleSubFilter === "sold") {
          query = query.eq("is_sold", true);
        } else {
          query = query.eq("is_sold", false);
          if (saleSubFilter === "affordable") {
            query = query.lt("price", 3000);
          }
        }
      } else if (category === "all") {
        query = query.eq("is_sold", false);
      } else {
        query = query.eq("property_type", category).eq("is_sold", false);
      }

      const { data } = await query;
      setProperties(data || []);
    } catch (err) {
      console.error("Error fetching properties:", err);
    } finally {
      if (isPullRefresh) setIsRefreshing(false); else setIsLoading(false);
    }
  };

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .single();
      setUser(profile);
    }
  };

  useEffect(() => {
    const init = async () => {
      await fetchUser();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: saved } = await supabase
          .from("saved_properties")
          .select("property_id")
          .eq("user_id", user.id);
        setSavedIds(new Set(saved?.map((s) => s.property_id) || []));
      }
    };
    init();
    const sub = DeviceEventEmitter.addListener("profileUpdated", fetchUser);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener("savedPropertiesChanged", () => {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!user) return;
        supabase
          .from("saved_properties")
          .select("property_id")
          .eq("user_id", user.id)
          .then(({ data }) => {
            setSavedIds(new Set(data?.map((s) => s.property_id) || []));
          });
      });
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener("resetHomeTab", () => {
      setActiveCategory("all");
      setSaleSubFilter("all");
      setRentSubFilter("all");
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    fetchProperties(activeCategory);
  }, [activeCategory, saleSubFilter, rentSubFilter]);

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

  const categories = [
    { id: "all", label: t("categories.all") },
    { id: "for rent", label: t("categories.for rent") },
    { id: "for sale", label: t("categories.for sale") },
    { id: "apartment", label: t("categories.apartment") },
    { id: "condo", label: t("categories.condo") },
    { id: "hostel", label: t("categories.hostel") },
  ];

  const saleFilters = [
    { id: "all", label: t("subFilters.propertiesForSale") },
    { id: "affordable", label: t("subFilters.affordableProperties") },
    { id: "sold", label: t("subFilters.soldOut") },
  ];

  const rentFilters = [
    { id: "all", label: t("subFilters.propertiesForRent") },
    { id: "rented", label: t("subFilters.rented") },
  ];

  const handleCardPress = (id: string) => router.push(`/property/${id}`);

  const compareItems = useCompareStore((s) => s.items);
  const handleCompare = (property: any) => {
    useCompareStore.getState().add(property);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return isBurmese ? "မင်္ဂလာနံနက်ခင်းပါ" : "Good Morning";
    if (hour < 18) return isBurmese ? "မင်္ဂလာနေ့လယ်ခင်းပါ" : "Good Afternoon";
    return isBurmese ? "မင်္ဂလာညနေခင်းပါ" : "Good Evening";
  };

  return (
    <SafeAreaView className="h-full bg-white">
      <StatusBar style="dark" />

      <View className="bg-white border-b border-primary-100">
        <View className="px-5 pt-2 pb-3">
            <View className="flex flex-row items-center justify-between">
              <TouchableOpacity onPress={() => router.push("/profile" as any)} className="flex flex-row">
                <View className="size-12 rounded-full bg-primary-100 items-center justify-center overflow-hidden">
                  {user?.avatar_url ? (
                    <Image
                      source={{ uri: user.avatar_url }}
                      className="size-full"
                      resizeMode="cover"
                    />
                  ) : (
                    <User size={22} color="#134686" />
                  )}
                </View>
                <View className="flex flex-col items-start ml-2 justify-center">
                  <Text className="text-xs font-rubik text-black-100">
                    {getGreeting()}
                  </Text>
                  <Text className="text-base font-rubik-medium text-black-300">
                    {user?.full_name || (isBurmese ? "ဧည့်သည်" : "Guest")}
                  </Text>
                </View>
              </TouchableOpacity>
            <View className="flex-row items-center gap-3">
              <TouchableOpacity onPress={() => router.push("/wanted" as any)}>
                <ClipboardList size={24} color={"#191D31"} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push("/search")}>
                <Search size={24} color={"#191D31"} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push("/notifications" as any)}>
                <Bell size={24} color={"#191D31"} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-2 mt-5"
          >
            {categories.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                    onPress={() => {
                      setActiveCategory(cat.id);
                      if (cat.id !== "for sale") setSaleSubFilter("all");
                      if (cat.id !== "for rent") setRentSubFilter("all");
                    }}
                  className={`px-5 py-2.5 rounded-full ${isActive ? "bg-primary-300" : "bg-primary-100"}`}
                >
                  <Text
                    className={`text-sm font-rubik-medium ${isActive ? "text-white" : "text-black-200"}`}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {activeCategory === "for sale" && (
            <View className="relative mt-3 z-10">
              <TouchableOpacity
                onPress={() => setShowSaleDropdown((p) => !p)}
                className="flex-row items-center justify-between bg-white border border-primary-200 rounded-full px-4 py-2.5"
              >
                <Text className="text-sm font-rubik-medium text-black-300">
                  {saleFilters.find((f) => f.id === saleSubFilter)?.label}
                </Text>
                <ChevronDown size={16} color={"#191D31"} />
              </TouchableOpacity>

              {showSaleDropdown && (
                <View className="absolute top-full left-0 right-0 mt-1 bg-white border border-primary-200 rounded-2xl shadow-lg overflow-hidden">
                  {saleFilters.map((f) => (
                    <TouchableOpacity
                      key={f.id}
                      onPress={() => {
                        setSaleSubFilter(f.id);
                        setShowSaleDropdown(false);
                      }}
                      className={`px-4 py-3 ${saleSubFilter === f.id ? "bg-primary-100" : ""}`}
                    >
                      <Text
                        className={`text-sm font-rubik-medium ${saleSubFilter === f.id ? "text-primary-300" : "text-black-200"}`}
                      >
                        {f.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}

          {activeCategory === "for rent" && (
            <View className="relative mt-3 z-10">
              <TouchableOpacity
                onPress={() => setShowRentDropdown((p) => !p)}
                className="flex-row items-center justify-between bg-white border border-primary-200 rounded-full px-4 py-2.5"
              >
                <Text className="text-sm font-rubik-medium text-black-300">
                  {rentFilters.find((f) => f.id === rentSubFilter)?.label}
                </Text>
                <ChevronDown size={16} color={"#191D31"} />
              </TouchableOpacity>

              {showRentDropdown && (
                <View className="absolute top-full left-0 right-0 mt-1 bg-white border border-primary-200 rounded-2xl shadow-lg overflow-hidden">
                  {rentFilters.map((f) => (
                    <TouchableOpacity
                      key={f.id}
                      onPress={() => {
                        setRentSubFilter(f.id);
                        setShowRentDropdown(false);
                      }}
                      className={`px-4 py-3 ${rentSubFilter === f.id ? "bg-primary-100" : ""}`}
                    >
                      <Text
                        className={`text-sm font-rubik-medium ${rentSubFilter === f.id ? "text-primary-300" : "text-black-200"}`}
                      >
                        {f.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      </View>

      <FlashList
        data={properties}
        renderItem={({ item }) => (
          <Card
            item={item}
            onPress={() => handleCardPress(item.id)}
            onSave={() => handleSave(item.id)}
            onCompare={() => handleCompare(item)}
            isSaved={savedIds.has(item.id)}
            compareSelected={compareItems.some((i: any) => i.id === item.id)}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerClassName="pb-32 pt-5"
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => fetchProperties(activeCategory, true)}
            colors={["#134686"]}
            tintColor="#134686"
          />
        }
        ListEmptyComponent={
          isLoading ? (
            <PropertyListSkeleton count={3} />
          ) : (
            <View className="items-center py-12">
              <Text className="text-black-100 font-rubik-medium text-base">
                {isBurmese ? "ကြော်ငြာများမရှိသေးပါ" : "No properties found"}
              </Text>
            </View>
          )
        }
        />
    </SafeAreaView>
  );
}
