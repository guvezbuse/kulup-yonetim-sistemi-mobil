import React, { useState, useEffect } from "react";
import { View, Text, FlatList, Alert, TouchableOpacity } from "react-native";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { clubService } from "../services/clubService";
import { Club } from "../types";
import { useAuthStore } from "../store/authStore";

interface AdminPanelProps {
  onBack: () => void;
}

export default function AdminPanelScreen({ onBack }: AdminPanelProps) {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [ad, setAd] = useState("");
  const [aciklama, setAciklama] = useState("");
  const [yoneticiEmail, setYoneticiEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const currentUser = useAuthStore((state) => state.user);

  const loadClubs = async () => {
    try {
      const data = await clubService.getClubs();
      setClubs(data);
    } catch (err) {
      console.log("Kulüpler çekilirken hata:", err);
    }
  };

  useEffect(() => {
    loadClubs();
  }, []);

  const handleCreateClub = async () => {
    if (!ad.trim() || !aciklama.trim()) {
      Alert.alert("Eksik Alan", "Lütfen kulüp adı ve açıklamasını girin.");
      return;
    }

    setLoading(true);
    try {
      const adminId = currentUser?.uid || "mock-admin-id";
      await clubService.createClub(ad, aciklama, adminId, yoneticiEmail);
      Alert.alert("Başarılı", "Kulüp oluşturuldu ve davet kaydı açıldı.");
      setAd("");
      setAciklama("");
      setYoneticiEmail("");
      loadClubs();
    } catch (err: any) {
      Alert.alert("Hata", "Kulüp oluşturulamadı: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (item: Club) => {
    try {
      await clubService.toggleClubStatus(item.id, item.durum);
      loadClubs();
    } catch (err: any) {
      Alert.alert("Hata", "Durum güncellenemedi.");
    }
  };

  return (
    <View className="flex-1 bg-slate-900 px-4 pt-4">
      <TouchableOpacity onPress={onBack} className="mb-4">
        <Text className="text-indigo-400 font-semibold">← Geri Dön</Text>
      </TouchableOpacity>

      <Text className="text-2xl font-bold text-white mb-4">Kulüp Yönetimi</Text>

      {/* Kulüp Ekleme Formu */}
      <Card className="mb-6">
        <Input
          label="Kulüp Adı"
          placeholder="Örn: Yapay Zeka Topluluğu"
          value={ad}
          onChangeText={setAd}
        />
        <Input
          label="Açıklama"
          placeholder="Kulübün faaliyet alanı"
          value={aciklama}
          onChangeText={setAciklama}
        />
        <Input
          label="İlk Yönetici E-Postası (Opsiyonel)"
          placeholder="yonetici@ogrenci.edu.tr"
          value={yoneticiEmail}
          onChangeText={setYoneticiEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Button
          title="Kulüp Oluştur"
          onPress={handleCreateClub}
          loading={loading}
          className="mt-2"
        />
      </Card>

      {/* Liste */}
      <Text className="text-lg font-semibold text-white mb-2">Mevcut Kulüpler</Text>
      <FlatList
        data={clubs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View className="bg-slate-800 p-4 rounded-xl mb-3 border border-slate-700 flex-row justify-between items-center">
            <View className="flex-1 mr-3">
              <Text className="text-white font-bold text-base">{item.ad}</Text>
              <Text className="text-slate-400 text-xs mt-1">{item.aciklama}</Text>
            </View>

            <TouchableOpacity
              onPress={() => handleToggleStatus(item)}
              className={`px-3 py-1.5 rounded-lg ${item.durum === "aktif" ? "bg-emerald-600" : "bg-rose-600"}`}
            >
              <Text className="text-white text-xs font-bold uppercase">{item.durum}</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}
