import React, { useState, useEffect } from "react";
import { View, Text, Modal, Alert } from "react-native";
import { Input } from "../../components/Input";
import { Button } from "../../components/Button";
import { announcementService, AnnouncementItem } from "../../services/announcementService";

interface EditAnnouncementModalProps {
  visible: boolean;
  announcement: AnnouncementItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditAnnouncementModal({
  visible,
  announcement,
  onClose,
  onSuccess,
}: EditAnnouncementModalProps) {
  const [baslik, setBaslik] = useState("");
  const [icerik, setIcerik] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (announcement) {
      setBaslik(announcement.baslik);
      setIcerik(announcement.icerik);
    }
  }, [announcement]);

  const handleUpdate = async () => {
    if (!announcement) return;
    if (!baslik.trim() || !icerik.trim()) {
      Alert.alert("Hata", "Lütfen başlık ve içerik alanlarını doldurun.");
      return;
    }

    setLoading(true);
    try {
      await announcementService.updateAnnouncement(announcement.id, baslik.trim(), icerik.trim());

      Alert.alert("Başarılı", "Duyuru güncellendi.");
      onSuccess();
      onClose();
    } catch (err: any) {
      Alert.alert("Hata", err.message || "Duyuru güncellenemedi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View className="flex-1 justify-center items-center bg-slate-950/80 px-4">
        <View className="bg-slate-900 border border-slate-800 w-full rounded-2xl p-5 shadow-xl">
          <Text className="text-xl font-bold text-white mb-4">Duyuruyu Düzenle</Text>

          <Input label="Duyuru Başlığı" value={baslik} onChangeText={setBaslik} />

          <Input label="Duyuru İçeriği" value={icerik} onChangeText={setIcerik} multiline />

          <View className="flex-row justify-end gap-3 mt-4">
            <Button title="İptal" onPress={onClose} className="bg-slate-700 flex-1" />
            <Button
              title="Kaydet"
              onPress={handleUpdate}
              loading={loading}
              className="bg-indigo-600 flex-1"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
