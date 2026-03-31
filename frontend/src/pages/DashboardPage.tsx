import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const roleBadgeClass: Record<string, string> = {
  USER:      'bg-gray-100 text-gray-600 border-gray-200',
  MODERATOR: 'bg-blue-50 text-blue-700 border-blue-200',
  ADMIN:     'bg-primary/10 text-primary border-primary/20',
};

export function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-105 animate-slide-up">
        {/* Brand mark */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/15 mb-5 shadow-[0_2px_12px_rgba(108,99,255,0.15)]">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" className="text-primary">
              <path d="M12 2L3 7v10l9 5 9-5V7L12 2z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" fill="rgba(108,99,255,0.12)" />
              <path d="M12 2v20M3 7l9 5 9-5" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="text-[22px] font-bold tracking-tight text-[#1a1d2e]">Dashboard</h1>
          <p className="text-sm text-muted mt-1.5">You are securely signed in</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Your current session details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Info rows */}
            <div className="rounded-xl border border-border bg-background divide-y divide-border overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">Email</span>
                <span className="text-sm text-[#1a1d2e] font-medium">{user?.email}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">Role</span>
                <span className={`inline-flex items-center rounded-lg border px-2.5 py-0.5 text-xs font-semibold ${roleBadgeClass[user?.role ?? 'USER'] ?? roleBadgeClass.USER}`}>
                  {user?.role}
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">User ID</span>
                <span className="text-xs text-muted font-mono truncate max-w-44">{user?.id}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2.5 pt-1">
              {(user?.role === 'ADMIN' || user?.role === 'MODERATOR') && (
                <Link to="/admin" className="block">
                  <Button variant="outline" size="full">
                    {user.role === 'ADMIN' ? 'Admin Panel' : 'User Directory'}
                  </Button>
                </Link>
              )}
              <Button variant="destructive" size="full" onClick={handleLogout}>
                Sign out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
