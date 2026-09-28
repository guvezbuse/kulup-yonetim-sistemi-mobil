import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { db, auth } from "./firebase";
import { ClubRole } from "../types";

export interface InvitationItem {
  id: string;
  club_id: string;
  email: string;
  role: ClubRole;
  token: string;
  expires_at: Timestamp;
  status: "pending" | "accepted" | "expired";
  created_at?: Timestamp;
}

export const invitationService = {
  // Rastgele 32 karakterlik token üretir
  generateToken(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let token = "";
    for (let i = 0; i < 32; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  },

  // Kulübe ait bekleyen davetleri çeker
  async getPendingInvitations(clubId: string): Promise<InvitationItem[]> {
    const q = query(
      collection(db, "invitations"),
      where("club_id", "==", clubId),
      where("status", "==", "pending"),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<InvitationItem, "id">),
    }));
  },

  // Süresi dolmuş veya bekleyen davetin token'ını 72 saat uzatarak yeniler
  async resendInvitation(inviteId: string): Promise<{ newToken: string; newInviteLink: string }> {
    const newToken = this.generateToken();
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 saat

    await updateDoc(doc(db, "invitations", inviteId), {
      token: newToken,
      expires_at: Timestamp.fromDate(expiresAt),
      status: "pending",
      updated_at: serverTimestamp(),
    });

    const newInviteLink = `https://kulup.app/invite?token=${newToken}`;
    return { newToken, newInviteLink };
  },

  // E-Posta ile davet etme (varsa üye yapar + bildirim atar, yoksa 72 saatlik davet açar)
  async inviteUserToClub(
    clubId: string,
    email: string,
    role: ClubRole,
  ): Promise<{ type: "added" | "invited"; message: string; inviteLink?: string; token?: string }> {
    const cleanEmail = email.trim().toLowerCase();

    // 1. Kullanıcı users tablosunda var mı?
    const usersQ = query(collection(db, "users"), where("email", "==", cleanEmail));
    const usersSnap = await getDocs(usersQ);

    if (!usersSnap.empty) {
      const userDoc = usersSnap.docs[0];
      const targetUid = userDoc.id;

      const memQ = query(
        collection(db, "memberships"),
        where("club_id", "==", clubId),
        where("user_id", "==", targetUid),
      );
      const memSnap = await getDocs(memQ);

      if (!memSnap.empty) {
        throw new Error("Bu kullanıcı zaten bu kulübün üyesi!");
      }

      // Üyelik kaydı oluştur
      await addDoc(collection(db, "memberships"), {
        club_id: clubId,
        user_id: targetUid,
        role: role,
        status: "aktif",
        created_at: serverTimestamp(),
      });

      // Kullanıcıya sistem içi bildirim kaydı oluştur (Şartname 4.2)
      await addDoc(collection(db, "notifications"), {
        user_id: targetUid,
        title: "Yeni Kulüp Üyeliği",
        body: `Bir kulübe ${role} olarak başarıyla eklendiniz.`,
        read: false,
        created_at: serverTimestamp(),
      }).catch(() => {});

      return {
        type: "added",
        message: `${cleanEmail} başarıyla ${role} olarak kulübe eklendi.`,
      };
    }

    // 2. Kullanıcı kayıtlı değil -> 72 saatlik invitation aç
    const token = this.generateToken();
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

    await addDoc(collection(db, "invitations"), {
      club_id: clubId,
      email: cleanEmail,
      role: role,
      token: token,
      expires_at: Timestamp.fromDate(expiresAt),
      status: "pending",
      created_at: serverTimestamp(),
    });

    const inviteLink = `https://kulup.app/invite?token=${token}`;

    return {
      type: "invited",
      message: "Kullanıcı kayıtlı değil, 72 saat geçerli davet oluşturuldu.",
      inviteLink,
      token,
    };
  },

  // Token geçerliliğini denetler
  async verifyToken(token: string): Promise<InvitationItem> {
    const cleanToken = token.trim();
    const q = query(collection(db, "invitations"), where("token", "==", cleanToken));
    const snap = await getDocs(q);

    if (snap.empty) {
      throw new Error("Geçersiz davet kodu veya bağlantısı!");
    }

    const inviteDoc = snap.docs[0];
    const data = inviteDoc.data() as Omit<InvitationItem, "id">;

    if (data.status === "accepted") {
      throw new Error("Bu davet bağlantısı daha önce kullanılmış.");
    }

    const now = new Date();
    if (data.expires_at.toDate() < now) {
      throw new Error(
        "Bu davetin 72 saatlik geçerlilik süresi dolmuş. Lütfen kulüp yöneticinizden yeni davet isteyin.",
      );
    }

    return {
      id: inviteDoc.id,
      ...data,
    };
  },

  // Davet kabulü: Firebase Auth hesabı açar, users tablosuna yazar, kulübe üye yapar, daveti kapatır
  async acceptInvitation(params: {
    invite: InvitationItem;
    name: string;
    surname: string;
    password: string;
    studentNo?: string;
  }) {
    const { invite, name, surname, password, studentNo } = params;

    // 1. Firebase Auth üzerinde hesap oluştur
    const cred = await createUserWithEmailAndPassword(auth, invite.email, password);
    const uid = cred.user.uid;

    // 2. Profil bilgilerini Firestore 'users' koleksiyonuna doğrudan yaz
    await setDoc(doc(db, "users", uid), {
      name: name.trim(),
      surname: surname.trim(),
      email: invite.email.toLowerCase(),
      student_no: studentNo?.trim() || "",
      global_role: "student",
      created_at: serverTimestamp(),
    });

    // 3. Kulübe aktif üye/yönetici olarak ekle
    await addDoc(collection(db, "memberships"), {
      club_id: invite.club_id,
      user_id: uid,
      role: invite.role,
      status: "aktif",
      created_at: serverTimestamp(),
    });

    // 4. Davet durumunu 'accepted' yap ve kilitle
    await updateDoc(doc(db, "invitations", invite.id), {
      status: "accepted",
      accepted_at: serverTimestamp(),
      accepted_by: uid,
    });

    return uid;
  },
};
