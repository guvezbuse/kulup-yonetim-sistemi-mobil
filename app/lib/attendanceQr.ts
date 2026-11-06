// Üye QR kodları yalnızca yoklama ekranı tarafından okunur.
// Prefix, rastgele bir QR kodunun kullanıcı kimliği gibi yorumlanmasını engeller.
export const ATTENDANCE_QR_PREFIX = "KULUP_YOKLAMA:";

export const buildAttendanceQrValue = (uid: string): string => `${ATTENDANCE_QR_PREFIX}${uid}`;

export const parseAttendanceQrValue = (value: string): string | null => {
  const normalized = value.trim();
  if (!normalized.startsWith(ATTENDANCE_QR_PREFIX)) return null;

  const uid = normalized.slice(ATTENDANCE_QR_PREFIX.length).trim();
  return uid.length > 0 ? uid : null;
};
