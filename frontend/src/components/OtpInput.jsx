import { useState } from 'react';
import Button from './Button';
import ErrorBox from './ErrorBox';

export default function OtpInput({ title, hint, onSubmit, busy }) {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState(null);

  async function submit() {
    setError(null);
    try {
      await onSubmit(otp);
      setOtp('');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-3">
      <div>
        <p className="font-semibold">{title}</p>
        {hint && <p className="text-xs text-slate-500">{hint}</p>}
      </div>
      <input
        inputMode="numeric"
        maxLength={6}
        className="w-full text-center text-2xl font-mono tracking-[0.3em] rounded-lg border border-slate-300 px-3 py-3"
        placeholder="——————"
        value={otp}
        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
      />
      <ErrorBox message={error} />
      <Button variant="success" disabled={busy || otp.length !== 6} onClick={submit}>
        {busy ? 'Verifying…' : 'Verify'}
      </Button>
    </div>
  );
}
