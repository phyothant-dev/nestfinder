import { Button, ButtonText } from "@/shared/components/button/button";
import { Heading } from "@/shared/components/heading/heading";
import { AlertDialog } from "@/shared/components/alert-dialog";
import { PropertyListSkeleton, Skeleton } from "@/shared/components/Skeleton";
import { supabase } from "@/shared/lib/supabase";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Eye, Trash2 } from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlashList } from "@shopify/flash-list";
import {
  ActivityIndicator, Image, ScrollView, TouchableOpacity, View } from "react-native";
import Text from "@/shared/components/Text";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackButton } from "@/shared/components/BackButton";


interface Listing {
  id: string;
  title_en: string;
  title_mm: string;
  price: number;
  currency_unit: string;
  deal_type: string;
  property_type: string;
  images: string[];
  ad_number: number;
  created_at: string;
  is_sold: boolean;
  is_rented: boolean;
  views: number;
  states_regions?: { name_en: string; name_mm: string } | null;
  townships?: { name_en: string; name_mm: string } | null;
}

type TabKey = "sale" | "rent" | "hostel" | "sold" | "rented" | "rented_hostel";

export default function MyListingsScreen() {
  const { t, i18n } = useTranslation();
  const isBurmese = i18n.language === "mm" || i18n.language?.startsWith("my");

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("sale");
  const [monthlyPostCount, setMonthlyPostCount] = useState<number | null>(null);
  const [cycleDates, setCycleDates] = useState<{ start: string; end: string } | null>(null);
  const [alertDialog, setAlertDialog] = useState<{
    title: string;
    message: string;
    onConfirm?: () => void;
    showCancel?: boolean;
  } | null>(null);

  const POST_MONTHLY_LIMIT = 5;
  const availableToPost =
    monthlyPostCount !== null ? Math.max(0, POST_MONTHLY_LIMIT - monthlyPostCount) : null;

  const tabs: { key: TabKey; label: string }[] = useMemo(
    () => [
      { key: "sale", label: t("profile.tabForSale") || "For Sale" },
      { key: "rent", label: t("profile.tabForRent") || "For Rent" },
      { key: "hostel", label: t("profile.tabHostel") || "Hostel" },
      { key: "sold", label: t("profile.tabSoldOut") || "Sold Out" },
      { key: "rented", label: t("profile.tabRentOut") || "Rent Out" },
      { key: "rented_hostel", label: t("profile.tabRentOutHostel") || "Rent Out Hostel" },
    ],
    [t],
  );

  const fetchListings = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const [listingsRes, countRes, cycleRes] = await Promise.all([
      supabase
        .from("properties")
        .select("*, views, states_regions(name_en, name_mm), townships(name_en, name_mm)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase.rpc("get_monthly_post_count", { user_uuid: user.id }),
      supabase.rpc("get_monthly_post_cycle", { user_uuid: user.id }),
    ]);

    setListings(listingsRes.data || []);
    if (countRes.data !== null) setMonthlyPostCount(countRes.data as number);
    if (cycleRes.data && cycleRes.data.length > 0) {
      const row = cycleRes.data[0] as { cycle_start: string; cycle_end: string };
      setCycleDates({ start: row.cycle_start, end: row.cycle_end });
    }
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { fetchListings(); }, []));

  const filteredListings = useMemo(() => {
    return listings.filter((item) => {
      const isHostel = item.property_type === "hostel";
      switch (activeTab) {
        case "sale":
          return item.deal_type === "sale" && !item.is_sold;
        case "rent":
          return item.deal_type === "rent" && !isHostel && !item.is_sold && !item.is_rented;
        case "hostel":
          return isHostel && !item.is_sold && !item.is_rented;
        case "sold":
          return item.is_sold;
        case "rented":
          return item.is_rented && !isHostel;
        case "rented_hostel":
          return item.is_rented && isHostel;
        default:
          return true;
      }
    });
  }, [listings, activeTab]);

  const handleDelete = (id: string) => {
    setAlertDialog({
      title: t("profile.deleteTitle") || "Delete Listing",
      message: t("profile.deleteConfirm") || "Are you sure you want to delete this listing?",
      showCancel: true,
      onConfirm: async () => {
        setDeleting(id);
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setAlertDialog({ title: t("profile.error") || "Error", message: t("myListings.loginRequired") || "You must be logged in." });
          setDeleting(null);
          return;
        }
        const { error } = await supabase
          .from("properties")
          .delete()
          .eq("id", id)
          .eq("user_id", user.id);
        if (error) {
          setAlertDialog({
            title: t("profile.error") || "Error",
            message: error.message || t("myListings.deleteFailed") || "Failed to delete listing.",
          });
        } else {
          setListings((prev) => prev.filter((l) => l.id !== id));
        }
        setDeleting(null);
      },
    });
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-cream">
        <View className="flex-row items-center px-4 py-3 bg-white border-b border-primary-200">
          <Skeleton className="w-10 h-10 rounded-full" />
          <Skeleton className="h-6 w-36 mx-auto" />
        </View>
        <PropertyListSkeleton count={3} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <StatusBar style="dark" />

      {/* HEADER */}
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-primary-200">
        <BackButton onPress={() => router.back()} />
        <Text className="flex-1 text-lg font-rubik-bold text-black-300 text-center mr-10">
          {t("profile.myListings") || "My Listings"}
        </Text>
      </View>

      {/* STATS BOX */}
      <View className="mx-4 mt-4 bg-white rounded-2xl border border-primary-200 p-4">
        {cycleDates && (
          <Text className="text-center text-black-200 text-[11px] font-rubik-medium mb-3">
            {isBurmese ? "လက်ရှိကာလ" : "Posting cycle"}{" "}
            {new Date(cycleDates.start).toLocaleDateString(isBurmese ? "my-MM" : "en-US", { day: "numeric", month: "short", year: "numeric" })}
            {" - "}
            {new Date(cycleDates.end).toLocaleDateString(isBurmese ? "my-MM" : "en-US", { day: "numeric", month: "short", year: "numeric" })}
          </Text>
        )}
        <View className="flex-row gap-3">
          <View className="flex-1 items-center">
            <Text className="text-2xl font-rubik-extrabold text-primary-300">
              {availableToPost !== null ? availableToPost : "--"}
            </Text>
            <Text className="text-black-100 text-xs font-rubik-medium text-center mt-1">
              {t("profile.availableToPost") || "Available to Post"}
            </Text>
          </View>
          <View className="w-px bg-primary-200" />
          <View className="flex-1 items-center">
            <Text className="text-2xl font-rubik-extrabold text-primary-300">
              {listings.length}
            </Text>
            <Text className="text-black-100 text-xs font-rubik-medium text-center mt-1">
              {t("profile.totalPosted") || "Total Posted"}
            </Text>
          </View>
        </View>
      </View>

      {/* TABS */}
      <View className="mt-4">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-full border ${
                  isActive
                    ? "bg-primary-300 border-primary-300"
                    : "bg-white border-primary-200"
                }`}
              >
                <Text
                  className={`font-rubik-semibold text-xs ${
                    isActive
                      ? "text-white"
                      : "text-black-200"
                  }`}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* LISTINGS LIST */}
      {filteredListings.length === 0 ? (
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-black-100 text-base font-rubik-medium">
            {t("profile.noListingsInTab") || "No listings in this category"}
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/create_post")}
            className="mt-4 bg-primary-300 px-6 py-3 rounded-full"
          >
            <Text className="text-white font-rubik-bold">
              {t("profile.createListing") || "Create Listing"}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlashList
          data={filteredListings}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 12, gap: 12 }}
          renderItem={({ item }) => {
            const price =
              item.currency_unit === "lakhs" ? `${item.price} Lakhs` : item.currency_unit === "kyats" ? `${item.price.toLocaleString()} Ks` : `$${item.price}`;
            const image = item.images?.[0];
            const regionName = item.states_regions
              ? item.states_regions.name_mm || item.states_regions.name_en
              : "";
            const townshipName = item.townships
              ? item.townships.name_mm || item.townships.name_en
              : "";

            const isCompleted = item.is_sold || item.is_rented;

            return (
              <View className="bg-white rounded-2xl overflow-hidden border border-primary-200">
                <TouchableOpacity onPress={() => router.push(`/detail?id=${item.id}` as any)}>
                  {image && (
                    <Image source={{ uri: image }} className="w-full h-36" resizeMode="cover" />
                  )}
                  <View className="px-4 pt-3 pb-2 gap-1">
                    <Text className="text-black-100 text-xs font-rubik" numberOfLines={1}>
                      {regionName} | {townshipName}
                    </Text>
                    <View className="flex-row items-center gap-2">
                      <View className="bg-primary-100 px-2.5 py-0.5 rounded-full">
                        <Text className="text-primary-300 text-xs font-rubik-semibold capitalize">
                          {item.property_type || "Property"}
                        </Text>
                      </View>
                      {isCompleted && (
                        <View
                          className={`px-2.5 py-0.5 rounded-full ${
                            item.is_sold ? "bg-danger/10" : "bg-amber-100"
                          }`}
                        >
                          <Text
                            className={`text-xs font-rubik-semibold ${
                              item.is_sold ? "text-danger" : "text-amber"
                            }`}
                          >
                            {item.is_sold
                              ? t("badge.soldOut") || "Sold Out"
                              : t("profile.tabRentOut") || "Rented"}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-primary-300 text-lg font-rubik-extrabold mt-1">
                      {price}
                    </Text>
                  </View>
                </TouchableOpacity>
                <View className="flex-row items-center justify-between px-4 py-2.5 border-t border-primary-100">
                  <View className="flex-row items-center gap-1.5">
                    <Eye size={16} color="#8C8E98" />
                    <Text className="text-black-100 text-xs font-rubik-medium">
                      {item.views ?? 0}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-4">
                    <TouchableOpacity
                      onPress={() => router.push(`/detail?id=${item.id}` as any)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Eye size={18} color="#134686" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDelete(item.id)}
                      disabled={deleting === item.id}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      {deleting === item.id ? (
                        <ActivityIndicator size="small" color="#ED3F27" />
                      ) : (
                        <Trash2 size={18} color="#ED3F27" />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* DELETE DIALOG */}
      <AlertDialog
        isOpen={!!alertDialog}
        onClose={() => setAlertDialog(null)}
        useRNModal={true}
      >
        <AlertDialog.Backdrop />
        <AlertDialog.Content className="p-7 rounded-3xl bg-white w-5/6 items-center shadow-xl">
          <AlertDialog.Header>
            <Heading className="text-black-300 font-rubik-bold text-lg">
              {alertDialog?.title || ""}
            </Heading>
          </AlertDialog.Header>
          <AlertDialog.Body className="pb-5">
            <Text className="text-center text-black-200 font-rubik">
              {alertDialog?.message || ""}
            </Text>
          </AlertDialog.Body>
          <AlertDialog.Footer className="w-full">
            <View className="flex-row gap-3 w-full">
              {alertDialog?.showCancel && (
                <Button
                  className="flex-1 bg-primary-200"
                  onPress={() => setAlertDialog(null)}
                >
                  <ButtonText className="text-black-300">
                    {isBurmese ? "မလုပ်တော့ပါ" : "Cancel"}
                  </ButtonText>
                </Button>
              )}
              <Button
                onPress={() => {
                  setAlertDialog(null);
                  if (alertDialog?.onConfirm) alertDialog.onConfirm();
                }}
                className="flex-1 bg-primary-300"
              >
                <ButtonText className="text-white">
                  {isBurmese ? "သေချာပါသည်" : "OK"}
                </ButtonText>
              </Button>
            </View>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog>
    </SafeAreaView>
  );
}
