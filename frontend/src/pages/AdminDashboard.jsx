import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { rupees, BOOKING_STATUS_LABEL, BOOKING_STATUS_CLASS } from '../lib/formatters';
import Badge from '../components/Badge';
import StatTile from '../components/StatTile';
import ErrorBox from '../components/ErrorBox';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [queue, setQueue] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);

  const load = useCallback(async () => {
    try {
      const [s, q, b] = await Promise.all([
        api.adminStats(), api.adminRotationQueue(), api.adminBookings(),
      ]);
      setStats(s); setQueue(q.items); setBookings(b.items);
      setUpdatedAt(new Date());
      setError(null);
    } catch (e) { setError(e.message); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  const maxDemand = Math.max(1, ...(stats?.demand_by_skill || []).map((d) => d.request_count));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Co-op dashboard</h2>
        <span className="text-xs text-slate-400">
          {updatedAt ? `Live · ${updatedAt.toLocaleTimeString('en-IN')}` : 'Loading…'}
        </span>
      </div>

      <ErrorBox message={error} />

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatTile label="Requests" value={stats.total_requests} />
          <StatTile label="Bookings" value={stats.total_bookings} />
          <StatTile label="Settled GMV" value={rupees(stats.total_gmv_inr)} />
          <StatTile label="Active workers" value={stats.active_workers} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {stats && (
          <>
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
              <p className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Where the money went</p>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Worker payouts</span>
                <span className="font-semibold tabular-nums text-slate-900">{rupees(stats.total_worker_payout_inr)}</span></div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Co-op overhead</span>
                <span className="font-semibold tabular-nums text-slate-900">{rupees(stats.total_coop_overhead_inr)}</span></div>
              <div className="flex justify-between text-sm border-t border-slate-200 pt-2">
                <span className="text-slate-500">Welfare fund</span>
                <span className="font-semibold tabular-nums text-purple-700">
                  {rupees(stats.total_welfare_fund_inr)}</span></div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
              <p className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Demand by service</p>
              {stats.demand_by_skill.map((d) => (
                <div key={d.skill_code}>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>{d.skill_name}</span><span className="tabular-nums">{d.request_count}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-slate-700"
                         style={{ width: `${(d.request_count / maxDemand) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
          <p className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Rotation queue — next in line first</p>
          {queue.slice(0, 8).map((w, i) => (
            <div key={w.worker_user_id}
                 className="flex items-center justify-between text-sm border-b border-slate-100 pb-1">
              <span className="flex items-center gap-2">
                <span className="text-xs text-slate-400 w-4">{i + 1}</span>
                <span>{w.full_name}</span>
                <span className="text-xs text-slate-400">{w.skills.join(', ')}</span>
              </span>
              <Badge className={w.jobs_completed_this_cycle === 0
                ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-700'}>
                {w.jobs_completed_this_cycle} this cycle
              </Badge>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
        <p className="text-sm font-semibold text-slate-900 uppercase tracking-wide">All bookings</p>
        {bookings.length === 0 && <p className="text-sm text-slate-400 text-center py-8">None yet.</p>}
        {bookings.slice(0, 10).map((b) => (
          <div key={b.id} className="flex justify-between items-center text-sm border-b border-slate-100 pb-1">
            <span>
              <span className="text-slate-400 text-xs mr-1">#{b.id}</span>
              {b.skill_name} · {b.worker_name}
              <span className="block text-xs text-slate-500 mt-1">
                {b.household_name} · <span className="tabular-nums">{rupees(b.quoted_amount_inr)}</span></span>
            </span>
            <Badge className={BOOKING_STATUS_CLASS[b.status]}>
              {BOOKING_STATUS_LABEL[b.status]}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
