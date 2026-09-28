import React, { useState, useEffect } from "react";
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { Card } from "../components/Card";
import { clubService } from "../services/clubService";
import { Club } from "../types";

interface ClubsScreenProps {
  userEmail?: string;
  onLogout: () => void;
  onSelectClub?: (club: Club) => void;
}

export default function ClubsScreen({ userEmail, onLogout, onSelectClub }: ClubsScreenProps) {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClubs();
  }, []);

  const loadClubs = async () => {
    try {
      const data = await clubService.getClubs();
      setClubs(data.filter((c) => c.durum === "aktif"));
    } catch (err) {
      console.log("Kulüpler çekilemedi:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-slate-900 px-4 pt-4">
      {/* Üst Bar */}
      <View className="flex-row justify-between items-center mb-6">
        <View>
          <Text className="text-2xl font-bold text-white">Kulüpler</Text>
          {userEmail && <Text className="text-slate-400 text-xs mt-0.5">{userEmail}</Text>}
        </View>
        <TouchableOpacity
          onPress={onLogout}
          className="bg-rose-500/20 px-3 py-1.5 rounded-lg border border-rose-500/30"
        >
          <Text className="text-rose-400 font-semibold text-xs">Çıkış Yap</Text>
        </TouchableOpacity>
      </View>

      {/* Kulüp Listesi */}
      {loading ? (
        <ActivityIndicator color="#6366f1" className="mt-10" />
      ) : clubs.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <Text className="text-slate-400 text-sm">Henüz aktif bir kulüp bulunmuyor.</Text>
        </View>
      ) : (
        <FlatList
          data={clubs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Card className="mb-3 border border-slate-700/60">
              <View className="flex-row justify-between items-center">
                <View className="flex-1 mr-3">
                  <Text className="text-white font-bold text-base">{item.ad}</Text>
                  <Text className="text-slate-400 text-xs mt-1" numberOfLines={2}>
                    {item.aciklama}
                  </Text>
                </View>

                {/* Doğrudan tıklanabilir İncele Butonu */}
                <TouchableOpacity
                  onPress={() => {
                    if (onSelectClub) {
                      onSelectClub(item);
                    }
                  }}
                  className="bg-indigo-600 px-3 py-2 rounded-lg"
                  activeOpacity={0.7}
                >
                  <Text className="text-white text-xs font-bold">İncele →</Text>
                </TouchableOpacity>
              </View>
            </Card>
          )}
        />
      )}
    </View>
  );
}
