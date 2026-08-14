import { Stack } from "expo-router";
import React from "react";

export default function SearchLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* (search)/search.tsx ဖိုင်ကို ချိတ်ဆက်တာဖြစ်ပါတယ် */}
      <Stack.Screen name="index" />
    </Stack>
  );
}
