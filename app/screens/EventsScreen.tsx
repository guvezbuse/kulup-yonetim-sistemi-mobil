import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Modal,
  Alert,
} from "react-native";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { eventService, EventItem } from "../services/eventService";
import { useAuthStore } from "../store/authStore";

export default function EventsScreen() {
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);

  const [events, setEvents] = useState<EventItem[]>([]);
  const [appliedEventIds, setAppliedEventIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Başvuru Modalı
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [applyModalVisible, setApplyModalVisible] = useState(false);
  const [applyMessage, setApplyMessage] = useState("");
  const [applying, setApplying] = useState(false);

  const isSuperAdmin = profile?.is_admin === true;

  const loadEvents = async () => {
    if (!user) return;
    try {
      const [eventsData, userApps] = await Promise.all([
        eventService.getPublishedEventsForUser(user.uid, isSuperAdmin),
        eventService.getUserApplications(user.uid),
      ]);
      setEvents(eventsData);
      setAppliedEventIds(userApps);
    } catch (err) {
      console.log("Etkinlikler yüklenirken hata oluştu:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [user?.uid, isSuperAdmin]);

  const onRefresh = () => {
    setRefreshing(true);
    loadEvents();
  };

  const handleOpenApplyModal = (event: EventItem) => {
    setSelectedEvent(event);
    setApplyMessage("");
    setApplyModalVisible(true);
  };

  const handleSendApplication = async () => {
    if (!selectedEvent || !user) return;
    if (!applyMessage.trim()) {
      Alert.alert("Hata", "Lütfen katılım amacınızı/mesajınızı yazın.");
      return;
    }

    setApplying(true);
    try {
      const fullName = profile?.name
        ? `${profile.name} ${profile.surname || ""}`.trim()
        : user.email || "Öğrenci";

      await eventService.applyToEvent({
        eventId: selectedEvent.id,
        userId: user.uid,
        userName: fullName,
        userEmail: user.email || "",
        mesaj: applyMessage,
      });

      Alert.alert("Başarılı 🎉", "Etkinlik katılım talebiniz yöneticiye iletildi.");
      setApplyModalVisible(false);
      setSelectedEvent(null);
      loadEvents();
    } catch (err: any) {
      Alert.alert("Başvuru Yapılamadı", err.message || "Bir hata oluştu.");
    } finally {
      setApplying(false);
    }
  };

  return (
    <View className="flex-1 bg-slate-900 px-4 pt-4">
      <View className="mb-4">
        <Text className="text-2xl font-bold text-white">Etkinlikler</Text>
        <Text className="text-slate-400 text-xs mt-1">
          Üyesi olduğunuz kulüpler ve üniversite geneli etkinlikler
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator color="#8b5cf6" className="mt-10" />
      ) : events.length === 0 ? (
        <View className="flex-1 justify-center items-center px-6">
          <Text className="text-slate-400 text-sm text-center">
            Aktif veya yaklaşan bir etkinlik bulunmuyor.
          </Text>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8b5cf6" />
          }
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const isApplied = appliedEventIds.includes(item.id);
            const isFull =
              item.kontenjan !== null &&
              item.kontenjan !== undefined &&
              (item.basvuru_sayisi || 0) >= item.kontenjan;
            const isCompleted = item.durum === "tamamlandi";

            return (
              <Card className="mb-3 border border-slate-700/60 p-4">
                {/* Rozetler */}
                <View className="flex-row justify-between items-center mb-2">
                  <View
                    className={`px-2.5 py-0.5 rounded-full ${
                      item.club_id === null
                        ? "bg-amber-500/20 border border-amber-500/40"
                        : "bg-indigo-500/20 border border-indigo-500/40"
                    }`}
                  >
                    <Text
                      className={`text-[10px] font-bold uppercase ${
                        item.club_id === null ? "text-amber-400" : "text-indigo-400"
                      }`}
                    >
                      {item.club_id === null ? "GENEL ÜNİVERSİTE ETKİNLİĞİ" : item.club_ad}
                    </Text>
                  </View>

                  {isCompleted ? (
                    <View className="bg-slate-700/50 px-2 py-0.5 rounded border border-slate-600">
                      <Text className="text-slate-400 text-[10px] font-bold">Tamamlandı</Text>
                    </View>
                  ) : isFull ? (
                    <View className="bg-rose-500/20 px-2 py-0.5 rounded border border-rose-500/40">
                      <Text className="text-rose-400 text-[10px] font-bold">KONTENJAN DOLDU</Text>
                    </View>
                  ) : (
                    <View className="bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/40">
                      <Text className="text-emerald-400 text-[10px] font-bold">Kayıt Açık</Text>
                    </View>
                  )}
                </View>

                {/* Başlık ve Açıklama */}
                <Text className="text-white font-bold text-base mb-1">{item.baslik}</Text>
                <Text className="text-slate-300 text-xs leading-5 mb-3">{item.aciklama}</Text>

                {/* Detay Bilgileri */}
                <View className="pt-2 border-t border-slate-800 space-y-1 mb-3">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-slate-400 text-[11px]">
                      📅 <Text className="text-slate-200">{item.tarih_saat}</Text>
                    </Text>
                    <Text className="text-slate-400 text-[11px]">
                      📍 <Text className="text-slate-200">{item.konum}</Text>
                    </Text>
                  </View>

                  <View className="flex-row items-center justify-between pt-1">
                    <Text className="text-slate-400 text-[11px]">
                      👥 Kontenjan:{" "}
                      <Text className="text-slate-200 font-semibold">
                        {item.kontenjan !== null && item.kontenjan !== undefined
                          ? `${item.basvuru_sayisi || 0} / ${item.kontenjan}`
                          : `${item.basvuru_sayisi || 0} Kişi Başvurdu (Limitsiz)`}
                      </Text>
                    </Text>
                  </View>
                </View>

                {/* Katılım Aksiyon Butonu */}
                {!isCompleted && (
                  <View className="pt-2 border-t border-slate-800/80">
                    {isApplied ? (
                      <View className="bg-indigo-950/40 border border-indigo-500/40 py-2 rounded-xl items-center">
                        <Text className="text-indigo-300 text-xs font-bold">✓ Katıldınız.</Text>
                      </View>
                    ) : isFull ? (
                      <View className="bg-slate-800 py-2 rounded-xl items-center">
                        <Text className="text-slate-500 text-xs font-bold">
                          Kontenjan Dolduğu İçin Başvuruya Kapalı
                        </Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        onPress={() => handleOpenApplyModal(item)}
                        className="bg-purple-600 active:bg-purple-700 py-2.5 rounded-xl items-center"
                      >
                        <Text className="text-white text-xs font-bold">Katılacağım.</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </Card>
            );
          }}
        />
      )}

      {/* KATILIM TALEBİ VE AÇIKLAMA MODALI */}
      <Modal visible={applyModalVisible} transparent animationType="slide">
        <View className="flex-1 bg-black/75 justify-center px-4">
          <View className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
            <Text className="text-white font-bold text-lg mb-1">{selectedEvent?.baslik}</Text>
            <Text className="text-purple-400 text-xs mb-3 font-semibold">
              Etkinlik Katılım Başvurusu
            </Text>

            <Input
              label="Katılım Açıklaması / Notunuz"
              placeholder="Örn: Kulüp projemiz kapsamında bu atölyeye katılmak istiyorum..."
              value={applyMessage}
              onChangeText={setApplyMessage}
              multiline
            />

            <View className="flex-row gap-2 mt-3">
              <TouchableOpacity
                onPress={() => setApplyModalVisible(false)}
                className="flex-1 bg-slate-700 py-3 rounded-xl items-center"
              >
                <Text className="text-slate-300 font-bold text-xs">Vazgeç</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSendApplication}
                disabled={applying}
                className="flex-1 bg-purple-600 active:bg-purple-700 py-3 rounded-xl items-center"
              >
                {applying ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text className="text-white font-bold text-xs">Talebi Gönder</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
