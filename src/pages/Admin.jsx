import { useEffect, useMemo, useState } from "react";
import { db } from "../lib/firebase";
import {
  collection,
  collectionGroup,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
  deleteDoc,
  getCountFromServer,
  query,
} from "firebase/firestore";
import { useAuthContext } from "../contexts/AuthContext";

export default function Admin() {
  const { user } = useAuthContext();
  const [admins, setAdmins] = useState([]);
  const [newAdminUid, setNewAdminUid] = useState("");
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notifBusy, setNotifBusy] = useState(false);
  const [notifResult, setNotifResult] = useState(null);

  // Live-liste over admins
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "admins"), (snap) => {
      setAdmins(snap.docs.map((d) => ({ uid: d.id })));
    });
    return () => unsub();
  }, []);

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

      // Fallback: hvis "users" er tom, afled uids fra myBets (collection group)
      if (baseUsers.length === 0) {
        const cg = await getDocs(query(collectionGroup(db, "myBets")));
        const uidSet = new Set(cg.docs.map((d) => d.ref.path.split("/")[1])); // users/{uid}/myBets/{id}
        baseUsers = Array.from(uidSet).map((uid) => ({
          uid,
          email: null,
          displayName: null,
        }));
      }

      // Count pr. bruger (aggregate)
      const rows = await Promise.all(
        baseUsers.map(async (u) => {
          const cnt = await getCountFromServer(
            collection(db, `users/${u.uid}/myBets`)
          );
          return { ...u, myBets: cnt.data().count || 0 };
        })
      );

      // Sorter efter flest myBets
      rows.sort((a, b) => b.myBets - a.myBets);

      setCustomers(rows);
      setLoading(false);
    })();
  }, []);

  const totalMyBets = useMemo(
    () => customers.reduce((s, c) => s + (c.myBets || 0), 0),
    [customers]
  );

  async function addAdmin() {
    try {
      const uid = newAdminUid.trim();
      if (!uid) return;
      await setDoc(
        doc(db, "admins", uid),
        { createdAt: new Date().toISOString() },
        { merge: true }
      );
      setNewAdminUid("");
      alert("Admin tilføjet.");
    } catch (e) {
      alert("Kunne ikke tilføje admin: " + (e.message || e));
    }
  }

  async function removeAdmin(uid) {
    if (!confirm(`Fjern admin ${uid}?`)) return;
    try {
      await deleteDoc(doc(db, "admins", uid));
      alert("Admin fjernet.");
    } catch (e) {
      alert("Kunne ikke fjerne admin: " + (e.message || e));
    }
  }

  async function sendTestNotification() {
    try {
      setNotifBusy(true);
      setNotifResult(null);
      const idToken = await user.getIdToken(/*forceRefresh*/ true);
      const res = await fetch("/api/notify-all", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          title: "VPP — Test fra Admin",
          body: "Hvis du modtager denne, virker PWA push til alle.",
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
      {/* Admins */}
      <section className="glass glow-border p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Admins</h2>
        </div>
        <div className="flex gap-2">
          <input
            value={newAdminUid}
            onChange={(e) => setNewAdminUid(e.target.value)}
            placeholder="UID"
            className="flex-1 rounded-xl bg-transparent border border-white/15 px-3 py-2 outline-none focus:border-glow"
          />
          <button className="btn-primary" onClick={addAdmin}>
            Tilføj
          </button>
        </div>
        <div className="mt-3 divide-y divide-white/5">
          {admins.map((a) => (
            <div
              key={a.uid}
              className="py-2 flex items-center justify-between text-sm"
            >
              <div>
                <span className="badge mr-2">Admin</span>
                {a.uid}
              </div>
              <button
                className="btn-primary px-3"
                onClick={() => removeAdmin(a.uid)}
              >
                Fjern
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Notifikationstest */}
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

      {/* Kunder */}
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
