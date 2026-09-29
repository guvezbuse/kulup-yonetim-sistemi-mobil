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
} from "react-native";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { invitationService, InvitationItem } from "../services/invitationService";
import {
  membershipService,
  JoinRequestItem,
  ClubMemberDetail,
} from "../services/membershipService";
import { announcementService } from "../services/announcementService";
import { useAuthStore } from "../store/authStore";
import { ClubRole } from "../types";
import * as Clipboard from "expo-clipboard";

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

  const loadData = async () => {
    try {
      const [reqData, memData, invData] = await Promise.all([
        membershipService.getPendingRequests(clubId),
        membershipService.getClubMembers(clubId),
        invitationService.getPendingInvitations(clubId),
      ]);

      setRequests(reqData);
      setMembers(memData);

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
      const res = await (invitationService as any).resendInvitation(invItem.id);
      setCreatedInviteLink(res?.newInviteLink || "");
      setInvitedTargetEmail(invItem.email);
      Alert.alert(
        "Davet Yenilendi! 🔄 (72 Saat)",
        `Yeni davet bağlantısı:\n\n${res?.newInviteLink || ""}`,
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

    const subject = encodeURIComponent(`${clubName} Kulübü Daveti`);
    const body = encodeURIComponent(
      `Merhaba,\n\n${clubName} kadrosuna davet edildiniz!\n\nDavet bağlantınız (72 saat geçerlidir):\n${createdInviteLink}`,
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
        clubName,
        clubAnnTitle,
        clubAnnContent,
        user?.uid || "manager",
        managerName,
      );
      Alert.alert("Başarılı", "Kulüp duyurusu yayınlandı.");
      setClubAnnTitle("");
      setClubAnnContent("");
    } catch (err: any) {
      Alert.alert("Hata", err.message || "Duyuru yayınlanamadı.");
    } finally {
      setAnnPublishing(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-slate-900 px-4 pt-4" showsVerticalScrollIndicator={false}>
      <TouchableOpacity onPress={onBack} className="mb-4">
        <Text className="text-indigo-400 font-semibold">← Geri Dön</Text>
      </TouchableOpacity>

      <Text className="text-2xl font-bold text-white">{clubName}</Text>
      <Text className="text-slate-400 text-sm mb-4">Kulüp Yönetim Paneli</Text>

      {/* 1. DUYURU YAYINLAMA */}
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

      {/* 2. BEKLEYEN BAŞVURULAR */}
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

      {/* 3. KULÜP ÜYELERİ */}
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
                    className={`px-2 py-0.5 rounded ${isYonetici ? "bg-amber-500/20" : "bg-indigo-500/20"}`}
                  >
                    <Text
                      className={`text-[10px] font-bold uppercase ${isYonetici ? "text-amber-400" : "text-indigo-400"}`}
                    >
                      {isYonetici ? "yonetici" : "uye"}
                    </Text>
                  </View>
                  <View
                    className={`px-2 py-0.5 rounded ${item.status === "aktif" ? "bg-emerald-500/20" : "bg-rose-500/20"}`}
                  >
                    <Text
                      className={`text-[10px] font-bold uppercase ${item.status === "aktif" ? "text-emerald-400" : "text-rose-400"}`}
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

      {/* 4. BEKLEYEN DIŞ DAVETLER */}
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
            const isExpired = inv.son_gecerlilik_tarihi
              ? new Date(inv.son_gecerlilik_tarihi) < new Date()
              : false;
            const isInvYonetici = inv.role === "yonetici" || (inv.role as any) === "yönetici";
            return (
              <View
                key={inv.id}
                className="bg-slate-800 p-3 rounded-xl mb-2 border border-slate-700 flex-row justify-between items-center"
              >
                <View className="flex-1 mr-2">
                  <Text className="text-white font-bold text-xs">{inv.email}</Text>
                  <Text className="text-slate-400 text-[10px]">
                    Rol: {isInvYonetici ? "YONETICI" : "UYE"} •{" "}
                    {isExpired ? "Süresi Dolmuş ⚠️" : "72 Saat Geçerli"}
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
                    className="bg-amber-600/90 px-2.5 py-1.5 rounded-lg"
                  >
                    <Text className="text-white text-[10px] font-bold">
                      {isExpired ? "Yenile" : "Linki Yenile"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* 5. DAVET OLUŞTURMA */}
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
            className={`flex-1 py-2 rounded-lg items-center border ${role === "uye" ? "bg-indigo-600 border-indigo-500" : "bg-slate-800 border-slate-700"}`}
          >
            <Text className="text-white text-xs font-bold">Kulüp Üyesi</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setRole("yonetici")}
            className={`flex-1 py-2 rounded-lg items-center border ${role === "yonetici" ? "bg-amber-600 border-amber-500" : "bg-slate-800 border-slate-700"}`}
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

      {/* SAĞ ÜSTTE ÇARPI OLAN MODAL */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeMemberModal}
      >
        <View className="flex-1 bg-black/70 justify-center items-center px-6">
          <View className="bg-slate-800 w-full rounded-2xl p-5 border border-slate-700 shadow-2xl">
            {/* Modal Üst Başlık ve Sağ Üst Çarpı (✕) */}
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

            {/* İşlem Butonları */}
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
    </ScrollView>
  );
}
