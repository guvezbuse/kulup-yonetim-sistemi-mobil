import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { invitationService, InvitationItem } from "../services/invitationService";
import * as Clipboard from "expo-clipboard";

interface InviteAcceptScreenProps {
  initialToken?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function InviteAcceptScreen({
  initialToken = "",
  onSuccess,
  onCancel,
}: InviteAcceptScreenProps) {
  const [token, setToken] = useState(initialToken);
  const [verifiedInvite, setVerifiedInvite] = useState<InvitationItem | null>(null);
  const [checking, setChecking] = useState(false);

  // Kayıt formu state'leri
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [studentNo, setStudentNo] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Panodan otomatik yapıştırma (Kullanıcı linki kopyalayıp geldiyse token'ı çeker)
  const handlePasteFromClipboard = async () => {
    try {
      const clipboardContent = await Clipboard.getStringAsync();
      if (!clipboardContent) {
        Alert.alert("Bilgi", "Panoda herhangi bir metin bulunamadı.");
        return;
      }

      // Link halindeyse içindeki token parametresini ayıklar
      if (clipboardContent.includes("token=")) {
        const extractedToken = clipboardContent.split("token=")[1]?.split("&")[0];
        setToken(extractedToken || clipboardContent.trim());
      } else {
        setToken(clipboardContent.trim());
      }
    } catch {
      Alert.alert("Hata", "Panodan veri okunamadı.");
    }
  };

  // 1. Kodu Doğrula
  const handleVerify = async () => {
    let cleanToken = token.trim();
    if (cleanToken.includes("token=")) {
      cleanToken = cleanToken.split("token=")[1]?.split("&")[0] || cleanToken;
    }

    if (!cleanToken) {
      Alert.alert("Hata", "Lütfen bir davet kodu veya bağlantısı girin.");
      return;
    }

    setChecking(true);
    try {
      const invite = await invitationService.verifyToken(cleanToken);
      setVerifiedInvite(invite);
      Alert.alert(
        "Davet Bulundu! 🎉",
        `Hoş geldiniz! ${invite.email} adresi için davet onaylandı.`,
      );
    } catch (err: any) {
      Alert.alert("Geçersiz Davet", err.message || "Davet doğrulanamadı.");
      setVerifiedInvite(null);
    } finally {
      setChecking(false);
    }
  };

  // 2. Hesabı Aç ve Kulübe Katıl
  const handleCompleteRegistration = async () => {
    if (!name.trim() || !surname.trim() || !password) {
      Alert.alert("Hata", "Lütfen ad, soyad ve şifre alanlarını doldurun.");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Hata", "Şifre en az 6 karakter olmalıdır.");
      return;
    }

    if (password !== passwordConfirm) {
      Alert.alert("Hata", "Şifreler uyuşmuyor!");
      return;
    }

    if (!verifiedInvite) return;

    setSubmitting(true);
    try {
      await invitationService.acceptInvitation({
        invite: verifiedInvite,
        name: name.trim(),
        surname: surname.trim(),
        password,
        studentNo: studentNo.trim(),
      });

      Alert.alert(
        "Kayıt Tamamlandı! 🚀",
        "Hesabınız başarıyla oluşturuldu ve kulübe dahil edildiniz. Giriş yapabilirsiniz.",
        [{ text: "Giriş Yap", onPress: onSuccess }],
      );
    } catch (err: any) {
      Alert.alert("Kayıt Hatası", err.message || "İşlem sırasında bir hata oluştu.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-slate-900"
    >
      <ScrollView
        className="flex-1 px-4 pt-8"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity onPress={onCancel} className="mb-4">
          <Text className="text-indigo-400 font-semibold">← Girişe Dön</Text>
        </TouchableOpacity>

        <Text className="text-2xl font-bold text-white mb-1">Kulüp Daveti Kabulü</Text>
        <Text className="text-slate-400 text-xs mb-6">
          Size iletilen davet kodu veya bağlantısı ile doğrudan kulübe kayıt olun.
        </Text>

        {/* 1. ADIM: Token Doğrulama */}
        {!verifiedInvite ? (
          <Card className="mb-6">
            <Input
              label="Davet Kodu veya Bağlantısı"
              placeholder="Kod veya https://kulup.app/invite?token=..."
              value={token}
              onChangeText={setToken}
              autoCapitalize="none"
            />

            <TouchableOpacity
              onPress={handlePasteFromClipboard}
              activeOpacity={0.7}
              className="py-1.5 self-start mb-2"
            >
              <Text className="text-amber-400 text-xs font-semibold">📋 Panodan Yapıştır</Text>
            </TouchableOpacity>

            <Button
              title="Daveti Sorgula & Doğrula"
              onPress={handleVerify}
              loading={checking}
              className="mt-2"
            />
          </Card>
        ) : (
          /* 2. ADIM: Bilgileri Girip Şifre Belirleme */
          <Card className="mb-8 border border-emerald-500/40">
            <View className="bg-emerald-950/40 p-3 rounded-xl mb-4 border border-emerald-500/30 flex-row justify-between items-center">
              <View className="flex-1 mr-2">
                <Text className="text-emerald-400 text-xs font-bold">Davet Onaylandı ✓</Text>
                <Text className="text-slate-200 text-xs mt-1">E-Posta: {verifiedInvite.email}</Text>
                <Text className="text-slate-300 text-[11px]">
                  Rol: {verifiedInvite.role.toUpperCase()}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setVerifiedInvite(null)}
                className="bg-slate-800 px-2 py-1 rounded border border-slate-700"
              >
                <Text className="text-slate-400 text-[10px]">Değiştir</Text>
              </TouchableOpacity>
            </View>

            <Input label="Adınız" placeholder="Adınız" value={name} onChangeText={setName} />
            <Input
              label="Soyadınız"
              placeholder="Soyadınız"
              value={surname}
              onChangeText={setSurname}
            />
            <Input
              label="Öğrenci Numarası (Opsiyonel)"
              placeholder="Örn: 2164..."
              value={studentNo}
              onChangeText={setStudentNo}
              keyboardType="number-pad"
            />
            <Input
              label="Yeni Şifre"
              placeholder="En az 6 karakter"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <Input
              label="Şifre Tekrar"
              placeholder="Şifreyi onaylayın"
              value={passwordConfirm}
              onChangeText={setPasswordConfirm}
              secureTextEntry
            />

            <Button
              title="Hesabı Oluştur ve Kulübe Katıl"
              onPress={handleCompleteRegistration}
              loading={submitting}
              className="mt-3 bg-emerald-600 active:bg-emerald-700"
            />
          </Card>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
