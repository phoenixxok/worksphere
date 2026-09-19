import { rupees } from '../lib/formatters';

export default function SplitCard({ payment }) {
  if (!payment) return null;
  const rows = [
    ['Worker payout', payment.worker_payout_inr, 75, 'bg-green-500'],
    ['Co-op overhead', payment.coop_overhead_inr, 15, 'bg-blue-500'],
    ['Welfare fund', payment.welfare_fund_inr, 10, 'bg-purple-500'],
  ];
  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-3">
      <div className="flex justify-between items-baseline">
        <p className="font-bold">Transparent split</p>
        <p className="text-sm text-slate-500">
          {payment.status === 'settled' ? 'Settled' : 'Pending'}
        </p>
      </div>

      <div className="flex h-3 rounded-full overflow-hidden">
        {rows.map(([label, , pct, color]) => (
          <div key={label} className={color} style={{ width: `${pct}%` }} />
        ))}
      </div>

      {rows.map(([label, value, pct, color]) => (
        <div key={label} className="flex justify-between text-sm">
          <span className="text-slate-600">
            <span className={`inline-block w-2 h-2 rounded-full mr-2 ${color}`} />
            {label} ({pct}%)
          </span>
          <span className="font-semibold">{rupees(value)}</span>
        </div>
      ))}

      <div className="flex justify-between text-sm border-t border-slate-200 pt-2">
        <span className="font-semibold">Total</span>
        <span className="font-bold">{rupees(payment.total_amount_inr)}</span>
      </div>
    </div>
  );
}
