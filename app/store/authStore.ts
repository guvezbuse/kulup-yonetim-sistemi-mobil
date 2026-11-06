import { create } from "zustand";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateEmail,
  User as FirebaseUser,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { getErrorMessage } from "../lib/errors";
import { userService, UserProfileUpdate } from "../services/userService";
import { User } from "../types";

interface AuthState {
  user: FirebaseUser | null;
  profile: User | null;
  loading: boolean;
  error: string | null;
  initializeAuthListener: () => () => void;
  fetchProfile: (uid: string) => Promise<User | null>;
  login: (email: string, pass: string) => Promise<User | null>;
  register: (data: {
    ad: string;
    soyad: string;
    email: string;
    pass: string;
    telefon?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (data: UserProfileUpdate) => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  error: null,

  clearError: () => set({ error: null }),

  // Firestore'dan kullanıcı profilini çeken yardımcı fonksiyon
  fetchProfile: async (uid: string): Promise<User | null> => {
    try {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        const rawData = userDoc.data();
        const profileData: User = {
          uid,
          email: rawData.email || "",
          ad: rawData.ad || "",
          soyad: rawData.soyad || "",
          telefon: rawData.telefon || "",
          student_no: rawData.student_no || "",
          bolum: rawData.bolum || "",
          avatarUrl: rawData.avatarUrl || "",
          is_admin: rawData.is_admin === true,
          createdAt: rawData.createdAt || null,
        };
        set({ profile: profileData });
        return profileData;
      } else {
        const fallbackProfile: User = {
          uid,
          email: auth.currentUser?.email || "",
          ad: "",
          soyad: "",
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
    } catch (err) {
      set({ error: getErrorMessage(err, "İşlem başarısız."), loading: false });
      throw err;
    }
  },

  // Kayıt olma fonksiyonu
  register: async ({ ad, soyad, email, pass, telefon = "" }) => {
    set({ loading: true, error: null });
    try {
      const res = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      const uid = res.user.uid;

      const profileData: User = {
        uid,
        email: email.trim(),
        ad,
        soyad,
        telefon,
        student_no: "",
        is_admin: false,
      };

      await setDoc(doc(db, "users", uid), {
        ...profileData,
        createdAt: serverTimestamp(),
      });

      set({ user: res.user, profile: profileData, loading: false });
    } catch (err) {
      set({ error: getErrorMessage(err, "İşlem başarısız."), loading: false });
      throw err;
    }
  },

  // Çıkış yapma fonksiyonu
  logout: async () => {
    set({ loading: true, error: null });
    try {
      await signOut(auth);
      set({ user: null, profile: null, loading: false });
    } catch (err) {
      set({ error: getErrorMessage(err, "İşlem başarısız."), loading: false });
      throw err;
    }
  },

  // Şifre sıfırlama fonksiyonu
  resetPassword: async (email: string) => {
    set({ loading: true, error: null });
    try {
      await sendPasswordResetEmail(auth, email.trim());
      set({ loading: false });
    } catch (err) {
      set({ error: getErrorMessage(err, "İşlem başarısız."), loading: false });
      throw err;
    }
  },

  // Profil alanlarını Firestore ve Auth tarafında tek akışta güncelle
  updateProfile: async (data: UserProfileUpdate) => {
    const currentProfile = get().profile;
    if (!currentProfile) {
      throw new Error("Profil bilgileri yüklenemedi.");
    }

    const nextEmail = data.email?.trim();
    const emailChanged = !!nextEmail && nextEmail !== currentProfile.email;

    if (emailChanged && auth.currentUser) {
      // Giriş adresi Auth tarafında da güncellenmezse sonraki giriş başarısız olur.
      await updateEmail(auth.currentUser, nextEmail);
    }

    await userService.updateUserProfile(currentProfile.uid, {
      ...data,
      ...(nextEmail ? { email: nextEmail } : {}),
    });

    set({
      profile: {
        ...currentProfile,
        ...data,
        ...(nextEmail ? { email: nextEmail } : {}),
      },
      error: null,
    });
  },
}));
