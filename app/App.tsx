import "./global.css";
import React, { useState } from "react";
import { View, Text, StatusBar, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LoginScreen } from "./screens/LoginScreen";
import { RegisterScreen } from "./screens/RegisterScreen";
import { ForgotPasswordScreen } from "./screens/ForgotPasswordScreen";
import { ClubsScreen } from "./screens/ClubsScreen";
import AdminPanelScreen from "./screens/AdminPanelScreen";
import MemberDashboardScreen from "./screens/MemberDashboardScreen";

type ScreenType =
  "login" | "register" | "forgot-password" | "clubs" | "admin-panel" | "member-dashboard";
type UserRole = "superadmin" | "clubadmin" | "member";

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>("clubs");
  const [currentUser, setCurrentUser] = useState<{ email: string } | null>({
    email: "guvezbuse@gmail.com",
  });
  const [selectedRole, setSelectedRole] = useState<UserRole>("clubadmin");

  const handleLogin = () => {
    setCurrentUser({ email: "guvezbuse@gmail.com" });
    setCurrentScreen("clubs");
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentScreen("login");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0f172a" }}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* STATİK MOCK ROL SEÇİCİ */}
      {currentUser && (
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
          <Text style={{ color: "#94a3b8", fontSize: 12, fontWeight: "600" }}>Mock Rol:</Text>
          <View style={{ flexDirection: "row", gap: 6 }}>
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

            <TouchableOpacity
              onPress={() => {
                setSelectedRole("clubadmin");
                setCurrentScreen("admin-panel");
              }}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 6,
                backgroundColor: selectedRole === "clubadmin" ? "#d97706" : "#1e293b",
              }}
            >
              <Text style={{ color: "#ffffff", fontSize: 11, fontWeight: "700" }}>
                Yönetici Paneli
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setSelectedRole("superadmin");
                setCurrentScreen("clubs");
              }}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 6,
                backgroundColor: selectedRole === "superadmin" ? "#4f46e5" : "#1e293b",
              }}
            >
              <Text style={{ color: "#ffffff", fontSize: 11, fontWeight: "700" }}>Kulüplerim</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* EKRAN ROUTER */}
      <View style={{ flex: 1 }}>
        {currentScreen === "login" && (
          <LoginScreen
            onNavigateToRegister={() => setCurrentScreen("register")}
            onNavigateToForgot={() => setCurrentScreen("forgot-password")}
            onLoginSuccess={handleLogin}
          />
        )}

        {currentScreen === "register" && (
          <RegisterScreen
            onRegisterSuccess={handleLogin}
            onNavigateLogin={() => setCurrentScreen("login")}
            {...({
              onNavigateToLogin: () => setCurrentScreen("login"),
            } as any)}
          />
        )}

        {currentScreen === "forgot-password" && (
          <ForgotPasswordScreen
            onNavigateToLogin={() => setCurrentScreen("login")}
            {...({
              onNavigateLogin: () => setCurrentScreen("login"),
            } as any)}
          />
        )}

        {currentScreen === "clubs" && (
          <ClubsScreen userEmail={currentUser?.email} onLogout={handleLogout} />
        )}

        {currentScreen === "admin-panel" && (
          <AdminPanelScreen clubName="Yazılım Kulübü" onBack={() => setCurrentScreen("clubs")} />
        )}

        {currentScreen === "member-dashboard" && (
          <MemberDashboardScreen
            userEmail={currentUser?.email}
            onBack={() => setCurrentScreen("clubs")}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
