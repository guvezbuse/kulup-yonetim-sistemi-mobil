import "./global.css";
import React, { useState, useEffect } from "react";
import { View, Text, StatusBar, TouchableOpacity, BackHandler, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { onAuthStateChanged, signOut, User as FirebaseUser } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./lib/firebase";

import { LoginScreen } from "./screens/LoginScreen";
import { RegisterScreen } from "./screens/RegisterScreen";
import { ForgotPasswordScreen } from "./screens/ForgotPasswordScreen";
import ClubsScreen from "./screens/ClubsScreen";
import AdminPanelScreen from "./screens/AdminPanelScreen";
import MemberDashboardScreen from "./screens/MemberDashboardScreen";
import ClubManageScreen from "./screens/ClubManageScreen";
import ClubDetailScreen from "./screens/ClubDetailScreen";
import InviteAcceptScreen from "./screens/InviteAcceptScreen";
import ProfileScreen from "./screens/ProfileScreen";
import EventsScreen from "./screens/EventsScreen";
import type { Club } from "./types";

type ScreenType =
  | "login"
  | "register"
  | "forgot-password"
  | "accept-invite"
  | "profile"
  | "clubs"
  | "announcements"
  | "events"
  | "admin-panel"
  | "manage-club"
  | "club-detail";

export default function App() {
  const [screenHistory, setScreenHistory] = useState<ScreenType[]>(["login"]);
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const currentScreen = screenHistory[screenHistory.length - 1];

  // Auth durumu ve Admin kontrolü
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists() && userDoc.data().is_admin === true) {
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
          }
        } catch {
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const navigateTo = (screen: ScreenType) => {
    if (currentScreen === screen) return;
    setScreenHistory((prev) => [...prev, screen]);
  };

  const goBack = () => {
    if (screenHistory.length > 1) {
      setScreenHistory((prev) => prev.slice(0, -1));
      return true;
    }
    return false;
  };

  useEffect(() => {
    const onBackPress = () => goBack();
    const backSubscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => backSubscription.remove();
  }, [screenHistory]);

  const handleLoginSuccess = () => {
    setScreenHistory(["clubs"]);
  };

  const handleLogout = () => {
    Alert.alert("Çıkış Yap", "Hesabınızdan çıkış yapmak istediğinize emin misiniz?", [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Çıkış Yap",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut(auth);
          } catch (e) {
            console.log("Çıkış hatası:", e);
          }
          setScreenHistory(["login"]);
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0f172a" }}>
      <StatusBar barStyle="light-content" backgroundColor="#020617" />

      {/* SABİT, TAŞMAYAN ÜST MENÜ */}
      {user && (
        <View
          style={{
            backgroundColor: "#020617",
            borderBottomWidth: 1,
            borderBottomColor: "#1e293b",
            paddingHorizontal: 8,
            paddingVertical: 8,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* 1. Profil (Adam İkonu) */}
          <TouchableOpacity
            onPress={() => navigateTo("profile")}
            style={{
              paddingVertical: 6,
              paddingHorizontal: 10,
              borderRadius: 8,
              backgroundColor: currentScreen === "profile" ? "#4f46e5" : "#0f172a",
              borderWidth: 1,
              borderColor: currentScreen === "profile" ? "#6366f1" : "#1e293b",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 16 }}>👤</Text>
          </TouchableOpacity>

          {/* 2. Kulüpler */}
          <TouchableOpacity
            onPress={() => navigateTo("clubs")}
            style={{
              flex: 1,
              marginHorizontal: 3,
              paddingVertical: 7,
              borderRadius: 8,
              backgroundColor:
                currentScreen === "clubs" ||
                currentScreen === "club-detail" ||
                currentScreen === "manage-club"
                  ? "#2563eb"
                  : "#0f172a",
              borderWidth: 1,
              borderColor:
                currentScreen === "clubs" ||
                currentScreen === "club-detail" ||
                currentScreen === "manage-club"
                  ? "#3b82f6"
                  : "#1e293b",
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#ffffff", fontSize: 11, fontWeight: "700" }}>Kulüpler</Text>
          </TouchableOpacity>

          {/* 3. Duyurular */}
          <TouchableOpacity
            onPress={() => navigateTo("announcements")}
            style={{
              flex: 1,
              marginHorizontal: 3,
              paddingVertical: 7,
              borderRadius: 8,
              backgroundColor: currentScreen === "announcements" ? "#059669" : "#0f172a",
              borderWidth: 1,
              borderColor: currentScreen === "announcements" ? "#10b981" : "#1e293b",
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#ffffff", fontSize: 11, fontWeight: "700" }}>Duyurular</Text>
          </TouchableOpacity>

          {/* 4. Etkinlikler */}
          <TouchableOpacity
            onPress={() => navigateTo("events")}
            style={{
              flex: 1,
              marginHorizontal: 3,
              paddingVertical: 7,
              borderRadius: 8,
              backgroundColor: currentScreen === "events" ? "#7c3aed" : "#0f172a",
              borderWidth: 1,
              borderColor: currentScreen === "events" ? "#8b5cf6" : "#1e293b",
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#ffffff", fontSize: 11, fontWeight: "700" }}>Etkinlikler</Text>
          </TouchableOpacity>

          {/* 5. Çıkış */}
          <TouchableOpacity
            onPress={handleLogout}
            style={{
              marginHorizontal: 3,
              paddingVertical: 7,
              paddingHorizontal: 9,
              borderRadius: 8,
              backgroundColor: "#991b1b",
              borderWidth: 1,
              borderColor: "#ef4444",
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#ffffff", fontSize: 11, fontWeight: "700" }}>Çıkış</Text>
          </TouchableOpacity>

          {/* 6. Admin Paneli (Sadece Admin ise görünür) */}
          {isAdmin && (
            <TouchableOpacity
              onPress={() => navigateTo("admin-panel")}
              style={{
                marginLeft: 2,
                paddingVertical: 7,
                paddingHorizontal: 8,
                borderRadius: 8,
                backgroundColor: currentScreen === "admin-panel" ? "#d97706" : "#78350f",
                borderWidth: 1,
                borderColor: "#f59e0b",
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#fbbf24", fontSize: 11, fontWeight: "700" }}>Admin</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* SAYFA YÖNLENDİRİCİ */}
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

        {currentScreen === "profile" && <ProfileScreen />}

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

        {currentScreen === "announcements" && (
          <MemberDashboardScreen userEmail={user?.email || undefined} onBack={goBack} />
        )}

        {currentScreen === "events" && <EventsScreen />}

        {currentScreen === "club-detail" && selectedClub && (
          <ClubDetailScreen
            club={selectedClub}
            onBack={goBack}
            onManage={() => navigateTo("manage-club")}
          />
        )}

        {currentScreen === "manage-club" && selectedClub && (
          <ClubManageScreen clubId={selectedClub.id} clubName={selectedClub.ad} onBack={goBack} />
        )}

        {currentScreen === "admin-panel" &&
          (isAdmin ? (
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
                onPress={() => navigateTo("clubs")}
                className="mt-6 bg-indigo-600 px-6 py-3 rounded-xl"
              >
                <Text className="text-white font-semibold">Kulüpler Ekranına Dön</Text>
              </TouchableOpacity>
            </View>
          ))}
      </View>
    </SafeAreaView>
  );
}
