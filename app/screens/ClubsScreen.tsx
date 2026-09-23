import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";

interface ClubItem {
  id: string;
  ad: string;
  aciklama: string;
  role: "Yönetici" | "Üye";
  status: "Aktif Üyelik" | "Aktif" | "Beklemede";
}

interface ClubsScreenProps {
  userEmail?: string;
  onLogout: () => void;
  onSelectClub?: (club: ClubItem) => void;
}

// Şartnamedeki ve fotoğraftaki mock veriler
const MOCK_CLUBS: ClubItem[] = [
  {
    id: "1",
    ad: "Yazılım Kulübü",
    aciklama: "Yazılım, algoritma ve mobil geliştirme atölyeleri düzenler.",
    role: "Yönetici",
    status: "Aktif Üyelik",
  },
  {
    id: "2",
    ad: "Tiyatro Topluluğu",
    aciklama: "Dönem sonu oyunları ve drama çalışmaları.",
    role: "Üye",
    status: "Aktif",
  },
];

export const ClubsScreen: React.FC<ClubsScreenProps> = ({
  userEmail = "guvezbuse@gmail.com",
  onLogout,
  onSelectClub,
}) => {
  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      {/* Üst Profil Barı (Çentikten korumalı) */}
      <View className="flex-row items-center justify-between px-6 py-4 border-b border-slate-800">
        <View className="flex-row items-center space-x-3">
          <View className="w-10 h-10 rounded-full bg-indigo-600 items-center justify-center">
            <Text className="text-white font-bold text-lg">
              {userEmail.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View className="ml-3">
            <Text className="text-white font-bold text-base">Hesabım</Text>
            <Text className="text-slate-400 text-xs">{userEmail}</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={onLogout}
          className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 active:bg-slate-700"
        >
          <Text className="text-slate-300 font-semibold text-xs">Çıkış</Text>
        </TouchableOpacity>
      </View>

      {/* Kulüp Listesi */}
      <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-2xl font-extrabold text-white tracking-tight">Kulüplerim</Text>
        </View>

        <View className="space-y-4 pb-10">
          {MOCK_CLUBS.map((club) => (
            <TouchableOpacity
              key={club.id}
              activeOpacity={0.8}
              onPress={() => onSelectClub && onSelectClub(club)}
              className="mb-4"
            >
              <Card>
                <View className="flex-row justify-between items-start mb-2">
                  <Text className="text-lg font-bold text-white flex-1 mr-2">{club.ad}</Text>
                  <View className="bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-full">
                    <Text className="text-amber-400 text-xs font-semibold">{club.role}</Text>
                  </View>
                </View>

                <Text className="text-slate-400 text-sm mb-4 leading-relaxed">{club.aciklama}</Text>

                <View className="flex-row">
                  <View className="bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full">
                    <Text className="text-emerald-400 text-xs font-medium">{club.status}</Text>
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
