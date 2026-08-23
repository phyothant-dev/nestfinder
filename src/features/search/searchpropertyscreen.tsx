import { supabase } from "@/shared/lib/supabase";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft, Heart, Share2 } from "lucide-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator, DeviceEventEmitter, Image, ScrollView, TouchableOpacity, View } from "react-native";
import Text from "@/shared/components/Text";
import { AlertDialog } from "@/shared/components/alert-dialog";
import { Button, ButtonText } from "@/shared/components/button/button";
import { Heading } from "@/shared/components/heading/heading";
import { SelectField } from "@/shared/components/actionsheet/actionsheet";

interface SupabaseRegionRow {
  id: string;
  name_en: string;
  name_mm: string;
}
interface SupabaseTownshipRow {
  id: string;
  region_id: string;
  name_en: string;
  name_mm: string;
}
interface ApiDropdownItem {
  label: string;
  value: string;
}
interface Property {
  id: string;
  title_en: string;
  title_mm: string;
  price: number;
  currency_unit: string;
  deal_type: string;
  property_type: string;
  images: string[];
  bedrooms: number;
  bathrooms: number;
  area_value: number;
  area_unit: string;
  created_at: string;
  views?: number;
  states_regions?: { name_en: string; name_mm: string };
  townships?: { name_en: string; name_mm: string };
}

export default function PropertySearchForm() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const isBurmese = i18n.language === "mm" || i18n.language?.startsWith("my");

  const toMyanmarNum = (n: number) =>
    n.toString().replace(/\d/g, (d) => "၀၁၂၃၄၅၆၇၈၉"[parseInt(d)]);

  const [dealType, setDealType] = useState("sale");
  const [, setAgentType] = useState("all");
  const [, setTextSearch] = useState("");

  const ordinal = (n: number) =>
    n % 100 >= 11 && n % 100 <= 13
      ? "th"
      : ["st", "nd", "rd"][(n % 10) - 1] || "th";

  const [rawRegions, setRawRegions] = useState<SupabaseRegionRow[]>([]);
  const [rawTownships, setRawTownships] = useState<SupabaseTownshipRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [alertDialog, setAlertDialog] = useState<{ title: string; message: string } | null>(null);

  const [dropdowns, setDropdowns] = useState({
    stateRegion: "",
    township: "",
    propertyType: "",
    floor: "",
    minPrice: "",
    maxPrice: "",
    rooms: "",
    sqft: "",
  });

  const [results, setResults] = useState<Property[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    return () => {
      setDealType("sale");
      setAgentType("all");
      setTextSearch("");
      setDropdowns({
        stateRegion: "",
        township: "",
        propertyType: "",
        floor: "",
        minPrice: "",
        maxPrice: "",
        rooms: "",
        sqft: "",
      });
      setResults(null);
    };
  }, []);

  useEffect(() => {
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

  const searchParams = useLocalSearchParams();
  const autoSearchDone = useRef(false);

  useEffect(() => {
    if (autoSearchDone.current) return;
    if (searchParams.autoSearch !== "true") return;
    autoSearchDone.current = true;

    setSearching(true);
    setResults([]);

    const dp = searchParams as Record<string, string>;
    const dt = dp.dealType && ["sale", "rent", "building"].includes(dp.dealType) ? dp.dealType : "sale";
    setDealType(dt);
    const dd = {
      stateRegion: dp.stateRegion || "",
      township: dp.township || "",
      propertyType: dp.propertyType || "",
      floor: dp.floor || "",
      minPrice: dp.minPrice || "",
      maxPrice: dp.maxPrice || "",
      rooms: dp.rooms || "",
      sqft: dp.sqft || "",
    };
    setDropdowns(dd);
    handleSearchSubmit({ dealType: dt, dropdowns: dd });
  }, [searchParams]);

  const handleSaveProperty = async (propertyId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/(auth)/login");
      return;
    }
    try {
      if (savedIds.has(propertyId)) {
        const { error } = await supabase
          .from("saved_properties")
          .delete()
          .eq("user_id", user.id)
          .eq("property_id", propertyId);
        if (error) throw error;
        setSavedIds((prev) => {
          const next = new Set(prev);
          next.delete(propertyId);
          return next;
        });
        DeviceEventEmitter.emit("savedPropertiesChanged");
        setAlertDialog({ title: t("common.removed") || "Removed", message: t("property.removedFromSaved") || "Property removed from saved." });
      } else {
        const { error } = await supabase
          .from("saved_properties")
          .insert({ user_id: user.id, property_id: propertyId });
        if (error) throw error;
        setSavedIds((prev) => new Set(prev).add(propertyId));
        DeviceEventEmitter.emit("savedPropertiesChanged");
        setAlertDialog({ title: t("common.saved") || "Saved", message: t("property.savedSuccess") || "Property saved successfully." });
      }
    } catch (err: any) {
      setAlertDialog({ title: t("error.title") || "Error", message: err.message });
    }
  };

  useEffect(() => {
    async function fetchMyanmarLocations() {
      try {
        setIsLoading(true);
        const [regionsRes, townshipsRes] = await Promise.all([
          supabase.from("states_regions").select("id, name_en, name_mm").order("name_en", { ascending: true }),
          supabase.from("townships").select("id, region_id, name_en, name_mm").order("name_en", { ascending: true }),
        ]);
        if (regionsRes.error) throw regionsRes.error;
        if (townshipsRes.error) throw townshipsRes.error;
        setRawRegions(regionsRes.data || []);
        setRawTownships(townshipsRes.data || []);
      } catch {
        setAlertDialog({
          title: t("error.databaseErrorTitle") || "Database Error",
          message: t("error.databaseErrorMessage") || "Could not synchronize geolocation assets.",
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetchMyanmarLocations();
  }, [t]);

  const regionsPool = useMemo<ApiDropdownItem[]>(() => {
    const formatted = rawRegions.map((item) => ({
      label: isBurmese && item.name_mm ? item.name_mm : item.name_en,
      value: item.id,
    }));
    return [{ label: t("filter.allRegions") || "All Regions", value: "" }, ...formatted];
  }, [rawRegions, isBurmese, t]);

  const filteredTownships = useMemo<ApiDropdownItem[]>(() => {
    const subset = dropdowns.stateRegion
      ? rawTownships.filter((twn) => twn.region_id === dropdowns.stateRegion)
      : rawTownships;
    const formatted = subset.map((item) => ({
      label: isBurmese && item.name_mm ? item.name_mm : item.name_en,
      value: item.id,
    }));
    return [{ label: t("filter.allTownships") || "All Townships", value: "" }, ...formatted];
  }, [rawTownships, dropdowns.stateRegion, isBurmese, t]);

  const handleSelectDropdown = (key: keyof typeof dropdowns, value: string) => {
    setDropdowns((prev) => ({ ...prev, [key]: value }));
  };

  const handleSearchSubmit = async (overrides?: { dealType?: string; dropdowns?: typeof dropdowns }) => {
    const dt = overrides?.dealType ?? dealType;
    const dd = overrides?.dropdowns ?? dropdowns;
    setSearching(true);
    setResults(null);
    try {
      let query = supabase.from("properties").select("*, views, states_regions(name_en, name_mm), townships(name_en, name_mm)").eq("is_flagged", false).order("created_at", { ascending: false });

      if (dt) query = query.eq("deal_type", dt);
      if (dd.propertyType) query = query.eq("property_type", dd.propertyType);
      if (dd.stateRegion) query = query.eq("state_region_id", dd.stateRegion);
      if (dd.township) query = query.eq("township_id", dd.township);
      if (dd.floor) query = query.eq("floor", dd.floor);
      if (dd.minPrice) query = query.gte("price", parseInt(dd.minPrice));
      if (dd.maxPrice) query = query.lte("price", parseInt(dd.maxPrice));
      if (dd.rooms) {
        if (dd.rooms === "4") query = query.gte("bedrooms", 4);
        else query = query.eq("bedrooms", parseInt(dd.rooms));
      }
      if (dd.sqft) query = query.gte("sqft", parseInt(dd.sqft));

      const { data, error } = await query;
      if (error) throw error;
      setResults(data || []);
    } catch (err: any) {
      console.error("Search error:", err);
      setAlertDialog({ title: t("error.title"), message: t("error.searchFailed") });
    } finally {
      setSearching(false);
    }
  };

  if (isLoading) {
    return (
      <View className="py-12 items-center justify-center">
        <ActivityIndicator size="small" className="text-primary-300" />
      </View>
    );
  }

  if (results !== null) {
    return (
      <View className="flex-1">
        <View className="flex-row items-center justify-between mb-4">
          <TouchableOpacity onPress={() => setResults(null)} className="flex-row items-center gap-2">
            <ChevronLeft size={22} color="#134686" />
            <Text className="text-primary-300 font-rubik-bold">{t("filter.backToSearch")}</Text>
          </TouchableOpacity>
        </View>
        {!searching && (
          <Text className="text-black-300 font-rubik-bold text-lg mb-3">
            {t("filter.resultsFound", { num: isBurmese ? toMyanmarNum(results.length) : results.length })}
          </Text>
        )}
        {results.length === 0 && !searching ? (
          <View className="py-12 items-center">
            <Text className="text-black-100 font-rubik">{t("filter.noResults") || "No properties found"}</Text>
          </View>
        ) : results.length === 0 && searching ? (
          <View className="py-12 items-center">
            <ActivityIndicator size="small" className="text-primary-300" />
          </View>
        ) : (
          <View style={{ gap: 12, paddingBottom: 24 }}>
            {results.map((item) => {
              const price = item.currency_unit === "lakhs" ? `${item.price} Lakhs` : `$${item.price}`;
              const image = item.images?.[0];
              const regionName = item.states_regions
                ? item.states_regions.name_mm || item.states_regions.name_en
                : "";
              const townshipName = item.townships
                ? item.townships.name_mm || item.townships.name_en
                : "";
              return (
                <View
                  key={item.id}
                  className="bg-white rounded-2xl overflow-hidden border border-primary-200"
                >
                  <TouchableOpacity
                    onPress={() => router.push(`/detail?id=${item.id}` as any)}
                    activeOpacity={0.7}
                  >
                    {image && (
                      <Image source={{ uri: image }} className="w-full h-40" resizeMode="cover" />
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
                      </View>
                      <Text className="text-primary-300 text-lg font-rubik-extrabold mt-1">{price}</Text>
                    </View>
                  </TouchableOpacity>
                  <View className="flex-row items-center justify-end px-4 py-2.5 border-t border-primary-100">
                    <View className="flex-row items-center gap-4">
                    <TouchableOpacity
                      onPress={() => handleSaveProperty(item.id)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Heart
                        size={18}
                        color={savedIds.has(item.id) ? "#ED3F27" : "#8C8E98"}
                        fill={savedIds.has(item.id) ? "#ED3F27" : "transparent"}
                      />
                    </TouchableOpacity>
                    <Share2 size={18} color="#8C8E98" />
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
        <AlertDialog
          isOpen={!!alertDialog}
          onClose={() => setAlertDialog(null)}
          useRNModal={true}
        >
          <AlertDialog.Backdrop />
          <AlertDialog.Content className="p-6 rounded-3xl bg-white w-5/6 items-center shadow-xl">
            <AlertDialog.Header>
              <Heading>{alertDialog?.title || ""}</Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <Text className="text-center text-slate-500">{alertDialog?.message || ""}</Text>
            </AlertDialog.Body>
            <AlertDialog.Footer className="w-full flex-row justify-center">
              <Button onPress={() => setAlertDialog(null)} className="flex-1">
                <ButtonText>{t("alerts_and_dialogs.button_confirm")}</ButtonText>
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Content>
        </AlertDialog>
      </View>
    );
  }

  return (
    <View className="gap-5">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row py-1">
        <View className="flex-row gap-5 items-center pr-6">
          {(["sale", "rent", "building"] as const).map((type) => (
              <TouchableOpacity key={type} onPress={() => setDealType(type)} className="flex-row items-center gap-2">
              <View className={`w-5 h-5 rounded-full border-2 items-center justify-center ${dealType === type ? "border-primary-300" : "border-primary-200"}`}>
                {dealType === type && <View className="w-2.5 h-2.5 bg-primary-300 rounded-full" />}
              </View>
              <Text className="text-black-300 font-rubik-bold text-sm">
                {type === "sale" && (t("filter.forSale") || "For Sale")}
                {type === "rent" && (t("filter.forRent") || "For Rent")}
                {type === "building" && (t("filter.building") || "Building")}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View>
        <SelectField
          options={regionsPool}
          placeholder={t("filter.stateRegion") || "Select State/Region"}
          value={dropdowns.stateRegion}
          onSelect={(val) => {
            setDropdowns((prev) => ({ ...prev, stateRegion: val, township: "" }));
          }}
        />
      </View>

      <View>
        <SelectField
          options={filteredTownships}
          placeholder={t("filter.township") || "Select Township"}
          value={dropdowns.township}
          onSelect={(val) => handleSelectDropdown("township", val)}
        />
      </View>

      <View>
        <SelectField
          options={[
            { label: t("filter.allProperties") || "All Property Types", value: "" },
            { label: t("property.condo") || "Condominium", value: "condo" },
            { label: t("property.apartment") || "Apartment", value: "apartment" },
            { label: t("property.house") || "House / Villa", value: "house" },
            { label: t("property.land") || "Land", value: "land" },
            { label: t("property.hostel") || "Hostel", value: "hostel" },
          ]}
          placeholder={t("filter.propertyType") || "Property Type"}
          value={dropdowns.propertyType}
          onSelect={(val) => {
            setDropdowns((prev) => ({
              ...prev,
              propertyType: val,
              floor: val === "condo" || val === "apartment" ? prev.floor : "",
            }));
          }}
        />
      </View>

      {(dropdowns.propertyType === "condo" || dropdowns.propertyType === "apartment") && (
        <View>
          <SelectField
            options={[
              { label: t("choose floor") || "All Floors", value: "" },
              { label: t("ground floor") || "Ground Floor", value: "ground" },
              { label: t("ground + attic") || "Ground + Attic", value: "ground_attic" },
              ...Array.from({ length: 20 }, (_, i) => ({
                label: `${i + 1}${ordinal(i + 1)} Floor`,
                value: `${i + 1}`,
              })),
            ]}
            placeholder={t("filter.floor") || "Select Floor"}
            value={dropdowns.floor}
            onSelect={(val) => handleSelectDropdown("floor", val)}
          />
        </View>
      )}

      <View className="flex-row gap-3">
        <View className="flex-1">
          <SelectField
            options={[
              { label: "100 Lakhs", value: "100" },
              { label: "500 Lakhs", value: "500" },
              { label: "1000 Lakhs", value: "1000" },
            ]}
            placeholder={t("filter.minPrice") || "Min Price"}
            value={dropdowns.minPrice}
            onSelect={(val) => handleSelectDropdown("minPrice", val)}
          />
        </View>
        <View className="flex-1">
          <SelectField
            options={[
              { label: "2000 Lakhs", value: "2000" },
              { label: "5000 Lakhs", value: "5000" },
              { label: "10000 Lakhs", value: "10000" },
            ]}
            placeholder={t("filter.maxPrice") || "Max Price"}
            value={dropdowns.maxPrice}
            onSelect={(val) => handleSelectDropdown("maxPrice", val)}
          />
        </View>
      </View>

      <View>
        <SelectField
          options={[
            { label: `1 ${t("filter.room") || "Room"}`, value: "1" },
            { label: `2 ${t("filter.rooms") || "Rooms"}`, value: "2" },
            { label: `3 ${t("filter.rooms") || "Rooms"}`, value: "3" },
            { label: `4+ ${t("filter.rooms") || "Rooms"}`, value: "4" },
          ]}
          placeholder={t("filter.rooms") || "Rooms"}
          value={dropdowns.rooms}
          onSelect={(val) => handleSelectDropdown("rooms", val)}
        />
      </View>

      <View>
        <SelectField
          options={[
            { label: "400 Sqft", value: "400" },
            { label: "800 Sqft", value: "800" },
            { label: "1200 Sqft", value: "1200" },
            { label: "2000+ Sqft", value: "2000" },
          ]}
          placeholder={t("filter.sqft") || "Square Feet"}
          value={dropdowns.sqft}
          onSelect={(val) => handleSelectDropdown("sqft", val)}
        />
      </View>

      <TouchableOpacity
        onPress={() => handleSearchSubmit()}
        disabled={searching}
        className="bg-primary-300 w-full py-4 rounded-xl items-center justify-center mt-2"
      >
        {searching ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text className="text-white font-rubik-bold text-lg">
            {t("filter.searchButton") || "Search"}
          </Text>
        )}
      </TouchableOpacity>

      <AlertDialog
        isOpen={!!alertDialog}
        onClose={() => setAlertDialog(null)}
        useRNModal={true}
      >
        <AlertDialog.Backdrop />
        <AlertDialog.Content className="p-6 rounded-3xl bg-white w-5/6 items-center shadow-xl">
          <AlertDialog.Header>
            <Heading>{alertDialog?.title || ""}</Heading>
          </AlertDialog.Header>
          <AlertDialog.Body>
            <Text className="text-center text-slate-500">{alertDialog?.message || ""}</Text>
          </AlertDialog.Body>
          <AlertDialog.Footer className="w-full flex-row justify-center">
            <Button onPress={() => setAlertDialog(null)} className="flex-1">
              <ButtonText>{t("alerts_and_dialogs.button_confirm")}</ButtonText>
            </Button>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog>
    </View>
  );
}
