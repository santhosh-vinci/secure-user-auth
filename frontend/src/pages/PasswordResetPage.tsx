import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { authApi } from '../api/client';
import { BrandHeader } from '@/components/BrandHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';

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
        <div className="w-full max-w-105 animate-slide-up">
          <BrandHeader title="Set new password" subtitle="Choose a strong new password" />
          <Card>
            <CardHeader>
              <CardTitle>Reset password</CardTitle>
              <CardDescription>Enter your new password below</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleReset} noValidate className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="password">New password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                {error && <Alert variant="error">{error}</Alert>}
                {success && (
                  <Alert variant="success">
                    {success}{' '}
                    <Link to="/login" className="underline font-semibold">Sign in</Link>
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
      <div className="w-full max-w-105 animate-slide-up">
        <BrandHeader title="Forgot password?" subtitle="We'll send you a reset link" />
        <Card>
          <CardHeader>
            <CardTitle>Reset password</CardTitle>
            <CardDescription>Enter your email to receive a reset link</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRequest} noValidate className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
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
            <p className="mt-6 text-center text-sm text-muted">
              <Link to="/login" className="text-primary font-semibold hover:underline">← Back to sign in</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
