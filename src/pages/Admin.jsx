import { useEffect, useState } from "react";
import { db } from "../lib/firebase";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";

export default function Admin() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({
    sent: 0,
    win: 0,
    loss: 0,
    pending: 0,
    roi: "—",
  });

  useEffect(() => {
    // MOCK / starter: prøv at læse en "bets" kollektion hvis den findes
    (async () => {
      try {
        const q = query(
          collection(db, "bets"),
          orderBy("createdAt", "desc"),
          limit(50)
        );
        const snap = await getDocs(q);
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        if (rows.length) setItems(rows);
        else {
          // fallback demo-data
          const demo = Array.from({ length: 8 }).map((_, i) => ({
            id: `demo-${i + 1}`,
            createdAt: new Date().toISOString(),
            event: "Team A vs Team B",
            market: "AH -0.5",
            odds: 1.93,
            ev: 6.1,
            bookmaker: "Unibet",
            status: ["Win", "Loss", "Pending"][i % 3],
          }));
          setItems(demo);
        }
        // simpelt stats-mock
        setStats({ sent: 128, win: 74, loss: 41, pending: 13, roi: "+7.8%" });
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  return (
    <div className="space-y-4">
      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass glow-border p-4">
          <div className="text-xs text-mute">Sent</div>
          <div className="text-2xl font-semibold">{stats.sent}</div>
        </div>
        <div className="glass glow-border p-4">
          <div className="text-xs text-mute">ROI</div>
          <div className="text-2xl font-semibold text-glow">{stats.roi}</div>
        </div>
        <div className="glass glow-border p-4">
          <div className="text-xs text-mute">Won</div>
          <div className="text-2xl font-semibold">{stats.win}</div>
        </div>
        <div className="glass glow-border p-4">
          <div className="text-xs text-mute">Lost</div>
          <div className="text-2xl font-semibold">{stats.loss}</div>
        </div>
      </div>

      {/* Table */}
      <div className="glass glow-border p-2">
        <div className="flex items-center justify-between p-2">
          <h3 className="font-semibold">Sent Bets</h3>
          <button
            className="btn-primary"
            onClick={() => {
              const lines = items.map((r) =>
                [
                  r.createdAt,
                  r.event,
                  r.market,
                  r.bookmaker,
                  r.odds,
                  r.ev,
                  r.status,
                ].join(",")
              );
              const csv = [
                "createdAt,event,market,bookmaker,odds,ev,status",
                ...lines,
              ].join("\n");
              const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "sent-bets.csv";
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Export CSV
          </button>
        </div>
        <div className="divide-y divide-white/5">
          {items.map((row) => (
            <div
              key={row.id}
              className="grid grid-cols-[auto_1fr_auto] gap-3 p-2 text-sm"
            >
              <div className="badge">{row.status ?? "—"}</div>
              <div>
                <div className="font-medium">{row.event}</div>
                <div className="text-xs text-mute">
                  {row.createdAt?.slice(0, 16)?.replace("T", " ")} •{" "}
                  {row.market} • {row.bookmaker}
                </div>
              </div>
              <div className="text-right">
                <div className="text-glow">EV {row.ev}%</div>
                <div className="text-xs text-mute">@ {row.odds}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
