import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAGcG79ixfoDZx9Hn_27wWIUs9q4Vx59sI",
  authDomain: "kulup-yonetim-sistemi-mobil.firebaseapp.com",
  projectId: "kulup-yonetim-sistemi-mobil",
  storageBucket: "kulup-yonetim-sistemi-mobil.firebasestorage.app",
  messagingSenderId: "709129123789",
  appId: "1:709129123789:web:d792de494e8be99bba7684",
  measurementId: "G-2G26N0JYBM",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
