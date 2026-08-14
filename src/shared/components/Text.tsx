import React from "react";
import {
  Text as RNText,
  StyleSheet,
  TextProps,
  TextStyle,
} from "react-native";
import { useLanguageStore } from "@/shared/store/useLanguageStore";

const FONT_SIZE_MAP: Record<string, number> = {
  "text-2xs": 10,
  "text-xs": 12,
  "text-sm": 14,
  "text-base": 16,
  "text-lg": 18,
  "text-xl": 20,
  "text-2xl": 24,
  "text-3xl": 30,
  "text-4xl": 36,
};

function extractFontSize(className?: string, style?: TextProps["style"]): number {
  if (className) {
    for (const key of Object.keys(FONT_SIZE_MAP)) {
      if (className.includes(key)) return FONT_SIZE_MAP[key];
    }
  }
  const flat = StyleSheet.flatten(style) as TextStyle | undefined;
  return flat?.fontSize ?? 14;
}

function containsBurmese(content: TextProps["children"]): boolean {
  const text = Array.isArray(content)
    ? content.map((c) => (typeof c === "string" ? c : "")).join("")
    : typeof content === "string" || typeof content === "number"
      ? String(content)
      : "";
  // Myanmar script Unicode block: U+1000–U+109F
  return /[\u1000-\u109F]/.test(text);
}

function hasVerticalPadding(className?: string, style?: TextProps["style"]): boolean {
  if (className && /(^|\s)(p|pt|pb|py)-[^ ]+/.test(className)) return true;
  const flat = StyleSheet.flatten(style) as TextStyle | undefined;
  return (
    flat?.paddingTop != null ||
    flat?.paddingBottom != null ||
    flat?.paddingVertical != null
  );
}

export default function Text({ className, style, children, ...props }: TextProps & { className?: string }) {
  const language = useLanguageStore((s) => s.language);
  const isBurmese = language === "mm" || containsBurmese(children);

  const fontSize = extractFontSize(className, style);

  const burmeseStyle: TextStyle = isBurmese
    ? {
        lineHeight: Math.round(fontSize * 1.8),
        ...(hasVerticalPadding(className, style)
          ? {}
          : {
              paddingTop: fontSize >= 20 ? 5 : 4,
              paddingBottom: fontSize >= 20 ? 5 : 4,
            }),
        overflow: "visible",
      }
    : {};

  return <RNText {...props} className={className} style={[style, burmeseStyle]}>{children}</RNText>;
}
