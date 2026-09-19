/**
 * Shows an OTP to the household. The prototype label is deliberate and must
 * stay on screen: there is no SMS gateway, so we show the code instead.
 */
export default function OtpDisplay({ label, otp, hint }) {
  return (
    <div className="bg-amber-50 border border-amber-300 rounded-xl p-6 text-center space-y-2">
      <p className="text-sm font-semibold text-amber-800 uppercase tracking-wide">{label}</p>
      <p className="text-4xl font-mono font-bold tabular-nums tracking-[0.3em] text-amber-900 py-2">
        {otp || '——————'}
      </p>
      {hint && <p className="text-sm text-amber-700">{hint}</p>}
      <p className="text-xs text-amber-600 pt-2">
        Prototype: shown on screen. Production sends this by SMS.
      </p>
    </div>
  );
}
