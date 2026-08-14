import { supabase } from "@/shared/lib/supabase";
import { router } from "expo-router";

let processingLock = false;

async function syncProfileAvatar() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const googleIdentity = user.identities?.find(
    (id) => id.provider === "google",
  );
  const googleAvatarUrl =
    user.user_metadata?.avatar_url ||
    user.user_metadata?.picture ||
    googleIdentity?.identity_data?.avatar_url ||
    googleIdentity?.identity_data?.picture ||
    null;
  const fullName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    googleIdentity?.identity_data?.full_name ||
    googleIdentity?.identity_data?.name ||
    user.email?.split("@")[0] ||
    "User";

  // Check if profile already has an avatar
  const { data: existing } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", user.id)
    .single();

  const avatarUrl =
    existing?.avatar_url || googleAvatarUrl;

  await supabase.from("profiles").upsert(
    {
      id: user.id,
      full_name: fullName,
      avatar_url: avatarUrl,
      email: user.email,
    },
    { onConflict: "id" },
  );
}

export function resetAuthCallbackLock() {
  processingLock = false;
}

export async function handleAuthCallbackUrl(url: string) {
  if (!url.includes("auth/callback")) return false;
  if (processingLock) return false;

  processingLock = true;

  // 1. PKCE flow — code is in query params, preserved by Android
  const queryStart = url.indexOf("?");
  if (queryStart !== -1) {
    const queryString = url.slice(queryStart + 1).split("#")[0];
    const queryParams = queryString.split("&").reduce<Record<string, string>>(
      (acc, pair) => {
        const eqIdx = pair.indexOf("=");
        if (eqIdx === -1) return acc;
        const key = pair.slice(0, eqIdx);
        const value = pair.slice(eqIdx + 1);
        acc[key] = decodeURIComponent(value);
        return acc;
      },
      {},
    );

    if (queryParams.code) {
      const { error } = await supabase.auth.exchangeCodeForSession(
        queryParams.code,
      );
      if (!error) {
        await syncProfileAvatar();
        router.replace("/(tabs)");
        return true;
      }
    }
  }

  // 2. Implicit flow fallback — fragment with access_token
  const fragment = url.split("#")[1];
  if (fragment) {
    const params = fragment.split("&").reduce<Record<string, string>>(
      (acc, pair) => {
        const eqIdx = pair.indexOf("=");
        if (eqIdx === -1) return acc;
        const key = pair.slice(0, eqIdx);
        const value = pair.slice(eqIdx + 1);
        acc[key] = decodeURIComponent(value);
        return acc;
      },
      {},
    );

    const { access_token, refresh_token } = params;

    if (access_token) {
      const { error } = await supabase.auth.setSession({
        access_token,
        refresh_token: refresh_token || "",
      });
      if (!error) {
        await syncProfileAvatar();
        router.replace("/(tabs)");
        return true;
      }
    }
  }

  processingLock = false;
  return false;
}
