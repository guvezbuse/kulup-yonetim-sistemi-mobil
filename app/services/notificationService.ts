import * as Device from "expo-device";
import { Platform } from "react-native";
import {
  doc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";

// expo-notifications'ı güvenli (safe) import ediyoruz (Expo Go patlamasın diye)
let Notifications: any = null;
try {
  Notifications = require("expo-notifications");
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
} catch (e) {
  console.log("Push notifications yerel ortamda aktif değil.");
}

export const notificationService = {
  // 1. Cihaz Push Token Alımı ve users/{uid} kaydı
  registerForPushNotificationsAsync: async (userId: string) => {
    if (!Notifications || !userId) return null;
    let token: string | null = null;

    try {
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "Varsayılan",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#6366f1",
        });
      }

      if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus === "granted") {
          const tokenData = await Notifications.getExpoPushTokenAsync();
          token = tokenData.data;
          await updateDoc(doc(db, "users", userId), { expoPushToken: token });
        }
      }
    } catch (err) {
      console.log("Token kaydı atlandı (Expo Go modunda normaldir):", err);
    }
    return token;
  },

  // 2. Doğrudan Expo Push API Gönderimi + Firestore Bildirim Geçmişi Kaydı
  sendPush: async (targetUserIds: string[], title: string, body: string, data = {}) => {
    if (!targetUserIds || targetUserIds.length === 0) return;

    try {
      // A. Uygulama içi bildirim geçmişi için Firestore'a yaz (Şartname güvencesi)
      const uniqueUserIds = Array.from(new Set(targetUserIds));
      for (const uid of uniqueUserIds) {
        addDoc(collection(db, "notifications"), {
          user_id: uid,
          title,
          body,
          data,
          read: false,
          createdAt: serverTimestamp(),
        }).catch(() => {});
      }

      // B. Bu kullanıcıların cihaz push tokenlarını bul
      const allUsersSnap = await getDocs(collection(db, "users"));
      const tokens: string[] = [];
      allUsersSnap.forEach((docSnap) => {
        if (uniqueUserIds.includes(docSnap.id)) {
          const uData = docSnap.data();
          if (uData.expoPushToken && uData.expoPushToken.startsWith("ExponentPushToken")) {
            tokens.push(uData.expoPushToken);
          }
        }
      });

      // C. Cihazlara push bildirim fırlat
      if (tokens.length > 0) {
        const messages = tokens.map((to) => ({
          to,
          sound: "default",
          title,
          body,
          data,
        }));

        await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Accept-encoding": "gzip, deflate",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(messages),
        });
      }
    } catch (error) {
      console.log("Bildirim tetikleme hatası:", error);
    }
  },

  // -------------------------------------------------------------
  // ŞARTNAME 8: ÖZEL DURUMLAR İÇİN TETİKLEYİCİ FONKSİYONLAR
  // -------------------------------------------------------------

  // Kural 1: Duyuru yayınlandığında → hedef kitle
  notifyAnnouncement: async (
    kapsam: "sistem" | "kulup",
    hedefKitle: string,
    clubId: string | null,
    title: string,
    content: string,
  ) => {
    const userIds: string[] = [];
    if (kapsam === "kulup" && clubId) {
      const snap = await getDocs(
        query(
          collection(db, "memberships"),
          where("club_id", "==", clubId),
          where("status", "==", "aktif"),
        ),
      );
      snap.forEach((d) => userIds.push(d.data().user_id));
    } else {
      if (hedefKitle === "tum_uyeler") {
        const snap = await getDocs(collection(db, "users"));
        snap.forEach((d) => userIds.push(d.id));
      } else if (hedefKitle === "tum_yoneticiler") {
        const snap = await getDocs(
          query(collection(db, "memberships"), where("status", "==", "aktif")),
        );
        snap.forEach((d) => {
          const role = (d.data().role || "").toLowerCase();
          if (role === "yonetici" || role === "yönetici" || role === "baskan")
            userIds.push(d.data().user_id);
        });
      }
    }
    await notificationService.sendPush(userIds, `📢 ${title}`, content);
  },

  // Kural 2: Etkinlik yayınlandığında → kulüp üyeleri (veya üniversite geneli)
  notifyEventPublished: async (clubId: string | null, eventTitle: string, eventDate: string) => {
    const userIds: string[] = [];
    if (clubId) {
      const snap = await getDocs(
        query(
          collection(db, "memberships"),
          where("club_id", "==", clubId),
          where("status", "==", "aktif"),
        ),
      );
      snap.forEach((d) => userIds.push(d.data().user_id));
      await notificationService.sendPush(
        userIds,
        "🎉 Yeni Kulüp Etkinliği!",
        `${eventTitle} etkinliği yayınlandı. Tarih: ${eventDate}`,
      );
    } else {
      // Üniversite geneli etkinlik
      const snap = await getDocs(collection(db, "users"));
      snap.forEach((d) => userIds.push(d.id));
      await notificationService.sendPush(
        userIds,
        "🏛️ Üniversite Geneli Etkinlik!",
        `${eventTitle} tüm öğrencilere açıldı.`,
      );
    }
  },

  // Kural 3: Üyelik başvurusu geldiğinde → ilgili kulübün yöneticileri
  notifyMembershipApplication: async (clubId: string, applicantName: string) => {
    const managerIds: string[] = [];
    const snap = await getDocs(
      query(
        collection(db, "memberships"),
        where("club_id", "==", clubId),
        where("status", "==", "aktif"),
      ),
    );
    snap.forEach((d) => {
      const role = (d.data().role || "").toLowerCase();
      if (role === "yonetici" || role === "yönetici" || role === "baskan") {
        managerIds.push(d.data().user_id);
      }
    });
    await notificationService.sendPush(
      managerIds,
      "📥 Yeni Üyelik Başvurusu",
      `${applicantName} kulübünüze katılmak için başvurdu.`,
    );
  },

  // Kural 4: Başvuru onaylandı/reddedildiğinde → başvuru sahibi
  notifyApplicationDecision: async (
    targetUserId: string,
    clubName: string,
    status: "onaylandi" | "reddedildi",
  ) => {
    const title = status === "onaylandi" ? "🎉 Başvurunuz Onaylandı!" : "ℹ️ Başvuru Durumu";
    const body =
      status === "onaylandi"
        ? `Tebrikler! ${clubName} kulübüne üyelik başvurunuz onaylandı.`
        : `${clubName} kulübüne yaptığınız üyelik başvurusu reddedildi.`;
    await notificationService.sendPush([targetUserId], title, body);
  },

  // Kural 5: Yöneticilik/üyelik daveti geldiğinde → davet edilen kişi
  notifyRoleInvitation: async (targetUserId: string, clubName: string, role: string) => {
    await notificationService.sendPush(
      [targetUserId],
      "✉️ Yeni Rol / Davet",
      `${clubName} kulübünde size '${role}' yetkisi tanımlandı.`,
    );
  },
};
