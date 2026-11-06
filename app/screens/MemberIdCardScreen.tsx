import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { buildAttendanceQrValue } from "../lib/attendanceQr";
import { Card } from "../components/Card";
import { useAuthStore } from "../store/authStore";

interface MemberIdCardScreenProps {
  onBack: () => void;
}

export default function MemberIdCardScreen({ onBack }: MemberIdCardScreenProps) {
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);

  const isAdmin = profile?.is_admin === true;
  const fullName = `${profile?.ad || ""} ${profile?.soyad || ""}`.trim() || "Öğrenci";
  const studentNo = profile?.student_no?.trim();

  if (isAdmin) {
    return (
      <View className="flex-1 bg-slate-900 px-4 pt-4">
        <TouchableOpacity onPress={onBack} className="mb-6">
          <Text className="text-indigo-400 font-semibold">← Geri Dön</Text>
        </TouchableOpacity>
        <View className="flex-1 items-center justify-center">
          <Text className="text-4xl mb-3">🔒</Text>
          <Text className="text-white font-bold text-lg">Üyelere Özel Ekran</Text>
          <Text className="text-slate-400 text-xs text-center mt-1">
            Yoklama QR kodu yalnızca öğrenci üyeler tarafından kullanılabilir.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-900 px-4 pt-4">
      <View className="flex-row justify-between items-center mb-6">
        <TouchableOpacity onPress={onBack}>
          <Text className="text-indigo-400 font-semibold">← Geri Dön</Text>
        </TouchableOpacity>
        <Text className="text-slate-400 text-xs font-bold uppercase">Dijital Kimlik</Text>
      </View>

      <Text className="text-2xl font-bold text-white mb-1">Öğrenci Kulüp Kimliği</Text>
      <Text className="text-slate-400 text-xs mb-6">
        Etkinlik girişlerinde görevliye bu QR kodu okutunuz.
      </Text>

      <Card className="border border-indigo-500/40 bg-slate-800 p-6 rounded-2xl shadow-xl">
        <View className="flex-row justify-between items-start mb-6">
          <View className="flex-1 mr-2">
            <Text className="text-indigo-400 text-[10px] font-bold tracking-widest uppercase">
              ÜNİVERSİTE KULÜPLER BİRLİĞİ
            </Text>
            <Text className="text-white text-xl font-bold mt-1">{fullName}</Text>
            <Text className="text-slate-400 text-xs mt-0.5" numberOfLines={1}>
              {profile?.email || user?.email || ""}
            </Text>
            {!!studentNo && (
              <Text className="text-slate-400 text-[11px] font-mono mt-1">
                Öğrenci No: {studentNo}
              </Text>
            )}
          </View>
          <View className="bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-1 rounded-full">
            <Text className="text-emerald-400 text-[10px] font-bold uppercase">AKTİF ÜYE</Text>
          </View>
        </View>

        <View className="items-center my-4">
          <View className="bg-white rounded-2xl p-4 border-2 border-indigo-400">
            {user ? (
              <QRCode
                value={buildAttendanceQrValue(user.uid)}
                size={196}
                color="#0f172a"
                backgroundColor="#ffffff"
                quietZone={6}
                ecl="M"
              />
            ) : (
              <View className="w-48 h-48 items-center justify-center">
                <Text className="text-slate-900 text-xs">QR hazırlanıyor...</Text>
              </View>
            )}
          </View>
          <Text className="text-slate-400 text-[11px] mt-3 text-center">
            Bu kod kişiye özeldir. Ekran görüntüsünü başkalarıyla paylaşmayınız.
          </Text>
        </View>

        <View className="pt-4 border-t border-slate-700/80 flex-row justify-between items-center">
          <Text className="text-slate-500 text-[10px]">Dinamik üye doğrulama</Text>
          <Text className="text-indigo-400 font-mono text-[10px]">VER: 2026.1</Text>
        </View>
      </Card>

      <View className="bg-slate-800/70 border border-slate-700 rounded-2xl p-4 mt-4">
        <Text className="text-indigo-300 text-xs font-semibold">📌 Nasıl kullanılır?</Text>
        <Text className="text-slate-400 text-[11px] mt-1 leading-4">
          1. Etkinlik girişinde görevli yoklama ekranını açar.{"\n"}
          2. Telefonunuzdaki QR kodu kameraya gösterirsiniz.{"\n"}
          3. Sistem yoklamanızı kaydeder ve mükerrer girişi engeller.
        </Text>
      </View>
    </View>
  );
}
