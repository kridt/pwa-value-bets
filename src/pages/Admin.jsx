// src/pages/Admin.jsx
import { useEffect, useMemo, useState } from "react";
import { db } from "../lib/firebase";
import {
  collection,
  collectionGroup,
  doc,
  getDocs,
  getCountFromServer,
} from "firebase/firestore";
import { useAuthContext } from "../contexts/AuthContext";
import { isAdminUid } from "../lib/admins";
import { Navigate } from "react-router-dom";

export default function Admin() {
  const { user } = useAuthContext();
  if (!user || !isAdminUid(user.uid)) return <Navigate to="/" replace />;

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notifBusy, setNotifBusy] = useState(false);
  const [notifResult, setNotifResult] = useState(null);

  // Hent kunder + myBets-count pr. kunde
  useEffect(() => {
    (async () => {
      setLoading(true);
      const usersSnap = await getDocs(collection(db, "users"));
      let baseUsers = usersSnap.docs.map((d) => ({
        uid: d.id,
        email: d.get("email") || null,
        displayName: d.get("displayName") || null,
      }));

      // fallback: afled UIDs fra myBets hvis users er tom
      if (baseUsers.length === 0) {
        const cg = await getDocs(collectionGroup(db, "myBets"));
        const uidSet = new Set(cg.docs.map((d) => d.ref.path.split("/")[1]));
        baseUsers = Array.from(uidSet).map((uid) => ({
          uid,
          email: null,
          displayName: null,
        }));
      }

      const rows = await Promise.all(
        baseUsers.map(async (u) => {
          const cnt = await getCountFromServer(
            collection(db, `users/${u.uid}/myBets`)
          );
          return { ...u, myBets: cnt.data().count || 0 };
        })
      );

      rows.sort((a, b) => b.myBets - a.myBets);
      setCustomers(rows);
      setLoading(false);
    })();
  }, []);

  const totalMyBets = useMemo(
    () => customers.reduce((s, c) => s + (c.myBets || 0), 0),
    [customers]
  );

  async function sendTestNotification() {
    try {
      setNotifBusy(true);
      setNotifResult(null);
      const idToken = await user.getIdToken(true);
      const res = await fetch("/api/notify-all", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          title: "VPP — Admin Test",
          body: "Hvis du modtager denne, virker broadcast.",
          url: "/",
        }),
      });
      const json = await res.json();
      setNotifResult(json);
      if (!res.ok) throw new Error(json.error || "Ukendt fejl");
      alert(`Broadcast sendt: success=${json.success}, fail=${json.fail}`);
    } catch (e) {
      alert("Fejl ved test-notifikation: " + (e.message || e));
    } finally {
      setNotifBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="glass glow-border p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Notification Test</h2>
          <button
            className="btn-primary"
            disabled={notifBusy}
            onClick={sendTestNotification}
          >
            {notifBusy ? "Sender…" : "Send til alle"}
          </button>
        </div>
        {notifResult && (
          <p className="text-xs text-mute mt-2">
            Sent: {notifResult.sent} • Success: {notifResult.success} • Fail:{" "}
            {notifResult.fail}
          </p>
        )}
      </section>

      <section className="glass glow-border p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Kunder</h2>
          <div className="text-xs text-mute">Total myBets: {totalMyBets}</div>
        </div>

        {loading ? (
          <div className="text-sm text-mute">Henter kunder…</div>
        ) : customers.length === 0 ? (
          <div className="text-sm text-mute">Ingen kunder fundet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-mute">
                <tr>
                  <th className="py-2 pr-2">UID</th>
                  <th className="py-2 pr-2">Email</th>
                  <th className="py-2 pr-2">Navn</th>
                  <th className="py-2 pr-2 text-right">myBets</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {customers.map((c) => (
                  <tr key={c.uid}>
                    <td className="py-2 pr-2">{c.uid}</td>
                    <td className="py-2 pr-2">{c.email || "—"}</td>
                    <td className="py-2 pr-2">{c.displayName || "—"}</td>
                    <td className="py-2 pr-2 text-right">{c.myBets}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
