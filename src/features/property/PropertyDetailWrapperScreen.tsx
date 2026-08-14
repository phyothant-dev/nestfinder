import Details from "@/features/property/details";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

export default function DetailPage() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
      <Details propertyId={id} onBack={() => router.back()} />
    </SafeAreaView>
  );
}
