# Kulüp Yönetim Sistemi (Mobil)

Üniversite ve topluluk kulüplerinin üyelik, etkinlik, duyuru ve dinamik QR tabanlı yoklama süreçlerini tek bir mobil çatı altında yönetmesini sağlayan çapraz platform mobil uygulama.

---

## 🛠️ Teknoloji

* **Çatı (Framework):** React Native (Expo SDK 57)
* **Programlama Dili:** TypeScript
* **Stil & Arayüz:** NativeWind (Tailwind CSS v4)
* **Kod Standartları:** ESLint & Prettier
* **Durum Yönetimi (State):** Zustand *(Planlanan)*
* **Test Ortamı:** Expo Go (Fiziksel Mobil Cihaz)

---

## 📁 Mimari Klasör Yapısı

```text
app/
├── components/          # Yeniden kullanılabilir arayüz bileşenleri (Button, Input, Card)
├── types/               # TypeScript tip ve arayüz tanımları (User, Club, Event vb.)
├── constants/           # Sabitler, renk paletleri ve tema değişkenleri
├── store/               # Zustand global durum yönetimi mağazaları
├── lib/                 # Harici servisler, API istemcisi ve Firebase konfigürasyonu
├── global.css           # Tailwind temel direktifleri ve global stiller
├── metro.config.js      # NativeWind CSS dönüştürücü ayarları
├── tailwind.config.js   # Tailwind içerik ve tema ayarları
├── .prettierrc          # Kod biçimlendirme kuralları
└── App.tsx              # Uygulama ana giriş noktası
