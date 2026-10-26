import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Card } from "../../components/Card";
import { Club } from "../../types";

// Alt Ekranlar
import CreateAnnouncementScreen from "./CreateAnnouncementScreen";
import CreateEventScreen from "./CreateEventScreen";
import ManageClubsScreen from "./ManageClubsScreen";
import ManageUsersScreen from "./ManageUsersScreen"; // <-- YENİ EKLENDİ

interface AdminPanelScreenProps {
  onBack: () => void;
  onManageClub: (club: Club) => void;
}

type ActiveTab = "menu" | "announcements" | "events" | "clubs" | "users"; // <-- "users" eklendi

export default function AdminPanelScreen({ onBack, onManageClub }: AdminPanelScreenProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("menu");

  if (activeTab === "announcements") {
    return <CreateAnnouncementScreen onBack={() => setActiveTab("menu")} />;
  }

  if (activeTab === "events") {
    return <CreateEventScreen onBack={() => setActiveTab("menu")} />;
  }

  if (activeTab === "clubs") {
    return <ManageClubsScreen onBack={() => setActiveTab("menu")} onManageClub={onManageClub} />;
  }

  if (activeTab === "users") {
    return <ManageUsersScreen onBack={() => setActiveTab("menu")} />; // <-- YENİ EKLENDİ
  }

  return (
    <ScrollView className="flex-1 bg-slate-900 px-4 pt-4" showsVerticalScrollIndicator={false}>
      {/* Üst Bar */}
      <View className="flex-row justify-between items-center mb-6">
        <TouchableOpacity onPress={onBack}>
          <Text className="text-indigo-400 font-semibold">← Ana Sayfaya Dön</Text>
        </TouchableOpacity>
        <Text className="text-slate-400 text-xs font-bold uppercase">Sistem Admini</Text>
      </View>

      <Text className="text-2xl font-bold text-white mb-2">Sistem Yönetim Paneli</Text>
      <Text className="text-slate-400 text-xs mb-6">
        Yapmak istediğiniz işlemi aşağıdaki kategorilerden seçebilirsiniz.
      </Text>

      {/* MENÜ BUTONLARI */}

      {/* 1. Sistem Duyuruları */}
      <TouchableOpacity onPress={() => setActiveTab("announcements")}>
        <Card className="mb-4 border border-amber-500/30 flex-row items-center justify-between p-4">
          <View className="flex-row items-center flex-1 mr-2">
            <Text className="text-2xl mr-3">📢</Text>
            <View className="flex-1">
              <Text className="text-amber-400 font-bold text-base">Sistem Duyuruları</Text>
              <Text className="text-slate-400 text-xs mt-0.5">
                Tüm üyelere veya tüm yöneticilere duyuru yayınlayın
              </Text>
            </View>
          </View>
          <Text className="text-slate-400 text-lg font-bold">→</Text>
        </Card>
      </TouchableOpacity>

      {/* 2. Genel Etkinlikler */}
      <TouchableOpacity onPress={() => setActiveTab("events")}>
        <Card className="mb-4 border border-purple-500/40 flex-row items-center justify-between p-4">
          <View className="flex-row items-center flex-1 mr-2">
            <Text className="text-2xl mr-3">🏛️</Text>
            <View className="flex-1">
              <Text className="text-purple-400 font-bold text-base">Genel Etkinlikler</Text>
              <Text className="text-slate-400 text-xs mt-0.5">
                Üniversite geneli etkinlik oluşturun ve başvuruları inceleyin
              </Text>
            </View>
          </View>
          <Text className="text-slate-400 text-lg font-bold">→</Text>
        </Card>
      </TouchableOpacity>

      {/* 3. Kulüp İşlemleri */}
      <TouchableOpacity onPress={() => setActiveTab("clubs")}>
        <Card className="mb-4 border border-indigo-500/40 flex-row items-center justify-between p-4">
          <View className="flex-row items-center flex-1 mr-2">
            <Text className="text-2xl mr-3">🏫</Text>
            <View className="flex-1">
              <Text className="text-indigo-400 font-bold text-base">Kulüp İşlemleri</Text>
              <Text className="text-slate-400 text-xs mt-0.5">
                Yeni kulüp oluşturun, mevcut kulüpleri ve durumlarını yönetin
              </Text>
            </View>
          </View>
          <Text className="text-slate-400 text-lg font-bold">→</Text>
        </Card>
      </TouchableOpacity>

      {/* 4. Kullanıcı / Üye Yönetimi (YENİ BUTON) */}
      <TouchableOpacity onPress={() => setActiveTab("users")}>
        <Card className="mb-6 border border-emerald-500/40 flex-row items-center justify-between p-4">
          <View className="flex-row items-center flex-1 mr-2">
            <Text className="text-2xl mr-3">👥</Text>
            <View className="flex-1">
              <Text className="text-emerald-400 font-bold text-base">Kullanıcı Yönetimi</Text>
              <Text className="text-slate-400 text-xs mt-0.5">
                Sistemdeki tüm kullanıcıları görün ve yetkilerini yönetin
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
