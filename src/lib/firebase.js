import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyD_iLOnIAEQCpk5f2Dj6bBJFZtThkKEYZA",
  authDomain: "ev-betting-cc2d2.firebaseapp.com",
  projectId: "ev-betting-cc2d2",
  storageBucket: "ev-betting-cc2d2.firebasestorage.app",
  messagingSenderId: "578748147105",
  appId: "1:578748147105:web:07b4e6a63a25269f6497e0",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const messaging = await (async () =>
  (await isSupported()) ? getMessaging(app) : null)();
