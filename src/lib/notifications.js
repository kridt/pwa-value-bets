// src/lib/notifications.js
// Håndterer web push (FCM) i PWA'en: henter tilladelse + token, gemmer token,
// lytter på foreground beskeder, og kan sende en lokal test-notifikation via SW.

import { auth, db, messaging } from "./firebase";
import { getToken, onMessage } from "firebase/messaging";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

/** Gem FCM-token under users/{uid}/tokens/{token} (doc-id = token) */
async function saveFcmToken(uid, token) {
  if (!uid || !token) return;
  const ref = doc(db, `users/${uid}/tokens/${token}`);
  await setDoc(
    ref,
    {
      token,
      updatedAt: serverTimestamp(),
      ua: navigator.userAgent,
    },
    { merge: true }
  );
}

/** Anmod om notifikations-tilladelse og hent FCM token (gemmes automatisk i Firestore). */
export async function getTokenPermission(force = false) {
  if (!messaging) return { permission: "unsupported", token: null };

  const current = Notification.permission;
  if (current === "granted" || force) {
    try {
      // Krav: SW registreret i roden, så FCM kan virke i PWA
      const swReg = await navigator.serviceWorker.register(
        "/firebase-messaging-sw.js"
      );
      const token = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FB_VAPID_KEY,
        serviceWorkerRegistration: swReg,
      });
      const uid = auth.currentUser?.uid;
      if (uid && token) await saveFcmToken(uid, token);
      return { permission: "granted", token };
    } catch (e) {
      console.error("getTokenPermission error", e);
      return { permission: "error", token: null };
    }
  }

  // Første gang → spørg brugeren
  const req = await Notification.requestPermission();
  return { permission: req, token: null };
}

/** Lyt til foreground-beskeder (mens appen er i fokus) */
export function listenForeground(handler) {
  if (!messaging) return () => {};
  return onMessage(messaging, handler);
}

/** Lokal test – beder service worker vise en notifikation uden FCM (god til iOS PWA test) */
export async function localTestNotification({
  title = "VPP — Test notification",
  body = "If you can see this, notifications render on this device.",
  url = "/",
} = {}) {
  const reg = await navigator.serviceWorker.ready;
  reg.active?.postMessage({ type: "LOCAL_TEST", title, body, url });
}

/**
 * (Valgfrit) Subscribe til et topic via et backend-endpoint.
 * Sæt VITE_SUBSCRIBE_ENDPOINT i .env til din Cloud Function/Express route.
 * Hvis endpoint ikke er sat, gør vi no-op men returnerer true (så UI ikke fejler).
 */
export async function subscribeToTopic(topic, tokenFromCaller) {
  try {
    if (!topic) throw new Error("Missing topic name");

    let token = tokenFromCaller;
    if (!token) {
      const { token: t } = await getTokenPermission(true);
      token = t;
    }
    if (!token) throw new Error("No FCM token available");

    const endpoint = import.meta.env.VITE_SUBSCRIBE_ENDPOINT;
    if (!endpoint) {
      console.warn(
        "VITE_SUBSCRIBE_ENDPOINT not set; skipping subscribe (pretending success)."
      );
      return true;
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, token }),
    });
    if (!res.ok) throw new Error(`Subscribe failed: ${res.status}`);
    return true;
  } catch (e) {
    console.error("subscribeToTopic error", e);
    return false;
  }
}
