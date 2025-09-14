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

// Vis baggrunds-notifikationer (FCM)
messaging.onBackgroundMessage((payload) => {
  const { title, body, icon, url } = payload?.data || {};
  self.registration.showNotification(title || "VPP — New EV Bet", {
    body: body || "Tap to view",
    icon: icon || "/icons/icon-192.png",
    data: { url: url || "/" },
  });
});

// Lokal test fra appen (ikke-fcm): postMessage -> notifikation
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
