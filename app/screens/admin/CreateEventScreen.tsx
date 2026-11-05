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
} from "react-native";
import { createEvent } from "../../services/eventService";
import { membershipService } from "../../services/membershipService";
import { useAuthStore } from "../../store/authStore";
import { Timestamp } from "firebase/firestore";
import {
  Club,
  EVENT_STATUS,
  Event,
  EventStatus,
  TARGET_AUDIENCE,
  TargetAudience,
} from "../../types";

interface CreateEventScreenProps {
  onBack?: () => void;
  navigation?: {
    goBack?: () => void;
  };
  route?: {
    params?: {
      clubId?: string;
    };
  };
}

const AUDIENCE_OPTIONS: { label: string; value: TargetAudience }[] = [
  { label: "Genel", value: TARGET_AUDIENCE.EVERYONE },
  { label: "Admin", value: TARGET_AUDIENCE.ALL_ADMINS },
  { label: "Yönetici", value: TARGET_AUDIENCE.ALL_MANAGERS },
];

export default function CreateEventScreen({ onBack, navigation, route }: CreateEventScreenProps) {
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);

  const [baslik, setBaslik] = useState("");
  const [aciklama, setAciklama] = useState("");
  const [konum, setKonum] = useState("");
  const [tarihGirdi, setTarihGirdi] = useState("");
  const [kontenjan, setKontenjan] = useState("");
  const [gorselUrl, setGorselUrl] = useState("");
  const [hedefKitle, setHedefKitle] = useState<TargetAudience>(TARGET_AUDIENCE.EVERYONE);
  const [status, setStatus] = useState<EventStatus>(EVENT_STATUS.PUBLISHED);

  const [clubId, setClubId] = useState<string>(route?.params?.clubId || "");
  const [clubAd, setClubAd] = useState<string>("");
  const [managedClubs, setManagedClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(false);

  const isAdmin = profile?.is_admin === true;

  useEffect(() => {
    const loadManagedClubs = async () => {
      if (!user) return;
      try {
        const clubsList = await membershipService.getManagedClubs(user.uid);
        setManagedClubs(clubsList);

        if (clubsList.length > 0 && !clubId && !isAdmin) {
          setClubId(clubsList[0].id);
        }
      } catch (error) {
        console.log("Kulüp yükleme hatası:", error);
      }
    };

    loadManagedClubs();
  }, [user, isAdmin]);

  useEffect(() => {
    const selected = managedClubs.find((club) => club.id === clubId);
    setClubAd(selected?.ad || "");
  }, [clubId, managedClubs]);

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

  const handleCreate = async () => {
    if (!baslik.trim() || !aciklama.trim() || !konum.trim() || !tarihGirdi.trim()) {
      Alert.alert("Hata", "Lütfen tüm zorunlu alanları doldurun.");
      return;
    }

    if (!isAdmin && !clubId && managedClubs.length > 0) {
      Alert.alert("Hata", "Lütfen etkinliğin ait olduğu kulübü seçin.");
      return;
    }

    const eventDateObj = convertToDateObject(tarihGirdi);
    if (!eventDateObj) {
      Alert.alert("Hatalı Tarih", "Örn format: 15.11.2026 14:30");
      return;
    }

    try {
      setLoading(true);
      const eventPayload: Omit<Event, "id"> = {
        baslik: baslik.trim(),
        aciklama: aciklama.trim(),
        konum: konum.trim(),
        tarih: Timestamp.fromDate(eventDateObj),
        kontenjan: kontenjan.trim() ? parseInt(kontenjan, 10) : null,
        gorselUrl: gorselUrl.trim(),
        hedef_kitle: hedefKitle,
        club_id: clubId || null,
        club_ad: clubAd || null,
        olusturan_id: user?.uid || "",
        status,
        katilimcilar: [],
        createdAt: Timestamp.now(),
      };

      await createEvent(eventPayload);
      Alert.alert("Başarılı", "Etkinlik başarıyla oluşturuldu.");
      handleGoBack();
    } catch (error) {
      console.error("Etkinlik oluşturma hatası:", error);
      Alert.alert("Hata", "Etkinlik oluşturulurken bir sorun oluştu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-slate-900 p-4" showsVerticalScrollIndicator={false}>
      <Text className="text-white font-bold text-xl mb-4 text-center">Yeni Etkinlik Oluştur</Text>

      {/* Hedef Kitle */}
      <View className="mb-3">
        <Text className="text-slate-300 text-xs font-semibold mb-1">Hedef Kitle</Text>
        <View className="flex-row gap-2">
          {AUDIENCE_OPTIONS.map((item) => (
            <TouchableOpacity
              key={item.value}
              onPress={() => setHedefKitle(item.value)}
              className={`flex-1 py-2 rounded-lg border items-center ${
                hedefKitle === item.value
                  ? "bg-indigo-600 border-indigo-500"
                  : "bg-slate-800 border-slate-700"
              }`}
            >
              <Text className="text-white text-xs font-semibold">{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Durum (Yayınla / Taslak) */}
      <View className="flex-row gap-2 mb-3">
        <TouchableOpacity
          onPress={() => setStatus(EVENT_STATUS.PUBLISHED)}
          className={`flex-1 py-2 rounded-lg border items-center ${
            status === EVENT_STATUS.PUBLISHED
              ? "bg-emerald-600 border-emerald-500"
              : "bg-slate-800 border-slate-700"
          }`}
        >
          <Text className="text-white text-xs font-semibold">Yayınla</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setStatus(EVENT_STATUS.DRAFT)}
          className={`flex-1 py-2 rounded-lg border items-center ${
            status === EVENT_STATUS.DRAFT
              ? "bg-amber-600 border-amber-500"
              : "bg-slate-800 border-slate-700"
          }`}
        >
          <Text className="text-white text-xs font-semibold">Taslak</Text>
        </TouchableOpacity>
      </View>

      {/* Başlık ve Konum */}
      <View className="mb-3">
        <Text className="text-slate-300 text-xs font-semibold mb-1">Etkinlik Başlığı *</Text>
        <TextInput
          value={baslik}
          onChangeText={setBaslik}
          placeholder="Etkinlik adını girin"
          placeholderTextColor="#64748b"
          className="bg-slate-800 text-white p-3 rounded-lg border border-slate-700 text-sm"
        />
      </View>

      <View className="mb-3">
        <Text className="text-slate-300 text-xs font-semibold mb-1">Konum / Mekan *</Text>
        <TextInput
          value={konum}
          onChangeText={setKonum}
          placeholder="Örn: Konferans Salonu"
          placeholderTextColor="#64748b"
          className="bg-slate-800 text-white p-3 rounded-lg border border-slate-700 text-sm"
        />
      </View>

      {/* Açıklama */}
      <View className="mb-3">
        <Text className="text-slate-300 text-xs font-semibold mb-1">Açıklama *</Text>
        <TextInput
          value={aciklama}
          onChangeText={setAciklama}
          placeholder="Etkinlik detayları..."
          placeholderTextColor="#64748b"
          className="bg-slate-800 text-white p-3 rounded-lg border border-slate-700 text-sm h-20"
          multiline
        />
      </View>

      {/* Tarih ve Kontenjan */}
      <View className="mb-3">
        <Text className="text-slate-300 text-xs font-semibold mb-1">
          Tarih ve Saat * (GG.AA.YYYY SS:DD)
        </Text>
        <TextInput
          value={tarihGirdi}
          onChangeText={setTarihGirdi}
          placeholder="15.11.2026 14:30"
          placeholderTextColor="#64748b"
          className="bg-slate-800 text-white p-3 rounded-lg border border-slate-700 text-sm"
        />
      </View>

      <View className="mb-3">
        <Text className="text-slate-300 text-xs font-semibold mb-1">Kontenjan (Opsiyonel)</Text>
        <TextInput
          value={kontenjan}
          onChangeText={setKontenjan}
          keyboardType="numeric"
          placeholder="Sınırsız için boş bırakın"
          placeholderTextColor="#64748b"
          className="bg-slate-800 text-white p-3 rounded-lg border border-slate-700 text-sm"
        />
      </View>

      {/* Görsel URL */}
      <View className="mb-6">
        <Text className="text-slate-300 text-xs font-semibold mb-1">
          Etkinlik Görseli URL (Opsiyonel)
        </Text>
        <TextInput
          value={gorselUrl}
          onChangeText={setGorselUrl}
          placeholder="https://ornek.com/afis.jpg"
          placeholderTextColor="#64748b"
          className="bg-slate-800 text-white p-3 rounded-lg border border-slate-700 text-sm"
        />
      </View>

      {/* Kaydet Butonu */}
      <TouchableOpacity
        onPress={handleCreate}
        disabled={loading}
        className="bg-indigo-600 p-4 rounded-xl items-center mb-8"
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white font-bold text-base">Etkinliği Kaydet</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}
