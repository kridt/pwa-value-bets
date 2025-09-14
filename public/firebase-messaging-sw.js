/* global self */
importScripts(
  "https://www.gstatic.com/firebasejs/10.12.4/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.12.4/firebase-messaging-compat.js"
);

firebase.initializeApp({
  apiKey: "AIzaSyD_iLOnIAEQCpk5f2Dj6bBJFZtThkKEYZA",
  authDomain: "ev-betting-cc2d2.firebaseapp.com",
  projectId: "ev-betting-cc2d2",
  storageBucket: "ev-betting-cc2d2.firebasestorage.app",
  messagingSenderId: "578748147105",
  appId: "1:578748147105:web:07b4e6a63a25269f6497e0",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const data = payload?.data || {};
  const title = data.title || "Value Profits Protocol";
  const body = data.body || "New EV bet";
  const icon = data.icon || "/icons/icon-192.png";
  const url = data.url || "/";
  self.registration.showNotification(title, { body, icon, data: { url } });
});

self.addEventListener("push", (event) => {
  try {
    const data = event.data?.json?.() || {};
    const n = data?.notification || data;
    const title = n.title || data.title || "Value Profits Protocol";
    const body = n.body || data.body || "New EV bet";
    const icon = n.icon || data.icon || "/icons/icon-192.png";
    const url = (data?.data && data.data.url) || data.url || "/";
    event.waitUntil(
      self.registration.showNotification(title, { body, icon, data: { url } })
    );
  } catch {
    const txt = event.data?.text?.() || "New EV bet";
    event.waitUntil(
      self.registration.showNotification("Value Profits Protocol", {
        body: txt,
        icon: "/icons/icon-192.png",
        data: { url: "/" },
      })
    );
  }
});

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "LOCAL_TEST") {
    self.registration.showNotification(
      data.title || "VPP — Test notification",
      {
        body:
          data.body ||
          "If you can see this, notifications render on this device.",
        icon: "/icons/icon-192.png",
        data: { url: data.url || "/" },
      }
    );
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification?.data?.url || "/";
  event.waitUntil(clients.openWindow(url));
});
