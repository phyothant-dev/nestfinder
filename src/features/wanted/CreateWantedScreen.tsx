import { supabase } from "@/shared/lib/supabase";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackButton } from "@/shared/components/BackButton";
import { SelectField } from "@/shared/components/actionsheet/actionsheet";
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

interface Region {
  id: string;
  name_en: string;
  name_mm: string;
}

interface Township {
  id: string;
  region_id: string;
  name_en: string;
  name_mm: string;
}

export default function CreateWantedScreen() {
  const { t, i18n } = useTranslation();
  const isBurmese = i18n.language === "mm" || i18n.language?.startsWith("my");

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [dealType, setDealType] = useState<"buy" | "rent">("buy");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [propertyType, setPropertyType] = useState<string | null>(null);
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [phone, setPhone] = useState("");
  const [regions, setRegions] = useState<Region[]>([]);
  const [townships, setTownships] = useState<Township[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedTownship, setSelectedTownship] = useState<string | null>(null);

  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    isSuccess?: boolean;
  }>({ visible: false, title: "", message: "" });

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.replace("/(auth)/login");
          return;
        }
        setUser(user);

        const { data: profile } = await supabase
          .from("profiles")
          .select("phone")
          .eq("id", user.id)
          .single();
        if (profile?.phone) setPhone(profile.phone);

        const { data: r } = await supabase
          .from("states_regions")
          .select("id, name_en, name_mm")
          .order("name_en");
        setRegions(r || []);

        setLoading(false);
      })();
    }, []),
  );

  const loadTownships = async (regionId: string) => {
    setSelectedRegion(regionId);
    setSelectedTownship(null);
    const { data } = await supabase
      .from("townships")
      .select("id, region_id, name_en, name_mm")
      .eq("region_id", regionId)
      .order("name_en");
    setTownships(data || []);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setAlertConfig({
        visible: true,
        title: t("createWanted.notice"),
        message: t("createWanted.enterTitle"),
      });
      return;
    }
    if (!phone.trim()) {
      setAlertConfig({
        visible: true,
        title: t("createWanted.notice"),
        message: t("createWanted.enterPhone"),
      });
      return;
    }

    try {
      setSubmitting(true);

      const { error } = await supabase.from("wanted_listings").insert({
        user_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        deal_type: dealType,
        property_type: propertyType || null,
        region_id: selectedRegion,
        township_id: selectedTownship,
        budget_min: budgetMin ? parseFloat(budgetMin) : null,
        budget_max: budgetMax ? parseFloat(budgetMax) : null,
        contact_phone: phone.trim(),
        status: "active",
      });

      if (error) throw error;

      setAlertConfig({
        visible: true,
        title: t("createWanted.success"),
        message: t("createWanted.posted"),
        isSuccess: true,
      });
    } catch (err: any) {
      setAlertConfig({
        visible: true,
        title: t("createWanted.error"),
        message: err.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const regionData = regions.map((r) => ({
    label: isBurmese ? r.name_mm : r.name_en,
    value: r.id,
  }));

  const townshipData = townships.map((t) => ({
    label: isBurmese ? t.name_mm : t.name_en,
    value: t.id,
  }));

  const propertyTypes = [
    { label: isBurmese ? "တိုက်ခန်း" : "Apartment", value: "apartment" },
    { label: isBurmese ? "မီနီကွန်ဒို" : "Mini Condo", value: "mini_condo" },
    { label: isBurmese ? "ကွန်ဒို" : "Condo", value: "condo" },
    { label: isBurmese ? "လုံးချင်းအိမ်" : "House", value: "house" },
    { label: isBurmese ? "မြေကွက်" : "Land", value: "land" },
    { label: isBurmese ? "ဆိုင်ခန်း / ရုံးခန်း" : "Shop / Office", value: "shop_office" },
    { label: isBurmese ? "စက်မှုဇုန်" : "Industrial Zone", value: "industrial_zone" },
    { label: isBurmese ? "ဟိုတယ် / စားသောက်ဆိုင်" : "Hotel / Restaurant", value: "hotel_restaurant" },
  ];

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#134686" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="px-5 pt-2 pb-3 border-b border-primary-100 flex-row items-center">
        <BackButton onPress={() => router.replace("/wanted")} />
        <Text className="text-lg font-rubik-bold text-black-300 ml-3">
          {isBurmese
            ? "ဝယ်/ငှားလိုကြော်ငြာအသစ်"
            : "New Wanted Listing"}
        </Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="px-5 pt-5 pb-10"
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-row gap-2 mb-5">
            <TouchableOpacity
              onPress={() => setDealType("buy")}
              className={`flex-1 py-3 rounded-2xl items-center ${dealType === "buy" ? "bg-primary-300" : "bg-primary-100"}`}
            >
              <Text
                className={`font-rubik-bold text-sm ${dealType === "buy" ? "text-white" : "text-black-200"}`}
              >
                {isBurmese ? "ဝယ်ယူရန်" : "Want to Buy"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setDealType("rent")}
              className={`flex-1 py-3 rounded-2xl items-center ${dealType === "rent" ? "bg-primary-300" : "bg-primary-100"}`}
            >
              <Text
                className={`font-rubik-bold text-sm ${dealType === "rent" ? "text-white" : "text-black-200"}`}
              >
                {isBurmese ? "ငှားရမ်းရန်" : "Want to Rent"}
              </Text>
            </TouchableOpacity>
          </View>

          <Text className="text-black-200 font-rubik-medium mb-2">
            {isBurmese ? "ခေါင်းစဉ် *" : "Title *"}
          </Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder={
              isBurmese
                ? "ဥပမာ - မရမ်းကုန်းမြို့နယ်တွင် တိုက်ခန်းရှာနေပါသည်"
                : "e.g. Looking for an apartment in Mayangone"
            }
            className="bg-primary-100 border border-primary-200 rounded-2xl px-4 py-4 text-black-300 font-rubik mb-4"
          />

          <Text className="text-black-200 font-rubik-medium mb-2">
            {isBurmese ? "အသေးစိတ်ဖော်ပြချက်" : "Description"}
          </Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder={
              isBurmese
                ? "သင်ရှာနေသောအိမ်ခြံမြေအကြောင်း အသေးစိတ်ရေးပါ..."
                : "Describe what you're looking for..."
            }
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            className="bg-primary-100 border border-primary-200 rounded-2xl px-4 py-4 text-black-300 font-rubik mb-4"
            style={{ minHeight: 100 }}
          />

          <Text className="text-black-200 font-rubik-medium mb-2">
            {isBurmese ? "အိမ်ခြံမြေအမျိုးအစား" : "Property Type"}
          </Text>
          <SelectField
            options={propertyTypes}
            value={propertyType}
            onSelect={(val) => setPropertyType(val)}
            placeholder={isBurmese ? "အမျိုးအစားရွေးပါ" : "Select property type"}
            className="mb-4"
          />

          <View className="flex-row gap-3 mb-4">
            <View className="flex-1">
              <Text className="text-black-200 font-rubik-medium mb-2">
                {isBurmese ? "အနည်းဆုံးဈေး (သိန်း)" : "Min Price (Lakh)"}
              </Text>
              <TextInput
                value={budgetMin}
                onChangeText={setBudgetMin}
                keyboardType="numeric"
                placeholder={isBurmese ? "ဥပမာ - 300" : "e.g. 300"}
                className="bg-primary-100 border border-primary-200 rounded-2xl px-4 py-4 text-black-300 font-rubik"
              />
            </View>
            <View className="flex-1">
              <Text className="text-black-200 font-rubik-medium mb-2">
                {isBurmese ? "အများဆုံးဈေး (သိန်း)" : "Max Price (Lakh)"}
              </Text>
              <TextInput
                value={budgetMax}
                onChangeText={setBudgetMax}
                keyboardType="numeric"
                placeholder={isBurmese ? "ဥပမာ - 1000" : "e.g. 1000"}
                className="bg-primary-100 border border-primary-200 rounded-2xl px-4 py-4 text-black-300 font-rubik"
              />
            </View>
          </View>

          <Text className="text-black-200 font-rubik-medium mb-2">
            {isBurmese ? "တိုင်းဒေသကြီး / ပြည်နယ်" : "State / Region"}
          </Text>
          <SelectField
            options={regionData}
            value={selectedRegion}
            onSelect={(val) => loadTownships(val)}
            placeholder={isBurmese ? "တိုင်းဒေသကြီး / ပြည်နယ်ရွေးပါ" : "Select state/region"}
            className="mb-4"
          />

          {selectedRegion && (
            <>
              <Text className="text-black-200 font-rubik-medium mb-2">
                {isBurmese ? "မြို့နယ်" : "Township"}
              </Text>
              <SelectField
                options={townshipData}
                value={selectedTownship}
                onSelect={(val) => setSelectedTownship(val)}
                placeholder={isBurmese ? "မြို့နယ်ရွေးပါ" : "Select township"}
                className="mb-4"
              />
            </>
          )}

          <Text className="text-black-200 font-rubik-medium mb-2">
            {isBurmese ? "ဆက်သွယ်ရန် ဖုန်းနံပါတ် *" : "Contact Phone *"}
          </Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder={isBurmese ? "ဖုန်းနံပါတ်" : "Phone number"}
            className="bg-primary-100 border border-primary-200 rounded-2xl px-4 py-4 text-black-300 font-rubik mb-6"
          />

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={submitting}
            className="bg-primary-300 rounded-2xl py-4 items-center"
          >
            {submitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-rubik-bold text-base">
                {isBurmese ? "ကြော်ငြာတင်မည်" : "Post Listing"}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <AlertDialog
        isOpen={alertConfig.visible}
        onClose={() => {
          setAlertConfig({ ...alertConfig, visible: false });
          if (alertConfig.isSuccess) router.replace("/wanted" as any);
        }}
      >
        <AlertDialogBackdrop />
        <AlertDialogContent className="bg-white rounded-3xl p-6 mx-4">
          <AlertDialogHeader>
            <Heading className="text-black-300 font-rubik-bold text-lg">
              {alertConfig.title}
            </Heading>
          </AlertDialogHeader>
          <AlertDialogBody>
            <Text className="text-black-200 font-rubik text-center">
              {alertConfig.message}
            </Text>
          </AlertDialogBody>
          <AlertDialogFooter>
            <View className="flex-row gap-3 w-full">
              <Button
                variant="outline"
                className="flex-1"
                onPress={() => {
                  setAlertConfig({ ...alertConfig, visible: false });
                  if (alertConfig.isSuccess) router.replace("/wanted" as any);
                }}
              >
                <ButtonText className="text-black-300">
                  {isBurmese ? "ကောင်းပြီ" : "OK"}
                </ButtonText>
              </Button>
            </View>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SafeAreaView>
  );
}
