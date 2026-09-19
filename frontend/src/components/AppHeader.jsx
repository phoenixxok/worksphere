import { useNavigate } from 'react-router-dom';
import { getUser, clearSession } from '../lib/api';
import Badge from './Badge';

export default function AppHeader() {
  const navigate = useNavigate();
  const user = getUser();
  
  let roleBadge = null;
  if (user?.role === 'household') roleBadge = <Badge className="bg-blue-700 text-blue-100 ml-4">HOUSEHOLD</Badge>;
  else if (user?.role === 'worker') roleBadge = <Badge className="bg-amber-700 text-amber-100 ml-4">WORKER</Badge>;
  else if (user?.role === 'admin') roleBadge = <Badge className="bg-purple-700 text-purple-100 ml-4">CO-OP ADMIN</Badge>;

  return (
    <header className="bg-slate-900 text-white w-full">
      <div className="mx-auto w-full max-w-6xl px-6 py-3 flex items-center justify-between">
        <div>
          <div className="flex items-center">
            <h1 className="font-bold tracking-wide">WorkSphere</h1>
            {roleBadge}
          </div>
          <p className="text-xs text-slate-300 mt-1">
            {user ? `${user.full_name} · ${user.role}` : 'Cooperative Gig Services'}
          </p>
        </div>
        {user && (
          <button
            className="text-xs underline text-slate-300 ml-4"
            onClick={() => { clearSession(); navigate('/login', { replace: true }); }}>
            Sign out
          </button>
        )}
      </div>
    </header>
  );
}
