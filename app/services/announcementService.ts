import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { notificationService } from "./notificationService";

export type AnnouncementScope = "sistem" | "kulup";
export type AnnouncementTarget = "tum_yoneticiler" | "tum_uyeler" | "kulup_uyeleri";

export interface AnnouncementItem {
  id: string;
  baslik: string;
  icerik: string;
  yayinlayan_id: string;
  yayinlayan_ad: string;
  kapsam: AnnouncementScope;
  hedef_kitle: AnnouncementTarget;
  club_id?: string | null;
  club_ad?: string | null;
  tarih: string;
}

export const announcementService = {
  // 1. Sistem Geneli Duyuru Oluşturma (Yalnızca Admin - Şartname 2.1 & 5)
  createSystemAnnouncement: async (
    baslik: string,
    icerik: string,
    adminId: string,
    adminName: string,
    hedefKitle: "tum_yoneticiler" | "tum_uyeler",
  ) => {
    if (!baslik.trim() || !icerik.trim()) {
      throw new Error("Başlık ve içerik boş bırakılamaz.");
    }

    const docRef = await addDoc(collection(db, "announcements"), {
      baslik: baslik.trim(),
      icerik: icerik.trim(),
      yayinlayan_id: adminId,
      yayinlayan_ad: adminName,
      kapsam: "sistem",
      hedef_kitle: hedefKitle,
      club_id: null,
      club_ad: null,
      tarih: new Date().toISOString(),
      createdAt: serverTimestamp(),
    });

    // Push Bildirimi Gönder (Hedef kitleye göre)
    try {
      const tokens = await notificationService.getTokensForAudience("sistem", hedefKitle);
      await notificationService.sendPushNotification(
        tokens,
        "Yeni Sistem Duyurusu",
        baslik.trim(),
        { announcementId: docRef.id, type: "system_announcement" },
      );
    } catch (pushErr) {
      console.log("Sistem duyurusu push bildirimi gönderilemedi:", pushErr);
    }

    return docRef.id;
  },

  // 2. Kulüp Duyurusu Oluşturma (Kulüp Yöneticisi - Şartname 2.2 & 5)
  createClubAnnouncement: async (
    clubId: string,
    clubName: string,
    baslik: string,
    icerik: string,
    managerId: string,
    managerName: string,
  ) => {
    if (!baslik.trim() || !icerik.trim()) {
      throw new Error("Başlık ve içerik boş bırakılamaz.");
    }

    const docRef = await addDoc(collection(db, "announcements"), {
      baslik: baslik.trim(),
      icerik: icerik.trim(),
      yayinlayan_id: managerId,
      yayinlayan_ad: managerName,
      kapsam: "kulup",
      hedef_kitle: "kulup_uyeleri",
      club_id: clubId,
      club_ad: clubName,
      tarih: new Date().toISOString(),
      createdAt: serverTimestamp(),
    });

    // Push Bildirimi Gönder (Kulübün aktif üyelerine)
    try {
      const tokens = await notificationService.getTokensForAudience(
        "kulup",
        "kulup_uyeleri",
        clubId,
      );
      await notificationService.sendPushNotification(
        tokens,
        `${clubName} - Yeni Duyuru`,
        baslik.trim(),
        { announcementId: docRef.id, clubId, type: "club_announcement" },
      );
    } catch (pushErr) {
      console.log("Kulüp duyurusu push bildirimi gönderilemedi:", pushErr);
    }

    return docRef.id;
  },

  // 3. Kullanıcıya Özel Duyuru Akışını Getirme (Şartname 5 & 10)
  getAnnouncementsForUser: async (
    userId: string,
    isSuperAdmin: boolean = false,
  ): Promise<AnnouncementItem[]> => {
    try {
      const q = query(collection(db, "announcements"));
      const snap = await getDocs(q);

      const all: AnnouncementItem[] = snap.docs.map((d) => {
        const data = d.data();
        let rawDate = data.tarih;
        if (!rawDate && data.createdAt?.toDate) {
          rawDate = data.createdAt.toDate().toISOString();
        }

        return {
          id: d.id,
          baslik: data.baslik || "",
          icerik: data.icerik || "",
          yayinlayan_id: data.yayinlayan_id || "",
          yayinlayan_ad: data.yayinlayan_ad || "Yönetici",
          kapsam: data.kapsam || "kulup",
          hedef_kitle: data.hedef_kitle || "kulup_uyeleri",
          club_id: data.club_id || null,
          club_ad: data.club_ad || null,
          tarih: rawDate || new Date().toISOString(),
        };
      });

      // Sistem Yöneticisi ise tüm duyuruları doğrudan göster
      if (isSuperAdmin) {
        return all.sort((a, b) => new Date(b.tarih).getTime() - new Date(a.tarih).getTime());
      }

      // Kullanıcının aktif üyeliklerini ve yönetici olduğu kulüpleri çek
      const mQuery = query(
        collection(db, "memberships"),
        where("user_id", "==", userId),
        where("status", "==", "aktif"),
      );
      const mSnap = await getDocs(mQuery);

      const activeClubIds: string[] = [];
      let isManagerInAnyClub = false;

      mSnap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.club_id) {
          activeClubIds.push(data.club_id);
        }
        const role = (data.role || "").toLowerCase();
        if (role === "yonetici" || role === "yönetici" || role === "baskan") {
          isManagerInAnyClub = true;
        }
      });

      // Kullanıcıya uygun duyuruları filtrele
      const filtered = all.filter((item) => {
        // 1. Sistem Duyuruları
        if (item.kapsam === "sistem") {
          if (item.hedef_kitle === "tum_uyeler") return true;
          if (item.hedef_kitle === "tum_yoneticiler" && isManagerInAnyClub) return true;
          return false;
        }

        // 2. Kulüp Duyuruları: Yalnızca kullanıcının aktif üye veya yönetici olduğu kulüpler
        if (item.kapsam === "kulup" && item.club_id) {
          return activeClubIds.includes(item.club_id);
        }

        return false;
      });

      return filtered.sort((a, b) => new Date(b.tarih).getTime() - new Date(a.tarih).getTime());
    } catch (error) {
      console.error("Duyuru çekme hatası:", error);
      throw error;
    }
  },

  // 4. Duyuru Silme (Şartname 5)
  deleteAnnouncement: async (announcementId: string) => {
    await deleteDoc(doc(db, "announcements", announcementId));
  },
};
