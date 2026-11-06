import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { getDownloadURL, ref, uploadString } from "firebase/storage";
import { storage } from "../lib/firebase";

const AVATAR_WIDTH = 512;
const AVATAR_QUALITY = 0.65;

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

// Profil fotoğrafı Firebase Storage'a yüklenir. Firestore'da yalnızca
// indirme URL'si saklanır; görsel verisinin kendisi veritabanına yazılmaz.
export const avatarService = {
  uploadAvatar: async (uid: string, uri: string): Promise<string> => {
    const image = await renderAvatar(uri);

    if (!image.base64) {
      throw new Error("Profil fotoğrafı işlenemedi.");
    }

    const filePath = `avatars/${uid}/profil-${Date.now()}.jpg`;
    const avatarRef = ref(storage, filePath);

    await uploadString(avatarRef, image.base64, "base64", {
      contentType: "image/jpeg",
      cacheControl: "public,max-age=31536000",
    });

    return getDownloadURL(avatarRef);
  },
};
