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
  fetchProfile: (uid: string) => Promise<UserProfile | null>;
  login: (email: string, pass: string) => Promise<UserProfile | null>;
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

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  error: null,

  clearError: () => set({ error: null }),

  // Firestore'dan kullanıcı profilini çeken yardımcı fonksiyon
  fetchProfile: async (uid: string): Promise<UserProfile | null> => {
    try {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        const profileData = userDoc.data() as UserProfile;
        set({ profile: profileData });
        return profileData;
      } else {
        const fallbackProfile: UserProfile = {
          uid,
          email: auth.currentUser?.email || "",
          is_admin: false,
        };
        set({ profile: fallbackProfile });
        return fallbackProfile;
      }
    } catch (e) {
      console.log("Profil verisi çekilemedi:", e);
      return null;
    }
  },

  // Uygulama açılışında oturum durumunu takip eden dinleyici
  initializeAuthListener: () => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        set({ user: firebaseUser });
        await get().fetchProfile(firebaseUser.uid);
        set({ loading: false });
      } else {
        set({ user: null, profile: null, loading: false });
      }
    });
    return unsubscribe;
  },

  // Giriş yapma fonksiyonu: Giriş biter bitmez Firestore profilini garantiye alır
  login: async (email: string, pass: string) => {
    set({ loading: true, error: null });
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), pass);
      const firebaseUser = userCredential.user;
      set({ user: firebaseUser });

      // Firestore profilini anında yükle ve döndür
      const userProfile = await get().fetchProfile(firebaseUser.uid);
      set({ loading: false });
      return userProfile;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  // Kayıt olma fonksiyonu
  register: async ({ name, surname, email, pass, phone = "" }) => {
    set({ loading: true, error: null });
    try {
      const res = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      const uid = res.user.uid;

      const profileData: UserProfile = {
        uid,
        email: email.trim(),
        name,
        surname,
        phone,
        is_admin: false, // Yeni kayıt olan her kullanıcı varsayılan olarak üye statüsündedir
      };

      await setDoc(doc(db, "users", uid), {
        ...profileData,
        createdAt: serverTimestamp(),
      });

      set({ user: res.user, profile: profileData, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  // Çıkış yapma fonksiyonu
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

  // Şifre sıfırlama fonksiyonu
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
