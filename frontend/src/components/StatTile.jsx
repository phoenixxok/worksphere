export default function StatTile({ label, value, sub }) {
  return (
    <div className="bg-white rounded-lg shadow p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-xl font-bold">{value}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  );
}
