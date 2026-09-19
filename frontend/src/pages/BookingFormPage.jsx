import { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../lib/api';
import { rupees } from '../lib/formatters';
import Button from '../components/Button';
import ErrorBox from '../components/ErrorBox';
import OtpDisplay from '../components/OtpDisplay';

const SLOTS = ['Today 4-6 PM', 'Today 6-8 PM', 'Tomorrow 9-11 AM', 'Tomorrow 4-6 PM'];
const AMOUNTS = [300, 500, 800, 1200];

export default function BookingFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation();
  const candidate = state?.candidate;

  const [slot, setSlot] = useState(SLOTS[0]);
  const [amount, setAmount] = useState(500);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [booking, setBooking] = useState(null);

  if (!candidate) {
    return (
      <div className="p-4 space-y-3">
        <p className="text-slate-600">No worker selected.</p>
        <Button variant="secondary" onClick={() => navigate(`/household/requests/${id}/matches`)}>
          Back to matches
        </Button>
      </div>
    );
  }

  async function confirm() {
    setError(null);
    setBusy(true);
    try {
      const created = await api.createBooking(Number(id), candidate.worker_user_id, slot, amount);
      setBooking(created);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (booking) {
    return (
      <div className="p-4 space-y-4">
        <div className="bg-green-50 border border-green-300 rounded-lg p-4">
          <p className="font-bold text-green-900">Booking confirmed</p>
          <p className="text-sm text-green-800">
            {booking.worker_name} · {booking.scheduled_slot} · {rupees(booking.quoted_amount_inr)}
          </p>
        </div>
        <OtpDisplay
          label="Start OTP"
          otp={booking.start_otp}
          hint="Give this code to the worker only when they arrive at your door."
        />
        <Button onClick={() => navigate('/household/bookings')}>Go to my bookings</Button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className="text-lg font-bold">Confirm booking</h2>
        <p className="text-sm text-slate-500">
          {candidate.full_name} · {candidate.distance_km} km · ★ {candidate.rating_avg.toFixed(1)}
        </p>
      </div>

      <div>
        <p className="text-sm font-semibold mb-2">Choose a slot</p>
        <div className="grid grid-cols-2 gap-2">
          {SLOTS.map((s) => (
            <button key={s} onClick={() => setSlot(s)}
              className={`text-sm rounded-lg px-3 py-3 border ${
                slot === s ? 'bg-slate-900 text-white border-slate-900'
                           : 'bg-white text-slate-700 border-slate-300'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold mb-2">Estimated amount</p>
        <div className="grid grid-cols-4 gap-2">
          {AMOUNTS.map((a) => (
            <button key={a} onClick={() => setAmount(a)}
              className={`text-sm rounded-lg px-2 py-3 border ${
                amount === a ? 'bg-slate-900 text-white border-slate-900'
                             : 'bg-white text-slate-700 border-slate-300'}`}>
              {rupees(a)}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 text-sm space-y-1">
        <p className="font-semibold">How {rupees(amount)} will be split</p>
        <div className="flex justify-between"><span className="text-slate-500">Worker payout (75%)</span>
          <span className="font-semibold">{rupees(Math.floor(amount * 0.75))}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Co-op overhead (15%)</span>
          <span className="font-semibold">{rupees(Math.floor(amount * 0.15))}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Welfare fund (10%)</span>
          <span className="font-semibold">
            {rupees(amount - Math.floor(amount * 0.75) - Math.floor(amount * 0.15))}</span></div>
      </div>

      <ErrorBox message={error} />
      <Button variant="success" disabled={busy} onClick={confirm}>
        {busy ? 'Booking…' : `Confirm booking · ${rupees(amount)}`}
      </Button>
      <button className="w-full text-sm text-slate-500 underline"
              onClick={() => navigate(-1)}>Back</button>
    </div>
  );
}
