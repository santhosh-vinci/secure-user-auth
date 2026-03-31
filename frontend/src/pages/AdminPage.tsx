import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi, type AdminUser } from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const ROLES = ['USER', 'MODERATOR', 'ADMIN'] as const;
type Role = typeof ROLES[number];

const roleBadgeClass: Record<Role, string> = {
  USER: 'bg-gray-100 text-gray-700 border-gray-200',
  MODERATOR: 'bg-blue-50 text-blue-700 border-blue-200',
  ADMIN: 'bg-primary/10 text-primary border-primary/20',
};

export function AdminPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState<string | null>(null); // userId being updated
  const [roleSelections, setRoleSelections] = useState<Record<string, Role>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});

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
    setFeedback((prev) => ({ ...prev, [userId]: '' }));

    const res = await adminApi.updateRole(userId, newRole);

    if (res.error) {
      setFeedback((prev) => ({ ...prev, [userId]: res.error! }));
    } else {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
      setFeedback((prev) => ({ ...prev, [userId]: 'Role updated. User sessions invalidated.' }));
    }
    setUpdating(null);
  }

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1a1d2e]">Admin Panel</h1>
          <p className="text-sm text-muted mt-0.5">Signed in as <span className="font-medium">{user?.email}</span></p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
            Dashboard
          </Button>
          <Button variant="destructive" size="sm" onClick={handleLogout}>
            Sign out
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Users</CardTitle>
          <CardDescription>
            {user?.role === 'ADMIN'
              ? 'Manage roles for all registered accounts.'
              : 'View all registered accounts. Role changes require Admin access.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="flex items-center gap-2 py-8 justify-center text-sm text-muted">
              <span className="w-4 h-4 border-2 border-border border-t-primary rounded-full animate-spin-slow" />
              Loading users…
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 py-4 text-center">{error}</p>
          )}

          {!loading && !error && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted">Email</th>
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted">Status</th>
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted">Role</th>
                    {user?.role === 'ADMIN' && (
                      <>
                        <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted">Change Role</th>
                        <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-muted">Action</th>
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

                    return (
                      <tr key={u.id} className="group">
                        {/* Email + ID */}
                        <td className="py-3 pr-4">
                          <div className="font-medium text-[#1a1d2e]">{u.email}</div>
                          <div className="text-xs text-muted font-mono">{u.id}</div>
                          {isSelf && (
                            <span className="text-xs text-primary font-semibold">You</span>
                          )}
                        </td>

                        {/* Status badges */}
                        <td className="py-3 pr-4">
                          <div className="flex flex-col gap-1">
                            <span className={`inline-flex w-fit items-center rounded-md border px-2 py-0.5 text-xs font-medium ${u.isEmailVerified ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
                              {u.isEmailVerified ? 'Verified' : 'Unverified'}
                            </span>
                            {u.isLocked && (
                              <span className="inline-flex w-fit items-center rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                                Locked
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Current role badge */}
                        <td className="py-3 pr-4">
                          <span className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold ${roleBadgeClass[u.role as Role] ?? roleBadgeClass.USER}`}>
                            {u.role}
                          </span>
                        </td>

                        {/* Role selector + action — ADMIN only */}
                        {user?.role === 'ADMIN' && (
                          <>
                            <td className="py-3 pr-4">
                              <select
                                disabled={isSelf || busy}
                                value={selected}
                                onChange={(e) =>
                                  setRoleSelections((prev) => ({ ...prev, [u.id]: e.target.value as Role }))
                                }
                                className="rounded-md border border-border bg-background px-2 py-1.5 text-sm text-[#1a1d2e] focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                {ROLES.map((r) => (
                                  <option key={r} value={r}>{r}</option>
                                ))}
                              </select>
                            </td>

                            <td className="py-3">
                              <div className="flex flex-col gap-1">
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
                                {feedback[u.id] && (
                                  <p className={`text-xs ${feedback[u.id].startsWith('Role updated') ? 'text-green-600' : 'text-red-600'}`}>
                                    {feedback[u.id]}
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
  );
}
