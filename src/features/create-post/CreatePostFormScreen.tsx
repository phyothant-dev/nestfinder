import CreatePostForm from "@/features/create-post/createpostform";
import { router, useLocalSearchParams } from "expo-router";

export default function CreatePostFormScreen() {
  const { dealType, dealTitle } = useLocalSearchParams();

  return (
    <CreatePostForm
      dealType={String(dealType)}
      dealTitle={String(dealTitle)}
      onBack={() => router.back()}
    />
  );
}
