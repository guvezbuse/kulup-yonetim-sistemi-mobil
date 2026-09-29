import "./global.css";
import React, { useState, useEffect } from "react";
import { View, Text, StatusBar, TouchableOpacity, BackHandler } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LoginScreen } from "./screens/LoginScreen";
import { RegisterScreen } from "./screens/RegisterScreen";
import { ForgotPasswordScreen } from "./screens/ForgotPasswordScreen";
import ClubsScreen from "./screens/ClubsScreen";
import AdminPanelScreen from "./screens/AdminPanelScreen";
import MemberDashboardScreen from "./screens/MemberDashboardScreen";
import ClubManageScreen from "./screens/ClubManageScreen";
import ClubDetailScreen from "./screens/ClubDetailScreen";
import InviteAcceptScreen from "./screens/InviteAcceptScreen";
import { useAuthStore } from "./store/authStore";
import type { Club } from "./types";

type ScreenType =
  | "login"
  | "register"
  | "forgot-password"
  | "accept-invite"
  | "clubs"
  | "admin-panel"
  | "manage-club"
  | "club-detail"
  | "member-dashboard";

type UserRole = "superadmin" | "clubadmin" | "member";

export default function App() {
  const [screenHistory, setScreenHistory] = useState<ScreenType[]>(["login"]);
  const [selectedRole, setSelectedRole] = useState<UserRole>("member");
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);

  const currentScreen = screenHistory[screenHistory.length - 1];

  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const logout = useAuthStore((state) => state.logout);

  const isSuperAdmin = profile?.is_admin === true;

  // Sayfa Değiştirme Fonksiyonu (Geçmişe ekler)
  const navigateTo = (screen: ScreenType) => {
    setScreenHistory((prev) => [...prev, screen]);
  };

  // Bir Önceki Sayfaya Dönüş (Geri Tuşu)
  const goBack = () => {
    if (screenHistory.length > 1) {
      setScreenHistory((prev) => prev.slice(0, -1));
      return true;
    }
    return false; // Ana ekrandaysa uygulamadan çıkışa izin ver
  };

  // Android Donanım Geri Tuşu Dinleyicisi
  useEffect(() => {
    const onBackPress = () => {
      return goBack();
    };

    const backSubscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => backSubscription.remove();
  }, [screenHistory]);

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
      setScreenHistory(["admin-panel"]);
    } else {
      setSelectedRole("member");
      setScreenHistory(["clubs"]);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      console.log("Çıkış hatası:", e);
    }
    setScreenHistory(["login"]);
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

          <View style={{ flexDirection: "row", gap: 6 }}>
            <TouchableOpacity
              onPress={() => {
                setSelectedRole("member");
                navigateTo("member-dashboard");
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

            <TouchableOpacity
              onPress={() => navigateTo("clubs")}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 6,
                backgroundColor: currentScreen === "clubs" ? "#3b82f6" : "#1e293b",
              }}
            >
              <Text style={{ color: "#ffffff", fontSize: 11, fontWeight: "700" }}>Kulüpler</Text>
            </TouchableOpacity>

            {isSuperAdmin && (
              <TouchableOpacity
                onPress={() => {
                  setSelectedRole("superadmin");
                  navigateTo("admin-panel");
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
            onNavigateToRegister={() => navigateTo("register")}
            onNavigateToForgotPassword={() => navigateTo("forgot-password")}
            onNavigateToAcceptInvite={() => navigateTo("accept-invite")}
            {...({
              onNavigateAcceptInvite: () => navigateTo("accept-invite"),
              onAcceptInvite: () => navigateTo("accept-invite"),
              onNavigateToInviteAccept: () => navigateTo("accept-invite"),
            } as any)}
            onLoginSuccess={handleLoginSuccess}
          />
        )}

        {currentScreen === "register" && (
          <RegisterScreen
            onNavigateToLogin={goBack}
            {...({
              onRegisterSuccess: handleLoginSuccess,
              onSuccess: handleLoginSuccess,
              onRegister: handleLoginSuccess,
            } as any)}
          />
        )}

        {currentScreen === "forgot-password" && <ForgotPasswordScreen onNavigateToLogin={goBack} />}

        {currentScreen === "accept-invite" && (
          <InviteAcceptScreen onSuccess={goBack} onCancel={goBack} />
        )}

        {currentScreen === "clubs" && (
          <ClubsScreen
            userEmail={user?.email || undefined}
            onLogout={handleLogout}
            onSelectClub={(club: Club) => {
              setSelectedClub(club);
              navigateTo("club-detail");
            }}
          />
        )}

        {currentScreen === "club-detail" && selectedClub && (
          <ClubDetailScreen
            club={selectedClub}
            onBack={goBack}
            onManage={() => navigateTo("manage-club")}
          />
        )}

        {currentScreen === "admin-panel" &&
          (isSuperAdmin ? (
            <AdminPanelScreen
              onBack={goBack}
              onManageClub={(club: Club) => {
                setSelectedClub(club);
                navigateTo("manage-club");
              }}
            />
          ) : (
            <View className="flex-1 justify-center items-center px-6 bg-slate-900">
              <Text className="text-red-400 text-xl font-bold text-center">Yetkisiz Erişim</Text>
              <TouchableOpacity
                onPress={() => setScreenHistory(["clubs"])}
                className="mt-6 bg-indigo-600 px-6 py-3 rounded-xl"
              >
                <Text className="text-white font-semibold">Kulüpler Ekranına Dön</Text>
              </TouchableOpacity>
            </View>
          ))}

        {currentScreen === "manage-club" && selectedClub && (
          <ClubManageScreen clubId={selectedClub.id} clubName={selectedClub.ad} onBack={goBack} />
        )}

        {currentScreen === "member-dashboard" && (
          <MemberDashboardScreen userEmail={user?.email || undefined} onBack={goBack} />
        )}
      </View>
    </SafeAreaView>
  );
}
