import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { Card } from "../components/Card";

interface LoginScreenProps {
  onNavigateToRegister: () => void;
  onNavigateToForgot: () => void;
  onLoginSuccess: (email?: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onNavigateToRegister,
  onNavigateToForgot,
  onLoginSuccess,
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    setLoading(true);
    // Plana göre mock: her giriş doğrudan başarılı sayılır
    setTimeout(() => {
      setLoading(false);
      onLoginSuccess(email.trim() || "demo@ogrenci.edu.tr");
    }, 600);
  };

  return (
    <SafeAreaView className="flex-1 justify-center px-6 bg-slate-900">
      <View className="mb-8 items-center">
        <Text className="text-3xl font-extrabold text-white tracking-tight">Kulüp Yönetimi</Text>
        <Text className="text-slate-400 text-sm mt-1">Hesabınıza giriş yapın</Text>
      </View>

      <Card>
        <Input
          label="E-posta Adresi"
          placeholder="ornek@ogrenci.edu.tr"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
        <Input
          label="Şifre"
          placeholder="••••••••"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <View className="items-end mb-4">
          <TouchableOpacity onPress={onNavigateToForgot}>
            <Text className="text-xs text-indigo-400 font-medium">Şifremi Unuttum?</Text>
          </TouchableOpacity>
        </View>

        <Button title="Giriş Yap" onPress={handleLogin} loading={loading} />
      </Card>

      <View className="flex-row justify-center mt-6">
        <Text className="text-slate-400 text-sm">Hesabınız yok mu? </Text>
        <TouchableOpacity onPress={onNavigateToRegister}>
          <Text className="text-indigo-400 font-semibold text-sm">Kayıt Ol</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};
