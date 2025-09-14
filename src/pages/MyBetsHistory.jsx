import { useEffect, useMemo, useState } from "react";
import { useAuthContext } from "../contexts/AuthContext";
import { listenMyBetsFinished, toggleStar } from "../lib/bets";
import { parseBetMessage } from "../lib/messageParser";
import MyBetCard from "../components/MyBetCard";

export default function MyBetsHistory() {
  const { user } = useAuthContext();
  const [rows, setRows] = useState([]);

  useEffect(() => {
    if (!user) return;
    const unsub = listenMyBetsFinished(user.uid, setRows);
    return () => unsub && unsub();
  }, [user]);

  const list = useMemo(
    () =>
      rows
        .map((b) => ({ ...b, parsed: parseBetMessage(b.message || "") }))
        .sort(
          (a, b) => (b.finishedAt?.seconds || 0) - (a.finishedAt?.seconds || 0)
        ),
    [rows]
  );

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">MyBets — History</h2>
      {list.length === 0 && (
        <div className="glass glow-border p-4 text-sm text-mute">
          Ingen afsluttede stjernemarkeringer endnu.
        </div>
      )}
      {list.map((b) => (
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
