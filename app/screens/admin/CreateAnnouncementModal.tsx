import React, { useState } from "react";
import { View, Text, Modal, Alert, TouchableOpacity } from "react-native";
import { Input } from "../../components/Input";
import { Button } from "../../components/Button";
import { announcementService } from "../../services/announcementService";
import { useAuthStore } from "../../store/authStore";

interface CreateAnnouncementModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type HedefKitleOption = "tum_uyeler" | "tum_yoneticiler" | "tum_adminler";

export default function CreateAnnouncementModal({
  visible,
  onClose,
  onSuccess,
}: CreateAnnouncementModalProps) {
  const profile = useAuthStore((state) => state.profile);
  const user = useAuthStore((state) => state.user);

  const [baslik, setBaslik] = useState("");
  const [icerik, setIcerik] = useState("");
  const [hedefKitle, setHedefKitle] = useState<HedefKitleOption>("tum_uyeler");
  const [loading, setLoading] = useState(false);

  const handleCreateAnnouncement = async () => {
    if (!baslik.trim() || !icerik.trim()) {
      Alert.alert("Hata", "Lütfen başlık ve içerik alanlarını doldurun.");
      return;
    }

    setLoading(true);
    try {
      const yayinlayanAd =
        (profile as any)?.full_name ||
        (profile as any)?.ad_soyad ||
        user?.email ||
        "Sistem Yöneticisi";

      await announcementService.createSystemAnnouncement(
        baslik.trim(),
        icerik.trim(),
        user?.uid || "admin",
        yayinlayanAd,
        hedefKitle,
      );

      Alert.alert("Başarılı", "Duyuru başarıyla yayınlandı.");
      setBaslik("");
      setIcerik("");
      setHedefKitle("tum_uyeler");
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      Alert.alert("Hata", err.message || "Duyuru oluşturulamadı.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View className="flex-1 justify-center items-center bg-slate-950/80 px-4">
        <View className="bg-slate-900 border border-slate-800 w-full rounded-2xl p-5 shadow-xl">
          <Text className="text-xl font-bold text-white mb-4">Yeni Sistem Duyurusu</Text>

          <Input
            label="Duyuru Başlığı"
            placeholder="Örn: Güz Dönemi Etkinlik Takvimi"
            value={baslik}
            onChangeText={setBaslik}
          />

          <Input
            label="Duyuru İçeriği"
            placeholder="Duyuru detaylarını yazın..."
            value={icerik}
            onChangeText={setIcerik}
            multiline
          />

          <Text className="text-slate-300 text-xs font-semibold mb-2">Hedef Kitle</Text>
          <View className="flex-row gap-2 mb-4">
            <TouchableOpacity
              onPress={() => setHedefKitle("tum_uyeler")}
              className={`flex-1 py-2 px-1 rounded-xl border items-center justify-center ${
                hedefKitle === "tum_uyeler"
                  ? "bg-indigo-600 border-indigo-500"
                  : "bg-slate-800 border-slate-700"
              }`}
            >
              <Text className="text-white text-[11px] font-bold text-center">Tüm Üyeler</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setHedefKitle("tum_yoneticiler")}
              className={`flex-1 py-2 px-1 rounded-xl border items-center justify-center ${
                hedefKitle === "tum_yoneticiler"
                  ? "bg-indigo-600 border-indigo-500"
                  : "bg-slate-800 border-slate-700"
              }`}
            >
              <Text className="text-white text-[11px] font-bold text-center">Yöneticiler</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setHedefKitle("tum_adminler")}
              className={`flex-1 py-2 px-1 rounded-xl border items-center justify-center ${
                hedefKitle === "tum_adminler"
                  ? "bg-indigo-600 border-indigo-500"
                  : "bg-slate-800 border-slate-700"
              }`}
            >
              <Text className="text-white text-[11px] font-bold text-center">Tüm Adminler</Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row justify-end gap-3 mt-2">
            <Button title="İptal" onPress={onClose} className="bg-slate-700 flex-1" />
            <Button
              title="Yayınla"
              onPress={handleCreateAnnouncement}
              loading={loading}
              className="bg-indigo-600 flex-1"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
