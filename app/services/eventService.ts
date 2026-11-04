import {
  collection,
  getDocs,
  addDoc,
  doc,
  deleteDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  query,
  where,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { Event } from "../types";

const EVENTS_COLLECTION = "events";

// 1. Tüm Etkinlikleri Çek
export const getEvents = async (): Promise<Event[]> => {
  try {
    const eventsRef = collection(db, EVENTS_COLLECTION);
    const snapshot = await getDocs(eventsRef);

    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as Event[];
  } catch (error) {
    console.error("getEvents Hatası:", error);
    return [];
  }
};

export const getAllEvents = getEvents;
export const getClubEvents = getEvents;

// 2. Kulübe Özel Etkinlikleri Çek (ClubEventsManageScreen için)
export const getEventsByClub = async (clubId: string): Promise<Event[]> => {
  try {
    const eventsRef = collection(db, EVENTS_COLLECTION);
    // Yeni standart 'clubId' ve geriye dönük eski alan adları desteği
    const q1 = query(eventsRef, where("clubId", "==", clubId));
    const q2 = query(eventsRef, where("club_id", "==", clubId));
    const q3 = query(eventsRef, where("kulup_id", "==", clubId));

    const [snap1, snap2, snap3] = await Promise.all([getDocs(q1), getDocs(q2), getDocs(q3)]);

    const eventsMap = new Map<string, Event>();

    [snap1, snap2, snap3].forEach((snap) => {
      snap.docs.forEach((docSnap) => {
        eventsMap.set(docSnap.id, {
          id: docSnap.id,
          ...docSnap.data(),
        } as Event);
      });
    });

    return Array.from(eventsMap.values());
  } catch (error) {
    console.error("getEventsByClub Hatası:", error);
    return [];
  }
};

// 3. Yeni Etkinlik Oluştur
export const createEvent = async (eventData: Record<string, any>): Promise<string> => {
  try {
    const eventsRef = collection(db, EVENTS_COLLECTION);
    const docRef = await addDoc(eventsRef, eventData);
    return docRef.id;
  } catch (error) {
    console.error("createEvent Hatası:", error);
    throw error;
  }
};

export const addEvent = createEvent;

// 4. Etkinlik Sil
export const deleteEvent = async (eventId: string): Promise<void> => {
  try {
    const eventRef = doc(db, EVENTS_COLLECTION, eventId);
    await deleteDoc(eventRef);
  } catch (error) {
    console.error("deleteEvent Hatası:", error);
    throw error;
  }
};

export const deleteEventById = deleteEvent;

// 5. Etkinliğe Katıl (RSVP)
export const joinEvent = async (eventId: string, userId: string): Promise<void> => {
  try {
    const eventRef = doc(db, EVENTS_COLLECTION, eventId);
    await updateDoc(eventRef, {
      participants: arrayUnion(userId),
      attendees: arrayUnion(userId),
    });
  } catch (error) {
    console.error("joinEvent Hatası:", error);
    throw error;
  }
};

export const attendEvent = joinEvent;

// 6. Etkinlikten Ayrıl
export const leaveEvent = async (eventId: string, userId: string): Promise<void> => {
  try {
    const eventRef = doc(db, EVENTS_COLLECTION, eventId);
    await updateDoc(eventRef, {
      participants: arrayRemove(userId),
      attendees: arrayRemove(userId),
    });
  } catch (error) {
    console.error("leaveEvent Hatası:", error);
    throw error;
  }
};

// RSVP Durumuna Göre Katıl / Ayrıl Değiştirici
export const toggleEventRSVP = async (eventId: string, userId: string, isAttending: boolean) => {
  if (isAttending) {
    return leaveEvent(eventId, userId);
  }
  return joinEvent(eventId, userId);
};

// Default Export (Objenin doğrudan import edilmesi durumları için)
const eventService = {
  getEvents,
  getAllEvents,
  getClubEvents,
  getEventsByClub,
  createEvent,
  addEvent,
  deleteEvent,
  deleteEventById,
  joinEvent,
  attendEvent,
  leaveEvent,
  toggleEventRSVP,
};

export default eventService;
