import { supabase } from "@/shared/lib/supabase";
import { router, useFocusEffect } from "expo-router";
import {
  Archive,
  BellOff,
  MessageCircle,
  Pin,
  Trash2,
  MailOpen,
  Search,
} from "lucide-react-native";
import React, { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlashList } from "@shopify/flash-list";
import {
  Animated,
  DeviceEventEmitter,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { AlertDialog } from "@/shared/components/alert-dialog";
import { Button, ButtonText } from "@/shared/components/button/button";
import { ChatListSkeleton } from "@/shared/components/Skeleton";
import { Heading } from "@/shared/components/heading/heading";

interface MessageSummary {
  text: string;
  created_at: string;
  attachment?: { type: string } | null;
}

interface Conversation {
  id: string;
  buyer_id: string;
  seller_id: string;
  created_at: string;
  updated_at: string;
  muted: boolean;
  archived: boolean;
  pinned: boolean;
  buyer_unread_count: number;
  seller_unread_count: number;
  unreadCount: number;
  messages?: MessageSummary[];
  other_user?: { full_name: string; avatar_url?: string | null };
}

function formatTime(dateString: string, t: (key: string, opts?: any) => string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return t("chat.justNow");
  if (diffMins < 60) return t("chat.minutesAgo", { count: diffMins });

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return t("chat.hoursAgo", { count: diffHours });

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return t("chat.yesterday");
  if (diffDays < 7) return t("chat.daysAgo", { count: diffDays });

  return date.toLocaleDateString();
}

const ActionButton = ({
  icon,
  label,
  color,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={[styles.actionButton, { backgroundColor: color }]}
    onPress={onPress}
  >
    {icon}
    <Text style={styles.actionLabel}>{label}</Text>
  </TouchableOpacity>
);

export function ChatList() {
  const { t } = useTranslation();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Conversation | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());

  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, []),
  );

  const loadConversations = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        setUserId(null);
        return;
      }
      setUserId(user.id);

      const { data, error } = await supabase
        .from("conversations")
        .select(
          `id, buyer_id, seller_id, created_at, updated_at,
          muted, archived, pinned, buyer_unread_count, seller_unread_count,
           messages:messages!messages_conversation_id_fkey(text, created_at, attachment)`,
        )
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      const enriched = await enrichConversations(data || [], user.id);
      setConversations(enriched);
    } catch (err) {
      console.error("Error loading conversations:", err);
    } finally {
      setLoading(false);
    }
  };

  const enrichConversations = async (
    convos: any[],
    uid: string,
  ): Promise<Conversation[]> => {
    return Promise.all(
      convos.map(async (c) => {
        const otherId = c.buyer_id === uid ? c.seller_id : c.buyer_id;
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", otherId)
          .single();
        const unreadCount = c.buyer_id === uid ? (c.buyer_unread_count || 0) : (c.seller_unread_count || 0);
        return { ...c, unreadCount, other_user: profile || { full_name: t("chat.unknown") } };
      }),
    );
  };

  const updateField = async (id: string, field: string, value: boolean) => {
    await supabase.from("conversations").update({ [field]: value }).eq("id", id);
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)),
    );
  };

  const markAsRead = async (id: string, wasUnread: boolean) => {
    if (!userId) return;
    const field = userId === conversations.find(c => c.id === id)?.buyer_id
      ? "buyer_unread_count"
      : "seller_unread_count";
    const value = wasUnread ? 0 : 1;
    await supabase.from("conversations").update({ [field]: value }).eq("id", id);
    setConversations((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, [field]: value, unreadCount: value } : c,
      ),
    );
    DeviceEventEmitter.emit("refreshUnreadCount");
  };

  const closeSwipeable = (id: string) => {
    swipeableRefs.current.get(id)?.close();
  };

  const renderRightActions = (
    _progress: Animated.AnimatedInterpolation<number>,
    _dragX: Animated.AnimatedInterpolation<number>,
    item: Conversation,
  ) => {
    const iconColor = "#fff";
    return (
      <View style={styles.actionsContainer}>
        <ActionButton
          icon={<BellOff size={20} color={iconColor} />}
          label={item.muted ? t("chat.unmute") : t("chat.mute")}
          color="#134686"
          onPress={() => {
            closeSwipeable(item.id);
            updateField(item.id, "muted", !item.muted);
          }}
        />
        <ActionButton
          icon={<Trash2 size={20} color={iconColor} />}
          label={t("chat.delete")}
          color="#ED3F27"
          onPress={() => {
            closeSwipeable(item.id);
            setDeleteTarget(item);
          }}
        />
        <ActionButton
          icon={<Archive size={20} color={iconColor} />}
          label={item.archived ? t("chat.unarchive") : t("chat.archive")}
          color="#666876"
          onPress={() => {
            closeSwipeable(item.id);
            updateField(item.id, "archived", !item.archived);
          }}
        />
      </View>
    );
  };

  const renderLeftActions = (
    _progress: Animated.AnimatedInterpolation<number>,
    _dragX: Animated.AnimatedInterpolation<number>,
    item: Conversation,
  ) => {
    const iconColor = "#fff";
    return (
      <View style={[styles.actionsContainer, { flexDirection: "row-reverse" }]}>
        <ActionButton
          icon={<MailOpen size={20} color={iconColor} />}
          label={item.unreadCount > 0 ? t("chat.read") : t("chat.unread")}
          color="#134686"
          onPress={() => {
            closeSwipeable(item.id);
            markAsRead(item.id, item.unreadCount > 0);
          }}
        />
        <ActionButton
          icon={<Pin size={20} color={iconColor} />}
          label={item.pinned ? t("chat.unpin") : t("chat.pin")}
          color="#134686"
          onPress={() => {
            closeSwipeable(item.id);
            updateField(item.id, "pinned", !item.pinned);
          }}
        />
      </View>
    );
  };

  const filteredConversations = searchQuery.trim()
    ? conversations.filter((c) => {
        const name = (c.other_user?.full_name || "").toLowerCase();
        const lastMsg = (Array.isArray(c.messages) && c.messages[c.messages.length - 1]?.text || "").toLowerCase();
        const q = searchQuery.toLowerCase();
        return name.includes(q) || lastMsg.includes(q);
      })
    : conversations;

  if (!userId) {
    return (
      <View style={styles.centerContainer}>
        <MessageCircle size={48} color="#C6D9F2" />
        <Text style={styles.emptyText}>{t("chat.signInToSee")}</Text>
      </View>
    );
  }

  if (loading) {
    return <ChatListSkeleton />;
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>{t("chat.messages")}</Text>
      </View>
      <View style={styles.searchBar}>
        <Search size={16} color="#8C8E98" />
        <TextInput
          style={styles.searchInput}
          placeholder={t("chat.searchPlaceholder")}
          placeholderTextColor="#8C8E98"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
      <FlashList
        data={filteredConversations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={conversations.length === 0 ? styles.emptyList : undefined}
        ListEmptyComponent={
          <View style={styles.centerContainer}>
            <MessageCircle size={48}           color="#C6D9F2" />
            <Text style={styles.emptyText}>
              {searchQuery.trim() ? t("chat.noConversationsSearch") : t("chat.noConversations")}
            </Text>
            {!searchQuery.trim() && (
              <Text style={styles.emptySubtext}>
                {t("chat.startChatHint")}
              </Text>
            )}
          </View>
        }
        renderItem={({ item }) => {
          const lastMsg = Array.isArray(item.messages)
            ? item.messages[item.messages.length - 1]
            : undefined;
          return (
            <Swipeable
              ref={(ref) => {
                if (ref) swipeableRefs.current.set(item.id, ref);
              }}
              renderRightActions={(p, d) => renderRightActions(p, d, item)}
              renderLeftActions={(p, d) => renderLeftActions(p, d, item)}
              overshootRight={false}
              overshootLeft={false}
            >
              <TouchableOpacity
                style={[
                  styles.conversationItem,
                  item.unreadCount > 0 && styles.unreadItem,
                ]}
                onPress={() => router.push(`/chat/${item.id}` as any)}
              >
                <View style={styles.avatar}>
                  {item.other_user?.avatar_url ? (
                    <Image
                      source={{ uri: item.other_user.avatar_url }}
                      style={styles.avatarImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.avatarTextWrapper}>
                      <Text style={styles.avatarText}>
                        {(item.other_user?.full_name || "U").charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.conversationContent}>
                    <View style={styles.conversationTop}>
                      <Text
                        style={[
                          styles.otherName,
                          item.unreadCount > 0 && styles.unreadText,
                        ]}
                        numberOfLines={1}
                      >
                        {item.other_user?.full_name || t("chat.unknown")}
                      </Text>
                      <View style={styles.timeRow}>
                        <Text style={styles.timeText}>
                          {formatTime(lastMsg ? lastMsg.created_at : item.created_at, t)}
                        </Text>
                        {item.unreadCount > 0 && (
                          <View style={styles.unreadBadge}>
                            <Text style={styles.unreadBadgeText}>
                              {item.unreadCount > 99 ? "99+" : item.unreadCount}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  <Text style={styles.lastMessage} numberOfLines={1}>
                    {lastMsg?.text || (lastMsg?.attachment?.type?.startsWith("image/") ? t("chat.photo") : lastMsg?.attachment?.type?.startsWith("video/") ? t("chat.video") : t("chat.noMessagesYet"))}
                  </Text>
                </View>
              </TouchableOpacity>
            </Swipeable>
          );
        }}
      />

      <AlertDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        useRNModal={true}
      >
        <AlertDialog.Backdrop />
        <AlertDialog.Content className="p-6 rounded-3xl bg-white w-5/6 items-center shadow-xl">
          <AlertDialog.Header>
            <Heading>{t("chat.deleteTitle")}</Heading>
          </AlertDialog.Header>
          <AlertDialog.Body>
             <Text className="text-center text-black-100">
              {t("chat.deleteConfirm")}
            </Text>
          </AlertDialog.Body>
          <AlertDialog.Footer className="w-full flex-row gap-2">
            <Button
              onPress={() => setDeleteTarget(null)}
              className="flex-1 mr-2"
            >
              <ButtonText>{t("chat.cancel")}</ButtonText>
            </Button>
            <Button
              onPress={async () => {
                if (!deleteTarget) return;
                await supabase
                  .from("conversations")
                  .delete()
                  .eq("id", deleteTarget.id);
                setDeleteTarget(null);
                loadConversations();
              }}
              className="bg-danger flex-1"
            >
              <ButtonText>{t("chat.delete")}</ButtonText>
            </Button>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: "#fff" },
  headerBar: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#C6D9F2",
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "JakartaSans-Bold",
    color: "#191D31",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyList: { flexGrow: 1 },
  emptyText: {
    color: "#8C8E98",
    fontSize: 15,
    fontFamily: "JakartaSans-SemiBold",
    marginTop: 12,
    textAlign: "center",
  },
  emptySubtext: {
    color: "#666876",
    fontSize: 13,
    marginTop: 4,
    textAlign: "center",
  },
  conversationItem: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E3EBF8",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  unreadItem: {
    backgroundColor: "#E3EBF8",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#134686",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    overflow: "hidden",
  },
  avatarImage: {
    width: 48,
    height: 48,
  },
  avatarTextWrapper: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 18,
    fontFamily: "JakartaSans-Bold",
  },
  conversationContent: {
    flex: 1,
    justifyContent: "center",
  },
  conversationTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  otherName: {
    fontSize: 15,
    fontFamily: "JakartaSans-Bold",
    color: "#191D31",
    flex: 1,
    marginRight: 8,
  },
  unreadText: {
    fontFamily: "JakartaSans-ExtraBold",
  },
  timeText: {
    fontSize: 11,
    color: "#8C8E98",
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  unreadBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#134686",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 5,
  },
  unreadBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontFamily: "JakartaSans-ExtraBold",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 12,
    height: 36,
    backgroundColor: "#E3EBF8",
    borderRadius: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#191D31",
    padding: 0,
  },
  lastMessage: {
    fontSize: 13,
    color: "#666876",
    marginTop: 2,
  },
  actionsContainer: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  actionButton: {
    width: 72,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 4,
  },
  actionLabel: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "JakartaSans-SemiBold",
    marginTop: 4,
  },
});
