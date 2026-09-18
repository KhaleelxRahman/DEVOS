import React, { useState } from 'react';
import { Card, Button, Input } from '../components/common';
import { Terminal } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api';
import { useAuth } from '../hooks/useAuth';
import { useSeo } from '../hooks/useSeo';

export const LoginPage: React.FC = () => {
  useSeo({ title: 'Sign In', noindex: false });

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await authApi.login({ email, password });
      if (res.success && res.data?.user && res.data.token) {
        login(res.data.token, res.data.user);
        navigate('/app/dashboard');
      } else {
        setError(res.error?.message || 'Login failed');
      }
    } catch (err: any) {
      setError(err.message || 'Unable to log in');
    } finally {
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
            {error && (
              <div style={{ padding: 'var(--space-3)', backgroundColor: 'var(--color-error-bg)', color: 'var(--color-error)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-size-xs)', marginBottom: 'var(--space-4)' }}>
                {error}
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

