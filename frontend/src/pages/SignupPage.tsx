import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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

    // Client-side empty checks first
    const errs: Record<string, string[]> = {};
    if (!email.trim()) errs.email = ['Please fill in your email.'];
    if (!password) errs.password = ['Please fill in your password.'];
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return; }

    setPending(true);
    const result = await signup(email, password);
    setPending(false);
    if (result.error) {
      if (result.details?.password?.length) {
        // Collapse all password rule errors into one line
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
            <span className="text-primary text-xl">⬡</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1a1d2e]">Create account</h1>
          <p className="text-sm text-muted mt-1">Start with a free account</p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle>Sign up</CardTitle>
            <CardDescription>Fill in the details below to get started</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  error={!!fieldErrors.email}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {fieldErrors.email?.map((msg) => (
                  <p key={msg} className="text-xs text-error flex items-center gap-1">
                    {msg}
                  </p>
                ))}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                  error={!!fieldErrors.password}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                {fieldErrors.password?.map((msg) => (
                  <p key={msg} className="text-xs text-error flex items-center gap-1">
                    {msg}
                  </p>
                ))}
                {password.length > 0 && (
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    {rules.map((r) => (
                      <span
                        key={r.label}
                        className={`text-xs flex items-center gap-1.5 transition-colors ${
                          r.test(password) ? 'text-success' : 'text-muted/50'
                        }`}
                      >
                        <span className="text-[10px]">{r.test(password) ? '●' : '○'}</span>
                        {r.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {error && <Alert variant="error">{error}</Alert>}
              {success && <Alert variant="success">{success}</Alert>}

              <Button type="submit" size="full" disabled={pending} className="mt-2">
                {pending ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin-slow" />
                    Creating account…
                  </span>
                ) : 'Create account'}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-muted">
              Already have an account?{' '}
              <Link to="/login" className="text-primary font-medium hover:underline">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
