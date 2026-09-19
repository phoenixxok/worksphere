import { Navigate } from 'react-router-dom';
import { getUser, getToken } from '../lib/api';

/** Wraps a route. Sends you to /login if not signed in, or to your own home if the role is wrong. */
export default function RequireRole({ role, children }) {
  const token = getToken();
  const user = getUser();
  if (!token || !user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to="/login" replace />;
  return children;
}
