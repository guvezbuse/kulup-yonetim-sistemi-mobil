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
      const uniqueUserIds = Array.from(new Set(targetUserIds));

      // A. Uygulama içi bildirim geçmişi için Firestore'a paralel yaz (Şartname güvencesi)
      const saveNotificationPromises = uniqueUserIds.map((uid) =>
        addDoc(collection(db, "notifications"), {
          user_id: uid,
          title,
          body,
          data,
          read: false,
          createdAt: serverTimestamp(),
        }).catch((err) => console.log(`Bildirim kaydedilemedi (${uid}):`, err)),
      );
      await Promise.allSettled(saveNotificationPromises);

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
  // ŞARTNAME: ÖZEL DURUMLAR İÇİN TETİKLEYİCİ FONKSİYONLAR
  // -------------------------------------------------------------

  // Kural 1: Duyuru yayınlandığında → hedef kitle
  notifyAnnouncement: async (
    kapsam: "sistem" | "kulup" | string,
    hedefKitle: "tum_uyeler" | "tum_yoneticiler" | string,
    clubId: string | null | undefined,
    title: string,
    content: string,
  ) => {
    try {
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
        if (hedefKitle === "tum_uyeler" || hedefKitle === "hepsi") {
          const snap = await getDocs(collection(db, "users"));
          snap.forEach((d) => userIds.push(d.id));
        } else if (hedefKitle === "tum_yoneticiler") {
          const snap = await getDocs(
            query(collection(db, "memberships"), where("status", "==", "aktif")),
          );
          snap.forEach((d) => {
            const role = (d.data().role || "").toLowerCase();
            if (
              role === "yonetici" ||
              role === "yönetici" ||
              role === "baskan" ||
              role === "başkan"
            )
              userIds.push(d.data().user_id);
          });
        }
      }
      await notificationService.sendPush(userIds, `📢 ${title}`, content);
    } catch (err) {
      console.log("notifyAnnouncement hatası:", err);
    }
  },

  // Kural 2: Etkinlik yayınlandığında → kulüp üyeleri (veya üniversite geneli)
  notifyEventPublished: async (
    clubId: string | null | undefined,
    eventTitle: string,
    eventDate: string,
  ) => {
    try {
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
    } catch (err) {
      console.log("notifyEventPublished hatası:", err);
    }
  },

  // Kural 3: Üyelik başvurusu geldiğinde → ilgili kulübün yöneticileri
  notifyMembershipApplication: async (clubId: string, applicantName: string) => {
    try {
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
        if (role === "yonetici" || role === "yönetici" || role === "baskan" || role === "başkan") {
          managerIds.push(d.data().user_id);
        }
      });
      await notificationService.sendPush(
        managerIds,
        "📥 Yeni Üyelik Başvurusu",
        `${applicantName} kulübünüze katılmak için başvurdu.`,
      );
    } catch (err) {
      console.log("notifyMembershipApplication hatası:", err);
    }
  },

  // Kural 4: Başvuru onaylandı/reddedildiğinde → başvuru sahibi
  notifyApplicationDecision: async (
    targetUserId: string,
    clubName: string,
    status: "onaylandi" | "reddedildi",
  ) => {
    try {
      const title = status === "onaylandi" ? "🎉 Başvurunuz Onaylandı!" : "ℹ️ Başvuru Durumu";
      const body =
        status === "onaylandi"
          ? `Tebrikler! ${clubName} kulübüne üyelik başvurunuz onaylandı.`
          : `${clubName} kulübüne yaptığınız üyelik başvurusu reddedildi.`;
      await notificationService.sendPush([targetUserId], title, body);
    } catch (err) {
      console.log("notifyApplicationDecision hatası:", err);
    }
  },

  // Kural 5: Yöneticilik/üyelik daveti geldiğinde → davet edilen kişi
  notifyRoleInvitation: async (targetUserId: string, clubName: string, role: string) => {
    try {
      await notificationService.sendPush(
        [targetUserId],
        "✉️ Yeni Rol / Davet",
        `${clubName} kulübünde size '${role}' yetkisi tanımlandı.`,
      );
    } catch (err) {
      console.log("notifyRoleInvitation hatası:", err);
    }
  },
};
