// src/pages/Settings.jsx
import { useEffect, useState } from "react";
import {
  getTokenPermission,
  localTestNotification,
  resetPushOnThisDevice,
  subscribeToTopic,
} from "../lib/notifications";
import { useAuthContext } from "../contexts/AuthContext";

export default function Settings() {
  const { user, signOut } = useAuthContext();
  const [perm, setPerm] = useState("default");
  const [token, setToken] = useState(null);
  const [busy, setBusy] = useState(false);
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    setStandalone(
      window.matchMedia?.("(display-mode: standalone)").matches ||
        window.navigator.standalone
    );
    (async () => {
      const { permission, token } = await getTokenPermission(false, user);
      setPerm(permission);
      setToken(token);
    })();
  }, [user]);

  async function ping() {
    if (!token) return alert("Ingen token endnu – tryk først på Enable Push.");
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
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j.ok === false) {
        return alert(
          `Ping fejl: ${j.error || "HTTP " + res.status}${
            j.code ? `\ncode: ${j.code}` : ""
          }`
        );
      }
      alert("Ping sendt! (messageId: " + (j.messageId || "—") + ")");
    } catch (e) {
      alert("Ping fejl: " + (e.message || String(e)));
    }
  }

  async function validate() {
    if (!token) return alert("Ingen token at validere.");
    const res = await fetch("/api/validate-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const j = await res.json().catch(() => ({}));
    if (!j.ok) {
      alert(
        `VALIDATE: ${j.error || "ukendt"}${j.code ? `\ncode: ${j.code}` : ""}`
      );
    } else {
      alert("VALIDATE: OK (dryRunId: " + j.dryRunId + ")");
    }
  }

  async function enable() {
    setBusy(true);
    const { permission, token } = await getTokenPermission(true, user);
    setPerm(permission);
    setToken(token);
    setBusy(false);
    if (permission !== "granted") alert("Tilladelse blev ikke givet.");
  }

  async function reset() {
    try {
      setBusy(true);
      const r = await resetPushOnThisDevice(user);
      setPerm(r.permission);
      setToken(r.token);
      setBusy(false);
      alert("Push reset. Ny token hentet.");
    } catch (e) {
      setBusy(false);
      alert("Reset fejl: " + (e.message || String(e)));
    }
  }

  return (
    <div className="space-y-4">
      <div className="glass glow-border p-4">
        <h2 className="text-lg font-semibold">Notifications</h2>
        {!standalone && (
          <p className="text-amber-400 text-sm mt-2">
            Tip: På iPhone skal appen være <b>Add to Home Screen</b> for at
            modtage push.
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn-primary" disabled={busy} onClick={enable}>
            Enable Push
          </button>
          <button
            className="btn-primary"
            onClick={() => localTestNotification()}
          >
            Send Test Notification
          </button>
          <button
            className="btn-primary"
            onClick={async () => {
              await navigator.clipboard.writeText(token || "");
              alert("Token kopieret.");
            }}
          >
            Copy FCM Token
          </button>
          <button className="btn-primary" onClick={ping}>
            Ping min enhed
          </button>
          <button className="btn-primary" onClick={validate}>
            Validate token
          </button>
          <button className="btn-primary" disabled={busy} onClick={reset}>
            iOS fix: Reset push
          </button>
          <button
            className="btn-primary"
            onClick={async () => {
              if (!token) return alert("Ingen token endnu.");
              const ok = await subscribeToTopic("bets", token);
              alert(ok ? 'Subscribed til "bets".' : "Subscription fejlede.");
            }}
          >
            Subscribe "bets"
          </button>
        </div>
        <p className="text-xs text-mute mt-2 break-all">
          Permission: {perm} {token && `• ${token.slice(0, 12)}…`}
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
