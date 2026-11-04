import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  BackHandler,
} from "react-native";
import {
  doc,
  getDoc,
  updateDoc,
  Timestamp,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuthStore } from "../store/authStore";

interface EditEventScreenProps {
  onBack?: () => void;
  navigation?: any;
  route?: any;
}

export default function EditEventScreen({ onBack, navigation, route }: EditEventScreenProps) {
  const { user } = useAuthStore();
  const eventId = route?.params?.eventId;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [dateInput, setDateInput] = useState("");
  const [quota, setQuota] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [targetAudience, setTargetAudience] = useState<"all" | "admin" | "club_manager">("all");
  const [status, setStatus] = useState<"yayinlanan" | "taslak">("yayinlanan");

  const [isAdmin, setIsAdmin] = useState(false);
  const [clubId, setClubId] = useState<string>("");
  const [managedClubs, setManagedClubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Kullanıcı rollerini, kulüpleri ve düzenlenecek etkinliğin verilerini çek
  useEffect(() => {
    const initData = async () => {
      if (!user) return;
      try {
        // 1. Admin kontrolü
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.exists() ? userDoc.data() : null;
        const adminFlag = userData?.is_admin === true || userData?.role === "admin";
        setIsAdmin(!!adminFlag);

        // 2. Yönetilen kulüpleri çek
        const clubsRef = collection(db, "clubs");
        const q1 = query(clubsRef, where("yonetici_uid", "==", user.uid));
        const q2 = query(clubsRef, where("managerId", "==", user.uid));
        const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);

        const clubsMap = new Map();
        [...snap1.docs, ...snap2.docs].forEach((docSnap) => {
          clubsMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() });
        });
        setManagedClubs(Array.from(clubsMap.values()));

        // 3. Etkinlik verisini çek ve form state'lerini doldur
        if (eventId) {
          const eventDocRef = doc(db, "events", eventId);
          const eventSnap = await getDoc(eventDocRef);
          if (eventSnap.exists()) {
            const data = eventSnap.data();
            setTitle(data.title || "");
            setDescription(data.description || "");
            setLocation(data.location || "");
            setImageUrl(data.imageUrl || "");
            setTargetAudience(data.targetAudience || "all");
            setStatus(data.status || "yayinlanan");
            setClubId(data.clubId || "");
            setQuota(data.quota ? data.quota.toString() : "");

            // Timestamp'i okunabilir string tarih formatına çevir
            if (data.date && data.date.seconds) {
              const d = new Date(data.date.seconds * 1000);
              const pad = (n: number) => n.toString().padStart(2, "0");
              setDateInput(
                `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`,
              );
            }
          }
        }
      } catch (error) {
        console.log("Veri yükleme hatası:", error);
        Alert.alert("Hata", "Etkinlik bilgileri yüklenemedi.");
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, [user, eventId]);

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

  const handleUpdate = async () => {
    if (!title.trim() || !description.trim() || !location.trim() || !dateInput.trim()) {
      Alert.alert("Hata", "Lütfen tüm zorunlu alanları doldurun.");
      return;
    }

    const eventDateObj = convertToDateObject(dateInput);
    if (!eventDateObj) {
      Alert.alert("Hatalı Tarih", "Örn format: 15.11.2026 14:30");
      return;
    }

    try {
      setSaving(true);
      const eventRef = doc(db, "events", eventId);

      const updatePayload: Record<string, any> = {
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        date: Timestamp.fromDate(eventDateObj),
        targetAudience,
        imageUrl: imageUrl.trim(),
        status,
        clubId: clubId || null,
      };

      if (quota.trim()) {
        updatePayload.quota = parseInt(quota, 10);
      } else {
        updatePayload.quota = null;
      }

      await updateDoc(eventRef, updatePayload);
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
    <View className="flex-1 bg-slate-900 p-3 justify-between">
      {/* Üst Başlık ve Geri Dön */}
      <View className="flex-row justify-between items-center mb-1">
        <TouchableOpacity onPress={handleGoBack}>
          <Text className="text-indigo-400 font-semibold text-xs">← Geri Dön</Text>
        </TouchableOpacity>
        <Text className="text-white font-bold text-base">Etkinliği Düzenle</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Kompakt Form Alanları */}
      <View className="space-y-1.5">
        {/* Hedef Kitle */}
        <View>
          <Text className="text-slate-300 text-[11px] font-semibold mb-0.5">Hedef Kitle</Text>
          <View className="flex-row gap-1">
            {[
              { label: "Genel", value: "all" },
              { label: "Admin", value: "admin" },
              { label: "Yönetici", value: "club_manager" },
            ].map((item) => (
              <TouchableOpacity
                key={item.value}
                onPress={() => setTargetAudience(item.value as any)}
                className={`flex-1 py-1 px-2 rounded border items-center ${
                  targetAudience === item.value
                    ? "bg-indigo-600 border-indigo-500"
                    : "bg-slate-800 border-slate-700"
                }`}
              >
                <Text className="text-white text-[11px] font-semibold">{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Durum (Yayınla / Taslak) */}
        <View className="flex-row gap-1.5">
          <TouchableOpacity
            onPress={() => setStatus("yayinlanan")}
            className={`flex-1 py-1 rounded border items-center ${
              status === "yayinlanan"
                ? "bg-emerald-600 border-emerald-500"
                : "bg-slate-800 border-slate-700"
            }`}
          >
            <Text className="text-white text-[11px] font-semibold">Yayınla</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setStatus("taslak")}
            className={`flex-1 py-1 rounded border items-center ${
              status === "taslak"
                ? "bg-amber-600 border-amber-500"
                : "bg-slate-800 border-slate-700"
            }`}
          >
            <Text className="text-white text-[11px] font-semibold">Taslak</Text>
          </TouchableOpacity>
        </View>

        {/* Başlık ve Konum Yan Yana */}
        <View className="flex-row gap-1.5">
          <View className="flex-1">
            <Text className="text-slate-300 text-[10px] font-semibold mb-0.5">Başlık *</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Etkinlik adı"
              placeholderTextColor="#64748b"
              className="bg-slate-800 text-white px-2 py-1 rounded border border-slate-700 text-xs"
            />
          </View>
          <View className="flex-1">
            <Text className="text-slate-300 text-[10px] font-semibold mb-0.5">Konum *</Text>
            <TextInput
              value={location}
              onChangeText={setLocation}
              placeholder="Salon A"
              placeholderTextColor="#64748b"
              className="bg-slate-800 text-white px-2 py-1 rounded border border-slate-700 text-xs"
            />
          </View>
        </View>

        {/* Açıklama */}
        <View>
          <Text className="text-slate-300 text-[10px] font-semibold mb-0.5">Açıklama *</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Etkinlik detayları..."
            placeholderTextColor="#64748b"
            className="bg-slate-800 text-white px-2 py-1 rounded border border-slate-700 text-xs h-10"
            multiline
          />
        </View>

        {/* Tarih ve Kontenjan Yan Yana */}
        <View className="flex-row gap-1.5">
          <View className="flex-[2]">
            <Text className="text-slate-300 text-[10px] font-semibold mb-0.5">
              Tarih (GG.AA.YYYY SS:DD) *
            </Text>
            <TextInput
              value={dateInput}
              onChangeText={setDateInput}
              placeholder="15.11.2026 14:30"
              placeholderTextColor="#64748b"
              className="bg-slate-800 text-white px-2 py-1 rounded border border-slate-700 text-xs"
            />
          </View>
          <View className="flex-1">
            <Text className="text-slate-300 text-[10px] font-semibold mb-0.5">Kontenjan</Text>
            <TextInput
              value={quota}
              onChangeText={setQuota}
              keyboardType="numeric"
              placeholder="Sınırsız"
              placeholderTextColor="#64748b"
              className="bg-slate-800 text-white px-2 py-1 rounded border border-slate-700 text-xs"
            />
          </View>
        </View>

        {/* Görsel URL */}
        <View>
          <Text className="text-slate-300 text-[10px] font-semibold mb-0.5">
            Görsel URL (Opsiyonel)
          </Text>
          <TextInput
            value={imageUrl}
            onChangeText={setImageUrl}
            placeholder="https://..."
            placeholderTextColor="#64748b"
            className="bg-slate-800 text-white px-2 py-1 rounded border border-slate-700 text-xs"
          />
        </View>
      </View>

      {/* Güncelle Butonu */}
      <TouchableOpacity
        onPress={handleUpdate}
        disabled={saving}
        className="bg-indigo-600 py-2 rounded-lg items-center mt-1"
      >
        {saving ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text className="text-white font-bold text-xs">Değişiklikleri Kaydet</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
