import { GitHubConnectButton } from "./GitHubConnectButton";
import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';
import { motion, AnimatePresence } from 'framer-motion';
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
  Sparkles,
  Terminal,
  Cpu,
  Layers,
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

  // Password strength calculation
  const getPasswordStrength = () => {
    if (!password) return { label: '', width: '0%', color: 'transparent' };
    if (password.length < 6) return { label: 'Weak', width: '33%', color: '#60a5fa' };
    if (password.length < 10) return { label: 'Fair', width: '66%', color: '#3b82f6' };
    return { label: 'Strong', width: '100%', color: '#2563eb' };
  };
  const strength = getPasswordStrength();

  if (!showAuthModal) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(2, 6, 23, 0.85)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        padding: '24px',
      }}
    >
      {/* Background Aurora Ambient Glows */}
      <div style={{ position: 'absolute', top: '10%', left: '20%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(37,99,235,0.22) 0%, rgba(15,23,42,0) 70%)', filter: 'blur(60px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '15%', right: '20%', width: '450px', height: '450px', background: 'radial-gradient(circle, rgba(59,130,246,0.18) 0%, rgba(2,6,23,0) 70%)', filter: 'blur(70px)', pointerEvents: 'none' }} />

      {/* Main Luxury Glass Card with Split Layout */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        style={{
          width: '100%',
          maxWidth: '1100px',
          height: '700px',
          background: 'rgba(15, 23, 42, 0.42)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '36px',
          boxShadow: '0 50px 140px rgba(37, 99, 235, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          style={{
            position: 'absolute',
            top: 24,
            right: 24,
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 30,
            transition: 'all 200ms ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
            e.currentTarget.style.color = '#fff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            e.currentTarget.style.color = '#94a3b8';
          }}
        >
          ✕
        </button>

        {/* LEFT PANEL: Form */}
        <div style={{ padding: '40px 48px', display: 'flex', flexDirection: 'column', justifyContent: 'center', zIndex: 20, position: 'relative', overflowY: 'auto', maxHeight: '100%' }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 9999, color: '#60a5fa', fontSize: '12px', fontWeight: 600, marginBottom: 12 }}>
              <Sparkles size={13} /> Secure Enterprise Access
            </div>
            <h2 style={{ fontSize: '38px', fontWeight: 800, color: '#fff', letterSpacing: '-0.035em', margin: '0 0 4px 0' }}>
              {mode === 'register' ? 'Create Your Account' : mode === 'forgot' ? 'Reset Password' : mode === 'reset' ? 'Set New Password' : 'Login'}
            </h2>
            <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
              {mode === 'register' ? 'Join DEVOS cloud IDE and start building instantly.' : mode === 'forgot' ? 'Enter your email to receive recovery instructions.' : 'Access your cloud containers and AI repositories.'}
            </p>
          </div>

          {/* Mode Switch Tabs (Login / Register) */}
          {(mode === 'login' || mode === 'register') && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 4,
                background: 'rgba(17, 24, 39, 0.6)',
                padding: 4,
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                marginBottom: 20,
              }}
            >
              <button
                type="button"
                onClick={() => setMode('login')}
                style={{
                  padding: '9px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: mode === 'login' ? 'rgba(37, 99, 235, 0.25)' : 'transparent',
                  color: mode === 'login' ? '#60a5fa' : '#94a3b8',
                  boxShadow: mode === 'login' ? '0 0 15px rgba(37,99,235,0.2)' : 'none',
                  transition: 'all 200ms ease',
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setMode('register')}
                style={{
                  padding: '9px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: mode === 'register' ? 'rgba(37, 99, 235, 0.25)' : 'transparent',
                  color: mode === 'register' ? '#60a5fa' : '#94a3b8',
                  boxShadow: mode === 'register' ? '0 0 15px rgba(37,99,235,0.2)' : 'none',
                  transition: 'all 200ms ease',
                }}
              >
                Create Account
              </button>
            </div>
          )}

          {successMessage && (
            <div style={{ padding: '10px 14px', borderRadius: '14px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', fontSize: '13px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <CheckCircle2 size={16} />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {mode === 'register' && (
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: 5 }}>Full Name</label>
                <div style={{ position: 'relative' }}>
                  <UserIcon size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                  <input
                    type="text"
                    placeholder="Ada Lovelace"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '11px 14px 11px 42px',
                      borderRadius: '18px',
                      border: '1px solid rgba(255,255,255,0.1)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      backdropFilter: 'blur(10px)',
                      color: '#fff',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'all 200ms ease',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#3b82f6';
                      e.target.style.boxShadow = '0 0 20px rgba(59,130,246,0.3)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>
            )}

            {mode !== 'reset' && (
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: 5 }}>Email Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                  <input
                    type="email"
                    placeholder="developer@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '11px 14px 11px 42px',
                      borderRadius: '18px',
                      border: '1px solid rgba(255,255,255,0.1)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      backdropFilter: 'blur(10px)',
                      color: '#fff',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'all 200ms ease',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#3b82f6';
                      e.target.style.boxShadow = '0 0 20px rgba(59,130,246,0.3)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>
            )}

            {mode === 'reset' && (
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: 5 }}>Reset Token</label>
                <div style={{ position: 'relative' }}>
                  <KeyRound size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                  <input
                    type="text"
                    placeholder="Enter reset token"
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '11px 14px 11px 42px',
                      borderRadius: '18px',
                      border: '1px solid rgba(255,255,255,0.1)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: '#fff',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>
            )}

            {mode !== 'forgot' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1' }}>{mode === 'reset' ? 'New Password' : 'Password'}</label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => setMode('forgot')}
                      style={{ background: 'none', border: 'none', padding: 0, fontSize: '12px', color: '#60a5fa', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '11px 40px 11px 42px',
                      borderRadius: '18px',
                      border: '1px solid rgba(255,255,255,0.1)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      backdropFilter: 'blur(10px)',
                      color: '#fff',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'all 200ms ease',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#3b82f6';
                      e.target.style.boxShadow = '0 0 20px rgba(59,130,246,0.3)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0 }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {mode === 'register' && password && (
                  <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: strength.width, height: '100%', background: strength.color, transition: 'all 300ms ease' }} />
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: strength.color }}>{strength.label}</span>
                  </div>
                )}
              </div>
            )}

            {mode === 'register' && (
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: 5 }}>Confirm Password</label>
                <div style={{ position: 'relative' }}>
                  <ShieldCheck size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '11px 14px 11px 42px',
                      borderRadius: '18px',
                      border: '1px solid rgba(255,255,255,0.1)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: '#fff',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>
            )}

            {(mode === 'login' || mode === 'register') && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="checkbox"
                  id="remember_me_chk"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: '#2563eb', cursor: 'pointer', borderRadius: 4 }}
                />
                <label htmlFor="remember_me_chk" style={{ fontSize: '13px', color: '#94a3b8', cursor: 'pointer', userSelect: 'none' }}>
                  Remember device for 30 days
                </label>
              </div>
            )}

            {(mode === 'login' || mode === 'register') && (
              <div style={{ display: 'flex', alignItems: 'center', margin: '2px 0' }}>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
                <div style={{ padding: '0 12px', fontSize: '11px', color: '#64748b', fontWeight: 600 }}>OR</div>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
              </div>
            )}

            {(mode === 'login' || mode === 'register') && (
              <GitHubConnectButton fullWidth />
            )}

            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting}
              style={{
                width: '100%',
                height: 48,
                borderRadius: '9999px',
                background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                boxShadow: '0 12px 35px rgba(37, 99, 235, 0.45)',
                fontWeight: 700,
                fontSize: '15px',
                justifyContent: 'center',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
              }}
              rightIcon={<ArrowRight size={18} />}
            >
              {mode === 'login' ? 'Sign In to Workspace' : mode === 'register' ? 'Create DEVOS Account' : mode === 'forgot' ? 'Send Recovery Instructions' : 'Update Password'}
            </Button>
          </form>

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 14, fontSize: '13px', color: '#94a3b8' }}>
            {mode === 'forgot' && (
              <button
                type="button"
                onClick={() => setMode('login')}
                style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', fontWeight: 600 }}
              >
                &larr; Back to Sign In
              </button>
            )}
            {mode === 'reset' && (
              <button
                type="button"
                onClick={() => setMode('login')}
                style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', fontWeight: 600 }}
              >
                &larr; Back to Sign In
              </button>
            )}
          </div>
        </div>

        {/* DIAGONAL SKEWED GLASS DIVIDER */}
        <div
          style={{
            position: 'absolute',
            top: '-20%',
            bottom: '-20%',
            left: '50%',
            width: '80px',
            transform: 'translateX(-50%) skewX(-14deg)',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.03), rgba(59,130,246,0.08) 50%, rgba(255,255,255,0.02))',
            borderLeft: '1px solid rgba(255,255,255,0.12)',
            borderRight: '1px solid rgba(255,255,255,0.06)',
            backdropFilter: 'blur(12px)',
            pointerEvents: 'none',
            zIndex: 15,
          }}
        />

        {/* RIGHT PANEL: Onboarding / Welcome Experience */}
        <div
          style={{
            padding: '48px 56px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'flex-start',
            background: 'rgba(15, 23, 42, 0.3)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Glowing Orb Behind Text */}
          <div style={{ position: 'absolute', width: '320px', height: '320px', background: 'radial-gradient(circle, rgba(37,99,235,0.35) 0%, rgba(15,23,42,0) 70%)', filter: 'blur(60px)', top: '25%', right: '5%', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={{ width: 56, height: 56, borderRadius: '16px', background: 'linear-gradient(135deg, #2563eb, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 12px 30px rgba(37,99,235,0.4)', marginBottom: 24 }}>
              <Cpu size={28} />
            </div>

            <h3 style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.15em', color: '#60a5fa', textTransform: 'uppercase', marginBottom: 10 }}>
              {mode === 'register' ? 'START YOUR JOURNEY' : 'WELCOME BACK'}
            </h3>

            <h2 style={{ fontSize: '38px', fontWeight: 800, color: '#fff', letterSpacing: '-0.035em', lineHeight: 1.1, marginBottom: 16 }}>
              {mode === 'register' ? 'Build at Light Speed' : 'The Enterprise Cloud IDE'}
            </h2>

            <p style={{ fontSize: '15px', color: '#cbd5e1', lineHeight: 1.6, marginBottom: 28, maxWidth: 400 }}>
              {mode === 'register'
                ? 'Build, collaborate, and deploy inside DEVOS using a premium cloud development workspace designed for modern engineering teams.'
                : 'Continue building with DEVOS inside your premium cloud development workspace, powered by instant containerized environments and AI code generation.'}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 400 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', backdropFilter: 'blur(10px)' }}>
                <Terminal size={18} style={{ color: '#3b82f6' }} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>AI Pair Programming</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>Context-aware repository intelligence</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', backdropFilter: 'blur(10px)' }}>
                <Layers size={18} style={{ color: '#8b5cf6' }} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>Repository Intelligence</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>Seamless GitHub OAuth & branch sync</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', backdropFilter: 'blur(10px)' }}>
                <Sparkles size={18} style={{ color: '#22d3ee' }} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>Secure Cloud Workspace</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>Dedicated Linux containers & terminals</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

