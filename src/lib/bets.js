import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  limit,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { parseGameTime } from "./time";

// ─────────────────────────────────────────────────────────────
// PUBLIC: Lyt til AKTIVE sendte bets (ikke live/ikke startet), sorteret efter bookmaker
// ─────────────────────────────────────────────────────────────
export function listenActiveBets(onChange, max = 400) {
  // Hent nyeste først – filtrer i klienten ud fra metadata
  const q = query(
    collection(db, "sendteBets"),
    orderBy("createdAt", "desc"),
    limit(max)
  );
  return onSnapshot(q, (snap) => {
    const rows = snap.docs
      .map((doc) => mapSendtBet(doc.id, doc.data()))
      .filter((b) => b.isActive)
      .sort((a, b) =>
        a.bookmaker.localeCompare(b.bookmaker, undefined, {
          sensitivity: "base",
        })
      );

    const uniqueBooks = Array.from(new Set(rows.map((r) => r.bookmaker))).sort(
      (a, b) => a.localeCompare(b)
    );

    onChange({ rows, bookmakers: ["All", ...uniqueBooks] });
  });
}

// ─────────────────────────────────────────────────────────────
// PUBLIC: Lyt til brugerens stjernemarkeringer
// ─────────────────────────────────────────────────────────────
export function listenMyBets(uid, onChange, max = 200) {
  const q = query(
    collection(db, `users/${uid}/myBets`),
    orderBy("createdAt", "desc"),
    limit(max)
  );
  return onSnapshot(q, (snap) => {
    const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    onChange(rows);
  });
}

// ─────────────────────────────────────────────────────────────
// PUBLIC: Toggle stjerne for et bet i users/{uid}/myBets/{betId}
// ─────────────────────────────────────────────────────────────
export async function toggleStar(uid, bet, isCurrentlyStarred) {
  const ref = doc(db, `users/${uid}/myBets/${bet.id}`);
  if (isCurrentlyStarred) {
    await deleteDoc(ref);
  } else {
    await setDoc(
      ref,
      {
        createdAt: serverTimestamp(),
        event: bet.event,
        league: bet.league,
        kickoff: bet.gameTimeText || null,
        market: bet.market,
        odds: bet.odds ?? null,
        ev: bet.ev ?? null,
        bookmaker: bet.bookmaker ?? null,
        source: "sendteBets",
      },
      { merge: true }
    );
  }
}

// ─────────────────────────────────────────────────────────────
// INTERNAL: Mapper Firestore → UI-objekt og markerer aktive bets
// ─────────────────────────────────────────────────────────────
function mapSendtBet(id, d) {
  const meta = d.metadata || {};
  const gameTimeText = meta.gameTime || d.gameTime || null; // "hh:mm dd.mm.yyyy"
  const kickoffDate = gameTimeText ? parseGameTime(gameTimeText) : null;

  const phase = d._phase || d.phase || meta.phase || null;
  const started = kickoffDate ? kickoffDate.getTime() <= Date.now() : false;
  const isFinished =
    (phase && String(phase).toLowerCase().includes("finish")) || false;
  const isLivePhase =
    (phase && /live|inplay|running/i.test(String(phase))) || false;

  const event = d.match || d.event || "—";
  const league = d.league || d.leagueName || meta.league || "—";
  const ev = d.evPercent ?? d.ev ?? null;
  const market = d.market || d.pick || d.selection || "—";
  const odds = d.odds ?? d.offerOdds ?? d.price ?? null;
  const bookmaker = meta.bookmaker || d.bookmakerName || d.bookmaker || "—";

  const isActive = !isFinished && !isLivePhase && !started;

  return {
    id,
    event,
    league,
    ev,
    market,
    odds,
    bookmaker,
    kickoffDate,
    gameTimeText,
    isActive,
    raw: d,
  };
}
