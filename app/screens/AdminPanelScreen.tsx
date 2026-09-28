import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { clubService } from "../services/clubService";
import { announcementService } from "../services/announcementService";
import { useAuthStore } from "../store/authStore";
import { Club } from "../types";

interface AdminPanelScreenProps {
  onBack: () => void;
  onManageClub: (club: Club) => void;
}

export default function AdminPanelScreen({ onBack, onManageClub }: AdminPanelScreenProps) {
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);

  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);

  // Yeni Kulüp State
  const [clubName, setClubName] = useState("");
  const [clubDesc, setClubDesc] = useState("");
  const [creating, setCreating] = useState(false);

  // Sistem Duyurusu State (Şartname 2.1 & 5)
  const [annTitle, setAnnTitle] = useState("");
  const [annContent, setAnnContent] = useState("");
  const [annTarget, setAnnTarget] = useState<"tum_uyeler" | "tum_yoneticiler">("tum_uyeler");
  const [annLoading, setAnnLoading] = useState(false);

  const loadClubs = async () => {
    try {
      const data = await clubService.getClubs();
      setClubs(data);
    } catch (err) {
      console.log("Kulüpler çekilemedi:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClubs();
  }, []);

  const handleCreateClub = async () => {
    if (!clubName.trim()) {
      Alert.alert("Hata", "Lütfen bir kulüp adı girin.");
      return;
    }
    setCreating(true);
    try {
      await clubService.createClub(clubName.trim(), clubDesc.trim(), user?.uid || "admin");
      Alert.alert("Başarılı", "Kulüp oluşturuldu.");
      setClubName("");
      setClubDesc("");
      loadClubs();
    } catch (err: any) {
      Alert.alert("Hata", err.message || "Kulüp oluşturulamadı.");
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (club: Club) => {
    try {
      await clubService.toggleClubStatus(club.id, club.durum);
      loadClubs();
    } catch (err: any) {
      Alert.alert("Hata", err.message || "Durum güncellenemedi.");
    }
  };

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
      Alert.alert("Başarılı", "Sistem geneli duyuru yayınlandı.");
      setAnnTitle("");
      setAnnContent("");
    } catch (e: any) {
      Alert.alert("Hata", e.message || "Duyuru yayınlanamadı.");
    } finally {
      setAnnLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-slate-900 px-4 pt-4" showsVerticalScrollIndicator={false}>
      <View className="flex-row justify-between items-center mb-4">
        <TouchableOpacity onPress={onBack}>
          <Text className="text-indigo-400 font-semibold">← Geri Dön</Text>
        </TouchableOpacity>
        <Text className="text-slate-400 text-xs font-bold uppercase">Sistem Admini</Text>
      </View>

      <Text className="text-2xl font-bold text-white mb-4">Sistem Yönetim Paneli</Text>

      {/* 1. Sistem Duyurusu Yayınlama Kartı (Şartname 2.1 & 5) */}
      <Card className="mb-6 border border-amber-500/30">
        <Text className="text-amber-400 font-bold text-base mb-1">
          📢 Sistem Geneli Duyuru Yayınla
        </Text>
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

      {/* 2. Yeni Kulüp Oluşturma */}
      <Card className="mb-6">
        <Text className="text-white font-bold text-base mb-3">Yeni Kulüp Oluştur</Text>
        <Input
          label="Kulüp Adı"
          placeholder="Örn: Yazılım ve İnovasyon Topluluğu"
          value={clubName}
          onChangeText={setClubName}
        />
        <Input
          label="Açıklama"
          placeholder="Kulübün amacı ve faaliyet alanı..."
          value={clubDesc}
          onChangeText={setClubDesc}
          multiline
        />
        <Button
          title="Kulübü Oluştur"
          onPress={handleCreateClub}
          loading={creating}
          className="mt-2"
        />
      </Card>

      {/* 3. Kulüpler Listesi & Durum Değiştirme */}
      <Text className="text-base font-bold text-white mb-2">Mevcut Kulüpler ({clubs.length})</Text>

      {loading ? (
        <ActivityIndicator color="#6366f1" className="my-6" />
      ) : clubs.length === 0 ? (
        <Text className="text-slate-400 text-xs text-center my-4">Kayıtlı kulüp bulunamadı.</Text>
      ) : (
        clubs.map((item) => (
          <Card key={item.id} className="mb-3 border border-slate-700/60">
            <View className="flex-row justify-between items-start mb-2">
              <View className="flex-1 mr-2">
                <Text className="text-white font-bold text-base">{item.ad}</Text>
                <Text className="text-slate-400 text-xs mt-1" numberOfLines={2}>
                  {item.aciklama}
                </Text>
              </View>
              <View className="flex-row items-center gap-2">
                <TouchableOpacity
                  onPress={() => onManageClub(item)}
                  className="bg-indigo-600 px-3 py-1.5 rounded-lg"
                >
                  <Text className="text-white text-xs font-bold">Yönet</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleToggleStatus(item)}
                  className={`px-2.5 py-1.5 rounded-lg border ${
                    item.durum === "aktif"
                      ? "bg-emerald-500/20 border-emerald-500/40"
                      : "bg-rose-500/20 border-rose-500/40"
                  }`}
                >
                  <Text
                    className={`text-xs font-bold uppercase ${
                      item.durum === "aktif" ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {item.durum}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Card>
        ))
      )}
      <View className="h-10" />
    </ScrollView>
  );
}
