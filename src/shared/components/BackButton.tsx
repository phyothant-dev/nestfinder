import { ChevronLeft } from "lucide-react-native";
import React from "react";
import { TouchableOpacity } from "react-native";

interface BackButtonProps {
  onPress: () => void;
  className?: string;
}

export function BackButton({ onPress, className = "" }: BackButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      className={`w-10 h-10 items-center justify-center rounded-full bg-primary-100 ${className}`}
    >
      <ChevronLeft size={24} color="#134686" />
    </TouchableOpacity>
  );
}
