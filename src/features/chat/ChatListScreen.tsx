import React from "react";
import { StatusBar } from "expo-status-bar";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ChatList } from "@/features/chat/chat_list";

export default function TabChatScreen() {

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: "#FDF4E3" }]}>
      <StatusBar style="dark" />
      <ChatList />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
