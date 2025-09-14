import { useParams } from "react-router-dom";

export default function BetDetail() {
  const { id } = useParams();
  return (
    <div className="glass glow-border p-4">
      <h2 className="text-lg font-semibold">Bet #{id}</h2>
      <p className="text-mute mt-2 text-sm">
        Detailed markets, odds movement, fair odds, and staking guidance live
        here.
      </p>

      <div className="grid grid-cols-2 gap-2 mt-4">
        <div className="glass p-3 rounded-xl">
          <div className="text-[10px] text-mute">Suggested Stake</div>
          <div className="text-sm">2 units</div>
        </div>
        <div className="glass p-3 rounded-xl">
          <div className="text-[10px] text-mute">Fair Odds</div>
          <div className="text-sm">1.88</div>
        </div>
      </div>

      <button className="btn-primary w-full mt-4">Copy Bet Slip</button>
    </div>
  );
}
