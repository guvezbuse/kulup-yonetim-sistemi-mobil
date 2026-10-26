import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from "react-native";
import { Card } from "../../components/Card";
import { Input } from "../../components/Input";
import { Button } from "../../components/Button";
import { clubService } from "../../services/clubService";
import { useAuthStore } from "../../store/authStore";
import { Club } from "../../types";

interface Props {
  onBack: () => void;
  onManageClub: (club: Club) => void;
}

export default function ManageClubsScreen({ onBack, onManageClub }: Props) {
  const user = useAuthStore((state) => state.user);

  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [clubName, setClubName] = useState("");
  const [clubDesc, setClubDesc] = useState("");
  const [creating, setCreating] = useState(false);

  const loadClubs = async () => {
    try {
      const clubData = await clubService.getClubs();
      setClubs(clubData);
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

  return (
    <ScrollView className="flex-1 bg-slate-900 px-4 pt-4" showsVerticalScrollIndicator={false}>
      <TouchableOpacity onPress={onBack} className="mb-4">
        <Text className="text-indigo-400 font-semibold">← Menüye Dön</Text>
      </TouchableOpacity>

      <Text className="text-2xl font-bold text-white mb-4">🏫 Kulüp Yönetimi</Text>

      <Card className="mb-6">
        <Text className="text-white font-bold text-base mb-3">Yeni Kulüp Oluştur</Text>
        <Input
          label="Kulüp Adı"
          placeholder="Örn: Yazılım Topluluğu"
          value={clubName}
          onChangeText={setClubName}
        />
        <Input
          label="Açıklama"
          placeholder="Kulüp amacı..."
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

      <Text className="text-base font-bold text-white mb-2">Mevcut Kulüpler ({clubs.length})</Text>

      {loading ? (
        <ActivityIndicator color="#6366f1" className="my-6" />
      ) : (
        clubs.map((item) => (
          <Card key={item.id} className="mb-3 border border-slate-700/60">
            <View className="flex-row justify-between items-start mb-2">
              <View className="flex-1 mr-2">
                <Text className="text-white font-bold text-base">{item.ad}</Text>
                <Text className="text-slate-400 text-xs mt-1">{item.aciklama}</Text>
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
                  className="px-2.5 py-1.5 rounded-lg border border-slate-700"
                >
                  <Text className="text-xs font-bold text-emerald-400">{item.durum}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Card>
        ))
      )}
    </ScrollView>
  );
}
