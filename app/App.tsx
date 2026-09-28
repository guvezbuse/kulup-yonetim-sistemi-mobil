import "./global.css";
import React, { useState, useEffect } from "react";
import { View, Text, StatusBar, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LoginScreen } from "./screens/LoginScreen";
import { RegisterScreen } from "./screens/RegisterScreen";
import { ForgotPasswordScreen } from "./screens/ForgotPasswordScreen";
import ClubsScreen from "./screens/ClubsScreen";
import AdminPanelScreen from "./screens/AdminPanelScreen";
import MemberDashboardScreen from "./screens/MemberDashboardScreen";
import ClubManageScreen from "./screens/ClubManageScreen";
import ClubDetailScreen from "./screens/ClubDetailScreen";
import MemberIdCardScreen from "./screens/MemberIdCardScreen";
import { useAuthStore } from "./store/authStore";
import { Club } from "./types";

type ScreenType =
  | "login"
  | "register"
  | "forgot-password"
  | "clubs"
  | "admin-panel"
  | "manage-club"
  | "club-detail"
  | "member-dashboard"
  | "member-id-card";

type UserRole = "superadmin" | "clubadmin" | "member";

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>("login");
  const [selectedRole, setSelectedRole] = useState<UserRole>("member");
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);

  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const logout = useAuthStore((state) => state.logout);

  const isSuperAdmin = profile?.is_admin === true;

  useEffect(() => {
    if (user) {
      if (isSuperAdmin) {
        setSelectedRole("superadmin");
      } else {
        setSelectedRole("member");
      }
    }
  }, [user, isSuperAdmin]);

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

      {/* ROL / MOD GEÇİŞ BARI */}
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

          <View style={{ flexDirection: "row", gap: 5 }}>
            <TouchableOpacity
              onPress={() => setCurrentScreen("member-dashboard")}
              style={{
                paddingHorizontal: 8,
                paddingVertical: 6,
                borderRadius: 6,
                backgroundColor: currentScreen === "member-dashboard" ? "#059669" : "#1e293b",
              }}
            >
              <Text style={{ color: "#ffffff", fontSize: 10, fontWeight: "700" }}>Duyurular</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setCurrentScreen("member-id-card")}
              style={{
                paddingHorizontal: 8,
                paddingVertical: 6,
                borderRadius: 6,
                backgroundColor: currentScreen === "member-id-card" ? "#6366f1" : "#1e293b",
              }}
            >
              <Text style={{ color: "#ffffff", fontSize: 10, fontWeight: "700" }}>Kimliğim</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setCurrentScreen("clubs")}
              style={{
                paddingHorizontal: 8,
                paddingVertical: 6,
                borderRadius: 6,
                backgroundColor: currentScreen === "clubs" ? "#3b82f6" : "#1e293b",
              }}
            >
              <Text style={{ color: "#ffffff", fontSize: 10, fontWeight: "700" }}>Kulüpler</Text>
            </TouchableOpacity>

            {isSuperAdmin && (
              <TouchableOpacity
                onPress={() => setCurrentScreen("admin-panel")}
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 6,
                  borderRadius: 6,
                  backgroundColor: currentScreen === "admin-panel" ? "#d97706" : "#1e293b",
                }}
              >
                <Text style={{ color: "#ffffff", fontSize: 10, fontWeight: "700" }}>Admin</Text>
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

        {/* Kulüpler Ekranı */}
        {currentScreen === "clubs" && (
          <ClubsScreen
            userEmail={user?.email || undefined}
            onLogout={handleLogout}
            onSelectClub={(club: Club) => {
              setSelectedClub(club);
              setCurrentScreen("club-detail");
            }}
          />
        )}

        {/* Kulüp Detay & Başvuru & Yönetici Geçiş Ekranı */}
        {currentScreen === "club-detail" && selectedClub && (
          <ClubDetailScreen
            club={selectedClub}
            onBack={() => setCurrentScreen("clubs")}
            onManageClub={(club) => {
              setSelectedClub(club);
              setCurrentScreen("manage-club");
            }}
          />
        )}

        {/* Kulüp Yönetim & Duyuru Paneli */}
        {currentScreen === "manage-club" && selectedClub && (
          <ClubManageScreen
            clubId={selectedClub.id}
            clubName={selectedClub.ad}
            onBack={() => setCurrentScreen("club-detail")}
          />
        )}

        {/* Admin Paneli */}
        {currentScreen === "admin-panel" &&
          (isSuperAdmin ? (
            <AdminPanelScreen
              onBack={() => setCurrentScreen("clubs")}
              onManageClub={(club) => {
                setSelectedClub(club);
                setCurrentScreen("manage-club");
              }}
            />
          ) : (
            <View className="flex-1 justify-center items-center px-6 bg-slate-900">
              <Text className="text-red-400 text-xl font-bold text-center">Yetkisiz Erişim</Text>
              <TouchableOpacity
                onPress={() => setCurrentScreen("clubs")}
                className="mt-6 bg-indigo-600 px-6 py-3 rounded-xl"
              >
                <Text className="text-white font-semibold">Kulüpler Ekranına Dön</Text>
              </TouchableOpacity>
            </View>
          ))}

        {/* Üye Duyurular Akışı */}
        {currentScreen === "member-dashboard" && (
          <MemberDashboardScreen
            userEmail={user?.email || undefined}
            onBack={() => setCurrentScreen("clubs")}
          />
        )}

        {/* Dijital Kimlik Ekranı */}
        {currentScreen === "member-id-card" && (
          <MemberIdCardScreen onBack={() => setCurrentScreen("clubs")} />
        )}
      </View>
    </SafeAreaView>
  );
}
