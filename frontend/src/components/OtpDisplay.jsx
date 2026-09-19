/**
 * Shows an OTP to the household. The prototype label is deliberate and must
 * stay on screen: there is no SMS gateway, so we show the code instead.
 */
export default function OtpDisplay({ label, otp, hint }) {
  return (
    <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 text-center space-y-1">
      <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-mono font-bold tracking-[0.3em] text-amber-900">
        {otp || '——————'}
      </p>
      {hint && <p className="text-xs text-amber-700">{hint}</p>}
      <p className="text-[10px] text-amber-600 pt-1">
        Prototype: shown on screen. Production sends this by SMS.
      </p>
    </div>
  );
}
