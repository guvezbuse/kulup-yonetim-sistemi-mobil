import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Alert, Image, TextInput, ScrollView } from "react-native";
import { Card } from "../../components/Card";
import { Input } from "../../components/Input";
import { Button } from "../../components/Button";
import { clubService } from "../../services/clubService";

interface Props {
  clubId: string;
  clubName: string;
  onBack: () => void;
  onDataUpdated?: () => void;
}

export default function EditClubInfoScreen({ clubId, clubName, onBack, onDataUpdated }: Props) {
  const [editAd, setEditAd] = useState(clubName || "");
  const [editAciklama, setEditAciklama] = useState("");
  const [editDetayliAciklama, setEditDetayliAciklama] = useState("");
  const [editGorselUrl, setEditGorselUrl] = useState("");
  const [savingClubInfo, setSavingClubInfo] = useState(false);

  const loadClubDetails = async () => {
    try {
      const allClubs = await clubService.getClubs();
      const currentClub = allClubs.find((c) => c.id === clubId);
      if (currentClub) {
        setEditAd(currentClub.ad || clubName);
        setEditAciklama(currentClub.aciklama || "");
        setEditDetayliAciklama(
          currentClub.detayliAciklama || (currentClub as any).fullDescription || "",
        );
        setEditGorselUrl(currentClub.gorselUrl || (currentClub as any).imageUrl || "");
      }
    } catch (e) {
      console.log("Kulüp detayı çekilemedi:", e);
    }
  };

  useEffect(() => {
    loadClubDetails();
  }, [clubId]);

  const handleSaveClubInfo = async () => {
    if (!editAd.trim()) {
      Alert.alert("Hata", "Kulüp adı boş bırakılamaz.");
      return;
    }

    setSavingClubInfo(true);
    try {
      await clubService.updateClub(clubId, {
        ad: editAd,
        aciklama: editAciklama,
        detayliAciklama: editDetayliAciklama,
        gorselUrl: editGorselUrl,
      });
      Alert.alert("Başarılı", "Kulüp bilgileri güncellendi.");
      if (onDataUpdated) onDataUpdated();
    } catch (err: any) {
      Alert.alert("Hata", err.message || "Kulüp bilgileri güncellenemedi.");
    } finally {
      setSavingClubInfo(false);
    }
  };

  const handleDeletePhoto = async () => {
    Alert.alert("Fotoğrafı Sil", "Kulüp görselini kaldırmak istediğinize emin misiniz?", [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Evet, Sil",
        style: "destructive",
        onPress: async () => {
          try {
            await clubService.deleteClubPhoto(clubId);
            setEditGorselUrl("");
            Alert.alert("Başarılı", "Kulüp görseli silindi.");
            if (onDataUpdated) onDataUpdated();
          } catch (e: any) {
            Alert.alert("Hata", "Görsel silinemedi.");
          }
        },
      },
    ]);
  };

  return (
    <ScrollView className="flex-1 bg-slate-900 px-4 pt-4" showsVerticalScrollIndicator={false}>
      <TouchableOpacity onPress={onBack} className="mb-4">
        <Text className="text-indigo-400 font-semibold">← Menüye Dön</Text>
      </TouchableOpacity>

      <Text className="text-2xl font-bold text-white mb-4">⚙️ Kulüp Bilgilerini Düzenle</Text>

      <Card className="mb-6 border border-emerald-500/40 bg-emerald-950/10">
        <Input
          label="Kulüp Adı / Başlığı"
          placeholder="Örn: Tiyatro Kulübü"
          value={editAd}
          onChangeText={setEditAd}
        />
        <Input
          label="Kısa Açıklama (Listede Görünür)"
          placeholder="Örn: Sahne sanatları atölyeleri"
          value={editAciklama}
          onChangeText={setEditAciklama}
        />

        <View className="mb-3">
          <Text className="text-slate-300 text-xs font-semibold mb-1">
            Kulüp Hakkında (Detay Sayfası Metni)
          </Text>
          <TextInput
            value={editDetayliAciklama}
            onChangeText={setEditDetayliAciklama}
            placeholder="Kulübün vizyonu ve detaylı tanıtım metni..."
            placeholderTextColor="#64748b"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            className="bg-slate-800 text-white rounded-xl p-3 text-xs border border-slate-700"
          />
        </View>

        <Input
          label="Fotoğraf / Banner Bağlantısı (URL)"
          placeholder="https://images.unsplash.com/..."
          value={editGorselUrl}
          onChangeText={setEditGorselUrl}
        />

        {editGorselUrl ? (
          <View className="mb-4">
            <Text className="text-slate-400 text-xs mb-2 font-semibold">
              Mevcut Görsel Önizlemesi:
            </Text>
            <View className="w-full h-36 rounded-xl overflow-hidden border border-slate-700">
              <Image source={{ uri: editGorselUrl }} className="w-full h-full" resizeMode="cover" />
            </View>
            <TouchableOpacity
              onPress={handleDeletePhoto}
              className="bg-rose-950/60 border border-rose-600/60 py-2 rounded-xl items-center mt-2"
            >
              <Text className="text-rose-400 text-xs font-bold">🗑 Fotoğrafı Kaldır / Sil</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <Button
          title="Kulüp Bilgilerini Kaydet"
          onPress={handleSaveClubInfo}
          loading={savingClubInfo}
          className="bg-emerald-600 active:bg-emerald-700 mt-1"
        />
      </Card>
      <View className="h-10" />
    </ScrollView>
  );
}
