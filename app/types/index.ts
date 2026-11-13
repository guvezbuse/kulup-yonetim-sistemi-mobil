// ==========================================
// KULÜP YÖNETİM SİSTEMİ - TİP TANIMLAMALARI
// ==========================================

import type { Timestamp } from "firebase/firestore";

// Firestore tarih alanları: yeni kayıtlar Timestamp, eski/ISO kayıtlar string olabilir.
export type FirestoreDate = Timestamp | string;

// ==========================================
// KANONİK DEĞERLER (tek kaynak)
// Firestore'a YALNIZCA bu ASCII değerler yazılır.
// Başka yazım / eş anlamlı alan kabul edilmez.
// ==========================================
export const CLUB_ROLE = {
  MANAGER: "yonetici",
  MEMBER: "uye",
} as const;

export const MEMBERSHIP_STATUS = {
  PENDING: "beklemede",
  ACTIVE: "aktif",
  PASSIVE: "pasif",
  REJECTED: "reddedildi",
} as const;

export const EVENT_STATUS = {
  DRAFT: "taslak",
  PUBLISHED: "yayinlandi",
  COMPLETED: "tamamlandi",
  CANCELLED: "iptal",
} as const;

export const RSVP_STATUS = {
  ATTENDING: "katiliyor",
  NOT_ATTENDING: "katilmiyor",
  PENDING: "beklemede",
} as const;

export const TARGET_AUDIENCE = {
  ALL_MANAGERS: "tum_yoneticiler",
  ALL_MEMBERS: "tum_uyeler",
  ALL_ADMINS: "tum_adminler",
  CLUB_MEMBERS: "kulup_uyeleri",
  EVERYONE: "herkes",
} as const;

export const CLUB_STATUS = {
  ACTIVE: "aktif",
  PASSIVE: "pasif",
} as const;

export const JOIN_REQUEST_STATUS = {
  PENDING: "beklemede",
  APPROVED: "onaylandi",
  REJECTED: "reddedildi",
} as const;

export const INVITATION_STATUS = {
  PENDING: "beklemede",
  ACCEPTED: "kabul_edildi",
  CANCELLED: "iptal",
} as const;

export const ANNOUNCEMENT_SCOPE = {
  SYSTEM: "sistem",
  CLUB: "kulup",
} as const;

export type ClubRole = (typeof CLUB_ROLE)[keyof typeof CLUB_ROLE];
export type MembershipStatus = (typeof MEMBERSHIP_STATUS)[keyof typeof MEMBERSHIP_STATUS];
export type EventStatus = (typeof EVENT_STATUS)[keyof typeof EVENT_STATUS];
export type RSVPStatus = (typeof RSVP_STATUS)[keyof typeof RSVP_STATUS];
export type ClubStatus = (typeof CLUB_STATUS)[keyof typeof CLUB_STATUS];
export type JoinRequestStatus = (typeof JOIN_REQUEST_STATUS)[keyof typeof JOIN_REQUEST_STATUS];
export type InvitationStatus = (typeof INVITATION_STATUS)[keyof typeof INVITATION_STATUS];
export type AnnouncementScope = (typeof ANNOUNCEMENT_SCOPE)[keyof typeof ANNOUNCEMENT_SCOPE];
export type TargetAudience = (typeof TARGET_AUDIENCE)[keyof typeof TARGET_AUDIENCE];

export const isClubManagerRole = (role?: string | null): boolean => role === CLUB_ROLE.MANAGER;

// 1. Kullanıcı Modeli (Sistem geneli hesap)
export interface User {
  uid: string;
  ad: string;
  soyad: string;
  email: string;
  telefon?: string;
  student_no?: string;
  bolum?: string;
  avatarUrl?: string;
  is_admin: boolean; // Sistem admini bayrağı (tek kaynak)
  createdAt?: FirestoreDate;
}

// 2. Kulüp Modeli
export interface Club {
  id: string;
  ad: string;
  aciklama: string;
  olusturan_admin_id: string;
  durum: ClubStatus;
  createdAt: string;

  // Detay Sayfası ve UI geliştirmeleri için eklenen opsiyonel alanlar:
  gorselUrl?: string;
  detayliAciklama?: string;
}

// 3. Üyelik Modeli (Kullanıcı <-> Kulüp çoktan çoğa ilişki)
export interface Membership {
  id: string;
  user_id: string;
  club_id: string;
  role: ClubRole;
  status: MembershipStatus;
  katilim_tarihi: string;
}

// 4. Davet Modeli (Invitation)
export interface Invitation {
  id: string;
  email: string;
  club_id: string;
  role: ClubRole;
  token: string;
  son_gecerlilik_tarihi: string;
  durum: InvitationStatus;
}

// 5. Kulübe Katılma Başvurusu (JoinRequest)
export interface JoinRequest {
  id: string;
  user_id: string;
  club_id: string;
  mesaj?: string;
  durum: JoinRequestStatus;
  karar_tarihi?: string;
  karar_veren_id?: string;
}

// 6. Duyuru Modeli
export interface Announcement {
  id: string;
  yayinlayan_id: string;
  yayinlayan_ad: string;
  kapsam: AnnouncementScope;
  hedef_kitle: TargetAudience;
  club_id?: string | null;
  club_ad?: string | null;
  baslik: string;
  icerik: string;
  tarih: string;
}

// 7. Etkinlik Modeli
export interface Event {
  id: string;
  baslik: string;
  aciklama: string;
  konum: string;
  tarih: FirestoreDate;
  kontenjan?: number | null;
  gorselUrl?: string;
  hedef_kitle: TargetAudience;
  club_id?: string | null;
  club_ad?: string | null;
  olusturan_id: string;
  status: EventStatus;
  katilimcilar: string[];
  createdAt?: FirestoreDate;
}

// 7.1 Etkinlik Katılımcısı (başvuru listesi)
export interface EventApplication {
  user_id: string;
  ad_soyad: string;
  email: string;
}

// 8. Etkinlik Katılımı (RSVP)
export interface EventParticipation {
  id: string;
  event_id: string;
  user_id: string;
  rsvp_durumu: RSVPStatus;
  kayit_tarihi: string;
}

// 9. Dijital Kimlik (TOTP QR için)
export interface DigitalIdentity {
  id: string;
  user_id: string;
  secret_key: string;
  olusturulma_tarihi: string;
  durum: ClubStatus;
}

// 10. Yoklama Kaydı
export interface Attendance {
  id: string;
  event_id: string;
  user_id: string;
  alan_yonetici_id: string;
  zaman_damgasi: FirestoreDate;
}

// 11. Uygulama İçi Bildirim Kaydı (users yerine notifications koleksiyonu)
export const NOTIFICATION_TYPE = {
  SYSTEM: "sistem",
  ANNOUNCEMENT: "duyuru",
  EVENT: "etkinlik",
  APPLICATION: "basvuru",
  DECISION: "karar",
  INVITATION: "davet",
  ATTENDANCE: "yoklama",
} as const;

export type NotificationType = (typeof NOTIFICATION_TYPE)[keyof typeof NOTIFICATION_TYPE];

// Bildirime tıklandığında gidilecek üst seviye ekran.
export type NotificationTargetScreen = "announcements" | "events" | "clubs";

export interface NotificationExtra {
  tip?: NotificationType;
  club_id?: string | null;
  club_ad?: string | null;
  hedef_ekran?: NotificationTargetScreen | null;
  hedef_id?: string | null;
  data?: Record<string, unknown>;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  body: string;
  read: boolean;
  tip?: NotificationType | null;
  club_id?: string | null;
  club_ad?: string | null;
  hedef_ekran?: NotificationTargetScreen | null;
  hedef_id?: string | null;
  data?: Record<string, unknown>;
  createdAt?: FirestoreDate;
}
