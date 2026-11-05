import { db } from "../lib/firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { User } from "../types";

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
};
