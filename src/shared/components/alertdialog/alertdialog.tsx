import React from "react";
import { Modal, View } from "react-native";

interface AlertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function AlertDialog({ isOpen, onClose, children }: AlertDialogProps) {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isOpen}
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-center items-center bg-black/50 px-4">
        {children}
      </View>
    </Modal>
  );
}

export function AlertDialogBackdrop() {
  // Handled inherently by the overlay transparent background View layer above
  return null;
}

export function AlertDialogContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <View
      className={`bg-white rounded-2xl p-5 w-full max-w-[85%] shadow-xl ${className || ""}`}
    >
      {children}
    </View>
  );
}

export function AlertDialogHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <View className={`pb-2 mb-2 ${className || ""}`}>{children}</View>;
}

export function AlertDialogBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <View className={`mb-4 ${className || ""}`}>{children}</View>;
}

export function AlertDialogFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <View className={`flex-row justify-end gap-2 ${className || ""}`}>
      {children}
    </View>
  );
}
