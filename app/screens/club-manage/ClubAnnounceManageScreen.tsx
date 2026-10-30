import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { announcementService, AnnouncementItem } from "../../services/announcementService";
import { useAuthStore } from "../../store/authStore";
import CreateClubAnnouncementModal from "./CreateClubAnnouncementModal";
import EditAnnouncementModal from "../admin/EditAnnouncementModal";

interface ClubAnnounceManageScreenProps {
  clubId: string;
  clubName: string;
  onBack?: () => void;
}

export default function ClubAnnounceManageScreen({
  clubId,
  clubName,
  onBack,
}: ClubAnnounceManageScreenProps) {
  const user = useAuthStore((state) => state.user);

  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modallar
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<AnnouncementItem | null>(null);

  // Kulübe ait duyuruları yükle
  const loadClubAnnouncements = async () => {
    if (!user || !clubId) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setLoading(true);
      // Tüm duyuruları çek ve bu kulübe ait olanları filtrele
      const allAnnouncements = await announcementService.getAnnouncementsForUser(user.uid, true);
      const filtered = allAnnouncements.filter((item) => item.club_id === clubId);
      setAnnouncements(filtered);
    } catch (err) {
      console.log("Kulüp duyuruları yüklenirken hata oluştu:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadClubAnnouncements();
  }, [clubId, user?.uid]);

  // Duyuru Silme İşlemi
  const handleDeleteAnnouncement = (id: string, baslik: string) => {
    Alert.alert("Duyuruyu Sil", `"${baslik}" duyurusunu silmek istediğinizden emin misiniz?`, [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: async () => {
          try {
            await announcementService.deleteAnnouncement(id);
            loadClubAnnouncements();
          } catch (err) {
            Alert.alert("Hata", "Duyuru silinirken bir sorun oluştu.");
          }
        },
      },
    ]);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("tr-TR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  return (
    <View className="flex-1 bg-slate-900 px-4 pt-4">
      {/* ÜST BAR VE YENİ DUYURU BUTONU */}
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row items-center gap-2">
          {onBack && (
            <TouchableOpacity onPress={onBack}>
              <Text className="text-indigo-400 font-semibold mr-2">← Geri</Text>
            </TouchableOpacity>
          )}
          <View>
            <Text className="text-xl font-bold text-white">Kulüp Duyuruları</Text>
            <Text className="text-slate-400 text-xs mt-0.5">{clubName} duyurularını yönetin</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => setIsCreateModalOpen(true)}
          className="bg-indigo-600 px-3 py-2 rounded-xl flex-row items-center"
          activeOpacity={0.7}
        >
          <Text className="text-white font-bold text-xs">+ Yeni Duyuru</Text>
        </TouchableOpacity>
      </View>

      {/* ESKİ VE MEVCUT DUYURULAR LİSTESİ */}
      {loading ? (
        <ActivityIndicator color="#6366f1" size="large" className="mt-8" />
      ) : announcements.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <Text className="text-slate-400 text-sm">Bu kulübe ait henüz duyuru yayınlanmamış.</Text>
        </View>
      ) : (
        <FlatList
          data={announcements}
          keyExtractor={(item) => item.id || Math.random().toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadClubAnnouncements();
              }}
              tintColor="#6366f1"
            />
          }
          renderItem={({ item }) => (
            <View className="p-4 rounded-xl mb-3 border bg-slate-800 border-slate-700/60">
              <View className="flex-row justify-between items-start mb-1.5">
                <Text className="text-white font-bold text-base flex-1 mr-2">{item.baslik}</Text>

                <View className="flex-row items-center gap-2">
                  {/* KULÜP ETİKETİ */}
                  <View className="bg-indigo-500/20 px-2 py-0.5 rounded border border-indigo-500/30">
                    <Text className="text-indigo-300 text-[10px] font-bold">
                      {item.club_ad || clubName}
                    </Text>
                  </View>

                  {/* DÜZENLE VE SİL BUTONLARI */}
                  <View className="flex-row items-center gap-1.5">
                    <TouchableOpacity
                      onPress={() => setEditingAnnouncement(item)}
                      className="bg-amber-500/20 p-1.5 rounded-lg border border-amber-500/30"
                    >
                      <Text className="text-xs">✏️</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleDeleteAnnouncement(item.id, item.baslik)}
                      className="bg-red-500/20 p-1.5 rounded-lg border border-red-500/30"
                    >
                      <Text className="text-xs">🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <Text className="text-slate-300 text-xs leading-5 mt-1">{item.icerik}</Text>

              {item.tarih && (
                <Text className="text-slate-500 text-[10px] mt-2 text-right">
                  {formatDate(item.tarih)}
                </Text>
              )}
            </View>
          )}
        />
      )}

      {/* YENİ KULÜP DUYURUSU OLUŞTURMA MODALI */}
      <CreateClubAnnouncementModal
        visible={isCreateModalOpen}
        clubId={clubId}
        clubName={clubName}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => loadClubAnnouncements()}
      />

      {/* DUYURU DÜZENLEME MODALI */}
      <EditAnnouncementModal
        visible={Boolean(editingAnnouncement)}
        announcement={editingAnnouncement}
        onClose={() => setEditingAnnouncement(null)}
        onSuccess={() => loadClubAnnouncements()}
      />
    </View>
  );
}
