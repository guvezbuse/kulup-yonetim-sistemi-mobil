import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { getErrorMessage } from "../lib/errors";
import { parseAttendanceQrValue } from "../lib/attendanceQr";
import { formatShortDateTime } from "../lib/eventDate";
import {
  attendanceService,
  AttendanceRecord,
  CheckInResult,
} from "../services/attendanceService";
import { useAuthStore } from "../store/authStore";

interface AttendanceScreenProps {
  eventId: string;
  eventTitle: string;
  onBack: () => void;
}

interface ScanFeedback {
  type: "success" | "warning" | "error";
  title: string;
  message: string;
  person?: string;
}

const FEEDBACK_STYLES = {
  success: {
    container: "bg-emerald-500/10 border-emerald-500/35",
    title: "text-emerald-400",
  },
  warning: {
    container: "bg-amber-500/10 border-amber-500/35",
    title: "text-amber-400",
  },
  error: {
    container: "bg-rose-500/10 border-rose-500/35",
    title: "text-rose-400",
  },
};

export default function AttendanceScreen({ eventId, eventTitle, onBack }: AttendanceScreenProps) {
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const isAdmin = profile?.is_admin === true;

  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [feedback, setFeedback] = useState<ScanFeedback | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const scanLockRef = useRef(false);

  const loadRecords = useCallback(async () => {
    if (!eventId) return;

    try {
      setRecords(await attendanceService.getEventAttendance(eventId));
    } catch (error) {
      console.log("Yoklama listesi hatası:", error);
    } finally {
      setLoadingRecords(false);
    }
  }, [eventId]);

  useEffect(() => {
    if (isAdmin) loadRecords();
  }, [isAdmin, loadRecords]);

  const handleBarcodeScanned = async (result: BarcodeScanningResult) => {
    if (!scanning || processing || scanLockRef.current || !user) return;
    scanLockRef.current = true;

    const scannedUserId = parseAttendanceQrValue(result.data);
    if (!scannedUserId) {
      setScanning(false);
      setFeedback({
        type: "error",
        title: "Geçersiz QR Kod",
        message: "Bu kod bir kulüp yoklama koduna ait değil.",
      });
      scanLockRef.current = false;
      return;
    }

    setProcessing(true);
    setScanning(false);

    try {
      const checkIn: CheckInResult = await attendanceService.checkIn(
        eventId,
        scannedUserId,
        user.uid,
      );

      setFeedback({
        type: checkIn.status === "basarili" ? "success" : "warning",
        title: checkIn.status === "basarili" ? "Yoklama Kaydedildi" : "Zaten Yoklamada",
        message:
          checkIn.status === "basarili"
            ? "Katılım kaydı başarıyla oluşturuldu."
            : "Bu kullanıcı bu etkinlik için daha önce yoklama vermiş.",
        person: checkIn.user_ad,
      });

      await loadRecords();
    } catch (error) {
      setFeedback({
        type: "error",
        title: "Yoklama Alınamadı",
        message: getErrorMessage(error, "Beklenmeyen bir hata oluştu."),
      });
    } finally {
      setProcessing(false);
      scanLockRef.current = false;
    }
  };

  const startNewScan = () => {
    scanLockRef.current = false;
    setFeedback(null);
    setProcessing(false);
    setScanning(true);
  };

  if (!isAdmin) {
    return (
      <View className="flex-1 bg-slate-900 p-4">
        <TouchableOpacity onPress={onBack} className="mb-6">
          <Text className="text-indigo-400 font-semibold">← Geri Dön</Text>
        </TouchableOpacity>
        <View className="flex-1 items-center justify-center">
          <Text className="text-4xl mb-3">🔒</Text>
          <Text className="text-white font-bold text-lg">Yetkisiz Erişim</Text>
          <Text className="text-slate-400 text-xs text-center mt-1">
            Yoklama almak yalnızca sistem yöneticilerine açıktır.
          </Text>
        </View>
      </View>
    );
  }

  if (!eventId) {
    return (
      <View className="flex-1 bg-slate-900 p-4">
        <TouchableOpacity onPress={onBack} className="mb-6">
          <Text className="text-indigo-400 font-semibold">← Geri Dön</Text>
        </TouchableOpacity>
        <View className="flex-1 items-center justify-center">
          <Text className="text-4xl mb-3">⚠️</Text>
          <Text className="text-white font-bold text-lg">Etkinlik Bulunamadı</Text>
          <Text className="text-slate-400 text-xs text-center mt-1">
            Yoklama almak için etkinlikler ekranından bir etkinlik seçin.
          </Text>
        </View>
      </View>
    );
  }

  if (!permission) {
    return (
      <View className="flex-1 bg-slate-900 items-center justify-center">
        <ActivityIndicator size="large" color="#6366f1" />
        <Text className="text-slate-400 text-xs mt-3">Kamera hazırlanıyor...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 bg-slate-900 p-4">
        <TouchableOpacity onPress={onBack} className="mb-6">
          <Text className="text-indigo-400 font-semibold">← Geri Dön</Text>
        </TouchableOpacity>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-4xl mb-3">📷</Text>
          <Text className="text-white font-bold text-lg text-center">Kamera İzni Gerekli</Text>
          <Text className="text-slate-400 text-xs text-center mt-2 leading-5">
            Üyelerin QR kodlarını okutabilmek için kamera erişimine izin vermeniz gerekiyor.
          </Text>
          <TouchableOpacity
            onPress={requestPermission}
            className="bg-indigo-600 px-6 py-3 rounded-xl mt-5"
          >
            <Text className="text-white font-bold text-sm">Kamera İzni Ver</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const feedbackStyle = feedback ? FEEDBACK_STYLES[feedback.type] : null;

  return (
    <ScrollView
      className="flex-1 bg-slate-900"
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="flex-row items-center justify-between mb-4">
        <TouchableOpacity onPress={onBack}>
          <Text className="text-indigo-400 font-semibold">← Geri Dön</Text>
        </TouchableOpacity>
        <View className="bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 rounded-full">
          <Text className="text-emerald-400 text-[11px] font-bold">{records.length} katılım</Text>
        </View>
      </View>

      <Text className="text-2xl font-bold text-white">Yoklama Al</Text>
      <Text className="text-slate-400 text-xs mt-1 mb-4" numberOfLines={2}>
        {eventTitle}
      </Text>

      <View className="rounded-2xl overflow-hidden border border-slate-700 bg-black mb-4">
        <View style={{ height: 330 }}>
          {scanning ? (
            <CameraView
              style={{ flex: 1 }}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={processing ? undefined : handleBarcodeScanned}
            />
          ) : (
            <View className="flex-1 items-center justify-center bg-slate-950 px-6">
              <Text className="text-5xl mb-3">{processing ? "⏳" : "✅"}</Text>
              <Text className="text-slate-300 text-sm font-semibold">
                {processing ? "Yoklama kaydediliyor..." : "Tarama tamamlandı"}
              </Text>
              {processing && <ActivityIndicator color="#34d399" className="mt-4" />}
            </View>
          )}

          {scanning && (
            <>
              <View className="absolute top-14 left-10 right-10 bottom-14 border-2 border-emerald-400/80 rounded-2xl" />
              <View className="absolute bottom-4 left-0 right-0 items-center">
                <Text className="text-white text-xs font-semibold bg-slate-950/80 px-3 py-1.5 rounded-full">
                  QR kodu çerçeveye hizalayın
                </Text>
              </View>
            </>
          )}
        </View>
      </View>

      {feedback && feedbackStyle && (
        <View className={`border rounded-2xl p-4 mb-4 ${feedbackStyle.container}`}>
          <Text className={`font-bold text-sm ${feedbackStyle.title}`}>{feedback.title}</Text>
          {feedback.person && (
            <Text className="text-white text-base font-semibold mt-1">{feedback.person}</Text>
          )}
          <Text className="text-slate-300 text-xs mt-1 leading-4">{feedback.message}</Text>

          <TouchableOpacity
            onPress={startNewScan}
            className="bg-slate-800 border border-slate-600 py-2.5 rounded-xl items-center mt-3"
          >
            <Text className="text-slate-100 text-xs font-bold">Yeni QR Tara</Text>
          </TouchableOpacity>
        </View>
      )}

      <View className="bg-slate-800/70 border border-slate-700 rounded-2xl p-4">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-white font-bold text-sm">Son Yoklamalar</Text>
          <TouchableOpacity onPress={loadRecords}>
            <Text className="text-indigo-400 text-[11px] font-semibold">Yenile</Text>
          </TouchableOpacity>
        </View>

        {loadingRecords ? (
          <ActivityIndicator color="#6366f1" className="my-4" />
        ) : records.length === 0 ? (
          <Text className="text-slate-500 text-xs text-center py-4">
            Henüz yoklama kaydı yok.
          </Text>
        ) : (
          records.slice(0, 12).map((record) => (
            <View
              key={record.id}
              className="flex-row items-center justify-between py-2.5 border-b border-slate-700/50 last:border-b-0"
            >
              <View className="flex-1 mr-2">
                <Text className="text-slate-200 text-xs font-semibold" numberOfLines={1}>
                  {record.user_ad}
                </Text>
                <Text className="text-slate-500 text-[10px]" numberOfLines={1}>
                  {record.user_email}
                </Text>
              </View>
              <Text className="text-slate-500 text-[10px]">
                {formatShortDateTime(record.zaman_damgasi)}
              </Text>
            </View>
          ))
        )}
      </View>

      <TouchableOpacity
        onPress={() =>
          Alert.alert(
            "Yoklama Bilgisi",
            "Aynı üye aynı etkinlik için yalnızca bir kez yoklama verebilir. QR kod okutulduğunda katılım otomatik olarak kaydedilir.",
          )
        }
        className="items-center py-3 mt-2"
      >
        <Text className="text-slate-500 text-[11px]">ℹ️ Yoklama nasıl çalışır?</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
