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
import { formatEventDate, formatShortDateTime, toMillis } from "../lib/eventDate";
import { deleteEvent, getEvents, updateEvent } from "../services/eventService";
import { useAuthStore } from "../store/authStore";
import { EVENT_STATUS, Event } from "../types";

interface DraftsScreenProps {
  onBack: () => void;
  onEditEvent: (eventId: string) => void;
}

export default function DraftsScreen({ onBack, onEditEvent }: DraftsScreenProps) {
  const profile = useAuthStore((state) => state.profile);
  const isAdmin = profile?.is_admin === true;

  const [drafts, setDrafts] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  const loadDrafts = useCallback(async () => {
    try {
      const events = await getEvents();
      setDrafts(
        events
          .filter((event) => event.status === EVENT_STATUS.DRAFT)
          .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt)),
      );
    } catch (error) {
      Alert.alert("Hata", getErrorMessage(error, "Taslaklar yüklenemedi."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadDrafts();
    } else {
      setLoading(false);
    }
  }, [isAdmin, loadDrafts]);

  const handleDelete = (event: Event) => {
    Alert.alert("Taslağı Sil", `"${event.baslik}" kalıcı olarak silinecek. Emin misiniz?`, [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteEvent(event.id);
            setDrafts((previous) => previous.filter((item) => item.id !== event.id));
          } catch (error) {
            Alert.alert("Hata", getErrorMessage(error, "Taslak silinemedi."));
          }
        },
      },
    ]);
  };

  const handlePublish = (event: Event) => {
    Alert.alert(
      "Taslağı Yayınla",
      `"${event.baslik}" etkinliği üyelere görünür hale gelecek.`,
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Yayınla",
          onPress: async () => {
            try {
              setPublishingId(event.id);
              await updateEvent(event.id, { status: EVENT_STATUS.PUBLISHED });
              setDrafts((previous) => previous.filter((item) => item.id !== event.id));
              Alert.alert("Başarılı", "Etkinlik yayınlandı.");
            } catch (error) {
              Alert.alert("Hata", getErrorMessage(error, "Taslak yayınlanamadı."));
            } finally {
              setPublishingId(null);
            }
          },
        },
      ],
    );
  };

  if (!isAdmin) {
    return (
      <View className="flex-1 bg-slate-900 p-4">
        <TouchableOpacity onPress={onBack} className="mb-6">
          <Text className="text-indigo-400 font-semibold">← Geri Dön</Text>
        </TouchableOpacity>
        <View className="flex-1 items-center justify-center">
          <Text className="text-4xl mb-3">🔒</Text>
          <Text className="text-white font-bold text-lg">Yetkisiz Erişim</Text>
          <Text className="text-slate-400 text-sm text-center mt-1">
            Taslakları yalnızca sistem yöneticileri görüntüleyebilir.
          </Text>
        </View>
      </View>
    );
  }

  const renderDraft = ({ item }: { item: Event }) => {
    const isPublishing = publishingId === item.id;

    return (
      <View className="bg-slate-800 p-4 rounded-2xl mb-3 border border-slate-700">
        <View className="flex-row">
          <View className="flex-1 mr-3">
            <View className="flex-row items-center gap-2 mb-1">
              <View className="px-2 py-0.5 rounded bg-amber-500/20">
                <Text className="text-[10px] font-bold text-amber-400">TASLAK</Text>
              </View>
              {item.club_ad && (
                <Text className="text-[10px] text-slate-400 flex-1" numberOfLines={1}>
                  {item.club_ad}
                </Text>
              )}
            </View>

            <Text className="text-white font-bold text-base" numberOfLines={2}>
              {item.baslik}
            </Text>

            {!!item.aciklama && (
              <Text className="text-slate-400 text-xs mt-1 leading-4" numberOfLines={2}>
                {item.aciklama}
              </Text>
            )}

            <Text className="text-slate-400 text-xs mt-2">📅 {formatEventDate(item.tarih)}</Text>
            <Text className="text-slate-400 text-xs mt-0.5">📍 {item.konum || "Konum yok"}</Text>
            {!!item.createdAt && (
              <Text className="text-slate-500 text-[10px] mt-1">
                Oluşturuldu: {formatShortDateTime(item.createdAt)}
              </Text>
            )}
          </View>

          <View className="w-24 gap-2 justify-center">
            <TouchableOpacity
              onPress={() => onEditEvent(item.id)}
              className="bg-slate-700 border border-slate-600 py-2 rounded-lg items-center active:opacity-80"
            >
              <Text className="text-slate-100 text-[11px] font-semibold">✏️ Düzenle</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handlePublish(item)}
              disabled={isPublishing}
              className="bg-emerald-600 py-2 rounded-lg items-center active:opacity-80"
            >
              {isPublishing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text className="text-white text-[11px] font-semibold">🚀 Yayınla</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleDelete(item)}
              className="bg-rose-500/15 border border-rose-500/30 py-2 rounded-lg items-center active:opacity-80"
            >
              <Text className="text-rose-400 text-[11px] font-semibold">🗑️ Sil</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-slate-900 p-4">
      <View className="flex-row items-center justify-between mb-1">
        <TouchableOpacity onPress={onBack}>
          <Text className="text-indigo-400 font-semibold">← Geri Dön</Text>
        </TouchableOpacity>
        <Text className="text-slate-400 text-xs font-bold uppercase">Admin Paneli</Text>
      </View>

      <View className="flex-row items-end justify-between mb-1 mt-2">
        <View>
          <Text className="text-2xl font-bold text-white">Taslaklar</Text>
          <Text className="text-slate-400 text-xs mt-0.5">
            En yeni taslak en üstte listelenir
          </Text>
        </View>
        <View className="bg-amber-500/15 border border-amber-500/30 px-3 py-1.5 rounded-full">
          <Text className="text-amber-400 text-xs font-bold">{drafts.length} taslak</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#f59e0b" className="mt-10" />
      ) : (
        <FlatList
          className="mt-4"
          data={drafts}
          keyExtractor={(item) => item.id}
          renderItem={renderDraft}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              tintColor="#f59e0b"
              onRefresh={() => {
                setRefreshing(true);
                loadDrafts();
              }}
            />
          }
          ListEmptyComponent={
            <View className="items-center justify-center py-16">
              <Text className="text-4xl mb-3">📝</Text>
              <Text className="text-white font-bold text-base">Henüz taslak yok</Text>
              <Text className="text-slate-400 text-xs text-center mt-1">
                Yeni etkinlik oluştururken &quot;Taslak&quot; seçeneğini kullanabilirsiniz.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
