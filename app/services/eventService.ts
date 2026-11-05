import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  doc,
  deleteDoc,
  updateDoc,
  arrayRemove,
  query,
  where,
  runTransaction,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  Event,
  EventApplication,
  EventStatus,
  EVENT_STATUS,
  FirestoreDate,
  TargetAudience,
  TARGET_AUDIENCE,
} from "../types";

const EVENTS_COLLECTION = "events";

// Yalnızca kanonik şemadaki kayıtlar kabul edilir.
// Eski (title/date/participants) dokümanlar listeye alınmaz; tek bir bozuk kayıt
// ekranı çökertmesin diye burada elenir.
const isCanonicalEvent = (data: Record<string, unknown>): boolean =>
  typeof data.baslik === "string" &&
  data.baslik.trim().length > 0 &&
  data.tarih !== null &&
  data.tarih !== undefined;

const toEvent = (id: string, data: Record<string, unknown>): Event | null => {
  if (!isCanonicalEvent(data)) return null;

  return {
    id,
    baslik: data.baslik as string,
    aciklama: typeof data.aciklama === "string" ? data.aciklama : "",
    konum: typeof data.konum === "string" ? data.konum : "",
    tarih: data.tarih as FirestoreDate,
    kontenjan: typeof data.kontenjan === "number" ? data.kontenjan : null,
    gorselUrl: typeof data.gorselUrl === "string" ? data.gorselUrl : "",
    hedef_kitle: (data.hedef_kitle as TargetAudience) ?? TARGET_AUDIENCE.EVERYONE,
    club_id: typeof data.club_id === "string" ? data.club_id : null,
    club_ad: typeof data.club_ad === "string" ? data.club_ad : null,
    olusturan_id: typeof data.olusturan_id === "string" ? data.olusturan_id : "",
    status: (data.status as EventStatus) ?? EVENT_STATUS.PUBLISHED,
    katilimcilar: Array.isArray(data.katilimcilar) ? (data.katilimcilar as string[]) : [],
    createdAt: (data.createdAt as FirestoreDate | undefined) ?? undefined,
  };
};

const toEventList = (
  docs: Array<{ id: string; data: () => Record<string, unknown> }>,
): Event[] =>
  docs
    .map((docSnap) => toEvent(docSnap.id, docSnap.data()))
    .filter((event): event is Event => event !== null);

// 1. Tüm etkinlikleri çek
export const getEvents = async (): Promise<Event[]> => {
  const snapshot = await getDocs(collection(db, EVENTS_COLLECTION));
  return toEventList(snapshot.docs);
};

// 2. Tek etkinlik çek
export const getEventById = async (eventId: string): Promise<Event | null> => {
  const snap = await getDoc(doc(db, EVENTS_COLLECTION, eventId));
  return snap.exists() ? toEvent(snap.id, snap.data()) : null;
};

// 3. Kulübe özel etkinlikleri çek
export const getClubEvents = async (clubId: string): Promise<Event[]> => {
  const q = query(collection(db, EVENTS_COLLECTION), where("club_id", "==", clubId));
  const snapshot = await getDocs(q);
  return toEventList(snapshot.docs);
};

// 4. Etkinlik oluştur
export const createEvent = async (eventData: Omit<Event, "id">): Promise<string> => {
  const docRef = await addDoc(collection(db, EVENTS_COLLECTION), eventData);
  return docRef.id;
};

// 5. Etkinlik güncelle
export const updateEvent = async (
  eventId: string,
  eventData: Partial<Omit<Event, "id">>,
): Promise<void> => {
  await updateDoc(doc(db, EVENTS_COLLECTION, eventId), eventData);
};

// 6. Etkinlik sil
export const deleteEvent = async (eventId: string): Promise<void> => {
  await deleteDoc(doc(db, EVENTS_COLLECTION, eventId));
};

// 7. Etkinliğe katıl (kontenjan kontrolü atomik)
export const joinEvent = async (eventId: string, userId: string): Promise<void> => {
  const eventRef = doc(db, EVENTS_COLLECTION, eventId);

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(eventRef);
    if (!snap.exists()) throw new Error("Etkinlik bulunamadı.");

    const data = snap.data();
    const katilimcilar: string[] = Array.isArray(data.katilimcilar)
      ? (data.katilimcilar as string[])
      : [];

    if (katilimcilar.includes(userId)) return;

    const kontenjan = typeof data.kontenjan === "number" ? data.kontenjan : null;
    if (kontenjan !== null && katilimcilar.length >= kontenjan) {
      throw new Error("Etkinlik kontenjanı doldu.");
    }

    transaction.update(eventRef, { katilimcilar: [...katilimcilar, userId] });
  });
};

// 8. Etkinlikten ayrıl
export const leaveEvent = async (eventId: string, userId: string): Promise<void> => {
  await updateDoc(doc(db, EVENTS_COLLECTION, eventId), {
    katilimcilar: arrayRemove(userId),
  });
};

// 9. Etkinlik katılımcılarını (başvuruları) kullanıcı bilgisiyle çek
export const getEventApplications = async (eventId: string): Promise<EventApplication[]> => {
  const event = await getEventById(eventId);
  if (!event || event.katilimcilar.length === 0) return [];

  const participantIds = new Set(event.katilimcilar);
  const usersSnapshot = await getDocs(collection(db, "users"));

  return usersSnapshot.docs
    .filter((userDoc) => participantIds.has(userDoc.id))
    .map((userDoc) => {
      const data = userDoc.data();
      return {
        user_id: userDoc.id,
        ad_soyad: data.ad ? `${data.ad} ${data.soyad || ""}`.trim() : data.email || "",
        email: data.email || "",
      };
    });
};

const eventService = {
  getEvents,
  getEventById,
  getClubEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  joinEvent,
  leaveEvent,
  getEventApplications,
};

export default eventService;
