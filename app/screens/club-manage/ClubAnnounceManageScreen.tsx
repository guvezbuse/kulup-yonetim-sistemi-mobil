import React, { useState } from "react";
import { View, Text, TouchableOpacity, Alert, ScrollView } from "react-native";
import { Card } from "../../components/Card";
import { Input } from "../../components/Input";
import { Button } from "../../components/Button";
import { announcementService } from "../../services/announcementService";
import { notificationService } from "../../services/notificationService";
import { useAuthStore } from "../../store/authStore";

interface Props {
  clubId: string;
  clubName: string;
  onBack: () => void;
}

export default function ClubAnnounceManageScreen({ clubId, clubName, onBack }: Props) {
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);

  const [clubAnnTitle, setClubAnnTitle] = useState("");
  const [clubAnnContent, setClubAnnContent] = useState("");
  const [annPublishing, setAnnPublishing] = useState(false);

  const handlePublishClubAnnouncement = async () => {
    if (!clubAnnTitle.trim() || !clubAnnContent.trim()) {
      Alert.alert("Hata", "Lütfen duyuru başlığı ve içeriği girin.");
      return;
    }

    setAnnPublishing(true);
    try {
      const managerName = profile?.name
        ? `${profile.name} ${profile.surname || ""}`.trim()
        : "Kulüp Yöneticisi";

      await announcementService.createClubAnnouncement(
        clubId,
        clubName,
        clubAnnTitle,
        clubAnnContent,
        user?.uid || "manager",
        managerName,
      );

      try {
        await notificationService.notifyAnnouncement(
          "kulup",
          "kulup_uyeleri",
          clubId,
          `${clubName}: ${clubAnnTitle}`,
          clubAnnContent,
        );
      } catch (pushErr) {
        console.log("Duyuru bildirimi hatası:", pushErr);
      }

      Alert.alert("Başarılı", "Kulüp duyurusu yayınlandı.");
      setClubAnnTitle("");
      setClubAnnContent("");
      onBack();
    } catch (err: any) {
      Alert.alert("Hata", err.message || "Duyuru yayınlanamadı.");
    } finally {
      setAnnPublishing(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-slate-900 px-4 pt-4" showsVerticalScrollIndicator={false}>
      <TouchableOpacity onPress={onBack} className="mb-4">
        <Text className="text-indigo-400 font-semibold">← Menüye Dön</Text>
      </TouchableOpacity>

      <Text className="text-2xl font-bold text-white mb-4">📢 Kulüp Duyurusu Yayınla</Text>

      <Card className="mb-6 border border-indigo-500/30">
        <Text className="text-slate-400 text-xs mb-3">
          Bu duyuru yalnızca bu kulübe kayıtlı üyelerin ekranlarına düşecektir.
        </Text>
        <Input
          label="Duyuru Başlığı"
          placeholder="Örn: Tanışma Toplantısı"
          value={clubAnnTitle}
          onChangeText={setClubAnnTitle}
        />
        <Input
          label="Duyuru İçeriği"
          placeholder="Duyuru detaylarını girin..."
          value={clubAnnContent}
          onChangeText={setClubAnnContent}
          multiline
        />
        <Button
          title="Kulüp Duyurusunu Yayınla"
          onPress={handlePublishClubAnnouncement}
          loading={annPublishing}
          className="mt-1"
        />
      </Card>
    </ScrollView>
  );
}
