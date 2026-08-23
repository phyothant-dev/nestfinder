import { useCompareStore } from "@/features/property/useCompareStore";
import { router } from "expo-router";
import {
  Bed, Building, Building2, Car, CheckCircle, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Clock, Eye, Hash, Home, LampCeiling, LandPlot, Layers, MapPin, Maximize2, Navigation, Ruler, ShowerHead, Star, X, } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dimensions, FlatList, Image, Linking, Modal, ScrollView, TouchableOpacity, View } from "react-native";
import Text from "@/shared/components/Text";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackButton } from "@/shared/components/BackButton";
import { WebView } from "react-native-webview";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const GREEN = "#134686";
const GREEN_LIGHT = "#E3EBF8";
const GRAY = "#8C8E98";
const GRAY_LIGHT = "#F5F5F7";
const GRAY_BORDER = "#E8E8ED";
const TEXT_PRIMARY = "#191D31";
const TEXT_SECONDARY = "#666876";
const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80";

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
  return (
    <View className="flex-row items-center py-2.5">
      <View
        className="w-9 h-9 rounded-xl items-center justify-center mr-3"
        style={{ backgroundColor: GREEN_LIGHT }}
      >
        {icon}
      </View>
      <View className="flex-1">
        <Text className="text-xs font-rubik-medium" style={{ color: GRAY }}>
          {label}
        </Text>
        <Text
          className="text-sm font-rubik-semibold mt-0.5"
          style={{ color: TEXT_PRIMARY }}
          numberOfLines={1}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

function FeatureChip({ label }: { label: string }) {
  return (
    <View
      className="flex-row items-center px-3.5 py-2 rounded-full mr-2 mb-2"
      style={{ backgroundColor: GREEN_LIGHT }}
    >
      <CheckCircle size={13} color={GREEN} style={{ marginRight: 5 }} />
      <Text className="text-xs font-rubik-medium" style={{ color: TEXT_SECONDARY }}>
        {label}
      </Text>
    </View>
  );
}

function PropertyDetail({ item }: { item: any }) {
  const { t } = useTranslation();
  const removeItem = useCompareStore((s) => s.remove);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [showFullDesc, setShowFullDesc] = useState(false);

  const displayTitle = item.title_en || item.title_mm || t("compare.property");
  const displayPrice =
    item.currency_unit === "lakhs"
      ? `${item.price.toLocaleString()} သိန်း (ကျပ်)`
      : item.currency_unit === "kyats"
        ? `${item.price.toLocaleString()} Ks`
        : `$${item.price}`;
  const regionName = item.states_regions
    ? item.states_regions.name_mm || item.states_regions.name_en
    : "";
  const townshipName = item.townships
    ? item.townships.name_mm || item.townships.name_en
    : "";
  const displayLocation =
    townshipName && regionName
      ? `${townshipName}, ${regionName}`
      : "Yangon, Myanmar";
  const propertyTypeLabel = item.property_type || t("compare.property");

  let mediaDataset: string[] = [];
  if (item.video_url) mediaDataset.push(item.video_url);
  else if (item.video) mediaDataset.push(item.video);
  if (item.images && item.images.length > 0)
    mediaDataset = [...mediaDataset, ...item.images];
  if (mediaDataset.length === 0) mediaDataset = [DEFAULT_IMAGE];

  const isLongDesc = (item.description || "").length > 150;

  const mapUrl =
    item.latitude && item.longitude
      ? `https://www.openstreetmap.org/export/embed.html?bbox=${
          item.longitude - 0.003
        }%2C${item.latitude - 0.003}%2C${item.longitude + 0.003}%2C${
          item.latitude + 0.003
        }&layer=mapnik&marker=${item.latitude}%2C${item.longitude}`
      : null;

  const features: string[] = item.features || [];

  return (
    <View style={{ width: SCREEN_WIDTH }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image Gallery */}
        <View>
          <TouchableOpacity
            onPress={() => removeItem(item.id)}
            className="absolute top-3 right-3 z-20"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <View className="w-8 h-8 bg-black/40 rounded-full items-center justify-center">
              <X size={16} color="#ffffff" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={1}
            onPress={() => {
              setPreviewIndex(activeImageIndex);
              setIsModalVisible(true);
            }}
          >
            <Image
              source={{ uri: mediaDataset[activeImageIndex] }}
              style={{ width: SCREEN_WIDTH, height: 260 }}
              resizeMode="cover"
            />
            {isVideoFile(mediaDataset[activeImageIndex]) && (
              <View className="absolute inset-0 items-center justify-center">
                <View className="w-14 h-14 bg-black/40 rounded-full items-center justify-center">
                  <ChevronRight size={24} color="#ffffff" style={{ marginLeft: 3 }} />
                </View>
              </View>
            )}
          </TouchableOpacity>

          {mediaDataset.length > 1 && (
            <>
              <TouchableOpacity
                onPress={() =>
                  setActiveImageIndex((prev) =>
                    prev > 0 ? prev - 1 : mediaDataset.length - 1
                  )
                }
                className="absolute left-3 top-0 bottom-0 justify-center"
                hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              >
                <View className="w-9 h-9 bg-white/80 rounded-full items-center justify-center">
                  <ChevronLeft size={20} color="#191D31" />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() =>
                  setActiveImageIndex((prev) =>
                    prev < mediaDataset.length - 1 ? prev + 1 : 0
                  )
                }
                className="absolute right-3 top-0 bottom-0 justify-center"
                hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              >
                <View className="w-9 h-9 bg-white/80 rounded-full items-center justify-center">
                  <ChevronRight size={20} color="#191D31" />
                </View>
              </TouchableOpacity>

              <View className="absolute bottom-3 right-4 bg-black/50 px-3 py-1 rounded-full">
                <Text className="text-white text-xs font-rubik-medium">
                  {activeImageIndex + 1}/{mediaDataset.length}
                </Text>
              </View>

              <View className="absolute bottom-3 left-0 right-0 flex-row justify-center gap-1">
                {mediaDataset.map((_, i) => (
                  <View
                    key={i}
                    className={`h-1.5 rounded-full ${
                      i === activeImageIndex
                        ? "w-4 bg-white"
                        : "w-1.5 bg-white/50"
                    }`}
                  />
                ))}
              </View>
            </>
          )}
        </View>

        {/* Property Header Card */}
        <View
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
                {item.created_at
                  ? new Date(item.created_at).toLocaleString("en-US", {
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
                {item.views ?? 0} {t("compare.views")}
              </Text>
            </View>
          </View>
        </View>

        <View className="px-4 mt-5">
          {/* Quick Info */}
          <View
            className="rounded-2xl px-5 py-4 mb-5 bg-white"
            style={{
              elevation: 3,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 10,
              borderWidth: 1,
              borderColor: GRAY_BORDER,
            }}
          >
            <Text className="text-base font-rubik-extrabold mb-3" style={{ color: TEXT_PRIMARY }}>
              {t("compare.quickInfo")}
            </Text>
            <View className="flex-row flex-wrap">
              <View className="w-1/2">
                <InfoRow
                  icon={<Hash size={16} color={GREEN} />}
                  label={t("compare.propertyCode")}
                  value={`PROP-${10000 + (item.ad_number || 0)}`}
                />
                <InfoRow
                  icon={<Building2 size={16} color={GREEN} />}
                  label={t("compare.propertyType")}
                  value={propertyTypeLabel}
                />
                <InfoRow
                  icon={<Home size={16} color={GREEN} />}
                  label={t("compare.price")}
                  value={displayPrice}
                />
                <InfoRow
                  icon={<MapPin size={16} color={GREEN} />}
                  label={t("compare.township")}
                  value={townshipName || "-"}
                />
                <InfoRow
                  icon={<Ruler size={16} color={GREEN} />}
                  label={t("compare.area")}
                  value={
                    item.area_value
                      ? `${item.area_value} ${item.area_unit === "sqft" ? t("compare.sqft") : t("compare.acre")}`
                      : "-"
                  }
                />
                {item.width && item.length && (
                  <InfoRow
                    icon={<LandPlot size={16} color={GREEN} />}
                    label={t("compare.landSize")}
                    value={`${item.width}×${item.length}ft`}
                  />
                )}
              </View>
              <View className="w-1/2">
                <InfoRow
                  icon={<Building size={16} color={GREEN} />}
                  label={t("compare.buildingType")}
                  value={item.building_type || propertyTypeLabel}
                />
                <InfoRow
                  icon={<Star size={16} color={GREEN} />}
                  label={t("compare.ownership")}
                  value={item.ownership || "-"}
                />
                <InfoRow
                  icon={<Bed size={16} color={GREEN} />}
                  label={t("compare.bedrooms")}
                  value={item.bedrooms ? `${item.bedrooms}` : "-"}
                />
                <InfoRow
                  icon={<ShowerHead size={16} color={GREEN} />}
                  label={t("compare.bathrooms")}
                  value={item.bathrooms ? `${item.bathrooms}` : "-"}
                />
                <InfoRow
                  icon={<Layers size={16} color={GREEN} />}
                  label={t("compare.floors")}
                  value={item.floor || "-"}
                />
                <InfoRow
                  icon={<LampCeiling size={16} color={GREEN} />}
                  label={t("compare.furnished")}
                  value={item.furnished_status || "-"}
                />
              </View>
            </View>
            <View className="flex-row pt-1">
              <View className="w-1/2">
                <InfoRow
                  icon={<Car size={16} color={GREEN} />}
                  label={t("compare.parking")}
                  value={item.parking ? t("compare.available") : "-"}
                />
              </View>
              <View className="w-1/2">
                <InfoRow
                  icon={<Clock size={16} color={GREEN} />}
                  label={t("compare.yearBuilt")}
                  value={item.year_built || "-"}
                />
              </View>
            </View>
          </View>

          {/* Description */}
          <View
            className="rounded-2xl px-5 py-4 mb-5 bg-white"
            style={{
              elevation: 3,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 10,
              borderWidth: 1,
              borderColor: GRAY_BORDER,
            }}
          >
            <Text className="text-base font-rubik-extrabold" style={{ color: TEXT_PRIMARY }}>
              {t("compare.description")}
            </Text>
            <View className="mt-3 pt-3" style={{ borderTopWidth: 2, borderTopColor: "#ED3F27" }}>
              <Text
                className="text-sm font-rubik leading-6"
                style={{ color: TEXT_SECONDARY }}
                numberOfLines={showFullDesc ? undefined : 3}
              >
                {item.description || t("compare.noDescription")}
              </Text>
              {isLongDesc && (
                <TouchableOpacity
                  onPress={() => setShowFullDesc(!showFullDesc)}
                  className="flex-row items-center gap-1 mt-2"
                >
                  <Text className="text-sm font-rubik-semibold" style={{ color: GREEN }}>
                    {showFullDesc ? t("compare.seeLess") : t("compare.seeMore")}
                  </Text>
                  {showFullDesc ? (
                    <ChevronUp size={14} color={GREEN} />
                  ) : (
                    <ChevronDown size={14} color={GREEN} />
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Features */}
          {features.length > 0 && (
            <View
              className="rounded-2xl px-5 py-4 mb-5 bg-white"
              style={{
                elevation: 3,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 10,
                borderWidth: 1,
                borderColor: GRAY_BORDER,
              }}
            >
              <Text className="text-base font-rubik-extrabold mb-3" style={{ color: TEXT_PRIMARY }}>
                {t("compare.features")}
              </Text>
              <View className="flex-row flex-wrap">
                {features.map((f: string, i: number) => (
                  <FeatureChip key={i} label={f} />
                ))}
              </View>
            </View>
          )}

          {/* Location */}
          <View
            className="rounded-2xl overflow-hidden mb-5 bg-white"
            style={{
              elevation: 3,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 10,
              borderWidth: 1,
              borderColor: GRAY_BORDER,
            }}
          >
            <View className="px-5 pt-4 pb-3">
              <Text className="text-base font-rubik-extrabold mb-1" style={{ color: TEXT_PRIMARY }}>
                {t("compare.location")}
              </Text>
              <View className="flex-row items-center gap-2">
                <MapPin size={15} color={GREEN} />
                <Text className="text-sm font-rubik flex-1" style={{ color: TEXT_SECONDARY }}>
                  {displayLocation}
                </Text>
              </View>
            </View>

            {mapUrl ? (
              <TouchableOpacity
                onPress={() =>
                  router.push(
                    `/property/map?latitude=${item.latitude}&longitude=${item.longitude}&title=${encodeURIComponent(displayTitle)}&address=${encodeURIComponent(displayLocation)}` as any,
                  )
                }
                activeOpacity={0.9}
                style={{ height: 180, borderTopWidth: 1, borderTopColor: GRAY_BORDER }}
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
                style={{ height: 120, borderTopWidth: 1, borderTopColor: GRAY_BORDER }}
              >
                <View className="flex-1 items-center justify-center" style={{ backgroundColor: GRAY_LIGHT }}>
                  <MapPin size={32} color={GREEN} />
                  <Text className="text-sm font-rubik-medium mt-1" style={{ color: GREEN }}>
                    {t("compare.openMap")}
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
              style={{ borderTopWidth: 1, borderTopColor: GRAY_BORDER }}
            >
              <Navigation size={15} color={GREEN} />
              <Text className="font-rubik-bold text-sm" style={{ color: GREEN }}>
                {t("compare.viewOnGoogleMaps")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Fullscreen Image Preview Modal */}
      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View className="flex-1 bg-black">
          <TouchableOpacity
            onPress={() => setIsModalVisible(false)}
            className="absolute top-14 right-5 z-10"
          >
            <X size={26} color="#ffffff" />
          </TouchableOpacity>

          <FlatList
            data={mediaDataset.filter((url: string) => !isVideoFile(url))}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={previewIndex}
            getItemLayout={(_, index) => ({
              length: SCREEN_WIDTH,
              offset: SCREEN_WIDTH * index,
              index,
            })}
            keyExtractor={(_, i) => String(i)}
            renderItem={({ item: imgUrl }) => (
              <Image
                source={{ uri: imgUrl }}
                style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
                resizeMode="contain"
              />
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

export default function CompareScreen() {
  const { t } = useTranslation();
  const items = useCompareStore((s) => s.items);
  const scrollRef = useRef<ScrollView>(null);
  const [, setPage] = useState(0);

  useEffect(() => {
    if (items.length === 0) return;
    const maxPage = items.length - 1;
    setPage((prev) => {
      if (prev > maxPage) {
        const newPage = maxPage;
        setTimeout(() => {
          scrollRef.current?.scrollTo({
            x: newPage * SCREEN_WIDTH,
            animated: false,
          });
        }, 0);
        return newPage;
      }
      return prev;
    });
  }, [items.length]);

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-primary-200">
        <BackButton onPress={() => router.back()} />
        <Text className="flex-1 text-lg font-rubik-bold text-black-300 text-center mr-10">
          {t("compare.title")}
        </Text>
      </View>

      {items.length === 0 ? (
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-black-100 text-lg font-rubik-bold">
            {t("compare.empty")}
          </Text>
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const page = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
            setPage(page);
          }}
        >
          {items.map((item: any) => (
            <PropertyDetail key={item.id} item={item} />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
