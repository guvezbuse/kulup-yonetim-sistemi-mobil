import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from "react-native";
import { Card } from "../../components/Card";
import { membershipService } from "../../services/membershipService";
import { clubService } from "../../services/clubService";
import { getErrorMessage } from "../../lib/errors";
import { useAuthStore } from "../../store/authStore";

// Alt Ekranlar
import EditClubInfoScreen from "./EditClubInfoScreen";
import ClubEventsManageScreen from "./ClubEventsManageScreen";
import ClubAnnounceManageScreen from "./ClubAnnounceManageScreen";
import ClubMembersManageScreen from "./ClubMembersManageScreen";

interface ClubManageScreenProps {
  clubId: string;
  clubName: string;
  onBack: () => void;
}

type ActiveTab = "menu" | "edit-info" | "events" | "announcements" | "members";

export default function ClubManageScreen({ clubId, clubName, onBack }: ClubManageScreenProps) {
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const [activeTab, setActiveTab] = useState<ActiveTab>("menu");
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [isClubManager, setIsClubManager] = useState(false);
  const [deletingClub, setDeletingClub] = useState(false);

  // Yönetim ekranı yalnızca sistem admini veya o kulübün aktif yöneticisi tarafından açılabilir.
  useEffect(() => {
    let active = true;

    const checkAuthorization = async () => {
      if (!user) {
        if (active) setAuthorized(false);
        return;
      }

      const isAdmin = profile?.is_admin === true;

      try {
        const isManager = await membershipService.isClubManager(clubId, user.uid);
        if (!active) return;
        setIsClubManager(isManager);
        setAuthorized(isManager || isAdmin);
      } catch {
        if (!active) return;
        setIsClubManager(false);
        setAuthorized(isAdmin);
      }
    };

    checkAuthorization();
    return () => {
      active = false;
    };
  }, [clubId, user, profile]);

  useEffect(() => {
    if (authorized === false) {
      Alert.alert("Erişim Engellendi", "Bu kulübü yönetme yetkiniz bulunmuyor.");
      onBack();
    }
  }, [authorized, onBack]);

  const handleDeleteClub = () => {
    Alert.alert(
      "Kulübü Sil",
      `"${clubName}" kulübü kalıcı olarak silinecek.\n\nKulübe bağlı üyelikler, başvurular, davetler, etkinlikler, yoklama kayıtları ve duyurular da silinir. Bu işlem geri alınamaz.`,
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Kulübü Sil",
          style: "destructive",
          onPress: async () => {
            setDeletingClub(true);
            try {
              await clubService.deleteClub(clubId);
              Alert.alert("Silindi", `"${clubName}" kulübü ve bağlı kayıtları silindi.`);
              onBack();
            } catch (err) {
              Alert.alert("Hata", getErrorMessage(err, "Kulüp silinemedi."));
            } finally {
              setDeletingClub(false);
            }
          },
        },
      ],
    );
  };

  if (authorized === null) {
    return (
      <View className="flex-1 bg-slate-900 justify-center items-center">
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (!authorized) return null;

  if (activeTab === "edit-info") {
    return (
      <EditClubInfoScreen clubId={clubId} clubName={clubName} onBack={() => setActiveTab("menu")} />
    );
  }

  // Kulüp yöneticisi değil, yalnızca sistem yöneticisi ise içerik üretimi kısıtlanır.
  // Şartname yetki matrisi: etkinlik/duyuru oluşturma Yönetici ✔ / Admin ✘
  const isAdminView = !isClubManager && profile?.is_admin === true;

  if (activeTab === "events") {
    return (
      <ClubEventsManageScreen
        clubId={clubId}
        clubName={clubName}
        isAdminView={isAdminView}
        onBack={() => setActiveTab("menu")}
      />
    );
  }

  if (activeTab === "announcements") {
    return (
      <ClubAnnounceManageScreen
        clubId={clubId}
        clubName={clubName}
        isAdminView={isAdminView}
        onBack={() => setActiveTab("menu")}
      />
    );
  }

  if (activeTab === "members") {
    return (
      <ClubMembersManageScreen
        clubId={clubId}
        clubName={clubName}
        isAdminView={isAdminView}
        onBack={() => setActiveTab("menu")}
      />
    );
  }

  return (
    <ScrollView className="flex-1 bg-slate-900 px-4 pt-4" showsVerticalScrollIndicator={false}>
      {/* Üst Bar */}
      <View className="flex-row justify-between items-center mb-6">
        <TouchableOpacity onPress={onBack}>
          <Text className="text-indigo-400 font-semibold">← Geri Dön</Text>
        </TouchableOpacity>
        <Text className="text-slate-400 text-xs font-bold uppercase">
          {isClubManager ? "Kulüp Yöneticisi" : "Sistem Yöneticisi"}
        </Text>
      </View>

      <Text className="text-2xl font-bold text-white mb-1">{clubName}</Text>
      <Text className="text-slate-400 text-xs mb-4">
        Yönetmek istediğiniz modülü aşağıdaki menüden seçebilirsiniz.
      </Text>

      {!isClubManager && profile?.is_admin === true && (
        <View className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mb-5">
          <Text className="text-amber-400 text-[11px] font-bold">
            🛡️ Sistem yöneticisi yetkisiyle işlem yapıyorsunuz
          </Text>
          <Text className="text-slate-400 text-[11px] mt-1 leading-4">
            Bu kulübün yöneticisi değilsiniz. Kulüp etkinliği ve duyurusu oluşturamazsınız; üye
            başvurularını yalnızca görüntüleyebilir, üye durumlarını ve rolleri yönetebilirsiniz.
          </Text>
        </View>
      )}

      {/* MENÜ SEÇENEKLERİ */}

      {/* 1. Kulüp Bilgilerini Düzenle */}
      <TouchableOpacity onPress={() => setActiveTab("edit-info")}>
        <Card className="mb-4 border border-emerald-500/40 flex-row items-center justify-between p-4">
          <View className="flex-row items-center flex-1 mr-2">
            <Text className="text-2xl mr-3">⚙️</Text>
            <View className="flex-1">
              <Text className="text-emerald-400 font-bold text-base">
                Kulüp Bilgilerini Düzenle
              </Text>
              <Text className="text-slate-400 text-xs mt-0.5">
                Başlık, açıklama ve kapak fotoğrafını güncelleyin
              </Text>
            </View>
          </View>
          <Text className="text-slate-400 text-lg font-bold">→</Text>
        </Card>
      </TouchableOpacity>

      {/* 2. Etkinlik Yönetimi — şartname: etkinlik oluşturma/yayınlama Admin ✘ */}
      {!isAdminView && (
        <TouchableOpacity onPress={() => setActiveTab("events")}>
          <Card className="mb-4 border border-purple-500/40 flex-row items-center justify-between p-4">
            <View className="flex-row items-center flex-1 mr-2">
              <Text className="text-2xl mr-3">🗓️</Text>
              <View className="flex-1">
                <Text className="text-purple-400 font-bold text-base">Etkinlik İşlemleri</Text>
                <Text className="text-slate-400 text-xs mt-0.5">
                  Kulüp etkinliği oluşturun, durumunu değiştirin ve katılımcıları görün
                </Text>
              </View>
            </View>
            <Text className="text-slate-400 text-lg font-bold">→</Text>
          </Card>
        </TouchableOpacity>
      )}

      {/* 3. Duyuru Yönetimi — şartname: kulüp duyurusu yayınlama Admin ✘ */}
      {!isAdminView && (
        <TouchableOpacity onPress={() => setActiveTab("announcements")}>
          <Card className="mb-4 border border-indigo-500/40 flex-row items-center justify-between p-4">
            <View className="flex-row items-center flex-1 mr-2">
              <Text className="text-2xl mr-3">📢</Text>
              <View className="flex-1">
                <Text className="text-indigo-400 font-bold text-base">Kulüp Duyuruları</Text>
                <Text className="text-slate-400 text-xs mt-0.5">
                  Yalnızca bu kulübün üyelerine ulaşacak yeni duyuru yayınlayın
                </Text>
              </View>
            </View>
            <Text className="text-slate-400 text-lg font-bold">→</Text>
          </Card>
        </TouchableOpacity>
      )}

      {/* 4. Üye ve Davet Yönetimi */}
      <TouchableOpacity onPress={() => setActiveTab("members")}>
        <Card className="mb-6 border border-amber-500/40 flex-row items-center justify-between p-4">
          <View className="flex-row items-center flex-1 mr-2">
            <Text className="text-2xl mr-3">👥</Text>
            <View className="flex-1">
              <Text className="text-amber-400 font-bold text-base">Üyeler ve Davetler</Text>
              <Text className="text-slate-400 text-xs mt-0.5">
                {isAdminView
                  ? "Başvuruları ve üyeleri görüntüleyin, üye durumunu ve rolünü yönetin"
                  : "Başvuruları inceleyin, üyeleri/rolleri yönetin ve e-posta daveti gönderin"}
              </Text>
            </View>
          </View>
          <Text className="text-slate-400 text-lg font-bold">→</Text>
        </Card>
      </TouchableOpacity>

      {/* 5. Kulübü Sil — yalnızca sistem yöneticisi */}
      {profile?.is_admin === true && (
        <>
          <Text className="text-xs font-bold text-rose-400 uppercase mb-2 mt-2">
            Tehlikeli Bölge
          </Text>
          <TouchableOpacity onPress={handleDeleteClub} disabled={deletingClub} activeOpacity={0.7}>
            <Card className="mb-10 border border-rose-600/50 flex-row items-center justify-between p-4">
              <View className="flex-row items-center flex-1 mr-2">
                <Text className="text-2xl mr-3">🗑️</Text>
                <View className="flex-1">
                  <Text className="text-rose-400 font-bold text-base">Kulübü Sil</Text>
                  <Text className="text-slate-400 text-xs mt-0.5">
                    Kulübü ve bağlı tüm kayıtları kalıcı olarak siler. Bu işlem geri alınamaz.
                  </Text>
                </View>
              </View>
              {deletingClub ? (
                <ActivityIndicator color="#f43f5e" size="small" />
              ) : (
                <Text className="text-rose-400 text-lg font-bold">→</Text>
              )}
            </Card>
          </TouchableOpacity>
        </>
      )}

      <View className="h-10" />
    </ScrollView>
  );
}
