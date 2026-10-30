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
import { announcementService, AnnouncementItem } from "../services/announcementService";
import { useAuthStore } from "../store/authStore";
import CreateAnnouncementModal from "./admin/CreateAnnouncementModal";
import EditAnnouncementModal from "./admin/EditAnnouncementModal";

export default function NotificationsScreen({ onBack }: { onBack?: () => void }) {
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);

  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<AnnouncementItem | null>(null);

  const isSystemAdmin =
    Boolean(profile?.is_admin) ||
    profile?.role === "admin" ||
    profile?.role === "Yönetici" ||
    profile?.role === "yonetici";

  const loadAnnouncements = async () => {
    if (!user) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setLoading(true);
      const data = await announcementService.getAnnouncementsForUser(user.uid, isSystemAdmin);
      setAnnouncements(data || []);
    } catch (err) {
      console.log("Duyuruları yükleme hatası:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, [user?.uid]);

  const handleDeleteAnnouncement = (id: string, baslik: string) => {
    Alert.alert("Duyuruyu Sil", `"${baslik}" duyurusunu silmek istediğinizden emin misiniz?`, [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: async () => {
          try {
            await announcementService.deleteAnnouncement(id);
            loadAnnouncements();
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

  // 4 ÇEŞİT ETİKET RENDERER
  const renderAnnouncementTag = (item: AnnouncementItem) => {
    // 1. Kulüp Duyurusu ise -> Kulüp Adı
    if (item.kapsam === "kulup") {
      return (
        <View className="bg-indigo-500/20 px-2 py-0.5 rounded border border-indigo-500/30">
          <Text className="text-indigo-300 text-[10px] font-bold">
            {item.club_ad || "Kulüp Duyurusu"}
          </Text>
        </View>
      );
    }

    // 2. Sistem Duyuruları Hedef Kitleye Göre
    if (item.hedef_kitle === "tum_yoneticiler") {
      return (
        <View className="bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
          <Text className="text-amber-300 text-[10px] font-bold">🛡️ Tüm Yöneticiler</Text>
        </View>
      );
    }

    if (item.hedef_kitle === "tum_adminler") {
      return (
        <View className="bg-purple-500/20 px-2 py-0.5 rounded border border-purple-500/30">
          <Text className="text-purple-300 text-[10px] font-bold">🔑 Adminler</Text>
        </View>
      );
    }

    // Varsayılan / tum_uyeler
    return (
      <View className="bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">
        <Text className="text-emerald-300 text-[10px] font-bold">📢 Tüm Üyeler</Text>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-slate-900 px-4 pt-4">
      <View className="flex-row items-center justify-between mb-4">
        <View>
          <Text className="text-2xl font-bold text-white">Duyurular</Text>
          <Text className="text-slate-400 text-xs mt-0.5">
            Kampüs ve kulüp duyurularını takip edin
          </Text>
        </View>

        {isSystemAdmin && (
          <TouchableOpacity
            onPress={() => setIsCreateModalOpen(true)}
            className="bg-indigo-600 px-3 py-2 rounded-xl flex-row items-center"
            activeOpacity={0.7}
          >
            <Text className="text-white font-bold text-xs">+ Yeni Duyuru</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color="#6366f1" size="large" className="mt-8" />
      ) : announcements.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <Text className="text-slate-400 text-sm">Henüz yayınlanmış bir duyuru bulunmuyor.</Text>
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
                loadAnnouncements();
              }}
              tintColor="#6366f1"
            />
          }
          renderItem={({ item }) => (
            <View className="p-4 rounded-xl mb-3 border bg-slate-800 border-slate-700/60">
              <View className="flex-row justify-between items-start mb-1.5">
                <Text className="text-white font-bold text-base flex-1 mr-2">{item.baslik}</Text>

                <View className="flex-row items-center gap-2">
                  {/* 4 FARKLI DİNAMİK ETİKET */}
                  {renderAnnouncementTag(item)}

                  {/* ADMİN DÜZENLE / SİL */}
                  {isSystemAdmin && (
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
                  )}
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

      <CreateAnnouncementModal
        visible={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => loadAnnouncements()}
      />

      <EditAnnouncementModal
        visible={Boolean(editingAnnouncement)}
        announcement={editingAnnouncement}
        onClose={() => setEditingAnnouncement(null)}
        onSuccess={() => loadAnnouncements()}
      />
    </View>
  );
}
