import { messaging } from "./firebase";
import { getToken, onMessage } from "firebase/messaging";

/**
 * Henter/forcerer notifikations-tilladelse og returnerer evt. FCM token.
 */
export async function getTokenPermission(force = false) {
  if (!messaging) return { permission: "unsupported", token: null };

  const current = Notification.permission;
  if (current === "granted" || force) {
    try {
      // Sørg for at SW er registreret på roden (krav for FCM + PWA)
      const swReg = await navigator.serviceWorker.register(
        "/firebase-messaging-sw.js"
      );
      const token = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FB_VAPID_KEY,
        serviceWorkerRegistration: swReg,
      });
      return { permission: "granted", token };
    } catch (e) {
      console.error("getTokenPermission error", e);
      return { permission: "error", token: null };
    }
  }
  const req = await Notification.requestPermission();
  return { permission: req, token: null };
}

/**
 * Foreground listener – brug hvis du vil fange beskeder mens appen er i fokus.
 */
export function listenForeground(handler) {
  if (!messaging) return () => {};
  return onMessage(messaging, handler);
}

/**
 * Lokal test – beder service worker vise en notifikation uden at bruge FCM.
 * Perfekt til at teste iPhone PWA rendering.
 */
export async function localTestNotification({
  title = "VPP — Test notification",
  body = "If you can see this, notifications render on this device.",
  url = "/",
} = {}) {
  const reg = await navigator.serviceWorker.ready;
  reg.active?.postMessage({ type: "LOCAL_TEST", title, body, url });
}

/**
 * Subscribe til et emne (topic). Kræver et backend-endpoint (Cloud Function/Express)
 * som tilgår FCM Admin SDK og abonnerer `token` på `topic`.
 *
 * - Sæt evt. VITE_SUBSCRIBE_ENDPOINT i .env (fx https://your-cloud-function/subscribe)
 * - Hvis variablen ikke er sat, laver vi en no-op og returnerer true (for at undgå fejl i UI).
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
        "VITE_SUBSCRIBE_ENDPOINT not set; skipping network call. Pretending success."
      );
      return true;
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, token }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Subscribe failed: ${res.status} ${text}`);
    }

    return true;
  } catch (e) {
    console.error("subscribeToTopic error", e);
    return false;
  }
}
