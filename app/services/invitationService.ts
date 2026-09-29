import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { ClubRole } from "../types";

export interface InvitationItem {
  id: string;
  email: string;
  club_id: string;
  role: ClubRole;
  token: string;
  son_gecerlilik_tarihi: string;
  durum: "beklemede" | "kabul_edildi" | "iptal";
}

export interface InviteResult {
  type: "direct_membership" | "invitation_created";
  message: string;
  inviteLink?: string;
  token?: string;
}

export const invitationService = {
  // 1. Bekleyen Davetleri Listeleme
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

  // 2. Davet Gönderme
  inviteUserToClub: async (
    clubId: string,
    email: string,
    role: ClubRole,
  ): Promise<InviteResult> => {
    const cleanEmail = email.trim().toLowerCase();

    // Kullanıcı zaten kayıtlı mı?
    const usersRef = collection(db, "users");
    const qUser = query(usersRef, where("email", "==", cleanEmail));
    const userSnap = await getDocs(qUser);

    if (!userSnap.empty) {
      const existingUserDoc = userSnap.docs[0];
      const userId = existingUserDoc.id;

      const membershipsRef = collection(db, "memberships");
      const qMember = query(
        membershipsRef,
        where("club_id", "==", clubId),
        where("user_id", "==", userId),
      );
      const memberSnap = await getDocs(qMember);

      if (!memberSnap.empty) {
        throw new Error("Bu kullanıcı zaten bu kulübün üyesi veya yöneticisi.");
      }

      await addDoc(membershipsRef, {
        club_id: clubId,
        user_id: userId,
        role: role,
        status: "aktif",
        katilim_tarihi: new Date().toISOString(),
      });

      await invitationService.deleteInvitationByEmail(clubId, cleanEmail);

      return {
        type: "direct_membership",
        message: `${cleanEmail} sistemde kayıtlı olduğu için doğrudan ${role} olarak eklendi.`,
      };
    }

    // Eski davet varsa sil
    await invitationService.deleteInvitationByEmail(clubId, cleanEmail);

    const token = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

    await addDoc(collection(db, "invitations"), {
      email: cleanEmail,
      club_id: clubId,
      role: role,
      token: token,
      son_gecerlilik_tarihi: expiresAt,
      durum: "beklemede",
      createdAt: serverTimestamp(),
    });

    const inviteLink = `https://kulupyonetim.app/join?token=${token}&clubId=${clubId}`;

    return {
      type: "invitation_created",
      message: `${cleanEmail} sistemde kayıtlı değil. 72 saat geçerli davet bağlantısı oluşturuldu.`,
      inviteLink: inviteLink,
      token: token,
    };
  },

  // 3. Davet Linkini Yenileme
  resendInvitation: async (inviteId: string) => {
    const token = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

    await updateDoc(doc(db, "invitations", inviteId), {
      token: token,
      son_gecerlilik_tarihi: expiresAt,
      durum: "beklemede",
    });

    return {
      newInviteLink: `https://kulupyonetim.app/join?token=${token}`,
    };
  },

  // 4. Token Doğrulama (InviteAcceptScreen'in Çağırdığı Fonksiyon)
  verifyToken: async (token: string): Promise<InvitationItem> => {
    const cleanToken = token.trim();
    const invitationsRef = collection(db, "invitations");
    const q = query(invitationsRef, where("token", "==", cleanToken));
    const snap = await getDocs(q);

    if (snap.empty) {
      throw new Error("Geçersiz veya bulunamayan davet kodu!");
    }

    const docSnap = snap.docs[0];
    const data = docSnap.data();

    if (data.son_gecerlilik_tarihi && new Date(data.son_gecerlilik_tarihi) < new Date()) {
      await deleteDoc(doc(db, "invitations", docSnap.id));
      throw new Error("Bu davet kodunun 72 saatlik geçerlilik süresi dolmuş.");
    }

    return {
      id: docSnap.id,
      email: data.email,
      club_id: data.club_id,
      role: data.role,
      token: data.token,
      son_gecerlilik_tarihi: data.son_gecerlilik_tarihi,
      durum: data.durum,
    };
  },

  // 5. Daveti Kabul Ederek Kayıt Olma & Daveti Veritabanından Silme
  acceptInvitation: async ({
    invite,
    name,
    surname,
    password,
    studentNo,
  }: {
    invite: InvitationItem;
    name: string;
    surname: string;
    password: string;
    studentNo?: string;
  }) => {
    const userCredential = await createUserWithEmailAndPassword(auth, invite.email, password);
    const user = userCredential.user;

    await setDoc(doc(db, "users", user.uid), {
      id: user.uid,
      name,
      surname,
      email: invite.email,
      student_no: studentNo || "",
      is_admin: false,
      createdAt: serverTimestamp(),
    });

    await addDoc(collection(db, "memberships"), {
      club_id: invite.club_id,
      user_id: user.uid,
      role: invite.role,
      status: "aktif",
      katilim_tarihi: new Date().toISOString(),
    });

    // Kabul edildiği için daveti Firestore'dan siliyoruz
    await deleteDoc(doc(db, "invitations", invite.id));

    return true;
  },

  // 6. Tekil Davet Silme (Manuel İptal)
  deleteInvitation: async (inviteId: string) => {
    await deleteDoc(doc(db, "invitations", inviteId));
  },

  // 7. E-postaya göre bekleyen davetleri silme
  deleteInvitationByEmail: async (clubId: string, email: string) => {
    try {
      const q = query(
        collection(db, "invitations"),
        where("club_id", "==", clubId),
        where("email", "==", email.trim().toLowerCase()),
      );
      const snap = await getDocs(q);
      const deletePromises = snap.docs.map((d) => deleteDoc(doc(db, "invitations", d.id)));
      await Promise.all(deletePromises);
    } catch (e) {
      console.log("Davet temizleme hatası:", e);
    }
  },
};
