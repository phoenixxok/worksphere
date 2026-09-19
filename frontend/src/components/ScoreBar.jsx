export default function ScoreBar({ label, value, weight, colorClass }) {
  const pct = Math.round(value * 100);
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-500">
        <span>{label} <span className="text-slate-400">({Math.round(weight * 100)}%)</span></span>
        <span className="font-mono">{value.toFixed(3)}</span>
      </div>
      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div className={`h-full ${colorClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
