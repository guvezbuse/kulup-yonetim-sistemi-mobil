import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { Attendance, FirestoreDate } from "../types";

const ATTENDANCE_COLLECTION = "attendance";
const USERS_COLLECTION = "users";
const EVENTS_COLLECTION = "events";

export interface AttendanceRecord extends Attendance {
  user_ad: string;
  user_email: string;
}

export interface CheckInResult {
  status: "basarili" | "mukerrer";
  user_ad: string;
  user_email: string;
}

const toMillis = (value: FirestoreDate | undefined): number => {
  if (!value) return 0;
  if (typeof value === "string") return new Date(value).getTime() || 0;
  if (typeof value === "object" && typeof value.seconds === "number") {
    return value.seconds * 1000;
  }
  return 0;
};

const getUserDisplay = (data: Record<string, unknown> | undefined, fallbackEmail = "") => {
  if (!data) {
    return { ad: "Bilinmeyen kullanıcı", email: fallbackEmail };
  }

  const ad = typeof data.ad === "string" ? data.ad : "";
  const soyad = typeof data.soyad === "string" ? data.soyad : "";
  const email = typeof data.email === "string" ? data.email : fallbackEmail;

  return {
    ad: `${ad} ${soyad}`.trim() || email || "Bilinmeyen kullanıcı",
    email,
  };
};

export const attendanceService = {
  // Aynı etkinlik + kullanıcı için doküman kimliği deterministiktir.
  // Böylece hızlı iki tarama bile ikinci bir kayıt oluşturamaz.
  checkIn: async (
    eventId: string,
    userId: string,
    adminId: string,
  ): Promise<CheckInResult> => {
    const userSnap = await getDoc(doc(db, USERS_COLLECTION, userId));
    if (!userSnap.exists()) {
      throw new Error("Bu QR koda ait kullanıcı bulunamadı.");
    }

    const userData = userSnap.data();
    const display = getUserDisplay(userData);
    const attendanceRef = doc(db, ATTENDANCE_COLLECTION, `${eventId}_${userId}`);
    const eventRef = doc(db, EVENTS_COLLECTION, eventId);

    const status = await runTransaction(db, async (transaction) => {
      const attendanceSnap = await transaction.get(attendanceRef);
      if (attendanceSnap.exists()) return "mukerrer" as const;

      const eventSnap = await transaction.get(eventRef);
      if (!eventSnap.exists()) {
        throw new Error("Etkinlik bulunamadı.");
      }

      transaction.set(attendanceRef, {
        event_id: eventId,
        user_id: userId,
        alan_yonetici_id: adminId,
        zaman_damgasi: serverTimestamp(),
      });

      // Yoklama aynı zamanda katılım kaydıdır; geçmiş ekranında görünmesini sağlar.
      transaction.update(eventRef, { katilimcilar: arrayUnion(userId) });

      return "basarili" as const;
    });

    return {
      status,
      user_ad: display.ad,
      user_email: display.email,
    };
  },

  getEventAttendance: async (eventId: string): Promise<AttendanceRecord[]> => {
    const snapshot = await getDocs(
      query(collection(db, ATTENDANCE_COLLECTION), where("event_id", "==", eventId)),
    );

    if (snapshot.empty) return [];

    const usersSnapshot = await getDocs(collection(db, USERS_COLLECTION));
    const users = new Map(
      usersSnapshot.docs.map((userDoc) => [
        userDoc.id,
        getUserDisplay(userDoc.data(), userDoc.data().email),
      ]),
    );

    return snapshot.docs
      .map((attendanceDoc) => {
        const data = attendanceDoc.data() as Omit<AttendanceRecord, "id">;
        const user = users.get(data.user_id);

        return {
          id: attendanceDoc.id,
          ...data,
          user_ad: user?.ad || "Bilinmeyen kullanıcı",
          user_email: user?.email || "",
        };
      })
      .sort((a, b) => toMillis(b.zaman_damgasi) - toMillis(a.zaman_damgasi));
  },

  getUserAttendance: async (userId: string): Promise<Attendance[]> => {
    const snapshot = await getDocs(
      query(collection(db, ATTENDANCE_COLLECTION), where("user_id", "==", userId)),
    );

    return snapshot.docs
      .map((attendanceDoc) => ({
        id: attendanceDoc.id,
        ...(attendanceDoc.data() as Omit<Attendance, "id">),
      }))
      .sort((a, b) => toMillis(b.zaman_damgasi) - toMillis(a.zaman_damgasi));
  },
};

export default attendanceService;
