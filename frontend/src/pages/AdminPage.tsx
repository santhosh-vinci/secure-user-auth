import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi, type AdminUser } from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const ROLES = ['USER', 'MODERATOR', 'ADMIN'] as const;
type Role = typeof ROLES[number];

const roleBadgeClass: Record<Role, string> = {
  USER:      'bg-gray-100 text-gray-600 border-gray-200',
  MODERATOR: 'bg-blue-50 text-blue-700 border-blue-200',
  ADMIN:     'bg-primary/10 text-primary border-primary/20',
};

export function AdminPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'ADMIN';

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [roleSelections, setRoleSelections] = useState<Record<string, Role>>({});
  const [feedback, setFeedback] = useState<Record<string, { msg: string; ok: boolean }>>({});

  useEffect(() => {
    adminApi.listUsers().then((res) => {
      if (res.error) {
        setError(res.error);
      } else if (res.data) {
        setUsers(res.data.users);
        const initial: Record<string, Role> = {};
        res.data.users.forEach((u) => { initial[u.id] = u.role as Role; });
        setRoleSelections(initial);
      }
      setLoading(false);
    });
  }, []);

  async function handleRoleChange(userId: string) {
    const newRole = roleSelections[userId];
    const target = users.find((u) => u.id === userId);
    if (!target || target.role === newRole) return;

    setUpdating(userId);
    setFeedback((prev) => ({ ...prev, [userId]: { msg: '', ok: false } }));

    const res = await adminApi.updateRole(userId, newRole);

    if (res.error) {
      setFeedback((prev) => ({ ...prev, [userId]: { msg: res.error!, ok: false } }));
    } else {
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
      setFeedback((prev) => ({ ...prev, [userId]: { msg: 'Role updated. Sessions invalidated.', ok: true } }));
    }
    setUpdating(null);
  }

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#1a1d2e]">
              {isAdmin ? 'Admin Panel' : 'User Directory'}
            </h1>
            <p className="text-sm text-muted mt-0.5">
              Signed in as <span className="font-medium text-[#1a1d2e]">{user?.email}</span>
              <span className={`ml-2 inline-flex items-center rounded-lg border px-2 py-px text-xs font-semibold ${roleBadgeClass[user?.role as Role] ?? roleBadgeClass.USER}`}>
                {user?.role}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
              ← Dashboard
            </Button>
            <Button variant="destructive" size="sm" onClick={handleLogout}>
              Sign out
            </Button>
          </div>
        </div>

        {/* Table card */}
        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
            <CardDescription>
              {isAdmin
                ? 'Manage roles for all registered accounts. Role changes immediately invalidate all active sessions.'
                : 'View all registered accounts. Role changes require Admin access.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading && (
              <div className="flex items-center justify-center gap-2.5 py-12 text-sm text-muted">
                <span className="w-4 h-4 border-2 border-border border-t-primary rounded-full animate-spin-slow" />
                Loading users…
              </div>
            )}

            {error && (
              <p className="text-sm text-error text-center py-8">{error}</p>
            )}

            {!loading && !error && (
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left pb-3 pr-6 text-xs font-semibold uppercase tracking-wider text-muted">User</th>
                      <th className="text-left pb-3 pr-6 text-xs font-semibold uppercase tracking-wider text-muted">Status</th>
                      <th className="text-left pb-3 pr-6 text-xs font-semibold uppercase tracking-wider text-muted">Role</th>
                      {isAdmin && (
                        <>
                          <th className="text-left pb-3 pr-6 text-xs font-semibold uppercase tracking-wider text-muted">Change to</th>
                          <th className="text-left pb-3 text-xs font-semibold uppercase tracking-wider text-muted">Action</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {users.map((u) => {
                      const isSelf = u.id === user?.id;
                      const selected = roleSelections[u.id] as Role;
                      const changed = selected !== u.role;
                      const busy = updating === u.id;
                      const fb = feedback[u.id];

                      return (
                        <tr key={u.id} className="group hover:bg-background/60 transition-colors">
                          {/* User info */}
                          <td className="py-3.5 pr-6">
                            <div className="font-medium text-[#1a1d2e] leading-tight">{u.email}</div>
                            <div className="text-xs text-muted font-mono mt-0.5 truncate max-w-44">{u.id}</div>
                            {isSelf && (
                              <span className="text-[11px] text-primary font-semibold">You</span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 pr-6">
                            <div className="flex flex-col gap-1">
                              <span className={`inline-flex w-fit items-center rounded-lg border px-2 py-px text-xs font-medium ${u.isEmailVerified ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                {u.isEmailVerified ? 'Verified' : 'Unverified'}
                              </span>
                              {u.isLocked && (
                                <span className="inline-flex w-fit items-center rounded-lg border border-red-200 bg-red-50 px-2 py-px text-xs font-medium text-red-700">
                                  Locked
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Current role */}
                          <td className="py-3.5 pr-6">
                            <span className={`inline-flex items-center rounded-lg border px-2.5 py-0.5 text-xs font-semibold ${roleBadgeClass[u.role as Role] ?? roleBadgeClass.USER}`}>
                              {u.role}
                            </span>
                          </td>

                          {/* Role selector + save — admin only */}
                          {isAdmin && (
                            <>
                              <td className="py-3.5 pr-6">
                                <select
                                  disabled={isSelf || busy}
                                  value={selected}
                                  onChange={(e) =>
                                    setRoleSelections((prev) => ({ ...prev, [u.id]: e.target.value as Role }))
                                  }
                                  className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm text-[#1a1d2e] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                >
                                  {ROLES.map((r) => (
                                    <option key={r} value={r}>{r}</option>
                                  ))}
                                </select>
                              </td>

                              <td className="py-3.5">
                                <div className="space-y-1">
                                  <Button
                                    size="sm"
                                    disabled={!changed || isSelf || busy}
                                    onClick={() => handleRoleChange(u.id)}
                                  >
                                    {busy ? (
                                      <span className="flex items-center gap-1.5">
                                        <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin-slow" />
                                        Saving…
                                      </span>
                                    ) : 'Save'}
                                  </Button>
                                  {fb?.msg && (
                                    <p className={`text-xs ${fb.ok ? 'text-success' : 'text-error'}`}>
                                      {fb.msg}
                                    </p>
                                  )}
                                  {isSelf && (
                                    <p className="text-xs text-muted">Cannot change own role</p>
                                  )}
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
