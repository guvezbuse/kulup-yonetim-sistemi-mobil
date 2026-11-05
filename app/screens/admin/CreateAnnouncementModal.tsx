import React, { useState } from "react";
import { View, Text, Modal, Alert, TouchableOpacity } from "react-native";
import { Input } from "../../components/Input";
import { Button } from "../../components/Button";
import { announcementService } from "../../services/announcementService";
import { useAuthStore } from "../../store/authStore";
import { getErrorMessage } from "../../lib/errors";

interface CreateAnnouncementModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

import { TARGET_AUDIENCE } from "../../types";

type HedefKitleOption =
  | typeof TARGET_AUDIENCE.ALL_MEMBERS
  | typeof TARGET_AUDIENCE.ALL_MANAGERS
  | typeof TARGET_AUDIENCE.ALL_ADMINS;

export default function CreateAnnouncementModal({
  visible,
  onClose,
  onSuccess,
}: CreateAnnouncementModalProps) {
  const profile = useAuthStore((state) => state.profile);
  const user = useAuthStore((state) => state.user);

  const [baslik, setBaslik] = useState("");
  const [icerik, setIcerik] = useState("");
  const [hedefKitle, setHedefKitle] = useState<HedefKitleOption>(
    TARGET_AUDIENCE.ALL_MEMBERS,
  );
  const [loading, setLoading] = useState(false);

  const handleCreateAnnouncement = async () => {
    if (!baslik.trim() || !icerik.trim()) {
      Alert.alert("Hata", "Lütfen başlık ve içerik alanlarını doldurun.");
      return;
    }

    setLoading(true);
    try {
      const yayinlayanAd = profile?.ad
        ? `${profile.ad} ${profile.soyad || ""}`.trim()
        : user?.email || "Sistem Yöneticisi";

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
      setHedefKitle(TARGET_AUDIENCE.ALL_MEMBERS);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      Alert.alert("Hata", getErrorMessage(err, "Duyuru oluşturulamadı."));
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
              onPress={() => setHedefKitle(TARGET_AUDIENCE.ALL_MEMBERS)}
              className={`flex-1 py-2 px-1 rounded-xl border items-center justify-center ${
                hedefKitle === TARGET_AUDIENCE.ALL_MEMBERS
                  ? "bg-indigo-600 border-indigo-500"
                  : "bg-slate-800 border-slate-700"
              }`}
            >
              <Text className="text-white text-[11px] font-bold text-center">Tüm Üyeler</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setHedefKitle(TARGET_AUDIENCE.ALL_MANAGERS)}
              className={`flex-1 py-2 px-1 rounded-xl border items-center justify-center ${
                hedefKitle === TARGET_AUDIENCE.ALL_MANAGERS
                  ? "bg-indigo-600 border-indigo-500"
                  : "bg-slate-800 border-slate-700"
              }`}
            >
              <Text className="text-white text-[11px] font-bold text-center">Yöneticiler</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setHedefKitle(TARGET_AUDIENCE.ALL_ADMINS)}
              className={`flex-1 py-2 px-1 rounded-xl border items-center justify-center ${
                hedefKitle === TARGET_AUDIENCE.ALL_ADMINS
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
