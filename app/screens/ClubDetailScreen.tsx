import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  ScrollView,
} from "react-native";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { membershipService } from "../services/membershipService";
import { useAuthStore } from "../store/authStore";
import { Club } from "../types";

interface ClubDetailScreenProps {
  club: Club;
  onBack: () => void;
  onManage?: () => void;
}

export default function ClubDetailScreen({ club, onBack, onManage }: ClubDetailScreenProps) {
  const user = useAuthStore((state) => state.user);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [membershipStatus, setMembershipStatus] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [motivationMessage, setMotivationMessage] = useState("");

  useEffect(() => {
    loadMembership();
  }, [club.id]);

  const loadMembership = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const data = await membershipService.getUserMembership(club.id, user.uid);
      if (data) {
        setMembershipStatus(data.status);
        setMyRole(data.role);
      } else {
        setMembershipStatus(null);
        setMyRole(null);
      }
    } catch (e) {
      console.log("Üyelik sorgulama hatası:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      await membershipService.applyToClub(club.id, user.uid, user.email || "", motivationMessage);
      Alert.alert("Başarılı", "Katılma başvurunuz kulüp yöneticisine iletildi.");
      setMembershipStatus("beklemede");
      setMyRole("uye");
    } catch (err: any) {
      Alert.alert("Başvuru Hatası", err.message || "Başvuru sırasında hata oluştu.");
    } finally {
      setSubmitting(false);
    }
  };

  // Hem standart 'yonetici' hem de eski veritabanı kayıtlarındaki 'yönetici' yazımını doğrular
  const isClubManager =
    myRole === "yonetici" ||
    (myRole as any) === "yönetici" ||
    myRole === "baskan" ||
    (myRole as any) === "başkan";

  return (
    <View className="flex-1 bg-slate-900 px-4 pt-4">
      <TouchableOpacity onPress={onBack} className="mb-4">
        <Text className="text-indigo-400 font-semibold">← Geri Dön</Text>
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Text className="text-2xl font-bold text-white">{club.ad}</Text>
        <Text className="text-slate-400 text-sm mt-1 mb-6">{club.aciklama}</Text>

        {loading ? (
          <ActivityIndicator color="#6366f1" className="mt-6" />
        ) : (
          <>
            {/* 1. KULÜP YÖNETİCİ KARTI: Sadece kulüp yöneticisi/başkanı ise göster */}
            {isClubManager && (
              <Card className="mb-4 border border-indigo-500/40 bg-indigo-950/20">
                <View className="flex-row justify-between items-center">
                  <View className="flex-1 mr-2">
                    <Text className="text-white font-bold text-sm">Kulüp Yönetici Yetkisi</Text>
                    <Text className="text-slate-400 text-xs mt-0.5">
                      Başvuruları onaylayabilir, üyelere duyuru gönderebilirsiniz.
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={onManage}
                    className="bg-indigo-600 px-3 py-2 rounded-lg flex-row items-center"
                    activeOpacity={0.7}
                  >
                    <Text className="text-white font-bold text-xs">⚙ Yönet</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            )}

            {/* 2. KULÜP BİLGİLERİ */}
            <Card className="mb-4">
              <Text className="text-white font-bold text-sm mb-3">Kulüp Bilgileri</Text>
              <View className="flex-row justify-between py-1 border-b border-slate-800">
                <Text className="text-slate-400 text-xs">Durum</Text>
                <Text className="text-emerald-400 font-bold text-xs">AKTİF</Text>
              </View>
              <View className="flex-row justify-between py-1 mt-1">
                <Text className="text-slate-400 text-xs">Üyelik Durumunuz</Text>
                <Text
                  className={`font-bold text-xs ${
                    membershipStatus === "aktif"
                      ? "text-emerald-400"
                      : membershipStatus === "beklemede"
                        ? "text-amber-400"
                        : "text-slate-400"
                  }`}
                >
                  {isClubManager
                    ? "YÖNETİCİ (AKTİF)"
                    : membershipStatus === "aktif"
                      ? "AKTİF ÜYE"
                      : membershipStatus === "beklemede"
                        ? "BAŞVURU BEKLEMEDE"
                        : "ÜYE DEĞİL"}
                </Text>
              </View>
            </Card>

            {/* 3. BAŞVURU / DURUM KARTLARI */}
            {membershipStatus === "aktif" ? (
              <Card className="mb-4 border border-emerald-500/30 bg-emerald-950/20">
                <Text className="text-emerald-400 font-bold text-sm">✓ Aktif Kulüp Üyesisiniz</Text>
                <Text className="text-slate-300 text-xs mt-1">
                  Bu kulübün etkinliklerine katılabilir ve kulüp duyurularını takip edebilirsiniz.
                </Text>
              </Card>
            ) : membershipStatus === "beklemede" ? (
              <Card className="mb-4 border border-amber-500/30 bg-amber-950/20">
                <Text className="text-amber-400 font-bold text-sm">⏳ Başvurunuz İnceleniyor</Text>
                <Text className="text-slate-300 text-xs mt-1">
                  Kulübe katılma başvurunuz kulüp yöneticisi tarafından inceleniyor.
                </Text>
              </Card>
            ) : (
              <Card className="mb-4">
                <Text className="text-white font-bold text-sm mb-1">Kulübe Katılma Başvurusu</Text>
                <Text className="text-slate-400 text-xs mb-3">
                  Kulüp yöneticisine kendinizi tanıtan kısa bir motivasyon mesajı iletin.
                </Text>
                <TextInput
                  value={motivationMessage}
                  onChangeText={setMotivationMessage}
                  placeholder="Neden katılmak istiyorsunuz?"
                  placeholderTextColor="#64748b"
                  multiline
                  numberOfLines={3}
                  className="bg-slate-800 text-white rounded-xl p-3 text-xs border border-slate-700 mb-3"
                  textAlignVertical="top"
                />
                <Button
                  title="Başvuru Gönder"
                  onPress={handleApply}
                  loading={submitting}
                  className="bg-indigo-600 active:bg-indigo-700"
                />
              </Card>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
