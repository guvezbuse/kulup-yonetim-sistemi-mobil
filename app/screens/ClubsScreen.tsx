import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Image,
  Alert,
} from "react-native";
import { Card } from "../components/Card";
import { clubService } from "../services/clubService";
import { useAuthStore } from "../store/authStore";
import { Club } from "../types";

interface ClubsScreenProps {
  onSelectClub: (club: Club) => void;
  onCreateClub?: () => void;
  onManageClub?: (club: Club) => void;
}

const DEFAULT_BANNER =
  "https://images.unsplash.com/photo-1523580494863-6f3031224c94?q=80&w=1000&auto=format&fit=crop";

export default function ClubsScreen({
  onSelectClub,
  onCreateClub,
  onManageClub,
}: ClubsScreenProps) {
  const profile = useAuthStore((state) => state.profile);

  const [clubs, setClubs] = useState<Club[]>([]);
  const [filteredClubs, setFilteredClubs] = useState<Club[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Sistem Yöneticisi (Admin) Kontrolü
  const isSystemAdmin = Boolean(profile?.is_admin) || profile?.role === "admin";

  useEffect(() => {
    loadClubs();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredClubs(clubs);
    } else {
      const q = searchQuery.toLowerCase();
      const filtered = clubs.filter(
        (c) =>
          c.ad.toLowerCase().includes(q) || (c.aciklama && c.aciklama.toLowerCase().includes(q)),
      );
      setFilteredClubs(filtered);
    }
  }, [searchQuery, clubs]);

  const loadClubs = async () => {
    try {
      setLoading(true);
      const data = await clubService.getClubs();
      setClubs(data);
      setFilteredClubs(data);
    } catch (e) {
      console.log("Kulüpler yüklenirken hata oluştu:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleClubStatus = async (club: Club) => {
    const hedefDurum = club.durum === "aktif" ? "pasif" : "aktif";
    Alert.alert(
      "Kulüp Durumu Değiştir",
      `"${club.ad}" kulübünü ${hedefDurum.toUpperCase()} yapmak istediğinize emin misiniz?`,
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Evet, Değiştir",
          onPress: async () => {
            try {
              // Doğrudan clubService içindeki orijinal toggleClubStatus fonksiyonu kullanıldı
              await clubService.toggleClubStatus(club.id, club.durum);
              Alert.alert("Başarılı", "Kulüp durumu güncellendi.");
              loadClubs();
            } catch (err: any) {
              Alert.alert("Hata", err.message || "İşlem gerçekleştirilemedi.");
            }
          },
        },
      ],
    );
  };

  const renderClubCard = ({ item }: { item: Club }) => {
    const bannerUrl = item.gorselUrl || item.imageUrl || DEFAULT_BANNER;

    return (
      <TouchableOpacity onPress={() => onSelectClub(item)} activeOpacity={0.8} className="mb-4">
        <Card className="p-0 overflow-hidden border border-slate-800 bg-slate-800/80">
          <View className="h-32 w-full relative">
            <Image source={{ uri: bannerUrl }} className="w-full h-full" resizeMode="cover" />
            {/* Kulüp Durum Rozeti */}
            <View className="absolute top-2 right-2 bg-slate-900/80 px-2 py-1 rounded-md">
              <Text
                className={`text-[10px] font-bold ${
                  item.durum === "pasif" ? "text-rose-400" : "text-emerald-400"
                }`}
              >
                {item.durum ? item.durum.toUpperCase() : "AKTİF"}
              </Text>
            </View>
          </View>

          <View className="p-4">
            <Text className="text-white font-bold text-lg">{item.ad}</Text>
            <Text className="text-slate-400 text-xs mt-1 leading-4" numberOfLines={2}>
              {item.aciklama}
            </Text>

            {/* Admin Yönetim Butonları */}
            {isSystemAdmin && (
              <View className="flex-row justify-end items-center gap-2 mt-3 pt-3 border-t border-slate-700/60">
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    handleToggleClubStatus(item);
                  }}
                  className={`px-3 py-1.5 rounded-lg border ${
                    item.durum === "pasif"
                      ? "border-emerald-500/50 bg-emerald-950/30"
                      : "border-rose-500/50 bg-rose-950/30"
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      item.durum === "pasif" ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {item.durum === "pasif" ? "Aktif Et" : "Pasife Al"}
                  </Text>
                </TouchableOpacity>

                {onManageClub && (
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      onManageClub(item);
                    }}
                    className="bg-indigo-600 px-3 py-1.5 rounded-lg"
                  >
                    <Text className="text-white text-xs font-semibold">⚙️ Yönet</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1 bg-slate-900 px-4 pt-4">
      {/* BAŞLIK VE ADMİN YENİ KULÜP EKLEME BUTONU */}
      <View className="flex-row justify-between items-center mb-4">
        <View>
          <Text className="text-2xl font-bold text-white">Kulüpler</Text>
          <Text className="text-slate-400 text-xs mt-0.5">
            Kampüsteki öğrenci kulüplerini keşfedin
          </Text>
        </View>

        {isSystemAdmin && onCreateClub && (
          <TouchableOpacity
            onPress={onCreateClub}
            className="bg-indigo-600 px-3 py-2 rounded-xl flex-row items-center"
            activeOpacity={0.7}
          >
            <Text className="text-white font-bold text-xs">+ Yeni Kulüp</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ARAMA ÇUBUĞU */}
      <View className="mb-4">
        <TextInput
          value={searchQuery}
          onChangeText={searchQuery ? setSearchQuery : setSearchQuery}
          placeholder="Kulüp adı veya açıklama ara..."
          placeholderTextColor="#64748b"
          className="bg-slate-800 text-white px-4 py-2.5 rounded-xl border border-slate-700 text-xs"
        />
      </View>

      {/* KULÜPLER LİSTESİ */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : (
        <FlatList
          data={filteredClubs}
          keyExtractor={(item) => item.id}
          renderItem={renderClubCard}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={
            <View className="items-center justify-center py-10">
              <Text className="text-slate-400 text-sm">Aramanıza uygun kulüp bulunamadı.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}
