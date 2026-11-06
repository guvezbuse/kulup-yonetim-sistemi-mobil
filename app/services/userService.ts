import { db } from "../lib/firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { User } from "../types";

export type UserProfileUpdate = Partial<
  Pick<User, "ad" | "soyad" | "email" | "telefon" | "student_no" | "bolum" | "avatarUrl">
>;

export const userService = {
  // Tüm kullanıcıları çek
  getAllUsers: async (): Promise<User[]> => {
    const querySnapshot = await getDocs(collection(db, "users"));
    const users: User[] = [];
    querySnapshot.forEach((docSnap) => {
      users.push({ ...docSnap.data(), uid: docSnap.id } as User);
    });
    return users;
  },

  // Kullanıcının sistem adminliğini güncelle
  updateUserAdmin: async (userId: string, isAdmin: boolean) => {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, { is_admin: isAdmin });
  },

  // Profil alanlarını tek noktadan güncelle
  updateUserProfile: async (userId: string, data: UserProfileUpdate) => {
    const payload = Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined),
    );

    if (Object.keys(payload).length === 0) return;

    await updateDoc(doc(db, "users", userId), payload);
  },
};
