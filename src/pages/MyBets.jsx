import { useEffect, useMemo, useState } from "react";
import { useAuthContext } from "../contexts/AuthContext";
import { listenMyBets, toggleStar } from "../lib/bets";
import { parseBetMessage } from "../lib/messageParser";
import MyBetCard from "../components/MyBetCard";
import { NavLink } from "react-router-dom";

export default function MyBets() {
  const { user } = useAuthContext();
  const [rows, setRows] = useState([]);
  const [filterBook, setFilterBook] = useState("All");

  useEffect(() => {
    if (!user) return;
    const unsub = listenMyBets(user.uid, setRows);
    return () => unsub && unsub();
  }, [user]);

  // kun ikke-finished (active + live)
  const activeRows = rows.filter((r) => r.status !== "finished");
  const bookmakers = useMemo(() => {
    const set = new Set(
      activeRows.map(
        (r) => r.bookmaker || parseBetMessage(r.message || "").bookmaker || "—"
      )
    );
    return ["All", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [rows]);

  const filtered = useMemo(() => {
    const list = activeRows
      .map((b) => ({ ...b, parsed: parseBetMessage(b.message || "") }))
      .sort((a, b) => (a.bookmaker || "—").localeCompare(b.bookmaker || "—"));
    if (filterBook === "All") return list;
    return list.filter((b) => (b.bookmaker || "—") === filterBook);
  }, [activeRows, filterBook]);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Starred Bets</h2>
        <NavLink className="badge" to="/my-bets-history">
          History
        </NavLink>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
        {bookmakers.map((bm) => (
          <button
            key={bm}
            className={`badge whitespace-nowrap ${
              filterBook === bm ? "ring-2 ring-glow" : ""
            }`}
            onClick={() => setFilterBook(bm)}
          >
            {bm}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="glass glow-border p-4 text-sm text-mute">
          Ingen aktive eller live stjernemarkeringer.
        </div>
      )}

      {filtered.map((b) => (
        <MyBetCard
          key={b.id}
          bet={b}
          parsed={b.parsed}
          onUnstar={async () => {
            await toggleStar(user.uid, { id: b.id }, true);
          }}
        />
      ))}
    </div>
  );
}
