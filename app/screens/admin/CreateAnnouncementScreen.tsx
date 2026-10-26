import React, { useState } from "react";
import { View, Text, TouchableOpacity, Alert, ScrollView } from "react-native";
import { Card } from "../../components/Card";
import { Input } from "../../components/Input";
import { Button } from "../../components/Button";
import { announcementService } from "../../services/announcementService";
import { notificationService } from "../../services/notificationService";
import { useAuthStore } from "../../store/authStore";

interface Props {
  onBack: () => void;
}

export default function CreateAnnouncementScreen({ onBack }: Props) {
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);

  const [annTitle, setAnnTitle] = useState("");
  const [annContent, setAnnContent] = useState("");
  const [annTarget, setAnnTarget] = useState<"tum_uyeler" | "tum_yoneticiler">("tum_uyeler");
  const [annLoading, setAnnLoading] = useState(false);

  const handlePublishSystemAnnouncement = async () => {
    if (!annTitle.trim() || !annContent.trim()) {
      Alert.alert("Hata", "Lütfen başlık ve içerik alanlarını doldurun.");
      return;
    }

    setAnnLoading(true);
    try {
      const adminName = profile?.name
        ? `${profile.name} ${profile.surname || ""}`.trim()
        : "Sistem Yöneticisi";

      await announcementService.createSystemAnnouncement(
        annTitle,
        annContent,
        user?.uid || "admin",
        adminName,
        annTarget,
      );

      try {
        await notificationService.notifyAnnouncement(
          "sistem",
          annTarget,
          null,
          annTitle,
          annContent,
        );
      } catch (pushErr) {
        console.log("Sistem bildirimi gönderilirken hata oluştu:", pushErr);
      }

      Alert.alert("Başarılı", "Sistem geneli duyuru yayınlandı.");
      setAnnTitle("");
      setAnnContent("");
      onBack();
    } catch (e: any) {
      Alert.alert("Hata", e.message || "Duyuru yayınlanamadı.");
    } finally {
      setAnnLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-slate-900 px-4 pt-4" showsVerticalScrollIndicator={false}>
      <TouchableOpacity onPress={onBack} className="mb-4">
        <Text className="text-indigo-400 font-semibold">← Menüye Dön</Text>
      </TouchableOpacity>

      <Text className="text-2xl font-bold text-white mb-4">📢 Sistem Duyurusu Yayınla</Text>

      <Card className="mb-6 border border-amber-500/30">
        <Text className="text-slate-400 text-xs mb-3">
          Tüm yöneticilere veya tüm kullanıcılara sistem duyurusu iletin.
        </Text>

        <Input
          label="Duyuru Başlığı"
          placeholder="Örn: Sistem Bakım Çalışması"
          value={annTitle}
          onChangeText={setAnnTitle}
        />
        <Input
          label="Duyuru İçeriği"
          placeholder="Duyuru metnini girin..."
          value={annContent}
          onChangeText={setAnnContent}
          multiline
        />

        <Text className="text-slate-300 text-xs font-semibold mb-1.5">Hedef Kitle Seçimi</Text>
        <View className="flex-row gap-2 mb-4">
          <TouchableOpacity
            onPress={() => setAnnTarget("tum_uyeler")}
            className={`flex-1 py-2 rounded-lg items-center border ${
              annTarget === "tum_uyeler"
                ? "bg-amber-600 border-amber-500"
                : "bg-slate-800 border-slate-700"
            }`}
          >
            <Text className="text-white text-xs font-bold">Tüm Üyeler</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setAnnTarget("tum_yoneticiler")}
            className={`flex-1 py-2 rounded-lg items-center border ${
              annTarget === "tum_yoneticiler"
                ? "bg-indigo-600 border-indigo-500"
                : "bg-slate-800 border-slate-700"
            }`}
          >
            <Text className="text-white text-xs font-bold">Tüm Yöneticiler</Text>
          </TouchableOpacity>
        </View>

        <Button
          title="Sistem Duyurusunu Yayınla"
          onPress={handlePublishSystemAnnouncement}
          loading={annLoading}
        />
      </Card>
    </ScrollView>
  );
}
