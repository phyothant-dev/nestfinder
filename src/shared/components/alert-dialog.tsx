import { createAlertDialog } from "@gluestack-ui/alert-dialog";
import React, { forwardRef } from "react";
import { Pressable, View } from "react-native";

const AlertDialogRoot = forwardRef(
  ({ children, className, ...props }: any, ref) => (
    <View
      ref={ref}
      className={`flex-1 justify-center items-center ${className || ""}`}
      {...props}
    >
      {children}
    </View>
  ),
);
AlertDialogRoot.displayName = "AlertDialogRoot";

const AlertDialogContent = forwardRef(
  ({ children, className, ...props }: any, ref) => (
    <View ref={ref} className={className} {...props}>
      {children}
    </View>
  ),
);
AlertDialogContent.displayName = "AlertDialogContent";

const AlertDialogCloseButton = forwardRef(
  ({ children, className, ...props }: any, ref) => (
    <Pressable ref={ref} className={className} {...props}>
      {children}
    </Pressable>
  ),
);
AlertDialogCloseButton.displayName = "AlertDialogCloseButton";

const AlertDialogHeader = forwardRef(
  ({ children, className, ...props }: any, ref) => (
    <View ref={ref} className={className} {...props}>
      {children}
    </View>
  ),
);
AlertDialogHeader.displayName = "AlertDialogHeader";

const AlertDialogFooter = forwardRef(
  ({ children, className, ...props }: any, ref) => (
    <View ref={ref} className={className} {...props}>
      {children}
    </View>
  ),
);
AlertDialogFooter.displayName = "AlertDialogFooter";

const AlertDialogBody = forwardRef(
  ({ children, className, ...props }: any, ref) => (
    <View ref={ref} className={className} {...props}>
      {children}
    </View>
  ),
);
AlertDialogBody.displayName = "AlertDialogBody";

const AlertDialogBackdrop = forwardRef(
  ({ children, className, ...props }: any, ref) => (
    <View
      ref={ref}
      className={`absolute inset-0 bg-black/50 ${className || ""}`}
      {...props}
    >
      {children}
    </View>
  ),
);
AlertDialogBackdrop.displayName = "AlertDialogBackdrop";

const AnimatePresence = ({ children }: any) => children;

export const AlertDialog = createAlertDialog({
  Root: AlertDialogRoot,
  Content: AlertDialogContent,
  CloseButton: AlertDialogCloseButton,
  Header: AlertDialogHeader,
  Footer: AlertDialogFooter,
  Body: AlertDialogBody,
  Backdrop: AlertDialogBackdrop,
  AnimatePresence,
});
