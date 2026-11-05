import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { notificationService } from "./notificationService";
import {
  ANNOUNCEMENT_SCOPE,
  Announcement,
  MEMBERSHIP_STATUS,
  TARGET_AUDIENCE,
  TargetAudience,
  isClubManagerRole,
} from "../types";

export type AnnouncementItem = Announcement;

export const announcementService = {
  // 1. Sistem Geneli Duyuru Oluşturma (Admin)
  createSystemAnnouncement: async (
    baslik: string,
    icerik: string,
    adminId: string,
    adminName: string,
    hedefKitle: TargetAudience,
  ) => {
    if (!baslik.trim() || !icerik.trim()) {
      throw new Error("Başlık ve içerik boş bırakılamaz.");
    }

    const docRef = await addDoc(collection(db, "announcements"), {
      baslik: baslik.trim(),
      icerik: icerik.trim(),
      yayinlayan_id: adminId,
      yayinlayan_ad: adminName,
      kapsam: ANNOUNCEMENT_SCOPE.SYSTEM,
      hedef_kitle: hedefKitle,
      club_id: null,
      club_ad: null,
      tarih: new Date().toISOString(),
      createdAt: serverTimestamp(),
    });

    try {
      await notificationService.notifyAnnouncement(
        ANNOUNCEMENT_SCOPE.SYSTEM,
        hedefKitle,
        null,
        baslik.trim(),
        icerik.trim(),
      );
    } catch (pushErr) {
      console.log("Sistem duyurusu push bildirimi gönderilemedi:", pushErr);
    }

    return docRef.id;
  },

  // 2. Kulüp Duyurusu Oluşturma
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
      kapsam: ANNOUNCEMENT_SCOPE.CLUB,
      hedef_kitle: TARGET_AUDIENCE.CLUB_MEMBERS,
      club_id: clubId,
      club_ad: clubName,
      tarih: new Date().toISOString(),
      createdAt: serverTimestamp(),
    });

    try {
      await notificationService.notifyAnnouncement(
        ANNOUNCEMENT_SCOPE.CLUB,
        TARGET_AUDIENCE.CLUB_MEMBERS,
        clubId,
        baslik.trim(),
        icerik.trim(),
      );
    } catch (pushErr) {
      console.log("Kulüp duyurusu push bildirimi gönderilemedi:", pushErr);
    }

    return docRef.id;
  },

  // 3. Kullanıcıya Özel Duyuru Akışını Getirme
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
          kapsam: (data.kapsam || ANNOUNCEMENT_SCOPE.CLUB) as AnnouncementItem["kapsam"],
          hedef_kitle: (data.hedef_kitle || TARGET_AUDIENCE.ALL_MEMBERS) as TargetAudience,
          club_id: data.club_id || null,
          club_ad: data.club_ad || null,
          tarih: rawDate || new Date().toISOString(),
        };
      });

      if (isSuperAdmin) {
        return all.sort((a, b) => new Date(b.tarih).getTime() - new Date(a.tarih).getTime());
      }

      const mQuery = query(
        collection(db, "memberships"),
        where("user_id", "==", userId),
        where("status", "==", MEMBERSHIP_STATUS.ACTIVE),
      );
      const mSnap = await getDocs(mQuery);

      const activeClubIds: string[] = [];
      let isManagerInAnyClub = false;

      mSnap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.club_id) {
          activeClubIds.push(data.club_id);
        }
        const role = data.role || "";
        if (isClubManagerRole(role)) {
          isManagerInAnyClub = true;
        }
      });

      const filtered = all.filter((item) => {
        if (item.kapsam === ANNOUNCEMENT_SCOPE.SYSTEM) {
          if (
            item.hedef_kitle === TARGET_AUDIENCE.ALL_MEMBERS ||
            item.hedef_kitle === TARGET_AUDIENCE.EVERYONE
          )
            return true;
          if (item.hedef_kitle === TARGET_AUDIENCE.ALL_MANAGERS && isManagerInAnyClub) return true;
          if (item.hedef_kitle === TARGET_AUDIENCE.ALL_ADMINS && isSuperAdmin) return true;
          return false;
        }

        if (item.kapsam === ANNOUNCEMENT_SCOPE.CLUB && item.club_id) {
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

  // 4. Duyuru Güncelleme
  updateAnnouncement: async (announcementId: string, baslik: string, icerik: string) => {
    if (!baslik.trim() || !icerik.trim()) {
      throw new Error("Başlık ve içerik boş bırakılamaz.");
    }

    await updateDoc(doc(db, "announcements", announcementId), {
      baslik: baslik.trim(),
      icerik: icerik.trim(),
      updatedAt: serverTimestamp(),
    });
  },

  // 5. Duyuru Silme
  deleteAnnouncement: async (announcementId: string) => {
    await deleteDoc(doc(db, "announcements", announcementId));
  },
};
