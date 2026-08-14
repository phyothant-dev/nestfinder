import { supabase } from "@/shared/lib/supabase";
import { router } from "expo-router";
import * as Linking from "expo-linking";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { Home } from "lucide-react-native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { TouchableOpacity, View } from "react-native";
import Text from "@/shared/components/Text";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const [checking, setChecking] = useState(true);

  const iconScale = useSharedValue(0);
  const iconOpacity = useSharedValue(0);
  const titleOffset = useSharedValue(40);
  const titleOpacity = useSharedValue(0);
  const subtitleOffset = useSharedValue(40);
  const subtitleOpacity = useSharedValue(0);
  const buttonOffset = useSharedValue(40);
  const buttonOpacity = useSharedValue(0);

  const hideSplash = () => {
    SplashScreen.hideAsync().catch(() => {});
  };

  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      if (url && url.includes("reset-password")) {
        router.replace("/(auth)/reset-password");
        hideSplash();
        return;
      }

      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          router.replace("/(tabs)");
        } else {
          setChecking(false);
        }
        hideSplash();
      });
    });
  }, []);

  useEffect(() => {
    iconScale.value = withDelay(200, withTiming(1, { duration: 700, easing: Easing.out(Easing.back(1.5)) }));
    iconOpacity.value = withDelay(200, withTiming(1, { duration: 500 }));
    titleOpacity.value = withDelay(700, withTiming(1, { duration: 600 }));
    titleOffset.value = withDelay(700, withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) }));
    subtitleOpacity.value = withDelay(1100, withTiming(1, { duration: 600 }));
    subtitleOffset.value = withDelay(1100, withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) }));
    buttonOpacity.value = withDelay(1500, withTiming(1, { duration: 600 }));
    buttonOffset.value = withDelay(1500, withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) }));
  }, []);

  const iconStyle = useAnimatedStyle(() => ({
    opacity: iconOpacity.value,
    transform: [{ scale: iconScale.value }],
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleOffset.value }],
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
    transform: [{ translateY: subtitleOffset.value }],
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ translateY: buttonOffset.value }],
  }));

  if (checking) {
    return <View className="flex-1 bg-cream" />;
  }

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <StatusBar style="dark" />

      <View className="flex-1 justify-center px-8">
        <Animated.View className="items-center mb-10" style={iconStyle}>
          <View className="w-32 h-32 bg-primary-200 rounded-full items-center justify-center">
            <View className="w-24 h-24 bg-white rounded-full items-center justify-center shadow-lg shadow-primary-300/20">
              <Home size={48} color="#134686" />
            </View>
          </View>
        </Animated.View>

        <Animated.View style={titleStyle}>
          <Text className="text-4xl font-rubik-black text-black-300 text-center leading-tight mb-4">
            {t("findDreamHome")}
          </Text>
        </Animated.View>

        <Animated.View style={subtitleStyle}>
          <Text className="text-base font-rubik text-black-100 text-center leading-relaxed">
            {t("onboardingSubtitle")}
          </Text>
        </Animated.View>
      </View>

      <View className="px-8 pb-16">
        <Animated.View style={buttonStyle}>
          <TouchableOpacity
            onPress={() => router.replace("/(tabs)")}
            className="w-full bg-primary-300 py-5 rounded-2xl active:opacity-80 shadow-xl shadow-primary-300/40"
          >
            <Text className="text-center text-white text-lg font-rubik-bold">
              {t("getStarted")}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}
