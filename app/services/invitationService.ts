import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { notificationService } from "./notificationService";
import { ClubRole, INVITATION_STATUS, Invitation, MEMBERSHIP_STATUS } from "../types";

export type InvitationItem = Invitation;

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
      where("durum", "==", INVITATION_STATUS.PENDING),
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
        status: MEMBERSHIP_STATUS.ACTIVE,
        katilim_tarihi: new Date().toISOString(),
      });

      // Şartname 8: üyelik/yöneticilik verildiğinde ilgili kişiye bildirim.
      const clubSnap = await getDoc(doc(db, "clubs", clubId));
      const clubName = clubSnap.exists() ? String(clubSnap.data().ad ?? "Kulüp") : "Kulüp";
      await notificationService.notifyRoleInvitation(userId, clubName, role, clubId);

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

    // Belge kimliği = token. Böylece giriş yapmadan yalnızca tam token ile
    // tek belge okunabilir; davet listesi herkese açık olmaz.
    await setDoc(doc(db, "invitations", token), {
      email: cleanEmail,
      club_id: clubId,
      role: role,
      token: token,
      son_gecerlilik_tarihi: expiresAt,
      durum: INVITATION_STATUS.PENDING,
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
    const oldSnap = await getDoc(doc(db, "invitations", inviteId));
    if (!oldSnap.exists()) {
      throw new Error("Davet bulunamadı.");
    }

    const token = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

    // Kimlik = token olduğu için yenileme, yeni belge oluşturup eskisini siler.
    await setDoc(doc(db, "invitations", token), {
      ...oldSnap.data(),
      token: token,
      son_gecerlilik_tarihi: expiresAt,
      durum: INVITATION_STATUS.PENDING,
      createdAt: serverTimestamp(),
    });
    await deleteDoc(doc(db, "invitations", inviteId));

    return {
      newInviteLink: `https://kulupyonetim.app/join?token=${token}`,
    };
  },

  // 4. Token Doğrulama (InviteAcceptScreen'in Çağırdığı Fonksiyon)
  verifyToken: async (token: string): Promise<InvitationItem> => {
    const cleanToken = token.trim();
    const docSnap = await getDoc(doc(db, "invitations", cleanToken));

    if (!docSnap.exists()) {
      throw new Error("Geçersiz veya bulunamayan davet kodu!");
    }

    const data = docSnap.data();

    if (data.son_gecerlilik_tarihi && new Date(data.son_gecerlilik_tarihi) < new Date()) {
      // Giriş yapılmadan silme yetkisi yok; süre kontrolü yeterli.
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
    ad,
    soyad,
    password,
    student_no,
  }: {
    invite: InvitationItem;
    ad: string;
    soyad: string;
    password: string;
    student_no?: string;
  }) => {
    const userCredential = await createUserWithEmailAndPassword(auth, invite.email, password);
    const user = userCredential.user;

    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      ad,
      soyad,
      email: invite.email,
      telefon: "",
      student_no: student_no || "",
      bolum: "",
      avatarUrl: "",
      is_admin: false,
      createdAt: serverTimestamp(),
    });

    // davet_token, güvenlik kurallarının üyeliğin gerçek bir davete
    // dayandığını doğrulaması için zorunludur.
    await addDoc(collection(db, "memberships"), {
      club_id: invite.club_id,
      user_id: user.uid,
      role: invite.role,
      status: MEMBERSHIP_STATUS.ACTIVE,
      katilim_tarihi: new Date().toISOString(),
      davet_token: invite.token,
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
