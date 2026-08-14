import { supabase } from "@/shared/lib/supabase";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef } from "react";
import { ActivityIndicator, View } from "react-native";

import { handleAuthCallbackUrl } from "@/shared/lib/handleAuthCallback";

export default function AuthCallback() {
  const params = useLocalSearchParams();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    (async () => {
      for (let attempt = 0; attempt < 10; attempt++) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          router.replace("/(tabs)");
          return;
        }
        if (attempt < 9) await new Promise((r) => setTimeout(r, 500));
      }

      const code = params.code as string | undefined;
      const access_token = params.access_token as string | undefined;

      if (code) {
        const url = `auth/callback?code=${code}`;
        const ok = await handleAuthCallbackUrl(url);
        if (!ok) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) router.replace("/(tabs)");
          else router.replace("/(auth)/login");
        }
        return;
      }

      if (access_token) {
        let url = `auth/callback#access_token=${access_token}`;
        const refresh_token = params.refresh_token as string | undefined;
        if (refresh_token) url += `&refresh_token=${refresh_token}`;
        const ok = await handleAuthCallbackUrl(url);
        if (!ok) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) router.replace("/(tabs)");
          else router.replace("/(auth)/login");
        }
        return;
      }

      setTimeout(() => router.replace("/(auth)/login"), 5000);
    })();
  }, [params.code, params.access_token, params.refresh_token]);

  return (
    <View className="flex-1 justify-center items-center bg-cream">
      <ActivityIndicator size="large" color="#134686" />
    </View>
  );
}
