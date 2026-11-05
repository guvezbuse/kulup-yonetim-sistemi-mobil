import {
  collection,
  addDoc,
  updateDoc,
  deleteField,
  doc,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { CLUB_STATUS, Club, ClubStatus } from "../types";

const CLUBS_COLLECTION = "clubs";

export const clubService = {
  // 1. Yeni kulüp oluşturma (Admin)
  createClub: async (ad: string, aciklama: string, adminId: string, gorselUrl: string = "") => {
    const clubRef = await addDoc(collection(db, CLUBS_COLLECTION), {
      ad: ad.trim(),
      aciklama: aciklama.trim(),
      olusturan_admin_id: adminId,
      gorselUrl: gorselUrl.trim(),
      durum: CLUB_STATUS.ACTIVE,
      createdAt: new Date().toISOString(),
    });

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
  toggleClubStatus: async (clubId: string, mevcutDurum: ClubStatus) => {
    const clubRef = doc(db, CLUBS_COLLECTION, clubId);
    const yeniDurum =
      mevcutDurum === CLUB_STATUS.ACTIVE ? CLUB_STATUS.PASSIVE : CLUB_STATUS.ACTIVE;
    await updateDoc(clubRef, {
      durum: yeniDurum,
    });
  },

  // 4. Kulüp bilgilerini güncelleme (Yönetici / Admin)
  updateClub: async (
    clubId: string,
    data: {
      ad?: string;
      aciklama?: string;
      detayliAciklama?: string;
      gorselUrl?: string;
    },
  ) => {
    const clubRef = doc(db, CLUBS_COLLECTION, clubId);
    const updatePayload: Record<string, string> = {};

    if (data.ad !== undefined) updatePayload.ad = data.ad.trim();
    if (data.aciklama !== undefined) updatePayload.aciklama = data.aciklama.trim();
    if (data.detayliAciklama !== undefined)
      updatePayload.detayliAciklama = data.detayliAciklama.trim();
    if (data.gorselUrl !== undefined) updatePayload.gorselUrl = data.gorselUrl.trim();

    await updateDoc(clubRef, updatePayload);
  },

  // 5. Kulüp fotoğrafını/banner'ını kaldırma/silme
  deleteClubPhoto: async (clubId: string) => {
    const clubRef = doc(db, CLUBS_COLLECTION, clubId);
    await updateDoc(clubRef, {
      gorselUrl: deleteField(),
    });
  },
};
