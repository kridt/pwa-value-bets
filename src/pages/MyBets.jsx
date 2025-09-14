import { useEffect, useMemo, useState } from "react";
import { useAuthContext } from "../contexts/AuthContext";
import { listenMyBets, toggleStar } from "../lib/bets";
import BetCard from "../components/BetCard";
import { useNavigate } from "react-router-dom";

export default function MyBets() {
  const { user } = useAuthContext();
  const [rows, setRows] = useState([]);
  const nav = useNavigate();

  useEffect(() => {
    if (!user) {
      nav("/login", { replace: true });
      return;
    }
    const unsub = listenMyBets(user.uid, setRows);
    return () => unsub && unsub();
  }, [user]);

  const setIds = useMemo(() => new Set(rows.map((r) => r.id)), [rows]);

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Starred Bets</h2>
      {rows.length === 0 && (
        <div className="glass glow-border p-4 text-sm text-mute">
          Du har ikke stjernemarkeret noget endnu.
        </div>
      )}
      {rows.map((b) => (
        <BetCard
          key={b.id}
          bet={b}
          isStarred={true}
          onToggleStar={async () => {
            await toggleStar(user.uid, b, true);
          }}
        />
      ))}
    </div>
  );
}
