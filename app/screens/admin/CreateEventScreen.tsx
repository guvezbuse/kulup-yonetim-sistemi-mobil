import React, { useState } from "react";
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
import { Timestamp } from "firebase/firestore";

interface CreateEventScreenProps {
  onBack?: () => void;
  navigation?: any;
}

export default function CreateEventScreen({ onBack, navigation }: CreateEventScreenProps) {
  const { user } = useAuthStore();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [dateInput, setDateInput] = useState("");
  const [quota, setQuota] = useState("");
  const [targetAudience, setTargetAudience] = useState<"all" | "admin" | "club_manager">("all");
  const [loading, setLoading] = useState(false);

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
    if (!title.trim() || !description.trim() || !location.trim() || !dateInput.trim()) {
      Alert.alert("Hata", "Lütfen tüm zorunlu alanları doldurun.");
      return;
    }

    const eventDateObj = convertToDateObject(dateInput);
    if (!eventDateObj) {
      Alert.alert(
        "Hatalı Tarih Biçimi",
        "Lütfen tarihi aşağıdaki biçimlerden birinde girin:\n\n• 2026-11-15 14:30\n• 15.11.2026 14:30",
      );
      return;
    }

    try {
      setLoading(true);

      const eventPayload: Record<string, any> = {
        title: title.trim(),
        name: title.trim(),
        baslik: title.trim(),
        description: description.trim(),
        aciklama: description.trim(),
        location: location.trim(),
        konum: location.trim(),
        // String DEĞİL, Kesin Firestore Timestamp!
        eventDate: Timestamp.fromDate(eventDateObj),
        date: Timestamp.fromDate(eventDateObj),
        tarih: Timestamp.fromDate(eventDateObj),
        targetAudience,
        createdBy: user?.uid || "admin",
        createdAt: Timestamp.now(),
        participants: [],
        attendees: [],
      };

      if (quota.trim()) {
        eventPayload.quota = parseInt(quota, 10);
        eventPayload.kontenjan = parseInt(quota, 10);
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

      <Text className="text-slate-300 font-semibold mb-2">Hedef Kitle</Text>
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

      <Text className="text-slate-300 font-semibold mb-1">Etkinlik Başlığı *</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Etkinlik adını girin"
        placeholderTextColor="#64748b"
        className="bg-slate-800 text-white p-3 rounded-lg mb-4 border border-slate-700"
      />

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

      <Text className="text-slate-300 font-semibold mb-1">Konum / Mekan *</Text>
      <TextInput
        value={location}
        onChangeText={setLocation}
        placeholder="Örn: Kongre Merkezi Salon A"
        placeholderTextColor="#64748b"
        className="bg-slate-800 text-white p-3 rounded-lg mb-4 border border-slate-700"
      />

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

      <Text className="text-slate-300 font-semibold mb-1">Kontenjan (Opsiyonel)</Text>
      <TextInput
        value={quota}
        onChangeText={setQuota}
        keyboardType="numeric"
        placeholder="Sınırsız için boş bırakın"
        placeholderTextColor="#64748b"
        className="bg-slate-800 text-white p-3 rounded-lg mb-6 border border-slate-700"
      />

      <TouchableOpacity
        onPress={handleCreate}
        disabled={loading}
        className="bg-indigo-600 p-4 rounded-xl items-center mb-10"
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white font-bold text-base">Etkinliği Yayınla</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}
