import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Linking from "expo-linking";
import React, { useEffect } from "react";

import { handleAuthCallbackUrl } from "@/shared/lib/handleAuthCallback";

export default function AuthLayout() {
  useEffect(() => {
    const subscription = Linking.addEventListener("url", (event) => {
      if (event.url.includes("auth/callback")) {
        handleAuthCallbackUrl(event.url);
      }
    });

    return () => subscription.remove();
  }, []);

  return (
    <>
      {/* Forces a consistent status bar appearance across login/register screens */}
      <StatusBar style="dark" />

      <Stack
        screenOptions={{
          // Hides the default native header bar globally for all auth screens
          headerShown: false,

          // Background color behind screens during transitions
          contentStyle: { backgroundColor: "#FDF4E3" },

          // Smooth slide animation on iOS and Android
          animation: "slide_from_right",
        }}
      >
        {/* Explicitly defining the screens makes route ordering clear */}
        <Stack.Screen
          name="login"
          options={{
            animationTypeForReplace: "pop",
          }}
        />
        <Stack.Screen
          name="register"
          options={{
            animationTypeForReplace: "pop",
          }}
        />
        <Stack.Screen
          name="forgot_password"
          options={{
            animationTypeForReplace: "pop",
          }}
        />
        <Stack.Screen
          name="reset-password"
          options={{
            animationTypeForReplace: "pop",
          }}
        />
      </Stack>
    </>
  );
}
