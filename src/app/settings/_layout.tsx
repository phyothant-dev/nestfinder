import { Stack } from "expo-router";
import React from "react";

export default function SettingsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="account" />
      <Stack.Screen name="language" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="privacy" />
    </Stack>
  );
}
