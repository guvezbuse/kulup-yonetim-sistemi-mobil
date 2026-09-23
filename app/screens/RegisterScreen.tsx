import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { Card } from "../components/Card";

interface RegisterScreenProps {
  onNavigateToLogin: () => void;
  onRegisterSuccess: () => void;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({
  onNavigateToLogin,
  onRegisterSuccess,
}) => {
  const [ad, setAd] = useState("");
  const [soyad, setSoyad] = useState("");
  const [email, setEmail] = useState("");
  const [telefon, setTelefon] = useState("");
  const [sifre, setSifre] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = () => {
    setLoading(true);
    // Mock kayıt akışı (Gün 6'da Firebase Auth'a bağlanacak)
    setTimeout(() => {
      setLoading(false);
      onRegisterSuccess();
    }, 1000);
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
          className="px-6 py-6"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View className="mb-6 items-center">
            <Text className="text-3xl font-extrabold text-white tracking-tight">Hesap Oluştur</Text>
            <Text className="text-slate-400 text-sm mt-1">Kulüplere katılmak için kaydolun</Text>
          </View>

          <Card>
            <Input label="Ad" placeholder="Adınız" value={ad} onChangeText={setAd} />
            <Input label="Soyad" placeholder="Soyadınız" value={soyad} onChangeText={setSoyad} />
            <Input
              label="E-posta"
              placeholder="ornek@ogrenci.edu.tr"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
            <Input
              label="Telefon"
              placeholder="05XX XXX XX XX"
              keyboardType="phone-pad"
              value={telefon}
              onChangeText={setTelefon}
            />
            <Input
              label="Şifre"
              placeholder="••••••••"
              secureTextEntry
              value={sifre}
              onChangeText={setSifre}
            />

            <Button title="Kayıt Ol" onPress={handleRegister} loading={loading} className="mt-2" />
          </Card>

          <View className="flex-row justify-center mt-6 mb-4">
            <Text className="text-slate-400 text-sm">Zaten hesabınız var mı? </Text>
            <TouchableOpacity onPress={onNavigateToLogin}>
              <Text className="text-indigo-400 font-semibold text-sm">Giriş Yap</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
