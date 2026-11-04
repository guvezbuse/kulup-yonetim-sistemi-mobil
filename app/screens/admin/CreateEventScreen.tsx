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
import { useAuthStore } from "../../store/authStore";
import { Timestamp, collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";

interface CreateEventScreenProps {
  onBack?: () => void;
  navigation?: any;
  route?: any;
}

export default function CreateEventScreen({ onBack, navigation, route }: CreateEventScreenProps) {
  const { user } = useAuthStore();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [dateInput, setDateInput] = useState("");
  const [quota, setQuota] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [targetAudience, setTargetAudience] = useState<"all" | "admin" | "club_manager">("all");
  const [status, setStatus] = useState<"yayinlanan" | "taslak">("yayinlanan");

  const [isAdmin, setIsAdmin] = useState(false);
  const [clubId, setClubId] = useState<string>(route?.params?.clubId || "");
  const [managedClubs, setManagedClubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkRolesAndClubs = async () => {
      if (!user) return;
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.exists() ? userDoc.data() : null;
        const adminFlag = userData?.is_admin === true || userData?.role === "admin";
        setIsAdmin(!!adminFlag);

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

        if (clubsList.length > 0 && !clubId && !adminFlag) {
          setClubId(clubsList[0].id);
        }
      } catch (error) {
        console.log("Rol/Kulüp yükleme hatası:", error);
      }
    };

    checkRolesAndClubs();
  }, [user]);

  // Donanımsal Geri Tuşu Desteği
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
    if (!title.trim() || !description.trim() || !location.trim() || !dateInput.trim()) {
      Alert.alert("Hata", "Lütfen tüm zorunlu alanları doldurun.");
      return;
    }

    if (!isAdmin && !clubId && managedClubs.length > 0) {
      Alert.alert("Hata", "Lütfen etkinliğin ait olduğu kulübü seçin.");
      return;
    }

    const eventDateObj = convertToDateObject(dateInput);
    if (!eventDateObj) {
      Alert.alert("Hatalı Tarih", "Örn format: 15.11.2026 14:30");
      return;
    }

    try {
      setLoading(true);
      const eventPayload: Record<string, any> = {
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        date: Timestamp.fromDate(eventDateObj),
        targetAudience,
        imageUrl: imageUrl.trim(),
        clubId: clubId || null,
        status,
        createdBy: user?.uid || "",
        createdAt: Timestamp.now(),
        attendees: [],
        participants: [],
      };

      if (quota.trim()) {
        eventPayload.quota = parseInt(quota, 10);
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
      <Text className="text-white font-bold text-xl mb-4 text-center">Yeni Etkinlik Oluştur</Text>

      {/* Hedef Kitle */}
      <View className="mb-3">
        <Text className="text-slate-300 text-xs font-semibold mb-1">Hedef Kitle</Text>
        <View className="flex-row gap-2">
          {[
            { label: "Genel", value: "all" },
            { label: "Admin", value: "admin" },
            { label: "Yönetici", value: "club_manager" },
          ].map((item) => (
            <TouchableOpacity
              key={item.value}
              onPress={() => setTargetAudience(item.value as any)}
              className={`flex-1 py-2 rounded-lg border items-center ${
                targetAudience === item.value
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
          onPress={() => setStatus("yayinlanan")}
          className={`flex-1 py-2 rounded-lg border items-center ${
            status === "yayinlanan"
              ? "bg-emerald-600 border-emerald-500"
              : "bg-slate-800 border-slate-700"
          }`}
        >
          <Text className="text-white text-xs font-semibold">Yayınla</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setStatus("taslak")}
          className={`flex-1 py-2 rounded-lg border items-center ${
            status === "taslak" ? "bg-amber-600 border-amber-500" : "bg-slate-800 border-slate-700"
          }`}
        >
          <Text className="text-white text-xs font-semibold">Taslak</Text>
        </TouchableOpacity>
      </View>

      {/* Başlık ve Konum */}
      <View className="mb-3">
        <Text className="text-slate-300 text-xs font-semibold mb-1">Etkinlik Başlığı *</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Etkinlik adını girin"
          placeholderTextColor="#64748b"
          className="bg-slate-800 text-white p-3 rounded-lg border border-slate-700 text-sm"
        />
      </View>

      <View className="mb-3">
        <Text className="text-slate-300 text-xs font-semibold mb-1">Konum / Mekan *</Text>
        <TextInput
          value={location}
          onChangeText={setLocation}
          placeholder="Örn: Konferans Salonu"
          placeholderTextColor="#64748b"
          className="bg-slate-800 text-white p-3 rounded-lg border border-slate-700 text-sm"
        />
      </View>

      {/* Açıklama */}
      <View className="mb-3">
        <Text className="text-slate-300 text-xs font-semibold mb-1">Açıklama *</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
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
          value={dateInput}
          onChangeText={setDateInput}
          placeholder="15.11.2026 14:30"
          placeholderTextColor="#64748b"
          className="bg-slate-800 text-white p-3 rounded-lg border border-slate-700 text-sm"
        />
      </View>

      <View className="mb-3">
        <Text className="text-slate-300 text-xs font-semibold mb-1">Kontenjan (Opsiyonel)</Text>
        <TextInput
          value={quota}
          onChangeText={setQuota}
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
          value={imageUrl}
          onChangeText={setImageUrl}
          placeholder="https://ornek.com/afis.jpg"
          placeholderTextColor="#64748b"
          className="bg-slate-800 text-screen text-white p-3 rounded-lg border border-slate-700 text-sm"
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
