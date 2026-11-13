import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { getErrorMessage } from "../lib/errors";
import { notificationService } from "./notificationService";
import {
  CLUB_ROLE,
  Club,
  ClubRole,
  JOIN_REQUEST_STATUS,
  JoinRequestStatus,
  MEMBERSHIP_STATUS,
  MembershipStatus,
  isClubManagerRole,
} from "../types";

export interface JoinRequestItem {
  id: string;
  club_id: string;
  user_id: string;
  user_email: string;
  ad_soyad?: string;
  mesaj?: string;
  durum: JoinRequestStatus;
  tarih?: string;
}

export interface ClubMemberDetail {
  membership_id: string;
  user_id: string;
  email: string;
  ad_soyad?: string;
  role: ClubRole;
  status: MembershipStatus;
  katilim_tarihi?: string;
}

export interface UserClub extends Club {
  membership_id: string;
  role: ClubRole;
  status: MembershipStatus;
  katilim_tarihi?: string;
}

export const membershipService = {
  // 1. Öğrencinin kulübe başvuru yapması (Sistem Yöneticisi Engelli)
  applyToClub: async (
    clubId: string,
    userId: string,
    userEmail: string,
    mesaj: string = "",
    adSoyad: string = "",
  ) => {
    // A) Kullanıcı rolünü kontrol et: Sistem Yöneticisi (Admin) ise engelle
    try {
      const qUser = query(collection(db, "users"), where("__name__", "==", userId));
      const userSnap = await getDocs(qUser);
      if (!userSnap.empty) {
        const userData = userSnap.docs[0].data();
        if (userData.is_admin === true) {
          throw new Error("Sistem yöneticileri kulüplere üye olamaz veya başvuru yapamaz.");
        }
      }
    } catch (err) {
      if (getErrorMessage(err, "").includes("Sistem yöneticileri")) {
        throw err;
      }
      console.log("Kullanıcı rol kontrolü yapılırken uyarı:", err);
    }

    // B) Daha önce aktif üyeliği veya bekleyen başvurusu var mı kontrol et
    const qMembers = query(
      collection(db, "memberships"),
      where("club_id", "==", clubId),
      where("user_id", "==", userId),
    );
    const memberSnap = await getDocs(qMembers);

    if (!memberSnap.empty) {
      const data = memberSnap.docs[0].data();
      if (data.status === MEMBERSHIP_STATUS.ACTIVE)
        throw new Error("Zaten bu kulübün aktif üyesisiniz.");
      if (data.status === MEMBERSHIP_STATUS.PENDING) {
        throw new Error("Bu kulüp için zaten bekleyen bir başvurunuz var.");
      }
    }

    // C) JoinRequest kaydı oluştur
    await addDoc(collection(db, "join_requests"), {
      club_id: clubId,
      user_id: userId,
      user_email: userEmail,
      ad_soyad: adSoyad,
      mesaj: mesaj.trim(),
      durum: JOIN_REQUEST_STATUS.PENDING,
      createdAt: serverTimestamp(),
    });

    // D) Mükerrer oluşturmamak için: Eğer eski pasif/reddedilmiş kaydı varsa onu güncelle, yoksa yeni aç
    if (!memberSnap.empty) {
      await updateDoc(doc(db, "memberships", memberSnap.docs[0].id), {
        role: CLUB_ROLE.MEMBER,
        status: MEMBERSHIP_STATUS.PENDING,
        katilim_tarihi: new Date().toISOString(),
      });
    } else {
      await addDoc(collection(db, "memberships"), {
        club_id: clubId,
        user_id: userId,
        role: CLUB_ROLE.MEMBER,
        status: MEMBERSHIP_STATUS.PENDING,
        katilim_tarihi: new Date().toISOString(),
      });
    }

    return true;
  },

  // 2. Bir kulübe gelen bekleyen başvuruları çekme (Yönetici Paneli)
  getPendingRequests: async (clubId: string): Promise<JoinRequestItem[]> => {
    const q = query(
      collection(db, "join_requests"),
      where("club_id", "==", clubId),
      where("durum", "==", JOIN_REQUEST_STATUS.PENDING),
    );
    const snap = await getDocs(q);
    return snap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<JoinRequestItem, "id">),
    }));
  },

  // 3. Başvuruyu Onaylama (Mükerrer üyelik engelli)
  approveRequest: async (requestId: string, clubId: string, userId: string) => {
    const qExisting = query(
      collection(db, "memberships"),
      where("club_id", "==", clubId),
      where("user_id", "==", userId),
    );
    const existingSnap = await getDocs(qExisting);

    if (existingSnap.empty) {
      await addDoc(collection(db, "memberships"), {
        club_id: clubId,
        user_id: userId,
        role: CLUB_ROLE.MEMBER,
        status: MEMBERSHIP_STATUS.ACTIVE,
        katilim_tarihi: new Date().toISOString(),
      });
    } else {
      // Varsa ilk dokümanı aktif yap
      const primaryDoc = existingSnap.docs[0];
      await updateDoc(doc(db, "memberships", primaryDoc.id), {
        status: MEMBERSHIP_STATUS.ACTIVE,
        role: CLUB_ROLE.MEMBER,
      });

      // Eğer birden fazla doküman oluşmuşsa temizle
      if (existingSnap.docs.length > 1) {
        for (let i = 1; i < existingSnap.docs.length; i++) {
          await deleteDoc(doc(db, "memberships", existingSnap.docs[i].id));
        }
      }
    }

    await updateDoc(doc(db, "join_requests", requestId), {
      durum: JOIN_REQUEST_STATUS.APPROVED,
      karar_tarihi: new Date().toISOString(),
      karar_veren_id: auth.currentUser?.uid ?? "",
      updatedAt: serverTimestamp(),
    });
  },

  // 4. Başvuruyu Reddetme
  rejectRequest: async (requestId: string, clubId: string, userId: string) => {
    await updateDoc(doc(db, "join_requests", requestId), {
      durum: JOIN_REQUEST_STATUS.REJECTED,
      karar_tarihi: new Date().toISOString(),
      karar_veren_id: auth.currentUser?.uid ?? "",
      updatedAt: serverTimestamp(),
    });

    const qMember = query(
      collection(db, "memberships"),
      where("club_id", "==", clubId),
      where("user_id", "==", userId),
    );
    const memberSnap = await getDocs(qMember);
    if (!memberSnap.empty) {
      await updateDoc(doc(db, "memberships", memberSnap.docs[0].id), {
        status: MEMBERSHIP_STATUS.REJECTED,
      });
    }
  },

  // 5. ClubDetailScreen için üyelik ve rol durumunu getirme
  getUserMembership: async (clubId: string, userId: string) => {
    try {
      const q = query(
        collection(db, "memberships"),
        where("club_id", "==", clubId),
        where("user_id", "==", userId),
      );
      const snap = await getDocs(q);
      if (snap.empty) return null;
      const docData = snap.docs[0].data();
      return {
        id: snap.docs[0].id,
        role: (docData.role || CLUB_ROLE.MEMBER) as ClubRole,
        status: (docData.status || MEMBERSHIP_STATUS.PENDING) as MembershipStatus,
      };
    } catch (error) {
      console.log("getUserMembership hatası:", error);
      return null;
    }
  },

  // 6. Kullanıcının kulüpteki mevcut üyelik durumunu sorgulama (Tip güvenli)
  getUserClubStatus: async (clubId: string, userId: string) => {
    const q = query(
      collection(db, "memberships"),
      where("club_id", "==", clubId),
      where("user_id", "==", userId),
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const data = snap.docs[0].data();
    return {
      role: (data.role || CLUB_ROLE.MEMBER) as ClubRole,
      status: (data.status || MEMBERSHIP_STATUS.PENDING) as MembershipStatus,
    };
  },

  // 7. Bir kulübün tüm üyelerini ve yöneticilerini çekme (Mükerrerleri filtreler)
  getClubMembers: async (clubId: string): Promise<ClubMemberDetail[]> => {
    const qMembers = query(collection(db, "memberships"), where("club_id", "==", clubId));
    const memberSnap = await getDocs(qMembers);

    const members: ClubMemberDetail[] = [];
    const seenUserIds = new Set<string>();

    for (const memberDoc of memberSnap.docs) {
      const mData = memberDoc.data();
      if (mData.status === MEMBERSHIP_STATUS.ACTIVE || mData.status === MEMBERSHIP_STATUS.PASSIVE) {
        if (seenUserIds.has(mData.user_id)) {
          continue;
        }
        seenUserIds.add(mData.user_id);

        let email = "Bilinmeyen Kullanıcı";
        let ad_soyad = "";

        try {
          const userDocSnap = await getDocs(
            query(collection(db, "users"), where("__name__", "==", mData.user_id)),
          );
          if (!userDocSnap.empty) {
            const uData = userDocSnap.docs[0].data();
            email = uData.email || email;
            ad_soyad = uData.ad ? `${uData.ad} ${uData.soyad || ""}`.trim() : "";
          }
        } catch (e) {
          console.log("Kullanıcı detayı alınamadı:", e);
        }

        members.push({
          membership_id: memberDoc.id,
          user_id: mData.user_id,
          email,
          ad_soyad,
          role: (mData.role || CLUB_ROLE.MEMBER) as ClubRole,
          status: mData.status,
          katilim_tarihi: mData.katilim_tarihi,
        });
      }
    }

    return members;
  },

  // 8. Üyenin aktif/pasif durumunu değiştirme
  toggleMemberStatus: async (membershipId: string, currentStatus: MembershipStatus) => {
    const nextStatus: MembershipStatus =
      currentStatus === MEMBERSHIP_STATUS.ACTIVE
        ? MEMBERSHIP_STATUS.PASSIVE
        : MEMBERSHIP_STATUS.ACTIVE;
    await updateDoc(doc(db, "memberships", membershipId), {
      status: nextStatus,
    });
    return nextStatus;
  },

  // 9. Üyenin rolünü değiştirme (Üye <-> Yönetici)
  toggleMemberRole: async (
    membershipId: string,
    currentRole: ClubRole,
    notify?: { userId: string; clubId: string; clubName: string },
  ) => {
    const nextRole: ClubRole = isClubManagerRole(currentRole)
      ? CLUB_ROLE.MEMBER
      : CLUB_ROLE.MANAGER;
    await updateDoc(doc(db, "memberships", membershipId), {
      role: nextRole,
    });

    // Şartname 8: yöneticilik verildiğinde ilgili kişiye bildirim gider.
    if (nextRole === CLUB_ROLE.MANAGER && notify) {
      await notificationService.notifyRoleInvitation(
        notify.userId,
        notify.clubName,
        nextRole,
        notify.clubId,
      );
    }

    return nextRole;
  },

  // 10. Kulüpten Üye Silme / Çıkarma
  removeMemberFromClub: async (membershipId: string) => {
    await deleteDoc(doc(db, "memberships", membershipId));
  },

  // 11. Kullanıcı bu kulübün aktif yöneticisi mi?
  isClubManager: async (clubId: string, userId: string): Promise<boolean> => {
    const q = query(
      collection(db, "memberships"),
      where("club_id", "==", clubId),
      where("user_id", "==", userId),
      where("role", "==", CLUB_ROLE.MANAGER),
      where("status", "==", MEMBERSHIP_STATUS.ACTIVE),
    );
    const snap = await getDocs(q);
    return !snap.empty;
  },

  // 12. Kullanıcının aktif yönetici olduğu kulüpler
  getManagedClubs: async (userId: string): Promise<Club[]> => {
    const q = query(
      collection(db, "memberships"),
      where("user_id", "==", userId),
      where("role", "==", CLUB_ROLE.MANAGER),
      where("status", "==", MEMBERSHIP_STATUS.ACTIVE),
    );
    const snap = await getDocs(q);

    const clubIds = new Set(snap.docs.map((memberDoc) => memberDoc.data().club_id as string));
    if (clubIds.size === 0) return [];

    const clubsSnap = await getDocs(collection(db, "clubs"));
    return clubsSnap.docs
      .filter((clubDoc) => clubIds.has(clubDoc.id))
      .map((clubDoc) => ({ id: clubDoc.id, ...clubDoc.data() }) as Club);
  },

  // 13. Kullanıcı herhangi bir kulüpte aktif yönetici mi?
  isManagerOfAnyClub: async (userId: string): Promise<boolean> => {
    const q = query(
      collection(db, "memberships"),
      where("user_id", "==", userId),
      where("role", "==", CLUB_ROLE.MANAGER),
      where("status", "==", MEMBERSHIP_STATUS.ACTIVE),
    );
    const snap = await getDocs(q);
    return !snap.empty;
  },

  // 14. Kullanıcının aktif üyeliklerini kulüp bilgisiyle getir
  getUserClubs: async (userId: string): Promise<UserClub[]> => {
    const q = query(collection(db, "memberships"), where("user_id", "==", userId));
    const membershipSnap = await getDocs(q);
    const activeMemberships = membershipSnap.docs.filter(
      (membershipDoc) => membershipDoc.data().status === MEMBERSHIP_STATUS.ACTIVE,
    );

    if (activeMemberships.length === 0) return [];

    const clubsSnap = await getDocs(collection(db, "clubs"));
    const clubMap = new Map(
      clubsSnap.docs.map((clubDoc) => {
        const data = clubDoc.data();
        return [
          clubDoc.id,
          {
            ...data,
            id: clubDoc.id,
            gorselUrl: data.gorselUrl || "",
            detayliAciklama: data.detayliAciklama || "",
          } as Club,
        ];
      }),
    );

    return activeMemberships
      .map((membershipDoc): UserClub | null => {
        const data = membershipDoc.data();
        const club = clubMap.get(data.club_id as string);
        if (!club) return null;

        return {
          ...club,
          membership_id: membershipDoc.id,
          role: (data.role || CLUB_ROLE.MEMBER) as ClubRole,
          status: data.status as MembershipStatus,
          katilim_tarihi: data.katilim_tarihi as string | undefined,
        };
      })
      .filter((club): club is UserClub => club !== null)
      .sort((a, b) => a.ad.localeCompare(b.ad, "tr"));
  },
};
