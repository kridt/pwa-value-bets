import useCountdown from "../hooks/useCountdown";
import { formatCountdown } from "../lib/time";

export default function BetCard({ bet, isStarred, onToggleStar }) {
  const parts = useCountdown(bet.kickoffDate);
  const countdown = parts ? formatCountdown(parts) : "—";

  return (
    <article className="glass glow-border p-4 mb-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold tracking-wide">{bet.event}</h3>
          <p className="text-xs text-mute mt-0.5">
            {bet.league} • {bet.gameTimeText || "N/A"}
          </p>
        </div>
        <span className="badge">EV {bet.ev ?? "—"}%</span>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3">
        <div className="glass p-2 rounded-xl text-center">
          <div className="text-[10px] text-mute">Bookmaker</div>
          <div className="text-sm">{bet.bookmaker}</div>
        </div>
        <div className="glass p-2 rounded-xl text-center">
          <div className="text-[10px] text-mute">Market</div>
          <div className="text-sm">{bet.market}</div>
        </div>
        <div className="glass p-2 rounded-xl text-center">
          <div className="text-[10px] text-mute">Odds</div>
          <div className="text-sm">{bet.odds ?? "—"}</div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="glass p-2 rounded-xl text-center">
          <div className="text-[10px] text-mute">Starts in</div>
          <div className="text-sm">{countdown}</div>
        </div>
        <button
          className={`btn-primary ${isStarred ? "ring-2 ring-glow" : ""}`}
          title={isStarred ? "Unstar" : "Star"}
          onClick={onToggleStar}
        >
          {isStarred ? "★ Starred" : "☆ Star"}
        </button>
      </div>
    </article>
  );
}
