import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Linking,
  Modal,
  Image,
  TextInput,
} from "react-native";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { clubService } from "../services/clubService";
import { invitationService, InvitationItem } from "../services/invitationService";
import {
  membershipService,
  JoinRequestItem,
  ClubMemberDetail,
} from "../services/membershipService";
import { announcementService } from "../services/announcementService";
import { eventService, EventItem, EventStatus } from "../services/eventService";
import { useAuthStore } from "../store/authStore";
import { ClubRole } from "../types";
import * as Clipboard from "expo-clipboard";
import { notificationService } from "../services/notificationService";

interface ClubManageScreenProps {
  clubId: string;
  clubName: string;
  onBack: () => void;
}

export default function ClubManageScreen({ clubId, clubName, onBack }: ClubManageScreenProps) {
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ClubRole>("uye");
  const [loading, setLoading] = useState(false);
  const [createdInviteLink, setCreatedInviteLink] = useState<string | null>(null);
  const [invitedTargetEmail, setInvitedTargetEmail] = useState<string>("");

  // Kulüp Bilgilerini Düzenleme State'leri
  const [editAd, setEditAd] = useState(clubName || "");
  const [editAciklama, setEditAciklama] = useState("");
  const [editDetayliAciklama, setEditDetayliAciklama] = useState("");
  const [editGorselUrl, setEditGorselUrl] = useState("");
  const [savingClubInfo, setSavingClubInfo] = useState(false);

  // Başvurular, Üyeler ve Bekleyen Davetler
  const [requests, setRequests] = useState<JoinRequestItem[]>([]);
  const [members, setMembers] = useState<ClubMemberDetail[]>([]);
  const [invitations, setInvitations] = useState<InvitationItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Üye İşlem Modalı State
  const [selectedMember, setSelectedMember] = useState<ClubMemberDetail | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Duyuru State
  const [clubAnnTitle, setClubAnnTitle] = useState("");
  const [clubAnnContent, setClubAnnContent] = useState("");
  const [annPublishing, setAnnPublishing] = useState(false);

  // Etkinlik Yönetim State'leri
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDesc, setEventDesc] = useState("");
  const [eventDateTime, setEventDateTime] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [eventQuota, setEventQuota] = useState("");
  const [eventCreating, setEventCreating] = useState(false);

  // Katılımcı Modalı State'leri
  const [selectedEventApps, setSelectedEventApps] = useState<any[]>([]);
  const [appModalVisible, setAppModalVisible] = useState(false);
  const [selectedEventTitle, setSelectedEventTitle] = useState("");
  const [loadingApps, setLoadingApps] = useState(false);

  // Kalan Süre Hesaplayıcı
  const getRemainingHoursText = (expiryDateStr?: string) => {
    if (!expiryDateStr) return { text: "Belirsiz", isExpired: true };
    const diffMs = new Date(expiryDateStr).getTime() - new Date().getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours <= 0) {
      return { text: "Süresi Doldu ⚠️", isExpired: true };
    }
    return { text: `⏳ ${diffHours} saat kaldı`, isExpired: false };
  };

  const loadData = async () => {
    try {
      const [reqData, memData, invData, eventData, allClubs] = await Promise.all([
        membershipService.getPendingRequests(clubId),
        membershipService.getClubMembers(clubId),
        invitationService.getPendingInvitations(clubId),
        eventService.getEventsByClub(clubId),
        clubService.getClubs(),
      ]);

      setRequests(reqData);
      setMembers(memData);
      setEvents(eventData);

      // Mevcut kulübün verilerini çekip form alanlarına doldur
      const currentClub = allClubs.find((c) => c.id === clubId);
      if (currentClub) {
        setEditAd(currentClub.ad || clubName);
        setEditAciklama(currentClub.aciklama || "");
        setEditDetayliAciklama(
          currentClub.detayliAciklama || (currentClub as any).fullDescription || "",
        );
        setEditGorselUrl(currentClub.gorselUrl || (currentClub as any).imageUrl || "");
      }

      const memberEmails = new Set(
        memData.map((m: ClubMemberDetail) => (m.email || "").toLowerCase()),
      );
      const validInvitations: InvitationItem[] = [];

      for (const inv of invData) {
        if (memberEmails.has(inv.email.toLowerCase())) {
          await invitationService.deleteInvitation(inv.id);
        } else {
          validInvitations.push(inv);
        }
      }

      setInvitations(validInvitations);
    } catch (e) {
      console.log("Veri çekme hatası:", e);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [clubId]);

  // Kulüp Bilgilerini Kaydetme
  const handleSaveClubInfo = async () => {
    if (!editAd.trim()) {
      Alert.alert("Hata", "Kulüp adı boş bırakılamaz.");
      return;
    }

    setSavingClubInfo(true);
    try {
      await clubService.updateClub(clubId, {
        ad: editAd,
        aciklama: editAciklama,
        detayliAciklama: editDetayliAciklama,
        gorselUrl: editGorselUrl,
      });
      Alert.alert("Başarılı", "Kulüp bilgileri güncellendi.");
      loadData();
    } catch (err: any) {
      Alert.alert("Hata", err.message || "Kulüp bilgileri güncellenemedi.");
    } finally {
      setSavingClubInfo(false);
    }
  };

  // Fotoğraf Silme
  const handleDeletePhoto = async () => {
    Alert.alert("Fotoğrafı Sil", "Kulüp görselini kaldırmak istediğinize emin misiniz?", [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Evet, Sil",
        style: "destructive",
        onPress: async () => {
          try {
            await clubService.deleteClubPhoto(clubId);
            setEditGorselUrl("");
            Alert.alert("Başarılı", "Kulüp görseli silindi.");
            loadData();
          } catch (e: any) {
            Alert.alert("Hata", "Görsel silinemedi.");
          }
        },
      },
    ]);
  };

  const handleSendInvite = async () => {
    if (!email.trim() || !email.includes("@")) {
      Alert.alert("Hata", "Lütfen geçerli bir e-posta adresi girin.");
      return;
    }

    const currentTarget = email.trim();
    setLoading(true);
    setCreatedInviteLink(null);
    try {
      const res = await invitationService.inviteUserToClub(clubId, currentTarget, role);

      if (res.type === "invitation_created" && res.inviteLink) {
        setCreatedInviteLink(res.inviteLink);
        setInvitedTargetEmail(currentTarget);
        Alert.alert(
          "Davet Oluşturuldu! (72 Saat)",
          `Kullanıcı henüz kayıtlı değil. Oluşturulan davet bağlantısını kopyalayabilir veya e-posta ile gönderebilirsiniz:\n\n${res.inviteLink}`,
        );
      } else {
        Alert.alert("Başarılı", res.message);
      }

      setEmail("");
      loadData();
    } catch (err: any) {
      Alert.alert("Hata", err.message || "İşlem tamamlanamadı.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendInvite = async (invItem: InvitationItem) => {
    try {
      const res = await invitationService.resendInvitation(invItem.id);
      setCreatedInviteLink(res.newInviteLink);
      setInvitedTargetEmail(invItem.email);
      Alert.alert(
        "Davet ve Süre Yenilendi! 🔄",
        `Davet süresi +72 saat uzatıldı ve yeni bağlantı oluşturuldu:\n\n${res.newInviteLink}`,
      );
      loadData();
    } catch (err: any) {
      Alert.alert("Hata", err.message || "Davet yenilenemedi.");
    }
  };

  const handleCancelInvite = (inviteId: string, targetEmail: string) => {
    Alert.alert(
      "Daveti İptal Et",
      `${targetEmail} adresine gönderilen davet silinecek. Onaylıyor musunuz?`,
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Evet, İptal Et",
          style: "destructive",
          onPress: async () => {
            try {
              await invitationService.deleteInvitation(inviteId);
              loadData();
            } catch (err: any) {
              Alert.alert("Hata", "Davet silinemedi.");
            }
          },
        },
      ],
    );
  };

  const handleSendEmailInvite = async () => {
    if (!createdInviteLink || !invitedTargetEmail) return;

    const subject = encodeURIComponent(`${editAd || clubName} Kulübü Daveti`);
    const body = encodeURIComponent(
      `Merhaba,\n\n${editAd || clubName} kadrosuna davet edildiniz!\n\nDavet bağlantınız (72 saat geçerlidir):\n${createdInviteLink}`,
    );
    const mailUrl = `mailto:${invitedTargetEmail}?subject=${subject}&body=${body}`;

    const canOpen = await Linking.canOpenURL(mailUrl);
    if (canOpen) {
      await Linking.openURL(mailUrl);
    } else {
      Alert.alert("Hata", "E-posta uygulaması bulunamadı.");
    }
  };

  const handleApprove = async (item: JoinRequestItem) => {
    try {
      await membershipService.approveRequest(item.id, clubId, item.user_id);
      Alert.alert("Onaylandı", `${item.user_email} kulübe kabul edildi.`);
      loadData();
    } catch (e: any) {
      Alert.alert("Hata", e.message || "Onaylanamadı.");
    }
  };

  const handleReject = async (item: JoinRequestItem) => {
    try {
      await membershipService.rejectRequest(item.id, clubId, item.user_id);
      Alert.alert("Reddedildi", `${item.user_email} başvurusu reddedildi.`);
      loadData();
    } catch (e: any) {
      Alert.alert("Hata", e.message || "Reddedilemedi.");
    }
  };

  // Modal İşlemleri
  const openMemberModal = (member: ClubMemberDetail) => {
    setSelectedMember(member);
    setModalVisible(true);
  };

  const closeMemberModal = () => {
    setModalVisible(false);
    setSelectedMember(null);
  };

  const handleToggleStatus = async () => {
    if (!selectedMember) return;
    try {
      await membershipService.toggleMemberStatus(
        selectedMember.membershipId,
        selectedMember.status,
      );
      closeMemberModal();
      loadData();
    } catch (err: any) {
      Alert.alert("Hata", "Durum güncellenemedi.");
    }
  };

  const handleToggleRole = async () => {
    if (!selectedMember) return;
    try {
      await membershipService.toggleMemberRole(selectedMember.membershipId, selectedMember.role);
      closeMemberModal();
      loadData();
    } catch (err: any) {
      Alert.alert("Hata", "Rol güncellenemedi.");
    }
  };

  const handleDeleteMember = () => {
    if (!selectedMember) return;
    Alert.alert(
      "Üyeyi Çıkar",
      `${selectedMember.name || selectedMember.email} kulüpten tamamen silinecek. Onaylıyor musunuz?`,
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Evet, Sil",
          style: "destructive",
          onPress: async () => {
            try {
              await membershipService.removeMemberFromClub(selectedMember.membershipId);
              closeMemberModal();
              loadData();
            } catch (e: any) {
              Alert.alert("Hata", e.message || "Üye silinemedi.");
            }
          },
        },
      ],
    );
  };

  const handlePublishClubAnnouncement = async () => {
    if (!clubAnnTitle.trim() || !clubAnnContent.trim()) {
      Alert.alert("Hata", "Lütfen duyuru başlığı ve içeriği girin.");
      return;
    }

    setAnnPublishing(true);
    try {
      const managerName = profile?.name
        ? `${profile.name} ${profile.surname || ""}`.trim()
        : "Kulüp Yöneticisi";

      await announcementService.createClubAnnouncement(
        clubId,
        editAd || clubName,
        clubAnnTitle,
        clubAnnContent,
        user?.uid || "manager",
        managerName,
      );

      try {
        await notificationService.notifyAnnouncement(
          "kulup",
          "kulup_uyeleri",
          clubId,
          `${editAd || clubName}: ${clubAnnTitle}`,
          clubAnnContent,
        );
      } catch (pushErr) {
        console.log("Kulüp duyuru bildirimi hatası:", pushErr);
      }

      Alert.alert("Başarılı", "Kulüp duyurusu yayınlandı.");
      setClubAnnTitle("");
      setClubAnnContent("");
    } catch (err: any) {
      Alert.alert("Hata", err.message || "Duyuru yayınlanamadı.");
    } finally {
      setAnnPublishing(false);
    }
  };

  // Etkinlik İşlemleri
  const handleCreateEvent = async (asDraft: boolean = false) => {
    if (!eventTitle.trim() || !eventDesc.trim() || !eventLocation.trim() || !eventDateTime.trim()) {
      Alert.alert(
        "Hata",
        "Lütfen etkinlik adı, tarih/saat, konum ve açıklama alanlarını doldurun.",
      );
      return;
    }

    setEventCreating(true);
    try {
      const eventStatus = asDraft ? "taslak" : "yayinlandi";

      await eventService.createEvent({
        club_id: clubId,
        club_ad: editAd || clubName,
        baslik: eventTitle,
        aciklama: eventDesc,
        tarih_saat: eventDateTime,
        konum: eventLocation,
        kontenjan: eventQuota ? parseInt(eventQuota, 10) : null,
        olusturan_id: user?.uid || "manager",
        durum: eventStatus,
      });

      if (!asDraft) {
        try {
          await notificationService.notifyEventPublished(clubId, eventTitle, eventDateTime);
        } catch (pushErr) {
          console.log("Etkinlik bildirimi gönderilirken hata:", pushErr);
        }
      }

      Alert.alert(
        "Başarılı",
        asDraft
          ? "Etkinlik taslak olarak kaydedildi."
          : "Etkinlik yayınlandı ve üyelere bildirildi.",
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

  const handleUpdateEventStatus = async (eventId: string, newStatus: EventStatus) => {
    try {
      await eventService.updateEventStatus(eventId, newStatus);
      loadData();
    } catch (err: any) {
      Alert.alert("Hata", err.message || "Etkinlik durumu güncellenemedi.");
    }
  };

  const handleDeleteEvent = (eventId: string, title: string) => {
    Alert.alert("Etkinliği Sil", `"${title}" etkinliğini silmek istediğinize emin misiniz?`, [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: async () => {
          try {
            await eventService.deleteEvent(eventId);
            loadData();
          } catch (err: any) {
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

  const getStatusBadge = (durum: EventStatus) => {
    switch (durum) {
      case "yayinlandi":
        return {
          text: "Yayınlandı",
          bg: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
        };
      case "tamamlandi":
        return { text: "Tamamlandı", bg: "bg-slate-500/20 text-slate-400 border-slate-500/40" };
      case "iptal":
        return { text: "İptal", bg: "bg-rose-500/20 text-rose-400 border-rose-500/40" };
      default:
        return { text: "Taslak", bg: "bg-amber-500/20 text-amber-400 border-amber-500/40" };
    }
  };

  return (
    <ScrollView className="flex-1 bg-slate-900 px-4 pt-4" showsVerticalScrollIndicator={false}>
      <TouchableOpacity onPress={onBack} className="mb-4">
        <Text className="text-indigo-400 font-semibold">← Geri Dön</Text>
      </TouchableOpacity>

      <Text className="text-2xl font-bold text-white">{editAd || clubName}</Text>
      <Text className="text-slate-400 text-sm mb-4">Kulüp Yönetim Paneli</Text>

      {/* 1. KULÜP BİLGİLERİNİ DÜZENLE (GÖRSEL / AÇIKLAMA / BAŞLIK) */}
      <Card className="mb-6 border border-emerald-500/40 bg-emerald-950/10">
        <Text className="text-emerald-400 font-bold text-base mb-1">
          ⚙ Kulüp Bilgilerini Düzenle
        </Text>
        <Text className="text-slate-400 text-xs mb-4">
          Kulüp başlığını, kısa ve detaylı açıklamayı ile kapak fotoğrafını güncelleyin.
        </Text>

        <Input
          label="Kulüp Adı / Başlığı"
          placeholder="Örn: Tiyatro Kulübü"
          value={editAd}
          onChangeText={setEditAd}
        />
        <Input
          label="Kısa Açıklama (Listede Görünür)"
          placeholder="Örn: Sahne sanatları ve oyunculuk atölyeleri"
          value={editAciklama}
          onChangeText={setEditAciklama}
        />

        <View className="mb-3">
          <Text className="text-slate-300 text-xs font-semibold mb-1">
            Kulüp Hakkında (Detay Sayfası Metni)
          </Text>
          <TextInput
            value={editDetayliAciklama}
            onChangeText={setEditDetayliAciklama}
            placeholder="Kulübün vizyonu, misyonu ve detaylı tanıtım metni..."
            placeholderTextColor="#64748b"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            className="bg-slate-800 text-white rounded-xl p-3 text-xs border border-slate-700"
          />
        </View>

        <Input
          label="Fotoğraf / Banner Bağlantısı (URL)"
          placeholder="https://images.unsplash.com/..."
          value={editGorselUrl}
          onChangeText={setEditGorselUrl}
        />

        {/* Görsel Önizleme ve Fotoğraf Silme/Değiştirme */}
        {editGorselUrl ? (
          <View className="mb-4">
            <Text className="text-slate-400 text-xs mb-2 font-semibold">
              Mevcut Görsel Önizlemesi:
            </Text>
            <View className="w-full h-36 rounded-xl overflow-hidden border border-slate-700">
              <Image source={{ uri: editGorselUrl }} className="w-full h-full" resizeMode="cover" />
            </View>
            <TouchableOpacity
              onPress={handleDeletePhoto}
              className="bg-rose-950/60 border border-rose-600/60 py-2 rounded-xl items-center mt-2"
            >
              <Text className="text-rose-400 text-xs font-bold">🗑 Fotoğrafı Kaldır / Sil</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <Button
          title="Kulüp Bilgilerini Kaydet"
          onPress={handleSaveClubInfo}
          loading={savingClubInfo}
          className="bg-emerald-600 active:bg-emerald-700 mt-1"
        />
      </Card>

      {/* 2. ETKİNLİK OLUŞTURMA & YÖNETİMİ */}
      <Card className="mb-6 border border-purple-500/40">
        <Text className="text-purple-400 font-bold text-base mb-1">
          🗓️ Yeni Kulüp Etkinliği Oluştur
        </Text>
        <Text className="text-slate-400 text-xs mb-3">
          Kontenjan boş bırakılırsa limitsiz olarak kaydedilir.
        </Text>

        <Input
          label="Etkinlik Başlığı"
          placeholder="Örn: Yapay Zeka Atölyesi"
          value={eventTitle}
          onChangeText={setEventTitle}
        />
        <Input
          label="Tarih ve Saat"
          placeholder="Örn: 15 Ekim 2026 - 14:00"
          value={eventDateTime}
          onChangeText={setEventDateTime}
        />
        <Input
          label="Konum / Salon"
          placeholder="Örn: D-Block Konferans Salonu"
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
          placeholder="Etkinlik akışı, gereksinimler..."
          value={eventDesc}
          onChangeText={setEventDesc}
          multiline
        />

        <View className="flex-row gap-2 mt-2">
          <TouchableOpacity
            onPress={() => handleCreateEvent(true)}
            disabled={eventCreating}
            className="flex-1 bg-slate-800 border border-slate-700 py-3 rounded-xl items-center"
          >
            <Text className="text-slate-300 font-bold text-xs">Taslak Kaydet</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleCreateEvent(false)}
            disabled={eventCreating}
            className="flex-1 bg-purple-600 active:bg-purple-700 py-3 rounded-xl items-center"
          >
            {eventCreating ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text className="text-white font-bold text-xs">Etkinliği Yayınla</Text>
            )}
          </TouchableOpacity>
        </View>
      </Card>

      {/* 3. KULÜBÜN ETKİNLİK LİSTESİ & DURUM DEĞİŞTİRME */}
      <Text className="text-base font-bold text-white mb-2">
        Kulüp Etkinlikleri ({events.length})
      </Text>
      <View className="mb-6">
        {loadingData ? (
          <ActivityIndicator color="#8b5cf6" />
        ) : events.length === 0 ? (
          <View className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
            <Text className="text-slate-400 text-xs text-center">
              Henüz etkinlik oluşturulmadı.
            </Text>
          </View>
        ) : (
          events.map((ev) => {
            const badge = getStatusBadge(ev.durum);
            return (
              <View
                key={ev.id}
                className="bg-slate-800 p-3.5 rounded-xl mb-3 border border-slate-700"
              >
                <View className="flex-row justify-between items-start mb-1.5">
                  <Text className="text-white font-bold text-sm flex-1 mr-2">{ev.baslik}</Text>
                  <View className={`px-2 py-0.5 rounded border ${badge.bg}`}>
                    <Text className="text-[10px] font-bold uppercase">{badge.text}</Text>
                  </View>
                </View>

                <Text className="text-slate-400 text-xs mb-2" numberOfLines={2}>
                  {ev.aciklama}
                </Text>

                <View className="flex-row justify-between text-[11px] text-slate-400 mb-3 border-t border-slate-700/50 pt-2">
                  <Text className="text-slate-400 text-[11px]">📍 {ev.konum}</Text>
                  <Text className="text-slate-400 text-[11px]">📅 {ev.tarih_saat}</Text>
                  <Text className="text-slate-400 text-[11px]">
                    👥 {ev.kontenjan ? `${ev.kontenjan} Kişi` : "Limitsiz"}
                  </Text>
                </View>

                {/* Yaşam Döngüsü Butonları */}
                <View className="flex-row gap-1.5 justify-end items-center pt-1 border-t border-slate-700/50">
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
                  <TouchableOpacity
                    onPress={() => handleViewApplications(ev.id, ev.baslik)}
                    className="bg-indigo-600/80 px-2.5 py-1.5 rounded-lg mr-auto"
                  >
                    <Text className="text-white text-[10px] font-bold">📋 Başvuruları Gör</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* 4. DUYURU YAYINLAMA */}
      <Card className="mb-6 border border-indigo-500/30">
        <Text className="text-indigo-400 font-bold text-base mb-1">
          📢 Kulüp Üyelerine Duyuru Yayınla
        </Text>
        <Text className="text-slate-400 text-xs mb-3">
          Bu duyuru yalnızca kulüp üyelerine iletilir.
        </Text>
        <Input
          label="Duyuru Başlığı"
          placeholder="Örn: Tanışma Toplantısı"
          value={clubAnnTitle}
          onChangeText={setClubAnnTitle}
        />
        <Input
          label="Duyuru İçeriği"
          placeholder="Detaylar..."
          value={clubAnnContent}
          onChangeText={setClubAnnContent}
          multiline
        />
        <Button
          title="Kulüp Duyurusunu Yayınla"
          onPress={handlePublishClubAnnouncement}
          loading={annPublishing}
          className="mt-1"
        />
      </Card>

      {/* 5. BEKLEYEN BAŞVURULAR */}
      <Text className="text-base font-bold text-white mb-2">
        Bekleyen Başvurular ({requests.length})
      </Text>
      <View className="mb-6">
        {loadingData ? (
          <ActivityIndicator color="#6366f1" />
        ) : requests.length === 0 ? (
          <View className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
            <Text className="text-slate-400 text-xs text-center">Bekleyen başvuru yok.</Text>
          </View>
        ) : (
          requests.map((item) => (
            <View
              key={item.id}
              className="bg-slate-800 p-3 rounded-xl mb-2 border border-slate-700 flex-row justify-between items-center"
            >
              <View className="flex-1 mr-2">
                <Text className="text-white font-semibold text-xs">
                  {item.user_name || item.user_email}
                </Text>
                <Text className="text-slate-400 text-[10px]">{item.user_email}</Text>
                {item.mesaj ? (
                  <Text className="text-slate-300 text-[11px] italic mt-0.5">"{item.mesaj}"</Text>
                ) : null}
              </View>
              <View className="flex-row gap-1.5">
                <TouchableOpacity
                  onPress={() => handleApprove(item)}
                  className="bg-emerald-600 px-2.5 py-1.5 rounded-lg"
                >
                  <Text className="text-white text-[11px] font-bold">Onayla</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleReject(item)}
                  className="bg-rose-600 px-2.5 py-1.5 rounded-lg"
                >
                  <Text className="text-white text-[11px] font-bold">Reddet</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>

      {/* 6. KULÜP ÜYELERİ */}
      <Text className="text-base font-bold text-white mb-2">Kulüp Üyeleri ({members.length})</Text>
      <View className="mb-6">
        {loadingData ? (
          <ActivityIndicator color="#6366f1" />
        ) : members.length === 0 ? (
          <View className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
            <Text className="text-slate-400 text-xs text-center">Henüz kayıtlı üye yok.</Text>
          </View>
        ) : (
          members.map((item) => {
            const isYonetici = item.role === "yonetici" || (item.role as any) === "yönetici";
            return (
              <TouchableOpacity
                key={item.membershipId}
                onPress={() => openMemberModal(item)}
                activeOpacity={0.7}
                className="bg-slate-800 p-3 rounded-xl mb-2 border border-slate-700/80 flex-row justify-between items-center"
              >
                <View className="flex-1 mr-2">
                  <Text className="text-white font-bold text-xs">{item.name || item.email}</Text>
                  <Text className="text-slate-400 text-[10px]">{item.email}</Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <View
                    className={`px-2 py-0.5 rounded ${
                      isYonetici ? "bg-amber-500/20" : "bg-indigo-500/20"
                    }`}
                  >
                    <Text
                      className={`text-[10px] font-bold uppercase ${
                        isYonetici ? "text-amber-400" : "text-indigo-400"
                      }`}
                    >
                      {isYonetici ? "yonetici" : "uye"}
                    </Text>
                  </View>
                  <View
                    className={`px-2 py-0.5 rounded ${
                      item.status === "aktif" ? "bg-emerald-500/20" : "bg-rose-500/20"
                    }`}
                  >
                    <Text
                      className={`text-[10px] font-bold uppercase ${
                        item.status === "aktif" ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {item.status}
                    </Text>
                  </View>
                  <Text className="text-slate-500 text-xs font-bold ml-1">⋮</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>

      {/* 7. BEKLEYEN DIŞ DAVETLER */}
      <Text className="text-base font-bold text-white mb-2">
        Bekleyen Dış Davetler ({invitations.length})
      </Text>
      <View className="mb-6">
        {loadingData ? (
          <ActivityIndicator color="#6366f1" />
        ) : invitations.length === 0 ? (
          <View className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
            <Text className="text-slate-400 text-xs text-center">
              Bekleyen dış davet bulunmuyor.
            </Text>
          </View>
        ) : (
          invitations.map((inv) => {
            const { text: statusText, isExpired } = getRemainingHoursText(
              inv.son_gecerlilik_tarihi,
            );
            const isInvYonetici = inv.role === "yonetici" || (inv.role as any) === "yönetici";
            return (
              <View
                key={inv.id}
                className="bg-slate-800 p-3 rounded-xl mb-2 border border-slate-700 flex-row justify-between items-center"
              >
                <View className="flex-1 mr-2">
                  <Text className="text-white font-bold text-xs">{inv.email}</Text>
                  <Text className="text-slate-400 text-[10px] mt-0.5">
                    Rol: {isInvYonetici ? "YÖNETİCİ" : "ÜYE"} •{" "}
                    <Text
                      className={
                        isExpired ? "text-rose-400 font-bold" : "text-amber-400 font-semibold"
                      }
                    >
                      {statusText}
                    </Text>
                  </Text>
                </View>
                <View className="flex-row items-center gap-1.5">
                  <TouchableOpacity
                    onPress={() => handleCancelInvite(inv.id, inv.email)}
                    className="bg-rose-950/50 border border-rose-600/60 px-2 py-1.5 rounded-lg"
                  >
                    <Text className="text-rose-400 text-[10px] font-bold">İptal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleResendInvite(inv)}
                    className={`px-2.5 py-1.5 rounded-lg ${
                      isExpired ? "bg-rose-600" : "bg-amber-600/90"
                    }`}
                  >
                    <Text className="text-white text-[10px] font-bold">
                      {isExpired ? "Yeniden Gönder" : "Süreyi & Linki Yenile"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* 8. DAVET OLUŞTURMA */}
      <Card className="mb-10">
        <Text className="text-white font-bold text-sm mb-1">E-Posta ile Üye / Yönetici Ekle</Text>
        <Text className="text-slate-400 text-xs mb-3">
          Öğrenci sistemde yoksa 72 saat geçerli davet bağlantısı üretilir.
        </Text>
        <Input
          label="Öğrenci E-Postası"
          placeholder="ogrenci@universite.edu.tr"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <View className="flex-row gap-3 mb-4 mt-1">
          <TouchableOpacity
            onPress={() => setRole("uye")}
            className={`flex-1 py-2 rounded-lg items-center border ${
              role === "uye" ? "bg-indigo-600 border-indigo-500" : "bg-slate-800 border-slate-700"
            }`}
          >
            <Text className="text-white text-xs font-bold">Kulüp Üyesi</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setRole("yonetici")}
            className={`flex-1 py-2 rounded-lg items-center border ${
              role === "yonetici"
                ? "bg-amber-600 border-amber-500"
                : "bg-slate-800 border-slate-700"
            }`}
          >
            <Text className="text-white text-xs font-bold">Kulüp Yöneticisi</Text>
          </TouchableOpacity>
        </View>
        <Button
          title={role === "yonetici" ? "Yönetici Olarak Davet Et" : "Üye Olarak Davet Et"}
          onPress={handleSendInvite}
          loading={loading}
        />

        {createdInviteLink && (
          <View className="mt-4 p-3 bg-amber-950/40 border border-amber-500/50 rounded-xl">
            <Text className="text-amber-400 font-bold text-xs mb-2">
              🔗 Oluşturulan Davet Linki (72 Saat Geçerli):
            </Text>
            <View className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-700 mb-2.5">
              <Text numberOfLines={2} className="text-slate-300 text-[11px] font-mono">
                {createdInviteLink}
              </Text>
            </View>
            <View className="gap-2">
              <TouchableOpacity
                onPress={async () => {
                  await Clipboard.setStringAsync(createdInviteLink);
                  Alert.alert("Kopyalandı! 📋", "Davet bağlantısı panoya kopyalandı.");
                }}
                className="bg-amber-600/80 py-2.5 rounded-lg items-center flex-row justify-center gap-1.5"
              >
                <Text className="text-white text-xs font-bold">📋 Bağlantıyı Panoya Kopyala</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSendEmailInvite}
                className="bg-indigo-600 py-2.5 rounded-lg items-center flex-row justify-center gap-1.5"
              >
                <Text className="text-white text-xs font-bold">✉️ E-Posta ile Gönder</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Card>

      {/* SAĞ ÜSTTE ÇARPI OLAN ÜYE YÖNETİM MODALI */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeMemberModal}
      >
        <View className="flex-1 bg-black/70 justify-center items-center px-6">
          <View className="bg-slate-800 w-full rounded-2xl p-5 border border-slate-700 shadow-2xl">
            <View className="flex-row justify-between items-start mb-4">
              <View className="flex-1 mr-3">
                <Text className="text-white text-base font-bold">
                  {selectedMember?.name || selectedMember?.email}
                </Text>
                <Text className="text-slate-400 text-xs mt-0.5">{selectedMember?.email}</Text>
                <Text className="text-indigo-400 text-xs font-semibold mt-1">
                  Rol: {selectedMember?.role?.toUpperCase()} • Durum:{" "}
                  {selectedMember?.status?.toUpperCase()}
                </Text>
              </View>
              <TouchableOpacity
                onPress={closeMemberModal}
                className="bg-slate-700/60 p-2 rounded-full w-8 h-8 items-center justify-center"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text className="text-slate-300 font-bold text-sm">✕</Text>
              </TouchableOpacity>
            </View>

            <View className="gap-2.5 mt-2">
              <TouchableOpacity
                onPress={handleToggleRole}
                className="bg-indigo-600/90 active:bg-indigo-600 py-3 rounded-xl items-center"
              >
                <Text className="text-white font-bold text-xs">
                  {selectedMember?.role === "yonetici" ? "Üyeliğe Düşür" : "Yönetici Yap"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleToggleStatus}
                className="bg-slate-700 active:bg-slate-600 py-3 rounded-xl items-center"
              >
                <Text className="text-slate-200 font-bold text-xs">
                  {selectedMember?.status === "aktif" ? "Üyeyi Pasife Al" : "Üyeyi Aktif Yap"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleDeleteMember}
                className="bg-rose-950/60 border border-rose-600/50 py-3 rounded-xl items-center mt-1"
              >
                <Text className="text-rose-400 font-bold text-xs">Kulüpten Çıkar (Sil)</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* KATILIM BAŞVURULARI MODALI */}
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
              <ActivityIndicator color="#6366f1" className="py-6" />
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
                      <Text className="text-indigo-400 text-[10px] font-semibold">{app.tarih}</Text>
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
    </ScrollView>
  );
}
