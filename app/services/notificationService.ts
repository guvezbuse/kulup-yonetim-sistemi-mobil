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
  onSnapshot,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { toMillis } from "../lib/eventDate";
import {
  ANNOUNCEMENT_SCOPE,
  AnnouncementScope,
  CLUB_ROLE,
  ClubRole,
  JOIN_REQUEST_STATUS,
  JoinRequestStatus,
  MEMBERSHIP_STATUS,
  NOTIFICATION_TYPE,
  NotificationExtra,
  NotificationItem,
  NotificationTargetScreen,
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
  sendPush: async (
    targetUserIds: string[],
    title: string,
    body: string,
    extra: NotificationExtra = {},
  ) => {
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
            read: false,
            createdAt: serverTimestamp(),
            tip: extra.tip ?? null,
            club_id: extra.club_id ?? null,
            club_ad: extra.club_ad ?? null,
            hedef_ekran: extra.hedef_ekran ?? null,
            hedef_id: extra.hedef_id ?? null,
            data: extra.data ?? {},
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
        const snap = await getDocs(query(collection(db, "users"), where("__name__", "in", group)));
        snap.forEach((userDoc) => {
          const pushToken = userDoc.data().expoPushToken;
          if (typeof pushToken === "string" && pushToken.startsWith("ExponentPushToken")) {
            tokens.push(pushToken);
          }
        });
      }

      // C. Cihazlara 100'lük push batch'leri halinde gönder
      const pushData = {
        ...(extra.data ?? {}),
        tip: extra.tip ?? "",
        club_id: extra.club_id ?? "",
        hedef_ekran: extra.hedef_ekran ?? "",
        hedef_id: extra.hedef_id ?? "",
      };

      for (const group of chunkArray(tokens, PUSH_BATCH_SIZE)) {
        const messages = group.map((to) => ({
          to,
          sound: "default",
          title,
          body,
          data: pushData,
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
  // BİLDİRİM GEÇMİŞİ (uygulama içi liste)
  // -------------------------------------------------------------

  // Kullanıcının kendi bildirimlerini en yeniden eskiye sıralı döndürür.
  // Sorguda orderBy kullanılmıyor: where + orderBy bileşimi composite index
  // gerektirir, sıralamayı istemci tarafında yapıyoruz.
  getUserNotifications: async (userId: string): Promise<NotificationItem[]> => {
    const snap = await getDocs(
      query(collection(db, "notifications"), where("user_id", "==", userId)),
    );

    return snap.docs
      .map((item) => ({ id: item.id, ...(item.data() as Omit<NotificationItem, "id">) }))
      .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
  },

  // Tek bildirimi okundu/okunmadı olarak işaretler.
  markNotificationRead: async (notificationId: string) => {
    await updateDoc(doc(db, "notifications", notificationId), { read: true });
  },

  setNotificationRead: async (notificationId: string, read: boolean) => {
    await updateDoc(doc(db, "notifications", notificationId), { read });
  },

  // Kullanıcının bildirimlerini gerçek zamanlı dinler.
  // Dönen fonksiyon aboneliği kapatır.
  subscribeToUserNotifications: (
    userId: string,
    onData: (items: NotificationItem[]) => void,
    onError?: (error: unknown) => void,
  ) => {
    const q = query(collection(db, "notifications"), where("user_id", "==", userId));

    return onSnapshot(
      q,
      (snap) => {
        const items = snap.docs
          .map((item) => ({ id: item.id, ...(item.data() as Omit<NotificationItem, "id">) }))
          .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
        onData(items);
      },
      (error) => {
        console.log("Bildirim dinleme hatası:", error);
        onError?.(error);
      },
    );
  },

  // Üst menüdeki zil ikonunda gösterilecek okunmamış sayısını dinler.
  subscribeToUnreadCount: (userId: string, onCount: (count: number) => void) => {
    const q = query(
      collection(db, "notifications"),
      where("user_id", "==", userId),
      where("read", "==", false),
    );

    return onSnapshot(
      q,
      (snap) => onCount(snap.size),
      (error) => {
        console.log("Okunmamış bildirim sayısı alınamadı:", error);
      },
    );
  },

  // Push bildirimine tıklandığında gidilecek ekranı dinler.
  // Uygulama kapalıyken gelen bildirime tıklanarak açılma durumu da kapsanır.
  subscribeToNotificationResponses: (onOpen: (target: NotificationTargetScreen) => void) => {
    if (!Notifications) return () => {};

    const resolveTarget = (data: Record<string, unknown> | undefined) => {
      const hedef = data?.hedef_ekran;
      if (hedef === "announcements" || hedef === "events" || hedef === "clubs") {
        onOpen(hedef);
      }
    };

    // Uygulama kapalıyken gelen bildirime tıklanarak açıldıysa
    const lastResponse = Notifications.getLastNotificationResponse?.();
    if (lastResponse) {
      resolveTarget(lastResponse.notification.request.content.data);
      Notifications.clearLastNotificationResponse?.();
    }

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      resolveTarget(response.notification.request.content.data);
    });

    return () => subscription.remove();
  },

  // Kullanıcının tüm okunmamış bildirimlerini tek batch'te okundu yapar.
  markAllNotificationsRead: async (userId: string) => {
    const snap = await getDocs(
      query(
        collection(db, "notifications"),
        where("user_id", "==", userId),
        where("read", "==", false),
      ),
    );

    if (snap.empty) return;

    for (const group of chunkArray(snap.docs, FIRESTORE_BATCH_SIZE)) {
      const batch = writeBatch(db);
      group.forEach((item) => batch.update(item.ref, { read: true }));
      await batch.commit();
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
    options?: { announcementId?: string; clubName?: string | null },
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
          query(collection(db, "memberships"), where("status", "==", MEMBERSHIP_STATUS.ACTIVE)),
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

      await notificationService.sendPush(userIds, `📢 ${title}`, content, {
        tip: NOTIFICATION_TYPE.ANNOUNCEMENT,
        club_id: clubId ?? null,
        club_ad: options?.clubName ?? null,
        hedef_ekran: "announcements",
        hedef_id: options?.announcementId ?? null,
        data: { kapsam, hedef_kitle: hedefKitle },
      });
    } catch (err) {
      console.log("notifyAnnouncement hatası:", err);
    }
  },

  // Kural 2: Etkinlik yayınlandığında → kulüp üyeleri (veya üniversite geneli)
  notifyEventPublished: async (
    clubId: string | null | undefined,
    clubName: string | null | undefined,
    eventId: string,
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
          {
            tip: NOTIFICATION_TYPE.EVENT,
            club_id: clubId,
            club_ad: clubName ?? null,
            hedef_ekran: "events",
            hedef_id: eventId,
          },
        );
      } else {
        const snap = await getDocs(collection(db, "users"));
        snap.forEach((d) => userIds.push(d.id));
        await notificationService.sendPush(
          userIds,
          "🏛️ Üniversite Geneli Etkinlik!",
          `${eventTitle} tüm öğrencilere açıldı.`,
          {
            tip: NOTIFICATION_TYPE.EVENT,
            hedef_ekran: "events",
            hedef_id: eventId,
          },
        );
      }
    } catch (err) {
      console.log("notifyEventPublished hatası:", err);
    }
  },

  // Kural 3: Üyelik başvurusu geldiğinde → ilgili kulübün yöneticileri
  notifyMembershipApplication: async (
    clubId: string,
    applicantName: string,
    clubName?: string | null,
  ) => {
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
        {
          tip: NOTIFICATION_TYPE.APPLICATION,
          club_id: clubId,
          club_ad: clubName ?? null,
          hedef_ekran: "clubs",
          data: { basvuran: applicantName },
        },
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
    clubId?: string | null,
  ) => {
    try {
      const approved = status === JOIN_REQUEST_STATUS.APPROVED;
      const title = approved ? "🎉 Başvurunuz Onaylandı!" : "ℹ️ Başvuru Durumu";
      const body = approved
        ? `Tebrikler! ${clubName} kulübüne üyelik başvurunuz onaylandı.`
        : `${clubName} kulübüne yaptığınız üyelik başvurusu reddedildi.`;
      await notificationService.sendPush([targetUserId], title, body, {
        tip: NOTIFICATION_TYPE.DECISION,
        club_id: clubId ?? null,
        club_ad: clubName,
        hedef_ekran: "clubs",
        data: { durum: status },
      });
    } catch (err) {
      console.log("notifyApplicationDecision hatası:", err);
    }
  },

  // Kural 5: Yöneticilik/üyelik daveti geldiğinde → davet edilen kişi
  notifyRoleInvitation: async (
    targetUserId: string,
    clubName: string,
    role: ClubRole,
    clubId?: string | null,
  ) => {
    try {
      await notificationService.sendPush(
        [targetUserId],
        "✉️ Yeni Rol / Davet",
        `${clubName} kulübünde size '${role}' yetkisi tanımlandı.`,
        {
          tip: NOTIFICATION_TYPE.INVITATION,
          club_id: clubId ?? null,
          club_ad: clubName,
          hedef_ekran: "clubs",
          data: { rol: role },
        },
      );
    } catch (err) {
      console.log("notifyRoleInvitation hatası:", err);
    }
  },
};
