import { File, Paths } from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import { Check, Download, X } from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Modal,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
} from "@/shared/components/alertdialog/alertdialog";
import { Button, ButtonText } from "@/shared/components/button/button";
import { Heading } from "@/shared/components/heading/heading";

const { width: WINDOW_WIDTH, height: WINDOW_HEIGHT } = Dimensions.get("window");
const MIN_SCALE = 1;
const MAX_SCALE = 4;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function ZoomableImage({ uri }: { uri: string }) {
  const scale = useSharedValue(MIN_SCALE);
  const savedScale = useSharedValue(MIN_SCALE);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);

  const pinch = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((event) => {
      scale.value = clamp(savedScale.value * event.scale, MIN_SCALE, MAX_SCALE);
    })
    .onEnd(() => {
      if (scale.value <= MIN_SCALE) {
        scale.value = withTiming(MIN_SCALE);
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
      }
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > MIN_SCALE) {
        scale.value = withTiming(MIN_SCALE);
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
      } else {
        scale.value = withTiming(2);
      }
    });

  const pan = Gesture.Pan()
    .minPointers(1)
    .onStart(() => {
      if (scale.value <= MIN_SCALE) {
        return;
      }
      savedX.value = translateX.value;
      savedY.value = translateY.value;
    })
    .onUpdate((event) => {
      if (scale.value <= MIN_SCALE) return;
      const maxX = (WINDOW_WIDTH * (scale.value - 1)) / 2;
      const maxY = (WINDOW_HEIGHT * (scale.value - 1)) / 2;
      translateX.value = clamp(savedX.value + event.translationX, -maxX, maxX);
      translateY.value = clamp(savedY.value + event.translationY, -maxY, maxY);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={Gesture.Simultaneous(pinch, pan, doubleTap)}>
      <Animated.View
        style={[
          {
            width: WINDOW_WIDTH,
            height: WINDOW_HEIGHT,
            alignItems: "center",
            justifyContent: "center",
          },
          animatedStyle,
        ]}
      >
        <Animated.Image
          source={{ uri }}
          style={{ width: WINDOW_WIDTH, height: WINDOW_HEIGHT }}
          resizeMode="contain"
        />
      </Animated.View>
    </GestureDetector>
  );
}

interface ImageViewerProps {
  visible: boolean;
  images: string[];
  initialIndex?: number;
  onClose: () => void;
}

export default function ImageViewer({
  visible,
  images,
  initialIndex = 0,
  onClose,
}: ImageViewerProps) {
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showSavedDialog, setShowSavedDialog] = useState(false);

  useEffect(() => {
    if (visible) {
      setActiveIndex(initialIndex);
      requestAnimationFrame(() => {
        listRef.current?.scrollToIndex({ index: initialIndex, animated: false });
      });
    }
  }, [visible, initialIndex]);

  const onMomentumScrollEnd = useCallback((event: any) => {
    const index = Math.round(
      event.nativeEvent.contentOffset.x / WINDOW_WIDTH,
    );
    setActiveIndex(index);
  }, []);

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: WINDOW_WIDTH,
      offset: WINDOW_WIDTH * index,
      index,
    }),
    [],
  );

  const handleSave = useCallback(async () => {
    const uri = images[activeIndex];
    if (!uri || saving) return;
    setSaving(true);
    setSaved(false);
    try {
      if (Platform.OS === "web") {
        const doc = (globalThis as any).document;
        if (doc) {
          const a = doc.createElement("a");
          a.href = uri;
          a.download = `image_${activeIndex + 1}.jpg`;
          doc.body.appendChild(a);
          a.click();
          a.remove();
        } else {
          window.open(uri, "_blank");
        }
      } else {
        const ext = uri.split(/[?#]/)[0].split(".").pop()?.toLowerCase();
        const safeExt = ext && ext.length <= 5 ? ext : "jpg";
        const dest = new File(Paths.cache, `image_${Date.now()}.${safeExt}`);
        const file = await File.downloadFileAsync(uri, dest);
        const permission = await MediaLibrary.requestPermissionsAsync(true);
        if (!permission.granted) {
          Alert.alert(
            "Permission Needed",
            "Allow photo library access to save images.",
          );
          return;
        }
        await MediaLibrary.saveToLibraryAsync(file.uri);
        setSaved(true);
        setShowSavedDialog(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (error) {
      console.error("Image save error:", error);
      Alert.alert("Save Failed", "Could not save the image. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [images, activeIndex, saving]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="fade"
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: "#000" }}>
          <FlatList
            ref={listRef}
            data={images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, index) => String(index)}
            getItemLayout={getItemLayout}
            onMomentumScrollEnd={onMomentumScrollEnd}
            renderItem={({ item }) => <ZoomableImage uri={item} />}
          />

          <Pressable
            onPress={handleSave}
            disabled={saving}
            hitSlop={12}
            style={{
              position: "absolute",
              top: insets.top + 8,
              left: 16,
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: "rgba(0,0,0,0.55)",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10,
            }}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : saved ? (
              <Check size={20} color="#134686" />
            ) : (
              <Download size={20} color="#fff" />
            )}
          </Pressable>

          <Pressable
            onPress={onClose}
            hitSlop={12}
            style={{
              position: "absolute",
              top: insets.top + 8,
              right: 16,
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: "rgba(0,0,0,0.55)",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10,
            }}
          >
            <X size={20} color="#fff" />
          </Pressable>

          <View
            style={{
              position: "absolute",
              bottom: insets.bottom + 24,
              left: 0,
              right: 0,
              alignItems: "center",
              zIndex: 10,
            }}
          >
            <Text
              style={{
                color: "#fff",
                fontSize: 13,
                fontWeight: "600",
                backgroundColor: "rgba(0,0,0,0.55)",
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 999,
                overflow: "hidden",
              }}
            >
              {activeIndex + 1} / {images.length}
            </Text>
          </View>

          <AlertDialog
            isOpen={showSavedDialog}
            onClose={() => setShowSavedDialog(false)}
          >
            <AlertDialogBackdrop />
            <AlertDialogContent className="p-6 rounded-3xl bg-white items-center">
              <AlertDialogHeader>
                <Heading className="text-black-300">Image Saved</Heading>
              </AlertDialogHeader>
              <AlertDialogBody>
                <Text className="text-center text-black-200">
                  The image has been saved to your photo library.
                </Text>
              </AlertDialogBody>
              <AlertDialogFooter className="w-full">
                <Button
                  onPress={() => setShowSavedDialog(false)}
                  className="flex-1"
                >
                  <ButtonText>OK</ButtonText>
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}
