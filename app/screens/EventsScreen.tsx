import React from "react";
import { View, Text, ScrollView } from "react-native";

export default function EventsScreen() {
  return (
    <ScrollView className="flex-1 bg-slate-900 px-4 pt-4" showsVerticalScrollIndicator={false}>
      <Text className="text-2xl font-bold text-white mb-1">Etkinlikler</Text>
      <Text className="text-slate-400 text-xs mb-5">
        Kulüplerin yaklaşan ve geçmiş etkinlikleri
      </Text>

      <View className="bg-slate-800/60 p-6 rounded-2xl border border-slate-700/60 items-center justify-center">
        <Text className="text-slate-300 font-semibold text-sm mb-1">📅 Etkinlik Listesi</Text>
        <Text className="text-slate-400 text-xs text-center">
          Yaklaşan etkinlikler bu ekranda görüntülenecek.
        </Text>
      </View>
    </ScrollView>
  );
}
