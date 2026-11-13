import {
  collection,
  addDoc,
  updateDoc,
  deleteField,
  doc,
  getDocs,
  query,
  orderBy,
  where,
  writeBatch,
  deleteDoc,
  type QueryDocumentSnapshot,
  type DocumentData,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { CLUB_STATUS, Club, ClubStatus } from "../types";

const CLUBS_COLLECTION = "clubs";

// Firestore batch limiti 500; güvenli tarafta kalmak için 400'lük parçalar kullanılır.
const deleteDocsInBatches = async (docs: QueryDocumentSnapshot<DocumentData>[]) => {
  const CHUNK_SIZE = 400;

  for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
    const batch = writeBatch(db);
    docs.slice(i, i + CHUNK_SIZE).forEach((docSnap) => batch.delete(docSnap.ref));
    await batch.commit();
  }
};

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
    const yeniDurum = mevcutDurum === CLUB_STATUS.ACTIVE ? CLUB_STATUS.PASSIVE : CLUB_STATUS.ACTIVE;
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

  // 6. Kulübü ve ona bağlı tüm kayıtları kalıcı olarak silme (Admin)
  // Firestore'da otomatik cascade yok; ilişkili koleksiyonlar tek tek temizlenir.
  deleteClub: async (clubId: string) => {
    // Önce etkinlikler bulunur; yoklama kayıtları event_id üzerinden bağlıdır.
    const eventsSnap = await getDocs(
      query(collection(db, "events"), where("club_id", "==", clubId)),
    );
    const eventIds = new Set(eventsSnap.docs.map((eventDoc) => eventDoc.id));

    if (eventIds.size > 0) {
      const attendanceSnap = await getDocs(collection(db, "attendance"));
      const relatedAttendance = attendanceSnap.docs.filter((attendanceDoc) =>
        eventIds.has(String(attendanceDoc.data().event_id ?? "")),
      );
      await deleteDocsInBatches(relatedAttendance);
    }

    const dependentCollections = [
      "memberships",
      "join_requests",
      "invitations",
      "events",
      "announcements",
    ];

    for (const collectionName of dependentCollections) {
      const snap = await getDocs(
        query(collection(db, collectionName), where("club_id", "==", clubId)),
      );
      await deleteDocsInBatches(snap.docs);
    }

    await deleteDoc(doc(db, CLUBS_COLLECTION, clubId));
  },
};
