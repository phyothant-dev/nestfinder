import { Eye, GitCompare, Heart, Share2 } from "lucide-react-native";
import { Image, Pressable, Share, Text, TouchableOpacity, View } from "react-native";
import React, { useState } from "react";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80";

interface Props {
  item: any;
  onPress?: () => void;
  onSave?: () => void;
  onCompare?: () => void;
  isSaved?: boolean;
  compareSelected?: boolean;
}

const propertyTypeMap: Record<string, string> = {
  apartment: "တိုက်ခန်း",
  condo: "ကွန်ဒို",
  house: "လုံးချင်းအိမ်",
  land: "မြေကွက်",
  hostel: "အဆောင်",
};

const getFloorLabel = (floor?: string) => {
  switch (floor) {
    case "ground": return "မြေညီ";
    case "ground_attic": return "မြေညီ + attic";
    case "low": return "အောက်ခြေ (၁-၄)";
    case "mid": return "အလယ် (၅-၈)";
    case "high": return "အထက် (၉+)";
    default: return "";
  }
};

const SLATE_GRAY = "#64748B";
const DIVIDER = "#E5E7EB";
const PRESS_BG = "#F8FAFC";

function ActionButton({ onPress, children }: { onPress?: () => void; children: React.ReactNode }) {
  const [pressed, setPressed] = useState(false);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const animate = (toScale: number, toOpacity: number) => {
    scale.value = withTiming(toScale, { duration: 150, easing: Easing.out(Easing.quad) });
    opacity.value = withTiming(toOpacity, { duration: 150, easing: Easing.out(Easing.quad) });
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        setPressed(true);
        animate(0.88, 0.7);
      }}
      onPressOut={() => {
        setPressed(false);
        animate(1, 1);
      }}
      className="flex-1 items-center justify-center"
      style={{ backgroundColor: pressed ? PRESS_BG : "transparent", minHeight: 44 }}
    >
      <Animated.View style={pressStyle}>{children}</Animated.View>
    </Pressable>
  );
}

export const Card = ({ item, onPress, onSave, onCompare, isSaved, compareSelected }: Props) => {
  const displayImage = item.images?.[0] || item.image || DEFAULT_IMAGE;
  const displayPrice =
    item.currency_unit === "lakhs"
      ? `${item.price} သိန်း (ကျပ်)`
      : `$${item.price}`;
  const regionName = item.states_regions
    ? item.states_regions.name_mm || item.states_regions.name_en
    : "";
  const townshipName = item.townships
    ? item.townships.name_mm || item.townships.name_en
    : "";
  const typeLabel = propertyTypeMap[item.property_type] || "အိမ်ခြံမြေ";
  const floorLabel = getFloorLabel(item.floor);
  const areaLabel = item.area_value
    ? `${item.area_value} ${item.area_unit === "sqft" ? "စတုရန်းပေ" : "ဧက"}`
    : "";

  const heartOpacity = useSharedValue(1);
  const heartScale = useSharedValue(1);

  const heartStyle = useAnimatedStyle(() => ({
    opacity: heartOpacity.value,
    transform: [{ scale: heartScale.value }],
  }));

  const handleHeartPress = () => {
    heartOpacity.value = withSequence(
      withTiming(0, { duration: 100, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: 320, easing: Easing.inOut(Easing.cubic) }),
    );
    heartScale.value = withSequence(
      withSpring(1.3, { damping: 18, stiffness: 260, mass: 0.7 }),
      withSpring(1, { damping: 18, stiffness: 260, mass: 0.7 }),
    );
    onSave?.();
  };

  const handleShare = async () => {
    await Share.share({
      message: `https://warm-bublanina-7b1ea2.netlify.app/property/${item.id}`,
    });
  };

  return (
    <TouchableOpacity
      className="bg-white rounded-2xl overflow-hidden border border-primary-200 mb-4 mx-5"
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View>
        <Image
          source={{ uri: displayImage }}
          className="w-full h-44"
          resizeMode="cover"
        />
        {item.is_sold && (
          <View className="absolute top-3 left-3 bg-danger px-3 py-1 rounded-full">
            <Text className="text-white text-xs font-rubik-extrabold">
              ရောင်းပြီး{item.sold_at ? ` ${new Date(item.sold_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : ""}
            </Text>
          </View>
        )}
      </View>

      <View className="px-4 pt-3 pb-2 gap-1.5">
        <Text className="text-[#FEB21A] text-base font-rubik" numberOfLines={1}>
          {regionName} | {townshipName}
        </Text>
        <Text className="text-black-300 text-base font-rubik-extrabold" numberOfLines={1}>
          {typeLabel}
          {floorLabel ? ` | ${floorLabel}` : ""}
        </Text>
        {areaLabel ? (
          <Text className="text-black-300 text-base font-rubik-extrabold" numberOfLines={1}>
            {areaLabel}
          </Text>
        ) : null}
        <Text className="text-sky-500 text-xl font-rubik-extrabold mt-1">
          {displayPrice}
        </Text>
      </View>

      <View
        className="flex-row border-t bg-white overflow-hidden"
        style={{ borderTopColor: DIVIDER, height: 60 }}
      >
        <ActionButton onPress={handleHeartPress}>
          <Animated.View style={heartStyle}>
            <Heart
              size={22}
              color={isSaved ? "#ED3F27" : SLATE_GRAY}
              fill={isSaved ? "#ED3F27" : "transparent"}
            />
          </Animated.View>
        </ActionButton>
        <View className="w-px self-stretch" style={{ backgroundColor: DIVIDER }} />
        <ActionButton onPress={handleShare}>
          <Share2 size={22} color={SLATE_GRAY} />
        </ActionButton>
        <View className="w-px self-stretch" style={{ backgroundColor: DIVIDER }} />
        <ActionButton onPress={onCompare}>
          <GitCompare size={22} color={compareSelected ? "#134686" : SLATE_GRAY} />
        </ActionButton>
      </View>
    </TouchableOpacity>
  );
};

export const FeaturedCard = ({ item, onPress }: Props) => {
  const displayImage = item.images?.[0] || item.image || DEFAULT_IMAGE;
  const displayTitle = item.title_mm || item.title_en || item.name || "";
  const displayLocation = item.search_value || item.address || "";
  const displayPrice =
    item.currency_unit === "lakhs"
      ? `${item.price} သိန်း (ကျပ်)`
      : `$${item.price}`;

  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex flex-col items-start w-60 h-80 relative"
    >
      <Image source={{ uri: displayImage }} className="size-full rounded-2xl" />

      <View className="size-full rounded-2xl absolute bottom-0 bg-black/30" />

      <View className="flex flex-row items-center bg-white/90 px-3 py-1.5 rounded-full absolute top-5 right-5">
        <Eye size={14} color="#134686" />
        <Text className="text-xs font-rubik-bold text-primary-300 ml-1">
          {item.views ?? 0}
        </Text>
      </View>

      <View className="flex flex-col items-start absolute bottom-5 inset-x-5">
        <Text
          className="text-xl font-rubik-extrabold text-white"
          numberOfLines={1}
        >
          {displayTitle}
        </Text>
        <Text className="text-base font-rubik text-white" numberOfLines={1}>
          {displayLocation}
        </Text>

        <View className="flex flex-row items-center justify-between w-full mt-1">
          <Text className="text-xl font-rubik-extrabold text-white">
            {displayPrice}
          </Text>
          <Heart size={20} color="white" />
        </View>
      </View>
    </TouchableOpacity>
  );
};
