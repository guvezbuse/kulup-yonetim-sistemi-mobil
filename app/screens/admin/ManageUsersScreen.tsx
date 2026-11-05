import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Alert } from "react-native";
import { Card } from "../../components/Card";
import { userService } from "../../services/userService";
import { useAuthStore } from "../../store/authStore";
import { User } from "../../types";

interface Props {
  onBack: () => void;
}

export default function ManageUsersScreen({ onBack }: Props) {
  const currentUserId = useAuthStore((state) => state.user?.uid);

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUsers = async () => {
    try {
      const userList = await userService.getAllUsers();
      setUsers(userList);
    } catch (err) {
      console.log("Kullanıcılar çekilemedi:", err);
      Alert.alert("Hata", "Kullanıcı listesi alınamadı.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleToggleAdmin = async (userId: string, currentStatus: boolean) => {
    if (userId === currentUserId) {
      Alert.alert("İşlem Engellendi", "Kendi admin yetkinizi kaldıramazsınız.");
      return;
    }

    Alert.alert(
      "Yetki Değişikliği",
      `Bu kullanıcının admin yetkisini ${currentStatus ? "kaldırmak" : "onaylamak"} istediğinize emin misiniz?`,
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Evet, Değiştir",
          onPress: async () => {
            try {
              await userService.updateUserAdmin(userId, !currentStatus);
              Alert.alert("Başarılı", "Kullanıcı yetkisi güncellendi.");
              loadUsers();
            } catch (err) {
              Alert.alert("Hata", "Yetki güncellenirken bir sorun oluştu.");
            }
          },
        },
      ],
    );
  };

  return (
    <ScrollView className="flex-1 bg-slate-900 px-4 pt-4" showsVerticalScrollIndicator={false}>
      <TouchableOpacity onPress={onBack} className="mb-4">
        <Text className="text-indigo-400 font-semibold">← Menüye Dön</Text>
      </TouchableOpacity>

      <Text className="text-2xl font-bold text-white mb-2">👥 Kullanıcı Yönetimi</Text>
      <Text className="text-slate-400 text-xs mb-6">
        Sistemde kayıtlı tüm kullanıcıları ve yetkilerini buradan listeleyebilirsiniz.
      </Text>

      <Text className="text-base font-bold text-white mb-3">
        Kayıtlı Kullanıcılar ({users.length})
      </Text>

      {loading ? (
        <ActivityIndicator color="#6366f1" className="my-6" />
      ) : users.length === 0 ? (
        <Text className="text-slate-400 text-xs text-center my-4">Kullanıcı bulunamadı.</Text>
      ) : (
        users.map((item) => (
          <Card key={item.uid} className="mb-3 border border-slate-700/60">
            <View className="flex-row justify-between items-center">
              <View className="flex-1 mr-2">
                <Text className="text-white font-bold text-sm">
                  {item.ad ? `${item.ad} ${item.soyad || ""}` : "İsimsiz Kullanıcı"}
                </Text>
                <Text className="text-slate-400 text-xs mt-0.5">{item.email || "E-posta yok"}</Text>
              </View>

              <TouchableOpacity
                onPress={() => handleToggleAdmin(item.uid, !!item.is_admin)}
                className={`px-3 py-1.5 rounded-lg border ${
                  item.is_admin
                    ? "bg-amber-500/20 border-amber-500/40"
                    : "bg-slate-800 border-slate-700"
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    item.is_admin ? "text-amber-400" : "text-slate-400"
                  }`}
                >
                  {item.is_admin ? "👑 Admin" : "👤 Üye"}
                </Text>
              </TouchableOpacity>
            </View>
          </Card>
        ))
      )}

      <View className="h-10" />
    </ScrollView>
  );
}
