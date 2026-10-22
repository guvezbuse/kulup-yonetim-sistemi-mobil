import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";

export type EventStatus = "taslak" | "yayinlandi" | "tamamlandi" | "iptal";

export interface EventItem {
  id: string;
  club_id: string | null; // null ise Admin Genel Etkinliğidir
  club_ad: string;
  baslik: string;
  aciklama: string;
  tarih_saat: string;
  konum: string;
  kontenjan: number | null; // null ise limitsiz
  olusturan_id: string;
  durum: EventStatus;
  createdAt?: any;
  basvuru_sayisi?: number;
}

export interface EventApplication {
  id: string;
  event_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  mesaj: string;
  tarih: string;
  createdAt?: any;
}

export const eventService = {
  // 1. Etkinlik Oluşturma (Kulüp Yöneticisi veya Admin Genel Etkinliği)
  createEvent: async (data: {
    club_id: string | null;
    club_ad: string;
    baslik: string;
    aciklama: string;
    tarih_saat: string;
    konum: string;
    kontenjan?: number | null;
    olusturan_id: string;
    durum?: EventStatus;
  }) => {
    if (
      !data.baslik.trim() ||
      !data.aciklama.trim() ||
      !data.konum.trim() ||
      !data.tarih_saat.trim()
    ) {
      throw new Error("Lütfen tüm zorunlu alanları doldurun.");
    }

    const docRef = await addDoc(collection(db, "events"), {
      club_id: data.club_id,
      club_ad: data.club_ad,
      baslik: data.baslik.trim(),
      aciklama: data.aciklama.trim(),
      tarih_saat: data.tarih_saat.trim(),
      konum: data.konum.trim(),
      kontenjan:
        data.kontenjan !== undefined && data.kontenjan !== null && !isNaN(Number(data.kontenjan))
          ? Number(data.kontenjan)
          : null,
      olusturan_id: data.olusturan_id,
      durum: data.durum || "taslak",
      createdAt: serverTimestamp(),
    });

    return docRef.id;
  },

  // 2. Durum Güncelleme
  updateEventStatus: async (eventId: string, durum: EventStatus) => {
    await updateDoc(doc(db, "events", eventId), { durum });
  },

  // 3. Etkinlik Silme
  deleteEvent: async (eventId: string) => {
    await deleteDoc(doc(db, "events", eventId));
  },

  // 4. Kulüp Yöneticisi İçin Etkinlikleri Getir
  getEventsByClub: async (clubId: string): Promise<EventItem[]> => {
    const q = query(collection(db, "events"), where("club_id", "==", clubId));
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Omit<EventItem, "id">) }))
      .sort((a, b) => new Date(b.tarih_saat).getTime() - new Date(a.tarih_saat).getTime());
  },

  // 5. Üyeler İçin Etkinlik Akışını Getir (Aktif Kulüp Etkinlikleri + Admin Genel Etkinlikleri)
  getPublishedEventsForUser: async (
    userId: string,
    isSuperAdmin: boolean = false,
  ): Promise<EventItem[]> => {
    const q = query(collection(db, "events"), where("durum", "in", ["yayinlandi", "tamamlandi"]));
    const snap = await getDocs(q);
    const allEvents: EventItem[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<EventItem, "id">),
    }));

    // Her etkinliğin başvuru sayısını al
    const appsSnap = await getDocs(collection(db, "event_applications"));
    const appCounts: Record<string, number> = {};
    appsSnap.forEach((d) => {
      const eId = d.data().event_id;
      appCounts[eId] = (appCounts[eId] || 0) + 1;
    });

    allEvents.forEach((ev) => {
      ev.basvuru_sayisi = appCounts[ev.id] || 0;
    });

    if (isSuperAdmin) {
      return allEvents.sort(
        (a, b) => new Date(b.tarih_saat).getTime() - new Date(a.tarih_saat).getTime(),
      );
    }

    // Kullanıcının aktif üye olduğu kulüpleri al
    const mQuery = query(
      collection(db, "memberships"),
      where("user_id", "==", userId),
      where("status", "==", "aktif"),
    );
    const mSnap = await getDocs(mQuery);
    const activeClubIds = mSnap.docs.map((d) => d.data().club_id);

    // Kulüp üyesi olunan etkinlikler VEYA genel sistem etkinlikleri (club_id == null)
    const filtered = allEvents.filter((ev) => {
      if (ev.club_id === null) return true; // Genel etkinlik
      return activeClubIds.includes(ev.club_id);
    });

    return filtered.sort(
      (a, b) => new Date(b.tarih_saat).getTime() - new Date(a.tarih_saat).getTime(),
    );
  },

  // 6. Etkinliğe Katılma Talebi Gönderme
  applyToEvent: async (params: {
    eventId: string;
    userId: string;
    userName: string;
    userEmail: string;
    mesaj: string;
  }) => {
    const eventDoc = await getDoc(doc(db, "events", params.eventId));
    if (!eventDoc.exists()) throw new Error("Etkinlik bulunamadı.");
    const eventData = eventDoc.data() as EventItem;

    if (eventData.durum !== "yayinlandi") {
      throw new Error("Bu etkinlik artık başvuruya açık değil.");
    }

    // Mükerrer Başvuru Kontrolü
    const checkQuery = query(
      collection(db, "event_applications"),
      where("event_id", "==", params.eventId),
      where("user_id", "==", params.userId),
    );
    const checkSnap = await getDocs(checkQuery);
    if (!checkSnap.empty) {
      throw new Error("Bu etkinliğe zaten başvurdunuz.");
    }

    // Kontenjan Kontrolü
    if (eventData.kontenjan !== null && eventData.kontenjan !== undefined) {
      const allApps = query(
        collection(db, "event_applications"),
        where("event_id", "==", params.eventId),
      );
      const allAppsSnap = await getDocs(allApps);
      if (allAppsSnap.size >= eventData.kontenjan) {
        throw new Error("Üzgünüz, etkinlik kontenjanı dolmuştur.");
      }
    }

    const now = new Date();
    const formattedDate = `${now.toLocaleDateString("tr-TR")} ${now.toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;

    await addDoc(collection(db, "event_applications"), {
      event_id: params.eventId,
      user_id: params.userId,
      user_name: params.userName,
      user_email: params.userEmail,
      mesaj: params.mesaj.trim(),
      tarih: formattedDate,
      createdAt: serverTimestamp(),
    });
  },

  // 7. Kullanıcının Başvurduğu Etkinlik ID'lerini Getir
  getUserApplications: async (userId: string): Promise<string[]> => {
    const q = query(collection(db, "event_applications"), where("user_id", "==", userId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data().event_id);
  },

  // 8. Etkinliğe Başvuranları Getir (İLK BAŞVURAN EN ÜSTTE OLACAK ŞEKİLDE)
  getEventApplications: async (eventId: string): Promise<EventApplication[]> => {
    const q = query(collection(db, "event_applications"), where("event_id", "==", eventId));
    const snap = await getDocs(q);

    const apps = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        event_id: data.event_id,
        user_id: data.user_id,
        user_name: data.user_name || "İsimsiz",
        user_email: data.user_email || "",
        mesaj: data.mesaj || "",
        tarih: data.tarih || "",
        createdAt: data.createdAt,
      };
    });

    // İlk başvuran en üstte (Eskiden yeniye sıralama - FIFO)
    return apps.sort((a, b) => {
      const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
      const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
      return timeA - timeB;
    });
  },
};
