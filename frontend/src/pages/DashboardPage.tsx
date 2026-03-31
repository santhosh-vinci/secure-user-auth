import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
            <span className="text-primary text-xl">⬡</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1a1d2e]">Dashboard</h1>
          <p className="text-sm text-muted mt-1">You are securely signed in</p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle>Account</CardTitle>
            <CardDescription>Your session details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-border bg-background divide-y divide-border">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">Email</span>
                <span className="text-sm text-[#1a1d2e] font-medium">{user?.email}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">Role</span>
                <span className="inline-flex items-center rounded-md border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  {user?.role}
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">User ID</span>
                <span className="text-xs text-muted font-mono truncate max-w-[180px]">{user?.id}</span>
              </div>
            </div>

            {(user?.role === 'ADMIN' || user?.role === 'MODERATOR') && (
              <Link to="/admin">
                <Button variant="outline" size="full">
                  {user.role === 'ADMIN' ? 'Admin Panel' : 'User Directory'}
                </Button>
              </Link>
            )}

            <Button variant="destructive" size="full" onClick={handleLogout}>
              Sign out
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
