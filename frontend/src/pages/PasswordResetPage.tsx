import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { authApi } from '../api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';

function BrandHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="text-center mb-8">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
        <span className="text-primary text-xl">⬡</span>
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-[#1a1d2e]">{title}</h1>
      <p className="text-sm text-muted mt-1">{subtitle}</p>
    </div>
  );
}

function Spinner() {
  return <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin-slow" />;
}

export function PasswordResetPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pending, setPending] = useState(false);

  async function handleRequest(e: { preventDefault(): void }) {
    e.preventDefault();
    setError(''); setSuccess(''); setPending(true);
    const res = await authApi.requestPasswordReset(email);
    setPending(false);
    if (res.error) setError(res.error);
    else setSuccess(res.data?.message ?? 'If that email is registered, a reset link has been sent.');
  }

  async function handleReset(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!token) return;
    setError(''); setSuccess(''); setPending(true);
    const res = await authApi.resetPassword(token, password);
    setPending(false);
    if (res.error) setError(res.error);
    else setSuccess('Password reset successful.');
  }

  if (token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md animate-slide-up">
          <BrandHeader title="Set new password" subtitle="Choose a strong new password" />
          <Card>
            <CardHeader className="pb-4">
              <CardTitle>Reset password</CardTitle>
              <CardDescription>Enter your new password below</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleReset} noValidate className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="password">New password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                {error && <Alert variant="error">{error}</Alert>}
                {success && (
                  <Alert variant="success">
                    {success}{' '}
                    <Link to="/login" className="underline font-medium">Sign in</Link>
                  </Alert>
                )}
                <Button type="submit" size="full" disabled={pending}>
                  {pending ? <span className="flex items-center gap-2"><Spinner />Resetting…</span> : 'Reset password'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-slide-up">
        <BrandHeader title="Forgot password?" subtitle="We'll send you a reset link" />
        <Card>
          <CardHeader className="pb-4">
            <CardTitle>Reset password</CardTitle>
            <CardDescription>Enter your email to receive a reset link</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRequest} noValidate className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {error && <Alert variant="error">{error}</Alert>}
              {success && <Alert variant="success">{success}</Alert>}
              <Button type="submit" size="full" disabled={pending}>
                {pending ? <span className="flex items-center gap-2"><Spinner />Sending…</span> : 'Send reset link'}
              </Button>
            </form>
            <div className="mt-6 text-center text-sm text-muted">
              <Link to="/login" className="text-primary font-medium hover:underline">← Back to sign in</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
