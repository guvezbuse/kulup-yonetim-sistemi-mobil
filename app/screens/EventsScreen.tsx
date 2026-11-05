import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Image,
} from "react-native";
import { useAuthStore } from "../store/authStore";
import { getEvents, deleteEvent, joinEvent, leaveEvent } from "../services/eventService";
import { membershipService } from "../services/membershipService";
import { getErrorMessage } from "../lib/errors";
import { EVENT_STATUS, Event, TARGET_AUDIENCE } from "../types";

interface EventsScreenProps {
  navigation?: {
    navigate: (screen: string, params?: Record<string, unknown>) => void;
  };
}

export default function EventsScreen({ navigation }: EventsScreenProps) {
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);

  const [isClubManager, setIsClubManager] = useState<boolean>(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  const isAdmin = profile?.is_admin === true;

  // Yönetici olduğu kulüpleri kontrol et
  useEffect(() => {
    const checkClubManager = async () => {
      if (!user) {
        setIsClubManager(false);
        return;
      }

      try {
        const isManager = await membershipService.isManagerOfAnyClub(user.uid);
        setIsClubManager(isManager);
      } catch (e) {
        console.log("Kulüp yöneticisi kontrol hatası:", e);
        setIsClubManager(false);
      }
    };

    checkClubManager();
  }, [user]);

  const fetchEvents = async () => {
    try {
      const data = await getEvents();
      setEvents(data);
    } catch (error) {
      console.error("Etkinlik çekme hatası:", error);
      Alert.alert("Hata", "Etkinlikler yüklenirken bir hata oluştu.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleDelete = (eventId: string) => {
    Alert.alert("Etkinliği Sil", "Bu etkinliği silmek istediğinizden emin misiniz?", [
      { text: "İptal", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteEvent(eventId);
            setEvents((prev) => prev.filter((e) => e.id !== eventId));
            Alert.alert("Başarılı", "Etkinlik silindi.");
          } catch {
            Alert.alert("Hata", "Etkinlik silinemedi.");
          }
        },
      },
    ]);
  };

  const handleRSVP = async (event: Event) => {
    if (!user) return;

    const isAttending = event.katilimcilar.includes(user.uid);
    const kontenjan = event.kontenjan ?? null;

    if (!isAttending && kontenjan !== null && event.katilimcilar.length >= kontenjan) {
      Alert.alert("Kontenjan Dolu", "Maalesef bu etkinliğin kontenjanı dolmuştur.");
      return;
    }

    try {
      if (isAttending) {
        await leaveEvent(event.id, user.uid);
      } else {
        await joinEvent(event.id, user.uid);
      }
      fetchEvents();
    } catch (err) {
      Alert.alert("Hata", getErrorMessage(err, "İşlem gerçekleştirilemedi."));
    }
  };

  const getCleanDate = (item: Event): Date | null => {
    const raw = item.tarih;
    if (!raw) return null;

    if (typeof raw !== "string") {
      return new Date(raw.seconds * 1000);
    }

    const d = new Date(raw.replace(" ", "T"));
    if (!isNaN(d.getTime())) return d;

    return null;
  };

  const formatEventDate = (item: Event): string => {
    const d = getCleanDate(item);
    if (!d) {
      return typeof item.tarih === "string" && item.tarih.trim() ? item.tarih : "Tarih Belirtilmedi";
    }

    return d.toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatPublishedDate = (item: Event): string => {
    const raw = item.createdAt;
    if (!raw) return "";

    const d =
      typeof raw === "string" ? new Date(raw) : new Date(raw.seconds * 1000);
    if (isNaN(d.getTime())) return "";

    const pad = (num: number) => num.toString().padStart(2, "0");
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const nowTime = new Date().getTime();

  const filteredEvents = events.filter((e: Event) => {
    if (e.status === EVENT_STATUS.DRAFT && !isAdmin && !isClubManager) return false;

    if (e.hedef_kitle === TARGET_AUDIENCE.ALL_ADMINS && !isAdmin) return false;
    if (e.hedef_kitle === TARGET_AUDIENCE.ALL_MANAGERS && !isAdmin && !isClubManager) return false;

    const eventDate = getCleanDate(e);

    if (!eventDate) {
      return tab === "upcoming";
    }

    const eventTime = eventDate.getTime();

    if (tab === "upcoming") {
      return eventTime >= nowTime;
    }
    return eventTime < nowTime;
  });

  const renderEventCard = ({ item }: { item: Event }) => {
    const isAttending = item.katilimcilar.includes(user?.uid || "");
    const isClubEvent = !!item.club_id;

    const title = item.baslik || "İsimsiz Etkinlik";
    const description = item.aciklama || "";
    const location = item.konum || "Konum Belirtilmedi";
    const imageUrl = item.gorselUrl || "";
    const eventDateStr = formatEventDate(item);
    const publishedDateStr = formatPublishedDate(item);

    const kontenjan = item.kontenjan ?? null;
    const currentAttendeeCount = item.katilimcilar.length;
    const isFull = kontenjan !== null && currentAttendeeCount >= kontenjan;

    let badgeText = "Genel Etkinlik";
    let badgeBg = "bg-indigo-500/20";
    let badgeTextClr = "text-indigo-400";

    if (item.hedef_kitle === TARGET_AUDIENCE.ALL_ADMINS) {
      badgeText = "Admin Özel";
      badgeBg = "bg-rose-500/20";
      badgeTextClr = "text-rose-400";
    } else if (item.hedef_kitle === TARGET_AUDIENCE.ALL_MANAGERS) {
      badgeText = "Kulüp Yöneticileri";
      badgeBg = "bg-purple-500/20";
      badgeTextClr = "text-purple-400";
    } else if (isClubEvent) {
      badgeText = item.club_ad || "Kulüp Etkinliği";
      badgeBg = "bg-amber-500/20";
      badgeTextClr = "text-amber-400";
    }

    return (
      <View className="bg-slate-800 p-4 rounded-xl mb-3 border border-slate-700">
        {!!imageUrl && (
          <Image
            source={{ uri: imageUrl }}
            className="w-full h-40 rounded-lg mb-3 bg-slate-700"
            resizeMode="cover"
          />
        )}

        <View className="flex-row justify-between items-start mb-2">
          <View className="flex-1 mr-2">
            <View className="flex-row items-center gap-2 mb-1">
              <View className={`px-2 py-0.5 rounded ${badgeBg}`}>
                <Text className={`text-xs font-semibold ${badgeTextClr}`}>{badgeText}</Text>
              </View>
              {item.status === EVENT_STATUS.DRAFT && (
                <View className="px-2 py-0.5 rounded bg-yellow-500/20">
                  <Text className="text-xs font-semibold text-yellow-400">Taslak</Text>
                </View>
              )}
            </View>
            <Text className="text-white font-bold text-lg">{title}</Text>
          </View>

          {isAdmin && (
            <View className="flex-row items-center gap-2">
              {!isClubEvent && (
                <TouchableOpacity
                  onPress={() =>
                    navigation?.navigate("EditEventScreen", { eventId: item.id })
                  }
                  className="p-1.5 bg-slate-700 rounded-md"
                >
                  <Text className="text-xs">✏️</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => handleDelete(item.id)}
                className="p-1.5 bg-rose-500/20 rounded-md border border-rose-500/30"
              >
                <Text className="text-xs">🗑️</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {!!description && <Text className="text-slate-300 text-sm mb-3">{description}</Text>}

        <View className="flex-row items-end justify-between border-t border-slate-700/60 pt-3 mt-1">
          <View className="flex-1 mr-2">
            <Text className="text-slate-400 text-xs">📅 {eventDateStr}</Text>
            <Text className="text-slate-400 text-xs mt-0.5">📍 {location}</Text>

            <Text className="text-indigo-300 font-medium text-xs mt-1">
              👥 Katılımcı: {currentAttendeeCount}{" "}
              {kontenjan !== null ? `/ ${kontenjan}` : "(Sınırsız)"}
            </Text>
          </View>

          {!isAdmin && tab === "upcoming" && (
            <TouchableOpacity
              onPress={() => handleRSVP(item)}
              disabled={isFull && !isAttending}
              className={`px-4 py-2 rounded-lg ${
                isAttending ? "bg-emerald-600" : isFull ? "bg-slate-700" : "bg-indigo-600"
              }`}
            >
              <Text className="text-white text-xs font-bold">
                {isAttending ? "Katıldınız ✓" : isFull ? "Kontenjan Dolu" : "Etkinliğe Katıl"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {!!publishedDateStr && (
          <View className="items-end mt-2">
            <Text className="text-slate-400 text-[11px] font-medium">{publishedDateStr}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View className="flex-1 bg-slate-900 p-4">
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-2xl font-bold text-white">Etkinlikler</Text>
        {(isAdmin || isClubManager) && (
          <TouchableOpacity
            onPress={() => navigation?.navigate("CreateEvent")}
            className="bg-indigo-600 px-3 py-2 rounded-lg"
          >
            <Text className="text-white font-semibold text-xs">+ Yeni</Text>
          </TouchableOpacity>
        )}
      </View>

      <View className="flex-row bg-slate-800 p-1 rounded-xl mb-4">
        <TouchableOpacity
          onPress={() => setTab("upcoming")}
          className={`flex-1 py-2 rounded-lg items-center ${
            tab === "upcoming" ? "bg-indigo-600" : ""
          }`}
        >
          <Text
            className={`font-semibold text-xs ${
              tab === "upcoming" ? "text-white" : "text-slate-400"
            }`}
          >
            Yaklaşan Etkinlikler
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setTab("past")}
          className={`flex-1 py-2 rounded-lg items-center ${tab === "past" ? "bg-indigo-600" : ""}`}
        >
          <Text
            className={`font-semibold text-xs ${tab === "past" ? "text-white" : "text-slate-400"}`}
          >
            Etkinlik Geçmişi
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#6366f1" className="mt-10" />
      ) : (
        <FlatList
          data={filteredEvents}
          keyExtractor={(item) => item.id}
          renderItem={renderEventCard}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchEvents();
              }}
            />
          }
          ListEmptyComponent={
            <Text className="text-slate-500 text-center mt-10">
              {tab === "upcoming" ? "Yaklaşan etkinlik bulunmuyor." : "Geçmiş etkinlik bulunmuyor."}
            </Text>
          }
        />
      )}
    </View>
  );
}
