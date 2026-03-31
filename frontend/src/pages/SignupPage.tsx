import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BrandHeader } from '@/components/BrandHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';

const rules = [
  { label: '12+ characters',    test: (p: string) => p.length >= 12 },
  { label: 'Uppercase letter',  test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Lowercase letter',  test: (p: string) => /[a-z]/.test(p) },
  { label: 'Number',            test: (p: string) => /[0-9]/.test(p) },
  { label: 'Special character', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export function SignupPage() {
  const { signup } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setError(''); setSuccess(''); setFieldErrors({});

    const errs: Record<string, string[]> = {};
    if (!email.trim()) errs.email = ['Please fill in your email.'];
    if (!password) errs.password = ['Please fill in your password.'];
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return; }

    setPending(true);
    const result = await signup(email, password);
    setPending(false);

    if (result.error) {
      if (result.details?.password?.length) {
        setFieldErrors({ ...result.details, password: ['Password does not meet the requirements below.'] });
      } else if (result.details && Object.keys(result.details).length > 0) {
        setFieldErrors(result.details);
      } else {
        setError(result.error);
      }
    } else {
      setSuccess(result.message ?? 'Check your email to verify your account.');
      setEmail(''); setPassword('');
    }
  }

  const passedCount = rules.filter((r) => r.test(password)).length;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-105 animate-slide-up">
        <BrandHeader title="Create account" subtitle="Start with a free account" />

        <Card>
          <CardHeader>
            <CardTitle>Sign up</CardTitle>
            <CardDescription>Fill in the details below to get started</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  error={!!fieldErrors.email}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {fieldErrors.email?.map((msg) => (
                  <p key={msg} className="text-xs text-error">{msg}</p>
                ))}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  error={!!fieldErrors.password}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                {fieldErrors.password?.map((msg) => (
                  <p key={msg} className="text-xs text-error">{msg}</p>
                ))}

                {/* Password strength */}
                {password.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {/* Progress bar */}
                    <div className="flex gap-1">
                      {rules.map((_, i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                            i < passedCount ? 'bg-primary' : 'bg-border'
                          }`}
                        />
                      ))}
                    </div>
                    {/* Rules grid */}
                    <div className="grid grid-cols-2 gap-1">
                      {rules.map((r) => (
                        <span
                          key={r.label}
                          className={`text-xs flex items-center gap-1.5 transition-colors ${
                            r.test(password) ? 'text-success' : 'text-muted/60'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${r.test(password) ? 'bg-success' : 'bg-muted/30'}`} />
                          {r.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {error && <Alert variant="error">{error}</Alert>}
              {success && <Alert variant="success">{success}</Alert>}

              <Button type="submit" size="full" disabled={pending}>
                {pending ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin-slow" />
                    Creating account…
                  </span>
                ) : 'Create account'}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted">
              Already have an account?{' '}
              <Link to="/login" className="text-primary font-semibold hover:underline">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
