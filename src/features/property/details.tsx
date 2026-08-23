import { supabase } from "@/shared/lib/supabase";
import { useRouter, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  Bed, Building, ChevronDown, ChevronUp, Eye, Home, MapPin, Maximize2, MessageCircle, Navigation, Phone, Ruler, ShowerHead, CheckCircle, Hash, Layers, Clock, LandPlot, Building2, ChevronRight, Trash2, Flag, } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertDialog, AlertDialogBackdrop, AlertDialogBody, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, } from "@/shared/components/alertdialog/alertdialog";
import { Button, ButtonText } from "@/shared/components/button/button";
import { Heading } from "@/shared/components/heading/heading";
import { BackButton } from "@/shared/components/BackButton";
import {
  ActivityIndicator, Dimensions, FlatList, Image, Linking, NativeScrollEvent, NativeSyntheticEvent, Pressable, TouchableOpacity, View } from "react-native";
import Text from "@/shared/components/Text";
import { SafeAreaView } from "react-native-safe-area-context";
import ImageViewer from "@/shared/components/ImageViewer";
import { WebView } from "react-native-webview";
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  FadeInDown,
  FadeInUp,
} from "react-native-reanimated";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const GREEN = "#134686";
const GREEN_LIGHT = "#E3EBF8";
const RED = "#ED3F27";
const GRAY = "#8C8E98";
const GRAY_LIGHT = "#F5F5F7";
const GRAY_BORDER = "#E8E8ED";
const TEXT_PRIMARY = "#191D31";
const TEXT_SECONDARY = "#666876";
const CARD_RADIUS = 16;
const IMG_HEIGHT = SCREEN_HEIGHT / 2.5;
const HEADER_TRANSITION = IMG_HEIGHT * 0.65;
const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80";

interface DetailsProps {
  propertyId: string;
  onBack: () => void;
}

const isVideoFile = (url: string) => {
  if (!url) return false;
  const cleanUrl = url.split(/[?#]/)[0].toLowerCase();
  return (
    cleanUrl.endsWith(".mp4") ||
    cleanUrl.endsWith(".mov") ||
    cleanUrl.endsWith(".m4v") ||
    cleanUrl.endsWith(".3gp") ||
    cleanUrl.includes("video")
  );
};

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  const { greenLight, textMuted, textPrimary } = {
    greenLight: GREEN_LIGHT,
    textMuted: GRAY,
    textPrimary: TEXT_PRIMARY,
  };
  return (
    <View className="flex-row items-center py-2.5">
      <View
        className="w-9 h-9 rounded-xl items-center justify-center mr-3"
        style={{ backgroundColor: greenLight }}
      >
        {icon}
      </View>
      <View className="flex-1">
        <Text className="text-xs font-rubik-medium" style={{ color: textMuted }}>
          {label}
        </Text>
        <Text
          className="text-sm font-rubik-semibold mt-0.5"
          style={{ color: textPrimary }}
          numberOfLines={1}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

function FeatureChip({ label }: { label: string }) {
  const { greenLight, green, textSecondary } = {
    greenLight: GREEN_LIGHT,
    green: GREEN,
    textSecondary: TEXT_SECONDARY,
  };
  return (
    <View
      className="flex-row items-center px-3.5 py-2 rounded-full mr-2 mb-2"
      style={{ backgroundColor: greenLight }}
    >
      <CheckCircle size={13} color={green} style={{ marginRight: 5 }} />
      <Text className="text-xs font-rubik-medium" style={{ color: textSecondary }}>
        {label}
      </Text>
    </View>
  );
}

function SkeletonBlock({ height, width }: { height: number; width?: number | string }) {
  const { cardLight } = { cardLight: GRAY_LIGHT };
  return (
    <View style={{ width: width || "100%" } as any}>
      <View
        className="rounded-2xl"
        style={{
          height,
          backgroundColor: cardLight,
        }}
      />
    </View>
  );
}

function SkeletonScreen() {
  return (
    <View className="flex-1 bg-cream px-5 pt-16">
      <SkeletonBlock height={220} />
      <View className="mt-4">
        <SkeletonBlock height={20} width="60%" />
      </View>
      <View className="mt-3">
        <SkeletonBlock height={40} width="40%" />
      </View>
      <View className="mt-4">
        <SkeletonBlock height={100} />
      </View>
      <View className="mt-4">
        <SkeletonBlock height={80} />
      </View>
    </View>
  );
}

export default function Details({ propertyId, onBack }: DetailsProps) {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const isBurmese = i18n.language === "mm" || i18n.language?.startsWith("my");

  const {
    greenLight,
    textMuted,
    textPrimary,
    textSecondary,
    cardLight,
    border,
  } = {
    greenLight: GREEN_LIGHT,
    textMuted: GRAY,
    textPrimary: TEXT_PRIMARY,
    textSecondary: TEXT_SECONDARY,
    cardLight: GRAY_LIGHT,
    border: GRAY_BORDER,
  };

  const [property, setProperty] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [relatedProperties, setRelatedProperties] = useState<any[]>([]);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [agent, setAgent] = useState<any>(null);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reportDone, setReportDone] = useState(false);
  const [reportReason, setReportReason] = useState<string | null>(null);

  const carouselRef = useRef<FlatList>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const headerBgStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, HEADER_TRANSITION], [0, 1], Extrapolation.CLAMP),
  }));

  const headerShadowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, HEADER_TRANSITION], [0, 1], Extrapolation.CLAMP),
  }));

  const headerTitleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, HEADER_TRANSITION], [0, 1], Extrapolation.CLAMP),
  }));


  useEffect(() => {
    const images = [];
    if (property?.video_url) images.push(property.video_url);
    else if (property?.video) images.push(property.video);
    if (property?.images) images.push(...property.images);
    const count = images.length || 1;
    if (count <= 1) return;
    timerRef.current = setInterval(() => {
      setActiveImageIndex((prev) => {
        const next = (prev + 1) % count;
        carouselRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 3000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [property]);

  useEffect(() => {
    async function fetchPropertyDetails() {
      if (!propertyId) return;
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from("properties")
          .select(
            `*, states_regions(name_en, name_mm), townships(name_en, name_mm), profiles(id, full_name, avatar_url, phone)`,
          )
          .eq("id", propertyId)
          .single();

        if (error) throw error;
        setProperty(data);

        if (data?.user_id) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("id, full_name, avatar_url, phone")
            .eq("id", data.user_id)
            .single();
          setAgent(profileData);
        }
      } catch (err) {
        console.error("Error fetching:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPropertyDetails();
  }, [propertyId]);

  useEffect(() => {
    async function fetchRelated() {
      if (!property?.township_id) return;
      const { data } = await supabase
        .from("properties")
        .select("*, states_regions(name_en, name_mm), townships(name_en, name_mm)")
        .eq("township_id", property.township_id)
        .neq("id", propertyId)
        .eq("is_sold", false)
        .eq("is_flagged", false)
        .order("created_at", { ascending: false })
        .limit(10);
      setRelatedProperties(data || []);
    }
    fetchRelated();
  }, [property?.township_id, propertyId]);

  useFocusEffect(
    React.useCallback(() => {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          setCurrentUserId(user.id);
          supabase
            .rpc("increment_property_views", { property_view_id: propertyId })
            .then(({ error }) => {
              if (error) console.error("View increment error:", error);
            });
        }
      });
    }, [propertyId]),
  );

  const handleContact = () => {
    const phone = property.search_value || property.phone || agent?.phone;
    if (phone) Linking.openURL(`tel:${phone}`);
  };

  const handleChatPress = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/(auth)/login");
      return;
    }
    if (user.id === property.user_id) return;
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("property_id", property.id)
      .eq("buyer_id", user.id)
      .eq("seller_id", property.user_id)
      .maybeSingle();
    let conversationId = existing?.id;
    if (!conversationId) {
      const { data: created } = await supabase
        .from("conversations")
        .insert({
          property_id: property.id,
          buyer_id: user.id,
          seller_id: property.user_id,
        })
        .select("id")
        .single();
      conversationId = created?.id;
      if (conversationId) {
        const title = property.title_en || property.title_mm || t("property.propertyFallback");
        await supabase.from("messages").insert({
          conversation_id: conversationId,
          sender_id: user.id,
          text: `Hi! I'm interested in: ${title}`,
        });
      }
    }
    if (conversationId) router.push(`/chat/${conversationId}` as any);
  };

  const handleDelete = async () => {
    setDeleting(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user && user.id === property.user_id) {
      await supabase.from("properties").delete().eq("id", property.id);
    }
    setDeleting(false);
    setShowDeleteDialog(false);
    onBack();
  };

  const handleReport = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setShowReportDialog(false);
      router.push("/(auth)/login");
      return;
    }
    setReporting(true);
    try {
      await supabase
        .from("property_reports")
        .insert({
          property_id: property.id,
          reporter_id: user.id,
          reason: reportReason || null,
        });
      await supabase.from("properties").update({ is_flagged: true }).eq("id", property.id);
    } catch (e) {
      console.error("Report failed:", e);
    }
    setReporting(false);
    setReportDone(true);
  };

  const closeReportDialog = () => {
    setShowReportDialog(false);
    setReportDone(false);
    setReportReason(null);
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveImageIndex(index);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setActiveImageIndex((prev) => {
          const next = (prev + 1) % mediaDataset.length;
          carouselRef.current?.scrollToIndex({ index: next, animated: true });
          return next;
        });
      }, 3000);
    }
  };

  if (isLoading) return <SkeletonScreen />;

  if (!property) {
    return (
      <View className="flex-1 bg-cream items-center justify-center p-6">
        <Text className="font-rubik-bold text-center" style={{ color: textSecondary }}>
          {isBurmese ? "ကြော်ငြာအချက်အလက် ရှာမတွေ့ပါ" : "Property details not found."}
        </Text>
        <TouchableOpacity
          onPress={onBack}
          className="mt-6 px-8 py-3 rounded-full"
          style={{ backgroundColor: GREEN }}
        >
          <Text className="text-white font-rubik-bold text-sm">
            {isBurmese ? "ပြန်သွားရန်" : "Go Back"}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isOwner = currentUserId === property.user_id;
  const propertyTypeMap: Record<string, string> = {
    apartment: "တိုက်ခန်း",
    condo: "ကွန်ဒို",
    house: "လုံးချင်းအိမ်",
    land: "မြေကွက်",
    hostel: "အဆောင်",
  };

  const displayTitle =
    isBurmese && property.title_mm
      ? property.title_mm
      : property.title_en || property.title_mm;

  const displayPrice =
    property.currency_unit === "lakhs"
      ? `${property.price} ${isBurmese ? "သိန်း (ကျပ်)" : "Lakhs"}`
      : `$${property.price}`;

  const regionName = property.states_regions
    ? isBurmese && property.states_regions.name_mm
      ? property.states_regions.name_mm
      : property.states_regions.name_en
    : "";
  const townshipName = property.townships
    ? isBurmese && property.townships.name_mm
      ? property.townships.name_mm
      : property.townships.name_en
    : "";
  const displayLocation =
    townshipName && regionName ? `${townshipName}, ${regionName}` : "Yangon, Myanmar";

  const dealTypeLabel =
    property.deal_type === "rent"
      ? isBurmese
        ? "ငှားရန်ရှိသည်"
        : "For Rent"
      : isBurmese
        ? "ရောင်းရန်ရှိသည်"
        : "For Sale";

  const similarDealText = property.deal_type === "rent" ? "ငှားရန်" : "ရောင်းရန်";
  const similarHeading = townshipName
    ? `${townshipName} ${similarDealText} အိမ်ခြံမြေများ`
    : `${similarDealText} အိမ်ခြံမြေများ`;

  const propertyTypeLabel =
    propertyTypeMap[property.property_type] || property.property_type || "Property";

  let mediaDataset: string[] = [];
  if (property.video_url) mediaDataset.push(property.video_url);
  else if (property.video) mediaDataset.push(property.video);
  if (property.images && property.images.length > 0)
    mediaDataset = [...mediaDataset, ...property.images];
  if (mediaDataset.length === 0) mediaDataset = [DEFAULT_IMAGE];
  const imageDataset = mediaDataset.filter((url) => !isVideoFile(url));
  const isLongDesc = (property.description?.length ?? 0) > 100;

  const mapUrl = property.latitude && property.longitude
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${property.longitude - 0.003}%2C${property.latitude - 0.003}%2C${property.longitude + 0.003}%2C${property.latitude + 0.003}&layer=mapnik&marker=${property.latitude}%2C${property.longitude}`
    : null;

  const features = [
    property.air_conditioning && t("property.featureAirConditioning"),
    property.balcony && t("property.featureBalcony"),
    property.garden && t("property.featureGarden"),
    property.water_supply && t("property.featureWaterSupply"),
    property.electricity && t("property.featureElectricity"),
    property.security && t("property.featureSecurity"),
    property.internet && t("property.featureInternet"),
    property.car_parking && t("property.featureCarParking"),
  ].filter(Boolean) as string[];

  return (
    <View className="flex-1 bg-cream">
      <StatusBar style="dark" />

      {/* ── Floating Header ── */}
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
        }}
      >
        <Animated.View
          style={[
            {
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "#134686",
            },
            headerBgStyle,
          ]}
        />
        <Animated.View
          style={[
            {
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 1,
              backgroundColor: border,
            },
            headerShadowStyle,
          ]}
        />
        <View style={{ paddingTop: 8 }}>
          <View className="flex-row items-center justify-between px-2" style={{ height: 40 }}>
            <BackButton onPress={onBack} />

            <Animated.Text
              numberOfLines={1}
              style={[
                {
                  flex: 1,
                  textAlign: "center",
                  fontSize: 14,
                  fontFamily: "rubik-bold",
                  color: textPrimary,
                },
                headerTitleStyle,
              ]}
            >
{dealTypeLabel}
            </Animated.Text>

            <View className="flex-row gap-1">
              {!isOwner && (
                <TouchableOpacity
                  onPress={() => setShowReportDialog(true)}
                  className="w-10 h-10 items-center justify-center rounded-full"
                  style={{ backgroundColor: greenLight }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Flag size={18} color={GREEN} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </View>

      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Image Gallery ── */}
        <View>
          <FlatList
              ref={carouselRef}
              data={mediaDataset}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(_, i) => String(i)}
              onScroll={onScroll}
              scrollEventThrottle={16}
              renderItem={({ item: mediaUrl, index: mediaIndex }) => (
                <TouchableOpacity
                  activeOpacity={1}
                  onPress={
                    isVideoFile(mediaUrl)
                      ? undefined
                      : () => {
                          const imageIndex = mediaDataset
                            .slice(0, mediaIndex)
                            .filter((url) => !isVideoFile(url)).length;
                          setShowImageViewer(true);
                          setViewerInitialIndex(imageIndex);
                        }
                  }
                >
                  {isVideoFile(mediaUrl) ? (
                    <View
                      style={{ width: SCREEN_WIDTH, height: IMG_HEIGHT, backgroundColor: "#000" }}
                    >
                      <Image
                        source={{ uri: "https://via.placeholder.com/800x600?text=Video" }}
                        style={{ width: SCREEN_WIDTH, height: IMG_HEIGHT }}
                        resizeMode="cover"
                      />
                    </View>
                  ) : (
                    <Image
                      source={{ uri: mediaUrl }}
                      style={{ width: SCREEN_WIDTH, height: IMG_HEIGHT }}
                      resizeMode="cover"
                    />
                  )}
                </TouchableOpacity>
              )}
            />

            {/* Page indicator */}
            <View
              className="absolute bottom-4 left-4 px-3 py-1.5 rounded-full"
              style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
            >
              <Text className="text-white text-xs font-rubik-medium">
                {activeImageIndex + 1}/{mediaDataset.length}
              </Text>
            </View>

            {/* Dots */}
            {mediaDataset.length > 1 && (
              <View className="absolute bottom-4 left-0 right-0 flex-row justify-center gap-1.5">
                {mediaDataset.map((_, i) => (
                  <View
                    key={i}
                    className="rounded-full"
                    style={{
                      width: i === activeImageIndex ? 20 : 6,
                      height: 6,
                      backgroundColor: i === activeImageIndex ? "#FFFFFF" : "rgba(255,255,255,0.5)",
                    }}
                  />
                ))}
              </View>
            )}
          </View>

        {/* ── Property Header Card ── */}
        <Animated.View
          entering={FadeInUp.duration(500).delay(100)}
          className="mx-4 mt-4 px-5 pt-6 pb-5 rounded-[20px] bg-white"
          style={{
            elevation: 6,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.08,
            shadowRadius: 12,
          }}
        >
          <Text
            className="font-rubik-bold leading-8"
            style={{ color: "#111827", fontSize: 22 }}
            numberOfLines={2}
          >
            {displayTitle}
          </Text>

          <View
            className="flex-row items-center justify-between mt-4 -mx-5 -mb-5 px-5 py-3 rounded-b-[20px]"
            style={{ backgroundColor: "#FEB21A" }}
          >
            <View className="flex-row items-center gap-2">
              <Clock size={15} color="#fff" />
              <Text className="font-rubik-medium" style={{ color: "#fff", fontSize: 14 }}>
                {property.created_at
                  ? new Date(property.created_at).toLocaleString(isBurmese ? "my-MM" : "en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "-"}
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Eye size={15} color="#fff" />
              <Text className="font-rubik-medium" style={{ color: "#fff", fontSize: 14 }}>
                {property.views ?? 0} {isBurmese ? "ကြည့်ရှုမှု" : "Views"}
              </Text>
            </View>
          </View>
        </Animated.View>

        <View className="px-4 mt-5">
          {/* ── Quick Info ── */}
          <Animated.View
            entering={FadeInUp.duration(400).delay(200)}
            className="rounded-2xl px-5 py-4 mb-5"
            style={{
              backgroundColor: "#fff",
              elevation: 3,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 10,
              borderWidth: 1,
              borderColor: border,
            }}
          >
            <Text className="text-base font-rubik-extrabold mb-3" style={{ color: textPrimary }}>
              {isBurmese ? "အိမ်ခြံမြေအသေးစိတ်" : "Property Details"}
            </Text>
            <View className="flex-row flex-wrap">
              <View className="w-1/2">
                <InfoRow
                  icon={<Hash size={16} color={GREEN} />}
                  label={isBurmese ? "အိမ်ခြံမြေကုဒ်" : "Property Code"}
                  value={`PROP-${10000 + (property.ad_number || 0)}`}
                />
              </View>
              <View className="w-1/2">
                <InfoRow
                  icon={<Building size={16} color={GREEN} />}
                  label={isBurmese ? "အဆောက်အဦး" : "Building Type"}
                  value={property.building_type || propertyTypeLabel}
                />
              </View>
              <View className="w-1/2">
                <InfoRow
                  icon={<Building2 size={16} color={GREEN} />}
                  label={isBurmese ? "အမျိုးအစား" : "Property Type"}
                  value={propertyTypeLabel}
                />
              </View>
              <View className="w-1/2">
                <InfoRow
                  icon={<Bed size={16} color={GREEN} />}
                  label={isBurmese ? "အိပ်ခန်း" : "Bedrooms"}
                  value={property.bedrooms ? `${property.bedrooms}` : "-"}
                />
              </View>
              <View className="w-1/2">
                <InfoRow
                  icon={<Home size={16} color={GREEN} />}
                  label={isBurmese ? "စျေးနှုန်း" : "Price"}
                  value={displayPrice}
                />
              </View>
              <View className="w-1/2">
                <InfoRow
                  icon={<ShowerHead size={16} color={GREEN} />}
                  label={isBurmese ? "ရေချိုးခန်း" : "Bathrooms"}
                  value={property.bathrooms ? `${property.bathrooms}` : "-"}
                />
              </View>
              <View className="w-1/2">
                <InfoRow
                  icon={<MapPin size={16} color={GREEN} />}
                  label={isBurmese ? "မြို့နယ်" : "Township"}
                  value={townshipName || "-"}
                />
              </View>
              <View className="w-1/2">
                <InfoRow
                  icon={<Layers size={16} color={GREEN} />}
                  label={isBurmese ? "အလွှာ" : "Floors"}
                  value={property.floor || "-"}
                />
              </View>
              <View className="w-1/2">
                <InfoRow
                  icon={<Ruler size={16} color={GREEN} />}
                  label={isBurmese ? "ဧရိယာ" : "Area"}
                  value={
                    property.area_value
                      ? `${property.area_value} ${property.area_unit === "sqft" ? t("property.sqft") : t("property.acre")}`
                      : "-"
                  }
                />
              </View>
              <View className="w-1/2">
                {property.width && property.length ? (
                  <InfoRow
                    icon={<LandPlot size={16} color={GREEN} />}
                    label={isBurmese ? "မြေအကျယ်" : "Land Size"}
                    value={`${property.width}×${property.length}ft`}
                  />
                ) : null}
              </View>
            </View>
          </Animated.View>

          {/* ── Description ── */}
          <Animated.View
            entering={FadeInUp.duration(400).delay(300)}
            className="rounded-2xl px-5 py-4 mb-5"
            style={{
              backgroundColor: "#fff",
              elevation: 3,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 10,
              borderWidth: 1,
              borderColor: border,
            }}
          >
            <Text className="text-base font-rubik-extrabold" style={{ color: textPrimary }}>
              {isBurmese ? "အကျဉ်းချုပ်" : "Description"}
            </Text>
            <View className="mt-3 pt-3" style={{ borderTopWidth: 2, borderTopColor: "#ED3F27" }}>
              <Text
                className="text-sm font-rubik leading-6"
                style={{ color: textSecondary }}
                numberOfLines={showFullDesc ? undefined : 3}
              >
                {property.description || (isBurmese ? "အသေးစိတ်အချက်အလက်မရှိသေးပါ" : "No description available.")}
              </Text>
              {isLongDesc && (
                <TouchableOpacity
                  onPress={() => setShowFullDesc(!showFullDesc)}
                  className="flex-row items-center gap-1 mt-2"
                >
                  <Text className="text-sm font-rubik-semibold" style={{ color: GREEN }}>
                    {showFullDesc
                      ? isBurmese
                        ? "ရှင်းရှင်းပြရန်"
                      : "See less"
                    : isBurmese
                      ? "ဆက်ဖတ်ရန်"
                      : "See more"}
                </Text>
                {showFullDesc ? (
                  <ChevronUp size={14} color={GREEN} />
                ) : (
                  <ChevronDown size={14} color={GREEN} />
                )}
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>

          {/* ── Features ── */}
          {features.length > 0 && (
            <Animated.View
              entering={FadeInUp.duration(400).delay(400)}
              className="rounded-2xl px-5 py-4 mb-5"
              style={{
                backgroundColor: "#fff",
                elevation: 3,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 10,
                borderWidth: 1,
                borderColor: border,
              }}
            >
              <Text className="text-base font-rubik-extrabold mb-3" style={{ color: textPrimary }}>
                {isBurmese ? "ပါဝင်သောအရာများ" : "Features"}
              </Text>
              <View className="flex-row flex-wrap">
                {features.map((f, i) => (
                  <FeatureChip key={i} label={f} />
                ))}
              </View>
            </Animated.View>
          )}

          {/* ── Location ── */}
          <Animated.View
            entering={FadeInUp.duration(400).delay(500)}
            className="rounded-2xl overflow-hidden mb-5"
            style={{
              backgroundColor: "#fff",
              elevation: 3,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 10,
              borderWidth: 1,
              borderColor: border,
            }}
          >
            <View className="px-5 pt-4 pb-3">
              <Text className="text-base font-rubik-extrabold mb-1" style={{ color: textPrimary }}>
                {isBurmese ? "တည်နေရာ" : "Location"}
              </Text>
              <View className="flex-row items-center gap-2">
                <MapPin size={15} color={GREEN} />
                <Text className="text-sm font-rubik flex-1" style={{ color: textSecondary }}>
                  {displayLocation}
                </Text>
              </View>
            </View>

            {mapUrl ? (
              <TouchableOpacity
                onPress={() =>
                  router.push(
                    `/property/map?latitude=${property.latitude}&longitude=${property.longitude}&title=${encodeURIComponent(displayTitle)}&address=${encodeURIComponent(displayLocation)}` as any,
                  )
                }
                activeOpacity={0.9}
                style={{ height: 180, borderTopWidth: 1, borderTopColor: border }}
              >
                <WebView
                  source={{ uri: mapUrl }}
                  style={{ flex: 1 }}
                  scrollEnabled={false}
                  pointerEvents="none"
                />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() =>
                  Linking.openURL(
                    `https://www.google.com/maps/search/${encodeURIComponent(displayLocation)}`,
                  )
                }
                style={{ height: 120, borderTopWidth: 1, borderTopColor: border }}
              >
                <View className="flex-1 items-center justify-center" style={{ backgroundColor: cardLight }}>
                  <MapPin size={32} color={GREEN} />
                  <Text className="text-sm font-rubik-medium mt-1" style={{ color: GREEN }}>
                    {isBurmese ? "မြေပုံဖွင့်ရန်" : "Open Map"}
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() =>
                Linking.openURL(
                  `https://www.google.com/maps/search/${encodeURIComponent(displayLocation)}`,
                )
              }
              className="flex-row items-center justify-center py-3 gap-2"
              style={{ borderTopWidth: 1, borderTopColor: border }}
            >
              <Navigation size={15} color={GREEN} />
              <Text className="font-rubik-bold text-sm" style={{ color: GREEN }}>
                {isBurmese ? "Google Maps တွင်ကြည့်ရန်" : "View on Google Maps"}
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* ── Agent Card ── */}
          {agent && !isOwner && (
            <Animated.View
              entering={FadeInUp.duration(400).delay(600)}
              className="rounded-2xl px-5 py-4 mb-5"
              style={{
                backgroundColor: "#fff",
                elevation: 3,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 10,
                borderWidth: 1,
                borderColor: border,
              }}
            >
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() =>
                  router.push(
                    `/agent/${agent.id}?propertyId=${property.id}&phone=${encodeURIComponent(property.search_value || property.phone || agent.phone || "")}` as any,
                  )
                }
              >
                <Text className="text-base font-rubik-extrabold mb-3" style={{ color: textPrimary }}>
                  {isBurmese ? "အေးဂျင့်" : "Agent"}
                </Text>
                <View className="flex-row items-center">
                  <View
                    className="w-14 h-14 rounded-full items-center justify-center"
                    style={{ backgroundColor: greenLight }}
                  >
                    {agent.avatar_url ? (
                      <Image
                        source={{ uri: agent.avatar_url }}
                        className="w-14 h-14 rounded-full"
                        resizeMode="cover"
                      />
                    ) : (
                      <Text className="text-lg font-rubik-bold" style={{ color: GREEN }}>
                        {(agent.full_name || "A")[0]}
                      </Text>
                    )}
                  </View>
                  <View className="flex-1 ml-3">
                    <View className="flex-row items-center gap-1.5">
                      <Text className="text-sm font-rubik-semibold" style={{ color: textPrimary }}>
                        {agent.full_name || t("property.agentFallback")}
                      </Text>
                      <CheckCircle size={14} color="#134686" fill="#134686" />
                    </View>
                    <Text className="text-xs font-rubik mt-0.5" style={{ color: textMuted }}>
                      {isBurmese ? "အိမ်ခြံမြေအကျိုးဆောင်" : "Real Estate Agent"}
                    </Text>
                    <View className="flex-row items-center gap-1 mt-0.5">
                      <Phone size={11} color={textMuted} />
                      <Text className="text-xs font-rubik" style={{ color: textMuted }}>
                        {agent.phone || property.search_value || "-"}
                      </Text>
                    </View>
                  </View>
                  <ChevronRight size={20} color={textMuted} />
                </View>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* ── Similar Properties ── */}
          {relatedProperties.length > 0 && (
            <Animated.View entering={FadeInUp.duration(400).delay(700)} className="mb-5">
              <Text
                className="text-lg font-rubik-extrabold mb-4"
                style={{ color: "#000000" }}
                numberOfLines={1}
              >
                {similarHeading}
              </Text>
              <FlatList
                data={relatedProperties}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingRight: 20 }}
                snapToInterval={290}
                decelerationRate="fast"
                renderItem={({ item: rp }) => {
                  const rpPrice = rp.price
                    ? `${rp.price.toLocaleString()} ${rp.currency_unit === "lakhs" ? "သိန်း (ကျပ်)" : "$"}`
                    : "";
                  const rpImage = rp.images?.[0] || DEFAULT_IMAGE;
                  const rpTitle = rp.title_mm || rp.title_en || "";
                  const rpLocation = [rp.townships?.name_mm || rp.townships?.name_en, rp.states_regions?.name_mm || rp.states_regions?.name_en].filter(Boolean).join(" | ");
                  const rpType = rp.property_type
                    ? ({ apartment: "တိုက်ခန်း", condo: "ကွန်ဒို", house: "လုံးချင်းအိမ်", land: "မြေကွက်", hostel: "အဆောင်" } as Record<string, string>)[rp.property_type] || rp.property_type
                    : "";
                  return (
                    <TouchableOpacity
                      onPress={() => router.push(`/property/${rp.id}` as any)}
                      activeOpacity={0.85}
                      className="mr-4 rounded-xl overflow-hidden"
                      style={{
                        width: 290,
                        backgroundColor: "#fff",
                        elevation: 4,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 8,
                        borderWidth: 1,
                        borderColor: "#E5E7EB",
                      }}
                    >
                      <Image
                        source={{ uri: rpImage }}
                        style={{ width: 290, height: 218 }}
                        resizeMode="cover"
                      />
                      <View className="px-4 py-4">
                        <Text
                          className="font-rubik-bold"
                          style={{ color: "#111827", fontSize: 17 }}
                          numberOfLines={2}
                        >
                          {rpTitle}
                        </Text>
                        {rpLocation && (
                          <View className="flex-row items-center gap-1.5 mt-2">
                            <MapPin size={14} color="#134686" fill="#134686" />
                            <Text className="flex-1 text-sm font-rubik" style={{ color: "#134686" }} numberOfLines={1}>
                              {rpLocation}
                            </Text>
                          </View>
                        )}
                        {rpType && (
                          <View className="flex-row items-center gap-1.5 mt-1.5">
                            <Building size={14} color="#134686" fill="#134686" />
                            <Text className="text-sm font-rubik" style={{ color: "#134686" }}>
                              {rpType}
                            </Text>
                          </View>
                        )}
                        {rpPrice && (
                          <Text className="text-base font-rubik-extrabold mt-2.5" style={{ color: "#FEB21A" }}>
                            {rpPrice}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            </Animated.View>
          )}
        </View>
      </Animated.ScrollView>

      {/* ── Bottom Sticky Action Bar ── */}
      <SafeAreaView
        edges={["bottom"]}
        className="bg-white"
        style={{
          borderTopWidth: 1,
          borderTopColor: border,
          elevation: 12,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
        }}
      >
        <View className="flex-row items-center px-4 py-3 gap-3">
          {isOwner ? (
            <>
              <TouchableOpacity
                onPress={() => setShowDeleteDialog(true)}
                className="flex-1 flex-row items-center justify-center gap-2 py-3.5 rounded-xl"
                style={{ backgroundColor: greenLight }}
              >
                <Trash2 size={18} color={RED} />
                <Text className="font-rubik-bold text-sm" style={{ color: RED }}>
                  {isBurmese ? "ဖျက်ရန်" : "Delete"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  supabase
                    .from("properties")
                    .update({ is_sold: true, sold_at: new Date().toISOString() })
                    .eq("id", propertyId)
                    .then(() => onBack());
                }}
                className="flex-1 py-3.5 rounded-xl items-center justify-center"
                style={{ backgroundColor: GREEN }}
              >
                <Text className="text-white font-rubik-bold text-sm">
                  {isBurmese ? "ရောင်းပြီး" : "Mark Sold"}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                onPress={handleContact}
                className="flex-1 flex-row items-center justify-center gap-2 py-3.5 rounded-xl"
                style={{ backgroundColor: GREEN }}
              >
                <Phone size={18} color="#fff" />
                <Text className="text-white font-rubik-bold text-sm">
                  {isBurmese ? "ဖုန်းခေါ်ရန်" : "Call"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleChatPress}
                className="flex-1 flex-row items-center justify-center gap-2 py-3.5 rounded-xl"
                style={{ backgroundColor: GREEN }}
              >
                <MessageCircle size={18} color="#fff" />
                <Text className="text-white font-rubik-bold text-sm">
                  {isBurmese ? "စာပို့ရန်" : "Chat"}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </SafeAreaView>

      <ImageViewer
        visible={showImageViewer}
        images={imageDataset}
        initialIndex={viewerInitialIndex}
        onClose={() => setShowImageViewer(false)}
      />

      <AlertDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
      >
        <AlertDialogBackdrop />
        <AlertDialogContent className="p-6 rounded-3xl bg-white w-5/6 items-center shadow-xl">
          <AlertDialogHeader>
            <Heading className="text-black-300 font-rubik-bold text-lg">
              {t("profile.deleteTitle") || "Delete Listing"}
            </Heading>
          </AlertDialogHeader>
          <AlertDialogBody className="pb-5">
            <Text className="text-center text-black-200 font-rubik">
              {t("profile.deleteConfirm") || "Are you sure you want to delete this listing?"}
            </Text>
          </AlertDialogBody>
          <AlertDialogFooter className="w-full">
            <View className="flex-row gap-3 w-full">
              <Button
                className="flex-1 bg-primary-200"
                onPress={() => setShowDeleteDialog(false)}
              >
                <ButtonText className="text-black-300">
                  {isBurmese ? "မလုပ်တော့ပါ" : "Cancel"}
                </ButtonText>
              </Button>
              <Button
                onPress={handleDelete}
                className="flex-1 bg-primary-300"
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <ButtonText className="text-white">
                    {isBurmese ? "သေချာပါသည်" : "OK"}
                  </ButtonText>
                )}
              </Button>
            </View>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        isOpen={showReportDialog}
        onClose={closeReportDialog}
      >
        <AlertDialogBackdrop />
        <AlertDialogContent className="p-6 rounded-3xl bg-white w-5/6 items-center shadow-xl">
          <AlertDialogHeader>
            <Heading className="text-black-300 font-rubik-bold text-lg text-center w-full">
              {t("report.title") || "Report Listing"}
            </Heading>
          </AlertDialogHeader>
          <AlertDialogBody className="pb-5 w-full">
            {reportDone ? (
              <Text className="text-center text-black-200 font-rubik">
                {t("report.thanks") || "Thank you. Our team will review this listing."}
              </Text>
            ) : (
              <View className="w-full gap-2">
                {(
                  [
                    ["spam", "spam"],
                    ["misleading", "misleading"],
                    ["off_topic", "off_topic"],
                    ["other", "other"],
                  ] as const
                ).map(([key, labelKey]) => (
                  <TouchableOpacity
                    key={key}
                    onPress={() => setReportReason(key)}
                    className="flex-row items-center justify-between px-4 py-3 rounded-xl"
                    style={{
                      backgroundColor: reportReason === key ? greenLight : GRAY_LIGHT,
                      borderWidth: 1,
                      borderColor: reportReason === key ? GREEN : GRAY_BORDER,
                    }}
                  >
                    <Text className="font-rubik text-sm" style={{ color: TEXT_PRIMARY }}>
                      {t(`report.reasons.${labelKey}`)}
                    </Text>
                    <View
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 9,
                        borderWidth: 1.5,
                        borderColor: reportReason === key ? GREEN : GRAY,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {reportReason === key && (
                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: GREEN }} />
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </AlertDialogBody>
          <AlertDialogFooter className="w-full">
            {reportDone ? (
              <Button className="flex-1 bg-primary-300" onPress={closeReportDialog}>
                <ButtonText className="text-white">
                  {isBurmese ? "ပိတ်မည်" : "Close"}
                </ButtonText>
              </Button>
            ) : (
              <View className="flex-row gap-3 w-full">
                <Button
                  className="flex-1 bg-primary-200"
                  onPress={closeReportDialog}
                >
                  <ButtonText className="text-black-300">
                    {isBurmese ? "မလုပ်တော့ပါ" : "Cancel"}
                  </ButtonText>
                </Button>
                <Button
                  onPress={handleReport}
                  className="flex-1 bg-primary-300"
                >
                  {reporting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <ButtonText className="text-white">
                      {isBurmese ? "သတင်းပို့မည်" : "Report"}
                    </ButtonText>
                  )}
                </Button>
              </View>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </View>
  );
}
