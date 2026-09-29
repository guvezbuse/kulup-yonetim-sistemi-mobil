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
import { db } from "../lib/firebase";
import { ClubRole, MembershipStatus } from "../types";

export interface JoinRequestItem {
  id: string;
  club_id: string;
  user_id: string;
  user_email: string;
  user_name?: string;
  mesaj?: string;
  durum: "beklemede" | "onaylandi" | "reddedildi";
  tarih?: string;
}

export interface ClubMemberDetail {
  membershipId: string;
  userId: string;
  email: string;
  name?: string;
  role: ClubRole;
  status: MembershipStatus;
  katilim_tarihi?: string;
}

export const membershipService = {
  // 1. Öğrencinin kulübe başvuru yapması (Şartname 4.4)
  applyToClub: async (
    clubId: string,
    userId: string,
    userEmail: string,
    mesaj: string = "",
    userName: string = "",
  ) => {
    // Daha önce aktif üyeliği veya bekleyen başvurusu var mı kontrol et
    const qMembers = query(
      collection(db, "memberships"),
      where("club_id", "==", clubId),
      where("user_id", "==", userId),
    );
    const memberSnap = await getDocs(qMembers);

    if (!memberSnap.empty) {
      const data = memberSnap.docs[0].data();
      if (data.status === "aktif") throw new Error("Zaten bu kulübün aktif üyesisiniz.");
      if (data.status === "beklemede") {
        throw new Error("Bu kulüp için zaten bekleyen bir başvurunuz var.");
      }
    }

    // JoinRequest kaydı oluştur
    await addDoc(collection(db, "join_requests"), {
      club_id: clubId,
      user_id: userId,
      user_email: userEmail,
      user_name: userName,
      mesaj: mesaj.trim(),
      durum: "beklemede",
      createdAt: serverTimestamp(),
    });

    // Mükerrer oluşturmamak için: Eğer eski pasif/reddedilmiş kaydı varsa onu güncelle, yoksa yeni aç
    if (!memberSnap.empty) {
      await updateDoc(doc(db, "memberships", memberSnap.docs[0].id), {
        role: "üye",
        status: "beklemede",
        katilim_tarihi: new Date().toISOString(),
      });
    } else {
      await addDoc(collection(db, "memberships"), {
        club_id: clubId,
        user_id: userId,
        role: "üye",
        status: "beklemede",
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
      where("durum", "==", "beklemede"),
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
        role: "üye",
        status: "aktif",
        katilim_tarihi: new Date().toISOString(),
      });
    } else {
      // Varsa ilk dokümanı aktif yap
      const primaryDoc = existingSnap.docs[0];
      await updateDoc(doc(db, "memberships", primaryDoc.id), {
        status: "aktif",
        role: "üye",
      });

      // Eğer birden fazla doküman oluşmuşsa temizle
      if (existingSnap.docs.length > 1) {
        for (let i = 1; i < existingSnap.docs.length; i++) {
          await deleteDoc(doc(db, "memberships", existingSnap.docs[i].id));
        }
      }
    }

    await updateDoc(doc(db, "join_requests", requestId), {
      durum: "onaylandi",
      updatedAt: serverTimestamp(),
    });
  },

  // 4. Başvuruyu Reddetme (Şartname 4.4)
  rejectRequest: async (requestId: string, clubId: string, userId: string) => {
    await updateDoc(doc(db, "join_requests", requestId), {
      durum: "reddedildi",
      karar_tarihi: new Date().toISOString(),
    });

    const qMember = query(
      collection(db, "memberships"),
      where("club_id", "==", clubId),
      where("user_id", "==", userId),
    );
    const memberSnap = await getDocs(qMember);
    if (!memberSnap.empty) {
      await updateDoc(doc(db, "memberships", memberSnap.docs[0].id), {
        status: "reddedildi",
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
        role: docData.role || "üye",
        status: docData.status || "beklemede",
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
    return snap.docs[0].data() as { role: ClubRole; status: MembershipStatus };
  },

  // 7. Bir kulübün tüm üyelerini ve yöneticilerini çekme (Mükerrerleri filtreler)
  getClubMembers: async (clubId: string): Promise<ClubMemberDetail[]> => {
    const qMembers = query(collection(db, "memberships"), where("club_id", "==", clubId));
    const memberSnap = await getDocs(qMembers);

    const members: ClubMemberDetail[] = [];
    const seenUserIds = new Set<string>();

    for (const memberDoc of memberSnap.docs) {
      const mData = memberDoc.data();
      if (mData.status === "aktif" || mData.status === "pasif") {
        // Eğer aynı kullanıcıdan veritabanında çift oluşmuşsa pasif/fazla olanı atla
        if (seenUserIds.has(mData.user_id)) {
          continue;
        }
        seenUserIds.add(mData.user_id);

        let email = "Bilinmeyen Kullanıcı";
        let name = "";

        try {
          const userDocSnap = await getDocs(
            query(collection(db, "users"), where("__name__", "==", mData.user_id)),
          );
          if (!userDocSnap.empty) {
            const uData = userDocSnap.docs[0].data();
            email = uData.email || email;
            name = uData.name ? `${uData.name} ${uData.surname || ""}`.trim() : "";
          }
        } catch (e) {
          console.log("Kullanıcı detayı alınamadı:", e);
        }

        members.push({
          membershipId: memberDoc.id,
          userId: mData.user_id,
          email,
          name,
          role: mData.role,
          status: mData.status,
          katilim_tarihi: mData.katilim_tarihi,
        });
      }
    }

    return members;
  },

  // 8. Üyenin aktif/pasif durumunu değiştirme
  toggleMemberStatus: async (membershipId: string, currentStatus: MembershipStatus) => {
    const nextStatus: MembershipStatus = currentStatus === "aktif" ? "pasif" : "aktif";
    await updateDoc(doc(db, "memberships", membershipId), {
      status: nextStatus,
    });
    return nextStatus;
  },

  // 9. Üyenin rolünü değiştirme (Üye <-> Yönetici)
  toggleMemberRole: async (membershipId: string, currentRole: ClubRole) => {
    const isYonetici = currentRole === "yonetici" || (currentRole as any) === "yönetici";
    const nextRole: ClubRole = isYonetici ? ("üye" as ClubRole) : ("yonetici" as ClubRole);
    await updateDoc(doc(db, "memberships", membershipId), {
      role: nextRole,
    });
    return nextRole;
  },

  // 10. Kulüpten Üye Silme / Çıkarma
  removeMemberFromClub: async (membershipId: string) => {
    await deleteDoc(doc(db, "memberships", membershipId));
  },
};
