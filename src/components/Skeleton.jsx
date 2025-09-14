export function SkeletonCard() {
  return (
    <div className="glass glow-border p-4 mb-3 animate-pulse">
      <div className="h-4 w-2/3 bg-white/10 rounded mb-2" />
      <div className="h-3 w-1/2 bg-white/10 rounded" />
      <div className="grid grid-cols-3 gap-2 mt-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-10 bg-white/10 rounded-xl" />
        ))}
      </div>
      <div className="flex gap-2 mt-3">
        <div className="h-9 flex-1 bg-white/10 rounded-xl" />
        <div className="h-9 w-9 bg-white/10 rounded-xl" />
      </div>
    </div>
  );
}
