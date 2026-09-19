export default function ScoreBar({ label, value, weight, colorClass }) {
  const pct = Math.round(value * 100);
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-500">
        <span>{label} <span className="text-slate-400">({Math.round(weight * 100)}%)</span></span>
        <span className="font-semibold tabular-nums text-slate-900">{value.toFixed(3)}</span>
      </div>
      <div className="h-2 bg-slate-200 rounded-full overflow-hidden mt-1">
        <div className={`h-full transition-all duration-300 ${colorClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
