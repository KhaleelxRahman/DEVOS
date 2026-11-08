import React, { useEffect, useRef, useState } from 'react';
import { Card, Button, Input } from '../components/common';
import { Terminal } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { authApi } from '../api';
import { useAuth } from '../hooks/useAuth';
import { useSeo } from '../hooks/useSeo';
import { SESSION_EXPIRED_KEY } from '../api/client';

function resolveSafeNextPath(search: string): string {
  try {
    const params = new URLSearchParams(search);
    const next = params.get('next');
    if (
      next &&
      next.startsWith('/') &&
      !next.startsWith('//') &&
      !next.startsWith('/login') &&
      !next.startsWith('/register')
    ) {
      return next;
    }
  } catch {
    // Ignore malformed query string
  }
  return '/app/dashboard';
}

export const LoginPage: React.FC = () => {
  useSeo({ title: 'Sign In', noindex: false });

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [slowNotice, setSlowNotice] = useState<boolean>(false);
  // Phase 10 A2: explains WHY the user was returned here, without leaking the
  // 401, the token, or any backend detail.
  const [sessionExpired] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(SESSION_EXPIRED_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const submittingRef = useRef<boolean>(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Read once on arrival; a later visit to /login must not re-show it.
  useEffect(() => {
    if (!sessionExpired) return;
    try {
      sessionStorage.removeItem(SESSION_EXPIRED_KEY);
    } catch {
      // Nothing to do - the message is already on screen.
    }
  }, [sessionExpired]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current || isLoading) return;

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Please enter both your email address and password.');
      return;
    }

    submittingRef.current = true;
    setError('');
    setSlowNotice(false);
    setIsLoading(true);
    const slowTimer = window.setTimeout(() => setSlowNotice(true), 1000);

    try {
      const res = await authApi.login({ email: trimmedEmail, password });
      if (res.success && res.data?.user && res.data.token) {
        login(res.data.token, res.data.user);
        navigate(resolveSafeNextPath(location.search));
      } else {
        setError(res.error?.message || 'Login failed');
      }
    } catch (err: any) {
      setError(err.message || 'Unable to log in');
    } finally {
      window.clearTimeout(slowTimer);
      setSlowNotice(false);
      submittingRef.current = false;
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 'var(--space-4)', backgroundColor: 'var(--color-background)' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
            <Terminal size={24} color="var(--color-accent)" />
            <span style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, letterSpacing: '0.05em' }}>DEVOS v1.0.0</span>
          </div>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
            Sign in to your AI developer workspace
          </p>
        </div>

        <Card>
          <form onSubmit={handleSubmit}>
            {sessionExpired && (
              <div
                role="status"
                style={{ padding: 'var(--space-3)', backgroundColor: 'var(--color-error-bg)', color: 'var(--color-error)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-size-xs)', marginBottom: 'var(--space-4)' }}
              >
                Session expired. Please sign in again.
              </div>
            )}
            {error && (
              <div role="alert" style={{ padding: 'var(--space-3)', backgroundColor: 'var(--color-error-bg)', color: 'var(--color-error)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-size-xs)', marginBottom: 'var(--space-4)' }}>
                {error}
              </div>
            )}
            {slowNotice && !error && (
              <div role="status" style={{ padding: 'var(--space-2) var(--space-3)', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)', marginBottom: 'var(--space-3)' }}>
                Still signing in — waiting for server response…
              </div>
            )}
            <Input
              label="Email Address"
              type="email" autoComplete="email"
              placeholder="developer@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Password"
              type="password" autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button type="submit" variant="primary" isLoading={isLoading} style={{ width: '100%', marginTop: 'var(--space-2)' }}>
              Sign In
            </Button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 'var(--space-4)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: 'var(--color-accent)' }}>
              Create an account
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};

