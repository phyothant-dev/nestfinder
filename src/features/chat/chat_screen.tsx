import { sendNotification } from "@/shared/lib/notifications";
import { supabase } from "@/shared/lib/supabase";
import { useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { useTranslation } from "react-i18next";
import {
  CheckSquare, ChevronLeft, Copy, Edit3, FileText, ImageIcon, MessageSquareReply, Paperclip, Pin, Send, Square, Trash2, Video, X, } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlashList, FlashListRef } from "@shopify/flash-list";
import {
  ActionSheetIOS, ActivityIndicator, DeviceEventEmitter, Image, Modal, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import Text from "@/shared/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { AlertDialog } from "@/shared/components/alert-dialog";
import { BackButton } from "@/shared/components/BackButton";
import { Button, ButtonText } from "@/shared/components/button/button";
import { Heading } from "@/shared/components/heading/heading";

const MAX_FILE_SIZE = 300 * 1024 * 1024;

interface MessageAttachment {
  url: string;
  type: string;
  name: string;
  size: number;
}

interface PendingAttachment {
  uri: string;
  name: string;
  type: string;
  size: number;
}

interface Message {
  id: string;
  sender_id: string;
  text: string;
  created_at: string;
  attachment?: MessageAttachment | null;
  reply_to_id?: string | null;
  pinned_by_buyer?: boolean;
  pinned_by_seller?: boolean;
  read_at?: string | null;
}

interface ChatRoomScreenProps {
  channelId: string;
}

interface DateSeparator {
  id: string;
  type: "date";
  label: string;
}

type ChatListItem = Message | DateSeparator;

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  if (dateStr === todayStr) return "Today";
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (dateStr === yesterday.toISOString().split("T")[0]) return "Yesterday";
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: date.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
}

function buildMessageList(messages: Message[]): ChatListItem[] {
  const items: ChatListItem[] = [];
  let lastDate: string | null = null;
  for (const msg of messages) {
    const msgDate = msg.created_at.split("T")[0];
    if (msgDate !== lastDate) {
      items.push({ id: `date-${msgDate}`, type: "date", label: formatDateLabel(msgDate) });
      lastDate = msgDate;
    }
    items.push(msg);
  }
  return items;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  return "file";
}

export default function ChatRoomScreen({ channelId }: ChatRoomScreenProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [otherName, setOtherName] = useState("");
  const otherIdRef = useRef<string | null>(null);
  const flatListRef = useRef<FlashListRef<any>>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [pinDialog, setPinDialog] = useState<{
    message: Message;
    pinForOther: boolean;
  } | null>(null);
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);
  const [isBuyer, setIsBuyer] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Message | null>(null);
  const [showUnpinDialog, setShowUnpinDialog] = useState(false);
  const [alertDialog, setAlertDialog] = useState<{
    title: string;
    message: string;
  } | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [previewImageUri, setPreviewImageUri] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || !channelId) return;

        setUserId(user.id);

        const { data: conv, error: convErr } = await supabase
          .from("conversations")
          .select("*, seller:profiles!conversations_seller_id_fkey(full_name), buyer:profiles!conversations_buyer_id_fkey(full_name)")
          .eq("id", channelId)
          .single();

        if (convErr) throw convErr;

        const userIsBuyer = conv.buyer_id === user.id;
        setIsBuyer(userIsBuyer);

        const field = userIsBuyer ? "buyer_unread_count" : "seller_unread_count";
        await supabase
          .from("conversations")
          .update({ [field]: 0 })
          .eq("id", channelId);

        DeviceEventEmitter.emit("refreshUnreadCount");

        const otherId = conv.buyer_id === user.id ? conv.seller_id : conv.buyer_id;
        otherIdRef.current = otherId;
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", otherId)
          .single();

        setOtherName(profile?.full_name || "Unknown");

        const { data: msgs, error: msgErr } = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", channelId)
          .order("created_at", { ascending: true });

        if (msgErr) throw msgErr;
        if (mounted) setMessages(msgs || []);

        const otherMsgs = (msgs || []).filter(
          (m) => m.sender_id !== user.id && !m.read_at,
        );
        if (otherMsgs.length > 0) {
          const ids = otherMsgs.map((m) => m.id);
          await supabase
            .from("messages")
            .update({ read_at: new Date().toISOString() })
            .in("id", ids);
          if (mounted) {
            setMessages((prev) =>
              prev.map((m) =>
                ids.includes(m.id) ? { ...m, read_at: new Date().toISOString() } : m,
              ),
            );
          }
        }

        const pinColumn = conv.buyer_id === user.id ? "pinned_by_buyer" : "pinned_by_seller";
        const { data: pinned } = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", channelId)
          .eq(pinColumn, true)
          .order("created_at", { ascending: false })
          .limit(1);
        if (mounted) setPinnedMessages(pinned || []);
      } catch (err) {
        console.error("Error loading chat:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, [channelId]);

  useEffect(() => {
    if (!channelId) return;

    const channel = supabase
      .channel(`messages:${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${channelId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${channelId}`,
        },
        (payload) => {
          const updated = payload.new as Message;
          setMessages((prev) =>
            prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId]);

  useEffect(() => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages.length]);

  const pickImages = async () => {
    setShowPicker(false);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      quality: 0.8,
      allowsMultipleSelection: true,
    });
    if (result.canceled || !result.assets.length) return;
    const oversized = result.assets.find((a) => a.fileSize && a.fileSize > MAX_FILE_SIZE);
    if (oversized) {
      setAlertDialog({ title: t("chat.fileTooLarge"), message: t("chat.maxFileSize") });
      return;
    }
    const mapped: PendingAttachment[] = result.assets.map((asset) => ({
      uri: asset.uri,
      name: asset.fileName || `file.${asset.uri.split(".").pop() || "jpg"}`,
      type: asset.mimeType || "image/jpeg",
      size: asset.fileSize || 0,
    }));
    setPendingAttachments((prev) => [...prev, ...mapped]);
  };

  const pickFiles = async () => {
    setShowPicker(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: true,
      });
      if (result.canceled || !result.assets.length) return;
      const oversized = result.assets.find((a) => a.size && a.size > MAX_FILE_SIZE);
      if (oversized) {
        setAlertDialog({ title: t("chat.fileTooLarge"), message: t("chat.maxFileSize") });
        return;
      }
      const mapped: PendingAttachment[] = result.assets.map((asset) => ({
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType || "application/octet-stream",
        size: asset.size || 0,
      }));
      setPendingAttachments((prev) => [...prev, ...mapped]);
    } catch (err) {
      console.error("Error picking files:", err);
    }
  };

  const openPicker = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancel", "Photo Library", "Files", "Camera"],
          cancelButtonIndex: 0,
        },
        (index) => {
          if (index === 1) pickImages();
          else if (index === 2) pickFiles();
          else if (index === 3) takePhoto();
        },
      );
    } else {
      setShowPicker(true);
    }
  };

  const takePhoto = async () => {
    setShowPicker(false);
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > MAX_FILE_SIZE) {
      setAlertDialog({ title: t("chat.fileTooLarge"), message: t("chat.maxFileSize") });
      return;
    }
    setPendingAttachments((prev) => [
      ...prev,
      {
        uri: asset.uri,
        name: asset.fileName || `photo.${asset.uri.split(".").pop() || "jpg"}`,
        type: asset.mimeType || "image/jpeg",
        size: asset.fileSize || 0,
      },
    ]);
  };

  const removeAttachment = (index: number) =>
    setPendingAttachments((prev) => prev.filter((_, i) => i !== index));

  const handleReply = (msg: Message) => {
    setSelectedMessage(null);
    setReplyTo(msg);
  };

  const handleCopy = async (msg: Message) => {
    setSelectedMessage(null);
    if (msg.text) {
      await Clipboard.setStringAsync(msg.text);
    }
  };

  const handlePin = (msg: Message) => {
    setSelectedMessage(null);
    setPinDialog({ message: msg, pinForOther: false });
  };

  const handlePinConfirm = async () => {
    if (!pinDialog || !userId) return;
    const { message, pinForOther } = pinDialog;
    if (isBuyer) {
      const updates: Record<string, boolean> = { pinned_by_buyer: true };
      if (pinForOther) updates.pinned_by_seller = true;
      await supabase.from("messages").update(updates).eq("id", message.id);
      setMessages((prev) =>
        prev.map((m) => (m.id === message.id ? { ...m, ...updates } : m)),
      );
    } else {
      const updates: Record<string, boolean> = { pinned_by_seller: true };
      if (pinForOther) updates.pinned_by_buyer = true;
      await supabase.from("messages").update(updates).eq("id", message.id);
      setMessages((prev) =>
        prev.map((m) => (m.id === message.id ? { ...m, ...updates } : m)),
      );
    }
    const pinColumn = isBuyer ? "pinned_by_buyer" : "pinned_by_seller";
    const { data: pinned } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", channelId)
      .eq(pinColumn, true)
      .order("created_at", { ascending: false })
      .limit(1);
    setPinnedMessages(pinned || []);
    setPinDialog(null);
  };

  const handleUnpin = async () => {
    if (!userId) return;
    const pinColumn = isBuyer ? "pinned_by_buyer" : "pinned_by_seller";
    const msg = pinnedMessages[0];
    if (msg) {
      await supabase
        .from("messages")
        .update({ [pinColumn]: false })
        .eq("id", msg.id);
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, [pinColumn]: false } : m)),
      );
    }
    setPinnedMessages([]);
    setPinDialog(null);
  };

  const handleStartEdit = (msg: Message) => {
    setSelectedMessage(null);
    setEditingMessage(msg);
    setInput(msg.text);
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setInput("");
  };

  const handleDelete = (msg: Message) => {
    setSelectedMessage(null);
    setDeleteTarget(msg);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await supabase.from("messages").delete().eq("id", deleteTarget.id);
    setMessages((prev) => prev.filter((m) => m.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  const uploadSingleAttachment = async (
    att: PendingAttachment,
  ): Promise<MessageAttachment> => {
    if (!userId) throw new Error("No user");

    const ext = att.uri.split(".").pop()?.toLowerCase() || "bin";
    const timestamp = Date.now();
    const fileName = `${userId}_${timestamp}_${Math.random().toString(36).slice(2, 6)}.${ext}`;
    const filePath = `${channelId}/${fileName}`;

    const file = new FileSystem.File(att.uri);
    const arrayBuffer = await file.arrayBuffer();

    const { data, error } = await supabase.storage
      .from("chat-media")
      .upload(filePath, arrayBuffer, {
        upsert: false,
        contentType: att.type,
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from("chat-media")
      .getPublicUrl(data.path);

    return {
      url: urlData.publicUrl,
      type: att.type,
      name: att.name,
      size: att.size,
    };
  };

  const handleSend = useCallback(async () => {
    const text = input.trim();
    const attachmentsToSend = pendingAttachments;
    if ((!text && !attachmentsToSend.length) || !userId || sending) return;

    setSending(true);
    const textToSend = text;
    const replyToMsg = replyTo;
    const editingMsg = editingMessage;
    setInput("");
    setPendingAttachments([]);
    setReplyTo(null);

    try {
      if (editingMsg) {
        await supabase
          .from("messages")
          .update({ text: textToSend || "" })
          .eq("id", editingMsg.id);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === editingMsg.id ? { ...m, text: textToSend || "" } : m,
          ),
        );
        setEditingMessage(null);
        return;
      }

      if (attachmentsToSend.length > 0) {
        const textUsedForFirst = textToSend || "";
        for (let i = 0; i < attachmentsToSend.length; i++) {
          const attachmentData = await uploadSingleAttachment(attachmentsToSend[i]);
          const { error } = await supabase.from("messages").insert({
            conversation_id: channelId,
            sender_id: userId,
            text: i === 0 ? textUsedForFirst : "",
            attachment: attachmentData,
            reply_to_id: replyToMsg?.id || null,
          });
          if (error) throw error;
        }
      } else if (textToSend) {
        const { error } = await supabase.from("messages").insert({
          conversation_id: channelId,
          sender_id: userId,
          text: textToSend,
          attachment: null,
          reply_to_id: replyToMsg?.id || null,
        });
        if (error) throw error;
      }

      const recipientId = otherIdRef.current;
      if (recipientId) {
        const snippet = textToSend
          ? textToSend.slice(0, 100)
          : "Sent an attachment";
        sendNotification(recipientId, "New Message", snippet, {
          screen: "chat",
          conversationId: channelId,
        });
      }
    } catch (err) {
      console.error("Error sending message:", err);
      setAlertDialog({ title: t("chat.error"), message: t("chat.sendFailed") });
      setInput(textToSend);
      if (replyToMsg) setReplyTo(replyToMsg);
      setPendingAttachments(attachmentsToSend);
    } finally {
      setSending(false);
    }
  }, [input, userId, channelId, sending, pendingAttachments, replyTo, editingMessage]);

  const lastSentMsgId = useMemo(() => {
    const sent = messages.filter((m) => m.sender_id === userId);
    return sent.length > 0 ? sent[sent.length - 1].id : null;
  }, [messages, userId]);

  const handleScroll = (event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distanceFromBottom =
      contentSize.height - contentOffset.y - layoutMeasurement.height;
    setIsAtBottom(distanceFromBottom < 50);
  };

  const scrollToEnd = () => {
    flatListRef.current?.scrollToEnd({ animated: true });
  };

  const openImagePreview = (url: string) => {
    setPreviewImageUri(url);
  };

  const renderAttachment = (att: MessageAttachment) => {
    const iconType = getFileIcon(att.type);

    if (iconType === "image") {
      return (
        <TouchableOpacity onPress={() => openImagePreview(att.url)}>
          <Image
            source={{ uri: att.url }}
            style={styles.attachmentImage}
            resizeMode="cover"
          />
        </TouchableOpacity>
      );
    }

    if (iconType === "video") {
      return (
        <TouchableOpacity onPress={() => openImagePreview(att.url)}>
          <View style={styles.attachmentVideo}>
            <Image
              source={{ uri: att.url }}
              style={styles.attachmentImage}
              resizeMode="cover"
            />
            <View style={styles.videoOverlay}>
              <Video size={32} color="#fff" />
            </View>
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <View style={styles.attachmentFile}>
        <FileText size={28} color={"#666876"} />
        <Text style={styles.attachmentFileName} numberOfLines={1}>
          {att.name}
        </Text>
        <Text style={styles.attachmentFileSize}>{formatFileSize(att.size)}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={"#134686"} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior="translate-with-padding"
    >
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <BackButton onPress={() => router.back()} />
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {otherName}
          </Text>
        </View>
      </View>

      {pinnedMessages.length > 0 && pinnedMessages[0] && (
        <View style={styles.pinnedBanner}>
          <Pin size={14} color={"#134686"} />
          <Text style={styles.pinnedBannerText} numberOfLines={1}>
            {pinnedMessages[0].text || (pinnedMessages[0].attachment ? "Attachment" : "")}
          </Text>
          <TouchableOpacity
            onPress={() => setShowUnpinDialog(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <CheckSquare size={16} color={"#134686"} />
          </TouchableOpacity>
        </View>
      )}

      <FlashList
        ref={flatListRef}
        data={buildMessageList(messages)}
        keyExtractor={(item) => ("type" in item ? item.id : item.id)}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => {
          if (isAtBottom) {
            flatListRef.current?.scrollToEnd({ animated: false });
          }
        }}
        onScroll={handleScroll}
        scrollEventThrottle={100}
        renderItem={({ item }) => {
          if ("type" in item) {
            return (
              <View style={styles.dateSeparator}>
                <Text style={styles.dateSeparatorText}>{item.label}</Text>
              </View>
            );
          }
          const isMine = item.sender_id === userId;
          const isPinned = isBuyer ? item.pinned_by_buyer : item.pinned_by_seller;
          const replyMsg = item.reply_to_id
            ? messages.find((m) => m.id === item.reply_to_id)
            : null;
          return (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setSelectedMessage(item)}
              onLongPress={() => setSelectedMessage(item)}
              delayLongPress={300}
            >
              {isPinned && (
                <View style={[styles.pinBadge, isMine ? styles.pinBadgeMine : styles.pinBadgeOther]}>
                  <Pin size={10} color={isMine ? "#fff" : "#134686"} />
                  <Text style={[styles.pinBadgeText, isMine ? { color: "rgba(255,255,255,0.7)" } : { color: "#134686" }]}>{t("chat.pinned")}</Text>
                </View>
              )}
              <View
                style={[
                  styles.messageBubble,
                  isMine ? styles.myMessage : styles.theirMessage,
                  isPinned && (isMine ? styles.myMessagePinned : styles.theirMessagePinned),
                ]}
              >
                {replyMsg && (
                  <View style={[styles.replyPreview, isMine ? styles.replyPreviewMine : styles.replyPreviewOther]}>
                    <View style={styles.replyIndicator} />
                    <View style={styles.replyContent}>
                      <Text style={[styles.replyName, isMine ? { color: "rgba(255,255,255,0.8)" } : { color: "#134686" }]} numberOfLines={1}>
                        {replyMsg.sender_id === userId ? t("chat.you") : otherName}
                      </Text>
                      <Text style={[styles.replyText, isMine ? { color: "rgba(255,255,255,0.6)" } : { color: "#666876" }]} numberOfLines={1}>
                        {replyMsg.text || (replyMsg.attachment?.type?.startsWith("image/") ? "Photo" : replyMsg.attachment?.type?.startsWith("video/") ? "Video" : replyMsg.attachment ? "Attachment" : "")}
                      </Text>
                    </View>
                  </View>
                )}
                {item.attachment && renderAttachment(item.attachment)}
                <View style={styles.textTimeRow}>
                  {item.text ? (
                    <Text
                      style={[
                        styles.messageText,
                        isMine ? styles.myMessageText : styles.theirMessageText,
                        item.attachment ? { marginTop: 6 } : undefined,
                        { flexShrink: 1 },
                      ]}
                    >
                      {item.text}
                    </Text>
                  ) : null}
                  <Text
                    style={[
                      styles.messageTime,
                      isMine ? styles.myMessageTime : styles.theirMessageTime,
                    ]}
                  >
                    {new Date(item.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>
              </View>
              {isMine && item.id === lastSentMsgId && (
                <Text style={[styles.readStatusBelow, item.read_at ? styles.readStatusRead : styles.readStatusSent]}>
                  {item.read_at ? "Seen" : "Sent"}
                </Text>
              )}
            </TouchableOpacity>
          );
        }}
      />

      {!isAtBottom && messages.length > 0 && (
        <TouchableOpacity
          onPress={scrollToEnd}
          activeOpacity={0.8}
          style={styles.scrollToBottom}
        >
          <ChevronLeft size={20} color={"#134686"} style={{ transform: [{ rotate: "90deg" }] }} />
        </TouchableOpacity>
      )}

      {pendingAttachments.length > 0 && (
        <View style={styles.attachmentBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.attachmentBarContent}
          >
            {pendingAttachments.map((att, index) => (
              <View key={index} style={styles.attachmentPreview}>
              <Image
                source={{ uri: att.uri }}
                style={styles.attachmentPreviewImage}
                resizeMode="cover"
              />
                <Text style={styles.attachmentPreviewName} numberOfLines={1}>
                  {att.name}
                </Text>
                <Text style={styles.attachmentPreviewSize}>
                  {formatFileSize(att.size)}
                </Text>
                <TouchableOpacity
                  onPress={() => removeAttachment(index)}
                  style={styles.removeButton}
                >
                  <X size={14} color="#ED3F27" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {replyTo && (
        <View style={styles.replyBar}>
          <View style={styles.replyBarLine} />
          <View style={styles.replyBarContent}>
            <Text style={styles.replyBarLabel} numberOfLines={1}>
              Reply to {replyTo.sender_id === userId ? "yourself" : otherName}
            </Text>
            <Text style={styles.replyBarText} numberOfLines={1}>
              {replyTo.text || (replyTo.attachment?.type?.startsWith("image/") ? "Photo" : replyTo.attachment?.type?.startsWith("video/") ? "Video" : "Attachment")}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setReplyTo(null)} style={styles.replyBarClose}>
            <X size={16} color={"#8C8E98"} />
          </TouchableOpacity>
        </View>
      )}

      {editingMessage && (
        <View style={styles.replyBar}>
          <View style={[styles.replyBarLine, { backgroundColor: "#134686" }]} />
          <View style={styles.replyBarContent}>
            <Text style={[styles.replyBarLabel, { color: "#134686" }]}>{t("chat.editingMessage")}</Text>
          </View>
          <TouchableOpacity onPress={handleCancelEdit} style={styles.replyBarClose}>
            <X size={16} color={"#8C8E98"} />
          </TouchableOpacity>
        </View>
      )}

      <View style={[styles.inputBar, { paddingBottom: insets.bottom }]}>
        <TouchableOpacity onPress={openPicker} style={styles.attachButton}>
            <Paperclip size={22} color={"#666876"} />
        </TouchableOpacity>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder={editingMessage ? "Edit message..." : "Type a message..."}
          placeholderTextColor={"#8C8E98"}
          style={styles.input}
          multiline
          maxLength={2000}
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={
            editingMessage
              ? !input.trim()
              : (!input.trim() && pendingAttachments.length === 0) || sending
          }
          style={[
            styles.sendButton,
            editingMessage
              ? { backgroundColor: "#134686" }
              : (!input.trim() && pendingAttachments.length === 0) && styles.sendButtonDisabled,
          ]}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : editingMessage ? (
            <Text style={{ color: "#fff", fontSize: 20, fontWeight: "800" }}>✓</Text>
          ) : (
            <Send size={20} color={(!input.trim() && pendingAttachments.length === 0) ? "#C6D9F2" : "#fff"} />
          )}
        </TouchableOpacity>
      </View>

      <Modal
        visible={showPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowPicker(false)}
        >
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{t("chat.attachFile")}</Text>
            <TouchableOpacity style={styles.modalOption} onPress={pickImages}>
              <ImageIcon size={22} color={"#134686"} />
              <Text style={styles.modalOptionText}>{t("chat.photoLibrary")}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalOption} onPress={pickFiles}>
              <FileText size={22} color={"#134686"} />
              <Text style={styles.modalOptionText}>{t("chat.files")}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalOption} onPress={takePhoto}>
              <Camera size={22} color={"#134686"} />
              <Text style={styles.modalOptionText}>{t("chat.camera")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalOption, { borderBottomWidth: 0 }]}
              onPress={() => setShowPicker(false)}
            >
              <Text style={[styles.modalOptionText, { color: "#8C8E98" }]}>
                {t("chat.cancel")}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={!!selectedMessage}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedMessage(null)}
      >
        <TouchableOpacity
          style={styles.menuBackdrop}
          activeOpacity={1}
          onPress={() => setSelectedMessage(null)}
        >
          <View style={styles.menuCard}>
            <TouchableOpacity
              style={styles.menuOption}
              onPress={() => selectedMessage && handleReply(selectedMessage)}
            >
              <MessageSquareReply size={18} color={"#191D31"} />
              <Text style={styles.menuOptionText}>{t("chat.reply")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuOption}
              onPress={() => selectedMessage && handleCopy(selectedMessage)}
            >
              <Copy size={18} color={"#191D31"} />
              <Text style={styles.menuOptionText}>{t("chat.copy")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuOption}
              onPress={() => selectedMessage && handlePin(selectedMessage)}
            >
              <Pin size={18} color={"#191D31"} />
              <Text style={styles.menuOptionText}>{t("chat.pin")}</Text>
            </TouchableOpacity>
            {selectedMessage?.sender_id === userId && (
              <>
                <TouchableOpacity
                  style={styles.menuOption}
                  onPress={() => selectedMessage && handleStartEdit(selectedMessage)}
                >
                  <Edit3 size={18} color={"#191D31"} />
                  <Text style={styles.menuOptionText}>{t("chat.edit")}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.menuOption}
                  onPress={() => selectedMessage && handleDelete(selectedMessage)}
                >
                  <Trash2 size={18} color="#ED3F27" />
                  <Text style={[styles.menuOptionText, { color: "#ED3F27" }]}>{t("chat.delete")}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={!!pinDialog}
        transparent
        animationType="fade"
        onRequestClose={() => setPinDialog(null)}
      >
        <TouchableOpacity
          style={styles.dialogBackdrop}
          activeOpacity={1}
          onPress={() => setPinDialog(null)}
        >
          <View style={styles.dialogCard}>
            <Text style={styles.dialogTitle}>{t("chat.pinTitle")}</Text>
            <View style={styles.dialogBody}>
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() =>
                  setPinDialog((prev) =>
                    prev ? { ...prev, pinForOther: !prev.pinForOther } : null,
                  )
                }
              >
                {pinDialog?.pinForOther ? (
                  <CheckSquare size={20} color={"#134686"} />
                ) : (
                  <Square size={20} color={"#8C8E98"} />
                )}
                <Text style={styles.checkboxLabel}>
                  {t("chat.alsoPinFor", { name: otherName })}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.dialogFooter}>
              <TouchableOpacity
                style={styles.dialogButton}
                onPress={() => setPinDialog(null)}
              >
                <Text style={styles.dialogButtonCancel}>{t("chat.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogButton, styles.dialogButtonPrimary]}
                onPress={handlePinConfirm}
              >
                <Text style={styles.dialogButtonConfirm}>{t("chat.pin")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      <AlertDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        useRNModal={true}
      >
        <AlertDialog.Backdrop />
        <AlertDialog.Content className="p-6 rounded-3xl bg-white w-5/6 items-center shadow-xl">
          <AlertDialog.Header>
            <Heading>{t("chat.deleteMessageTitle")}</Heading>
          </AlertDialog.Header>
          <AlertDialog.Body>
            <Text className="text-center text-slate-500">
              {t("chat.deleteMessageConfirm")}
            </Text>
          </AlertDialog.Body>
          <AlertDialog.Footer className="w-full flex-row gap-2">
            <Button
              onPress={() => setDeleteTarget(null)}
              className="flex-1"
            >
              <ButtonText>{t("chat.cancel")}</ButtonText>
            </Button>
            <Button
              onPress={confirmDelete}
              className="bg-danger flex-1"
            >
              <ButtonText>{t("chat.delete")}</ButtonText>
            </Button>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog>

      <AlertDialog
        isOpen={showUnpinDialog}
        onClose={() => setShowUnpinDialog(false)}
        useRNModal={true}
      >
        <AlertDialog.Backdrop />
        <AlertDialog.Content className="p-6 rounded-3xl bg-white w-5/6 items-center shadow-xl">
          <AlertDialog.Header>
            <Heading>{t("chat.unpinTitle")}</Heading>
          </AlertDialog.Header>
          <AlertDialog.Body>
            <Text className="text-center text-slate-500">
              {t("chat.unpinConfirm")}
            </Text>
          </AlertDialog.Body>
          <AlertDialog.Footer className="w-full flex-row gap-2">
            <Button
              onPress={() => setShowUnpinDialog(false)}
              className="flex-1"
            >
              <ButtonText>{t("chat.cancel")}</ButtonText>
            </Button>
            <Button
              onPress={() => {
                setShowUnpinDialog(false);
                handleUnpin();
              }}
              className="bg-danger flex-1"
            >
              <ButtonText>{t("chat.unpin")}</ButtonText>
            </Button>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog>

      <Modal
        visible={!!previewImageUri}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewImageUri(null)}
      >
        <TouchableOpacity
          style={styles.imagePreviewOverlay}
          activeOpacity={1}
          onPress={() => setPreviewImageUri(null)}
        >
          {previewImageUri && (
            <Image
              source={{ uri: previewImageUri }}
              style={styles.imagePreviewFull}
              resizeMode="contain"
            />
          )}
        </TouchableOpacity>
      </Modal>

      <AlertDialog
        isOpen={!!alertDialog}
        onClose={() => setAlertDialog(null)}
        useRNModal={true}
      >
        <AlertDialog.Backdrop />
        <AlertDialog.Content className="p-6 rounded-3xl bg-white w-5/6 items-center shadow-xl">
          <AlertDialog.Header>
            <Heading>{alertDialog?.title || ""}</Heading>
          </AlertDialog.Header>
          <AlertDialog.Body>
            <Text className="text-center text-slate-500">
              {alertDialog?.message || ""}
            </Text>
          </AlertDialog.Body>
          <AlertDialog.Footer className="w-full flex-row justify-center">
            <Button
              onPress={() => setAlertDialog(null)}
              className="flex-1"
            >
              <ButtonText>{t("alerts_and_dialogs.button_confirm")}</ButtonText>
            </Button>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog>
    </View>
    </KeyboardAvoidingView>
  );
}

function Camera({ size, color }: { size: number; color: string }) {
  return <Text style={{ fontSize: size, color }}>📷</Text>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FDF4E3",
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: "#C6D9F2",
    backgroundColor: "#fff",
  },
  headerCenter: {
    flex: 1,
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
      color: "#191D31",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FDF4E3",
  },
  messageList: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  messageBubble: {
    maxWidth: "78%",
    marginVertical: 3,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  myMessage: {
    alignSelf: "flex-end",
      backgroundColor: "#134686",
    borderBottomRightRadius: 4,
  },
  theirMessage: {
    alignSelf: "flex-start",
    backgroundColor: "#fff",
    borderBottomLeftRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
      borderColor: "#C6D9F2",
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  myMessageText: {
    color: "#fff",
  },
  theirMessageText: {
      color: "#191D31",
  },
  messageTime: {
    fontSize: 10,
    marginLeft: "auto",
    paddingLeft: 4,
    alignSelf: "flex-end",
  },
  myMessageTime: {
    color: "rgba(255,255,255,0.7)",
  },
  theirMessageTime: {
      color: "#8C8E98",
  },
  textTimeRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  readStatusSent: {
    fontSize: 11,
      color: "#8C8E98",
  },
  readStatusRead: {
    fontSize: 11,
      color: "#134686",
  },
  readStatusBelow: {
    alignSelf: "flex-end",
    marginTop: 2,
    marginBottom: 4,
    marginRight: 4,
  },
  attachmentImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
    alignSelf: "center",
  },
  attachmentVideo: {
    position: "relative",
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 12,
  },
  attachmentFile: {
    flexDirection: "row",
    alignItems: "center",
      backgroundColor: "#E3EBF8",
    borderRadius: 10,
    padding: 10,
    gap: 8,
  },
  attachmentFileName: {
    flex: 1,
    fontSize: 13,
      color: "#191D31",
    fontWeight: "600",
  },
  attachmentFileSize: {
    fontSize: 11,
      color: "#8C8E98",
  },
  attachmentBar: {
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: "#C6D9F2",
    backgroundColor: "#fff",
  },
  attachmentBarContent: {
    paddingHorizontal: 12,
    gap: 8,
  },
  attachmentPreview: {
    width: 100,
    alignItems: "center",
    padding: 6,
      backgroundColor: "#E3EBF8",
    borderRadius: 10,
    position: "relative",
  },
  attachmentPreviewImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  attachmentPreviewName: {
    fontSize: 10,
    fontWeight: "600",
      color: "#191D31",
    marginTop: 4,
    maxWidth: 90,
  },
  attachmentPreviewSize: {
    fontSize: 9,
      color: "#8C8E98",
    marginTop: 2,
  },
  removeButton: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#FDE0DB",
    justifyContent: "center",
    alignItems: "center",
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: "#C6D9F2",
    backgroundColor: "#fff",
  },
  attachButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
      backgroundColor: "#E3EBF8",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  input: {
    flex: 1,
      backgroundColor: "#E3EBF8",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
      color: "#191D31",
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
      backgroundColor: "#134686",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  sendButtonDisabled: {
      backgroundColor: "#E3EBF8",
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
      color: "#191D31",
    marginBottom: 16,
    textAlign: "center",
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: "#E3EBF8",
    gap: 12,
  },
  modalOptionText: {
    fontSize: 16,
      color: "#191D31",
    fontWeight: "500",
  },
  pinBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginBottom: 2,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  pinBadgeMine: {
    alignSelf: "flex-end",
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  pinBadgeOther: {
    backgroundColor: "#E3EBF8",
  },
  pinBadgeText: {
    fontSize: 9,
    fontWeight: "600",
  },
  myMessagePinned: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  theirMessagePinned: {
    borderWidth: 1,
    borderColor: "#C6D9F2",
  },
  replyPreview: {
    flexDirection: "row",
    marginBottom: 4,
    paddingBottom: 4,
  },
  replyPreviewMine: {},
  replyPreviewOther: {},
  replyIndicator: {
    width: 2,
      backgroundColor: "#134686",
    borderRadius: 2,
    marginRight: 8,
  },
  replyContent: {
    flex: 1,
  },
  replyName: {
    fontSize: 13,
    fontWeight: "700",
  },
  replyText: {
    fontSize: 13,
    marginTop: 1,
  },
  replyBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#fff",
    borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: "#C6D9F2",
  },
  replyBarLine: {
    width: 3,
    height: 32,
      backgroundColor: "#134686",
    borderRadius: 2,
    marginRight: 10,
  },
  replyBarContent: {
    flex: 1,
  },
  replyBarLabel: {
    fontSize: 13,
    fontWeight: "700",
      color: "#134686",
  },
  replyBarText: {
    fontSize: 13,
      color: "#666876",
    marginTop: 2,
  },
  replyBarClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
      backgroundColor: "#E3EBF8",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  menuBackdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  menuCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 4,
    minWidth: 200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  menuOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  menuOptionText: {
    fontSize: 15,
      color: "#191D31",
    fontWeight: "500",
  },
  pinnedBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#E3EBF8",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#C6D9F2",
    gap: 8,
  },
  pinnedBannerText: {
    flex: 1,
    fontSize: 13,
    color: "#0F3A73",
    fontWeight: "500",
  },
  dialogBackdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  dialogCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 24,
    width: "82%",
    maxWidth: 340,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  dialogTitle: {
    fontSize: 17,
    fontWeight: "700",
      color: "#191D31",
    textAlign: "center",
    marginBottom: 16,
  },
  dialogBody: {
    marginBottom: 20,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },
  checkboxLabel: {
    fontSize: 14,
      color: "#191D31",
    fontWeight: "500",
    flex: 1,
  },
  dialogFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  dialogButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  dialogButtonPrimary: {
      backgroundColor: "#134686",
  },
  dialogButtonCancel: {
    fontSize: 15,
      color: "#666876",
    fontWeight: "600",
  },
  dialogButtonConfirm: {
    fontSize: 15,
    color: "#fff",
    fontWeight: "600",
  },
  dateSeparator: {
    alignItems: "center",
    marginVertical: 12,
  },
  dateSeparatorText: {
    fontSize: 12,
    fontWeight: "600",
      color: "#666876",
      backgroundColor: "#C6D9F2",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    overflow: "hidden",
  },
  scrollToBottom: {
    position: "absolute",
    right: 16,
    bottom: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
      borderColor: "#C6D9F2",
  },
  imagePreviewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  imagePreviewFull: {
    width: "100%",
    height: "100%",
  },
});
