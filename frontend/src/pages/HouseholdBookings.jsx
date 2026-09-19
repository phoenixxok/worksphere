import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { rupees, BOOKING_STATUS_LABEL, BOOKING_STATUS_CLASS } from '../lib/formatters';
import Badge from '../components/Badge';
import Button from '../components/Button';
import ErrorBox from '../components/ErrorBox';
import OtpDisplay from '../components/OtpDisplay';
import SplitCard from '../components/SplitCard';

export default function HouseholdBookings() {
  const navigate = useNavigate();
  const [items, setItems] = useState(null);
  const [payments, setPayments] = useState({});
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const d = await api.myBookings();
      setItems(d.items);
      // Fetch the settled split for any completed booking.
      const completed = d.items.filter((b) => b.status === 'completed');
      const results = await Promise.all(
        completed.map((b) => api.getPayment(b.id).catch(() => null))
      );
      const map = {};
      completed.forEach((b, i) => { if (results[i]) map[b.id] = results[i]; });
      setPayments(map);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Poll every 5 seconds so the household sees the worker's actions without refreshing.
  useEffect(() => {
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  async function cancel(id) {
    try { await api.cancelBooking(id); load(); }
    catch (e) { setError(e.message); }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">My bookings</h2>
        <button className="text-xs underline text-slate-500" onClick={load}>Refresh</button>
      </div>

      <ErrorBox message={error} />
      {items === null && !error && <p className="text-sm text-slate-400 text-center py-8">Loading…</p>}
      {items && items.length === 0 && <p className="text-sm text-slate-400 text-center py-8">No bookings yet.</p>}

      {items && items.map((b) => (
        <div key={b.id} className="space-y-3">
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <div className="flex justify-between items-start gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-900 uppercase tracking-wide">{b.skill_name} · {b.worker_name}</p>
                <p className="text-sm text-slate-500 mt-1">{b.issue_summary}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {b.scheduled_slot} · <span className="tabular-nums">{rupees(b.quoted_amount_inr)}</span>
                </p>
              </div>
              <Badge className={BOOKING_STATUS_CLASS[b.status]}>
                {BOOKING_STATUS_LABEL[b.status]}
              </Badge>
            </div>

            {['pending', 'accepted'].includes(b.status) && (
              <Button variant="danger" onClick={() => cancel(b.id)}>Cancel booking</Button>
            )}
          </div>

          {b.status === 'accepted' && (
            <OtpDisplay label="Start OTP" otp={b.start_otp}
              hint="Read this to the worker when they arrive." />
          )}
          {b.status === 'pending' && (
            <OtpDisplay label="Start OTP" otp={b.start_otp}
              hint="The worker has not accepted yet." />
          )}
          {b.status === 'in_progress' && (
            <OtpDisplay label="Completion OTP" otp={b.completion_otp}
              hint="Read this to the worker only when you are satisfied with the work." />
          )}
          {b.status === 'completed' && <SplitCard payment={payments[b.id]} />}
        </div>
      ))}

      <button className="w-full text-sm text-slate-500 underline pt-2"
              onClick={() => navigate('/household')}>New request</button>
    </div>
  );
}
