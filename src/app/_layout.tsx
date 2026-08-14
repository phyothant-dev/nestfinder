import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { router, Stack } from "expo-router";
import * as Linking from "expo-linking";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import "../../global.css";

SplashScreen.preventAutoHideAsync();

import i18n from "@/shared/lib/i18n";
import {
  registerForPushNotifications,
  savePushToken,
  setupNotificationListeners,
} from "@/shared/lib/notifications";
import { useLanguageStore } from "@/shared/store/useLanguageStore";
import { useNetworkListener } from "@/shared/hooks/useNetworkListener";
import OfflineOverlay from "@/shared/components/OfflineOverlay";

export default function RootLayout() {
  useEffect(() => {
    useLanguageStore.getState().loadLanguage();
  }, []);

  useNetworkListener();

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const unsub = useLanguageStore.subscribe((state) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => i18n.changeLanguage(state.language), 0);
    });
    return () => { clearTimeout(timeout); unsub(); };
  }, []);

  useEffect(() => {
    const handleDeepLink = (url: string) => {
      const path = url.replace(/.*?:\/\//, "").replace(/^\/+/, "");

      if (path.startsWith("reset-password")) {
        router.push("/(auth)/reset-password");
        return;
      }

      const propertyMatch = path.match(/(?:^|\/)property\/([^?#]+)/);
      if (propertyMatch) {
        router.push(`/property/${propertyMatch[1]}`);
      }
    };

    const subscription = Linking.addEventListener("url", (event) => {
      handleDeepLink(event.url);
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    registerForPushNotifications().then((token) => {
      if (token) savePushToken(token);
    });

    const sub = setupNotificationListeners((data) => {
      if (data.screen === "chat" && data.conversationId) {
        router.push(`/chat/${data.conversationId}`);
      } else if (data.screen === "property" && data.propertyId) {
        router.push(`/property/${data.propertyId}`);
      }
    });

    return () => sub.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <BottomSheetModalProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="chat" />
          </Stack>
          <OfflineOverlay />
        </BottomSheetModalProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
