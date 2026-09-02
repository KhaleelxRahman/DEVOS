import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';
import {
  Lock,
  Mail,
  User as UserIcon,
  Eye,
  EyeOff,
  CheckCircle2,
  ShieldCheck,
  KeyRound,
  ArrowRight,
} from 'lucide-react';

export const AuthModal: React.FC = () => {
  const {
    showAuthModal,
    authModalMode,
    closeAuthModal,
    login,
    register,
    forgotPassword,
    resetPassword,
  } = useAuth();
  const { toast } = useToast();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'reset'>(authModalMode || 'login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Synchronize internal mode with context
  React.useEffect(() => {
    setMode(authModalMode);
    setSuccessMessage(null);
  }, [authModalMode, showAuthModal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessMessage(null);

    try {
      if (mode === 'login') {
        if (!email.trim() || !password) {
          toast('Please fill in both email and password', 'warning');
          setIsSubmitting(false);
          return;
        }
        const res = await login({ email: email.trim(), password, remember_me: rememberMe });
        if (res.success) {
          toast('Successfully signed in to DEVOS', 'success');
          closeAuthModal();
        } else {
          toast(res.error || 'Invalid email or password', 'error');
        }
      } else if (mode === 'register') {
        if (!name.trim() || !email.trim() || !password) {
          toast('Please complete all required fields', 'warning');
          setIsSubmitting(false);
          return;
        }
        if (password.length < 6) {
          toast('Password must be at least 6 characters', 'warning');
          setIsSubmitting(false);
          return;
        }
        if (password !== confirmPassword) {
          toast('Passwords do not match', 'error');
          setIsSubmitting(false);
          return;
        }
        const res = await register({
          name: name.trim(),
          email: email.trim(),
          password,
          remember_me: rememberMe,
        });
        if (res.success) {
          toast('Account created successfully! Welcome to DEVOS.', 'success');
          closeAuthModal();
        } else {
          toast(res.error || 'Failed to create account', 'error');
        }
      } else if (mode === 'forgot') {
        if (!email.trim()) {
          toast('Please enter your email address', 'warning');
          setIsSubmitting(false);
          return;
        }
        const res = await forgotPassword({ email: email.trim() });
        if (res.success) {
          setSuccessMessage(res.message || 'Password reset instructions have been generated.');
          toast('Password reset link prepared', 'success');
          // For easy demo, auto-fill demo reset token
          setResetToken('demo_token_' + Math.random().toString(36).substring(2, 8));
        } else {
          toast(res.error || 'Could not process password reset', 'error');
        }
      } else if (mode === 'reset') {
        if (!resetToken.trim() || !password) {
          toast('Please enter the reset token and new password', 'warning');
          setIsSubmitting(false);
          return;
        }
        if (password.length < 6) {
          toast('Password must be at least 6 characters', 'warning');
          setIsSubmitting(false);
          return;
        }
        const res = await resetPassword({ token: resetToken.trim(), password });
        if (res.success) {
          toast('Password updated successfully! Please sign in with your new password.', 'success');
          setMode('login');
        } else {
          toast(res.error || 'Failed to reset password', 'error');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'register':
        return 'Create Your DEVOS Account';
      case 'forgot':
        return 'Reset Your Password';
      case 'reset':
        return 'Set New Password';
      default:
        return 'Sign In to DEVOS';
    }
  };

  const getSubtitle = () => {
    switch (mode) {
      case 'register':
        return 'Start building with isolated cloud workspaces and AI App Factory.';
      case 'forgot':
        return 'Enter your registered email to receive a password reset token.';
      case 'reset':
        return 'Enter your reset token and your new secure password.';
      default:
        return 'Access your private repositories, terminal sessions, and AI context.';
    }
  };

  return (
    <Modal
      isOpen={showAuthModal}
      onClose={closeAuthModal}
      title={getTitle()}
      subtitle={getSubtitle()}
      size="md"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {/* Mode Switch Tabs (Login / Register) */}
        {(mode === 'login' || mode === 'register') && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 4,
              background: 'var(--color-surface-elevated)',
              padding: 4,
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-border)',
            }}
          >
            <button
              type="button"
              onClick={() => setMode('login')}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: mode === 'login' ? 'var(--color-surface)' : 'transparent',
                color: mode === 'login' ? 'var(--color-accent)' : 'var(--color-text-muted)',
                boxShadow: mode === 'login' ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
                transition: 'all 150ms ease',
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: mode === 'register' ? 'var(--color-surface)' : 'transparent',
                color: mode === 'register' ? 'var(--color-accent)' : 'var(--color-text-muted)',
                boxShadow: mode === 'register' ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
                transition: 'all 150ms ease',
              }}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Success Banner (if any) */}
        {successMessage && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#10b981',
              fontSize: 'var(--font-size-xs)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <CheckCircle2 size={16} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Main Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {mode === 'register' && (
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 600,
                  color: 'var(--color-text-secondary)',
                  marginBottom: 4,
                }}
              >
                Full Name
              </label>
              <div style={{ position: 'relative' }}>
                <UserIcon
                  size={16}
                  style={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--color-text-muted)',
                  }}
                />
                <input
                  type="text"
                  placeholder="e.g. Ada Lovelace"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px 9px 36px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface)',
                    color: 'var(--color-text-primary)',
                    fontSize: 'var(--font-size-sm)',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          )}

          {mode !== 'reset' && (
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 600,
                  color: 'var(--color-text-secondary)',
                  marginBottom: 4,
                }}
              >
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail
                  size={16}
                  style={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--color-text-muted)',
                  }}
                />
                <input
                  type="email"
                  placeholder="developer@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px 9px 36px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface)',
                    color: 'var(--color-text-primary)',
                    fontSize: 'var(--font-size-sm)',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          )}

          {mode === 'reset' && (
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 600,
                  color: 'var(--color-text-secondary)',
                  marginBottom: 4,
                }}
              >
                Reset Token
              </label>
              <div style={{ position: 'relative' }}>
                <KeyRound
                  size={16}
                  style={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--color-text-muted)',
                  }}
                />
                <input
                  type="text"
                  placeholder="Paste your reset token"
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px 9px 36px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface)',
                    color: 'var(--color-text-primary)',
                    fontSize: 'var(--font-size-sm)',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          )}

          {mode !== 'forgot' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <label
                  style={{
                    fontSize: 'var(--font-size-xs)',
                    fontWeight: 600,
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  {mode === 'reset' ? 'New Password' : 'Password'}
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      fontSize: '11px',
                      color: 'var(--color-accent)',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={16}
                  style={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--color-text-muted)',
                  }}
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '9px 36px 9px 36px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface)',
                    color: 'var(--color-text-primary)',
                    fontSize: 'var(--font-size-sm)',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-text-muted)',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}

          {mode === 'register' && (
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 600,
                  color: 'var(--color-text-secondary)',
                  marginBottom: 4,
                }}
              >
                Confirm Password
              </label>
              <div style={{ position: 'relative' }}>
                <ShieldCheck
                  size={16}
                  style={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--color-text-muted)',
                  }}
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px 9px 36px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface)',
                    color: 'var(--color-text-primary)',
                    fontSize: 'var(--font-size-sm)',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          )}

          {/* Remember Me */}
          {(mode === 'login' || mode === 'register') && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <input
                type="checkbox"
                id="remember_me_chk"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <label
                htmlFor="remember_me_chk"
                style={{
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-text-muted)',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                Remember this device for 30 days
              </label>
            </div>
          )}

          {/* Submit Button */}
          <div style={{ marginTop: 'var(--space-2)' }}>
            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting}
              style={{ width: '100%', justifyContent: 'center' }}
              rightIcon={<ArrowRight size={15} />}
            >
              {mode === 'login'
                ? 'Sign In to Workspace'
                : mode === 'register'
                ? 'Create New Account'
                : mode === 'forgot'
                ? 'Send Reset Token'
                : 'Save New Password'}
            </Button>
          </div>

          {/* Bottom helper switches */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, fontSize: 'var(--font-size-xs)', marginTop: 8, color: 'var(--color-text-muted)' }}>
            {mode === 'forgot' && (
              <button
                type="button"
                onClick={() => setMode('login')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-accent)',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                &larr; Back to Sign In
              </button>
            )}
            {mode === 'forgot' && resetToken && (
              <button
                type="button"
                onClick={() => setMode('reset')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#10b981',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Proceed to Enter Token &rarr;
              </button>
            )}
            {mode === 'reset' && (
              <button
                type="button"
                onClick={() => setMode('login')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-accent)',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                &larr; Back to Sign In
              </button>
            )}
          </div>
        </form>
      </div>
    </Modal>
  );
};
