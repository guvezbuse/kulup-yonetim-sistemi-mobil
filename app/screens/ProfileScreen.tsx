import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useAuthStore } from "../store/authStore";

interface ProfileScreenProps {
  onOpenManageUsers?: () => void;
  onOpenIdCard?: () => void;
}

export default function ProfileScreen({ onOpenManageUsers, onOpenIdCard }: ProfileScreenProps) {
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);

  const isSystemAdmin = profile?.is_admin === true;

  const displayName = profile?.ad
    ? `${profile.ad} ${profile.soyad || ""}`.trim()
    : "Öğrenci";

  const studentNo = profile?.student_no || null;

  return (
    <ScrollView className="flex-1 bg-slate-900 px-4 pt-4" showsVerticalScrollIndicator={false}>
      <Text className="text-2xl font-bold text-white mb-1">Profilim</Text>
      <Text className="text-slate-400 text-xs mb-5">
        Öğrenci bilgileri, QR kod yoklama ve etkinlik geçmişi
      </Text>

      {/* Profil Kartı */}
      <View className="bg-slate-800 p-4 rounded-2xl border border-slate-700 mb-4">
        <View className="flex-row items-center gap-3">
          <View className="w-14 h-14 rounded-full bg-indigo-600/30 border border-indigo-500/40 items-center justify-center">
            <Text className="text-indigo-400 font-bold text-xl">
              {(displayName[0] || user?.email?.[0] || "U").toUpperCase()}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-white font-bold text-base">{displayName}</Text>
            <Text className="text-slate-400 text-xs">{user?.email}</Text>
            {studentNo && (
              <Text className="text-indigo-400 text-xs font-mono mt-0.5">
                Öğrenci No: {studentNo}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Sistem Yöneticisi Paneli */}
      {isSystemAdmin && onOpenManageUsers && (
        <TouchableOpacity
          onPress={onOpenManageUsers}
          activeOpacity={0.8}
          className="bg-amber-500/10 border border-amber-500/40 p-4 rounded-2xl mb-4"
        >
          <Text className="text-amber-400 font-bold text-sm">👥 Kullanıcı Yönetimi</Text>
          <Text className="text-slate-400 text-xs mt-0.5">
            Kullanıcıları listeleyin, admin yetkisi verin veya kaldırın.
          </Text>
        </TouchableOpacity>
      )}

      {/* QR Kod Alanı */}
      <TouchableOpacity
        onPress={onOpenIdCard}
        activeOpacity={0.8}
        className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700/80 mb-4 items-center"
      >
        <Text className="text-indigo-400 font-bold text-sm mb-1">📷 Etkinlik Yoklama QR Kodu</Text>
        <Text className="text-slate-400 text-xs text-center mb-4">
          Etkinlik girişlerinde görevliye bu kodu göstererek yoklamanızı verebilirsiniz.
        </Text>
        <View className="w-40 h-40 bg-white rounded-xl items-center justify-center p-2 mb-2">
          <Text className="text-slate-900 text-xs font-mono font-bold text-center">[ QR Kod ]</Text>
        </View>
        <Text className="text-indigo-400 text-[11px] font-semibold">Dijital kimlik kartını aç →</Text>
      </TouchableOpacity>

      {/* Katılınan Etkinlikler */}
      <View className="bg-slate-800 p-4 rounded-2xl border border-slate-700 mb-10">
        <Text className="text-white font-bold text-sm mb-2">Katılınan Etkinlikler</Text>
        <Text className="text-slate-400 text-xs italic">
          Henüz bir etkinliğe katılım sağlanmadı.
        </Text>
      </View>
    </ScrollView>
  );
}
