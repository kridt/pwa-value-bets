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

  useEffect(() => {
    (async () => {
      const { permission, token } = await getTokenPermission();
      setPerm(permission);
      setToken(token);
      console.log("[FCM] permission=", permission, " token=", token);
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
              console.log(
                "[FCM] after enable → permission=",
                permission,
                " token=",
                token
              );
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
                body: "Hvis du ser denne, fungerer SW/permissions.",
                url: "/",
              });
              alert("Lokal test sendt (via service worker).");
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
              if (!token)
                return alert("Ingen token endnu – tryk først på Enable Push.");
              try {
                const res = await fetch("/api/ping", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    token,
                    title: "VPP — Ping",
                    body: "Direkte ping til din enhed",
                    url: "/",
                  }),
                });
                let json = {};
                try {
                  json = await res.json();
                } catch {
                  json = {};
                } // ← robust parse
                console.log("[PING][client] status", res.status, json);

                if (!res.ok || json.ok === false) {
                  return alert(
                    "Ping fejl: " + (json.error || `HTTP ${res.status}`)
                  );
                }

                alert(
                  "Ping sendt! (messageId: " + (json.messageId || "—") + ")"
                );
              } catch (e) {
                console.error("[PING][client] exception", e);
                alert("Ping fejl: " + (e.message || String(e)));
              }
            }}
          >
            Ping min enhed
          </button>
          <button
            className="btn-primary"
            onClick={async () => {
              if (!token) return alert("Ingen token endnu.");
              const ok = await subscribeToTopic("bets", token);
              alert(
                ok
                  ? 'Subscribed til "bets" (eller no-op hvis endpoint mangler).'
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
