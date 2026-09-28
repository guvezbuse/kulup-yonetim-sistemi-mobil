import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Card } from "../components/Card";
import { useAuthStore } from "../store/authStore";

interface MemberIdCardScreenProps {
  onBack: () => void;
}

export default function MemberIdCardScreen({ onBack }: MemberIdCardScreenProps) {
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);

  const fullName = profile?.name ? `${profile.name} ${profile.surname || ""}`.trim() : "Öğrenci";

  return (
    <View className="flex-1 bg-slate-900 px-4 pt-4">
      {/* Üst Bar */}
      <View className="flex-row justify-between items-center mb-6">
        <TouchableOpacity onPress={onBack}>
          <Text className="text-indigo-400 font-semibold">← Geri Dön</Text>
        </TouchableOpacity>
        <Text className="text-slate-400 text-xs font-bold uppercase">Dijital Kimlik</Text>
      </View>

      <Text className="text-2xl font-bold text-white mb-1">Öğrenci Kulüp Kimliği</Text>
      <Text className="text-slate-400 text-xs mb-6">
        Etkinlik girişlerinde ve yoklamalarda görevliye bu ekranı gösteriniz.
      </Text>

      {/* Dijital Kart Görünümü */}
      <Card className="border border-indigo-500/40 bg-slate-800 p-6 rounded-2xl">
        <View className="flex-row justify-between items-start mb-6">
          <View>
            <Text className="text-indigo-400 text-xs font-bold tracking-widest uppercase">
              ÜNİVERSİTE KULÜPLER BİRLİĞİ
            </Text>
            <Text className="text-white text-xl font-bold mt-1">{fullName}</Text>
            <Text className="text-slate-400 text-xs">{user?.email}</Text>
          </View>
          <View className="bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-1 rounded-full">
            <Text className="text-emerald-400 text-[10px] font-bold uppercase">AKTİF ÖĞRENCİ</Text>
          </View>
        </View>

        {/* QR Kod Alanı (Placeholder - Gün 15'te dinamik kamera okuyucuya bağlanacak) */}
        <View className="items-center my-4">
          <View className="w-48 h-48 bg-white rounded-xl items-center justify-center p-3 border-2 border-indigo-400">
            <View className="w-full h-full border border-dashed border-slate-900 rounded items-center justify-center bg-slate-50">
              <Text className="text-slate-900 font-mono text-3xl font-bold">▦ ▧ ▥</Text>
              <Text className="text-slate-700 text-[11px] font-bold mt-2">DİJİTAL DOĞRULAMA</Text>
              <Text className="text-slate-400 text-[9px] mt-1 font-mono">
                {user?.uid ? `${user.uid.substring(0, 16)}...` : ""}
              </Text>
            </View>
          </View>
          <Text className="text-slate-400 text-[11px] mt-3">
            Yoklama için QR Kodu Görevliye Okutunuz
          </Text>
        </View>

        {/* Alt Bilgi */}
        <View className="pt-4 border-t border-slate-700/80 flex-row justify-between items-center">
          <Text className="text-slate-500 text-[10px]">T.C. / Öğrenci Bilgisi Doğrulandı</Text>
          <Text className="text-indigo-400 font-mono text-[10px]">FAZ 1 - 2026</Text>
        </View>
      </Card>
    </View>
  );
}
