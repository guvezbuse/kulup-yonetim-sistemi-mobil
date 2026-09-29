import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, ActivityIndicator } from "react-native";
import { auth, db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export default function ProfileScreen() {
  const currentUser = auth.currentUser;
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          setProfileData(userDoc.data());
        }
      } catch (error) {
        console.log("Profil verisi çekilemedi:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [currentUser]);

  if (loading) {
    return (
      <View className="flex-1 bg-slate-900 justify-center items-center">
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  const displayName = profileData?.ad
    ? `${profileData.ad} ${profileData.soyad || ""}`.trim()
    : profileData?.name
      ? `${profileData.name} ${profileData.surname || ""}`.trim()
      : "Öğrenci";

  const studentNo = profileData?.student_no || profileData?.ogrenci_no || null;

  return (
    <ScrollView className="flex-1 bg-slate-900 px-4 pt-4" showsVerticalScrollIndicator={false}>
      <Text className="text-2xl font-bold text-white mb-1">Profilim</Text>
      <Text className="text-slate-400 text-xs mb-5">
        Öğrenci bilgileri, QR kod yoklama ve etkinlik geçmişi
      </Text>

      {/* Profil Kartı */}
      <View className="bg-slate-800 p-4 rounded-2xl border border-slate-700 mb-4">
        <View className="flex-row items-center gap-3">
          <View className="w-14 h-14 rounded-full bg-indigo-600/30 border border-indigo-500/40 items-center justify-center">
            <Text className="text-indigo-400 font-bold text-xl">
              {(displayName[0] || currentUser?.email?.[0] || "U").toUpperCase()}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-white font-bold text-base">{displayName}</Text>
            <Text className="text-slate-400 text-xs">{currentUser?.email}</Text>
            {studentNo && (
              <Text className="text-indigo-400 text-xs font-mono mt-0.5">
                Öğrenci No: {studentNo}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* QR Kod Alanı */}
      <View className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700/80 mb-4 items-center">
        <Text className="text-indigo-400 font-bold text-sm mb-1">📷 Etkinlik Yoklama QR Kodu</Text>
        <Text className="text-slate-400 text-xs text-center mb-4">
          Etkinlik girişlerinde görevliye bu kodu göstererek yoklamanızı verebilirsiniz.
        </Text>
        <View className="w-40 h-40 bg-white rounded-xl items-center justify-center p-2 mb-2">
          <Text className="text-slate-900 text-xs font-mono font-bold text-center">[ QR Kod ]</Text>
        </View>
      </View>

      {/* Katılınan Etkinlikler */}
      <View className="bg-slate-800 p-4 rounded-2xl border border-slate-700 mb-10">
        <Text className="text-white font-bold text-sm mb-2">Katılınan Etkinlikler</Text>
        <Text className="text-slate-400 text-xs italic">
          Henüz bir etkinliğe katılım sağlanmadı.
        </Text>
      </View>
    </ScrollView>
  );
}
