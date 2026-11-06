import "./global.css";
import React, { useState, useEffect } from "react";
import { View, Text, StatusBar, TouchableOpacity, BackHandler, Alert, LogBox } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { LoginScreen } from "./screens/LoginScreen";
import { RegisterScreen } from "./screens/RegisterScreen";
import { ForgotPasswordScreen } from "./screens/ForgotPasswordScreen";
import ClubsScreen from "./screens/ClubsScreen";
import CreateEventScreen from "./screens/admin/CreateEventScreen";
import EditEventScreen from "./screens/EditEventScreen";
import ClubManageScreen from "./screens/club-manage/ClubManageScreen";
import ClubDetailScreen from "./screens/ClubDetailScreen";
import InviteAcceptScreen from "./screens/InviteAcceptScreen";
import ProfileScreen from "./screens/ProfileScreen";
import EditProfileScreen from "./screens/EditProfileScreen";
import MemberIdCardScreen from "./screens/MemberIdCardScreen";
import EventsScreen from "./screens/EventsScreen";
import DraftsScreen from "./screens/DraftsScreen";
import AttendanceScreen from "./screens/AttendanceScreen";
import MyClubsScreen from "./screens/MyClubsScreen";
import EventHistoryScreen from "./screens/EventHistoryScreen";
import NotificationsScreen from "./screens/NotificationsScreen";
import ManageUsersScreen from "./screens/admin/ManageUsersScreen";
import { useAuthStore } from "./store/authStore";
import type { Club } from "./types";
import { notificationService } from "./services/notificationService";

LogBox.ignoreAllLogs(true);
LogBox.ignoreLogs(["expo-notifications: Android Push notifications functionality"]);

const AUTH_SCREENS = ["login", "register", "forgot-password"];

type ScreenType =
  | "login"
  | "register"
  | "forgot-password"
  | "accept-invite"
  | "profile"
  | "edit-profile"
  | "id-card"
  | "clubs"
  | "announcements"
  | "events"
  | "drafts"
  | "attendance"
  | "create-event"
  | "edit-event"
  | "my-clubs"
  | "event-history"
  | "notifications"
  | "manage-users"
  | "manage-club"
  | "club-detail";

export default function App() {
  const [screenHistory, setScreenHistory] = useState<ScreenType[]>(["login"]);
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [editingEventId, setEditingEventId] = useState<string>("");
  const [attendanceEventId, setAttendanceEventId] = useState<string>("");
  const [attendanceEventTitle, setAttendanceEventTitle] = useState<string>("");

  const user = useAuthStore((state) => state.user);
  const initializeAuthListener = useAuthStore((state) => state.initializeAuthListener);
  const logout = useAuthStore((state) => state.logout);

  const currentScreen = screenHistory[screenHistory.length - 1];

  // Oturum dinleyicisini bağla; user/profile tek kaynaktan senkron kalsın
  useEffect(() => {
    const unsubscribe = initializeAuthListener();
    return () => unsubscribe();
  }, [initializeAuthListener]);

  // Bildirim tokenı yalnızca oturum açıldığında kaydedilir
  useEffect(() => {
    if (!user) return;
    notificationService.registerForPushNotificationsAsync(user.uid);
  }, [user]);

  // Oturum durumuna göre başlangıç ekranını eşitle
  useEffect(() => {
    if (user && AUTH_SCREENS.includes(currentScreen)) {
      setScreenHistory(["clubs"]);
    } else if (!user && !AUTH_SCREENS.includes(currentScreen) && currentScreen !== "accept-invite") {
      setScreenHistory(["login"]);
    }
  }, [user, currentScreen]);

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
            await logout();
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
      <StatusBar barStyle="light-content" />

      {/* SABİT, TAŞMAYAN ÜST MENÜ */}
      {user && (
        <View
          style={{
            backgroundColor: "#020617",
            borderBottomWidth: 1,
            borderBottomColor: "#1e293b",
            paddingHorizontal: 6,
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
              paddingHorizontal: 8,
              borderRadius: 8,
              backgroundColor:
                currentScreen === "profile" ||
                currentScreen === "edit-profile" ||
                currentScreen === "my-clubs" ||
                currentScreen === "event-history" ||
                currentScreen === "manage-users"
                  ? "#4f46e5"
                  : "#0f172a",
              borderWidth: 1,
              borderColor:
                currentScreen === "profile" ||
                currentScreen === "edit-profile" ||
                currentScreen === "my-clubs" ||
                currentScreen === "event-history" ||
                currentScreen === "manage-users"
                  ? "#6366f1"
                  : "#1e293b",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 15 }}>👤</Text>
          </TouchableOpacity>

          {/* 2. Kulüpler */}
          <TouchableOpacity
            onPress={() => navigateTo("clubs")}
            style={{
              flex: 1,
              marginHorizontal: 2,
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
            <Text style={{ color: "#ffffff", fontSize: 10.5, fontWeight: "700" }}>Kulüpler</Text>
          </TouchableOpacity>

          {/* 3. Duyurular */}
          <TouchableOpacity
            onPress={() => navigateTo("announcements")}
            style={{
              flex: 1,
              marginHorizontal: 2,
              paddingVertical: 7,
              borderRadius: 8,
              backgroundColor: currentScreen === "announcements" ? "#059669" : "#0f172a",
              borderWidth: 1,
              borderColor: currentScreen === "announcements" ? "#10b981" : "#1e293b",
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#ffffff", fontSize: 10.5, fontWeight: "700" }}>Duyurular</Text>
          </TouchableOpacity>

          {/* 4. Etkinlikler */}
          <TouchableOpacity
            onPress={() => navigateTo("events")}
            style={{
              flex: 1,
              marginHorizontal: 2,
              paddingVertical: 7,
              borderRadius: 8,
              backgroundColor:
                currentScreen === "events" ||
                currentScreen === "drafts" ||
                currentScreen === "attendance" ||
                currentScreen === "create-event" ||
                currentScreen === "edit-event"
                  ? "#7c3aed"
                  : "#0f172a",
              borderWidth: 1,
              borderColor:
                currentScreen === "events" ||
                currentScreen === "drafts" ||
                currentScreen === "attendance" ||
                currentScreen === "create-event" ||
                currentScreen === "edit-event"
                  ? "#8b5cf6"
                  : "#1e293b",
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#ffffff", fontSize: 10.5, fontWeight: "700" }}>Etkinlikler</Text>
          </TouchableOpacity>

          {/* 5. Bildirimler İkonu */}
          <TouchableOpacity
            onPress={() => navigateTo("notifications")}
            style={{
              paddingVertical: 6,
              paddingHorizontal: 8,
              marginHorizontal: 2,
              borderRadius: 8,
              backgroundColor: currentScreen === "notifications" ? "#312e81" : "#0f172a",
              borderWidth: 1,
              borderColor: currentScreen === "notifications" ? "#6366f1" : "#1e293b",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 14 }}>🔔</Text>
          </TouchableOpacity>

          {/* 6. Çıkış */}
          <TouchableOpacity
            onPress={handleLogout}
            style={{
              marginHorizontal: 2,
              paddingVertical: 7,
              paddingHorizontal: 7,
              borderRadius: 8,
              backgroundColor: "#991b1b",
              borderWidth: 1,
              borderColor: "#ef4444",
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#ffffff", fontSize: 10.5, fontWeight: "700" }}>Çıkış</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* SAYFA YÖNLENDİRİCİ */}
      <View style={{ flex: 1 }}>
        {currentScreen === "login" && (
          <LoginScreen
            onNavigateToRegister={() => navigateTo("register")}
            onNavigateToForgotPassword={() => navigateTo("forgot-password")}
            onNavigateToAcceptInvite={() => navigateTo("accept-invite")}
            onLoginSuccess={handleLoginSuccess}
          />
        )}

        {currentScreen === "register" && (
          <RegisterScreen onNavigateToLogin={goBack} onRegisterSuccess={handleLoginSuccess} />
        )}

        {currentScreen === "forgot-password" && <ForgotPasswordScreen onNavigateToLogin={goBack} />}

        {currentScreen === "accept-invite" && (
          <InviteAcceptScreen onSuccess={goBack} onCancel={goBack} />
        )}

        {currentScreen === "profile" && (
          <ProfileScreen
            onOpenManageUsers={() => navigateTo("manage-users")}
            onOpenIdCard={() => navigateTo("id-card")}
            onEditProfile={() => navigateTo("edit-profile")}
            onOpenMyClubs={() => navigateTo("my-clubs")}
            onOpenEventHistory={() => navigateTo("event-history")}
          />
        )}

        {currentScreen === "edit-profile" && <EditProfileScreen onBack={goBack} />}

        {currentScreen === "my-clubs" && (
          <MyClubsScreen
            onBack={goBack}
            onSelectClub={(club: Club) => {
              setSelectedClub(club);
              navigateTo("club-detail");
            }}
          />
        )}

        {currentScreen === "event-history" && <EventHistoryScreen onBack={goBack} />}

        {currentScreen === "id-card" && <MemberIdCardScreen onBack={goBack} />}

        {currentScreen === "manage-users" && <ManageUsersScreen onBack={goBack} />}

        {currentScreen === "clubs" && (
          <ClubsScreen
            onSelectClub={(club: Club) => {
              setSelectedClub(club);
              navigateTo("club-detail");
            }}
            onManageClub={(club: Club) => {
              setSelectedClub(club);
              navigateTo("manage-club");
            }}
          />
        )}

        {/* Duyurular menüsüne tıklandığında doğrudan NotificationsScreen çağrılır */}
        {(currentScreen === "announcements" || currentScreen === "notifications") && (
          <NotificationsScreen onBack={goBack} />
        )}

        {currentScreen === "events" && (
          <EventsScreen
            navigation={{
              navigate: (screen: string, params?: Record<string, unknown>) => {
                if (screen === "CreateEvent") {
                  navigateTo("create-event");
                } else if (screen === "EditEventScreen") {
                  setEditingEventId(String(params?.eventId || ""));
                  navigateTo("edit-event");
                } else if (screen === "Drafts") {
                  navigateTo("drafts");
                } else if (screen === "Attendance") {
                  setAttendanceEventId(String(params?.eventId || ""));
                  setAttendanceEventTitle(String(params?.eventTitle || ""));
                  navigateTo("attendance");
                }
              },
            }}
          />
        )}

        {currentScreen === "drafts" && (
          <DraftsScreen
            onBack={goBack}
            onEditEvent={(eventId: string) => {
              setEditingEventId(eventId);
              navigateTo("edit-event");
            }}
          />
        )}

        {currentScreen === "attendance" && (
          <AttendanceScreen
            eventId={attendanceEventId}
            eventTitle={attendanceEventTitle}
            onBack={goBack}
          />
        )}

        {currentScreen === "create-event" && (
          <CreateEventScreen
            navigation={{
              goBack: goBack,
            }}
          />
        )}

        {currentScreen === "edit-event" && (
          <EditEventScreen
            route={{ params: { eventId: editingEventId } }}
            navigation={{
              goBack: goBack,
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

        {currentScreen === "manage-club" && selectedClub && (
          <ClubManageScreen clubId={selectedClub.id} clubName={selectedClub.ad} onBack={goBack} />
        )}
      </View>
    </SafeAreaView>
  );
}
