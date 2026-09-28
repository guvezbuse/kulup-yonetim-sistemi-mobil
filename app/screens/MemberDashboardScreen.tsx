import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Card } from "../components/Card";
import { announcementService, AnnouncementItem } from "../services/announcementService";
import { useAuthStore } from "../store/authStore";

interface MemberDashboardScreenProps {
  userEmail?: string;
  onBack: () => void;
}

export default function MemberDashboardScreen({ userEmail, onBack }: MemberDashboardScreenProps) {
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);

  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isSuperAdmin = profile?.is_admin === true;

  const loadAnnouncements = async () => {
    if (!user) return;
    try {
      const data = await announcementService.getAnnouncementsForUser(user.uid, isSuperAdmin);
      setAnnouncements(data);
    } catch (err) {
      console.log("Duyurular çekilemedi:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, [user?.uid, isSuperAdmin]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAnnouncements();
  };

  return (
    <View className="flex-1 bg-slate-900 px-4 pt-4">
      {/* Üst Bar */}
      <View className="flex-row justify-between items-center mb-4">
        <TouchableOpacity onPress={onBack}>
          <Text className="text-indigo-400 font-semibold">← Kulüplere Dön</Text>
        </TouchableOpacity>
        <Text className="text-slate-400 text-xs font-bold uppercase">Duyuru Akışı</Text>
      </View>

      <Text className="text-2xl font-bold text-white">Duyurular & Bildirimler</Text>
      <Text className="text-slate-400 text-xs mb-4">
        Üyesi olduğunuz kulüpler ve sistem geneli güncel duyurular
      </Text>

      {/* Duyuru Listesi */}
      {loading ? (
        <ActivityIndicator color="#6366f1" className="mt-10" />
      ) : announcements.length === 0 ? (
        <View className="flex-1 justify-center items-center px-6">
          <Text className="text-slate-400 text-sm text-center">
            Henüz size iletilen aktif bir duyuru bulunmuyor.
          </Text>
          <Text className="text-slate-500 text-xs text-center mt-1">
            Kulüplere katıldıkça kulüp duyuruları bu ekrana düşecektir.
          </Text>
        </View>
      ) : (
        <FlatList
          data={announcements}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
          }
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const isSystem = item.kapsam === "sistem";
            return (
              <Card className="mb-3 border border-slate-700/60">
                {/* Rozetler ve Başlık */}
                <View className="flex-row justify-between items-center mb-2">
                  <View
                    className={`px-2.5 py-0.5 rounded-full ${
                      isSystem
                        ? "bg-amber-500/20 border border-amber-500/40"
                        : "bg-indigo-500/20 border border-indigo-500/40"
                    }`}
                  >
                    <Text
                      className={`text-[10px] font-bold uppercase ${
                        isSystem ? "text-amber-400" : "text-indigo-400"
                      }`}
                    >
                      {isSystem ? "SİSTEM DUYURUSU" : item.club_ad || "KULÜP DUYURUSU"}
                    </Text>
                  </View>

                  <Text className="text-slate-500 text-[10px]">
                    {new Date(item.tarih).toLocaleDateString("tr-TR", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>

                {/* Duyuru Başlık ve İçerik */}
                <Text className="text-white font-bold text-base mb-1">{item.baslik}</Text>
                <Text className="text-slate-300 text-xs leading-5 mb-3">{item.icerik}</Text>

                {/* Yayınlayan Bilgisi */}
                <View className="pt-2 border-t border-slate-800/80 flex-row justify-between items-center">
                  <Text className="text-slate-400 text-[10px]">
                    Yayınlayan:{" "}
                    <Text className="text-slate-300 font-semibold">{item.yayinlayan_ad}</Text>
                  </Text>
                  {isSystem && (
                    <Text className="text-slate-500 text-[9px] italic">
                      Hedef:{" "}
                      {item.hedef_kitle === "tum_yoneticiler" ? "Tüm Yöneticiler" : "Tüm Üyeler"}
                    </Text>
                  )}
                </View>
              </Card>
            );
          }}
        />
      )}
    </View>
  );
}
