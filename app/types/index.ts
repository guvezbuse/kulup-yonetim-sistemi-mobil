// Sistem ve Kulüp Rolleri
export type SystemRole = 'admin' | 'user';
export type ClubRole = 'yönetici' | 'üye';
export type MembershipStatus = 'beklemede' | 'aktif' | 'pasif' | 'reddedildi';
export type EventStatus = 'taslak' | 'yayınlanan' | 'tamamlanan' | 'iptal';
export type RSVPStatus = 'katılıyor' | 'katılmıyor' | 'beklemede';
export type AnnouncementScope = 'sistem' | 'kulüp';
export type TargetAudience = 'Tüm Yöneticiler' | 'Tüm Üyeler';

// 1. Kullanıcı Modeli (Sistem geneli hesap)
export interface User {
  id: string;
  ad: string;
  soyad: string;
  email: string;
  telefon?: string;
  is_admin: boolean; // Sistem admini bayrağı (kulüpten bağımsız)
  createdAt: string;
}

// 2. Kulüp Modeli
export interface Club {
  id: string;
  ad: string;
  aciklama: string;
  olusturan_admin_id: string;
  durum: 'aktif' | 'pasif';
  createdAt: string;
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
  durum: 'beklemede' | 'kabul_edildi' | 'iptal';
}

// 5. Kulübe Katılma Başvurusu (JoinRequest)
export interface JoinRequest {
  id: string;
  user_id: string;
  club_id: string;
  mesaj?: string;
  durum: 'beklemede' | 'onaylandi' | 'reddedildi';
  karar_tarihi?: string;
  karar_veren_id?: string;
}

// 6. Duyuru Modeli
export interface Announcement {
  id: string;
  yayinlayan_id: string;
  kapsam: AnnouncementScope;
  hedef_kitle?: TargetAudience;
  club_id?: string; // Sistem duyurularında boştur
  baslik: string;
  icerik: string;
  yayin_tarihi: string;
}

// 7. Etkinlik Modeli
export interface Event {
  id: string;
  club_id: string;
  olusturan_id: string;
  baslik: string;
  aciklama: string;
  tarih: string;
  konum: string;
  kontenjan?: number; // Boş bırakılırsa sınırsız
  durum: EventStatus;
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
  durum: 'aktif' | 'pasif';
}

// 10. Yoklama Kaydı
export interface Attendance {
  id: string;
  event_id: string;
  user_id: string;
  alan_yonetici_id: string;
  zaman_damgasi: string;
}