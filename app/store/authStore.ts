import { create } from "zustand";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

export interface UserProfile {
  uid: string;
  email: string;
  name?: string;
  surname?: string;
  phone?: string;
  is_admin: boolean;
}

interface AuthState {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  initializeAuthListener: () => () => void;
  login: (email: string, pass: string) => Promise<void>;
  register: (data: {
    name: string;
    surname: string;
    email: string;
    pass: string;
    phone?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  loading: true,
  error: null,

  clearError: () => set({ error: null }),

  initializeAuthListener: () => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          if (userDoc.exists()) {
            set({
              user: firebaseUser,
              profile: userDoc.data() as UserProfile,
              loading: false,
            });
          } else {
            set({
              user: firebaseUser,
              profile: {
                uid: firebaseUser.uid,
                email: firebaseUser.email || "",
                is_admin: false,
              },
              loading: false,
            });
          }
        } catch (e) {
          set({ user: firebaseUser, loading: false });
        }
      } else {
        set({ user: null, profile: null, loading: false });
      }
    });
    return unsubscribe;
  },

  login: async (email: string, pass: string) => {
    set({ loading: true, error: null });
    try {
      await signInWithEmailAndPassword(auth, email.trim(), pass);
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  register: async ({ name, surname, email, pass, phone = "" }) => {
    set({ loading: true, error: null });
    try {
      const res = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      const uid = res.user.uid;

      // Gün 6 kuralı: users/{uid} dokümanı oluştur (ad, soyad, email, telefon, is_admin: false)
      const profileData: UserProfile = {
        uid,
        email: email.trim(),
        name,
        surname,
        phone,
        is_admin: false,
      };

      await setDoc(doc(db, "users", uid), {
        ...profileData,
        createdAt: serverTimestamp(),
      });

      set({ profile: profileData, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  logout: async () => {
    set({ loading: true, error: null });
    try {
      await signOut(auth);
      set({ user: null, profile: null, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  resetPassword: async (email: string) => {
    set({ loading: true, error: null });
    try {
      await sendPasswordResetEmail(auth, email.trim());
      set({ loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },
}));
