import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import type { Permission } from './permissions';

export function RequireAuth({ permission }: { permission?: Permission }) {
  const { user, initialising, can } = useAuth();
  const location = useLocation();

  // Waehrend die Session geprueft wird, nichts rendern - sonst blitzt der
  // Login-Screen bei jedem Reload kurz auf.
  if (initialising) return null;

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (permission && !can(permission)) {
    return <Navigate to="/kampagnen" replace />;
  }

  return <Outlet />;
}
