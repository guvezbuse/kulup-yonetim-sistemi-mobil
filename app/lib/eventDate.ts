import { FirestoreDate } from "../types";

export const toDate = (value?: FirestoreDate | null): Date | null => {
  if (!value) return null;

  if (typeof value === "string") {
    const date = new Date(value.replace(" ", "T"));
    return isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === "object" && typeof value.seconds === "number") {
    const date = new Date(value.seconds * 1000);
    return isNaN(date.getTime()) ? null : date;
  }

  return null;
};

export const toMillis = (value?: FirestoreDate | null): number => toDate(value)?.getTime() ?? 0;

export const formatEventDate = (value?: FirestoreDate | null): string => {
  const date = toDate(value);
  if (!date) return "Tarih belirtilmedi";

  return date.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatShortDateTime = (value?: FirestoreDate | null): string => {
  const date = toDate(value);
  if (!date) return "";

  const pad = (num: number) => num.toString().padStart(2, "0");
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
};
