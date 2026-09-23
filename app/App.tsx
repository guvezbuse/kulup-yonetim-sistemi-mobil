import "./global.css";
import React, { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { LoginScreen } from "./screens/LoginScreen";
import { RegisterScreen } from "./screens/RegisterScreen";
import { ForgotPasswordScreen } from "./screens/ForgotPasswordScreen";
import { ClubsScreen } from "./screens/ClubsScreen";

type CurrentScreen = "login" | "register" | "forgot" | "clubs";

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<CurrentScreen>("clubs");
  const [userEmail, setUserEmail] = useState("guvezbuse@gmail.com");

  return (
    <>
      <StatusBar style="light" />

      {currentScreen === "login" && (
        <LoginScreen
          onNavigateToRegister={() => setCurrentScreen("register")}
          onNavigateToForgot={() => setCurrentScreen("forgot")}
          onLoginSuccess={(email) => {
            if (email) setUserEmail(email);
            setCurrentScreen("clubs");
          }}
        />
      )}

      {currentScreen === "register" && (
        <RegisterScreen
          onNavigateToLogin={() => setCurrentScreen("login")}
          onRegisterSuccess={() => setCurrentScreen("clubs")}
        />
      )}

      {currentScreen === "forgot" && (
        <ForgotPasswordScreen onNavigateToLogin={() => setCurrentScreen("login")} />
      )}

      {currentScreen === "clubs" && (
        <ClubsScreen
          userEmail={userEmail}
          onLogout={() => setCurrentScreen("login")}
          onSelectClub={(club) => {
            console.log("Seçilen kulüp:", club.ad);
          }}
        />
      )}
    </>
  );
}
