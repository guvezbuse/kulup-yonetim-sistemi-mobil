import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { createEvent } from "../../services/eventService";
import { useAuthStore } from "../../store/authStore";
import { Timestamp, collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../lib/firebase";

interface CreateEventScreenProps {
  onBack?: () => void;
  navigation?: any;
  route?: any;
}

export default function CreateEventScreen({ onBack, navigation, route }: CreateEventScreenProps) {
  const { user } = useAuthStore();

  // Form State Tanımlamaları (İngilizce standart değişkenler ve Türkçe açıklamaları)
  const [title, setTitle] = useState(""); // Etkinlik başlığı (başlık)
  const [description, setDescription] = useState(""); // Etkinlik detaylı açıklaması (açıklama)
  const [location, setLocation] = useState(""); // Etkinlik konumu / mekanı (konum)
  const [dateInput, setDateInput] = useState(""); // Kullanıcının girdiği ham tarih string'i (tarih)
  const [quota, setQuota] = useState(""); // Maksimum katılımcı kontenjanı - opsiyonel (kontenjan)
  const [imageUrl, setImageUrl] = useState(""); // Etkinlik afişi / görseli için URL (görsel_url)
  const [targetAudience, setTargetAudience] = useState<"all" | "admin" | "club_manager">("all"); // Hedef kitle kategorisi (hedef_kitle)
  const [status, setStatus] = useState<"yayinlanan" | "taslak">("yayinlanan"); // Etkinlik durumu: taslak veya yayınlanan (durum)
  const [clubId, setClubId] = useState<string>(route?.params?.clubId || ""); // Bağlı olduğu kulübün ID'si (club_id)
  const [managedClubs, setManagedClubs] = useState<any[]>([]); // Yöneticisi olduğu kulüplerin listesi
  const [loading, setLoading] = useState(false); // Yüklenme durumu göstergesi

  // Yöneticinin yönettiği kulüpleri çekmek için
  useEffect(() => {
    const fetchManagedClubs = async () => {
      if (!user) return;
      try {
        const clubsRef = collection(db, "clubs");
        const q1 = query(clubsRef, where("yonetici_uid", "==", user.uid));
        const q2 = query(clubsRef, where("managerId", "==", user.uid));
        const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);

        const clubsMap = new Map();
        [...snap1.docs, ...snap2.docs].forEach((docSnap) => {
          clubsMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() });
        });

        const clubsList = Array.from(clubsMap.values());
        setManagedClubs(clubsList);

        if (clubsList.length > 0 && !clubId) {
          setClubId(clubsList[0].id);
        }
      } catch (error) {
        console.log("Kulüpler yüklenirken hata:", error);
      }
    };

    fetchManagedClubs();
  }, [user]);

  const handleGoBack = () => {
    if (onBack) {
      onBack();
    } else if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  // Tarih metnini güvenli bir Date nesnesine dönüştüren fonksiyon
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
    if (!title.trim() || !description.trim() || !location.trim() || !dateInput.trim()) {
      Alert.alert("Hata", "Lütfen tüm zorunlu alanları doldurun.");
      return;
    }

    if (!clubId) {
      Alert.alert("Hata", "Lütfen etkinliğin ait olduğu kulübü seçin.");
      return;
    }

    const eventDateObj = convertToDateObject(dateInput);
    if (!eventDateObj) {
      Alert.alert(
        "Hatalı Tarih Biçimi",
        "Lütfen tarihi aşağıdaki biçimlerden birinde girin:\n\n2026-11-15 14:30\n15.11.2026 14:30",
      );
      return;
    }

    try {
      setLoading(true);

      // Etkinlik veri modeli (Event Payload)
      const eventPayload: Record<string, any> = {
        title: title.trim(), // Etkinlik Başlığı (başlık)
        description: description.trim(), // Etkinlik Açıklaması (açıklama)
        location: location.trim(), // Etkinlik Konumu / Mekanı (konum)
        date: Timestamp.fromDate(eventDateObj), // Etkinlik Tarihi ve Saati - Firestore Timestamp (tarih)
        targetAudience: targetAudience, // Etkinliğin Hedef Kitlesi
        imageUrl: imageUrl.trim(), // Etkinlik Afişi / Görsel Bağlantısı (görsel_url)
        clubId: clubId, // Bağlı Olduğu Kulüp ID'si (club_id)
        status: status, // Etkinlik Durumu: "yayinlanan" veya "taslak" (durum)
        createdBy: user?.uid || "", // Etkinliği Oluşturan Yöneticinin ID'si (oluşturan_id)
        createdAt: Timestamp.now(), // Kaydın Oluşturulma Zamanı (oluşturulma_tarihi)
        attendees: [], // Katılımcı RSVP listesi (attendees)
        participants: [], // Alternatif katılımcı dizisi
      };

      if (quota.trim()) {
        eventPayload.quota = parseInt(quota, 10); // Kontenjan (kontenjan)
      }

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
      <TouchableOpacity onPress={handleGoBack} className="mb-4">
        <Text className="text-indigo-400 font-semibold">← Geri Dön</Text>
      </TouchableOpacity>

      <Text className="text-2xl font-bold text-white mb-6">Yeni Etkinlik Oluştur</Text>

      {/* Hedef Kitle Seçim Butonları */}
      <Text className="text-slate-300 font-semibold mb-2">Hedef Kitle (Target Audience)</Text>
      <View className="flex-row gap-2 mb-4">
        {[
          { label: "Üniversite Geneli", value: "all" },
          { label: "Adminler", value: "admin" },
          { label: "Kulüp Yöneticileri", value: "club_manager" },
        ].map((item) => (
          <TouchableOpacity
            key={item.value}
            onPress={() => setTargetAudience(item.value as any)}
            className={`flex-1 p-3 rounded-lg border ${
              targetAudience === item.value
                ? "bg-indigo-600 border-indigo-500"
                : "bg-slate-800 border-slate-700"
            }`}
          >
            <Text className="text-white text-xs font-semibold text-center">{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Kulüp Seçimi */}
      <Text className="text-slate-300 font-semibold mb-2">Etkinlik Düzenlenen Kulüp *</Text>
      <View className="flex-row flex-wrap gap-2 mb-4">
        {managedClubs.map((club) => (
          <TouchableOpacity
            key={club.id}
            onPress={() => setClubId(club.id)}
            className={`p-3 rounded-lg border ${
              clubId === club.id
                ? "bg-indigo-600 border-indigo-500"
                : "bg-slate-800 border-slate-700"
            }`}
          >
            <Text className="text-white text-xs font-semibold">{club.ad || club.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Etkinlik Durumu Seçimi */}
      <Text className="text-slate-300 font-semibold mb-2">Etkinlik Durumu (Status)</Text>
      <View className="flex-row gap-2 mb-4">
        {[
          { label: "Yayınla", value: "yayinlanan" },
          { label: "Taslak Olarak Kaydet", value: "taslak" },
        ].map((item) => (
          <TouchableOpacity
            key={item.value}
            onPress={() => setStatus(item.value as any)}
            className={`flex-1 p-3 rounded-lg border ${
              status === item.value
                ? "bg-emerald-600 border-emerald-500"
                : "bg-slate-800 border-slate-700"
            }`}
          >
            <Text className="text-white text-xs font-semibold text-center">{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Etkinlik Başlığı Girdisi */}
      <Text className="text-slate-300 font-semibold mb-1">Etkinlik Başlığı *</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Etkinlik adını girin"
        placeholderTextColor="#64748b"
        className="bg-slate-800 text-white p-3 rounded-lg mb-4 border border-slate-700"
      />

      {/* Etkinlik Açıklaması Girdisi */}
      <Text className="text-slate-300 font-semibold mb-1">Açıklama *</Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
        placeholder="Etkinlik detaylarını girin"
        placeholderTextColor="#64748b"
        className="bg-slate-800 text-white p-3 rounded-lg mb-4 border border-slate-700 h-24"
      />

      {/* Konum / Mekan Girdisi */}
      <Text className="text-slate-300 font-semibold mb-1">Konum / Mekan *</Text>
      <TextInput
        value={location}
        onChangeText={setLocation}
        placeholder="Örn: Kongre Merkezi Salon A"
        placeholderTextColor="#64748b"
        className="bg-slate-800 text-white p-3 rounded-lg mb-4 border border-slate-700"
      />

      {/* Tarih ve Saat Girdisi */}
      <Text className="text-slate-300 font-semibold mb-1">
        Tarih ve Saat * (Örn: 2026-11-15 14:30 veya 15.11.2026 14:30)
      </Text>
      <TextInput
        value={dateInput}
        onChangeText={setDateInput}
        placeholder="2026-11-15 14:30"
        placeholderTextColor="#64748b"
        className="bg-slate-800 text-white p-3 rounded-lg mb-4 border border-slate-700"
      />

      {/* Görsel / Fotoğraf URL Girdisi (Opsiyonel) */}
      <Text className="text-slate-300 font-semibold mb-1">Etkinlik Görseli URL (Opsiyonel)</Text>
      <TextInput
        value={imageUrl}
        onChangeText={setImageUrl}
        placeholder="https://ornek.com/afis.jpg"
        placeholderTextColor="#64748b"
        className="bg-slate-800 text-white p-3 rounded-lg mb-4 border border-slate-700"
      />

      {/* Kontenjan Girdisi (Opsiyonel) */}
      <Text className="text-slate-300 font-semibold mb-1">Kontenjan (Opsiyonel)</Text>
      <TextInput
        value={quota}
        onChangeText={setQuota}
        keyboardType="numeric"
        placeholder="Sınırsız için boş bırakın"
        placeholderTextColor="#64748b"
        className="bg-slate-800 text-white p-3 rounded-lg mb-6 border border-slate-700"
      />

      {/* Kaydet / Yayınla Butonu */}
      <TouchableOpacity
        onPress={handleCreate}
        disabled={loading}
        className="bg-indigo-600 p-4 rounded-xl items-center mb-10"
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
