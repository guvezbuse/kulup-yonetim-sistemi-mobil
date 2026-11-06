import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { getErrorMessage } from "../lib/errors";
import { formatShortDateTime } from "../lib/eventDate";
import { membershipService, UserClub } from "../services/membershipService";
import { useAuthStore } from "../store/authStore";
import { CLUB_ROLE, Club } from "../types";

interface MyClubsScreenProps {
  onBack: () => void;
  onSelectClub: (club: Club) => void;
}

const DEFAULT_BANNER =
  "https://images.unsplash.com/photo-1523580494863-6f3031224c94?q=80&w=1000&auto=format&fit=crop";

export default function MyClubsScreen({ onBack, onSelectClub }: MyClubsScreenProps) {
  const user = useAuthStore((state) => state.user);

  const [clubs, setClubs] = useState<UserClub[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadClubs = useCallback(async () => {
    if (!user) return;

    try {
      setClubs(await membershipService.getUserClubs(user.uid));
    } catch (error) {
      Alert.alert("Hata", getErrorMessage(error, "Kulüpleriniz yüklenemedi."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadClubs();
  }, [loadClubs]);

  const renderClub = ({ item }: { item: UserClub }) => {
    const isManager = item.role === CLUB_ROLE.MANAGER;

    return (
      <TouchableOpacity
        onPress={() => onSelectClub(item)}
        activeOpacity={0.8}
        className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden mb-3"
      >
        <View className="h-24 w-full relative">
          <Image
            source={{ uri: item.gorselUrl || DEFAULT_BANNER }}
            className="w-full h-full"
            resizeMode="cover"
          />
          <View className="absolute inset-0 bg-slate-950/35" />
          <View
            className={`absolute top-2 right-2 px-2 py-1 rounded-md border ${
              isManager
                ? "bg-amber-500/20 border-amber-500/40"
                : "bg-indigo-500/20 border-indigo-500/40"
            }`}
          >
            <Text
              className={`text-[10px] font-bold ${
                isManager ? "text-amber-300" : "text-indigo-300"
              }`}
            >
              {isManager ? "YÖNETİCİ" : "ÜYE"}
            </Text>
          </View>
        </View>

        <View className="p-4">
          <Text className="text-white font-bold text-base">{item.ad}</Text>
          <Text className="text-slate-400 text-xs mt-1 leading-4" numberOfLines={2}>
            {item.aciklama || "Açıklama eklenmemiş."}
          </Text>
          <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-slate-700/60">
            <Text className="text-slate-500 text-[10px]">
              {item.katilim_tarihi
                ? `Üyelik: ${formatShortDateTime(item.katilim_tarihi).split(" ")[0]}`
                : "Aktif üyelik"}
            </Text>
            <Text className="text-indigo-400 text-[11px] font-semibold">Kulübü Aç →</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1 bg-slate-900 p-4">
      <View className="flex-row items-center justify-between mb-4">
        <TouchableOpacity onPress={onBack}>
          <Text className="text-indigo-400 font-semibold">← Geri Dön</Text>
        </TouchableOpacity>
        <View className="bg-indigo-500/15 border border-indigo-500/30 px-3 py-1 rounded-full">
          <Text className="text-indigo-300 text-[11px] font-bold">{clubs.length} kulüp</Text>
        </View>
      </View>

      <Text className="text-2xl font-bold text-white">Kulüplerim</Text>
      <Text className="text-slate-400 text-xs mt-1 mb-4">
        Aktif üyelikleriniz ve kulüp rolleriniz
      </Text>

      {loading ? (
        <ActivityIndicator size="large" color="#6366f1" className="mt-10" />
      ) : (
        <FlatList
          data={clubs}
          keyExtractor={(item) => item.id}
          renderItem={renderClub}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              tintColor="#6366f1"
              onRefresh={() => {
                setRefreshing(true);
                loadClubs();
              }}
            />
          }
          ListEmptyComponent={
            <View className="items-center justify-center py-16">
              <Text className="text-4xl mb-3">🏛️</Text>
              <Text className="text-white font-bold text-base">Henüz kulüp üyeliğiniz yok</Text>
              <Text className="text-slate-400 text-xs text-center mt-1">
                Kulüpler ekranından ilgilendiğiniz kulüplere başvurabilirsiniz.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
