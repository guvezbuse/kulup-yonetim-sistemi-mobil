import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { clubService } from "../services/clubService";
import { announcementService } from "../services/announcementService";
import { eventService, EventItem, EventStatus } from "../services/eventService";
import { userService, UserProfile } from "../services/userService";
import { useAuthStore } from "../store/authStore";
import { Club } from "../types";
import { notificationService } from "../services/notificationService";

interface AdminDashboardScreenProps {
  onBack: () => void;
  onManageClub: (club: Club) => void;
}

export default function AdminDashboardScreen({ onBack, onManageClub }: AdminDashboardScreenProps) {
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);

  const [activeModal, setActiveModal] = useState<string | null>(null);

  // Veri State'leri
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Yeni Kulüp Oluşturma State
  const [clubName, setClubName] = useState("");
  const [clubDesc, setClubDesc] = useState("");
  const [creating, setCreating] = useState(false);

  // 2. Sistem Duyurusu State
  const [annTitle, setAnnTitle] = useState("");
  const [annContent, setAnnContent] = useState("");
  const [annTarget, setAnnTarget] = useState<"tum_uyeler" | "tum_yoneticiler">("tum_uyeler");
  const [annLoading, setAnnLoading] = useState(false);

  // 3. Genel Etkinlik State'leri
  const [adminEvents, setAdminEvents] = useState<EventItem[]>([]);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDesc, setEventDesc] = useState("");
  const [eventDateTime, setEventDateTime] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [eventQuota, setEventQuota] = useState("");
  const [eventCreating, setEventCreating] = useState(false);

  // 4. Etkinlik Başvuru Modalı State'leri
  const [selectedEventApps, setSelectedEventApps] = useState<any[]>([]);
  const [appModalVisible, setAppModalVisible] = useState(false);
  const [selectedEventTitle, setSelectedEventTitle] = useState("");
  const [loadingApps, setLoadingApps] = useState(false);

  // 5. Kullanıcı & Rol Yönetimi State'leri (YENİ)
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Verileri Yükle
  const loadData = async () => {
    try {
      const [clubData, allEvents] = await Promise.all([
        clubService.getClubs(),
        eventService.getPublishedEventsForUser(user?.uid || "", true),
      ]);
      setClubs(clubData);
      const generalEvents = allEvents.filter((ev) => ev.club_id === null);
      setAdminEvents(generalEvents);
    } catch (err) {
      console.log("Veriler çekilemedi:", err);
    } finally {
      setLoading(false);
    }
  };

  // Tüm Kullanıcıları Yükle (Kullanıcı Modalı Açılınca Çağrılır)
  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const usersData = await userService.getAllUsers();
      setAllUsers(usersData);
    } catch (err) {
      Alert.alert("Hata", "Kullanıcı listesi alınamadı.");
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Modal Açıldığında İlgili Veriyi Çek
  const handleOpenModal = (modalId: string) => {
    setActiveModal(modalId);
    if (modalId === "kullanici") {
      loadUsers();
    }
  };

  // Rol Değiştirme Aksiyonu
  const handleRoleToggle = async (targetUser: UserProfile) => {
    const newRole = targetUser.role === "admin" ? "uye" : "admin";
    const actionText = newRole === "admin" ? "Sistem Admini yapmak" : "Admin yetkisini almak";

    Alert.alert(
      "Rol Değişikliği",
      `${targetUser.name || targetUser.email} kullanıcısını ${actionText} istediğinize emin misiniz?`,
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Evet, Değiştir",
          onPress: async () => {
            try {
              await userService.updateUserRole(targetUser.id, newRole);
              Alert.alert("Başarılı", "Kullanıcı rolü güncellendi.");
              loadUsers();
            } catch (e) {
              Alert.alert("Hata", "Rol güncellenemedi.");
            }
          },
        },
      ],
    );
  };

  // Filtrelenmiş Kullanıcı Listesi
  const filteredUsers = allUsers.filter((u) => {
    const fullName = `${u.name || ""} ${u.surname || ""}`.toLowerCase();
    const email = (u.email || "").toLowerCase();
    const query = searchQuery.toLowerCase();
    return fullName.includes(query) || email.includes(query);
  });

  // --- MAVİ/MOR KART TANIMLARI ---
  const adminModules = [
    {
      id: "duyuru",
      title: "Sistem Duyurusu Yayınla",
      description: "Tüm üyelere veya yöneticilere sistem duyurusu iletin",
      icon: "megaphone-outline",
      color: "#F59E0B",
    },
    {
      id: "etkinlik",
      title: "Genel Etkinlik Yönetimi",
      description: "Üniversite geneli etkinlik oluşturun ve başvuruları inceleyin",
      icon: "calendar-outline",
      color: "#A855F7",
    },
    {
      id: "kulup",
      title: "Kulüp Yönetimi & Oluşturma",
      description: "Yeni kulüp tanımlayın ve mevcut kulüpleri listeleyip yönetin",
      icon: "people-outline",
      color: "#10B981",
    },
    {
      id: "kullanici",
      title: "Kullanıcı & Rol Yönetimi",
      description: "Tüm üyeleri listeleyin, arama yapın ve admin yetkisi tanımlayın",
      icon: "person-add-outline",
      color: "#3B82F6",
    },
  ];

  // Eski Handlers (Aynen Korundu)
  const handleCreateClub = async () => {
    if (!clubName.trim()) {
      Alert.alert("Hata", "Lütfen bir kulüp adı girin.");
      return;
    }
    setCreating(true);
    try {
      await clubService.createClub(clubName.trim(), clubDesc.trim(), user?.uid || "admin");
      Alert.alert("Başarılı", "Kulüp oluşturuldu.");
      setClubName("");
      setClubDesc("");
      loadData();
    } catch (err: any) {
      Alert.alert("Hata", err.message || "Kulüp oluşturulamadı.");
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (club: Club) => {
    try {
      await clubService.toggleClubStatus(club.id, club.durum);
      loadData();
    } catch (err: any) {
      Alert.alert("Hata", err.message || "Durum güncellenemedi.");
    }
  };

  const handlePublishSystemAnnouncement = async () => {
    if (!annTitle.trim() || !annContent.trim()) {
      Alert.alert("Hata", "Lütfen başlık ve içerik alanlarını doldurun.");
      return;
    }

    setAnnLoading(true);
    try {
      const adminName = profile?.name
        ? `${profile.name} ${profile.surname || ""}`.trim()
        : "Sistem Yöneticisi";

      await announcementService.createSystemAnnouncement(
        annTitle,
        annContent,
        user?.uid || "admin",
        adminName,
        annTarget,
      );

      try {
        await notificationService.notifyAnnouncement(
          "sistem",
          annTarget,
          null,
          annTitle,
          annContent,
        );
      } catch (pushErr) {
        console.log("Sistem bildirimi gönderilirken hata oluştu:", pushErr);
      }

      Alert.alert("Başarılı", "Sistem geneli duyuru yayınlandı.");
      setAnnTitle("");
      setAnnContent("");
    } catch (e: any) {
      Alert.alert("Hata", e.message || "Duyuru yayınlanamadı.");
    } finally {
      setAnnLoading(false);
    }
  };

  const handleCreateGeneralEvent = async (asDraft: boolean = false) => {
    if (!eventTitle.trim() || !eventDesc.trim() || !eventLocation.trim() || !eventDateTime.trim()) {
      Alert.alert(
        "Hata",
        "Lütfen etkinlik adı, tarih/saat, konum ve açıklama alanlarını doldurun.",
      );
      return;
    }

    setEventCreating(true);
    try {
      await eventService.createEvent({
        club_id: null,
        club_ad: "Üniversite Geneli",
        baslik: eventTitle,
        aciklama: eventDesc,
        tarih_saat: eventDateTime,
        konum: eventLocation,
        kontenjan: eventQuota ? parseInt(eventQuota, 10) : null,
        olusturan_id: user?.uid || "admin",
        durum: asDraft ? "taslak" : "yayinlandi",
      });

      Alert.alert(
        "Başarılı 🎉",
        asDraft ? "Genel etkinlik taslak kaydedildi." : "Genel etkinlik yayınlandı!",
      );
      setEventTitle("");
      setEventDesc("");
      setEventDateTime("");
      setEventLocation("");
      setEventQuota("");
      loadData();
    } catch (err: any) {
      Alert.alert("Hata", err.message || "Etkinlik oluşturulamadı.");
    } finally {
      setEventCreating(false);
    }
  };

  const handleUpdateEventStatus = async (eventId: string, status: EventStatus) => {
    try {
      await eventService.updateEventStatus(eventId, status);
      loadData();
    } catch (err: any) {
      Alert.alert("Hata", "Durum güncellenemedi.");
    }
  };

  const handleDeleteEvent = (eventId: string, title: string) => {
    Alert.alert("Etkinliği Sil", `"${title}" kalıcı olarak silinecek. Emin misiniz?`, [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: async () => {
          try {
            await eventService.deleteEvent(eventId);
            loadData();
          } catch (e) {
            Alert.alert("Hata", "Etkinlik silinemedi.");
          }
        },
      },
    ]);
  };

  const handleViewApplications = async (eventId: string, title: string) => {
    setSelectedEventTitle(title);
    setLoadingApps(true);
    setAppModalVisible(true);
    try {
      const data = await eventService.getEventApplications(eventId);
      setSelectedEventApps(data);
    } catch (e) {
      Alert.alert("Hata", "Başvurular çekilemedi.");
    } finally {
      setLoadingApps(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-900 pt-4">
      <ScrollView className="px-4" showsVerticalScrollIndicator={false}>
        {/* Üst Bar */}
        <View className="flex-row justify-between items-center mb-4">
          <TouchableOpacity onPress={onBack}>
            <Text className="text-indigo-400 font-semibold">← Geri Dön</Text>
          </TouchableOpacity>
          <Text className="text-slate-400 text-xs font-bold uppercase">Sistem Admini</Text>
        </View>

        <Text className="text-2xl font-bold text-white mb-2">Sistem Yönetim Paneli</Text>
        <Text className="text-slate-400 text-xs mb-6">
          Yapmak istediğiniz işlem için ilgili modül kartına tıklayın.
        </Text>

        {/* MODÜLER DASHBOARD KARTLARI (GRID) */}
        <View className="gap-4 mb-6">
          {adminModules.map((module) => (
            <TouchableOpacity
              key={module.id}
              activeOpacity={0.8}
              onPress={() => handleOpenModal(module.id)}
              className="bg-slate-800 p-4 rounded-2xl border border-slate-700/80 flex-row items-center justify-between"
            >
              <View className="flex-row items-center flex-1 mr-3">
                <View
                  className="w-12 h-12 rounded-xl justify-center items-center mr-3.5"
                  style={{ backgroundColor: module.color + "20" }}
                >
                  <Ionicons name={module.icon as any} size={24} color={module.color} />
                </View>
                <View className="flex-1">
                  <Text className="text-white font-bold text-base mb-0.5">{module.title}</Text>
                  <Text className="text-slate-400 text-xs">{module.description}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* --- MODAL PENCERELERİ --- */}
      <Modal
        visible={activeModal !== null}
        animationType="slide"
        onRequestClose={() => setActiveModal(null)}
      >
        <SafeAreaView className="flex-1 bg-slate-900 px-4 pt-4">
          {/* Modal Header */}
          <View className="flex-row justify-between items-center pb-3 border-b border-slate-800 mb-4">
            <Text className="text-white font-bold text-lg">
              {adminModules.find((m) => m.id === activeModal)?.title}
            </Text>
            <TouchableOpacity
              onPress={() => setActiveModal(null)}
              className="bg-slate-800 p-2 rounded-full"
            >
              <Ionicons name="close" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
            {/* 1. DUYURU YÖNETİMİ MODALI */}
            {activeModal === "duyuru" && (
              <Card className="mb-6 border border-amber-500/30">
                <Text className="text-amber-400 font-bold text-base mb-1">
                  📢 Sistem Geneli Duyuru Yayınla
                </Text>
                <Text className="text-slate-400 text-xs mb-3">
                  Tüm yöneticilere veya tüm kullanıcılara sistem duyurusu iletin.
                </Text>

                <Input
                  label="Duyuru Başlığı"
                  placeholder="Örn: Sistem Bakım Çalışması"
                  value={annTitle}
                  onChangeText={setAnnTitle}
                />
                <Input
                  label="Duyuru İçeriği"
                  placeholder="Duyuru metnini girin..."
                  value={annContent}
                  onChangeText={setAnnContent}
                  multiline
                />

                <Text className="text-slate-300 text-xs font-semibold mb-1.5">
                  Hedef Kitle Seçimi
                </Text>
                <View className="flex-row gap-2 mb-4">
                  <TouchableOpacity
                    onPress={() => setAnnTarget("tum_uyeler")}
                    className={`flex-1 py-2 rounded-lg items-center border ${
                      annTarget === "tum_uyeler"
                        ? "bg-amber-600 border-amber-500"
                        : "bg-slate-800 border-slate-700"
                    }`}
                  >
                    <Text className="text-white text-xs font-bold">Tüm Üyeler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setAnnTarget("tum_yoneticiler")}
                    className={`flex-1 py-2 rounded-lg items-center border ${
                      annTarget === "tum_yoneticiler"
                        ? "bg-indigo-600 border-indigo-500"
                        : "bg-slate-800 border-slate-700"
                    }`}
                  >
                    <Text className="text-white text-xs font-bold">Tüm Yöneticiler</Text>
                  </TouchableOpacity>
                </View>

                <Button
                  title="Sistem Duyurusunu Yayınla"
                  onPress={handlePublishSystemAnnouncement}
                  loading={annLoading}
                />
              </Card>
            )}

            {/* 2. ETKİNLİK YÖNETİMİ MODALI */}
            {activeModal === "etkinlik" && (
              <View>
                <Card className="mb-6 border border-purple-500/40">
                  <Text className="text-purple-400 font-bold text-base mb-1">
                    🏛️ Üniversite Geneli Etkinlik Oluştur
                  </Text>
                  <Input
                    label="Etkinlik Başlığı"
                    placeholder="Örn: Kariyer Fuarı 2026"
                    value={eventTitle}
                    onChangeText={setEventTitle}
                  />
                  <Input
                    label="Tarih ve Saat"
                    placeholder="Örn: 20 Kasım 2026 - 10:00"
                    value={eventDateTime}
                    onChangeText={setEventDateTime}
                  />
                  <Input
                    label="Konum / Alan"
                    placeholder="Örn: Kongre ve Kültür Merkezi"
                    value={eventLocation}
                    onChangeText={setEventLocation}
                  />
                  <Input
                    label="Kontenjan (Opsiyonel)"
                    placeholder="Limitsiz için boş bırakın"
                    keyboardType="numeric"
                    value={eventQuota}
                    onChangeText={setEventQuota}
                  />
                  <Input
                    label="Açıklama"
                    placeholder="Etkinlik programı, konuşmacılar..."
                    value={eventDesc}
                    onChangeText={setEventDesc}
                    multiline
                  />

                  <View className="flex-row gap-2 mt-2">
                    <TouchableOpacity
                      onPress={() => handleCreateGeneralEvent(true)}
                      disabled={eventCreating}
                      className="flex-1 bg-slate-800 border border-slate-700 py-3 rounded-xl items-center"
                    >
                      <Text className="text-slate-300 font-bold text-xs">Taslak Kaydet</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleCreateGeneralEvent(false)}
                      disabled={eventCreating}
                      className="flex-1 bg-purple-600 py-3 rounded-xl items-center"
                    >
                      {eventCreating ? (
                        <ActivityIndicator color="#ffffff" size="small" />
                      ) : (
                        <Text className="text-white font-bold text-xs">
                          Genel Etkinliği Yayınla
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </Card>

                {/* Yayınlanan Etkinlik Listesi */}
                <Text className="text-base font-bold text-white mb-2">
                  Yayınlanan Genel Etkinlikler ({adminEvents.length})
                </Text>
                {adminEvents.length === 0 ? (
                  <View className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60 mb-6">
                    <Text className="text-slate-400 text-xs text-center">
                      Henüz genel etkinlik yok.
                    </Text>
                  </View>
                ) : (
                  adminEvents.map((ev) => (
                    <View
                      key={ev.id}
                      className="bg-slate-800 p-3.5 rounded-xl mb-3 border border-slate-700"
                    >
                      <View className="flex-row justify-between items-start mb-1.5">
                        <Text className="text-white font-bold text-sm flex-1 mr-2">
                          {ev.baslik}
                        </Text>
                        <View className="bg-purple-500/20 border border-purple-500/40 px-2 py-0.5 rounded">
                          <Text className="text-purple-400 text-[10px] font-bold uppercase">
                            {ev.durum}
                          </Text>
                        </View>
                      </View>
                      <Text className="text-slate-400 text-xs mb-2" numberOfLines={2}>
                        {ev.aciklama}
                      </Text>
                      <View className="flex-row justify-between text-[11px] text-slate-400 mb-3 border-t border-slate-700/50 pt-2">
                        <Text className="text-slate-400 text-[11px]">📍 {ev.konum}</Text>
                        <Text className="text-slate-400 text-[11px]">📅 {ev.tarih_saat}</Text>
                      </View>

                      <View className="flex-row gap-1.5 justify-end items-center pt-1 border-t border-slate-700/50">
                        <TouchableOpacity
                          onPress={() => handleViewApplications(ev.id, ev.baslik)}
                          className="bg-indigo-600/80 px-2.5 py-1.5 rounded-lg mr-auto"
                        >
                          <Text className="text-white text-[10px] font-bold">
                            📋 Başvuruları Gör
                          </Text>
                        </TouchableOpacity>
                        {ev.durum === "taslak" && (
                          <TouchableOpacity
                            onPress={() => handleUpdateEventStatus(ev.id, "yayinlandi")}
                            className="bg-emerald-600/80 px-2.5 py-1.5 rounded-lg"
                          >
                            <Text className="text-white text-[10px] font-bold">Yayınla</Text>
                          </TouchableOpacity>
                        )}
                        {ev.durum === "yayinlandi" && (
                          <TouchableOpacity
                            onPress={() => handleUpdateEventStatus(ev.id, "tamamlandi")}
                            className="bg-blue-600/80 px-2.5 py-1.5 rounded-lg"
                          >
                            <Text className="text-white text-[10px] font-bold">Tamamlandı Yap</Text>
                          </TouchableOpacity>
                        )}
                        {ev.durum !== "iptal" && ev.durum !== "tamamlandi" && (
                          <TouchableOpacity
                            onPress={() => handleUpdateEventStatus(ev.id, "iptal")}
                            className="bg-amber-600/80 px-2.5 py-1.5 rounded-lg"
                          >
                            <Text className="text-white text-[10px] font-bold">İptal Et</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          onPress={() => handleDeleteEvent(ev.id, ev.baslik)}
                          className="bg-rose-950/60 border border-rose-600/60 px-2 py-1.5 rounded-lg"
                        >
                          <Text className="text-rose-400 text-[10px] font-bold">Sil</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* 3. KULÜP YÖNETİMİ MODALI */}
            {activeModal === "kulup" && (
              <View>
                <Card className="mb-6">
                  <Text className="text-white font-bold text-base mb-3">Yeni Kulüp Oluştur</Text>
                  <Input
                    label="Kulüp Adı"
                    placeholder="Örn: Yazılım ve İnovasyon Topluluğu"
                    value={clubName}
                    onChangeText={setClubName}
                  />
                  <Input
                    label="Açıklama"
                    placeholder="Kulübün amacı ve faaliyet alanı..."
                    value={clubDesc}
                    onChangeText={setClubDesc}
                    multiline
                  />
                  <Button
                    title="Kulübü Oluştur"
                    onPress={handleCreateClub}
                    loading={creating}
                    className="mt-2"
                  />
                </Card>

                <Text className="text-base font-bold text-white mb-2">
                  Mevcut Kulüpler ({clubs.length})
                </Text>
                {loading ? (
                  <ActivityIndicator color="#6366f1" className="my-6" />
                ) : clubs.length === 0 ? (
                  <Text className="text-slate-400 text-xs text-center my-4">
                    Kayıtlı kulüp bulunamadı.
                  </Text>
                ) : (
                  clubs.map((item) => (
                    <Card key={item.id} className="mb-3 border border-slate-700/60">
                      <View className="flex-row justify-between items-start mb-2">
                        <View className="flex-1 mr-2">
                          <Text className="text-white font-bold text-base">{item.ad}</Text>
                          <Text className="text-slate-400 text-xs mt-1" numberOfLines={2}>
                            {item.aciklama}
                          </Text>
                        </View>
                        <View className="flex-row items-center gap-2">
                          <TouchableOpacity
                            onPress={() => {
                              setActiveModal(null);
                              onManageClub(item);
                            }}
                            className="bg-indigo-600 px-3 py-1.5 rounded-lg"
                          >
                            <Text className="text-white text-xs font-bold">Yönet</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleToggleStatus(item)}
                            className={`px-2.5 py-1.5 rounded-lg border ${
                              item.durum === "aktif"
                                ? "bg-emerald-500/20 border-emerald-500/40"
                                : "bg-rose-500/20 border-rose-500/40"
                            }`}
                          >
                            <Text
                              className={`text-xs font-bold uppercase ${
                                item.durum === "aktif" ? "text-emerald-400" : "text-rose-400"
                              }`}
                            >
                              {item.durum}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </Card>
                  ))
                )}
              </View>
            )}

            {/* 4. KULLANICI & ROL YÖNETİMİ MODALI (YENİ) */}
            {activeModal === "kullanici" && (
              <View className="mb-6">
                {/* Arama Çubuğu */}
                <Input
                  label="Kullanıcı Ara"
                  placeholder="İsim, soyisim veya e-posta girin..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />

                <Text className="text-slate-400 text-xs mb-3">
                  Sistemdeki Üyeler ({filteredUsers.length})
                </Text>

                {loadingUsers ? (
                  <ActivityIndicator color="#3b82f6" className="my-6" />
                ) : filteredUsers.length === 0 ? (
                  <View className="bg-slate-800 p-4 rounded-xl items-center my-2">
                    <Text className="text-slate-400 text-xs">
                      Aranan kriterde kullanıcı bulunamadı.
                    </Text>
                  </View>
                ) : (
                  filteredUsers.map((item) => (
                    <Card key={item.id} className="mb-3 border border-slate-700/60">
                      <View className="flex-row justify-between items-center">
                        <View className="flex-1 mr-2">
                          <Text className="text-white font-bold text-sm">
                            {item.name ? `${item.name} ${item.surname || ""}` : "İsimsiz Kullanıcı"}
                          </Text>
                          <Text className="text-slate-400 text-xs mt-0.5">{item.email}</Text>
                          <View className="flex-row items-center gap-2 mt-2">
                            <View
                              className={`px-2 py-0.5 rounded border ${
                                item.role === "admin"
                                  ? "bg-blue-500/20 border-blue-500/40"
                                  : "bg-slate-700 border-slate-600"
                              }`}
                            >
                              <Text
                                className={`text-[10px] font-bold uppercase ${
                                  item.role === "admin" ? "text-blue-400" : "text-slate-300"
                                }`}
                              >
                                {item.role === "admin" ? "Sistem Admini" : "Öğrenci / Üye"}
                              </Text>
                            </View>
                          </View>
                        </View>

                        {/* Rol Değiştirme Butonu */}
                        <TouchableOpacity
                          onPress={() => handleRoleToggle(item)}
                          className={`px-3 py-2 rounded-xl border ${
                            item.role === "admin"
                              ? "bg-rose-500/20 border-rose-500/40"
                              : "bg-blue-600 border-blue-500"
                          }`}
                        >
                          <Text
                            className={`text-xs font-bold ${
                              item.role === "admin" ? "text-rose-400" : "text-white"
                            }`}
                          >
                            {item.role === "admin" ? "Yetki Düşür" : "Admin Yap"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </Card>
                  ))
                )}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* BAŞVURULARI İNCELEME NESTED MODAL */}
      <Modal visible={appModalVisible} transparent animationType="fade">
        <View className="flex-1 bg-black/75 justify-center px-4">
          <View className="bg-slate-800 p-5 rounded-2xl border border-slate-700 max-h-[80%]">
            <View className="flex-row justify-between items-center mb-3">
              <View className="flex-1 mr-2">
                <Text className="text-white font-bold text-sm">{selectedEventTitle}</Text>
                <Text className="text-slate-400 text-[10px]">
                  Katılım Başvuruları (İlk başvuran en üstte)
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setAppModalVisible(false)}
                className="bg-slate-700 p-1.5 rounded-full"
              >
                <Text className="text-slate-300 font-bold text-xs">✕</Text>
              </TouchableOpacity>
            </View>

            {loadingApps ? (
              <ActivityIndicator color="#a855f7" className="py-6" />
            ) : selectedEventApps.length === 0 ? (
              <Text className="text-slate-400 text-xs text-center py-6">
                Henüz katılım başvurusu yapılmamış.
              </Text>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {selectedEventApps.map((app, index) => (
                  <View
                    key={app.id}
                    className="bg-slate-900 p-3 rounded-xl mb-2 border border-slate-700/70"
                  >
                    <View className="flex-row justify-between items-center mb-1">
                      <Text className="text-white font-bold text-xs">
                        #{index + 1} {app.user_name}
                      </Text>
                      <Text className="text-purple-400 text-[10px] font-semibold">{app.tarih}</Text>
                    </View>
                    <Text className="text-slate-400 text-[10px] mb-1">{app.user_email}</Text>
                    <Text className="text-slate-300 text-xs bg-slate-800/80 p-2 rounded-lg italic">
                      "{app.mesaj}"
                    </Text>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
