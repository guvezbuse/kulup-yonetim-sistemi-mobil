import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { getErrorMessage } from "../lib/errors";
import { formatEventDate, toDate, toMillis } from "../lib/eventDate";
import { attendanceService } from "../services/attendanceService";
import { getEvents } from "../services/eventService";
import { useAuthStore } from "../store/authStore";
import { Event } from "../types";

interface EventHistoryScreenProps {
  onBack: () => void;
}

interface HistoryEvent extends Event {
  yoklama_alindi: boolean;
}

export default function EventHistoryScreen({ onBack }: EventHistoryScreenProps) {
  const user = useAuthStore((state) => state.user);

  const [events, setEvents] = useState<HistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadHistory = useCallback(async () => {
    if (!user) return;

    try {
      const [allEvents, attendance] = await Promise.all([
        getEvents(),
        attendanceService.getUserAttendance(user.uid),
      ]);

      const attendedEventIds = new Set(attendance.map((record) => record.event_id));

      const history = allEvents
        .filter(
          (event) => event.katilimcilar.includes(user.uid) || attendedEventIds.has(event.id),
        )
        .map((event) => ({
          ...event,
          yoklama_alindi: attendedEventIds.has(event.id),
        }))
        .sort((a, b) => toMillis(b.tarih) - toMillis(a.tarih));

      setEvents(history);
    } catch (error) {
      Alert.alert("Hata", getErrorMessage(error, "Etkinlik geçmişiniz yüklenemedi."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const renderEvent = ({ item }: { item: HistoryEvent }) => {
    const eventDate = toDate(item.tarih);
    const isUpcoming = eventDate ? eventDate.getTime() > Date.now() : false;

    return (
      <View className="bg-slate-800 border border-slate-700 rounded-2xl p-4 mb-3">
        <View className="flex-row items-center gap-2 mb-2">
          <View
            className={`px-2 py-0.5 rounded ${
              isUpcoming ? "bg-indigo-500/20" : "bg-emerald-500/20"
            }`}
          >
            <Text
              className={`text-[10px] font-bold ${
                isUpcoming ? "text-indigo-300" : "text-emerald-300"
              }`}
            >
              {isUpcoming ? "YAKLAŞAN" : "GEÇMİŞ"}
            </Text>
          </View>

          {item.yoklama_alindi && (
            <View className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/25">
              <Text className="text-[10px] font-bold text-emerald-300">✓ YOKLAMA ALINDI</Text>
            </View>
          )}
        </View>

        <Text className="text-white font-bold text-base">{item.baslik}</Text>
        <Text className="text-slate-400 text-xs mt-1">📅 {formatEventDate(item.tarih)}</Text>
        <Text className="text-slate-400 text-xs mt-0.5">
          📍 {item.konum || "Konum belirtilmedi"}
        </Text>

        <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-slate-700/60">
          <Text className="text-slate-500 text-[10px]">
            {item.club_ad || "Genel etkinlik"}
          </Text>
          <Text className="text-slate-500 text-[10px]">
            {item.katilimcilar.length} katılımcı
          </Text>
        </View>
      </View>
    );
  };

  const checkedInCount = events.filter((event) => event.yoklama_alindi).length;

  return (
    <View className="flex-1 bg-slate-900 p-4">
      <View className="flex-row items-center justify-between mb-4">
        <TouchableOpacity onPress={onBack}>
          <Text className="text-indigo-400 font-semibold">← Geri Dön</Text>
        </TouchableOpacity>
        <Text className="text-slate-400 text-xs font-bold uppercase">Kişisel Geçmiş</Text>
      </View>

      <Text className="text-2xl font-bold text-white">Etkinlik Geçmişi</Text>
      <Text className="text-slate-400 text-xs mt-1">
        Katıldığınız etkinlikler ve yoklama kayıtlarınız
      </Text>

      <View className="flex-row gap-3 mt-4 mb-4">
        <View className="flex-1 bg-slate-800 border border-slate-700 rounded-xl p-3">
          <Text className="text-slate-400 text-[10px] uppercase font-semibold">Etkinlik</Text>
          <Text className="text-white text-xl font-bold mt-0.5">{events.length}</Text>
        </View>
        <View className="flex-1 bg-emerald-500/10 border border-emerald-500/25 rounded-xl p-3">
          <Text className="text-emerald-400/80 text-[10px] uppercase font-semibold">
            Yoklama
          </Text>
          <Text className="text-emerald-300 text-xl font-bold mt-0.5">{checkedInCount}</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#6366f1" className="mt-10" />
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={renderEvent}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              tintColor="#6366f1"
              onRefresh={() => {
                setRefreshing(true);
                loadHistory();
              }}
            />
          }
          ListEmptyComponent={
            <View className="items-center justify-center py-16">
              <Text className="text-4xl mb-3">📜</Text>
              <Text className="text-white font-bold text-base">Henüz etkinlik geçmişi yok</Text>
              <Text className="text-slate-400 text-xs text-center mt-1">
                Etkinliklere katıldıkça geçmişiniz burada oluşacak.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
