import "./global.css";
import { StatusBar } from "expo-status-bar";
import { Text, View } from "react-native";

export default function App() {
  return (
    <View className="flex-1 items-center justify-center bg-slate-900 px-4">
      <Text className="text-2xl font-bold text-white text-center">
        Kulüp Yönetim Sistemi
      </Text>
      <Text className="mt-2 text-sm text-emerald-400 font-semibold">
        ✓ NativeWind & Tailwind Başarıyla Çalışıyor!
      </Text>
      <StatusBar style="light" />
    </View>
  );
}