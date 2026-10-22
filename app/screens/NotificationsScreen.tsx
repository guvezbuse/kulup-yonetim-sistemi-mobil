import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { collection, query, where, orderBy, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuthStore } from "../store/authStore";

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt?: any;
}

export default function NotificationsScreen({ onBack }: { onBack: () => void }) {
  const user = useAuthStore((state) => state.user);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = async () => {
    if (!user) return;
    try {
      const q = query(
        collection(db, "notifications"),
        where("user_id", "==", user.uid),
        orderBy("createdAt", "desc"),
      );
      const snap = await getDocs(q);
      const list: NotificationItem[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as NotificationItem);
      });
      setNotifications(list);
    } catch (err) {
      console.log("Bildirim yükleme hatası:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [user?.uid]);

  const markAsRead = async (id: string, currentlyRead: boolean) => {
    if (currentlyRead) return;
    try {
      await updateDoc(doc(db, "notifications", id), { read: true });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch (e) {
      console.log("Okundu işaretleme hatası:", e);
    }
  };

  return (
    <View className="flex-1 bg-slate-900 px-4 pt-4">
      <View className="flex-row items-center justify-between mb-4">
        <TouchableOpacity onPress={onBack}>
          <Text className="text-indigo-400 font-semibold">← Geri Dön</Text>
        </TouchableOpacity>
        <Text className="text-lg font-bold text-white">Bildirimler</Text>
        <View style={{ width: 60 }} />
      </View>

      {loading ? (
        <ActivityIndicator color="#6366f1" className="mt-8" />
      ) : notifications.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <Text className="text-slate-400 text-sm">Henüz bir bildiriminiz bulunmuyor.</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
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
              onPress={() => markAsRead(item.id, item.read)}
              activeOpacity={0.8}
              className={`p-4 rounded-xl mb-2.5 border ${
                item.read
                  ? "bg-slate-800/50 border-slate-700/50"
                  : "bg-slate-800 border-indigo-500/50"
              }`}
            >
              <View className="flex-row justify-between items-center mb-1">
                <Text className="text-white font-bold text-sm flex-1 mr-2">{item.title}</Text>
                {!item.read && <View className="w-2 h-2 rounded-full bg-indigo-500" />}
              </View>
              <Text className="text-slate-300 text-xs mt-0.5">{item.body}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}
