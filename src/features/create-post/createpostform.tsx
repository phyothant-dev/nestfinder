import { supabase } from "@/shared/lib/supabase";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useFocusEffect, useRouter } from "expo-router";
import { decode } from "base64-arraybuffer";
import { readAsStringAsync } from "expo-file-system/legacy";
import {
  Check,
  Home,
  Image as ImageIcon,
  MapPin,
  Pencil,
  Video,
  X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { SelectField } from "@/shared/components/actionsheet/actionsheet";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackButton } from "@/shared/components/BackButton";

import { AlertDialog } from "@/shared/components/alert-dialog";
import { Button, ButtonText } from "@/shared/components/button/button";
import { Heading } from "@/shared/components/heading/heading";

interface SupabaseRegionRow {
  id: string | number;
  name_en: string;
  name_mm: string;
}

interface SupabaseTownshipRow {
  id: string | number;
  region_id: string | number;
  name_en: string;
  name_mm: string;
}

interface ApiDropdownItem {
  label: string;
  value: string;
}

interface CreatePostFormProps {
  dealType: string;
  dealTitle: string;
  onBack: () => void;
}

function SectionCard({
  title,
  icon,
  completed,
  isBurmese,
  required,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  completed: boolean;
  isBurmese: boolean;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <View className="flex-row items-center gap-3 px-4 py-3 border-b border-gray-50">
        <View
          className={`w-8 h-8 rounded-full items-center justify-center ${
            completed ? "bg-primary-300" : "bg-gray-100"
          }`}
        >
          {completed ? (
            <Check size={16} color="#fff" strokeWidth={3} />
          ) : (
            icon
          )}
        </View>
        <Text className="flex-1 text-sm font-rubik-bold text-gray-800">
          {title}{required ? " *" : ""}
        </Text>
        {completed && (
          <Text className="text-[10px] font-rubik-semibold text-primary-300">
            {isBurmese ? "ပြီးပါပြီ" : "Done"}
          </Text>
        )}
      </View>
      <View className="px-4 py-5 gap-6">{children}</View>
    </View>
  );
}

function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View className="gap-1.5">
      <Text className="text-gray-500 font-rubik-medium text-xs">
        {label}
        {required ? " *" : ""}
      </Text>
      {children}
    </View>
  );
}

export default function CreatePostForm({
  dealType,
  dealTitle,
  onBack,
}: CreatePostFormProps) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const isBurmese = i18n.language === "mm" || i18n.language?.startsWith("my");
  const isHostel = dealType === "hostel";
  const isWantToRent = dealType === "want_to_rent";
  const isWantToBuy = dealType === "want_to_buy";
  const isWanted = isWantToRent || isWantToBuy;

  const [isLoading, setIsLoading] = useState(false);
  const [isMapSyncing, setIsMapSyncing] = useState(true);
  const [monthlyPostCount, setMonthlyPostCount] = useState<number | null>(null);
  const POST_MONTHLY_LIMIT = 5;
  const atPostLimit =
    monthlyPostCount !== null && monthlyPostCount >= POST_MONTHLY_LIMIT;

  const [rawRegions, setRawRegions] = useState<SupabaseRegionRow[]>([]);
  const [rawTownships, setRawTownships] = useState<SupabaseTownshipRow[]>([]);

  const [showDimensions, setShowDimensions] = useState(false);
  const [showAreaBox, setShowAreaBox] = useState(false);

  const [images, setImages] = useState<string[]>([]);
  const [video, setVideo] = useState<string | null>(null);

  const [alertDialog, setAlertDialog] = useState<{
    title: string;
    message: string;
    onConfirm?: () => void;
    showCancel?: boolean;
  } | null>(null);

  const initialFormData = {
    titleMm: "",
    titleEn: "",
    propertyType: isHostel ? "hostel" : "",
    price: "",
    currencyUnit: "lakhs",
    floor: "",
    width: "",
    length: "",
    areaValue: "",
    areaUnit: "sqft",
    bedrooms: "0",
    bathrooms: "0",
    regionId: "",
    townshipId: "",
    phone: "",
    latitude: "",
    longitude: "",
    hostelType: [] as string[],
    roomCapacity: [] as string[],
    descriptionMm: "",
    descriptionEn: "",
    monthlyFeeFrom: "",
    monthlyFeeTo: "",
    areaFrom: "",
    areaTo: "",
    furnishedStatus: "",
    coBrokerage: false,
  };

  const [formData, setFormData] = useState(initialFormData);

  // ── Completion tracking ──────────────────────────────────────────
  const completion = useMemo(() => {
    const basic =
      (formData.titleMm.trim() ? 1 : 0) +
      (formData.titleEn.trim() ? 1 : 0) +
      (formData.propertyType || isHostel ? 1 : 0) +
      (isWanted ? (formData.monthlyFeeFrom || formData.monthlyFeeTo ? 1 : 0) : (formData.price ? 1 : 0));

    const details = isHostel
      ? (formData.hostelType.length > 0 ? 1 : 0) +
        (formData.roomCapacity.length > 0 ? 1 : 0) +
        (formData.descriptionMm.trim() ? 1 : 0) +
        (formData.descriptionEn.trim() ? 1 : 0)
      : isWanted
        ? (formData.areaFrom || formData.areaTo ? 1 : 0) +
          (formData.furnishedStatus ? 1 : 0) +
          (formData.descriptionMm.trim() ? 1 : 0) +
          (formData.descriptionEn.trim() ? 1 : 0)
        : (showDimensions || showAreaBox ? 1 : 0) +
          (formData.bedrooms !== "0" || formData.bathrooms !== "0" ? 1 : 0) +
          (formData.descriptionMm.trim() ? 1 : 0) +
          (formData.descriptionEn.trim() ? 1 : 0);

    const location =
      (formData.regionId ? 1 : 0) +
      (formData.phone.trim() ? 1 : 0) +
      (formData.latitude ? 1 : 0);

    const media = (images.length > 0 ? 1 : 0) + (video ? 1 : 0);

    const totalFields = isHostel ? 10 : isWanted ? 10 : 11;
    const filled = basic + details + location + media;
    return {
      basic: basic >= (isHostel ? 4 : 4),
      details: details >= (isHostel ? 2 : 2),
      location: location >= 2,
      media: media >= 1,
      percent: Math.round((filled / totalFields) * 100),
    };
  }, [formData, isHostel, isWanted, showDimensions, showAreaBox, images, video]);

  // ── Dropdown data ────────────────────────────────────────────────
  const propertyTypes = [
    { label: t("dropdown_options.property_types.0.label", "Apartment"), value: "apartment" },
    { label: t("dropdown_options.property_types.1.label", "Condo"), value: "condo" },
    { label: t("dropdown_options.property_types.2.label", "House"), value: "house" },
    { label: t("dropdown_options.property_types.3.label", "Land"), value: "land" },
    { label: t("dropdown_options.property_types.4.label", "Hostel"), value: "hostel" },
  ];

  const currencyUnits = [
    { label: isBurmese ? "ကျပ် (သိန်း)" : "Kyat (Lakh)", value: "lakhs" },
    { label: "USD", value: "usd" },
  ];

  const floorOptionsDataset = useMemo(
    () => [
      { label: t("ground floor") || "Ground Floor", value: "ground" },
      { label: t("ground + attic") || "Ground + Attic", value: "ground_attic" },
      { label: `${t("floor.st") || "Low Floor (1-4)"}`, value: "low" },
      { label: ` ${t("floor.nd") || "Middle Floor (5-8)"}`, value: "mid" },
      { label: ` ${t("floor.rd") || "High Floor (9+)"}`, value: "high" },
    ],
    [t],
  );

  const roomCountOptions = [
    { label: isBurmese ? "မပါ" : "None", value: "0" },
    { label: "1", value: "1" },
    { label: "2", value: "2" },
    { label: "3", value: "3" },
    { label: "4", value: "4" },
    { label: "5+", value: "5" },
  ];

  const hostelTypeOptions = [
    { label: t("hostel.type_male") || "Male", value: "male" },
    { label: t("hostel.type_female") || "Female", value: "female" },
    { label: t("hostel.type_householder") || "Householder", value: "householder" },
    { label: t("hostel.type_coed") || "Co-ed", value: "co-ed" },
  ];

  const roomCapacityOptions = [
    { label: t("hostel.capacity_1") || "1 Person", value: "1" },
    { label: t("hostel.capacity_2") || "2 Persons", value: "2" },
    { label: t("hostel.capacity_3") || "3 Persons", value: "3" },
    { label: t("hostel.capacity_4") || "4 Persons", value: "4" },
    { label: t("hostel.capacity_5") || "5 Persons", value: "5" },
    { label: t("hostel.capacity_6") || "6 Persons", value: "6" },
    { label: t("hostel.capacity_7") || "7 Persons", value: "7" },
    { label: t("hostel.capacity_8") || "8 Persons", value: "8" },
    { label: t("hostel.capacity_9") || "9 Persons", value: "9" },
    { label: t("hostel.capacity_10") || "10 Persons", value: "10" },
    { label: t("hostel.capacity_hall") || "Hall", value: "hall" },
    { label: t("hostel.capacity_family") || "Family", value: "family" },
  ];

  const areaUnitsDataset = [
    { label: isBurmese ? "စတုရန်းပေ" : "Sqft", value: "sqft" },
    { label: isBurmese ? "ဧက" : "Acre", value: "acre" },
  ];

  const furnishedStatusOptions = [
    { label: isBurmese ? "မပါဝင်" : "Not Furnished", value: "not_furnished" },
    { label: isBurmese ? "တစ်ဝက်ပါဝင်" : "Half Furnished", value: "half_furnished" },
    { label: isBurmese ? "အပြည့်ပါဝင်" : "Full Furnished", value: "full_furnished" },
  ];

  // ── Effects ──────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchMyanmarLocations() {
      try {
        setIsMapSyncing(true);
        const [regionsRes, townshipsRes] = await Promise.all([
          supabase
            .from("states_regions")
            .select("id, name_en, name_mm")
            .order("name_en", { ascending: true }),
          supabase
            .from("townships")
            .select("id, region_id, name_en, name_mm")
            .order("name_en", { ascending: true }),
        ]);

        if (regionsRes.error) throw regionsRes.error;
        if (townshipsRes.error) throw townshipsRes.error;

        setRawRegions(regionsRes.data || []);
        setRawTownships(townshipsRes.data || []);
      } catch {
        setAlertDialog({
          title: t("error.databaseErrorTitle") || "Database Error",
          message: isBurmese ? "တည်နေရာဒေတာ မSync နိုင်ပါ။" : "Could not synchronize geolocation assets.",
          showCancel: false,
          onConfirm: () => setAlertDialog(null),
        });
      } finally {
        setIsMapSyncing(false);
      }
    }
    fetchMyanmarLocations();
  }, [t]);

  useEffect(() => {
    async function fetchMonthlyCount() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.rpc("get_monthly_post_count", { user_uuid: user.id });
      if (data !== null) setMonthlyPostCount(data as number);
    }
    fetchMonthlyCount();
  }, []);

  const regionOptions = useMemo<ApiDropdownItem[]>(() => {
    const formatted = rawRegions.map((item) => ({
      label: isBurmese && item.name_mm ? item.name_mm : item.name_en,
      value: String(item.id).trim(),
    }));
    return [{ label: isBurmese ? "ပြည်နယ်နှင့်တိုင်းဒေသကြီးအားလုံး" : "All States & Regions", value: "" }, ...formatted];
  }, [rawRegions, isBurmese]);

  const activeTownships = useMemo<ApiDropdownItem[]>(() => {
    const subset = formData.regionId
      ? rawTownships.filter((twn) => String(twn.region_id).trim().toLowerCase() === String(formData.regionId).trim().toLowerCase())
      : rawTownships;
    const formatted = subset.map((item) => ({
      label: isBurmese && item.name_mm ? item.name_mm : item.name_en,
      value: String(item.id).trim(),
    }));
    return [{ label: isBurmese ? "မြို့နယ်အားလုံး" : "All Townships", value: "" }, ...formatted];
  }, [rawTownships, formData.regionId, isBurmese]);

  useEffect(() => {
    const w = parseFloat(formData.width);
    const l = parseFloat(formData.length);
    if (!isNaN(w) && !isNaN(l)) {
      setShowAreaBox(true);
      const baseSqft = w * l;
      if (formData.areaUnit === "acre") {
        setFormData((prev) => ({
          ...prev,
          areaValue: String(Number((baseSqft / 43560).toFixed(4))),
        }));
      } else {
        setFormData((prev) => ({ ...prev, areaValue: String(baseSqft) }));
      }
    }
  }, [formData.width, formData.length, formData.areaUnit]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        setIsLoading(false);
        setAlertDialog(null);
        setImages([]);
        setVideo(null);
        setFormData(initialFormData);
        setShowDimensions(false);
        setShowAreaBox(false);
      };
    }, []),
  );

  // ── Helpers ──────────────────────────────────────────────────────
  const handleInputChange = (key: string, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const showAlert = (
    title: string,
    message: string,
    customAction?: () => void,
    showCancel?: boolean,
  ) => {
    setAlertDialog({ title, message, onConfirm: customAction, showCancel });
  };

  const pickImages = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setImages((prev) => {
        const newImages = [...prev, ...result.assets.map((a) => a.uri)];
        return newImages.slice(0, 5);
      });
    }
  };

  const pickVideo = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      const videoAsset: any = result.assets[0];
      if (videoAsset.fileSize && videoAsset.fileSize > 300 * 1024 * 1024) {
        showAlert(
          isBurmese ? "ဗီဒီယို ကြီးလွန်းပါသည်" : "Video Too Large",
          isBurmese ? "ဗီဒီယိုဖိုင် ၃၀၀ MB အောက်ဖြစ်ရပါမည်။" : "Video file size must be under 300 MB."
        );
        return;
      }
      setVideo(videoAsset.uri);
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Submit ───────────────────────────────────────────────────────
  const handleSubmitPost = async () => {
    try {
      setIsLoading(true);
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        showAlert(
          t("alerts_and_dialogs.login_required.title") || "Login Required",
          t("alerts_and_dialogs.login_required.message") || "Please log in to continue.",
        );
        setIsLoading(false);
        return;
      }

      if (!isWanted) {
        const { data: canPost } = await supabase.rpc("can_user_post", { user_uuid: user.id });
        if (canPost === false) {
          showAlert(
            isBurmese ? "ကြော်ငြာအရေအတွက် ကန့်သတ်ချက်" : "Post Limit Reached",
            isBurmese
              ? "တစ်လလျှင် ကြော်ငြာ ၅ ခုသာ တင်နိုင်ပါသည်။ လာမည့်လအထိ စောင့်ပါ။"
              : "You can only post 5 advertisements per month. Please wait until next month.",
          );
          setIsLoading(false);
          return;
        }
      }

      // Validate required fields
      if (!formData.titleMm.trim()) {
        showAlert(
          isBurmese ? "မြန်မာလိုခေါင်းစဉ်ထည့်ရန် လိုအပ်ပါသည်" : "Title Required",
          isBurmese ? "ကျေးဇူးပြု၍ မြန်မာလိုခေါင်းစဉ် ထည့်ပါ။" : "Please enter a title in Burmese.",
        );
        setIsLoading(false);
        return;
      }
      if (!formData.propertyType && !isHostel) {
        showAlert(
          isBurmese ? "အိမ်ခြံမြေအမျိုးအစားရွေးပါ" : "Property Type Required",
          isBurmese ? "ကျေးဇူးပြု၍ အိမ်ခြံမြေအမျိုးအစားကို ရွေးချယ်ပါ။" : "Please select a property type.",
        );
        setIsLoading(false);
        return;
      }
      if (!formData.price && !isWanted) {
        showAlert(
          isBurmese ? "စျေးနှုန်းထည့်ရန် လိုအပ်ပါသည်" : "Price Required",
          isBurmese ? "ကျေးဇူးပြု၍ စျေးနှုန်းထည့်ပါ။" : "Please enter a price.",
        );
        setIsLoading(false);
        return;
      }
      if (isWanted && !formData.monthlyFeeFrom && !formData.monthlyFeeTo) {
        showAlert(
          isBurmese
            ? `လစဉ်ငှားရမ်းခထည့်ရန် လိုအပ်ပါသည်`
            : "Budget or Monthly Fee Required",
          isBurmese
            ? "ကျေးဇူးပြု၍ ငွေကြေးပမာဏ ထည့်ပါ။"
            : "Please enter at least one amount.",
        );
        setIsLoading(false);
        return;
      }
      if (isWanted && !formData.furnishedStatus) {
        showAlert(
          isBurmese ? "ဖာနီးရှားပါဝင်မှု ရွေးပါ" : "Furnished Status Required",
          isBurmese ? "ကျေးဇူးပြု၍ ဖာနီးရှားပါဝင်မှုကို ရွေးချယ်ပါ။" : "Please select a furnished status.",
        );
        setIsLoading(false);
        return;
      }
      if (!formData.phone) {
        showAlert(
          isBurmese ? "ဖုန်းနံပါတ်ထည့်ရန် လိုအပ်ပါသည်" : "Phone Number Required",
          isBurmese ? "ကျေးဇူးပြု၍ ဆက်သွယ်ရန်ဖုန်းနံပါတ်ထည့်ပါ။" : "Please enter a contact phone number.",
        );
        setIsLoading(false);
        return;
      }

      // ── wanted (want_to_rent / want_to_buy) → save to wanted_listings ─────
      if (isWanted) {
        const wantedPayload = {
          user_id: user.id,
          title: formData.titleEn || formData.titleMm,
          description: [formData.descriptionMm, formData.descriptionEn].filter(Boolean).join("\n---\n") || null,
          deal_type: isWantToRent ? "rent" : "buy",
          property_type: formData.propertyType || null,
          region_id: formData.regionId || null,
          township_id: formData.townshipId || null,
          budget_min: formData.monthlyFeeFrom ? parseFloat(formData.monthlyFeeFrom) : null,
          budget_max: formData.monthlyFeeTo ? parseFloat(formData.monthlyFeeTo) : null,
          contact_phone: formData.phone,
          currency_unit: formData.currencyUnit,
          monthly_fee_from: formData.monthlyFeeFrom ? parseFloat(formData.monthlyFeeFrom) : null,
          monthly_fee_to: formData.monthlyFeeTo ? parseFloat(formData.monthlyFeeTo) : null,
          area_from: formData.areaFrom ? parseFloat(formData.areaFrom) : null,
          area_to: formData.areaTo ? parseFloat(formData.areaTo) : null,
          area_unit: formData.areaUnit,
          furnished_status: formData.furnishedStatus || null,
          floor: ["apartment", "condo"].includes(formData.propertyType) ? formData.floor : null,
          bedrooms: parseInt(formData.bedrooms) || null,
          bathrooms: parseInt(formData.bathrooms) || null,
          co_brokerage: formData.coBrokerage,
          status: "active",
        };

        const { error } = await supabase.from("wanted_listings").insert(wantedPayload);
        if (error) throw error;

        setIsLoading(false);
        showAlert(
          isBurmese ? "အောင်မြင်ပါသည်" : "Submission Successful",
          isBurmese
            ? "သင့်ကြော်ငြာကို အောင်မြင်စွာ တင်ပြီးပါပြီ။"
            : "Your wanted listing has been posted.",
          () => router.replace("/wanted" as any),
        );
        return;
      }

      // ── Upload images ──────────────────────────────────────────
      const uploadedImageUrls: string[] = [];
      for (const localUri of images) {
        const fileName = `${user.id}/img_${Date.now()}_${Math.floor(Math.random() * 1000)}.jpg`;
        const base64 = await readAsStringAsync(localUri, { encoding: "base64" });
        const { error: uploadError } = await supabase.storage
          .from("property-media")
          .upload(fileName, decode(base64), { contentType: "image/jpeg", upsert: true });
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from("property-media").getPublicUrl(fileName);
        uploadedImageUrls.push(publicUrl);
      }

      // Upload video
      let uploadedVideoUrl: string | null = null;
      if (video) {
        const videoName = `${user.id}/vid_${Date.now()}.mp4`;
        const base64Video = await readAsStringAsync(video, { encoding: "base64" });
        const { error: vidError } = await supabase.storage
          .from("property-media")
          .upload(videoName, decode(base64Video), { contentType: "video/mp4", upsert: true });
        if (vidError) throw vidError;
        const { data: { publicUrl } } = supabase.storage.from("property-media").getPublicUrl(videoName);
        uploadedVideoUrl = publicUrl;
      }

      const rawWidth = parseFloat(formData.width) || 0;
      const rawLength = parseFloat(formData.length) || 0;
      const computedSqft = rawWidth * rawLength;

      const payload = {
        user_id: user.id,
        deal_type: isHostel ? "rent" : dealType,
        property_type: isHostel ? "hostel" : formData.propertyType,
        price: parseFloat(formData.price),
        currency_unit: isHostel ? "kyats" : formData.currencyUnit,
        floor: !isHostel && ["apartment", "condo"].includes(formData.propertyType) ? formData.floor : null,
        width: isHostel ? null : (formData.width ? parseFloat(formData.width) : null),
        length: isHostel ? null : (formData.length ? parseFloat(formData.length) : null),
        sqft: isHostel ? null : (computedSqft || (formData.areaUnit === "sqft" ? parseFloat(formData.areaValue) : null)),
        area_value: isHostel ? null : (formData.areaValue ? parseFloat(formData.areaValue) : null),
        area_unit: formData.areaUnit || "sqft",
        bedrooms: isHostel ? 0 : parseInt(formData.bedrooms),
        bathrooms: isHostel ? 0 : parseInt(formData.bathrooms),
        state_region_id: formData.regionId || null,
        township_id: formData.townshipId || null,
        search_value: formData.phone,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        title_mm: formData.titleMm || null,
        title_en: formData.titleEn || null,
        images: uploadedImageUrls,
        video_url: uploadedVideoUrl,
        description: [formData.descriptionMm, formData.descriptionEn].filter(Boolean).join("\n---\n") || null,
        hostel_type: formData.hostelType.length ? formData.hostelType.join(",") : null,
        room_capacity: formData.roomCapacity.length ? formData.roomCapacity.join(",") : null,
      };

      const { data: insertedData, error } = await supabase
        .from("properties")
        .insert([payload])
        .select("id, ad_number")
        .single();

      if (error) throw error;

      const formattedAdNumber = `PROP-${10000 + (insertedData?.ad_number || 1)}`;

      if (insertedData?.id) {
        supabase.functions.invoke("notify-new-property", {
          body: {
            propertyId: insertedData.id,
            title: formData.titleEn || formData.titleMm || "",
            price: parseFloat(formData.price),
            dealType: isHostel ? "rent" : dealType,
            propertyType: isHostel ? "hostel" : formData.propertyType,
            stateRegionId: formData.regionId || undefined,
            townshipId: formData.townshipId || undefined,
          },
        }).catch(() => {});
      }

      setIsLoading(false);
      showAlert(
        isBurmese ? "အောင်မြင်ပါသည်" : "Submission Successful",
        isBurmese
          ? `သင့်ကြော်ငြာအား အောင်မြင်စွာ တင်ပြီးပါပြီ။ ကြော်ငြာနံပါတ်မှာ ${formattedAdNumber} ဖြစ်ပါသည်။`
          : `Your listing is live. The Advertisement Number is ${formattedAdNumber}.`,
        () => router.replace("/(tabs)"),
      );
      return;
    } catch (err: any) {
      setIsLoading(false);
      showAlert(isBurmese ? "မှားယွင်းမှု" : "Error", err.message);
      return;
    }
  };

  if (isMapSyncing) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="small" className="text-primary-300" />
        <Text className="text-gray-400 font-rubik-medium text-xs mt-2">
          {isBurmese ? "မြန်မာ မြေပုံဒေတာ ဆွဲနေသည်..." : "Syncing Myanmar Map Registries..."}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* ── HEADER ──────────────────────────────────────────────── */}
      <View className="bg-white border-b border-gray-100">
        <View className="flex-row items-center px-4 py-3">
          <BackButton onPress={onBack} />
          <View className="flex-1 items-center">
            <Text className="text-base font-rubik-bold text-gray-900">
              {isBurmese ? "ကြော်ငြာအသစ်" : "New Listing"}
            </Text>
            <View className="flex-row items-center gap-1.5 mt-0.5">
              <View className="w-1.5 h-1.5 rounded-full bg-primary-300" />
              <Text className="text-[11px] font-rubik-medium text-gray-400">
                {dealTitle}
              </Text>
            </View>
          </View>
          <View className="w-10" />
        </View>

        {/* ── PROGRESS PILL ─────────────────────────────────────── */}
        <View className="px-4 pb-3">
          <View className="flex-row items-center bg-gray-50 rounded-full px-3 py-1.5 self-center">
            <View className="w-5 h-5 rounded-full bg-primary-300 items-center justify-center mr-2">
              <Text className="text-[9px] font-rubik-bold text-white">
                {completion.percent}
              </Text>
            </View>
            <Text className="text-[11px] font-rubik-semibold text-gray-500">
              {isBurmese ? "ပြည့်စုံမှု" : "Complete"}
            </Text>
          </View>
        </View>
      </View>

      {/* ── FORM CONTENT ────────────────────────────────────────── */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-4">
          {/* ── SECTION 1: BASIC INFO ─────────────────────────── */}
          <SectionCard
            title={isBurmese ? "အခြေခံအချက်အလက်" : "Basic Information"}
            icon={<Home size={16} color="#9CA3AF" />}
            completed={completion.basic}
            isBurmese={isBurmese}
          >
            <FormField label={isBurmese ? "ခေါင်းစဉ် (မြန်မာ)" : "Title (Myanmar)"} required>
              <TextInput
                placeholder={isBurmese ? "ခေါင်းစဉ် ထည့်သွင်းပါ" : "Enter title in Myanmar"}
                value={formData.titleMm}
                onChangeText={(text) => handleInputChange("titleMm", text)}
                style={styles.input}
              />
            </FormField>
            <FormField label={isBurmese ? "ခေါင်းစဉ် (English)" : "Title (English)"}>
              <TextInput
                placeholder={isBurmese ? "အင်္ဂလိပ်လို ခေါင်းစဉ် ထည့်သွင်းပါ" : "Enter title in English"}
                value={formData.titleEn}
                onChangeText={(text) => handleInputChange("titleEn", text)}
                style={styles.input}
              />
            </FormField>
            {!isHostel && (
              <FormField label={isBurmese ? "အိမ်ခြံမြေ အမျိုးအစား" : "Property Type"} required>
                <SelectField
                  options={propertyTypes}
                  placeholder={isBurmese ? "အမျိုးအစား ရွေးပါ" : "Select Type"}
                  value={formData.propertyType}
                  onSelect={(val) => {
                    setFormData((prev) => ({
                      ...prev,
                      propertyType: val,
                      floor: ["apartment", "condo"].includes(val) ? prev.floor : "",
                    }));
                  }}
                />
              </FormField>
            )}
            {isHostel ? (
              <FormField label={isBurmese ? "လစဉ်ငှားရမ်းခ" : "Rent Price Per Month"} required>
                <TextInput
                  placeholder={isBurmese ? "ဥပမာ - 150000" : "e.g. 150000"}
                  value={formData.price}
                  onChangeText={(t) => handleInputChange("price", t)}
                  keyboardType="numeric"
                  style={styles.input}
                />
              </FormField>
            ) : isWanted ? (
              <>
                <FormField label={isBurmese ? "ငွေကြေး" : "Currency Unit"} required>
                  <SelectField
                    options={currencyUnits}
                    value={formData.currencyUnit}
                    onSelect={(val) => handleInputChange("currencyUnit", val)}
                  />
                </FormField>
                <FormField
                  label={
                    isBurmese
                      ? isWantToRent
                        ? `လစဉ်ငှားရမ်းခ (${formData.currencyUnit === "lakhs" ? "ကျပ် (သိန်း)" : "USD"})`
                        : `ဘတ်ဂျက် (${formData.currencyUnit === "lakhs" ? "ကျပ် (သိန်း)" : "USD"})`
                      : isWantToRent
                        ? `Monthly Fee (${formData.currencyUnit === "lakhs" ? "Kyat (Lakh)" : "USD"})`
                        : `Budget (${formData.currencyUnit === "lakhs" ? "Kyat (Lakh)" : "USD"})`
                  }
                  required
                >
                  <View className="flex-row gap-3 items-center">
                    <View className="flex-1">
                      <TextInput
                        placeholder={isBurmese ? "မှ" : "From"}
                        value={formData.monthlyFeeFrom}
                        onChangeText={(t) => handleInputChange("monthlyFeeFrom", t)}
                        keyboardType="numeric"
                        style={styles.input}
                      />
                    </View>
                    <Text className="text-gray-400 font-rubik-semibold text-sm">---</Text>
                    <View className="flex-1">
                      <TextInput
                        placeholder={isBurmese ? "အထိ" : "To"}
                        value={formData.monthlyFeeTo}
                        onChangeText={(t) => handleInputChange("monthlyFeeTo", t)}
                        keyboardType="numeric"
                        style={styles.input}
                      />
                    </View>
                  </View>
                </FormField>
              </>
            ) : (
              <View className="flex-row gap-3">
                <View className="flex-[5]">
                  <FormField label={isBurmese ? "စျေးနှုန်း" : "Price"} required>
                    <TextInput
                      placeholder="500"
                      value={formData.price}
                      onChangeText={(t) => handleInputChange("price", t)}
                      keyboardType="numeric"
                      style={styles.input}
                    />
                  </FormField>
                </View>
                <View className="flex-[4]">
                  <FormField label={isBurmese ? "ငွေကြေး" : "Currency"}>
                    <SelectField
                      options={currencyUnits}
                      value={formData.currencyUnit}
                      onSelect={(val) => handleInputChange("currencyUnit", val)}
                    />
                  </FormField>
                </View>
              </View>
            )}
          </SectionCard>

          {/* ── SECTION 2: PROPERTY DETAILS ──────────────────── */}
          <SectionCard
            title={isHostel ? (isBurmese ? "အဆောင်အသေးစိတ်" : "Hostel Details") : (isBurmese ? "အိမ်ခြံမြေ အသေးစိတ်" : "Property Details")}
            icon={<Pencil size={16} color="#9CA3AF" />}
            completed={completion.details}
            isBurmese={isBurmese}
          >
            {isHostel ? (
              <>
                <FormField label={isBurmese ? "အဆောင်အမျိုးအစား" : "Hostel Type"} required>
                  <View className="flex-row flex-wrap gap-2">
                    {hostelTypeOptions.map((opt) => {
                      const selected = formData.hostelType.includes(opt.value);
                      return (
                        <TouchableOpacity
                          key={opt.value}
                          onPress={() => {
                            const next = selected
                              ? formData.hostelType.filter((v: string) => v !== opt.value)
                              : [...formData.hostelType, opt.value];
                            handleInputChange("hostelType", next);
                          }}
                          className={`px-4 py-2.5 rounded-xl border ${
                            selected ? "bg-primary-300 border-primary-300" : "bg-white border-gray-200"
                          }`}
                        >
                            <Text className={`font-rubik-medium text-sm ${selected ? "text-white" : "text-gray-600"}`}>
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </FormField>
                <FormField label={isBurmese ? "အခန်းအမျိုးအစား" : "Room Capacity"} required>
                  <View className="flex-row flex-wrap gap-2">
                    {roomCapacityOptions.map((opt) => {
                      const selected = formData.roomCapacity.includes(opt.value);
                      return (
                        <TouchableOpacity
                          key={opt.value}
                          onPress={() => {
                            const next = selected
                              ? formData.roomCapacity.filter((v: string) => v !== opt.value)
                              : [...formData.roomCapacity, opt.value];
                            handleInputChange("roomCapacity", next);
                          }}
                          className={`px-3 py-2 rounded-xl border ${
                            selected ? "bg-primary-300 border-primary-300" : "bg-white border-gray-200"
                          }`}
                        >
                          <Text className={`font-rubik-medium text-xs ${selected ? "text-white" : "text-gray-600"}`}>
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </FormField>
              </>
            ) : isWanted ? (
              <>
                {["apartment", "condo"].includes(formData.propertyType) && (
                  <FormField label={isBurmese ? "အလွှာ" : "Floor"}>
                    <SelectField
                      options={floorOptionsDataset}
                      placeholder={isBurmese ? "အလွှာ ရွေးပါ" : "Select Floor"}
                      value={formData.floor}
                      onSelect={(val) => handleInputChange("floor", val)}
                    />
                  </FormField>
                )}

                <FormField
                  label={
                    isBurmese
                      ? `ဧရိယာ (${formData.areaUnit === "sqft" ? "စတုရန်းပေ" : "ဧက"})`
                      : `Area (${formData.areaUnit === "sqft" ? "Square Feet" : "Acre"})`
                  }
                  required
                >
                  <View className="flex-row gap-3 items-center mb-2">
                    <View className="flex-1">
                      <TextInput
                        placeholder={isBurmese ? "မှ" : "From"}
                        value={formData.areaFrom}
                        onChangeText={(t) => handleInputChange("areaFrom", t)}
                        keyboardType="numeric"
                        style={styles.input}
                      />
                    </View>
                    <Text className="text-gray-400 font-rubik-semibold text-sm">---</Text>
                    <View className="flex-1">
                      <TextInput
                        placeholder={isBurmese ? "အထိ" : "To"}
                        value={formData.areaTo}
                        onChangeText={(t) => handleInputChange("areaTo", t)}
                        keyboardType="numeric"
                        style={styles.input}
                      />
                    </View>
                  </View>
                  <SelectField
                    options={areaUnitsDataset}
                    value={formData.areaUnit}
                    onSelect={(val) => handleInputChange("areaUnit", val)}
                  />
                </FormField>

                <FormField label={isBurmese ? "ဖာနီးရှားပါဝင်မှု" : "Furnished Status"} required>
                  <View className="flex-row flex-wrap gap-2">
                    {furnishedStatusOptions.map((opt) => {
                      const selected = formData.furnishedStatus === opt.value;
                      return (
                        <TouchableOpacity
                          key={opt.value}
                          onPress={() => handleInputChange("furnishedStatus", selected ? "" : opt.value)}
                          className={`px-4 py-2.5 rounded-xl border ${
                            selected ? "bg-primary-300 border-primary-300" : "bg-white border-gray-200"
                          }`}
                        >
                            <Text className={`font-rubik-medium text-sm ${selected ? "text-white" : "text-gray-600"}`}>
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </FormField>

                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <FormField label={isBurmese ? "အိပ်ခန်း" : "Bedrooms"}>
                      <SelectField
                        options={roomCountOptions}
                        value={formData.bedrooms}
                        onSelect={(val) => handleInputChange("bedrooms", val)}
                      />
                    </FormField>
                  </View>
                  <View className="flex-1">
                    <FormField label={isBurmese ? "ရေချိုးခန်း" : "Bathrooms"}>
                      <SelectField
                        options={roomCountOptions}
                        value={formData.bathrooms}
                        onSelect={(val) => handleInputChange("bathrooms", val)}
                      />
                    </FormField>
                  </View>
                </View>
              </>
            ) : (
              <>
                {["apartment", "condo"].includes(formData.propertyType) && (
                  <FormField label={isBurmese ? "အလွှာ" : "Floor"}>
                    <SelectField
                      options={floorOptionsDataset}
                      placeholder={isBurmese ? "အလွှာ ရွေးပါ" : "Select Floor"}
                      value={formData.floor}
                      onSelect={(val) => handleInputChange("floor", val)}
                    />
                  </FormField>
                )}

                <FormField label={isBurmese ? "အကျယ်အဝန်း" : "Property Size"}>
                  <View className="flex-row bg-primary-100 p-1 rounded-xl border border-primary-200 gap-1">
                    <TouchableOpacity
                      onPress={() => setShowDimensions(!showDimensions)}
                      className={`flex-1 py-2 rounded-lg items-center ${showDimensions ? "bg-primary-300" : ""}`}
                    >
                      <Text className={`text-center text-xs font-rubik-bold ${showDimensions ? "text-white" : "text-primary-300"}`}>
                        {isBurmese ? "အနံ x အလျား" : "Length x Width"}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setShowAreaBox(!showAreaBox)}
                      className={`flex-1 py-2 rounded-lg items-center ${showAreaBox ? "bg-primary-300" : ""}`}
                    >
                      <Text className={`text-center text-xs font-rubik-bold ${showAreaBox ? "text-white" : "text-primary-300"}`}>
                        {isBurmese ? "ဧရိယာ" : "Area"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </FormField>

                {showDimensions && (
                  <View className="flex-row gap-3">
                    <View className="flex-1">
                      <FormField label={isBurmese ? "အနံ (ပေ)" : "Width (ft)"} required>
                        <TextInput
                          placeholder="20"
                          value={formData.width}
                          onChangeText={(t) => handleInputChange("width", t)}
                          keyboardType="numeric"
                          style={styles.input}
                        />
                      </FormField>
                    </View>
                    <View className="flex-1">
                      <FormField label={isBurmese ? "အလျား (ပေ)" : "Length (ft)"} required>
                        <TextInput
                          placeholder="60"
                          value={formData.length}
                          onChangeText={(t) => handleInputChange("length", t)}
                          keyboardType="numeric"
                          style={styles.input}
                        />
                      </FormField>
                    </View>
                  </View>
                )}

                {showAreaBox && (
                  <FormField label={isBurmese ? "စုစုပေါင်း ဧရိယာ" : "Total Area"} required>
                    <View className="flex-row gap-3">
                      <View className="flex-[5]">
                        <TextInput
                          placeholder="1200"
                          value={formData.areaValue}
                          onChangeText={(t) => handleInputChange("areaValue", t)}
                          keyboardType="numeric"
                          style={styles.input}
                        />
                      </View>
                      <View className="flex-[4]">
                        <SelectField
                          options={areaUnitsDataset}
                          value={formData.areaUnit}
                          onSelect={(val) => handleInputChange("areaUnit", val)}
                        />
                      </View>
                    </View>
                  </FormField>
                )}

                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <FormField label={isBurmese ? "အိပ်ခန်း" : "Bedrooms"}>
                      <SelectField
                        options={roomCountOptions}
                        value={formData.bedrooms}
                        onSelect={(val) => handleInputChange("bedrooms", val)}
                      />
                    </FormField>
                  </View>
                  <View className="flex-1">
                    <FormField label={isBurmese ? "ရေချိုးခန်း" : "Bathrooms"}>
                      <SelectField
                        options={roomCountOptions}
                        value={formData.bathrooms}
                        onSelect={(val) => handleInputChange("bathrooms", val)}
                      />
                    </FormField>
                  </View>
                </View>
              </>
            )}

            <FormField label={isBurmese ? "ကြော်ငြာပါဝင်သည့်အကြောင်းအရာ (မြန်မာ)" : "Ad Content (Myanmar)"}>
              <TextInput
                placeholder={isBurmese ? "အိမ်ခြံမြေအကြောင်း ဖော်ပြပါ..." : "Describe the property in Myanmar..."}
                value={formData.descriptionMm}
                onChangeText={(text) => handleInputChange("descriptionMm", text)}
                multiline
                numberOfLines={6}
                style={[styles.input, { height: 160, textAlignVertical: "top", paddingTop: 12 }]}
              />
            </FormField>
            <View className="my-2 border-b border-gray-100" />
            <FormField label={isBurmese ? "ကြော်ငြာပါဝင်သည့်အကြောင်းအရာ (English)" : "Ad Content (English)"}>
              <TextInput
                placeholder={isBurmese ? "အိမ်ခြံမြေအကြောင်း၊ အသုံးအဆောင်များနှင့် ထူးခြားချက်များကို ဖော်ပြပါ..." : "Describe the property, facilities, highlights..."}
                value={formData.descriptionEn}
                onChangeText={(text) => handleInputChange("descriptionEn", text)}
                multiline
                numberOfLines={6}
                style={[styles.input, { height: 160, textAlignVertical: "top", paddingTop: 12 }]}
              />
            </FormField>
          </SectionCard>

          {/* ── SECTION 3: LOCATION ───────────────────────────── */}
          <SectionCard
            title={isBurmese ? "တည်နေရာ" : "Location"}
            icon={<MapPin size={16} color="#9CA3AF" />}
            completed={completion.location}
            isBurmese={isBurmese}
            required
          >
            {!isWanted && (
              <>
                <TouchableOpacity
                  onPress={async () => {
                    const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
                    if (existingStatus !== "granted") {
                      const { status } = await Location.requestForegroundPermissionsAsync();
                      if (status !== "granted") return;
                    }
                    const loc = await Location.getCurrentPositionAsync({});
                    setFormData((prev) => ({
                      ...prev,
                      latitude: loc.coords.latitude.toString(),
                      longitude: loc.coords.longitude.toString(),
                    }));
                  }}
                  className="bg-blue-50 border border-blue-100 rounded-xl py-3.5 px-4 flex-row items-center gap-3"
                >
                  <View className="w-8 h-8 rounded-full bg-blue-100 items-center justify-center">
                    <MapPin size={16} color="#134686" />
                  </View>
                  <Text className="flex-1 text-primary-300 font-rubik-semibold text-sm">
                    {formData.latitude ? (isBurmese ? "တည်နေရာ သတ်မှတ်ပြီး" : "Location Pinned") : (isBurmese ? "တည်နေရာ သတ်မှတ်ရန်" : "Tap to Pin Location")}
                  </Text>
                </TouchableOpacity>

                {formData.latitude && (
                  <View className="rounded-xl overflow-hidden border border-gray-100" style={{ height: 130 }}>
                    <MapView
                      style={{ flex: 1 }}
                      initialRegion={{
                        latitude: parseFloat(formData.latitude),
                        longitude: parseFloat(formData.longitude),
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                      }}
                      scrollEnabled={false}
                      zoomEnabled={false}
                    >
                      <Marker
                        coordinate={{
                          latitude: parseFloat(formData.latitude),
                          longitude: parseFloat(formData.longitude),
                        }}
                      />
                    </MapView>
                  </View>
                )}
              </>
            )}

            <View className="flex-row gap-3">
              <View className="flex-1">
                <FormField label={isBurmese ? "ပြည်နယ်နှင့်တိုင်းဒေသကြီး" : "State / Region"}>
                  <SelectField
                    options={regionOptions}
                    placeholder={isBurmese ? "ပြည်နယ်" : "Region"}
                    value={formData.regionId}
                    onSelect={(val) =>
                      setFormData((prev) => ({ ...prev, regionId: val, townshipId: "" }))
                    }
                  />
                </FormField>
              </View>
              <View className="flex-1">
                <FormField label={isBurmese ? "မြို့နယ်" : "Township"}>
                  <SelectField
                    options={activeTownships}
                    placeholder={isBurmese ? "မြို့နယ်" : "Township"}
                    value={formData.townshipId}
                    onSelect={(val) => setFormData((prev) => ({ ...prev, townshipId: val }))}
                  />
                </FormField>
              </View>
            </View>

            <FormField label={isBurmese ? "ဖုန်းနံပါတ်" : "Phone Number"} required>
              <TextInput
                placeholder="09xxxxxxxxx"
                value={formData.phone}
                onChangeText={(t) => handleInputChange("phone", t)}
                keyboardType="phone-pad"
                style={styles.input}
              />
            </FormField>

            {isWanted && (
              <TouchableOpacity
                onPress={() => setFormData((prev) => ({ ...prev, coBrokerage: !prev.coBrokerage }))}
                className="flex-row items-center gap-3 py-2"
              >
                <View
                  className={`w-5 h-5 rounded border-2 items-center justify-center ${
                    formData.coBrokerage ? "bg-primary-300 border-primary-300" : "border-gray-300"
                  }`}
                >
                  {formData.coBrokerage && <Check size={12} color="white" strokeWidth={3} />}
                </View>
                <Text className="text-gray-700 font-rubik-medium text-sm flex-1">
                  {isBurmese ? "အကျိုးတူဆောင်ရွက်မှု လက်ခံပါသည်" : "Co-brokerage accepted"}
                </Text>
              </TouchableOpacity>
            )}
          </SectionCard>

          {/* ── SECTION 4: MEDIA ──────────────────────────────── */}
          {!isWanted && (
          <SectionCard
            title={isBurmese ? "ဓာတ်ပုံနှင့်ဗီဒီယို" : "Photos & Video"}
            icon={<ImageIcon size={16} color="#9CA3AF" />}
            completed={completion.media}
            isBurmese={isBurmese}
          >
            <View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 10 }}
              >
                {images.map((uri, index) => (
                  <View key={index} className="relative w-20 h-20 rounded-xl overflow-hidden bg-gray-100">
                    <Image source={{ uri }} className="w-full h-full" />
                    <TouchableOpacity
                      onPress={() => removeImage(index)}
                      className="absolute top-1 right-1 bg-black/50 p-0.5 rounded-full"
                    >
                      <X size={10} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
                {images.length < 5 && (
                  <TouchableOpacity
                    onPress={pickImages}
                    className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 items-center justify-center bg-gray-50"
                  >
                    <ImageIcon size={20} color="#134686" />
                    <Text className="text-[9px] font-rubik-semibold text-gray-400 mt-1">
                      {images.length}/5
                    </Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            </View>

            {video ? (
              <View className="bg-gray-50 border border-gray-100 rounded-xl p-3 flex-row items-center justify-between">
                <Text numberOfLines={1} className="text-gray-600 text-xs font-rubik-semibold flex-1">
                  {video.split("/").pop()}
                </Text>
                <TouchableOpacity onPress={() => setVideo(null)} className="bg-gray-200 p-1.5 rounded-full ml-2">
                  <X size={12} color="#6B7280" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={pickVideo}
                className="border border-dashed border-gray-200 rounded-xl py-3 flex-row items-center justify-center gap-2 bg-gray-50"
              >
                <Video size={18} color="#134686" />
                <Text className="text-gray-400 font-rubik-semibold text-xs">
                  {isBurmese ? "ဗီဒီယို ရွေးချယ်ပါ" : "Select Video File"}
                </Text>
              </TouchableOpacity>
            )}
          </SectionCard>
          )}
        </View>
      </ScrollView>

      {/* ── SUBMIT BUTTON ────────────────────────────────────────── */}
      <View className="px-4 pb-4 pt-2 bg-gray-50">
        <TouchableOpacity
          onPress={() => showAlert(
            isBurmese ? "ကြော်ငြာတင်ရန် သေချာပါသလား။" : "Publish Listing?",
            isBurmese
              ? "အချက်အလက်များဖြင့် ကြော်ငြာအား လွှင့်တင်ပါမည်။"
              : "Are you sure you want to publish?",
            () => handleSubmitPost(),
            true,
          )}
          disabled={isLoading || atPostLimit}
          className={`py-4 rounded-2xl items-center ${atPostLimit ? "bg-gray-200" : "bg-primary-300"}`}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-rubik-bold text-base">
              {isBurmese ? "ကြော်ငြာ တင်ရန်" : "Publish Listing"}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* ── DIALOG ───────────────────────────────────────────────── */}
      <AlertDialog
        isOpen={!!alertDialog}
        onClose={() => setAlertDialog(null)}
        useRNModal={true}
      >
        <AlertDialog.Backdrop />
        <AlertDialog.Content className="p-7 rounded-3xl bg-white w-5/6 items-center shadow-xl">
          <AlertDialog.Header>
            <Heading className="text-gray-900 font-rubik-bold text-lg">
              {alertDialog?.title || ""}
            </Heading>
          </AlertDialog.Header>
          <AlertDialog.Body className="pb-5">
            <Text className="text-center text-gray-500 font-rubik">
              {alertDialog?.message || ""}
            </Text>
          </AlertDialog.Body>
          <AlertDialog.Footer className="w-full">
            <View className="flex-row gap-3 w-full">
              {alertDialog?.showCancel && (
                <Button className="flex-1 bg-gray-100" onPress={() => setAlertDialog(null)}>
                  <ButtonText className="text-gray-600">
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

const styles = StyleSheet.create({
  input: {
    height: 48,
    borderColor: "#E5E7EB",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: "#F9FAFB",
    color: "#1F2937",
    fontSize: 15,
  },
});
