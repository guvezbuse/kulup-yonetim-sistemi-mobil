import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { ClubRole } from "../types";

export interface InvitationItem {
  id: string;
  club_id: string;
  email: string;
  role: ClubRole;
  token: string;
  expires_at: string;
  durum: "beklemede" | "kullanildi" | "iptal";
}

// 16 haneli rastgele güvenli token üretici
const generateToken = () => {
  return Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
};

export const invitationService = {
  // 1. Kullanıcıyı Kulübe Davet Et (Şartname 4.2 / 4.3)
  inviteUserToClub: async (clubId: string, email: string, role: ClubRole = "üye") => {
    const cleanEmail = email.trim().toLowerCase();

    // 1. Kullanıcı users tablosunda kayıtlı mı kontrol et
    const userQuery = query(collection(db, "users"), where("email", "==", cleanEmail));
    const userSnap = await getDocs(userQuery);

    // SENARYO A: Kullanıcı sistemde zaten kayıtlı (Şartname 4.2)
    if (!userSnap.empty) {
      const existingUser = userSnap.docs[0];
      const userId = existingUser.id;

      // Zaten üye mi?
      const memberQuery = query(
        collection(db, "memberships"),
        where("club_id", "==", clubId),
        where("user_id", "==", userId),
      );
      const memberSnap = await getDocs(memberQuery);

      if (!memberSnap.empty) {
        throw new Error("Bu kullanıcı zaten bu kulübün üyesi.");
      }

      // Doğrudan aktif üyelik oluştur
      await addDoc(collection(db, "memberships"), {
        club_id: clubId,
        user_id: userId,
        role: role,
        status: "aktif",
        katilim_tarihi: new Date().toISOString(),
      });

      return {
        type: "registered" as const,
        message: `${cleanEmail} sistemde kayıtlı olduğu için doğrudan aktif ${role} yapıldı.`,
      };
    }

    // SENARYO B: Kullanıcı sistemde henüz kayıtlı değil (Şartname 4.3 - Davet Linki)
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
    const token = generateToken();

    // Varsa eski beklemedeki daveti kontrol et
    const invQuery = query(
      collection(db, "invitations"),
      where("club_id", "==", clubId),
      where("email", "==", cleanEmail),
      where("durum", "==", "beklemede"),
    );
    const invSnap = await getDocs(invQuery);

    let invitationId = "";

    if (!invSnap.empty) {
      invitationId = invSnap.docs[0].id;
      await updateDoc(doc(db, "invitations", invitationId), {
        token,
        expires_at: expiresAt,
        role,
        updatedAt: serverTimestamp(),
      });
    } else {
      const newInv = await addDoc(collection(db, "invitations"), {
        club_id: clubId,
        email: cleanEmail,
        role: role,
        token: token,
        expires_at: expiresAt,
        durum: "beklemede",
        createdAt: serverTimestamp(),
      });
      invitationId = newInv.id;
    }

    const inviteLink = `https://kulup.app/invite?token=${token}&email=${encodeURIComponent(cleanEmail)}`;

    return {
      type: "invited" as const,
      message: `${cleanEmail} için 72 saat geçerli davet oluşturuldu.`,
      token,
      inviteLink,
      expiresAt,
    };
  },

  // 2. Bir kulübün bekleyen davetlerini çekme
  getPendingInvitations: async (clubId: string): Promise<InvitationItem[]> => {
    const q = query(
      collection(db, "invitations"),
      where("club_id", "==", clubId),
      where("durum", "==", "beklemede"),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<InvitationItem, "id">),
    }));
  },
};
