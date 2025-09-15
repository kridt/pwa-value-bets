// src/lib/notifications.js
import {
  getMessaging,
  getToken,
  isSupported,
  deleteToken,
} from "firebase/messaging";
import { app, db } from "../lib/firebase";
import { doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";

const VAPID = import.meta.env.VITE_FB_VAPID_KEY;

async function readySW() {
  if (!("serviceWorker" in navigator)) throw new Error("SW not supported");
  return await navigator.serviceWorker.ready;
}

export async function getTokenPermission(forcePrompt = false, user) {
  const supported = await isSupported().catch(() => false);
  if (!supported) return { permission: "unsupported", token: null };

  // iOS PWA kræver A2HS
  const isStandalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.navigator.standalone;
  if (!isStandalone) console.warn("[Push] Not standalone (iOS needs A2HS)");

  if (Notification.permission === "default" && !forcePrompt) {
    return { permission: "default", token: null };
  }
  if (Notification.permission !== "granted" && forcePrompt) {
    await Notification.requestPermission();
  }
  const messaging = getMessaging(app);
  const swReg = await readySW();

  const token = await getToken(messaging, {
    vapidKey: VAPID,
    serviceWorkerRegistration: swReg,
  }).catch((e) => {
    console.error("[Push] getToken error", e);
    return null;
  });

  if (token && user?.uid) {
    await setDoc(
      doc(db, `users/${user.uid}/tokens/${token}`),
      {
        createdAt: serverTimestamp(),
        platform: navigator.userAgent,
      },
      { merge: true }
    );
  }

  return { permission: Notification.permission, token };
}

export async function resetPushOnThisDevice(user) {
  const supported = await isSupported().catch(() => false);
  if (!supported) throw new Error("Push not supported");

  const messaging = getMessaging(app);
  const swReg = await readySW();

  // Find nuværende token (hvis nogen)
  let current = null;
  try {
    current = await getToken(messaging, {
      vapidKey: VAPID,
      serviceWorkerRegistration: swReg,
    });
  } catch {}

  // Slet i Firestore først
  if (current && user?.uid) {
    try {
      await deleteDoc(doc(db, `users/${user.uid}/tokens/${current}`));
    } catch {}
  }

  // Slet fra FCM
  try {
    await deleteToken(messaging);
  } catch (e) {
    console.warn("[Push] deleteToken error", e);
  }

  // Re-registrer
  return await getTokenPermission(true, user);
}

export async function localTestNotification({
  title = "VPP — Test",
  body = "Hvis du ser denne, virker SW/permissions.",
  url = "/",
} = {}) {
  const reg = await readySW();
  reg.active?.postMessage({ type: "LOCAL_TEST", title, body, url });
}

export async function subscribeToTopic(topic, token) {
  try {
    const res = await fetch("/api/topic-subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, token }),
    });
    const j = await res.json().catch(() => ({}));
    return !!j.ok;
  } catch {
    return false;
  }
}
