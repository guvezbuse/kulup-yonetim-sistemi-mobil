import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";

type AdminTab = "members" | "applications" | "announcements" | "events";

interface AdminPanelProps {
  onBack: () => void;
  clubName?: string;
}

export default function AdminPanelScreen({ onBack, clubName = "Yazılım Kulübü" }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>("members");

  const members = [
    { id: "1", name: "Ahmet Yılmaz", role: "Yönetici", department: "Bilgisayar Müh." },
    { id: "2", name: "Zeynep Kaya", role: "Aktif Üye", department: "Yazılım Müh." },
    { id: "3", name: "Mehmet Demir", role: "Üye", department: "Endüstri Müh." },
  ];

  const applications = [
    { id: "1", name: "Canan Çetin", email: "canan@uni.edu.tr", date: "24 Eyl 2026" },
    { id: "2", name: "Burak Şen", email: "burak@uni.edu.tr", date: "25 Eyl 2026" },
  ];

  const announcements = [
    { id: "1", title: "Genel Kurul Toplantısı", date: "28 Eylül 2026", author: "Başkan" },
    {
      id: "2",
      title: "Yeni Dönem Çalışma Grupları",
      date: "01 Ekim 2026",
      author: "Yönetim Kurulu",
    },
  ];

  const events = [
    {
      id: "1",
      title: "React Native & Mobil Atölyesi",
      date: "05 Eki 14:00",
      location: "D-201",
      participants: 42,
    },
    {
      id: "2",
      title: "Kariyer ve Teknoloji Zirvesi",
      date: "12 Eki 10:00",
      location: "Merkez Amfi",
      participants: 120,
    },
  ];

  const tabs: { key: AdminTab; label: string }[] = [
    { key: "members", label: "Üyeler" },
    { key: "applications", label: "Başvurular" },
    { key: "announcements", label: "Duyurular" },
    { key: "events", label: "Etkinlikler" },
  ];

  return (
    <View className="flex-1 bg-slate-900 px-4 pt-4">
      {/* Üst Bar */}
      <View className="flex-row items-center justify-between mb-4">
        <TouchableOpacity
          onPress={onBack}
          className="p-2 bg-slate-800 rounded-lg border border-slate-700"
        >
          <Text className="text-slate-300 font-medium">← Geri</Text>
        </TouchableOpacity>
        <Text className="text-white font-bold text-lg">{clubName}</Text>
        <Badge label="Yönetim" variant="warning" />
      </View>

      {/* Sekmeler */}
      <View className="flex-row bg-slate-800 rounded-xl p-1 mb-4 border border-slate-700">
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 rounded-lg items-center ${
              activeTab === tab.key ? "bg-indigo-600" : "bg-transparent"
            }`}
          >
            <Text
              className={`text-xs font-semibold ${
                activeTab === tab.key ? "text-white" : "text-slate-400"
              }`}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Sekme İçerikleri */}
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        {activeTab === "members" && (
          <View className="gap-3 pb-6">
            <View className="flex-row justify-between items-center mb-1">
              <Text className="text-slate-400 text-sm">Toplam {members.length} kayıtlı üye</Text>
              <Button
                title="+ Üye Ekle"
                variant="secondary"
                onPress={() => alert("Üye ekleme mock")}
              />
            </View>
            {members.map((m) => (
              <Card key={m.id} className="flex-row justify-between items-center py-3">
                <View>
                  <Text className="text-white font-bold">{m.name}</Text>
                  <Text className="text-slate-400 text-xs mt-0.5">{m.department}</Text>
                </View>
                <Badge label={m.role} variant={m.role === "Yönetici" ? "warning" : "info"} />
              </Card>
            ))}
          </View>
        )}

        {activeTab === "applications" && (
          <View className="gap-3 pb-6">
            <Text className="text-slate-400 text-sm mb-1">
              {applications.length} onay bekleyen başvuru
            </Text>
            {applications.map((app) => (
              <Card key={app.id} className="gap-2">
                <View className="flex-row justify-between items-center">
                  <Text className="text-white font-bold">{app.name}</Text>
                  <Text className="text-slate-400 text-xs">{app.date}</Text>
                </View>
                <Text className="text-slate-400 text-xs">{app.email}</Text>
                <View className="flex-row gap-2 mt-2">
                  <Button
                    title="Onayla"
                    variant="primary"
                    className="flex-1 py-2"
                    onPress={() => alert("Başvuru onaylandı (Mock)")}
                  />
                  <Button
                    title="Reddet"
                    variant="secondary"
                    className="flex-1 py-2"
                    onPress={() => alert("Başvuru reddedildi (Mock)")}
                  />
                </View>
              </Card>
            ))}
          </View>
        )}

        {activeTab === "announcements" && (
          <View className="gap-3 pb-6">
            <Button
              title="+ Yeni Duyuru Paylaş"
              variant="primary"
              className="mb-2"
              onPress={() => alert("Duyuru oluşturma (Mock)")}
            />
            {announcements.map((a) => (
              <Card key={a.id} className="gap-1">
                <Text className="text-white font-bold text-base">{a.title}</Text>
                <View className="flex-row justify-between items-center mt-2">
                  <Text className="text-slate-400 text-xs">Yazar: {a.author}</Text>
                  <Text className="text-slate-400 text-xs">{a.date}</Text>
                </View>
              </Card>
            ))}
          </View>
        )}

        {activeTab === "events" && (
          <View className="gap-3 pb-6">
            <Button
              title="+ Yeni Etkinlik Oluştur"
              variant="primary"
              className="mb-2"
              onPress={() => alert("Etkinlik oluşturma (Mock)")}
            />
            {events.map((e) => (
              <Card key={e.id} className="gap-1.5">
                <View className="flex-row justify-between items-center">
                  <Text className="text-white font-bold text-base">{e.title}</Text>
                  <Badge label={`${e.participants} Katılımcı`} variant="success" />
                </View>
                <Text className="text-indigo-400 text-xs font-semibold">{e.date}</Text>
                <Text className="text-slate-400 text-xs">Konum: {e.location}</Text>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
