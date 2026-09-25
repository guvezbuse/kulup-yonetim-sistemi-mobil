import React, { useState } from "react";
import { View, Text, TouchableOpacity, Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { useAuthStore } from "../store/authStore";

interface RegisterScreenProps {
  onNavigateLogin: () => void;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ onNavigateLogin }) => {
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const register = useAuthStore((state) => state.register);

  const handleRegister = async () => {
    if (!name.trim() || !surname.trim() || !email.trim() || !password) {
      Alert.alert("Hata", "Lütfen zorunlu alanları doldurun.");
      return;
    }
    if (password.length < 8) {
      Alert.alert("Hata", "Şifre en az 8 karakter olmalıdır.");
      return;
    }

    setLoading(true);
    try {
      await register({
        name: name.trim(),
        surname: surname.trim(),
        email: email.trim(),
        phone: phone.trim(),
        pass: password,
      });
      Alert.alert("Başarılı", "Hesabınız başarıyla oluşturuldu!");
    } catch (err: any) {
      console.log("Firebase Kayıt Hatası:", err);
      let msg = err.message || "Kayıt işlemi başarısız.";
      if (err.code === "auth/email-already-in-use") {
        msg = "Bu e-posta adresi zaten kullanımda.";
      } else if (err.code === "auth/invalid-email") {
        msg = "Geçersiz e-posta adresi formatı.";
      } else if (err.code === "auth/network-request-failed") {
        msg = "Ağ hatası. İnternet bağlantınızı kontrol edin.";
      } else if (err.code === "auth/api-key-not-valid") {
        msg = "Firebase API anahtarı geçersiz veya bulunamadı.";
      }
      Alert.alert("Kayıt Hatası", `${msg}\n[Kod: ${err.code || "yok"}]`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-900 px-6 justify-center">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 20 }}
      >
        <View className="mb-6 items-center">
          <Text className="text-3xl font-extrabold text-white tracking-tight">Kayıt Ol</Text>
          <Text className="text-slate-400 text-sm mt-1">Yeni bir hesap oluşturun</Text>
        </View>

        <Card>
          <Input label="Ad" placeholder="Adınız" value={name} onChangeText={setName} />
          <Input label="Soyad" placeholder="Soyadınız" value={surname} onChangeText={setSurname} />
          <Input
            label="E-posta Adresi"
            placeholder="ornek@ogrenci.edu.tr"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          <Input
            label="Telefon Numarası"
            placeholder="05XX XXX XX XX"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
          <Input
            label="Şifre"
            placeholder="En az 8 karakter"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <Button title="Kayıt Ol" onPress={handleRegister} loading={loading} className="mt-2" />
        </Card>

        <View className="flex-row justify-center mt-6">
          <Text className="text-slate-400 text-sm">Zaten hesabınız var mı? </Text>
          <TouchableOpacity onPress={onNavigateLogin}>
            <Text className="text-indigo-400 font-semibold text-sm">Giriş Yap</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
