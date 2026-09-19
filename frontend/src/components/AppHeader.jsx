import { useNavigate } from 'react-router-dom';
import { getUser, clearSession } from '../lib/api';

export default function AppHeader() {
  const navigate = useNavigate();
  const user = getUser();
  return (
    <header className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
      <div>
        <h1 className="font-bold tracking-wide">WorkSphere</h1>
        <p className="text-xs text-slate-300">
          {user ? `${user.full_name} · ${user.role}` : 'Cooperative Gig Services'}
        </p>
      </div>
      {user && (
        <button
          className="text-xs underline text-slate-300"
          onClick={() => { clearSession(); navigate('/login', { replace: true }); }}>
          Sign out
        </button>
      )}
    </header>
  );
}
