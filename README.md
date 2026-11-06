# Kulüp Yönetim Sistemi (Mobil)

Üniversite ve topluluk kulüplerinin üyelik, etkinlik, duyuru ve QR tabanlı yoklama
süreçlerini tek bir mobil çatı altında yönetmesini sağlayan çapraz platform mobil uygulama.

> Bu depodaki gerçek uygulama **`app/`** klasöründedir. Kök dizinde ikinci bir
> `package.json`, `app.json`, `eas.json` veya `tsconfig.json` yoktur. Tüm komutlar
> `app/` içinden çalıştırılır.

---

## 🛠️ Teknoloji

- **Framework:** Expo SDK 58 / React Native 0.88
- **Programlama Dili:** TypeScript
- **Stil & Arayüz:** NativeWind 4 (Tailwind CSS 3.4)
- **Durum Yönetimi:** Zustand
- **Backend:** Firebase Authentication + Cloud Firestore + Firebase Storage
- **Bildirim:** Expo Notifications (push + uygulama içi bildirim geçmişi)
- **Kod Standartları:** ESLint 9 (flat config) & Prettier

---

## 📁 Klasör Yapısı

```text
app/
├── components/          # Yeniden kullanılabilir arayüz bileşenleri (Button, Input, Card)
├── lib/                 # firebase.ts, errors.ts ve ortak yardımcılar
├── screens/             # Ekranlar (auth, kulüpler, etkinlikler, duyurular, yönetim)
├── services/            # Firestore/Auth servis katmanı
├── store/               # Zustand global durum mağazaları
├── types/               # Kanonik tipler ve ASCII sabitler
├── App.tsx              # Uygulama ana giriş noktası ve route tablosu
├── index.ts             # registerRootComponent girişi
├── global.css           # Tailwind temel direktifleri
├── metro.config.js      # NativeWind CSS dönüştürücü ayarları
├── tailwind.config.js   # Tailwind içerik ve tema ayarları
├── app.json             # Expo uygulama yapılandırması
├── eas.json             # EAS build profilleri
├── eslint.config.js     # ESLint 9 flat config
└── .prettierrc          # Kod biçimlendirme kuralları
```

---

## 🚀 Kurulum

```bash
cd app
npm install
```

Firebase anahtarlarını tanımla:

```bash
cp .env.example .env
# .env içindeki EXPO_PUBLIC_FIREBASE_* değerlerini doldur
```

Geliştirme sunucusunu başlat:

```bash
cd app
npx expo start
```

---

## ✅ Kod Kalitesi Komutları

```bash
cd app
npx tsc --noEmit      # tip kontrolü
npx expo lint         # ESLint + Prettier
npx expo-doctor       # bağımlılık ve yapılandırma kontrolü
npx expo install --fix
```

---

## 📦 Build & Yayın (EAS)

EAS komutları da `app/` içinden çalıştırılır:

```bash
cd app
npx eas-cli@latest build --profile development   # development client
npx eas-cli@latest build --profile preview       # APK
npx eas-cli@latest build --profile production
```

> `expo-notifications` ve `expo-dev-client` yerel modül içerdiği için push
> bildirimleri ve development client yalnızca development build ile test edilmelidir.
> Expo Go bu modülleri sınırlı destekler.

---

## 🔐 Ortam Değişkenleri

`app/.env` (git'e eklenmez):

```text
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=
```

EAS build profilleri aynı değerleri `app/eas.json` içindeki `env` bloğundan alır.
