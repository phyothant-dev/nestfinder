import React from "react";
import Text from "@/shared/components/Text";

interface HeadingProps {
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function Heading({ children, size = "md", className }: HeadingProps) {
  let sizeClass = "text-lg";

  if (size === "sm") sizeClass = "text-base";
  if (size === "lg") sizeClass = "text-xl";
  if (size === "xl") sizeClass = "text-2xl";

  return (
    <Text
      className={`text-slate-900 font-bold ${sizeClass} ${className || ""}`}
    >
      {children}
    </Text>
  );
}
