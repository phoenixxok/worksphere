import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import Button from '../components/Button';
import ErrorBox from '../components/ErrorBox';
import RequestResultCard from '../components/RequestResultCard';

const EXAMPLES = [
  'My bathroom tap is leaking, need someone today',
  'મારો પંખો ચાલતો નથી',
  'मेरे बाथरूम का नल टपक रहा है, आज ही चाहिए',
];

export default function HouseholdHome() {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [request, setRequest] = useState(null);

  async function submit() {
    setError(null);
    setBusy(true);
    setRequest(null);
    try {
      const created = await api.createRequest(text, 'text');
      setRequest(created);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-lg font-bold">What do you need help with?</h2>
        <p className="text-sm text-slate-500">Type in English, Hindi or Gujarati.</p>
      </div>

      <textarea
        aria-label="What do you need help with?"
        className="w-full rounded-lg border border-slate-300 px-3 py-3 h-28"
        placeholder="e.g. My kitchen sink is blocked"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <div className="flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button key={ex} onClick={() => setText(ex)}
                  className="text-xs bg-white border border-slate-300 rounded-full px-3 py-1 text-slate-600">
            {ex.length > 28 ? `${ex.slice(0, 28)}…` : ex}
          </button>
        ))}
      </div>

      <ErrorBox message={error} />

      <Button disabled={busy || !text.trim()} onClick={submit}>
        {busy ? 'Understanding…' : 'Submit request'}
      </Button>

      {request && (
        <>
          <RequestResultCard request={request} />
          <Button variant="success" onClick={() => navigate(`/household/requests/${request.id}/matches`)}>
            Find available workers
          </Button>
        </>
      )}

      <button className="w-full text-sm text-slate-500 underline pt-2"
              onClick={() => navigate('/household/bookings')}>
        My bookings
      </button>
    </div>
  );
}
