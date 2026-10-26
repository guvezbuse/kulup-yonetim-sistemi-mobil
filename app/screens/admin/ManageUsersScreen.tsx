import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Alert } from "react-native";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { Card } from "../../components/Card";

interface UserProfile {
  id: string;
  name?: string;
  surname?: string;
  email?: string;
  is_admin?: boolean;
}

interface Props {
  onBack: () => void;
}

export default function ManageUsersScreen({ onBack }: Props) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUsers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      const userList: UserProfile[] = [];
      querySnapshot.forEach((document) => {
        userList.push({ id: document.id, ...document.data() } as UserProfile);
      });
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
    Alert.alert(
      "Yetki Değişikliği",
      `Bu kullanıcının admin yetkisini ${currentStatus ? "kaldırmak" : "onaylamak"} istediğinize emin misiniz?`,
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Evet, Değiştir",
          onPress: async () => {
            try {
              await updateDoc(doc(db, "users", userId), {
                is_admin: !currentStatus,
              });
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
          <Card key={item.id} className="mb-3 border border-slate-700/60">
            <View className="flex-row justify-between items-center">
              <View className="flex-1 mr-2">
                <Text className="text-white font-bold text-sm">
                  {item.name ? `${item.name} ${item.surname || ""}` : "İsimsiz Kullanıcı"}
                </Text>
                <Text className="text-slate-400 text-xs mt-0.5">{item.email || "E-posta yok"}</Text>
              </View>

              <TouchableOpacity
                onPress={() => handleToggleAdmin(item.id, !!item.is_admin)}
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
