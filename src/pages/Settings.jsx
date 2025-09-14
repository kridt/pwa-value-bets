import { useEffect, useState } from "react";
import {
  getTokenPermission,
  subscribeToTopic,
  localTestNotification,
} from "../lib/notifications";
import { useAuthContext } from "../contexts/AuthContext";

export default function Settings() {
  const [perm, setPerm] = useState("prompt");
  const [token, setToken] = useState(null);
  const { user, signOut } = useAuthContext();

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
          Enable push to get new EV bets instantly.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            className="btn-primary"
            onClick={async () => {
              const { permission, token } = await getTokenPermission(true);
              setPerm(permission);
              setToken(token);
            }}
          >
            Enable Push
          </button>

          <button
            className="btn-primary"
            onClick={async () => {
              await localTestNotification({
                title: "VPP — Test",
                body: "If you see this on your iPhone PWA, notifications render correctly.",
                url: "/",
              });
              alert("Test notification requested.");
            }}
          >
            Send Test Notification
          </button>

          <button
            className="btn-primary"
            onClick={async () => {
              if (!token) return alert("No token yet");
              await navigator.clipboard.writeText(token);
              alert("FCM token copied to clipboard");
            }}
          >
            Copy FCM Token
          </button>

          <button
            className="btn-primary"
            onClick={async () => {
              if (!token) return alert("Need token first");
              const ok = await subscribeToTopic("football", token);
              alert(ok ? "Subscribed to topic" : "Subscription failed");
            }}
          >
            Subscribe Football
          </button>
        </div>
        <p className="text-xs text-mute mt-2 break-all">
          Perm: {perm} {token && `• ${token.substring(0, 12)}…`}
        </p>
      </div>

      <div className="glass glow-border p-4">
        <h2 className="text-lg font-semibold">Account</h2>
        <div className="mt-3">
          <button className="btn-primary" onClick={signOut}>
            Sign Out
          </button>
        </div>
        <p className="text-xs text-mute mt-2 break-all">
          Logged in as: {user?.email}
        </p>
      </div>
    </div>
  );
}
