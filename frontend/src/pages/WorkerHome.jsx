import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { rupees, BOOKING_STATUS_LABEL, BOOKING_STATUS_CLASS, URGENCY_LABEL, URGENCY_CLASS }
  from '../lib/formatters';
import Badge from '../components/Badge';
import Button from '../components/Button';
import ErrorBox from '../components/ErrorBox';
import OtpInput from '../components/OtpInput';

export default function WorkerHome() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [settled, setSettled] = useState({}); // bookingId -> payment object

  const load = useCallback(() => {
    api.myBookings()
      .then((d) => setItems(d.items))
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function accept(id) {
    setBusyId(id);
    try { await api.acceptBooking(id); load(); }
    catch (e) { setError(e.message); }
    finally { setBusyId(null); }
  }

  async function verifyStart(id, otp) {
    setBusyId(id);
    try { await api.verifyStartOtp(id, otp); load(); }
    finally { setBusyId(null); }
  }

  async function verifyDone(id, otp) {
    setBusyId(id);
    try {
      const res = await api.verifyCompletionOtp(id, otp);
      setSettled((s) => ({ ...s, [id]: res.payment }));
      load();
    } finally { setBusyId(null); }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">My jobs</h2>
        <button className="text-xs underline text-slate-500" onClick={load}>Refresh</button>
      </div>

      <ErrorBox message={error} />
      {items === null && !error && <p className="text-slate-500">Loading…</p>}
      {items && items.length === 0 && (
        <p className="text-slate-500">No jobs assigned yet.</p>
      )}

      {items && items.map((b) => (
        <div key={b.id} className="bg-white rounded-lg shadow p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-bold">{b.skill_name} · {rupees(b.quoted_amount_inr)}</p>
              <p className="text-sm text-slate-600">{b.issue_summary}</p>
              <p className="text-xs text-slate-500 mt-1">
                {b.household_name} · {b.household_address_text}
              </p>
              <p className="text-xs text-slate-500">{b.scheduled_slot}</p>
            </div>
            <div className="text-right space-y-1">
              <Badge className={BOOKING_STATUS_CLASS[b.status]}>
                {BOOKING_STATUS_LABEL[b.status]}
              </Badge>
              <div>
                <Badge className={URGENCY_CLASS[b.urgency]}>{URGENCY_LABEL[b.urgency]}</Badge>
              </div>
            </div>
          </div>

          {b.status === 'pending' && (
            <div className="flex gap-2">
              <Button variant="success" disabled={busyId === b.id} onClick={() => accept(b.id)}>
                Accept job
              </Button>
            </div>
          )}

          {b.status === 'accepted' && (
            <OtpInput
              title="Enter the start OTP"
              hint="Ask the household for the code when you reach the door."
              busy={busyId === b.id}
              onSubmit={(otp) => verifyStart(b.id, otp)}
            />
          )}

          {b.status === 'in_progress' && (
            <OtpInput
              title="Enter the completion OTP"
              hint="Ask the household for the code once they are satisfied."
              busy={busyId === b.id}
              onSubmit={(otp) => verifyDone(b.id, otp)}
            />
          )}

          {b.status === 'completed' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
              <p className="font-semibold text-green-900">Job complete</p>
              <p className="text-green-800">
                Your payout: {rupees(settled[b.id]?.worker_payout_inr
                  ?? Math.floor(b.quoted_amount_inr * 0.75))} (75%)
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
