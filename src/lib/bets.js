import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  limit,
  setDoc,
  deleteDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { parseGameTime } from "./time";
import { parseBetMessage } from "./messageParser";

// ─────────────────────────────────────────────────────────────
// AKTIVE SENDTE BETS (feed) – filtrér ikke-startede / ikke-live / ikke-finished
// ─────────────────────────────────────────────────────────────
export function listenActiveBets(onChange, max = 400) {
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
// MYBETS – lyt og autokonsekver status (active|live|finished)
//  - live: [kickoff .. kickoff+2h]
//  - finished: ikke i sendteBets men findes i betResults
// ─────────────────────────────────────────────────────────────
export function listenMyBets(uid, onChange, max = 300) {
  const q = query(
    collection(db, `users/${uid}/myBets`),
    orderBy("createdAt", "desc"),
    limit(max)
  );

  return onSnapshot(q, async (snap) => {
    const rawRows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // berig & sync status
    const rows = await Promise.all(
      rawRows.map(async (row) => {
        const enriched = enrichMyBet(row);
        const computed = await computeAndMaybePersistStatus(uid, enriched);
        return { ...enriched, ...computed };
      })
    );

    onChange(rows);
  });
}

// Til history: lyt kun finished
export function listenMyBetsFinished(uid, onChange, max = 300) {
  const q = query(
    collection(db, `users/${uid}/myBets`),
    orderBy("createdAt", "desc"),
    limit(max)
  );
  return onSnapshot(q, (snap) => {
    const rows = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .map(enrichMyBet)
      .filter((r) => r.status === "finished")
      .sort(
        (a, b) => (b.finishedAt?.seconds || 0) - (a.finishedAt?.seconds || 0)
      );
    onChange(rows);
  });
}

// Toggle stjerne i users/{uid}/myBets/{betId}
export async function toggleStar(uid, bet, isCurrentlyStarred) {
  const ref = doc(db, `users/${uid}/myBets/${bet.id}`);
  if (isCurrentlyStarred) {
    await deleteDoc(ref);
  } else {
    await setDoc(
      ref,
      {
        createdAt: serverTimestamp(),
        status: "active", // default
        event: bet.event,
        league: bet.league,
        kickoff: bet.gameTimeText || null,
        market: bet.market,
        odds: bet.odds ?? null,
        ev: bet.ev ?? null,
        bookmaker: bet.bookmaker ?? null,
        source: "sendteBets",
        message: bet.raw?.message || null,
      },
      { merge: true }
    );
  }
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function mapSendtBet(id, d) {
  const meta = d.metadata || {};
  const gameTimeText = meta.gameTime || d.gameTime || null;
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

// berig myBet med parsed felter & kickoffDate
function enrichMyBet(row) {
  const parsed = parseBetMessage(row.message || "");
  const kickoffText = row.kickoff || parsed.gameTimeText || null;
  const kickoffDate = kickoffText ? parseGameTime(kickoffText) : null;
  const bookmaker = row.bookmaker || parsed.bookmaker || "—";
  return { ...row, parsed, kickoffText, kickoffDate, bookmaker };
}

// returnerer {status, finishedAt?} og opdaterer Firestore hvis der er ændringer
async function computeAndMaybePersistStatus(uid, row) {
  const now = Date.now();
  const ko = row.kickoffDate?.getTime?.() || null;
  const LIVE_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 timer

  let timeStatus = "unknown";
  if (ko) {
    if (now < ko) timeStatus = "pre";
    else if (now >= ko && now <= ko + LIVE_WINDOW_MS) timeStatus = "live";
    else timeStatus = "post";
  }

  let status = row.status || "active";
  let finishedAt = row.finishedAt || null;

  if (timeStatus === "live") {
    status = "live";
  } else if (timeStatus === "post") {
    // Kun hvis ikke allerede finished – check kilder
    if (status !== "finished") {
      const inSendte = await existsDoc(doc(db, "sendteBets", row.id));
      if (!inSendte) {
        const inResults = await existsDoc(doc(db, "betResults", row.id));
        if (inResults) {
          status = "finished";
          finishedAt = { seconds: Math.floor(now / 1000) };
          await updateDoc(doc(db, `users/${uid}/myBets/${row.id}`), {
            status: "finished",
            finishedAt: serverTimestamp(),
          });
          return { status: "finished", finishedAt };
        }
      }
    }
  } else {
    status = "active";
  }

  // Persistér skift til 'live' / normalisering af fields (uden at spamme writes)
  if (
    status !== row.status ||
    row.kickoff !== row.kickoffText ||
    row.bookmaker !== row.bookmaker
  ) {
    try {
      await updateDoc(doc(db, `users/${uid}/myBets/${row.id}`), {
        status,
        kickoff: row.kickoffText || null,
        bookmaker: row.bookmaker || row.parsed?.bookmaker || null,
      });
    } catch (e) {
      // kan være første gang (doc mangler felter) – ignorer fejl
      // eller manglende write-permission (burde være ok iht. regler)
      console.warn("update myBet meta failed", e);
    }
  }

  return { status, finishedAt };
}

async function existsDoc(ref) {
  const snap = await getDoc(ref);
  return snap.exists();
}
