import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { auth, storage } from "../lib/firebase";

const AVATAR_WIDTH = 512;
const AVATAR_QUALITY = 0.65;
const UPLOAD_TIMEOUT_MS = 45_000;

const BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

type CodedError = Error & { code?: string };

const storageError = (code: string, message: string): CodedError => {
  const error = new Error(message) as CodedError;
  error.code = code;
  return error;
};

// React Native'de `atob` her ortamda bulunmadığı için base64'ü kendimiz çözüyoruz.
const base64ToBytes = (input: string): Uint8Array => {
  const clean = input.replace(/=+$/, "").replace(/[^A-Za-z0-9+/]/g, "");
  const bytes = new Uint8Array(Math.floor((clean.length * 6) / 8));

  let byteIndex = 0;
  let buffer = 0;
  let bitCount = 0;

  for (let i = 0; i < clean.length; i += 1) {
    const value = BASE64_CHARS.indexOf(clean[i]);
    if (value === -1) continue;

    buffer = ((buffer << 6) | value) & 0xffffff;
    bitCount += 6;

    if (bitCount >= 8) {
      bitCount -= 8;
      bytes[byteIndex] = (buffer >> bitCount) & 0xff;
      byteIndex += 1;
    }
  }

  return bytes.length === byteIndex ? bytes : bytes.slice(0, byteIndex);
};

const renderAvatar = async (uri: string) => {
  const context = ImageManipulator.manipulate(uri, { maxWidth: AVATAR_WIDTH });
  context.resize({ width: AVATAR_WIDTH, height: null });
  const image = await context.renderAsync();

  return image.saveAsync({
    base64: true,
    compress: AVATAR_QUALITY,
    format: SaveFormat.JPEG,
  });
};

const parseStorageError = (status: number, body: string): CodedError => {
  if (status === 401 || status === 403) {
    return storageError(
      "storage/unauthorized",
      "Firebase Storage yazma izni reddedildi. Storage kurallarını kontrol edin.",
    );
  }

  if (status === 404) {
    return storageError(
      "storage/bucket-not-found",
      "Storage bucket bulunamadı. Firebase yapılandırmasını kontrol edin.",
    );
  }

  let apiMessage = "";
  try {
    apiMessage = (JSON.parse(body) as { error?: { message?: string } }).error?.message || "";
  } catch {
    // Gövde JSON değilse varsayılan mesaja düşeriz.
  }

  return storageError(
    "storage/unknown",
    apiMessage || `Profil fotoğrafı yüklenemedi (HTTP ${status}).`,
  );
};

// Firebase JS SDK'nın uploadBytes/uploadString yolu React Native'de multipart
// gövde için Blob üretmeye çalışır ve "Creating blobs from 'ArrayBuffer'..."
// hatası verir. Bu yüzden dosyayı Storage REST API'sine doğrudan gönderiyoruz.
const uploadAvatarRequest = async (uid: string, uri: string): Promise<string> => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw storageError("auth/oturum-yok", "Oturum bulunamadı. Lütfen tekrar giriş yapın.");
  }

  const bucket = storage.app.options.storageBucket;
  if (!bucket) {
    throw storageError("storage/bucket-yok", "Storage bucket tanımlı değil.");
  }

  const image = await renderAvatar(uri);
  if (!image.base64) {
    throw storageError("storage/gorsel-islenemedi", "Profil fotoğrafı işlenemedi.");
  }

  const idToken = await currentUser.getIdToken();
  const filePath = `avatars/${uid}/profil-${Date.now()}.jpg`;
  const bytes = base64ToBytes(image.base64);

  const uploadUrl =
    `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket)}/o` +
    `?uploadType=media&name=${encodeURIComponent(filePath)}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "image/jpeg",
      },
      body: bytes.buffer as ArrayBuffer,
      signal: controller.signal,
    });
  } catch (error) {
    if ((error as { name?: string }).name === "AbortError") {
      throw storageError(
        "storage/retry-limit-exceeded",
        "Yükleme zaman aşımına uğradı. İnternet bağlantınızı kontrol edip tekrar deneyin.",
      );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  const body = await response.text();

  if (!response.ok) {
    throw parseStorageError(response.status, body);
  }

  let downloadTokens = "";
  try {
    downloadTokens = (JSON.parse(body) as { downloadTokens?: string }).downloadTokens || "";
  } catch {
    // Token okunamazsa aşağıda hata fırlatılır.
  }

  if (!downloadTokens) {
    throw storageError("storage/token-yok", "Yüklenen fotoğrafın indirme adresi alınamadı.");
  }

  const token = downloadTokens.split(",")[0];

  return (
    `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket)}/o/` +
    `${encodeURIComponent(filePath)}?alt=media&token=${token}`
  );
};

// Profil fotoğrafı Firebase Storage'a yüklenir. Firestore'da yalnızca
// indirme URL'si saklanır; görsel verisinin kendisi veritabanına yazılmaz.
export const avatarService = {
  uploadAvatar: async (uid: string, uri: string): Promise<string> => {
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(
        () =>
          reject(
            storageError(
              "storage/retry-limit-exceeded",
              "Yükleme zaman aşımına uğradı. Lütfen tekrar deneyin.",
            ),
          ),
        UPLOAD_TIMEOUT_MS + 5_000,
      );
    });

    try {
      return await Promise.race([uploadAvatarRequest(uid, uri), timeoutPromise]);
    } finally {
      if (timeoutHandle) clearTimeout(timeoutHandle);
    }
  },
};
