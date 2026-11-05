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
import { getErrorCode, getErrorMessage } from "../lib/errors";

export interface LoginScreenProps {
  onNavigateToRegister: () => void;
  onNavigateToForgotPassword: () => void;
  onNavigateToAcceptInvite: () => void;
  onLoginSuccess: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onNavigateToRegister,
  onNavigateToForgotPassword,
  onNavigateToAcceptInvite,
  onLoginSuccess,
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((state) => state.login);

  const handleNavigateForgot = () => {
    onNavigateToForgotPassword();
  };

  const handleNavigateInvite = () => {
    onNavigateToAcceptInvite();
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Uyarı", "Lütfen e-posta ve şifrenizi girin.");
      return;
    }

    setLoading(true);
    try {
      await login(email.trim(), password);
      onLoginSuccess();
    } catch (error) {
      const code = getErrorCode(error);
      let msg = "Giriş yapılırken bir hata oluştu.";
      if (code === "auth/invalid-email") {
        msg = "Geçersiz e-posta formatı.";
      } else if (
        code === "auth/user-not-found" ||
        code === "auth/wrong-password" ||
        code === "auth/invalid-credential"
      ) {
        msg = "E-posta veya şifre hatalı.";
      } else {
        msg = getErrorMessage(error, msg);
      }
      Alert.alert("Giriş Başarısız", msg);
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
          <Text className="text-white text-2xl font-bold text-center mb-1">Kulüp Yönetimi</Text>
          <Text className="text-slate-400 text-sm text-center mb-6">Hesabınıza giriş yapın</Text>

          <View className="gap-4">
            <Input
              label="E-posta"
              placeholder="ornek@universite.edu.tr"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Input
              label="Şifre"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <TouchableOpacity
              onPress={handleNavigateForgot}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              activeOpacity={0.7}
              className="self-end py-1 px-2"
            >
              <Text className="text-indigo-400 text-xs font-semibold">Şifremi Unuttum</Text>
            </TouchableOpacity>

            <Button
              title={loading ? "Giriş Yapılıyor..." : "Giriş Yap"}
              variant="primary"
              onPress={handleLogin}
              disabled={loading}
              className="mt-2"
            />

            <View className="flex-row justify-center items-center mt-4">
              <Text className="text-slate-400 text-xs">Hesabınız yok mu? </Text>
              <TouchableOpacity
                onPress={onNavigateToRegister}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={0.7}
              >
                <Text className="text-indigo-400 text-xs font-bold">Kayıt Ol</Text>
              </TouchableOpacity>
            </View>

            {/* Kulüp Davet Kodu Kabul Butonu */}
            <TouchableOpacity
              onPress={handleNavigateInvite}
              activeOpacity={0.7}
              className="mt-2 py-2 items-center"
            >
              <Text className="text-amber-400 text-xs font-semibold">
                🎟️ Kulüp Davet Kodunuz mu Var? Buraya Tıklayın
              </Text>
            </TouchableOpacity>
          </View>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
