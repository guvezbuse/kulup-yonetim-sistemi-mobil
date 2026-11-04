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
import * as eventService from "../services/eventService";
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../lib/firebase";

export default function EventsScreen({ navigation }: any) {
  const { user } = useAuthStore();

  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isClubManager, setIsClubManager] = useState<boolean>(false);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  // Kullanıcı yetkilerini kontrol etme
  useEffect(() => {
    const checkUserRoles = async () => {
      if (!user) {
        setIsAdmin(false);
        setIsClubManager(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.exists() ? userDoc.data() : null;

        const adminFlag =
          userData?.is_admin === true ||
          userData?.role === "admin" ||
          (user as any)?.is_admin === true ||
          (user as any)?.role === "admin";

        setIsAdmin(!!adminFlag);
      } catch (e) {
        console.log("Admin kontrol hatası:", e);
        setIsAdmin(false);
      }

      try {
        const clubsRef = collection(db, "clubs");
        const q1 = query(clubsRef, where("yonetici_uid", "==", user.uid));
        const q2 = query(clubsRef, where("managerId", "==", user.uid));
        const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);

        setIsClubManager(!snap1.empty || !snap2.empty);
      } catch (e) {
        console.log("Kulüp yöneticisi kontrol hatası:", e);
        setIsClubManager(false);
      }
    };

    checkUserRoles();
  }, [user]);

  // Etkinlikleri veritabanından çekme
  const fetchEvents = async () => {
    try {
      const fetchFn =
        (eventService as any).getEvents ||
        (eventService as any).getAllEvents ||
        (eventService as any).getClubEvents;

      if (fetchFn) {
        const data = await fetchFn();
        setEvents(data || []);
      }
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

  // Etkinlik silme fonksiyonu
  const handleDelete = (eventId: string) => {
    Alert.alert("Etkinliği Sil", "Bu etkinliği silmek istediğinizden emin misiniz?", [
      { text: "İptal", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: async () => {
          try {
            const deleteFn =
              (eventService as any).deleteEvent || (eventService as any).deleteEventById;
            if (deleteFn) {
              await deleteFn(eventId);
              setEvents((prev) => prev.filter((e) => e.id !== eventId));
              Alert.alert("Başarılı", "Etkinlik silindi.");
            }
          } catch (err) {
            Alert.alert("Hata", "Etkinlik silinemedi.");
          }
        },
      },
    ]);
  };

  // RSVP (Etkinliğe katılım / katılmaktan vazgeçme) işlemi
  const handleRSVP = async (event: any) => {
    if (!user) return;
    const attendeesList = event.attendees || event.participants || [];
    const isAttending = attendeesList.includes(user.uid);
    const quota = event.quota;

    if (!isAttending && quota && attendeesList.length >= quota) {
      Alert.alert("Kontenjan Dolu", "Maalesef bu etkinliğin kontenjanı dolmuştur.");
      return;
    }

    try {
      const joinFn =
        (eventService as any).joinEvent ||
        (eventService as any).attendEvent ||
        (eventService as any).toggleEventRSVP;
      const leaveFn = (eventService as any).leaveEvent || (eventService as any).toggleEventRSVP;

      if (isAttending && leaveFn) {
        await leaveFn(event.id, user.uid);
      } else if (!isAttending && joinFn) {
        await joinFn(event.id, user.uid);
      }
      fetchEvents();
    } catch (err) {
      Alert.alert("Hata", "İşlem gerçekleştirilemedi.");
    }
  };

  // Standart İngilizce 'date' alanını güvenli Date nesnesine çeviren fonksiyon (Timestamp desteği)
  const getCleanDate = (item: any): Date | null => {
    const raw = item.date; // Standart şemadaki date alanı
    if (!raw) return null;

    if (raw?.seconds) {
      return new Date(raw.seconds * 1000);
    }

    if (typeof raw === "string") {
      let d = new Date(raw.replace(" ", "T"));
      if (!isNaN(d.getTime())) return d;
    }

    return null;
  };

  // Etkinlik tarihini okunaklı formata çevirme
  const formatEventDate = (item: any): string => {
    const d = getCleanDate(item);
    if (!d) {
      return typeof item.date === "string" && item.date.trim() ? item.date : "Tarih Belirtilmedi";
    }

    return d.toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Yayınlanma tarihini formatlama (createdAt)
  const formatPublishedDate = (item: any): string => {
    const raw = item.createdAt;
    if (!raw) return "";

    let d: Date;
    if (raw?.seconds) {
      d = new Date(raw.seconds * 1000);
    } else {
      d = new Date(raw);
    }

    if (isNaN(d.getTime())) return "";

    const pad = (num: number) => num.toString().padStart(2, "0");
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const nowTime = new Date().getTime();

  // FİLTRELEME MANTIĞI (Hedef Kitle, Taslak Durumu ve Yaklaşan/Geçmiş Sekmeleri)
  const filteredEvents = events.filter((e: any) => {
    // Taslak olan etkinlikler normal kullanıcılara gösterilmesin (Yönetici görebilir veya gizlenebilir)
    if (e.status === "taslak" && !isAdmin && !isClubManager) return false;

    const audience = (e.targetAudience || "").toLowerCase();

    if (audience === "admin" && !isAdmin) return false;
    if (audience === "club_manager" && !isAdmin && !isClubManager) return false;

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

  // Etkinlik Kartı Bileşeni
  const renderEventCard = ({ item }: { item: any }) => {
    const attendeesList = item.attendees || item.participants || [];
    const isAttending = attendeesList.includes(user?.uid || "");
    const isClubEvent = !!item.clubId;

    // Standart İngilizce değişkenlerin okunması
    const title = item.title || "İsimsiz Etkinlik";
    const description = item.description || "";
    const location = item.location || "Konum Belirtilmedi";
    const imageUrl = item.imageUrl || ""; // Yeni eklenen görsel URL alanı
    const eventDateStr = formatEventDate(item);
    const publishedDateStr = formatPublishedDate(item);

    const quota = item.quota;
    const currentAttendeeCount = attendeesList.length;
    const isFull = quota ? currentAttendeeCount >= quota : false;

    const audience = (item.targetAudience || "").toLowerCase();

    let badgeText = "Genel Etkinlik";
    let badgeBg = "bg-indigo-500/20";
    let badgeTextClr = "text-indigo-400";

    if (audience === "admin") {
      badgeText = "Admin Özel";
      badgeBg = "bg-rose-500/20";
      badgeTextClr = "text-rose-400";
    } else if (audience === "club_manager") {
      badgeText = "Kulüp Yöneticileri";
      badgeBg = "bg-purple-500/20";
      badgeTextClr = "text-purple-400";
    } else if (isClubEvent) {
      badgeText = item.clubName || "Kulüp Etkinliği";
      badgeBg = "bg-amber-500/20";
      badgeTextClr = "text-amber-400";
    }

    return (
      <View className="bg-slate-800 p-4 rounded-xl mb-3 border border-slate-700">
        {/* Etkinlik Görseli (Eğer URL girilmişse gösterilir) */}
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
              {item.status === "taslak" && (
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
                  onPress={() => navigation?.navigate("EditEvent", { eventId: item.id })}
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
              👥 Katılımcı: {currentAttendeeCount} {quota ? `/ ${quota}` : "(Sınırsız)"}
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
          keyExtractor={(item, index) => item.id || index.toString()}
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
