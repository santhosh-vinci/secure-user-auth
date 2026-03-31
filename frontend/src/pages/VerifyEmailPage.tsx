import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { authApi } from '../api/client';
import { BrandHeader } from '@/components/BrandHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function handleVerify() {
    if (!token) { setStatus('error'); setMessage('No verification token provided.'); return; }
    setStatus('loading');
    try {
      const res = await authApi.verifyEmail(token);
      if (res.error) { setStatus('error'); setMessage(res.error); }
      else { setStatus('success'); setMessage(res.data?.message ?? 'Email verified successfully.'); }
    } catch {
      setStatus('error');
      setMessage('Network error. Please try again.');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-105 animate-slide-up">
        <BrandHeader title="Email Verification" subtitle="Confirm your email address" />
        <Card>
          <CardHeader>
            <CardTitle>Verify your email</CardTitle>
            <CardDescription>Click the button below to confirm your email address.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {status === 'idle' && (
              <>
                {!token && (
                  <Alert variant="error">No verification token found. Please use the link from your email.</Alert>
                )}
                {token && (
                  <Button size="full" onClick={handleVerify}>
                    Confirm email address
                  </Button>
                )}
              </>
            )}

            {status === 'loading' && (
              <div className="flex items-center gap-3 text-muted text-sm py-2">
                <span className="w-4 h-4 border-2 border-border border-t-primary rounded-full animate-spin-slow shrink-0" />
                Verifying…
              </div>
            )}

            {status === 'success' && (
              <>
                <Alert variant="success">{message}</Alert>
                <Button asChild size="full">
                  <Link to="/login">Continue to sign in</Link>
                </Button>
              </>
            )}

            {status === 'error' && (
              <>
                <Alert variant="error">{message}</Alert>
                <Button asChild variant="outline" size="full">
                  <Link to="/login">Back to sign in</Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
