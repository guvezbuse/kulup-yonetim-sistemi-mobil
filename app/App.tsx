import "./global.css";
import React, { useState, useEffect } from "react";
import { View, Text, StatusBar, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LoginScreen } from "./screens/LoginScreen";
import { RegisterScreen } from "./screens/RegisterScreen";
import { ForgotPasswordScreen } from "./screens/ForgotPasswordScreen";
import { ClubsScreen } from "./screens/ClubsScreen";
import AdminPanelScreen from "./screens/AdminPanelScreen";
import MemberDashboardScreen from "./screens/MemberDashboardScreen";
import { useAuthStore } from "./store/authStore";

type ScreenType =
  "login" | "register" | "forgot-password" | "clubs" | "admin-panel" | "member-dashboard";

type UserRole = "superadmin" | "clubadmin" | "member";

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>("login");
  const [selectedRole, setSelectedRole] = useState<UserRole>("member");

  // Zustand Store
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const logout = useAuthStore((state) => state.logout);

  // Firestore üzerindeki is_admin değeri
  const isSuperAdmin = profile?.is_admin === true;

  // Kullanıcı profili yüklendiğinde varsayılan rolü eşle
  useEffect(() => {
    if (user) {
      if (isSuperAdmin) {
        setSelectedRole("superadmin");
      } else {
        setSelectedRole("member");
      }
    }
  }, [user, isSuperAdmin]);

  // Giriş başarılı olduğunda yetkiye göre hedef ekranı belirle
  const handleLoginSuccess = () => {
    if (isSuperAdmin) {
      setSelectedRole("superadmin");
      setCurrentScreen("admin-panel");
    } else {
      setSelectedRole("member");
      setCurrentScreen("clubs");
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      console.log("Çıkış hatası:", e);
    }
    setCurrentScreen("login");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0f172a" }}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* ROL / MOD GEÇİŞ BARI - Sadece oturum açıkken gösterilir */}
      {user && (
        <View
          style={{
            backgroundColor: "#020617",
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderBottomColor: "#1e293b",
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <View>
            <Text style={{ color: "#94a3b8", fontSize: 11, fontWeight: "600" }}>Aktif Rol:</Text>
            <Text
              style={{
                color: isSuperAdmin ? "#818cf8" : "#34d399",
                fontSize: 10,
                fontWeight: "bold",
              }}
            >
              {isSuperAdmin ? "Sistem Yöneticisi" : "Kulüp Üyesi"}
            </Text>
          </View>

          <View style={{ flexDirection: "row", gap: 6 }}>
            {/* Üye Akışı: Herkes erişebilir */}
            <TouchableOpacity
              onPress={() => {
                setSelectedRole("member");
                setCurrentScreen("member-dashboard");
              }}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 6,
                backgroundColor: selectedRole === "member" ? "#059669" : "#1e293b",
              }}
            >
              <Text style={{ color: "#ffffff", fontSize: 11, fontWeight: "700" }}>Üye Akışı</Text>
            </TouchableOpacity>

            {/* Kulüpler Listesi: Herkes erişebilir */}
            <TouchableOpacity
              onPress={() => {
                setCurrentScreen("clubs");
              }}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 6,
                backgroundColor: currentScreen === "clubs" ? "#3b82f6" : "#1e293b",
              }}
            >
              <Text style={{ color: "#ffffff", fontSize: 11, fontWeight: "700" }}>Kulüpler</Text>
            </TouchableOpacity>

            {/* Yönetici Paneli Butonu: Yalnızca is_admin = true olan kullanıcıya gösterilir */}
            {isSuperAdmin && (
              <TouchableOpacity
                onPress={() => {
                  setSelectedRole("superadmin");
                  setCurrentScreen("admin-panel");
                }}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 6,
                  backgroundColor: currentScreen === "admin-panel" ? "#d97706" : "#1e293b",
                }}
              >
                <Text style={{ color: "#ffffff", fontSize: 11, fontWeight: "700" }}>
                  Admin Paneli
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* EKRAN YÖNLENDİRİCİSİ */}
      <View style={{ flex: 1 }}>
        {currentScreen === "login" && (
          <LoginScreen
            onNavigateToRegister={() => setCurrentScreen("register")}
            onNavigateToForgotPassword={() => setCurrentScreen("forgot-password")}
            onLoginSuccess={handleLoginSuccess}
          />
        )}

        {currentScreen === "register" && (
          <RegisterScreen
            onNavigateToLogin={() => setCurrentScreen("login")}
            {...({
              onRegisterSuccess: handleLoginSuccess,
              onSuccess: handleLoginSuccess,
              onRegister: handleLoginSuccess,
            } as any)}
          />
        )}

        {currentScreen === "forgot-password" && (
          <ForgotPasswordScreen onNavigateToLogin={() => setCurrentScreen("login")} />
        )}

        {currentScreen === "clubs" && (
          <ClubsScreen userEmail={user?.email || undefined} onLogout={handleLogout} />
        )}

        {/* Admin Paneli Sayfa Düzeyi Güvenlik Bariyeri */}
        {currentScreen === "admin-panel" &&
          (isSuperAdmin ? (
            <AdminPanelScreen onBack={() => setCurrentScreen("clubs")} />
          ) : (
            <View className="flex-1 justify-center items-center px-6 bg-slate-900">
              <Text className="text-red-400 text-xl font-bold text-center">Yetkisiz Erişim</Text>
              <Text className="text-slate-400 text-center mt-2 text-sm leading-5">
                Bu alana yalnızca sistem yöneticileri (Superadmin) erişebilir. Hesabınız standart
                üye statüsündedir.
              </Text>
              <TouchableOpacity
                onPress={() => setCurrentScreen("clubs")}
                className="mt-6 bg-indigo-600 px-6 py-3 rounded-xl"
              >
                <Text className="text-white font-semibold">Kulüpler Ekranına Dön</Text>
              </TouchableOpacity>
            </View>
          ))}

        {currentScreen === "member-dashboard" && (
          <MemberDashboardScreen
            userEmail={user?.email || undefined}
            onBack={() => setCurrentScreen("clubs")}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
