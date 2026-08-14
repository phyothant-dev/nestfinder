import { supabase } from "@/shared/lib/supabase";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ChevronDown, Eye, Search, X } from "lucide-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlashList } from "@shopify/flash-list";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackButton } from "@/shared/components/BackButton";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

const PROPERTY_TYPES = [
  { label: "အားလုံး", value: "" },
  { label: "တိုက်ခန်း", value: "apartment" },
  { label: "ကွန်ဒို", value: "condo" },
  { label: "လုံးချင်းအိမ်", value: "house" },
  { label: "မြေကွက်", value: "land" },
  { label: "အဆောင်", value: "hostel" },
];

const PRICE_OPTIONS = [
  { label: "အားလုံး", value: "" },
  ...[5, 10, 20, 30, 50, 100, 150, 200, 250, 300, 400, 500, 600, 700, 800, 900, 1000, 1500, 2000, 2500, 3000, 4000, 5000].map((n) => ({
    label: `${n} (သိန်း)`,
    value: String(n),
  })),
];

interface FilterForm {
  regionId: string;
  townshipId: string;
  propertyType: string;
  priceFrom: string;
  priceTo: string;
}

const EMPTY_FILTER: FilterForm = {
  regionId: "",
  townshipId: "",
  propertyType: "",
  priceFrom: "",
  priceTo: "",
};

export default function WantedListingsScreen() {
  const { i18n } = useTranslation();
  const isBurmese = i18n.language === "mm" || i18n.language?.startsWith("my");

  const [buyListings, setBuyListings] = useState<any[]>([]);
  const [rentListings, setRentListings] = useState<any[]>([]);
  const [buyLoading, setBuyLoading] = useState(true);
  const [rentLoading, setRentLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"buy" | "rent">("buy");

  const [showFilter, setShowFilter] = useState(false);
  const [filterForm, setFilterForm] = useState<FilterForm>(EMPTY_FILTER);
  const [appliedFilters, setAppliedFilters] = useState<Record<"buy" | "rent", FilterForm>>({ buy: EMPTY_FILTER, rent: EMPTY_FILTER });

  const [rawRegions, setRawRegions] = useState<any[]>([]);
  const [rawTownships, setRawTownships] = useState<any[]>([]);

  const translateX = useRef(new Animated.Value(0)).current;
  const tabRef = useRef(activeTab);
  tabRef.current = activeTab;

  useEffect(() => {
    async function fetchLocations() {
      const [regionsRes, townshipsRes] = await Promise.all([
        supabase.from("states_regions").select("id, name_en, name_mm").order("name_en"),
        supabase.from("townships").select("id, region_id, name_en, name_mm").order("name_en"),
      ]);
      if (regionsRes.data) setRawRegions(regionsRes.data);
      if (townshipsRes.data) setRawTownships(townshipsRes.data);
    }
    fetchLocations();
  }, []);

  const regionOptions = useMemo(() => {
    const formatted = rawRegions.map((r) => ({
      label: r.name_mm || r.name_en,
      value: String(r.id),
    }));
    return [{ label: "ပြည်နယ်နှင့်တိုင်းဒေသကြီးအားလုံး", value: "" }, ...formatted];
  }, [rawRegions]);

  const townshipOptions = useMemo(() => {
    const subset = filterForm.regionId
      ? rawTownships.filter((t) => String(t.region_id) === filterForm.regionId)
      : rawTownships;
    const formatted = subset.map((t) => ({
      label: t.name_mm || t.name_en,
      value: String(t.id),
    }));
    return [{ label: "မြို့နယ်အားလုံး", value: "" }, ...formatted];
  }, [rawTownships, filterForm.regionId]);

  const hasActiveFilter = !!(appliedFilters.buy.regionId || appliedFilters.buy.townshipId || appliedFilters.buy.propertyType || appliedFilters.buy.priceFrom || appliedFilters.buy.priceTo || appliedFilters.rent.regionId || appliedFilters.rent.townshipId || appliedFilters.rent.propertyType || appliedFilters.rent.priceFrom || appliedFilters.rent.priceTo);

  const filterListings = (listings: any[], filter: FilterForm) => {
    return listings.filter((item) => {
      if (filter.regionId && String(item.region_id) !== filter.regionId) return false;
      if (filter.townshipId && String(item.township_id) !== filter.townshipId) return false;
      if (filter.propertyType && item.property_type !== filter.propertyType) return false;
      if (filter.priceFrom) {
        const min = parseFloat(filter.priceFrom);
        const max = item.budget_max ?? item.budget_min ?? 0;
        if (max < min) return false;
      }
      if (filter.priceTo) {
        const max = parseFloat(filter.priceTo);
        const min = item.budget_min ?? item.budget_max ?? 0;
        if (min > max) return false;
      }
      return true;
    });
  };

  const filteredBuy = useMemo(() => filterListings(buyListings, appliedFilters.buy), [buyListings, appliedFilters.buy]);
  const filteredRent = useMemo(() => filterListings(rentListings, appliedFilters.rent), [rentListings, appliedFilters.rent]);

  const fetchBuy = async (isPull = false) => {
    try {
      if (isPull) setRefreshing(true); else setBuyLoading(true);
      const { data } = await supabase
        .from("wanted_listings")
        .select("*, profiles(full_name), states_regions(name_en, name_mm), townships(name_en, name_mm)")
        .eq("status", "active")
        .eq("deal_type", "buy")
        .order("created_at", { ascending: false });
      setBuyListings(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      if (isPull) setRefreshing(false); else setBuyLoading(false);
    }
  };

  const fetchRent = async (isPull = false) => {
    try {
      if (isPull) setRefreshing(true); else setRentLoading(true);
      const { data } = await supabase
        .from("wanted_listings")
        .select("*, profiles(full_name), states_regions(name_en, name_mm), townships(name_en, name_mm)")
        .eq("status", "active")
        .eq("deal_type", "rent")
        .order("created_at", { ascending: false });
      setRentListings(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      if (isPull) setRefreshing(false); else setRentLoading(false);
    }
  };

  const goToTab = (tab: "buy" | "rent") => {
    setActiveTab(tab);
    tabRef.current = tab;
    Animated.timing(translateX, {
      toValue: tab === "buy" ? 0 : -SCREEN_WIDTH,
      duration: 280,
      useNativeDriver: true,
      isInteraction: false,
    }).start();
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchBuy();
      fetchRent();
    }, []),
  );

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.2,
      onPanResponderMove: (_, g) => {
        const offset = tabRef.current === "buy" ? g.dx : -SCREEN_WIDTH + g.dx;
        translateX.setValue(offset);
      },
      onPanResponderRelease: (_, g) => {
        const current = tabRef.current;
        const pageX = current === "buy" ? g.dx : -SCREEN_WIDTH + g.dx;
        const shouldSnapBuy = pageX > -SWIPE_THRESHOLD;
        const target = shouldSnapBuy ? "buy" : "rent";
        goToTab(target);
      },
    }),
  ).current;

  const currentTabHasFilter = !!(appliedFilters[activeTab].regionId || appliedFilters[activeTab].townshipId || appliedFilters[activeTab].propertyType || appliedFilters[activeTab].priceFrom || appliedFilters[activeTab].priceTo);

  const handleBack = () => {
    if (currentTabHasFilter) {
      setAppliedFilters((prev) => ({ ...prev, [activeTab]: EMPTY_FILTER }));
    } else if (activeTab === "rent") {
      goToTab("buy");
    } else {
      router.replace("/(tabs)");
    }
  };

  const filters = [
    { id: "buy" as const, label: isBurmese ? "အိမ်ဝယ်လိုသူများ" : "People looking to buy a house" },
    { id: "rent" as const, label: isBurmese ? "အိမ်ငှားလိုသူများ" : "People looking to rent a house" },
  ];

  const propertyTypeMap: Record<string, string> = {
    apartment: "တိုက်ခန်း",
    condo: "ကွန်ဒို",
    house: "လုံးချင်းအိမ်",
    land: "မြေကွက်",
    hostel: "အဆောင်",
  };

  const renderItem = (item: any) => {
    const regionName = item.states_regions ? item.states_regions.name_mm : "";
    const townshipName = item.townships ? item.townships.name_mm : "";
    const propertyType = item.property_type ? propertyTypeMap[item.property_type] ?? item.property_type : null;
    const hasBudget = item.budget_min || item.budget_max;
    const currencyLabel = item.currency_unit === "usd" ? "USD" : "သိန်း";

    return (
      <TouchableOpacity
        onPress={() => router.push(`/wanted/${item.id}` as any)}
        className="bg-white rounded-2xl border border-gray-200 mb-3 mx-5 shadow-sm"
        activeOpacity={0.85}
      >
        <View className="px-4 pt-4 pb-3">
          <Text className="text-black-300 text-base font-rubik-bold" numberOfLines={1}>
            {item.title}
          </Text>

          <Text className="text-amber text-sm font-rubik-medium mt-1.5" numberOfLines={1}>
            {regionName}{townshipName ? ` | ${townshipName}` : ""}
          </Text>

          {propertyType && (
            <Text className="text-gray-600 text-sm font-rubik-medium mt-1.5">
              {propertyType}
            </Text>
          )}

          {hasBudget && (
            <Text className="text-primary-300 text-[15px] font-rubik-bold mt-2">
              {item.budget_min && item.budget_max
                ? `${item.budget_min.toLocaleString()} မှ ${item.budget_max.toLocaleString()} ${currencyLabel} အတွင်း`
                : item.budget_min
                  ? `${item.budget_min.toLocaleString()}+ ${currencyLabel}`
                  : `အမြင့်ဆုံး ${item.budget_max.toLocaleString()} ${currencyLabel}`}
            </Text>
          )}
        </View>

        <View className="border-t border-gray-100 items-center py-2.5">
          <Eye size={14} color="#9CA3AF" />
        </View>
      </TouchableOpacity>
    );
  };

  const listProps = (data: any[], loading: boolean) => ({
    data,
    renderItem: ({ item }: any) => renderItem(item),
    keyExtractor: (item: any) => item.id,
    contentContainerClassName: "pb-10",
    showsVerticalScrollIndicator: false,
    refreshControl: (
      <RefreshControl
        refreshing={refreshing}
        onRefresh={() => { fetchBuy(true); fetchRent(true); }}
        colors={["#134686"]}
        tintColor="#134686"
      />
    ),
    ListEmptyComponent: loading ? (
      <ActivityIndicator size="large" className="text-primary-300 mt-10" />
    ) : (
      <View className="items-center py-12">
        <Text className="text-black-100 font-rubik-medium text-base">
          {hasActiveFilter ? "ရလဒ်မတွေ့ပါ" : "ကြော်ငြာများမရှိသေးပါ"}
        </Text>
      </View>
    ),
  });

  const Dropdown = ({
    label,
    value,
    options,
    onSelect,
  }: {
    label: string;
    value: string;
    options: { label: string; value: string }[];
    onSelect: (val: string) => void;
  }) => {
    const [open, setOpen] = useState(false);
    const selected = options.find((o) => o.value === value);
    return (
      <View className="mb-4">
        <Text className="text-sm font-rubik-medium text-gray-700 mb-1.5">{label}</Text>
        <TouchableOpacity
          onPress={() => setOpen(!open)}
          className="flex-row items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-4 py-3"
        >
          <Text className={`text-sm font-rubik ${selected && selected.value ? "text-black-300" : "text-gray-400"}`}>
            {selected?.label || "ရွေးချယ်ပါ"}
          </Text>
          <ChevronDown size={18} color="#9CA3AF" />
        </TouchableOpacity>
        {open && (
          <View className="bg-white border border-gray-200 rounded-xl mt-1 max-h-48 overflow-hidden">
            <ScrollView nestedScrollEnabled>
              {options.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => { onSelect(opt.value); setOpen(false); }}
                  className={`px-4 py-3 border-b border-gray-100 ${opt.value === value ? "bg-primary-100" : ""}`}
                >
                  <Text className={`text-sm font-rubik ${opt.value === value ? "text-primary-300 font-rubik-semibold" : "text-black-300"}`}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <StatusBar style="dark" />
      <View className="px-5 pt-2 pb-3 border-b border-primary-100">
        <View className="flex-row items-center justify-between">
          <BackButton onPress={handleBack} />
           <Text className="text-lg font-rubik-bold text-black-300">
            {isBurmese ? "ဝယ်/ငှားလိုသော ကြော်ငြာများ" : "Wanted Listings"}
          </Text>
          <View className="w-10" />
        </View>

        <View className="flex-row mt-4 border-b border-primary-100">
          {filters.map((f) => (
            <TouchableOpacity
              key={f.id}
              onPress={() => goToTab(f.id)}
              className="flex-1 items-center pb-2"
            >
              <Text
                className={`text-sm font-rubik-medium text-center ${activeTab === f.id ? "text-primary-300" : "text-black-100"}`}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
          <Animated.View
            className="absolute bottom-0 w-1/2 h-0.5 bg-primary-300 rounded-full"
            style={{
              transform: [{
                translateX: translateX.interpolate({
                  inputRange: [-SCREEN_WIDTH, 0],
                  outputRange: [SCREEN_WIDTH / 2, 0],
                  extrapolate: "clamp",
                }),
              }],
            }}
          />
        </View>
      </View>

      <View className="flex-1" {...panResponder.panHandlers}>
        <Animated.View
          className="flex-row"
          style={{
            width: SCREEN_WIDTH * 2,
            flex: 1,
            transform: [{ translateX }],
          }}
        >
          <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
            <FlashList {...listProps(filteredBuy, buyLoading)} />
          </View>
          <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
            <FlashList {...listProps(filteredRent, rentLoading)} />
          </View>
        </Animated.View>
      </View>

      {!currentTabHasFilter && (
        <TouchableOpacity
          onPress={() => { setFilterForm(appliedFilters[activeTab]); setShowFilter(true); }}
          className="absolute bottom-20 right-6 w-14 h-14 bg-primary-300 rounded-full items-center justify-center shadow-lg"
          activeOpacity={0.85}
        >
          <Search size={24} color="white" />
        </TouchableOpacity>
      )}

      <Modal visible={showFilter} animationType="slide" transparent>
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-white rounded-t-3xl max-h-[85%]">
            <View className="flex-row items-center justify-between px-5 pt-5 pb-3">
              <Text className="text-lg font-rubik-bold text-black-300">
                ရှာဖွေရန်
              </Text>
              <TouchableOpacity onPress={() => { setFilterForm(EMPTY_FILTER); setShowFilter(false); }} className="w-8 h-8 items-center justify-center rounded-full bg-gray-100">
                <X size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView className="px-5 pt-2 pb-6" showsVerticalScrollIndicator={false}>
              <Dropdown
                label="ပြည်နယ်နှင့်တိုင်းဒေသကြီး"
                value={filterForm.regionId}
                options={regionOptions}
                onSelect={(val) => setFilterForm((p) => ({ ...p, regionId: val, townshipId: "" }))}
              />

              <Dropdown
                label="မြို့နယ်"
                value={filterForm.townshipId}
                options={townshipOptions}
                onSelect={(val) => setFilterForm((p) => ({ ...p, townshipId: val }))}
              />

              <Dropdown
                label="အိမ်ခြံမြေအမျိုးအစား"
                value={filterForm.propertyType}
                options={PROPERTY_TYPES}
                onSelect={(val) => setFilterForm((p) => ({ ...p, propertyType: val }))}
              />

              <Dropdown
                label="ဈေးနှုန်း မှ"
                value={filterForm.priceFrom}
                options={PRICE_OPTIONS}
                onSelect={(val) => setFilterForm((p) => ({ ...p, priceFrom: val }))}
              />

              <Dropdown
                label="ဈေးနှုန်း အတွင်း"
                value={filterForm.priceTo}
                options={PRICE_OPTIONS}
                onSelect={(val) => setFilterForm((p) => ({ ...p, priceTo: val }))}
              />

              <TouchableOpacity
                  onPress={() => { setAppliedFilters((prev) => ({ ...prev, [activeTab]: filterForm })); setShowFilter(false); }}
                  className="py-3.5 rounded-xl bg-primary-300 items-center"
                >
                  <Text className="text-sm font-rubik-semibold text-white">
                    ရှာမည်
                  </Text>
                </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
