import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Linking,
} from "react-native";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { invitationService } from "../services/invitationService";
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
  const [role, setRole] = useState<ClubRole>("üye");
  const [loading, setLoading] = useState(false);
  const [createdInviteLink, setCreatedInviteLink] = useState<string | null>(null);
  const [invitedTargetEmail, setInvitedTargetEmail] = useState<string>("");
  const [invitations, setInvitations] = useState<any[]>([]);

  // Başvurular ve Üyeler State'leri
  const [requests, setRequests] = useState<JoinRequestItem[]>([]);
  const [members, setMembers] = useState<ClubMemberDetail[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Kulüp Duyurusu State (Şartname 2.2 & 5)
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
      setInvitations(invData);
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

      if (res.type === "invited" && res.inviteLink) {
        setCreatedInviteLink(res.inviteLink);
        setInvitedTargetEmail(currentTarget);
        Alert.alert(
          "Davet Oluşturuldu! (72 Saat)",
          `Kullanıcı henüz kayıtlı değil. Oluşturulan davet bağlantısını kopyalayabilir veya e-posta uygulamanızla doğrudan gönderebilirsiniz:\n\n${res.inviteLink}`,
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

  const handleSendEmailInvite = async () => {
    if (!createdInviteLink || !invitedTargetEmail) return;

    const subject = encodeURIComponent(`${clubName} Kulübü Üyelik / Görev Daveti`);
    const body = encodeURIComponent(
      `Merhaba,\n\n${clubName} kulübümüzün kadrosuna davet edildiniz!\n\nDavet bağlantınız (72 saat geçerlidir):\n${createdInviteLink}\n\nBağlantıya tıklayarak hesabınızı oluşturabilir ve kulübümüze katılabilirsiniz.\n\nİyi çalışmalar!`,
    );
    const handleResendInvite = async (invItem: any) => {
      try {
        const res = await invitationService.resendInvitation(invItem.id);
        setCreatedInviteLink(res.newInviteLink);
        setInvitedTargetEmail(invItem.email);
        Alert.alert(
          "Yeni Davet Linki Hazır! (72 Saat)",
          `Token yenilendi:\n\n${res.newInviteLink}`,
        );
        loadData();
      } catch (err: any) {
        Alert.alert("Hata", err.message || "Davet yenilenemedi.");
      }
    };

    const mailUrl = `mailto:${invitedTargetEmail}?subject=${subject}&body=${body}`;

    const canOpen = await Linking.canOpenURL(mailUrl);
    if (canOpen) {
      await Linking.openURL(mailUrl);
    } else {
      Alert.alert("Hata", "Cihazınızda e-posta gönderebilecek bir uygulama bulunamadı.");
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

  const handleMemberAction = (member: ClubMemberDetail) => {
    Alert.alert(
      member.name || member.email,
      `Mevcut Rol: ${member.role.toUpperCase()} | Durum: ${member.status.toUpperCase()}\nYapmak istediğiniz işlemi seçin:`,
      [
        {
          text: member.status === "aktif" ? "Pasife Al" : "Aktif Yap",
          onPress: async () => {
            try {
              await membershipService.toggleMemberStatus(member.membershipId, member.status);
              loadData();
            } catch (err: any) {
              Alert.alert("Hata", "Durum güncellenemedi.");
            }
          },
        },
        {
          text: member.role === "üye" ? "Yönetici Yap" : "Üyeliğe Düşür",
          onPress: async () => {
            try {
              await membershipService.toggleMemberRole(member.membershipId, member.role);
              loadData();
            } catch (err: any) {
              Alert.alert("Hata", "Rol güncellenemedi.");
            }
          },
        },
        { text: "Vazgeç", style: "cancel" },
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
      Alert.alert("Başarılı", "Kulüp duyurusu aktif üyelere yayınlandı.");
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

      {/* 1. KULÜP DUYURUSU YAYINLAMA */}
      <Card className="mb-6 border border-indigo-500/30">
        <Text className="text-indigo-400 font-bold text-base mb-1">
          📢 Kulüp Üyelerine Duyuru Yayınla
        </Text>
        <Text className="text-slate-400 text-xs mb-3">
          Bu duyuru yalnızca bu kulübün aktif üyelerine ve yöneticilerine iletilir.
        </Text>
        <Input
          label="Duyuru Başlığı"
          placeholder="Örn: Haftalık Tanışma Toplantısı"
          value={clubAnnTitle}
          onChangeText={setClubAnnTitle}
        />
        <Input
          label="Duyuru İçeriği"
          placeholder="Toplantı yeri, saati ve detayları..."
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

      {/* 2. Bekleyen Katılım Başvuruları */}
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

      {/* 3. Kulüp Üyeleri ve Yöneticileri Listesi */}
      <Text className="text-base font-bold text-white mb-2">Kulüp Üyeleri ({members.length})</Text>
      <View className="mb-6">
        {loadingData ? (
          <ActivityIndicator color="#6366f1" />
        ) : members.length === 0 ? (
          <View className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
            <Text className="text-slate-400 text-xs text-center">Henüz kayıtlı üye yok.</Text>
          </View>
        ) : (
          members.map((item) => (
            <TouchableOpacity
              key={item.membershipId}
              onPress={() => handleMemberAction(item)}
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
                    item.role === "yönetici" ? "bg-amber-500/20" : "bg-indigo-500/20"
                  }`}
                >
                  <Text
                    className={`text-[10px] font-bold uppercase ${
                      item.role === "yönetici" ? "text-amber-400" : "text-indigo-400"
                    }`}
                  >
                    {item.role}
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
          ))
        )}
      </View>

      {/* 4. Doğrudan Üye / Yönetici Ekleme & Davet Linki Üretme */}
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
            onPress={() => setRole("üye")}
            className={`flex-1 py-2 rounded-lg items-center border ${
              role === "üye" ? "bg-indigo-600 border-indigo-500" : "bg-slate-800 border-slate-700"
            }`}
          >
            <Text className="text-white text-xs font-bold">Kulüp Üyesi</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setRole("yönetici")}
            className={`flex-1 py-2 rounded-lg items-center border ${
              role === "yönetici"
                ? "bg-amber-600 border-amber-500"
                : "bg-slate-800 border-slate-700"
            }`}
          >
            <Text className="text-white text-xs font-bold">Kulüp Yöneticisi</Text>
          </TouchableOpacity>
        </View>

        <Button
          title={role === "yönetici" ? "Yönetici Olarak Davet Et" : "Üye Olarak Davet Et"}
          onPress={handleSendInvite}
          loading={loading}
        />

        {/* Kopyalanabilir ve Mail ile Gönderilebilir Davet Kutusu */}
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
                className="bg-amber-600/80 active:bg-amber-600 py-2.5 rounded-lg items-center flex-row justify-center gap-1.5"
              >
                <Text className="text-white text-xs font-bold">📋 Bağlantıyı Panoya Kopyala</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSendEmailInvite}
                className="bg-indigo-600 active:bg-indigo-700 py-2.5 rounded-lg items-center flex-row justify-center gap-1.5"
              >
                <Text className="text-white text-xs font-bold">
                  ✉️ E-Posta ile Gönder (Gmail / Mail)
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Card>
    </ScrollView>
  );
}
