import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { membershipService } from "../services/membershipService";
import { useAuthStore } from "../store/authStore";
import { Club, ClubRole, MembershipStatus } from "../types";

interface ClubDetailScreenProps {
  club: Club;
  onBack: () => void;
  onManageClub?: (club: Club) => void; // <--- Yöneticinin yönetim ekranına geçmesi için
}

export default function ClubDetailScreen({ club, onBack, onManageClub }: ClubDetailScreenProps) {
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);

  const [membership, setMembership] = useState<{ role: ClubRole; status: MembershipStatus } | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [motivation, setMotivation] = useState("");
  const [applying, setApplying] = useState(false);

  const isSuperAdmin = profile?.is_admin === true;

  const loadStatus = async () => {
    if (!user) return;
    try {
      const res = await membershipService.getUserClubStatus(club.id, user.uid);
      setMembership(res);
    } catch (e) {
      console.log("Üyelik durumu sorgulanamadı:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, [club.id, user?.uid]);

  const isClubManager =
    isSuperAdmin || (membership?.role === "yönetici" && membership?.status === "aktif");

  const handleApply = async () => {
    if (!user) return;
    setApplying(true);
    try {
      const userName = profile?.name
        ? `${profile.name} ${profile.surname || ""}`.trim()
        : user.email || "";
      await membershipService.applyToClub(
        club.id,
        user.uid,
        user.email || "",
        userName,
        motivation,
      );
      Alert.alert("Başarılı", "Katılma başvurunuz kulüp yöneticisine iletildi.");
      setMotivation("");
      loadStatus();
    } catch (err: any) {
      Alert.alert("Başvuru Hatası", err.message || "Başvuru yapılamadı.");
    } finally {
      setApplying(false);
    }
  };

  return (
    <View className="flex-1 bg-slate-900 px-4 pt-4">
      <TouchableOpacity onPress={onBack} className="mb-4">
        <Text className="text-indigo-400 font-semibold">← Geri Dön</Text>
      </TouchableOpacity>

      <Text className="text-2xl font-bold text-white mb-1">{club.ad}</Text>
      <Text className="text-slate-400 text-sm mb-4">{club.aciklama}</Text>

      {/* KULÜP YÖNETİCİSİ VEYA ADMİN İSE YÖNETİM BUTONU (Şartname 2.2) */}
      {isClubManager && (
        <Card className="mb-4 border border-indigo-500/40 bg-indigo-950/20">
          <View className="flex-row justify-between items-center">
            <View className="flex-1 mr-2">
              <Text className="text-indigo-300 font-bold text-sm">Kulüp Yönetici Yetkisi</Text>
              <Text className="text-slate-400 text-xs mt-0.5">
                Başvuruları onaylayabilir, üyelere duyuru gönderebilirsiniz.
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => onManageClub && onManageClub(club)}
              className="bg-indigo-600 px-3.5 py-2 rounded-lg"
            >
              <Text className="text-white text-xs font-bold">⚙️ Yönet</Text>
            </TouchableOpacity>
          </View>
        </Card>
      )}

      {/* Kulüp Bilgileri Kartı */}
      <Card className="mb-4">
        <Text className="text-white font-bold text-sm mb-3">Kulüp Bilgileri</Text>
        <View className="flex-row justify-between py-1 border-b border-slate-800">
          <Text className="text-slate-400 text-xs">Durum</Text>
          <Text className="text-emerald-400 font-bold text-xs uppercase">{club.durum}</Text>
        </View>
        <View className="flex-row justify-between py-1 pt-2">
          <Text className="text-slate-400 text-xs">Üyelik Durumunuz</Text>
          {loading ? (
            <ActivityIndicator size="small" color="#6366f1" />
          ) : (
            <Text
              className={`font-bold text-xs uppercase ${
                membership?.status === "aktif"
                  ? "text-emerald-400"
                  : membership?.status === "beklemede"
                    ? "text-amber-400"
                    : "text-indigo-400"
              }`}
            >
              {membership ? `${membership.role} (${membership.status})` : "Üye Değil"}
            </Text>
          )}
        </View>
      </Card>

      {/* Üyelik Başvuru Alanı */}
      {!loading && (
        <View>
          {membership?.status === "aktif" ? (
            <Card className="border border-emerald-500/30 bg-emerald-950/20">
              <Text className="text-emerald-400 font-bold text-sm">✅ Aktif Kulüp Üyesisiniz</Text>
              <Text className="text-slate-400 text-xs mt-1">
                Bu kulübün etkinliklerine katılabilir ve kulüp duyurularını takip edebilirsiniz.
              </Text>
            </Card>
          ) : membership?.status === "beklemede" ? (
            <Card className="border border-amber-500/30 bg-amber-950/20">
              <Text className="text-amber-400 font-bold text-sm">⏳ Başvurunuz İnceleniyor</Text>
              <Text className="text-slate-400 text-xs mt-1">
                Kulüp yöneticisi başvurunuzu değerlendirdikten sonra kulübe dahil edileceksiniz.
              </Text>
            </Card>
          ) : (
            <Card>
              <Text className="text-white font-bold text-sm mb-1">Kulübe Katılma Başvurusu</Text>
              <Text className="text-slate-400 text-xs mb-3">
                Kulüp yöneticisine kendinizi tanıtan kısa bir motivasyon mesajı iletin.
              </Text>
              <Input
                label="Motivasyon Mesajı (İsteğe Bağlı)"
                placeholder="Neden katılmak istiyorsunuz?"
                value={motivation}
                onChangeText={setMotivation}
                multiline
              />
              <Button
                title="Başvuru Gönder"
                onPress={handleApply}
                loading={applying}
                className="mt-2"
              />
            </Card>
          )}
        </View>
      )}
    </View>
  );
}
