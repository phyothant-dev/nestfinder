import { Platform } from "react-native";
import { supabase } from "./supabase";

let Device: any = null;
let Notifications: any = null;

try {
  Device = require("expo-device");
  Notifications = require("expo-notifications");

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
} catch {
  console.warn("expo-device or expo-notifications not available");
}

export async function registerForPushNotifications() {
  if (!Device || !Notifications) return null;
  if (!Device.isDevice) return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") return null;

  let token: string;
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    token = tokenData.data;
  } catch (err) {
    console.warn("Push token unavailable:", err);
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  return token;
}

export async function savePushToken(token: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const platform = Platform.OS === "ios" ? "ios" : "android";

  const { data: existing } = await supabase
    .from("push_tokens")
    .select("id")
    .eq("user_id", user.id)
    .eq("token", token)
    .maybeSingle();

  if (existing) return;

  await supabase.from("push_tokens").upsert(
    { user_id: user.id, token, platform },
    { onConflict: "user_id,token" },
  );
}

export async function removePushToken(token: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("push_tokens")
    .delete()
    .eq("user_id", user.id)
    .eq("token", token);
}

export function setupNotificationListeners(
  onNotificationTap: (data: Record<string, string>) => void,
) {
  if (!Notifications) return { remove: () => {} };

  const responseSub = Notifications.addNotificationResponseReceivedListener(
    (response: any) => {
      const data = response.notification.request.content.data as Record<string, string>;
      onNotificationTap(data);
    },
  );

  return responseSub;
}

export async function sendNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>,
) {
  try {
    const { error } = await supabase.functions.invoke("send-notification", {
      body: { userId, title, body, data },
    });
    if (error) console.error("sendNotification error:", error);
  } catch (err) {
    console.error("sendNotification error:", err);
  }
}
