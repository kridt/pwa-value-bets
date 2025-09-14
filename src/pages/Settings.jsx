// src/pages/Settings.jsx
import { useEffect, useState } from "react";
import {
  getTokenPermission,
  localTestNotification,
  subscribeToTopic,
} from "../lib/notifications";
import { useAuthContext } from "../contexts/AuthContext";

export default function Settings() {
  const { user, signOut } = useAuthContext();
  const [perm, setPerm] = useState("prompt");
  const [token, setToken] = useState(null);
  const [busy, setBusy] = useState(false);

  // Hent status/token hvis allerede givet tilladelse
  useEffect(() => {
    (async () => {
      const { permission, token } = await getTokenPermission();
      setPerm(permission);
      setToken(token);
    })();
  }, []);

  return (
    <div className="space-y-4">
      <div className="glass glow-border p-4">
        <h2 className="text-lg font-semibold">Notifications</h2>
        <p className="text-sm text-mute mt-1">
          Aktivér push for at få nye EV-bets med det samme.
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            className="btn-primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              const { permission, token } = await getTokenPermission(true);
              setPerm(permission);
              setToken(token);
              setBusy(false);
              if (permission !== "granted")
                alert("Tilladelse blev ikke givet.");
            }}
          >
            Enable Push
          </button>

          <button
            className="btn-primary"
            onClick={async () => {
              await localTestNotification({
                title: "VPP — Test",
                body: "Hvis du ser denne, kan din enhed vise notifikationer.",
                url: "/",
              });
              alert("Test notification sendt (via service worker).");
            }}
          >
            Send Test Notification
          </button>

          <button
            className="btn-primary"
            onClick={async () => {
              if (!token)
                return alert("Ingen token endnu – tryk først på Enable Push.");
              await navigator.clipboard.writeText(token);
              alert("FCM token kopieret til udklipsholder.");
            }}
          >
            Copy FCM Token
          </button>

          <button
            className="btn-primary"
            onClick={async () => {
              if (!token) return alert("Ingen token endnu.");
              const ok = await subscribeToTopic("bets", token);
              alert(
                ok
                  ? 'Subscribed til "bets" topic (eller no-op hvis endpoint mangler).'
                  : "Subscription fejlede."
              );
            }}
          >
            Subscribe "bets"
          </button>
        </div>

        <p className="text-xs text-mute mt-2 break-all">
          Permission: {perm} {token && `• ${token.substring(0, 12)}…`}
        </p>
      </div>

      <div className="glass glow-border p-4">
        <h2 className="text-lg font-semibold">Account</h2>
        <p className="text-sm text-mute mt-1">
          Du er logget ind som: {user?.email}
        </p>
        <div className="mt-3">
          <button className="btn-primary" onClick={signOut}>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
