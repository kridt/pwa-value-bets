import { useEffect, useMemo, useState } from "react";
import { useAuthContext } from "../contexts/AuthContext";
import BetCard from "../components/BetCard";
import { SkeletonCard } from "../components/Skeleton";
import { listenActiveBets, listenMyBets, toggleStar } from "../lib/bets";

export default function Feed() {
  const { user } = useAuthContext();

  const [loading, setLoading] = useState(true);
  const [bets, setBets] = useState([]);
  const [bookmakers, setBookmakers] = useState(["All"]);
  const [filterBook, setFilterBook] = useState("All");
  const [myBets, setMyBets] = useState([]);

  useEffect(() => {
    const unsub = listenActiveBets(({ rows, bookmakers }) => {
      setBets(rows);
      setBookmakers(bookmakers);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsub = listenMyBets(user.uid, setMyBets);
    return () => unsub && unsub();
  }, [user]);

  const mySet = useMemo(() => new Set(myBets.map((b) => b.id)), [myBets]);
  const filtered = useMemo(() => {
    if (filterBook === "All") return bets;
    return bets.filter((b) => b.bookmaker === filterBook);
  }, [bets, filterBook]);

  return (
    <main>
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

      {loading ? (
        <>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </>
      ) : filtered.length ? (
        filtered.map((b) => (
          <BetCard
            key={b.id}
            bet={b}
            isStarred={mySet.has(b.id)}
            onToggleStar={async () => {
              await toggleStar(user.uid, b, mySet.has(b.id));
            }}
          />
        ))
      ) : (
        <div className="glass glow-border p-4 text-sm text-mute">
          Ingen aktive spil fundet for valgt bookmaker.
        </div>
      )}
    </main>
  );
}
