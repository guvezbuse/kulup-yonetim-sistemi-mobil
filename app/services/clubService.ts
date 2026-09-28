import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { Club } from "../types"; // index.ts dosyan types/ altında ise

const CLUBS_COLLECTION = "clubs";
const INVITATIONS_COLLECTION = "invitations";

export const clubService = {
  // 1. Yeni kulüp oluşturma (Admin)
  createClub: async (ad: string, aciklama: string, adminId: string, yoneticiEmail?: string) => {
    // Kulüp dokümanını kaydet
    const clubRef = await addDoc(collection(db, CLUBS_COLLECTION), {
      ad: ad.trim(),
      aciklama: aciklama.trim(),
      olusturan_admin_id: adminId,
      durum: "aktif",
      createdAt: new Date().toISOString(),
    });

    // İlk yönetici atanmışsa davet (invitations) kaydı aç
    if (yoneticiEmail && yoneticiEmail.trim()) {
      await addDoc(collection(db, INVITATIONS_COLLECTION), {
        club_id: clubRef.id,
        email: yoneticiEmail.trim().toLowerCase(),
        role: "yönetici",
        token: Math.random().toString(36).substring(2, 15), // Mock token
        son_gecerlilik_tarihi: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        durum: "beklemede",
      });
    }

    return clubRef.id;
  },

  // 2. Kulüpleri listeleme
  getClubs: async (): Promise<Club[]> => {
    const q = query(collection(db, CLUBS_COLLECTION), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as Club[];
  },

  // 3. Kulübü aktif/pasif yapma
  toggleClubStatus: async (clubId: string, mevcutDurum: "aktif" | "pasif") => {
    const clubRef = doc(db, CLUBS_COLLECTION, clubId);
    const yeniDurum = mevcutDurum === "aktif" ? "pasif" : "aktif";
    await updateDoc(clubRef, {
      durum: yeniDurum,
    });
  },
};
