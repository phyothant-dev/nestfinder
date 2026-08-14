import { router, Tabs } from "expo-router";
import {
  CirclePlus,
  Home,
  Map,
  MessageSquare,
  Trash2,
  User,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { DeviceEventEmitter, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "@/shared/lib/supabase";
import { useCompareStore } from "@/features/property/useCompareStore";

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const [totalUnread, setTotalUnread] = useState(0);
  useEffect(() => {
    let mounted = true;
    const fetchUnread = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.rpc("get_total_unread_count", {
        p_user_id: user.id,
      });
      if (mounted) setTotalUnread(data ?? 0);
    };
    fetchUnread();
    const sub = DeviceEventEmitter.addListener("refreshUnreadCount", fetchUnread);
    return () => { mounted = false; sub.remove(); };
  }, []);

  const compareItems = useCompareStore((s) => s.items);

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#134686",
          tabBarInactiveTintColor: "#8C8E98",
          tabBarStyle: {
            backgroundColor: "#ffffff",
            borderTopWidth: 1,
            borderTopColor: "#C6D9F2",
            height: 70 + insets.bottom,
            paddingBottom: insets.bottom + 10,
            paddingTop: 10,
            paddingHorizontal: 10,
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: "600",
          },
        }}
      >
        <Tabs.Screen
          name="index"
          listeners={() => ({
            tabPress: () => {
              DeviceEventEmitter.emit("resetHomeTab");
            },
          })}
          options={{
            title: "Home",
            tabBarIcon: ({ color }) => <Home size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="map"
          options={{
            title: "Map",
            tabBarIcon: ({ color }) => <Map size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="create_post"
          options={{
            title: "Create",
            tabBarIcon: ({ color }) => <CirclePlus size={35} color={color} />,
            tabBarStyle: { display: "none" },
          }}
        />
        <Tabs.Screen
          name="chat"
          listeners={() => ({
            tabPress: () => {
              const fetchUnread = async () => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;
                const { data } = await supabase.rpc("get_total_unread_count", {
                  p_user_id: user.id,
                });
                setTotalUnread(data ?? 0);
              };
              fetchUnread();
            },
          })}
          options={{
            title: "Chat",
            tabBarIcon: ({ color }) => (
              <View>
                <MessageSquare size={22} color={color} />
                {totalUnread > 0 && (
                  <View style={{
                    position: "absolute",
                    top: -4,
                    right: -8,
                    minWidth: 16,
                    height: 16,
                    borderRadius: 8,
                    backgroundColor: "#ED3F27",
                    justifyContent: "center",
                    alignItems: "center",
                    paddingHorizontal: 4,
                  }}>
                    <Text style={{
                      color: "#fff",
                      fontSize: 9,
                      fontWeight: "800",
                    }}>
                      {totalUnread > 99 ? "99+" : totalUnread}
                    </Text>
                  </View>
                )}
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color }) => <User size={24} color={color} />,
          }}
        />
      </Tabs>

      {compareItems.length > 0 && (
        <View style={{
          position: "absolute",
          bottom: 90 + insets.bottom,
          left: 16,
          right: 16,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#FDF4E3",
          borderRadius: 16,
          borderWidth: 1,
          borderColor: "#C6D9F2",
          paddingVertical: 10,
          paddingHorizontal: 16,
          gap: 12,
        }}>
          <Text className="text-primary-300 text-sm font-rubik-bold">
            Listings: {compareItems.length}
          </Text>
          <TouchableOpacity onPress={() => router.push("/compare")}>
            <Text className="text-primary-300 font-rubik-bold text-sm">Compare</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => useCompareStore.getState().clear()}>
            <Trash2 size={18} color="#ED3F27" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
