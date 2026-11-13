import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import QRCode from "react-native-qrcode-svg";
import { getErrorCode, getErrorMessage } from "../lib/errors";
import { buildAttendanceQrValue } from "../lib/attendanceQr";
import { avatarService } from "../services/avatarService";
import { useAuthStore } from "../store/authStore";

interface ProfileScreenProps {
  onOpenManageUsers?: () => void;
  onOpenIdCard?: () => void;
  onEditProfile?: () => void;
  onOpenMyClubs?: () => void;
  onOpenEventHistory?: () => void;
}

interface InfoRowProps {
  icon: string;
  label: string;
  value: string;
}

const InfoRow = ({ icon, label, value }: InfoRowProps) => (
  <View className="flex-row items-center py-2.5 border-b border-slate-700/50 last:border-b-0">
    <Text className="text-base w-8">{icon}</Text>
    <View className="flex-1">
      <Text className="text-slate-500 text-[10px] font-semibold uppercase">{label}</Text>
      <Text className="text-slate-200 text-sm mt-0.5">{value}</Text>
    </View>
  </View>
);

export default function ProfileScreen({
  onOpenManageUsers,
  onOpenIdCard,
  onEditProfile,
  onOpenMyClubs,
  onOpenEventHistory,
}: ProfileScreenProps) {
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const updateProfile = useAuthStore((state) => state.updateProfile);

  const [avatarUri, setAvatarUri] = useState<string | null>(profile?.avatarUrl || null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    setAvatarUri(profile?.avatarUrl || null);
  }, [profile?.avatarUrl]);

  const isSystemAdmin = profile?.is_admin === true;
  const roleText = isSystemAdmin ? "Admin" : "Üye";
  const fullName = `${profile?.ad || ""} ${profile?.soyad || ""}`.trim();
  const displayName = fullName || user?.email?.split("@")[0] || "Kullanıcı";
  const avatarFallback = (displayName[0] || "U").toUpperCase();
  const phone = profile?.telefon?.trim() || "Belirtilmedi";
  const email = profile?.email || user?.email || "Belirtilmedi";
  const studentNo = profile?.student_no?.trim() || "Belirtilmedi";

  const pickImage = async () => {
    if (!user || uploadingAvatar) return;

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "İzin Gerekli",
          "Profil fotoğrafı seçebilmek için galeri erişim izni vermeniz gerekiyor.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets[0]?.uri) return;

      setUploadingAvatar(true);
      const localPreview = result.assets[0].uri;
      setAvatarUri(localPreview);

      const avatarUrl = await avatarService.uploadAvatar(user.uid, localPreview);
      await updateProfile({ avatarUrl });
      setAvatarUri(avatarUrl);
      Alert.alert("Başarılı", "Profil fotoğrafınız güncellendi.");
    } catch (error) {
      setAvatarUri(profile?.avatarUrl || null);
      const code = getErrorCode(error);
      const message =
        code === "storage/unauthorized"
          ? "Firebase Storage yazma izni reddedildi. Storage kurallarını kontrol edin."
          : code === "storage/retry-limit-exceeded"
            ? "Yükleme zaman aşımına uğradı. İnternet bağlantınızı kontrol edip tekrar deneyin."
            : getErrorMessage(error, "Profil fotoğrafı yüklenemedi.");
      Alert.alert("Hata", message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const removeAvatar = () => {
    Alert.alert("Fotoğrafı Kaldır", "Profil fotoğrafınız kaldırılacak. Emin misiniz?", [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Kaldır",
        style: "destructive",
        onPress: async () => {
          try {
            await updateProfile({ avatarUrl: "" });
            setAvatarUri(null);
          } catch (error) {
            Alert.alert("Hata", getErrorMessage(error, "Fotoğraf kaldırılamadı."));
          }
        },
      },
    ]);
  };

  return (
    <ScrollView
      className="flex-1 bg-slate-900 px-4 pt-4"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <View className="mb-5">
        <Text className="text-2xl font-bold text-white">Profilim</Text>
        <Text className="text-slate-400 text-xs mt-0.5">
          Hesap bilgilerinizi görüntüleyin ve yönetin
        </Text>
      </View>

      <View className="bg-slate-800 p-4 rounded-2xl border border-slate-700 mb-4">
        <View className="flex-row items-center gap-4">
          <TouchableOpacity onPress={pickImage} activeOpacity={0.8} className="relative">
            <View className="w-20 h-20 rounded-full bg-indigo-600/30 border-2 border-indigo-500/40 items-center justify-center overflow-hidden">
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} className="w-full h-full" resizeMode="cover" />
              ) : (
                <Text className="text-indigo-300 font-bold text-2xl">{avatarFallback}</Text>
              )}
              {uploadingAvatar && (
                <View className="absolute inset-0 bg-slate-950/70 items-center justify-center">
                  <ActivityIndicator size="small" color="#a5b4fc" />
                </View>
              )}
            </View>
            <View className="absolute bottom-0 right-0 bg-indigo-600 w-7 h-7 rounded-full items-center justify-center border-2 border-slate-800">
              <Text className="text-white text-xs">📷</Text>
            </View>
          </TouchableOpacity>

          <View className="flex-1">
            <View className="flex-row items-center gap-2 mb-1">
              <Text className="text-white font-bold text-lg flex-shrink" numberOfLines={1}>
                {displayName}
              </Text>
              <View
                className={`px-2 py-0.5 rounded-md ${
                  isSystemAdmin
                    ? "bg-rose-500/20 border border-rose-500/30"
                    : "bg-indigo-500/20 border border-indigo-500/30"
                }`}
              >
                <Text
                  className={`text-[10px] font-bold ${
                    isSystemAdmin ? "text-rose-400" : "text-indigo-400"
                  }`}
                >
                  {roleText}
                </Text>
              </View>
            </View>
            <Text className="text-slate-400 text-xs" numberOfLines={1}>
              {email}
            </Text>
            {!isSystemAdmin && (
              <Text className="text-slate-500 text-[11px] mt-1">Öğrenci No: {studentNo}</Text>
            )}
            {avatarUri && (
              <TouchableOpacity onPress={removeAvatar} className="mt-2 self-start">
                <Text className="text-rose-400 text-[11px] font-semibold">Fotoğrafı kaldır</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <TouchableOpacity
          onPress={onEditProfile}
          activeOpacity={0.8}
          className="mt-4 bg-slate-700/70 border border-slate-600/60 py-2.5 rounded-xl items-center justify-center"
        >
          <Text className="text-slate-100 font-semibold text-xs">
            ✏️ Profil Bilgilerini Düzenle
          </Text>
        </TouchableOpacity>
      </View>

      <View className="bg-slate-800 px-4 py-1 rounded-2xl border border-slate-700 mb-4">
        <InfoRow icon="👤" label="Ad Soyad" value={fullName || "Belirtilmedi"} />
        <InfoRow icon="✉️" label="E-posta" value={email} />
        <InfoRow icon="📞" label="Telefon" value={phone} />
        {!isSystemAdmin && <InfoRow icon="🎓" label="Öğrenci No" value={studentNo} />}
        {!isSystemAdmin && profile?.bolum ? (
          <InfoRow icon="🏫" label="Bölüm" value={profile.bolum} />
        ) : null}
      </View>

      {isSystemAdmin && onOpenManageUsers && (
        <TouchableOpacity
          onPress={onOpenManageUsers}
          activeOpacity={0.8}
          className="bg-amber-500/10 border border-amber-500/40 p-4 rounded-2xl mb-4"
        >
          <Text className="text-amber-400 font-bold text-sm">👥 Kullanıcı Yönetimi</Text>
          <Text className="text-slate-400 text-xs mt-0.5">Kullanıcıları listeleyin.</Text>
        </TouchableOpacity>
      )}

      {!isSystemAdmin && (
        <TouchableOpacity
          onPress={onOpenIdCard}
          activeOpacity={0.8}
          className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700/80 mb-4 items-center"
        >
          <Text className="text-indigo-400 font-bold text-sm mb-1">
            📷 Etkinlik Yoklama QR Kodu
          </Text>
          <Text className="text-slate-400 text-xs text-center mb-4">
            Etkinlik girişinde görevliye bu kodu göstererek yoklamanızı verebilirsiniz.
          </Text>
          <View className="bg-white rounded-xl p-3 mb-2">
            {user ? (
              <QRCode value={buildAttendanceQrValue(user.uid)} size={112} color="#0f172a" />
            ) : (
              <Text className="text-slate-900 text-xs">QR hazırlanıyor...</Text>
            )}
          </View>
          <Text className="text-indigo-400 text-[11px] font-semibold">
            Dijital kimlik kartını aç →
          </Text>
        </TouchableOpacity>
      )}

      {isSystemAdmin ? (
        <TouchableOpacity
          onPress={onOpenEventHistory}
          activeOpacity={0.8}
          className="bg-slate-800 border border-slate-700 p-4 rounded-2xl mb-4"
        >
          <Text className="text-white font-bold text-sm">📜 Etkinliklerim</Text>
          <Text className="text-slate-400 text-xs mt-0.5">
            Katıldığınız etkinlikleri ve yoklama durumlarını görüntüleyin.
          </Text>
        </TouchableOpacity>
      ) : (
        <View className="flex-row gap-3 mb-4">
          <TouchableOpacity
            onPress={onOpenMyClubs}
            activeOpacity={0.8}
            className="flex-1 bg-slate-800 border border-slate-700 p-4 rounded-2xl"
          >
            <Text className="text-xl mb-1">🏛️</Text>
            <Text className="text-white font-bold text-sm">Kulüplerim</Text>
            <Text className="text-slate-400 text-[11px] mt-0.5">Aktif üyelikleriniz</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onOpenEventHistory}
            activeOpacity={0.8}
            className="flex-1 bg-slate-800 border border-slate-700 p-4 rounded-2xl"
          >
            <Text className="text-xl mb-1">📜</Text>
            <Text className="text-white font-bold text-sm">Etkinlik Geçmişi</Text>
            <Text className="text-slate-400 text-[11px] mt-0.5">Katıldığınız etkinlikler</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}
