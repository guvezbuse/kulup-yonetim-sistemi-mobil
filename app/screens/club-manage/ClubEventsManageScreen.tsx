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
import { Input } from "../../components/Input";
import { Card } from "../../components/Card";
import {
  createEvent,
  deleteEvent,
  getClubEvents,
  getEventApplications,
} from "../../services/eventService";
import { notificationService } from "../../services/notificationService";
import { useAuthStore } from "../../store/authStore";
import { getErrorMessage } from "../../lib/errors";
import { Timestamp } from "firebase/firestore";
import { EVENT_STATUS, Event, EventApplication, TARGET_AUDIENCE } from "../../types";

interface Props {
  clubId: string;
  clubName: string;
  onBack: () => void;
  // Sistem yöneticisi (kulübün yöneticisi değil) için salt görüntüleme modu.
  // Şartname: etkinlik oluşturma/yayınlama Admin ✘ / Yönetici ✔
  isAdminView?: boolean;
}

export default function ClubEventsManageScreen({
  clubId,
  clubName,
  onBack,
  isAdminView = false,
}: Props) {
  const user = useAuthStore((state) => state.user);

  const [events, setEvents] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  const [eventTitle, setEventTitle] = useState("");
  const [eventDesc, setEventDesc] = useState("");
  const [eventDateTime, setEventDateTime] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [eventQuota, setEventQuota] = useState("");
  const [eventCreating, setEventCreating] = useState(false);

  const [selectedEventApps, setSelectedEventApps] = useState<EventApplication[]>([]);
  const [appModalVisible, setAppModalVisible] = useState(false);
  const [selectedEventTitle, setSelectedEventTitle] = useState("");
  const [loadingApps, setLoadingApps] = useState(false);

  // Sadece Rakam ve Tarih Karakterlerine (0-9 . - : Boşluk) İzin Verir
  const handleDateChange = (text: string) => {
    const cleaned = text.replace(/[^0-9.\-:\s]/g, "");
    setEventDateTime(cleaned);
  };

  const parseInputToDate = (input: string): Date | null => {
    const trimmed = input.trim();
    if (!trimmed) return null;

    // 1. YYYY-MM-DD HH:mm
    let d = new Date(trimmed.replace(" ", "T"));
    if (!isNaN(d.getTime())) return d;

    // 2. DD.MM.YYYY HH:mm
    const parts = trimmed.split(/[\s.:/-]+/);
    if (parts.length >= 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      const hour = parts[3] ? parseInt(parts[3], 10) : 0;
      const minute = parts[4] ? parseInt(parts[4], 10) : 0;

      d = new Date(year, month, day, hour, minute);
      if (!isNaN(d.getTime())) return d;
    }
    return null;
  };

  const loadEvents = async () => {
    try {
      setLoadingEvents(true);
      const eventData = await getClubEvents(clubId);
      setEvents(eventData);
    } catch (e) {
      console.log("Etkinlik yükleme hatası:", e);
    } finally {
      setLoadingEvents(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [clubId]);

  const handleCreateEvent = async (asDraft: boolean = false) => {
    if (!eventTitle.trim() || !eventDesc.trim() || !eventLocation.trim() || !eventDateTime.trim()) {
      Alert.alert("Hata", "Lütfen gerekli tüm alanları doldurun.");
      return;
    }

    const eventDateObj = parseInputToDate(eventDateTime);
    if (!eventDateObj) {
      Alert.alert(
        "Geçersiz Tarih",
        "Lütfen tarihi rakamlarla doğru biçimde girin:\n\nÖrn: 2026-11-15 14:00 veya 15.11.2026 14:00",
      );
      return;
    }

    setEventCreating(true);
    try {
      const payload: Omit<Event, "id"> = {
        club_id: clubId,
        club_ad: clubName,
        baslik: eventTitle.trim(),
        aciklama: eventDesc.trim(),
        konum: eventLocation.trim(),
        tarih: Timestamp.fromDate(eventDateObj),
        kontenjan: eventQuota.trim() ? parseInt(eventQuota, 10) : null,
        gorselUrl: "",
        hedef_kitle: TARGET_AUDIENCE.CLUB_MEMBERS,
        olusturan_id: user?.uid || "",
        status: asDraft ? EVENT_STATUS.DRAFT : EVENT_STATUS.PUBLISHED,
        katilimcilar: [],
        createdAt: Timestamp.now(),
      };

      const createdEventId = await createEvent(payload);

      if (!asDraft) {
        try {
          await notificationService.notifyEventPublished(
            clubId,
            clubName,
            createdEventId,
            eventTitle,
            eventDateTime,
          );
        } catch (pushErr) {
          console.log("Etkinlik bildirimi gönderilemedi:", pushErr);
        }
      }

      Alert.alert("Başarılı", asDraft ? "Etkinlik taslak kaydedildi." : "Etkinlik yayınlandı!");
      setEventTitle("");
      setEventDesc("");
      setEventDateTime("");
      setEventLocation("");
      setEventQuota("");
      loadEvents();
    } catch (err) {
      Alert.alert("Hata", getErrorMessage(err, "Etkinlik oluşturulamadı."));
    } finally {
      setEventCreating(false);
    }
  };

  const handleDeleteEvent = (eventId: string, title: string) => {
    Alert.alert("Etkinliği Sil", `"${title}" silinecek. Emin misiniz?`, [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteEvent(eventId);
            loadEvents();
          } catch (err) {
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
      const data = await getEventApplications(eventId);
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

      <Text className="text-2xl font-bold text-white mb-4">🗓️ Etkinlik Yönetimi</Text>

      {isAdminView && (
        <View className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mb-4">
          <Text className="text-amber-400 text-[11px] font-bold">🛡️ Salt Görüntüleme</Text>
          <Text className="text-slate-400 text-[11px] mt-1 leading-4">
            Sistem yöneticisi olarak kulüp etkinliği oluşturamaz veya silemezsiniz. Mevcut
            etkinlikleri ve başvuruları inceleyebilirsiniz.
          </Text>
        </View>
      )}

      {!isAdminView && (
        <Card className="mb-6 border border-purple-500/40">
          <Input
            label="Etkinlik Başlığı"
            placeholder="Örn: Yapay Zeka Atölyesi"
            value={eventTitle}
            onChangeText={setEventTitle}
          />

          {/* Klavye Rakam Modu Zorlaması */}
          <Input
            label="Tarih ve Saat (Sadece Rakam)"
            placeholder="Örn: 2026-11-15 14:00 veya 15.11.2026 14:00"
            value={eventDateTime}
            onChangeText={handleDateChange}
            keyboardType="numbers-and-punctuation"
          />

          <Input
            label="Konum / Salon"
            placeholder="Örn: D-Block Konferans Salonu"
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
            placeholder="Etkinlik akışı..."
            value={eventDesc}
            onChangeText={setEventDesc}
            multiline
          />

          <View className="flex-row gap-2 mt-2">
            <TouchableOpacity
              onPress={() => handleCreateEvent(true)}
              disabled={eventCreating}
              className="flex-1 bg-slate-800 border border-slate-700 py-3 rounded-xl items-center"
            >
              <Text className="text-slate-300 font-bold text-xs">Taslak Kaydet</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleCreateEvent(false)}
              disabled={eventCreating}
              className="flex-1 bg-purple-600 py-3 rounded-xl items-center"
            >
              {eventCreating ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text className="text-white font-bold text-xs">Etkinliği Yayınla</Text>
              )}
            </TouchableOpacity>
          </View>
        </Card>
      )}

      <Text className="text-base font-bold text-white mb-2">
        Kulüp Etkinlikleri ({events.length})
      </Text>
      {loadingEvents ? (
        <ActivityIndicator color="#8b5cf6" />
      ) : (
        events.map((ev, idx) => {
          const title = ev.baslik || "İsimsiz Etkinlik";
          const desc = ev.aciklama || "";
          const status = ev.status;

          return (
            <View
              key={ev.id || idx.toString()}
              className="bg-slate-800 p-3.5 rounded-xl mb-3 border border-slate-700"
            >
              <View className="flex-row justify-between items-start mb-1.5">
                <Text className="text-white font-bold text-sm flex-1 mr-2">{title}</Text>
                <Text className="text-purple-400 text-[10px] font-bold uppercase">{status}</Text>
              </View>
              {!!desc && <Text className="text-slate-400 text-xs mb-2">{desc}</Text>}
              <View className="flex-row gap-1.5 justify-end items-center pt-1 border-t border-slate-700/50">
                <TouchableOpacity
                  onPress={() => handleViewApplications(ev.id, title)}
                  className="bg-indigo-600/80 px-2.5 py-1.5 rounded-lg mr-auto"
                >
                  <Text className="text-white text-[10px] font-bold">📋 Başvuruları Gör</Text>
                </TouchableOpacity>
                {!isAdminView && (
                  <TouchableOpacity
                    onPress={() => handleDeleteEvent(ev.id, title)}
                    className="bg-rose-950/60 border border-rose-600/60 px-2 py-1.5 rounded-lg"
                  >
                    <Text className="text-rose-400 text-[10px] font-bold">Sil</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })
      )}

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
              <ActivityIndicator color="#6366f1" className="py-6" />
            ) : selectedEventApps.length === 0 ? (
              <Text className="text-slate-400 text-xs text-center py-6">Başvuru yok.</Text>
            ) : (
              <ScrollView>
                {selectedEventApps.map((app, index) => (
                  <View
                    key={app.user_id}
                    className="bg-slate-900 p-3 rounded-xl mb-2 border border-slate-700"
                  >
                    <Text className="text-white font-bold text-xs">
                      #{index + 1} {app.ad_soyad || "Kullanıcı"}
                    </Text>
                    <Text className="text-slate-400 text-[10px]">{app.email}</Text>
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
