import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal,
} from "react-native";
import { Card } from "../../components/Card";
import { Input } from "../../components/Input";
import { eventService, EventItem, EventStatus } from "../../services/eventService";
import { useAuthStore } from "../../store/authStore";

interface Props {
  onBack: () => void;
}

export default function CreateEventScreen({ onBack }: Props) {
  const user = useAuthStore((state) => state.user);

  const [adminEvents, setAdminEvents] = useState<EventItem[]>([]);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDesc, setEventDesc] = useState("");
  const [eventDateTime, setEventDateTime] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [eventQuota, setEventQuota] = useState("");
  const [eventCreating, setEventCreating] = useState(false);

  const [selectedEventApps, setSelectedEventApps] = useState<any[]>([]);
  const [appModalVisible, setAppModalVisible] = useState(false);
  const [selectedEventTitle, setSelectedEventTitle] = useState("");
  const [loadingApps, setLoadingApps] = useState(false);

  const loadEvents = async () => {
    try {
      const allEvents = await eventService.getPublishedEventsForUser(user?.uid || "", true);
      const generalEvents = allEvents.filter((ev) => ev.club_id === null);
      setAdminEvents(generalEvents);
    } catch (err) {
      console.log("Etkinlikler çekilemedi:", err);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleCreateGeneralEvent = async (asDraft: boolean = false) => {
    if (!eventTitle.trim() || !eventDesc.trim() || !eventLocation.trim() || !eventDateTime.trim()) {
      Alert.alert(
        "Hata",
        "Lütfen etkinlik adı, tarih/saat, konum ve açıklama alanlarını doldurun.",
      );
      return;
    }

    setEventCreating(true);
    try {
      await eventService.createEvent({
        club_id: null,
        club_ad: "Üniversite Geneli",
        baslik: eventTitle,
        aciklama: eventDesc,
        tarih_saat: eventDateTime,
        konum: eventLocation,
        kontenjan: eventQuota ? parseInt(eventQuota, 10) : null,
        olusturan_id: user?.uid || "admin",
        durum: asDraft ? "taslak" : "yayinlandi",
      });

      Alert.alert(
        "Başarılı 🎉",
        asDraft
          ? "Genel etkinlik taslak kaydedildi."
          : "Genel etkinlik tüm öğrencilere yayınlandı!",
      );
      setEventTitle("");
      setEventDesc("");
      setEventDateTime("");
      setEventLocation("");
      setEventQuota("");
      loadEvents();
    } catch (err: any) {
      Alert.alert("Hata", err.message || "Etkinlik oluşturulamadı.");
    } finally {
      setEventCreating(false);
    }
  };

  const handleUpdateEventStatus = async (eventId: string, status: EventStatus) => {
    try {
      await eventService.updateEventStatus(eventId, status);
      loadEvents();
    } catch (err: any) {
      Alert.alert("Hata", "Durum güncellenemedi.");
    }
  };

  const handleDeleteEvent = (eventId: string, title: string) => {
    Alert.alert("Etkinliği Sil", `"${title}" kalıcı olarak silinecek. Emin misiniz?`, [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: async () => {
          try {
            await eventService.deleteEvent(eventId);
            loadEvents();
          } catch (e) {
            Alert.alert("Hata", "Etkinlik silinemedi.");
          }
        },
      },
    ]);
  };

  const handleViewApplications = async (eventId: string, title: string) => {
    setSelectedEventTitle(title);
    setLoadingApps(true);
    setAppModalVisible(true);
    try {
      const data = await eventService.getEventApplications(eventId);
      setSelectedEventApps(data);
    } catch (e) {
      Alert.alert("Hata", "Başvurular çekilemedi.");
    } finally {
      setLoadingApps(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-slate-900 px-4 pt-4" showsVerticalScrollIndicator={false}>
      <TouchableOpacity onPress={onBack} className="mb-4">
        <Text className="text-indigo-400 font-semibold">← Menüye Dön</Text>
      </TouchableOpacity>

      <Text className="text-2xl font-bold text-white mb-4">🏛️ Genel Etkinlik Yönetimi</Text>

      <Card className="mb-6 border border-purple-500/40">
        <Input
          label="Etkinlik Başlığı"
          placeholder="Örn: Kariyer Fuarı 2026"
          value={eventTitle}
          onChangeText={setEventTitle}
        />
        <Input
          label="Tarih ve Saat"
          placeholder="Örn: 20 Kasım 2026 - 10:00"
          value={eventDateTime}
          onChangeText={setEventDateTime}
        />
        <Input
          label="Konum / Alan"
          placeholder="Örn: Kongre ve Kültür Merkezi"
          value={eventLocation}
          onChangeText={setEventLocation}
        />
        <Input
          label="Kontenjan (Opsiyonel)"
          placeholder="Limitsiz için boş bırakın"
          keyboardType="numeric"
          value={eventQuota}
          onChangeText={setEventQuota}
        />
        <Input
          label="Açıklama"
          placeholder="Etkinlik programı, konuşmacılar..."
          value={eventDesc}
          onChangeText={setEventDesc}
          multiline
        />

        <View className="flex-row gap-2 mt-2">
          <TouchableOpacity
            onPress={() => handleCreateGeneralEvent(true)}
            disabled={eventCreating}
            className="flex-1 bg-slate-800 border border-slate-700 py-3 rounded-xl items-center"
          >
            <Text className="text-slate-300 font-bold text-xs">Taslak Kaydet</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleCreateGeneralEvent(false)}
            disabled={eventCreating}
            className="flex-1 bg-purple-600 py-3 rounded-xl items-center"
          >
            {eventCreating ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text className="text-white font-bold text-xs">Yayınla</Text>
            )}
          </TouchableOpacity>
        </View>
      </Card>

      <Text className="text-base font-bold text-white mb-2">
        Yayınlanan Etkinlikler ({adminEvents.length})
      </Text>
      {adminEvents.map((ev) => (
        <View key={ev.id} className="bg-slate-800 p-3.5 rounded-xl mb-3 border border-slate-700">
          <View className="flex-row justify-between items-start mb-1.5">
            <Text className="text-white font-bold text-sm flex-1 mr-2">{ev.baslik}</Text>
            <Text className="text-purple-400 text-[10px] font-bold uppercase">{ev.durum}</Text>
          </View>
          <Text className="text-slate-400 text-xs mb-2">{ev.aciklama}</Text>
          <View className="flex-row gap-2 justify-end pt-1">
            <TouchableOpacity
              onPress={() => handleViewApplications(ev.id, ev.baslik)}
              className="bg-indigo-600/80 px-2.5 py-1.5 rounded-lg mr-auto"
            >
              <Text className="text-white text-[10px] font-bold">📋 Başvurular</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleDeleteEvent(ev.id, ev.baslik)}
              className="bg-rose-950/60 border border-rose-600/60 px-2 py-1.5 rounded-lg"
            >
              <Text className="text-rose-400 text-[10px] font-bold">Sil</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      <Modal visible={appModalVisible} transparent animationType="fade">
        <View className="flex-1 bg-black/75 justify-center px-4">
          <View className="bg-slate-800 p-5 rounded-2xl border border-slate-700 max-h-[80%]">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-white font-bold text-sm">{selectedEventTitle}</Text>
              <TouchableOpacity
                onPress={() => setAppModalVisible(false)}
                className="bg-slate-700 p-1.5 rounded-full"
              >
                <Text className="text-slate-300 font-bold text-xs">✕</Text>
              </TouchableOpacity>
            </View>
            {loadingApps ? (
              <ActivityIndicator color="#a855f7" className="py-6" />
            ) : selectedEventApps.length === 0 ? (
              <Text className="text-slate-400 text-xs text-center py-6">Başvuru yok.</Text>
            ) : (
              <ScrollView>
                {selectedEventApps.map((app, index) => (
                  <View
                    key={app.id}
                    className="bg-slate-900 p-3 rounded-xl mb-2 border border-slate-700"
                  >
                    <Text className="text-white font-bold text-xs">
                      #{index + 1} {app.user_name}
                    </Text>
                    <Text className="text-slate-400 text-[10px]">{app.user_email}</Text>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
