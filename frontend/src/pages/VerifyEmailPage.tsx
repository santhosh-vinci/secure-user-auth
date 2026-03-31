import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { authApi } from '../api/client';
import { BrandHeader } from '@/components/BrandHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) { setStatus('error'); setMessage('No verification token provided.'); return; }
    authApi.verifyEmail(token)
      .then((res) => {
        if (res.error) { setStatus('error'); setMessage(res.error); }
        else { setStatus('success'); setMessage(res.data?.message ?? 'Email verified successfully.'); }
      })
      .catch(() => { setStatus('error'); setMessage('Network error. Please try again.'); });
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-105 animate-slide-up">
        <BrandHeader title="Email Verification" subtitle="Confirming your email address" />
        <Card>
          <CardHeader>
            <CardTitle>Verifying your email</CardTitle>
            <CardDescription>Please wait while we verify your email address</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
