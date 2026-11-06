import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  BackHandler,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { Timestamp } from "firebase/firestore";
import { getEventById, updateEvent } from "../services/eventService";
import { EVENT_STATUS, EventStatus, TARGET_AUDIENCE, TargetAudience } from "../types";

interface EditEventScreenProps {
  onBack?: () => void;
  navigation?: {
    goBack?: () => void;
  };
  route?: {
    params?: {
      eventId?: string;
    };
  };
}

const AUDIENCE_OPTIONS: { label: string; value: TargetAudience }[] = [
  { label: "Genel", value: TARGET_AUDIENCE.EVERYONE },
  { label: "Admin", value: TARGET_AUDIENCE.ALL_ADMINS },
  { label: "Yönetici", value: TARGET_AUDIENCE.ALL_MANAGERS },
];

export default function EditEventScreen({ onBack, navigation, route }: EditEventScreenProps) {
  const eventId = route?.params?.eventId;

  const [baslik, setBaslik] = useState("");
  const [aciklama, setAciklama] = useState("");
  const [konum, setKonum] = useState("");
  const [tarihGirdi, setTarihGirdi] = useState("");
  const [kontenjan, setKontenjan] = useState("");
  const [gorselUrl, setGorselUrl] = useState("");
  const [hedefKitle, setHedefKitle] = useState<TargetAudience>(TARGET_AUDIENCE.EVERYONE);
  const [status, setStatus] = useState<EventStatus>(EVENT_STATUS.PUBLISHED);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadEvent = async () => {
      if (!eventId) {
        Alert.alert("Hata", "Etkinlik bulunamadı.");
        setLoading(false);
        return;
      }

      try {
        const event = await getEventById(eventId);
        if (!event) {
          Alert.alert("Hata", "Etkinlik bulunamadı.");
          return;
        }

        setBaslik(event.baslik || "");
        setAciklama(event.aciklama || "");
        setKonum(event.konum || "");
        setGorselUrl(event.gorselUrl || "");
        setHedefKitle(event.hedef_kitle || TARGET_AUDIENCE.EVERYONE);
        setStatus(event.status || EVENT_STATUS.PUBLISHED);
        setKontenjan(
          event.kontenjan !== null && event.kontenjan !== undefined ? String(event.kontenjan) : "",
        );

        if (event.tarih) {
          const d =
            typeof event.tarih === "string"
              ? new Date(event.tarih.replace(" ", "T"))
              : typeof event.tarih === "object" && typeof event.tarih.seconds === "number"
                ? new Date(event.tarih.seconds * 1000)
                : null;

          if (d && !isNaN(d.getTime())) {
            const pad = (n: number) => n.toString().padStart(2, "0");
            setTarihGirdi(
              `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`,
            );
          }
        }
      } catch (error) {
        console.log("Etkinlik yükleme hatası:", error);
        Alert.alert("Hata", "Etkinlik bilgileri yüklenemedi.");
      } finally {
        setLoading(false);
      }
    };

    loadEvent();
  }, [eventId]);

  useEffect(() => {
    const backAction = () => {
      handleGoBack();
      return true;
    };
    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => backHandler.remove();
  }, []);

  const handleGoBack = () => {
    if (onBack) {
      onBack();
    } else if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  const convertToDateObject = (input: string): Date | null => {
    const trimmed = input.trim();
    if (!trimmed) return null;
    let d = new Date(trimmed.replace(" ", "T"));
    if (!isNaN(d.getTime())) return d;

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

  const handleUpdate = async () => {
    if (!eventId) return;

    if (!baslik.trim() || !aciklama.trim() || !konum.trim() || !tarihGirdi.trim()) {
      Alert.alert("Hata", "Lütfen tüm zorunlu alanları doldurun.");
      return;
    }

    const eventDateObj = convertToDateObject(tarihGirdi);
    if (!eventDateObj) {
      Alert.alert("Hatalı Tarih", "Örn format: 15.11.2026 14:30");
      return;
    }

    try {
      setSaving(true);
      await updateEvent(eventId, {
        baslik: baslik.trim(),
        aciklama: aciklama.trim(),
        konum: konum.trim(),
        tarih: Timestamp.fromDate(eventDateObj),
        kontenjan: kontenjan.trim() ? parseInt(kontenjan, 10) : null,
        gorselUrl: gorselUrl.trim(),
        hedef_kitle: hedefKitle,
        status,
      });

      Alert.alert("Başarılı", "Etkinlik başarıyla güncellendi.");
      handleGoBack();
    } catch (error) {
      console.error("Güncelleme hatası:", error);
      Alert.alert("Hata", "Etkinlik güncellenirken bir sorun oluştu.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-slate-900 justify-center items-center">
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <ScrollView
        className="flex-1 px-4 py-4"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Ortalanmış Başlık (Geri Dön Butonu Kaldırıldı) */}
        <View className="items-center mb-6 pt-2">
          <Text className="text-white font-bold text-lg">Etkinliği Düzenle</Text>
        </View>

        {/* Form İçerik Grubu */}
        <View className="space-y-5">
          {/* Hedef Kitle */}
          <View>
            <Text className="text-slate-300 text-xs font-semibold mb-2">Hedef Kitle</Text>
            <View className="flex-row gap-2">
              {AUDIENCE_OPTIONS.map((item) => (
                <TouchableOpacity
                  key={item.value}
                  onPress={() => setHedefKitle(item.value)}
                  className={`flex-1 py-3 px-3 rounded-xl border items-center ${
                    hedefKitle === item.value
                      ? "bg-indigo-600 border-indigo-500 shadow-md"
                      : "bg-slate-800 border-slate-700"
                  }`}
                >
                  <Text className="text-white text-xs font-semibold">{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Durum (Yayınla / Taslak) */}
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={() => setStatus(EVENT_STATUS.PUBLISHED)}
              className={`flex-1 py-3 rounded-xl border items-center ${
                status === EVENT_STATUS.PUBLISHED
                  ? "bg-emerald-600 border-emerald-500 shadow-md"
                  : "bg-slate-800 border-slate-700"
              }`}
            >
              <Text className="text-white text-xs font-semibold">Yayınla</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setStatus(EVENT_STATUS.DRAFT)}
              className={`flex-1 py-3 rounded-xl border items-center ${
                status === EVENT_STATUS.DRAFT
                  ? "bg-amber-600 border-amber-500 shadow-md"
                  : "bg-slate-800 border-slate-700"
              }`}
            >
              <Text className="text-white text-xs font-semibold">Taslak</Text>
            </TouchableOpacity>
          </View>

          {/* Başlık ve Konum */}
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Text className="text-slate-300 text-xs font-semibold mb-2">Başlık *</Text>
              <TextInput
                value={baslik}
                onChangeText={setBaslik}
                placeholder="Etkinlik adı"
                placeholderTextColor="#64748b"
                className="bg-slate-800 text-white px-3.5 py-3 rounded-xl border border-slate-700 text-sm"
              />
            </View>
            <View className="flex-1">
              <Text className="text-slate-300 text-xs font-semibold mb-2">Konum *</Text>
              <TextInput
                value={konum}
                onChangeText={setKonum}
                placeholder="Salon A"
                placeholderTextColor="#64748b"
                className="bg-slate-800 text-white px-3.5 py-3 rounded-xl border border-slate-700 text-sm"
              />
            </View>
          </View>

          {/* Açıklama */}
          <View>
            <Text className="text-slate-300 text-xs font-semibold mb-2">Açıklama *</Text>
            <TextInput
              value={aciklama}
              onChangeText={setAciklama}
              placeholder="Etkinlik detayları..."
              placeholderTextColor="#64748b"
              className="bg-slate-800 text-white px-3.5 py-3 rounded-xl border border-slate-700 text-sm h-28"
              multiline
              textAlignVertical="top"
            />
          </View>

          {/* Tarih ve Kontenjan */}
          <View className="flex-row gap-3">
            <View className="flex-[2]">
              <Text className="text-slate-300 text-xs font-semibold mb-2">
                Tarih (GG.AA.YYYY SS:DD) *
              </Text>
              <TextInput
                value={tarihGirdi}
                onChangeText={setTarihGirdi}
                placeholder="15.11.2026 14:30"
                placeholderTextColor="#64748b"
                className="bg-slate-800 text-white px-3.5 py-3 rounded-xl border border-slate-700 text-sm"
              />
            </View>
            <View className="flex-1">
              <Text className="text-slate-300 text-xs font-semibold mb-2">Kontenjan</Text>
              <TextInput
                value={kontenjan}
                onChangeText={setKontenjan}
                keyboardType="numeric"
                placeholder="Sınırsız"
                placeholderTextColor="#64748b"
                className="bg-slate-800 text-white px-3.5 py-3 rounded-xl border border-slate-700 text-sm"
              />
            </View>
          </View>

          {/* Görsel URL */}
          <View>
            <Text className="text-slate-300 text-xs font-semibold mb-2">
              Görsel URL (Opsiyonel)
            </Text>
            <TextInput
              value={gorselUrl}
              onChangeText={setGorselUrl}
              placeholder="https://..."
              placeholderTextColor="#64748b"
              className="bg-slate-800 text-white px-3.5 py-3 rounded-xl border border-slate-700 text-xs"
            />
          </View>
        </View>

        {/* Kaydet Butonu */}
        <TouchableOpacity
          onPress={handleUpdate}
          disabled={saving}
          className="bg-indigo-600 py-3.5 rounded-xl items-center mt-8 shadow-lg active:opacity-90"
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text className="text-white font-bold text-sm">Değişiklikleri Kaydet</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
