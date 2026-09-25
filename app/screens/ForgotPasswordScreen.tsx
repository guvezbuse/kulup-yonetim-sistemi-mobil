import React, { useState } from "react";
import {
  View,
  Text,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Card } from "../components/Card";
import { useAuthStore } from "../store/authStore";

export interface ForgotPasswordScreenProps {
  onNavigateToLogin: () => void;
  onNavigateLogin?: () => void;
}

export const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({
  onNavigateToLogin,
  onNavigateLogin,
}) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const resetPassword = useAuthStore((state) => state.resetPassword);

  const handleBackToLogin = () => {
    if (onNavigateToLogin) onNavigateToLogin();
    else if (onNavigateLogin) onNavigateLogin();
  };

  const handleResetPassword = async () => {
    if (!email.trim()) {
      Alert.alert("Uyarı", "Lütfen e-posta adresinizi girin.");
      return;
    }

    setLoading(true);
    try {
      // Gerçek Firebase şifre sıfırlama çağrısı
      await resetPassword(email.trim());
      Alert.alert(
        "E-posta Gönderildi",
        "Şifre sıfırlama bağlantısı e-posta adresinize gönderildi. Lütfen gelen kutunuzu (ve spam klasörünü) kontrol edin.",
        [{ text: "Tamam", onPress: handleBackToLogin }],
      );
    } catch (error: any) {
      let msg = "İşlem sırasında bir hata oluştu.";
      if (error.code === "auth/user-not-found") {
        msg = "Bu e-posta adresine ait bir hesap bulunamadı.";
      } else if (error.code === "auth/invalid-email") {
        msg = "Geçersiz e-posta adresi girdiniz.";
      } else if (error.message) {
        msg = error.message;
      }
      Alert.alert("Hata", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-slate-900 justify-center px-4"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
        keyboardShouldPersistTaps="handled"
      >
        <Card className="p-6 bg-slate-800/90 border border-slate-700">
          <Text className="text-white text-2xl font-bold text-center mb-1">Şifremi Unuttum</Text>
          <Text className="text-slate-400 text-sm text-center mb-6">
            Kayıtlı e-posta adresinize sıfırlama bağlantısı göndereceğiz.
          </Text>

          <View className="gap-4">
            <Input
              label="E-posta"
              placeholder="ornek@universite.edu.tr"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Button
              title={loading ? "Gönderiliyor..." : "Sıfırlama Bağlantısı Gönder"}
              variant="primary"
              onPress={handleResetPassword}
              disabled={loading}
              className="mt-2"
            />

            <View className="flex-row justify-center items-center mt-4">
              <TouchableOpacity
                onPress={handleBackToLogin}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text className="text-indigo-400 text-xs font-bold">← Giriş Ekranına Dön</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
