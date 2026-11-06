import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { notificationService } from "../services/notificationService";
import { NotificationItem } from "../types";
import { useAuthStore } from "../store/authStore";
import { formatShortDateTime } from "../lib/eventDate";
import { getErrorCode } from "../lib/errors";

export default function NotificationsScreen({ onBack }: { onBack?: () => void }) {
  const user = useAuthStore((state) => state.user);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const loadNotifications = async () => {
    if (!user) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setErrorCode(null);
      setLoading(true);
      const data = await notificationService.getUserNotifications(user.uid);
      setNotifications(data);
    } catch (err) {
      console.log("Bildirimleri yükleme hatası:", err);
      setErrorCode(getErrorCode(err) || "bilinmeyen");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [user?.uid]);

  const unreadCount = notifications.filter((item) => !item.read).length;

  const handleNotificationPress = async (item: NotificationItem) => {
    if (item.read) return;

    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === item.id ? { ...notification, read: true } : notification,
      ),
    );

    try {
      await notificationService.markNotificationRead(item.id);
    } catch (err) {
      console.log("Bildirim okundu olarak işaretlenemedi:", err);
      loadNotifications();
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user || unreadCount === 0) return;

    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));

    try {
      await notificationService.markAllNotificationsRead(user.uid);
    } catch (err) {
      console.log("Bildirimler okundu olarak işaretlenemedi:", err);
      loadNotifications();
    }
  };

  return (
    <View className="flex-1 bg-slate-900 px-4 pt-4">
      <View className="flex-row items-center justify-between mb-4">
        <View>
          <Text className="text-2xl font-bold text-white">Bildirimler</Text>
          <Text className="text-slate-400 text-xs mt-0.5">
            Etkinlik, duyuru ve üyelik hareketleri
          </Text>
        </View>

        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllAsRead} activeOpacity={0.7}>
            <Text className="text-indigo-400 text-xs font-semibold">Tümünü Oku</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color="#6366f1" size="large" className="mt-8" />
      ) : errorCode ? (
        <View className="flex-1 justify-center items-center px-8">
          <Text className="text-slate-300 text-sm font-semibold mb-1">
            Bildirimler yüklenemedi
          </Text>
          <Text className="text-slate-500 text-[11px] text-center mb-3">
            {errorCode === "permission-denied"
              ? "Firestore kuralları notifications koleksiyonuna okuma izni vermiyor."
              : `Teknik kod: ${errorCode}`}
          </Text>
          <TouchableOpacity
            onPress={loadNotifications}
            className="bg-indigo-600 px-4 py-2 rounded-xl"
            activeOpacity={0.7}
          >
            <Text className="text-white text-xs font-bold">Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      ) : notifications.length === 0 ? (
        <View className="flex-1 justify-center items-center px-8">
          <Text className="text-3xl mb-3">🔔</Text>
          <Text className="text-slate-300 text-sm font-semibold">Henüz bildiriminiz yok</Text>
          <Text className="text-slate-500 text-xs text-center mt-1 leading-5">
            Yeni duyurular, etkinlikler ve üyelik hareketleri burada listelenecek.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadNotifications();
              }}
              tintColor="#6366f1"
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => handleNotificationPress(item)}
              activeOpacity={0.8}
              className={`p-4 rounded-xl mb-3 border ${
                item.read
                  ? "bg-slate-800/60 border-slate-700/50"
                  : "bg-slate-800 border-indigo-500/40"
              }`}
            >
              <View className="flex-row items-start">
                <View className="w-2 mr-2 pt-1.5">
                  {!item.read && <View className="w-2 h-2 rounded-full bg-indigo-400" />}
                </View>

                <View className="flex-1">
                  <Text
                    className={`text-sm ${
                      item.read ? "text-slate-300" : "text-white font-bold"
                    }`}
                  >
                    {item.title}
                  </Text>

                  <Text className="text-slate-400 text-xs leading-5 mt-1">{item.body}</Text>

                  <Text className="text-slate-500 text-[10px] mt-2">
                    {formatShortDateTime(item.createdAt)}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}
