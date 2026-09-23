import React, { useState } from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { Card } from "../components/Card";

interface ForgotPasswordScreenProps {
  onNavigateToLogin: () => void;
}

export const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({
  onNavigateToLogin,
}) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleResetPassword = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      Alert.alert(
        "Bağlantı Gönderildi",
        "Şifre sıfırlama bağlantısı e-posta adresinize gönderildi (Mock).",
        [{ text: "Tamam", onPress: onNavigateToLogin }],
      );
    }, 800);
  };

  return (
    <View className="flex-1 justify-center px-6 bg-slate-900">
      <View className="mb-8 items-center">
        <Text className="text-3xl font-extrabold text-white tracking-tight">Şifre Sıfırlama</Text>
        <Text className="text-slate-400 text-sm mt-1 text-center">
          Hesabınıza ait e-posta adresinizi girin, sıfırlama bağlantısı gönderelim.
        </Text>
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

        <Button
          title="Sıfırlama Bağlantısı Gönder"
          onPress={handleResetPassword}
          loading={loading}
          className="mt-2"
        />
      </Card>

      <View className="flex-row justify-center mt-6">
        <TouchableOpacity onPress={onNavigateToLogin}>
          <Text className="text-indigo-400 font-semibold text-sm">Giriş Ekranına Dön</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
