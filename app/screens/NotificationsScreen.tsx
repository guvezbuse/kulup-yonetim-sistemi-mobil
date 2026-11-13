import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from "react-native";
import { notificationService } from "../services/notificationService";
import {
  NOTIFICATION_TYPE,
  NotificationItem,
  NotificationTargetScreen,
  NotificationType,
} from "../types";
import { useAuthStore } from "../store/authStore";
import { formatShortDateTime, toDate } from "../lib/eventDate";
import { getErrorCode } from "../lib/errors";

interface NotificationsScreenProps {
  onBack?: () => void;
  onOpenTarget?: (screen: NotificationTargetScreen) => void;
}

type FilterKey = "all" | "unread" | "duyuru" | "etkinlik" | "uyelik";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Tümü" },
  { key: "unread", label: "Okunmamış" },
  { key: "duyuru", label: "Duyurular" },
  { key: "etkinlik", label: "Etkinlikler" },
  { key: "uyelik", label: "Üyelik" },
];

const TYPE_META: Record<
  NotificationType,
  { icon: string; label: string; accent: string; bg: string }
> = {
  [NOTIFICATION_TYPE.SYSTEM]: {
    icon: "🔔",
    label: "Sistem",
    accent: "text-slate-300",
    bg: "bg-slate-700/60",
  },
  [NOTIFICATION_TYPE.ANNOUNCEMENT]: {
    icon: "📢",
    label: "Duyuru",
    accent: "text-emerald-300",
    bg: "bg-emerald-500/15",
  },
  [NOTIFICATION_TYPE.EVENT]: {
    icon: "🗓️",
    label: "Etkinlik",
    accent: "text-purple-300",
    bg: "bg-purple-500/15",
  },
  [NOTIFICATION_TYPE.APPLICATION]: {
    icon: "📥",
    label: "Başvuru",
    accent: "text-amber-300",
    bg: "bg-amber-500/15",
  },
  [NOTIFICATION_TYPE.DECISION]: {
    icon: "✅",
    label: "Karar",
    accent: "text-sky-300",
    bg: "bg-sky-500/15",
  },
  [NOTIFICATION_TYPE.INVITATION]: {
    icon: "✉️",
    label: "Davet",
    accent: "text-indigo-300",
    bg: "bg-indigo-500/15",
  },
  [NOTIFICATION_TYPE.ATTENDANCE]: {
    icon: "📍",
    label: "Yoklama",
    accent: "text-rose-300",
    bg: "bg-rose-500/15",
  },
};

const MEMBERSHIP_TYPES: NotificationType[] = [
  NOTIFICATION_TYPE.APPLICATION,
  NOTIFICATION_TYPE.DECISION,
  NOTIFICATION_TYPE.INVITATION,
];

// Eski bildirimlerde tip alanı yok; başlıktan çıkarılır.
const inferTip = (item: NotificationItem): NotificationType => {
  if (item.tip) return item.tip;

  const title = item.title.toLocaleLowerCase("tr-TR");
  if (title.includes("duyuru")) return NOTIFICATION_TYPE.ANNOUNCEMENT;
  if (title.includes("etkinlik")) return NOTIFICATION_TYPE.EVENT;
  if (title.includes("başvuru")) return NOTIFICATION_TYPE.APPLICATION;
  if (title.includes("davet") || title.includes("rol")) return NOTIFICATION_TYPE.INVITATION;
  return NOTIFICATION_TYPE.SYSTEM;
};

const resolveTarget = (item: NotificationItem): NotificationTargetScreen | null => {
  if (item.hedef_ekran) return item.hedef_ekran;

  const tip = inferTip(item);
  if (tip === NOTIFICATION_TYPE.ANNOUNCEMENT) return "announcements";
  if (tip === NOTIFICATION_TYPE.EVENT) return "events";
  if (MEMBERSHIP_TYPES.includes(tip)) return "clubs";
  return null;
};

function NotificationCard({ item, onPress }: { item: NotificationItem; onPress: () => void }) {
  const tip = inferTip(item);
  const meta = TYPE_META[tip];

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      className={`p-3.5 rounded-2xl mb-2.5 border flex-row ${
        item.read ? "bg-slate-800/50 border-slate-700/50" : "bg-slate-800 border-indigo-500/40"
      }`}
    >
      <View className={`w-10 h-10 rounded-xl items-center justify-center mr-3 ${meta.bg}`}>
        <Text className="text-lg">{meta.icon}</Text>
      </View>

      <View className="flex-1">
        <View className="flex-row items-start justify-between">
          <Text
            className={`text-sm flex-1 pr-2 ${
              item.read ? "text-slate-300 font-semibold" : "text-white font-bold"
            }`}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          {!item.read && <View className="w-2 h-2 rounded-full bg-indigo-400 mt-1.5" />}
        </View>

        <Text className="text-slate-400 text-xs leading-5 mt-1" numberOfLines={3}>
          {item.body}
        </Text>

        <View className="flex-row items-center flex-wrap mt-2">
          <View className={`px-1.5 py-0.5 rounded mr-2 ${meta.bg}`}>
            <Text className={`text-[9px] font-bold ${meta.accent}`}>{meta.label}</Text>
          </View>

          {item.club_ad ? (
            <Text className="text-slate-500 text-[10px] mr-2" numberOfLines={1}>
              {item.club_ad}
            </Text>
          ) : null}

          <Text className="text-slate-500 text-[10px]">{formatShortDateTime(item.createdAt)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function NotificationsScreen({ onOpenTarget }: NotificationsScreenProps) {
  const user = useAuthStore((state) => state.user);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");

  // Gerçek zamanlı abonelik: yeni bildirim anında listeye düşer.
  useEffect(() => {
    if (!user?.uid) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = notificationService.subscribeToUserNotifications(
      user.uid,
      (data) => {
        setNotifications(data);
        setErrorCode(null);
        setLoading(false);
        setRefreshing(false);
      },
      (error) => {
        console.log("Bildirimleri yükleme hatası:", error);
        setErrorCode(getErrorCode(error) || "bilinmeyen");
        setLoading(false);
        setRefreshing(false);
      },
    );

    return unsubscribe;
  }, [user?.uid]);

  const loadNotifications = async () => {
    if (!user?.uid) return;

    try {
      setErrorCode(null);
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

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications],
  );

  const todayCount = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return notifications.filter((item) => (toDate(item.createdAt)?.getTime() ?? 0) >= startOfToday)
      .length;
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    switch (activeFilter) {
      case "unread":
        return notifications.filter((item) => !item.read);
      case "duyuru":
        return notifications.filter((item) => inferTip(item) === NOTIFICATION_TYPE.ANNOUNCEMENT);
      case "etkinlik":
        return notifications.filter((item) => inferTip(item) === NOTIFICATION_TYPE.EVENT);
      case "uyelik":
        return notifications.filter((item) => MEMBERSHIP_TYPES.includes(inferTip(item)));
      default:
        return notifications;
    }
  }, [notifications, activeFilter]);

  const sections = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
    const startOfWeek = startOfToday - 6 * 24 * 60 * 60 * 1000;

    const buckets: { title: string; data: NotificationItem[] }[] = [
      { title: "Bugün", data: [] },
      { title: "Dün", data: [] },
      { title: "Bu Hafta", data: [] },
      { title: "Daha Eski", data: [] },
    ];

    filteredNotifications.forEach((item) => {
      const millis = toDate(item.createdAt)?.getTime() ?? 0;
      if (millis >= startOfToday) buckets[0].data.push(item);
      else if (millis >= startOfYesterday) buckets[1].data.push(item);
      else if (millis >= startOfWeek) buckets[2].data.push(item);
      else buckets[3].data.push(item);
    });

    return buckets.filter((bucket) => bucket.data.length > 0);
  }, [filteredNotifications]);

  const filterCount = (key: FilterKey): number => {
    switch (key) {
      case "unread":
        return unreadCount;
      case "duyuru":
        return notifications.filter((item) => inferTip(item) === NOTIFICATION_TYPE.ANNOUNCEMENT)
          .length;
      case "etkinlik":
        return notifications.filter((item) => inferTip(item) === NOTIFICATION_TYPE.EVENT).length;
      case "uyelik":
        return notifications.filter((item) => MEMBERSHIP_TYPES.includes(inferTip(item))).length;
      default:
        return notifications.length;
    }
  };

  const handleNotificationPress = async (item: NotificationItem) => {
    if (!item.read) {
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
    }

    const target = resolveTarget(item);
    if (target) {
      onOpenTarget?.(target);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.uid || unreadCount === 0) return;

    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));

    try {
      await notificationService.markAllNotificationsRead(user.uid);
    } catch (err) {
      console.log("Bildirimler okundu olarak işaretlenemedi:", err);
      loadNotifications();
    }
  };

  const emptyTitle =
    activeFilter === "unread"
      ? "Okunmamış bildirim yok"
      : activeFilter === "all"
        ? "Henüz bildiriminiz yok"
        : "Bu kategoride bildirim yok";

  return (
    <View className="flex-1 bg-slate-900 px-4 pt-4">
      <View className="flex-row items-center justify-between mb-1">
        <View className="flex-1 mr-2">
          <Text className="text-2xl font-bold text-white">Bildirimler</Text>
          <Text className="text-slate-400 text-xs mt-0.5">
            Duyuru, etkinlik ve üyelik hareketleri
          </Text>
        </View>

        {unreadCount > 0 && (
          <TouchableOpacity
            onPress={handleMarkAllAsRead}
            activeOpacity={0.7}
            className="bg-indigo-600/20 border border-indigo-500/40 px-3 py-1.5 rounded-xl"
          >
            <Text className="text-indigo-300 text-[11px] font-bold">Tümünü Okundu</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Özet kartları */}
      <View className="flex-row gap-2 mt-3 mb-3">
        <View className="flex-1 bg-indigo-500/10 border border-indigo-500/25 rounded-xl p-3">
          <Text className="text-indigo-300/80 text-[10px] uppercase font-semibold">Okunmamış</Text>
          <Text className="text-indigo-200 text-xl font-bold mt-0.5">{unreadCount}</Text>
        </View>
        <View className="flex-1 bg-slate-800 border border-slate-700 rounded-xl p-3">
          <Text className="text-slate-400 text-[10px] uppercase font-semibold">Toplam</Text>
          <Text className="text-white text-xl font-bold mt-0.5">{notifications.length}</Text>
        </View>
        <View className="flex-1 bg-emerald-500/10 border border-emerald-500/25 rounded-xl p-3">
          <Text className="text-emerald-300/80 text-[10px] uppercase font-semibold">Bugün</Text>
          <Text className="text-emerald-200 text-xl font-bold mt-0.5">{todayCount}</Text>
        </View>
      </View>

      {/* Filtreler */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mb-3 max-h-9"
        contentContainerStyle={{ gap: 8 }}
      >
        {FILTERS.map((filter) => {
          const active = activeFilter === filter.key;
          const count = filterCount(filter.key);

          return (
            <TouchableOpacity
              key={filter.key}
              onPress={() => setActiveFilter(filter.key)}
              activeOpacity={0.7}
              className={`px-3 py-1.5 rounded-full border ${
                active ? "bg-indigo-600 border-indigo-500" : "bg-slate-800/70 border-slate-700"
              }`}
            >
              <Text className={`text-[11px] font-bold ${active ? "text-white" : "text-slate-300"}`}>
                {filter.label}
                {count > 0 ? ` (${count})` : ""}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading ? (
        <ActivityIndicator color="#6366f1" size="large" className="mt-8" />
      ) : errorCode ? (
        <View className="flex-1 justify-center items-center px-8">
          <Text className="text-slate-300 text-sm font-semibold mb-1">Bildirimler yüklenemedi</Text>
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
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 28 }}
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
          renderSectionHeader={({ section }) => (
            <Text className="text-slate-500 text-[11px] font-bold uppercase mt-2 mb-2">
              {section.title}
            </Text>
          )}
          renderItem={({ item }) => (
            <NotificationCard item={item} onPress={() => handleNotificationPress(item)} />
          )}
          ListEmptyComponent={
            <View className="items-center justify-center py-16 px-8">
              <Text className="text-4xl mb-3">{activeFilter === "unread" ? "✅" : "🔔"}</Text>
              <Text className="text-slate-300 text-sm font-semibold">{emptyTitle}</Text>
              <Text className="text-slate-500 text-xs text-center mt-1 leading-5">
                {activeFilter === "all"
                  ? "Yeni duyurular, etkinlikler ve üyelik hareketleri burada listelenecek."
                  : "Farklı bir filtre seçerek tüm bildirimlerinizi görebilirsiniz."}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
