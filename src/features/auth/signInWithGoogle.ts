import { isDevice } from "expo-device";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";

import { supabase } from "@/shared/lib/supabase";
import {
  handleAuthCallbackUrl,
  resetAuthCallbackLock,
} from "@/shared/lib/handleAuthCallback";

const isIOSSimulator = Platform.OS === "ios" && !isDevice;

export async function signInWithGoogle() {
  const redirectUrl = Linking.createURL("auth/callback");

  resetAuthCallbackLock();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: redirectUrl,
      queryParams: {
        prompt: "select_account",
      },
    },
  });

  if (error) throw error;
  if (!data?.url) {
    throw new Error("Failed to get OAuth URL. Is Google provider enabled in Supabase?");
  }

  if (isIOSSimulator) {
    await Linking.openURL(data.url);
    return;
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
  await WebBrowser.maybeCompleteAuthSession();

  if (result.type === "success") {
    await handleAuthCallbackUrl(result.url);
  }
}
