import React, { useState } from "react";
import { View, Text, Modal, Alert } from "react-native";
import { Input } from "../../components/Input";
import { Button } from "../../components/Button";
import { clubService } from "../../services/clubService";
import { useAuthStore } from "../../store/authStore";

interface CreateClubModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateClubModal({ visible, onClose, onSuccess }: CreateClubModalProps) {
  const user = useAuthStore((state) => state.user);

  const [clubName, setClubName] = useState("");
  const [clubDesc, setClubDesc] = useState("");
  const [clubImage, setClubImage] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreateClub = async () => {
    if (!clubName.trim()) {
      Alert.alert("Hata", "Lütfen bir kulüp adı girin.");
      return;
    }

    setCreating(true);
    try {
      // clubService içerisindeki metodun imza yapısına göre çağrılıyor
      await clubService.createClub(clubName.trim(), clubDesc.trim(), user?.uid || "admin");

      Alert.alert("Başarılı", "Yeni kulüp başarıyla oluşturuldu.");
      setClubName("");
      setClubDesc("");
      setClubImage("");
      onSuccess(); // Listeyi yenilemek veya modalı kapatmak için
      onClose();
    } catch (err: any) {
      Alert.alert("Hata", err.message || "Kulüp oluşturulamadı.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View className="flex-1 justify-center items-center bg-slate-950/80 px-4">
        <View className="bg-slate-900 border border-slate-800 w-full rounded-2xl p-5 shadow-xl">
          <Text className="text-xl font-bold text-white mb-4">Yeni Kulüp Oluştur</Text>

          <Input
            label="Kulüp Adı"
            placeholder="Örn: Yazılım ve Teknoloji Kulübü"
            value={clubName}
            onChangeText={setClubName}
          />

          <Input
            label="Açıklama"
            placeholder="Kulübün amacını ve faaliyetlerini kısaca anlatın..."
            value={clubDesc}
            onChangeText={setClubDesc}
            multiline
          />

          <Input
            label="Kapak Görseli URL (İsteğe bağlı)"
            placeholder="https://..."
            value={clubImage}
            onChangeText={setClubImage}
          />

          <View className="flex-row justify-end gap-3 mt-4">
            <Button title="İptal" onPress={onClose} className="bg-slate-700 flex-1" />
            <Button
              title="Oluştur"
              onPress={handleCreateClub}
              loading={creating}
              className="bg-indigo-600 flex-1"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
