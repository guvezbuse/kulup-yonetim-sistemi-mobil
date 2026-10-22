import { db } from "./firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";

export interface UserProfile {
  id: string;
  name?: string;
  surname?: string;
  email?: string;
  role?: "admin" | "yonetici" | "uye";
  durum?: "aktif" | "pasif";
}

export const userService = {
  // Tüm kullanıcıları çek
  getAllUsers: async (): Promise<UserProfile[]> => {
    const querySnapshot = await getDocs(collection(db, "users"));
    const users: UserProfile[] = [];
    querySnapshot.forEach((docSnap) => {
      users.push({ id: docSnap.id, ...docSnap.data() } as UserProfile);
    });
    return users;
  },

  // Kullanıcı rolünü güncelle (admin / uye)
  updateUserRole: async (userId: string, newRole: "admin" | "uye") => {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, { role: newRole });
  },
};
