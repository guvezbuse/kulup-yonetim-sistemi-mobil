import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";

interface MemberDashboardProps {
  onBack: () => void;
  userEmail?: string;
}

export default function MemberDashboardScreen({
  onBack,
  userEmail = "ogrenci@uni.edu.tr",
}: MemberDashboardProps) {
  const [joinedEvents, setJoinedEvents] = useState<{ [key: string]: boolean }>({
    "1": true,
  });

  const toggleRSVP = (id: string) => {
    setJoinedEvents((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const announcements = [
    { id: "1", title: "Bahar Şenliği Tarihleri Açıklandı", type: "system", date: "Dün" },
    { id: "2", title: "Yazılım Kulübü: Hackathon Takım Başvuruları", type: "club", date: "Bugün" },
  ];

  const events = [
    {
      id: "1",
      title: "React Native Geliştirme Çalıştayı",
      time: "28 Eyl 15:00",
      place: "Laboratuvar 3",
    },
    {
      id: "2",
      title: "Tiyatro Topluluğu: Dönem Provası",
      time: "30 Eyl 17:30",
      place: "Kültür Merkezi",
    },
  ];

  return (
    <View className="flex-1 bg-slate-900 px-4 pt-4">
      {/* Üst Bar */}
      <View className="flex-row items-center justify-between mb-4">
        <TouchableOpacity
          onPress={onBack}
          className="p-2 bg-slate-800 rounded-lg border border-slate-700"
        >
          <Text className="text-slate-300 font-medium">← Kulüplerim</Text>
        </TouchableOpacity>
        <Text className="text-white font-bold text-lg">Öğrenci Paneli</Text>
        <Badge label="Üye" variant="success" />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1 pb-6">
        {/* 1. DİJİTAL KİMLİK / QR KART */}
        <Card className="items-center py-6 mb-5 border border-indigo-500/40 bg-slate-800/90">
          <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            Üniversite Kulüpler Birliği
          </Text>
          <Text className="text-white font-extrabold text-xl mb-1">Dijital Öğrenci Kimliği</Text>
          <Text className="text-slate-400 text-xs mb-4">{userEmail}</Text>

          {/* Mock QR Placeholder */}
          <View className="w-36 h-36 bg-white rounded-2xl items-center justify-center p-2 shadow-lg mb-3">
            <View className="w-full h-full border-2 border-dashed border-slate-400 rounded-xl items-center justify-center bg-slate-100">
              <Text className="text-slate-800 font-bold text-2xl tracking-widest">[ QR ]</Text>
              <Text className="text-[10px] text-slate-500 font-medium mt-1">Giriş ve Yoklama</Text>
            </View>
          </View>
          <Badge label="Etkinlik Katılımına Hazır" variant="success" />
        </Card>

        {/* 2. DUYURULAR */}
        <Text className="text-white font-bold text-lg mb-3">Son Duyurular</Text>
        <View className="gap-2.5 mb-5">
          {announcements.map((a) => (
            <Card key={a.id} className="flex-row justify-between items-center py-3">
              <View className="flex-1 pr-2">
                <Text className="text-white font-medium text-sm">{a.title}</Text>
                <Text className="text-slate-400 text-xs mt-1">{a.date}</Text>
              </View>
              <Badge
                label={a.type === "system" ? "Sistem" : "Kulüp"}
                variant={a.type === "system" ? "neutral" : "info"}
              />
            </Card>
          ))}
        </View>

        {/* 3. ETKİNLİKLER */}
        <Text className="text-white font-bold text-lg mb-3">Yaklaşan Etkinlikler</Text>
        <View className="gap-3 pb-8">
          {events.map((e) => {
            const isAttending = joinedEvents[e.id];
            return (
              <Card key={e.id} className="gap-2">
                <Text className="text-white font-bold text-base">{e.title}</Text>
                <View className="flex-row justify-between items-center">
                  <Text className="text-indigo-400 text-xs font-semibold">{e.time}</Text>
                  <Text className="text-slate-400 text-xs">{e.place}</Text>
                </View>
                <Button
                  title={isAttending ? "✓ Katılıyorsun" : "Etkinliğe Katıl (RSVP)"}
                  variant={isAttending ? "secondary" : "primary"}
                  className="mt-2 py-2.5"
                  onPress={() => toggleRSVP(e.id)}
                />
              </Card>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
