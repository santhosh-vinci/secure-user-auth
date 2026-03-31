import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  requiredRole?: string;
  requiredRoles?: string[];
}

export function ProtectedRoute({ requiredRole, requiredRoles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gap-2 text-sm text-muted">
        <span className="w-4 h-4 border-2 border-border border-t-primary rounded-full animate-spin-slow" />
        Loading…
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  const allowed = requiredRoles ?? (requiredRole ? [requiredRole] : null);
  if (allowed && !allowed.includes(user.role)) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}
