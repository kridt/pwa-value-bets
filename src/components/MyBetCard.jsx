import useCountdown from "../hooks/useCountdown";
import { formatCountdown } from "../lib/time";

export default function MyBetCard({ bet, parsed, onUnstar }) {
  const parts = useCountdown(bet.kickoffDate);
  const countdown = bet.kickoffDate ? formatCountdown(parts) : null;
  const isLive = bet.status === "live";

  return (
    <article className="glass glow-border p-4 mb-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold tracking-wide">
            {parsed.event || bet.event || "—"}
          </h3>
          <p className="text-xs text-mute mt-0.5">
            {parsed.league || bet.league || "—"}
            {bet.kickoffText ? ` • ${bet.kickoffText}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isLive && (
            <span className="badge" title="Live nu">
              LIVE
            </span>
          )}
          <button className="badge" onClick={onUnstar} title="Fjern stjerne">
            ★ Remove
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3">
        <div className="glass p-2 rounded-xl text-center">
          <div className="text-[10px] text-mute">Bookmaker</div>
          <div className="text-sm">
            {parsed.bookmaker || bet.bookmaker || "—"}
          </div>
        </div>
        <div className="glass p-2 rounded-xl text-center">
          <div className="text-[10px] text-mute">Pick</div>
          <div className="text-sm">{parsed.selection || bet.market || "—"}</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-2">
        <div className="glass p-2 rounded-xl text-center">
          <div className="text-[10px] text-mute">EV</div>
          <div className="text-sm">
            {parsed.ev ?? bet.ev ?? "—"}
            {parsed.ev != null ? "%" : ""}
          </div>
        </div>
        <div className="glass p-2 rounded-xl text-center">
          <div className="text-[10px] text-mute">Fair</div>
          <div className="text-sm">{parsed.fairOdds ?? "—"}</div>
        </div>
        <div className="glass p-2 rounded-xl text-center">
          <div className="text-[10px] text-mute">Offered</div>
          <div className="text-sm">{parsed.offerOdds ?? bet.odds ?? "—"}</div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="text-xs text-mute">
          {parsed.lastUpdated ? `Opdateret: ${parsed.lastUpdated}` : ""}
          {countdown ? ` • Start om ${countdown}` : ""}
        </div>
        {parsed.link && (
          <a
            href={parsed.link}
            target="_blank"
            rel="noreferrer"
            className="btn-primary px-3"
          >
            Åbn odds
          </a>
        )}
      </div>
    </article>
  );
}
