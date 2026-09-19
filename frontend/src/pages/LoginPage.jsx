import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setSession } from '../lib/api';
import { DEMO_ACCOUNTS, HOME_ROUTE_BY_ROLE } from '../lib/demoAccounts';
import Button from '../components/Button';
import ErrorBox from '../components/ErrorBox';

export default function LoginPage() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function doLogin(p, pw) {
    setError(null);
    setBusy(true);
    try {
      const data = await api.login(p, pw);
      setSession(data.token, data.user);
      navigate(HOME_ROUTE_BY_ROLE[data.user.role] || '/health', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-md mx-auto space-y-6 pt-12">
      <div>
        <h2 className="text-lg font-bold">Sign in</h2>
        <p className="text-sm text-slate-500">Use a demo account or enter a phone number.</p>
      </div>

      <div className="space-y-2">
        {DEMO_ACCOUNTS.map((a) => (
          <Button key={a.phone} variant="secondary" disabled={busy}
                  onClick={() => doLogin(a.phone, a.password)}>
            {a.label}
          </Button>
        ))}
      </div>

      <div className="border-t border-slate-200 pt-4 space-y-3">
        <input
          aria-label="Phone number"
          className="w-full rounded-lg border border-slate-300 px-3 py-3"
          placeholder="Phone number" value={phone}
          onChange={(e) => setPhone(e.target.value)} />
        <input
          aria-label="Password"
          className="w-full rounded-lg border border-slate-300 px-3 py-3"
          placeholder="Password" type="password" value={password}
          onChange={(e) => setPassword(e.target.value)} />
        <ErrorBox message={error} />
        <Button disabled={busy || !phone || !password} onClick={() => doLogin(phone, password)}>
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
      </div>
    </div>
  );
}
