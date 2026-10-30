import React, { useState } from "react";
import { View, Text, Modal, Alert } from "react-native";
import { Input } from "../../components/Input";
import { Button } from "../../components/Button";
import { announcementService } from "../../services/announcementService";
import { useAuthStore } from "../../store/authStore";

interface CreateClubAnnouncementModalProps {
  visible: boolean;
  clubId: string;
  clubName: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CreateClubAnnouncementModal({
  visible,
  clubId,
  clubName,
  onClose,
  onSuccess,
}: CreateClubAnnouncementModalProps) {
  const profile = useAuthStore((state) => state.profile);
  const user = useAuthStore((state) => state.user);

  const [baslik, setBaslik] = useState("");
  const [icerik, setIcerik] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!baslik.trim() || !icerik.trim()) {
      Alert.alert("Hata", "Lütfen başlık ve içerik alanlarını doldurun.");
      return;
    }

    setLoading(true);
    try {
      const managerName =
        (profile as any)?.full_name ||
        (profile as any)?.ad_soyad ||
        user?.email ||
        "Kulüp Yöneticisi";

      await announcementService.createClubAnnouncement(
        clubId,
        clubName,
        baslik.trim(),
        icerik.trim(),
        user?.uid || "manager",
        managerName,
      );

      Alert.alert("Başarılı", "Kulüp duyurusu yayınlandı.");
      setBaslik("");
      setIcerik("");
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
          <Text className="text-xl font-bold text-white mb-4">{clubName} - Yeni Duyuru</Text>

          <Input
            label="Duyuru Başlığı"
            placeholder="Örn: Toplantı Hk."
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

          <View className="flex-row justify-end gap-3 mt-4">
            <Button title="İptal" onPress={onClose} className="bg-slate-700 flex-1" />
            <Button
              title="Yayınla"
              onPress={handleCreate}
              loading={loading}
              className="bg-indigo-600 flex-1"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
