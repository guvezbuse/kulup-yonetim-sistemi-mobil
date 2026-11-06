import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { getErrorCode, getErrorMessage } from "../lib/errors";
import { useAuthStore } from "../store/authStore";

interface EditProfileScreenProps {
  onBack: () => void;
}

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: "default" | "email-address" | "phone-pad" | "numeric";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  editable?: boolean;
}

const Field = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  autoCapitalize = "sentences",
  editable = true,
}: FieldProps) => (
  <View className="mb-3">
    <Text className="text-slate-300 text-xs font-semibold mb-1.5">{label}</Text>
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#64748b"
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      editable={editable}
      className={`bg-slate-800 text-white px-3.5 py-3 rounded-xl border border-slate-700 text-sm ${
        editable ? "" : "opacity-50"
      }`}
    />
  </View>
);

export default function EditProfileScreen({ onBack }: EditProfileScreenProps) {
  const profile = useAuthStore((state) => state.profile);
  const updateProfile = useAuthStore((state) => state.updateProfile);

  const isAdmin = profile?.is_admin === true;

  const [ad, setAd] = useState(profile?.ad || "");
  const [soyad, setSoyad] = useState(profile?.soyad || "");
  const [telefon, setTelefon] = useState(profile?.telefon || "");
  const [email, setEmail] = useState(profile?.email || "");
  const [studentNo, setStudentNo] = useState(profile?.student_no || "");
  const [bolum, setBolum] = useState(profile?.bolum || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!ad.trim() || !soyad.trim() || !email.trim()) {
      Alert.alert("Hata", "Ad, soyad ve e-posta alanları zorunludur.");
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email.trim())) {
      Alert.alert("Hata", "Geçerli bir e-posta adresi girin.");
      return;
    }

    setSaving(true);
    try {
      await updateProfile({
        ad: ad.trim(),
        soyad: soyad.trim(),
        telefon: telefon.trim(),
        email: email.trim(),
        ...(isAdmin
          ? {}
          : {
              student_no: studentNo.trim(),
              bolum: bolum.trim(),
            }),
      });

      Alert.alert("Başarılı", "Profil bilgileriniz güncellendi.");
      onBack();
    } catch (error) {
      const code = getErrorCode(error);
      let message = getErrorMessage(error, "Profil güncellenemedi.");

      if (code === "auth/requires-recent-login") {
        message =
          "E-posta değiştirmek için güvenlik nedeniyle çıkış yapıp tekrar giriş yapmalısınız.";
      } else if (code === "auth/email-already-in-use") {
        message = "Bu e-posta adresi başka bir hesapta kullanılıyor.";
      } else if (code === "auth/invalid-email") {
        message = "Geçerli bir e-posta adresi girin.";
      }

      Alert.alert("Güncelleme Hatası", message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-slate-900 px-4 pt-4"
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <View className="flex-row items-center justify-between mb-5">
        <TouchableOpacity onPress={onBack}>
          <Text className="text-indigo-400 font-semibold">← Geri Dön</Text>
        </TouchableOpacity>
        <Text className="text-slate-400 text-xs font-bold uppercase">Hesap Ayarları</Text>
      </View>

      <Text className="text-2xl font-bold text-white">Profil Bilgilerini Düzenle</Text>
      <Text className="text-slate-400 text-xs mt-1 mb-5">
        Bilgileriniz tüm cihazlarınızda hesabınıza bağlı olarak güncellenir.
      </Text>

      <View className="bg-slate-800/70 border border-slate-700 p-4 rounded-2xl mb-4">
        <Field label="Ad *" value={ad} onChangeText={setAd} placeholder="Adınız" />
        <Field label="Soyad *" value={soyad} onChangeText={setSoyad} placeholder="Soyadınız" />
        <Field
          label="E-posta *"
          value={email}
          onChangeText={setEmail}
          placeholder="ornek@ogrenci.edu.tr"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Field
          label="Telefon"
          value={telefon}
          onChangeText={setTelefon}
          placeholder="05XX XXX XX XX"
          keyboardType="phone-pad"
        />

        {!isAdmin && (
          <>
            <Field
              label="Öğrenci No"
              value={studentNo}
              onChangeText={setStudentNo}
              placeholder="Öğrenci numaranız"
              keyboardType="numeric"
            />
            <Field
              label="Bölüm"
              value={bolum}
              onChangeText={setBolum}
              placeholder="Bölümünüz"
              autoCapitalize="words"
            />
          </>
        )}

        <View className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-3 mt-1">
          <Text className="text-amber-300 text-[11px] font-semibold">Güvenlik notu</Text>
          <Text className="text-slate-400 text-[11px] mt-1 leading-4">
            E-posta adresinizi değiştirdiğinizde giriş adresiniz de güncellenir. Firebase
            güvenlik kuralı gerektirirse çıkış yapıp yeniden giriş yapmanız istenebilir.
          </Text>
        </View>
      </View>

      <TouchableOpacity
        onPress={handleSave}
        disabled={saving}
        className="bg-indigo-600 py-3.5 rounded-xl items-center shadow-lg active:opacity-90"
      >
        {saving ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text className="text-white font-bold text-sm">Değişiklikleri Kaydet</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={onBack} className="items-center py-4">
        <Text className="text-slate-400 text-xs font-semibold">Vazgeç</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
