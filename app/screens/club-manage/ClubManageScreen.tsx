import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Card } from "../../components/Card";

// Alt Ekranlar
import EditClubInfoScreen from "./EditClubInfoScreen";
import ClubEventsManageScreen from "./ClubEventsManageScreen";
import ClubAnnounceManageScreen from "./ClubAnnounceManageScreen";
import ClubMembersManageScreen from "./ClubMembersManageScreen";

interface ClubManageScreenProps {
  clubId: string;
  clubName: string;
  onBack: () => void;
}

type ActiveTab = "menu" | "edit-info" | "events" | "announcements" | "members";

export default function ClubManageScreen({ clubId, clubName, onBack }: ClubManageScreenProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("menu");

  if (activeTab === "edit-info") {
    return (
      <EditClubInfoScreen clubId={clubId} clubName={clubName} onBack={() => setActiveTab("menu")} />
    );
  }

  if (activeTab === "events") {
    return (
      <ClubEventsManageScreen
        clubId={clubId}
        clubName={clubName}
        onBack={() => setActiveTab("menu")}
      />
    );
  }

  if (activeTab === "announcements") {
    return (
      <ClubAnnounceManageScreen
        clubId={clubId}
        clubName={clubName}
        onBack={() => setActiveTab("menu")}
      />
    );
  }

  if (activeTab === "members") {
    return (
      <ClubMembersManageScreen
        clubId={clubId}
        clubName={clubName}
        onBack={() => setActiveTab("menu")}
      />
    );
  }

  return (
    <ScrollView className="flex-1 bg-slate-900 px-4 pt-4" showsVerticalScrollIndicator={false}>
      {/* Üst Bar */}
      <View className="flex-row justify-between items-center mb-6">
        <TouchableOpacity onPress={onBack}>
          <Text className="text-indigo-400 font-semibold">← Geri Dön</Text>
        </TouchableOpacity>
        <Text className="text-slate-400 text-xs font-bold uppercase">Kulüp Yöneticisi</Text>
      </View>

      <Text className="text-2xl font-bold text-white mb-1">{clubName}</Text>
      <Text className="text-slate-400 text-xs mb-6">
        Yönetmek istediğiniz modülü aşağıdaki menüden seçebilirsiniz.
      </Text>

      {/* MENÜ SEÇENEKLERİ */}

      {/* 1. Kulüp Bilgilerini Düzenle */}
      <TouchableOpacity onPress={() => setActiveTab("edit-info")}>
        <Card className="mb-4 border border-emerald-500/40 flex-row items-center justify-between p-4">
          <View className="flex-row items-center flex-1 mr-2">
            <Text className="text-2xl mr-3">⚙️</Text>
            <View className="flex-1">
              <Text className="text-emerald-400 font-bold text-base">
                Kulüp Bilgilerini Düzenle
              </Text>
              <Text className="text-slate-400 text-xs mt-0.5">
                Başlık, açıklama ve kapak fotoğrafını güncelleyin
              </Text>
            </View>
          </View>
          <Text className="text-slate-400 text-lg font-bold">→</Text>
        </Card>
      </TouchableOpacity>

      {/* 2. Etkinlik Yönetimi */}
      <TouchableOpacity onPress={() => setActiveTab("events")}>
        <Card className="mb-4 border border-purple-500/40 flex-row items-center justify-between p-4">
          <View className="flex-row items-center flex-1 mr-2">
            <Text className="text-2xl mr-3">🗓️</Text>
            <View className="flex-1">
              <Text className="text-purple-400 font-bold text-base">Etkinlik İşlemleri</Text>
              <Text className="text-slate-400 text-xs mt-0.5">
                Kulüp etkinliği oluşturun, durumunu değiştirin ve katılımcıları görün
              </Text>
            </View>
          </View>
          <Text className="text-slate-400 text-lg font-bold">→</Text>
        </Card>
      </TouchableOpacity>

      {/* 3. Duyuru Yönetimi */}
      <TouchableOpacity onPress={() => setActiveTab("announcements")}>
        <Card className="mb-4 border border-indigo-500/40 flex-row items-center justify-between p-4">
          <View className="flex-row items-center flex-1 mr-2">
            <Text className="text-2xl mr-3">📢</Text>
            <View className="flex-1">
              <Text className="text-indigo-400 font-bold text-base">Kulüp Duyuruları</Text>
              <Text className="text-slate-400 text-xs mt-0.5">
                Yalnızca bu kulübün üyelerine ulaşacak yeni duyuru yayınlayın
              </Text>
            </View>
          </View>
          <Text className="text-slate-400 text-lg font-bold">→</Text>
        </Card>
      </TouchableOpacity>

      {/* 4. Üye ve Davet Yönetimi */}
      <TouchableOpacity onPress={() => setActiveTab("members")}>
        <Card className="mb-6 border border-amber-500/40 flex-row items-center justify-between p-4">
          <View className="flex-row items-center flex-1 mr-2">
            <Text className="text-2xl mr-3">👥</Text>
            <View className="flex-1">
              <Text className="text-amber-400 font-bold text-base">Üyeler ve Davetler</Text>
              <Text className="text-slate-400 text-xs mt-0.5">
                Başvuruları inceleyin, üyeleri/rolleri yönetin ve e-posta daveti gönderin
              </Text>
            </View>
          </View>
          <Text className="text-slate-400 text-lg font-bold">→</Text>
        </Card>
      </TouchableOpacity>

      <View className="h-10" />
    </ScrollView>
  );
}
