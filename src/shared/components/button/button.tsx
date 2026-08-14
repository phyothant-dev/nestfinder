import React from "react";
import { Text, TouchableOpacity } from "react-native";

// Updated interface to support all the props you are passing
interface ButtonProps {
  children: React.ReactNode;
  onPress: () => void;
  className?: string;
  variant?: "solid" | "outline";
  action?: "primary" | "secondary";
  size?: "xs" | "sm" | "md" | "lg";
}

export function Button({ children, onPress, variant, action, className }: ButtonProps) {
  const isOutline = variant === "outline";
  const baseClasses = isOutline
    ? "bg-white border rounded-xl px-5 py-2.5 items-center justify-center"
    : "bg-primary-300 rounded-xl px-5 py-2.5 items-center justify-center";
  const borderClass = isOutline ? (action === "secondary" ? "border-primary-300" : "border-primary-300") : "";
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      className={`${baseClasses} ${borderClass} ${className || ""}`}
    >
      {children}
    </TouchableOpacity>
  );
}

export function ButtonText({
  children,
  className,
  variant,
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "solid" | "outline";
}) {
  const textColor = variant === "outline" ? "text-primary-300" : "text-white";
  return (
    <Text className={`${textColor} font-semibold text-sm ${className || ""}`}>
      {children}
    </Text>
  );
}
