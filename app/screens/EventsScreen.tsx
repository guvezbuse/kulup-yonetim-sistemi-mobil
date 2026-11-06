import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { getErrorMessage } from "../lib/errors";
import { formatEventDate, formatShortDateTime, toDate } from "../lib/eventDate";
import { deleteEvent, getEvents, joinEvent, leaveEvent } from "../services/eventService";
import { membershipService } from "../services/membershipService";
import { useAuthStore } from "../store/authStore";
import { EVENT_STATUS, Event, TARGET_AUDIENCE } from "../types";

interface EventsScreenProps {
  navigation?: {
    navigate: (screen: string, params?: Record<string, unknown>) => void;
  };
}

type EventTab = "upcoming" | "past";

export default function EventsScreen({ navigation }: EventsScreenProps) {
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);

  const isAdmin = profile?.is_admin === true;
  const [isClubManager, setIsClubManager] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<EventTab>("upcoming");

  useEffect(() => {
    const checkClubManager = async () => {
      if (!user || isAdmin) {
        setIsClubManager(false);
        return;
      }

      try {
        setIsClubManager(await membershipService.isManagerOfAnyClub(user.uid));
      } catch (error) {
        console.log("Kulüp yöneticisi kontrol hatası:", error);
        setIsClubManager(false);
      }
    };

    checkClubManager();
  }, [user, isAdmin]);

  const fetchEvents = useCallback(async () => {
    try {
      setEvents(await getEvents());
    } catch (error) {
      Alert.alert("Hata", getErrorMessage(error, "Etkinlikler yüklenirken bir hata oluştu."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleDelete = (event: Event) => {
    Alert.alert("Etkinliği Sil", `"${event.baslik}" kalıcı olarak silinecek. Emin misiniz?`, [
      { text: "İptal", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteEvent(event.id);
            setEvents((previous) => previous.filter((item) => item.id !== event.id));
            Alert.alert("Başarılı", "Etkinlik silindi.");
          } catch (error) {
            Alert.alert("Hata", getErrorMessage(error, "Etkinlik silinemedi."));
          }
        },
      },
    ]);
  };

  const handleRSVP = async (event: Event) => {
    if (!user) return;

    const katilimcilar = event.katilimcilar || [];
    const isAttending = katilimcilar.includes(user.uid);
    const kontenjan = event.kontenjan ?? null;

    if (!isAttending && kontenjan !== null && katilimcilar.length >= kontenjan) {
      Alert.alert("Kontenjan Dolu", "Maalesef bu etkinliğin kontenjanı dolmuştur.");
      return;
    }

    try {
      if (isAttending) {
        await leaveEvent(event.id, user.uid);
      } else {
        await joinEvent(event.id, user.uid);
      }
      await fetchEvents();
    } catch (error) {
      Alert.alert("Hata", getErrorMessage(error, "İşlem gerçekleştirilemedi."));
    }
  };

  const nowTime = Date.now();

  const visibleEvents = events
    .filter((event) => {
      // Taslaklar yalnızca Taslaklar ekranında görünür.
      if (event.status === EVENT_STATUS.DRAFT) return false;

      if (event.hedef_kitle === TARGET_AUDIENCE.ALL_ADMINS && !isAdmin) return false;
      if (event.hedef_kitle === TARGET_AUDIENCE.ALL_MANAGERS && !isAdmin && !isClubManager) {
        return false;
      }

      const eventDate = toDate(event.tarih);
      if (!eventDate) return tab === "upcoming";

      return tab === "upcoming" ? eventDate.getTime() >= nowTime : eventDate.getTime() < nowTime;
    })
    .sort((a, b) => {
      const aTime = toDate(a.tarih)?.getTime() ?? 0;
      const bTime = toDate(b.tarih)?.getTime() ?? 0;
      return tab === "upcoming" ? aTime - bTime : bTime - aTime;
    });

  const renderEventCard = ({ item }: { item: Event }) => {
    const participants = item.katilimcilar || [];
    const isAttending = participants.includes(user?.uid || "");
    const isClubEvent = !!item.club_id;
    const kontenjan = item.kontenjan ?? null;
    const isFull = kontenjan !== null && participants.length >= kontenjan;

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
        {!!item.gorselUrl && (
          <Image
            source={{ uri: item.gorselUrl }}
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
            </View>
            <Text className="text-white font-bold text-lg">{item.baslik}</Text>
          </View>

          {isAdmin && (
            <View className="flex-row items-center gap-2">
              <TouchableOpacity
                onPress={() => navigation?.navigate("EditEventScreen", { eventId: item.id })}
                className="p-2 bg-slate-700 rounded-lg active:opacity-80"
              >
                <Text className="text-xs">✏️</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleDelete(item)}
                className="p-2 bg-rose-500/20 rounded-lg border border-rose-500/30 active:opacity-80"
              >
                <Text className="text-xs">🗑️</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {!!item.aciklama && <Text className="text-slate-300 text-sm mb-3">{item.aciklama}</Text>}

        <View className="flex-row items-end justify-between border-t border-slate-700/60 pt-3 mt-1">
          <View className="flex-1 mr-2">
            <Text className="text-slate-400 text-xs">📅 {formatEventDate(item.tarih)}</Text>
            <Text className="text-slate-400 text-xs mt-0.5">
              📍 {item.konum || "Konum belirtilmedi"}
            </Text>
            <Text className="text-indigo-300 font-medium text-xs mt-1">
              👥 Katılımcı: {participants.length}{" "}
              {kontenjan !== null ? `/ ${kontenjan}` : "(Sınırsız)"}
            </Text>
          </View>

          <View className="items-end gap-2">
            {tab === "upcoming" && (
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

            {isAdmin && item.status !== EVENT_STATUS.CANCELLED && (
              <TouchableOpacity
                onPress={() =>
                  navigation?.navigate("Attendance", {
                    eventId: item.id,
                    eventTitle: item.baslik,
                  })
                }
                className="px-4 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30"
              >
                <Text className="text-emerald-400 text-xs font-bold">📷 Yoklama Al</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {!!item.createdAt && (
          <View className="items-end mt-2">
            <Text className="text-slate-500 text-[10px]">
              Oluşturuldu: {formatShortDateTime(item.createdAt)}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View className="flex-1 bg-slate-900 p-4">
      {isAdmin ? (
        <View className="flex-row items-center gap-3 mb-4">
          <TouchableOpacity
            onPress={() => navigation?.navigate("Drafts")}
            activeOpacity={0.7}
            className="flex-1 bg-slate-800 border border-slate-700 py-3.5 rounded-xl items-center justify-center"
          >
            <Text className="text-slate-200 font-bold text-xs">📋 Taslaklar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation?.navigate("CreateEvent")}
            activeOpacity={0.7}
            className="flex-1 bg-indigo-600 py-3.5 rounded-xl items-center justify-center shadow-md"
          >
            <Text className="text-white font-bold text-xs">+ Yeni Etkinlik</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View className="mb-4">
          <Text className="text-2xl font-bold text-white">Etkinlikler</Text>
          <Text className="text-slate-400 text-xs mt-0.5">
            Kulüp etkinliklerini keşfedin ve katılım sağlayın
          </Text>
        </View>
      )}

      <View className="flex-row bg-slate-800 p-1 rounded-xl mb-4">
        <TouchableOpacity
          onPress={() => setTab("upcoming")}
          className={`flex-1 py-2.5 rounded-lg items-center ${
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
          className={`flex-1 py-2.5 rounded-lg items-center ${
            tab === "past" ? "bg-indigo-600" : ""
          }`}
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
          data={visibleEvents}
          keyExtractor={(item) => item.id}
          renderItem={renderEventCard}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              tintColor="#6366f1"
              onRefresh={() => {
                setRefreshing(true);
                fetchEvents();
              }}
            />
          }
          ListEmptyComponent={
            <View className="items-center justify-center py-16">
              <Text className="text-4xl mb-3">📅</Text>
              <Text className="text-white font-bold text-base">
                {tab === "upcoming" ? "Yaklaşan etkinlik yok" : "Geçmiş etkinlik yok"}
              </Text>
              <Text className="text-slate-400 text-xs text-center mt-1">
                {tab === "upcoming"
                  ? "Yeni etkinlikler yayınlandığında burada görünecek."
                  : "Katıldığınız etkinlikler burada listelenecek."}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
