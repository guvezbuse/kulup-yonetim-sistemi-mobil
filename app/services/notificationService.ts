import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import {
  doc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  ANNOUNCEMENT_SCOPE,
  AnnouncementScope,
  CLUB_ROLE,
  ClubRole,
  JOIN_REQUEST_STATUS,
  JoinRequestStatus,
  MEMBERSHIP_STATUS,
  TARGET_AUDIENCE,
  TargetAudience,
  isClubManagerRole,
} from "../types";

// expo-notifications'ı güvenli (safe) import ediyoruz (Expo Go patlamasın diye)
type NotificationsModule = typeof import("expo-notifications");
let Notifications: NotificationsModule | null = null;
try {
  Notifications = require("expo-notifications") as NotificationsModule;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
} catch (e) {
  console.log("Push notifications yerel ortamda aktif değil.");
}

const chunkArray = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

const PUSH_BATCH_SIZE = 100; // Expo Push API tek istekte en fazla 100 mesaj kabul eder
const FIRESTORE_BATCH_SIZE = 500; // writeBatch tek commit'te en fazla 500 işlem
const IN_QUERY_BATCH_SIZE = 30; // Firestore "in" sorgusu en fazla 30 değer kabul eder

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
          const projectId = Constants.expoConfig?.extra?.eas?.projectId;
          const tokenData = await Notifications.getExpoPushTokenAsync(
            projectId ? { projectId } : undefined,
          );
          token = tokenData.data;
          await updateDoc(doc(db, "users", userId), { expoPushToken: token });
        }
      }
    } catch (err) {
      console.log("Token kaydı atlandı (Expo Go modunda normaldir):", err);
    }
    return token;
  },

  // 2. Expo Push API Gönderimi + Firestore Bildirim Geçmişi Kaydı
  sendPush: async (targetUserIds: string[], title: string, body: string, data = {}) => {
    if (!targetUserIds || targetUserIds.length === 0) return;

    const uniqueUserIds = Array.from(new Set(targetUserIds));

    // A. Uygulama içi bildirim geçmişi — 500'lük Firestore batch'leri
    try {
      for (const group of chunkArray(uniqueUserIds, FIRESTORE_BATCH_SIZE)) {
        const batch = writeBatch(db);
        group.forEach((uid) => {
          batch.set(doc(collection(db, "notifications")), {
            user_id: uid,
            title,
            body,
            data,
            read: false,
            createdAt: serverTimestamp(),
          });
        });
        await batch.commit();
      }
    } catch (err) {
      console.log("Bildirim geçmişi kaydedilemedi:", err);
    }

    try {
      // B. Kullanıcıların cihaz push tokenlarını 30'luk "in" sorgularıyla bul
      const tokens: string[] = [];
      for (const group of chunkArray(uniqueUserIds, IN_QUERY_BATCH_SIZE)) {
        const snap = await getDocs(
          query(collection(db, "users"), where("__name__", "in", group)),
        );
        snap.forEach((userDoc) => {
          const pushToken = userDoc.data().expoPushToken;
          if (typeof pushToken === "string" && pushToken.startsWith("ExponentPushToken")) {
            tokens.push(pushToken);
          }
        });
      }

      // C. Cihazlara 100'lük push batch'leri halinde gönder
      for (const group of chunkArray(tokens, PUSH_BATCH_SIZE)) {
        const messages = group.map((to) => ({
          to,
          sound: "default",
          title,
          body,
          data,
        }));

        const response = await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Accept-encoding": "gzip, deflate",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(messages),
        });

        if (!response.ok) {
          console.log("Push batch hatası:", response.status, await response.text());
        }
      }
    } catch (error) {
      console.log("Bildirim tetikleme hatası:", error);
    }
  },

  // -------------------------------------------------------------
  // ÖZEL DURUMLAR İÇİN TETİKLEYİCİ FONKSİYONLAR
  // -------------------------------------------------------------

  // Kural 1: Duyuru yayınlandığında → hedef kitle
  notifyAnnouncement: async (
    kapsam: AnnouncementScope,
    hedefKitle: TargetAudience,
    clubId: string | null | undefined,
    title: string,
    content: string,
  ) => {
    try {
      const userIds: string[] = [];
      if (kapsam === ANNOUNCEMENT_SCOPE.CLUB && clubId) {
        const snap = await getDocs(
          query(
            collection(db, "memberships"),
            where("club_id", "==", clubId),
            where("status", "==", MEMBERSHIP_STATUS.ACTIVE),
          ),
        );
        snap.forEach((d) => userIds.push(d.data().user_id));
      } else if (
        hedefKitle === TARGET_AUDIENCE.ALL_MEMBERS ||
        hedefKitle === TARGET_AUDIENCE.EVERYONE
      ) {
        const snap = await getDocs(collection(db, "users"));
        snap.forEach((d) => userIds.push(d.id));
      } else if (hedefKitle === TARGET_AUDIENCE.ALL_MANAGERS) {
        const snap = await getDocs(
          query(
            collection(db, "memberships"),
            where("status", "==", MEMBERSHIP_STATUS.ACTIVE),
          ),
        );
        snap.forEach((d) => {
          if (isClubManagerRole(d.data().role)) userIds.push(d.data().user_id);
        });
      } else if (hedefKitle === TARGET_AUDIENCE.ALL_ADMINS) {
        const snap = await getDocs(collection(db, "users"));
        snap.forEach((d) => {
          if (d.data().is_admin === true) userIds.push(d.id);
        });
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
            where("status", "==", MEMBERSHIP_STATUS.ACTIVE),
          ),
        );
        snap.forEach((d) => userIds.push(d.data().user_id));
        await notificationService.sendPush(
          userIds,
          "🎉 Yeni Kulüp Etkinliği!",
          `${eventTitle} etkinliği yayınlandı. Tarih: ${eventDate}`,
        );
      } else {
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
          where("status", "==", MEMBERSHIP_STATUS.ACTIVE),
          where("role", "==", CLUB_ROLE.MANAGER),
        ),
      );
      snap.forEach((d) => managerIds.push(d.data().user_id));
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
    status: JoinRequestStatus,
  ) => {
    try {
      const title =
        status === JOIN_REQUEST_STATUS.APPROVED
          ? "🎉 Başvurunuz Onaylandı!"
          : "ℹ️ Başvuru Durumu";
      const body =
        status === JOIN_REQUEST_STATUS.APPROVED
          ? `Tebrikler! ${clubName} kulübüne üyelik başvurunuz onaylandı.`
          : `${clubName} kulübüne yaptığınız üyelik başvurusu reddedildi.`;
      await notificationService.sendPush([targetUserId], title, body);
    } catch (err) {
      console.log("notifyApplicationDecision hatası:", err);
    }
  },

  // Kural 5: Yöneticilik/üyelik daveti geldiğinde → davet edilen kişi
  notifyRoleInvitation: async (
    targetUserId: string,
    clubName: string,
    role: ClubRole,
  ) => {
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
