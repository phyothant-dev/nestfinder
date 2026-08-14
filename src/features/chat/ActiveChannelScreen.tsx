import { useLocalSearchParams } from "expo-router";
import React from "react";
import ChatRoomScreen from "@/features/chat/chat_screen";

export default function ActiveChannelScreen() {
  const { channelId } = useLocalSearchParams<{ channelId: string }>();
  if (!channelId) return null;
  return <ChatRoomScreen channelId={channelId} />;
}
