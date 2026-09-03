import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Shield,
  Zap,
  ArrowRight,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, forgotPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState<string | null>(null);
  const [forgotErr, setForgotErr] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const result = await login({ email, password });
      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/app/dashboard');
        }, 600);
      } else {
        setError(result.error || 'Invalid credentials. Please check and try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) {
      setForgotErr('Please enter your account email.');
      return;
    }
    setForgotErr(null);
    setForgotLoading(true);
    try {
      const res = await forgotPassword({ email: forgotEmail });
      if (res.success) {
        setForgotMsg(res.message || 'Password reset instructions have been sent to your email.');
      } else {
        setForgotErr(res.error || 'Could not send reset instructions.');
      }
    } catch (err: any) {
      setForgotErr(err.message || 'Request failed.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#020617] text-slate-100 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans selection:bg-blue-500/30">
      
      {/* Background Aurora Lighting */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.25, 0.35, 0.25],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-32 -left-32 w-[550px] h-[550px] bg-blue-600/20 rounded-full blur-[140px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.2, 0.3, 0.2],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -bottom-32 -right-32 w-[600px] h-[600px] bg-purple-600/15 rounded-full blur-[160px]"
        />
      </div>

      {/* Back to Home Navigation */}
      <Link
        to="/"
        className="absolute top-6 left-6 z-20 inline-flex items-center gap-2 px-4 py-2 bg-slate-900/60 hover:bg-slate-900/90 border border-white/10 rounded-full text-xs font-semibold text-slate-300 hover:text-white transition-all backdrop-blur-xl"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Home</span>
      </Link>

      {/* Glassmorphism Login Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md bg-slate-900/60 backdrop-blur-3xl border border-white/10 rounded-3xl p-8 sm:p-10 shadow-[0_30px_100px_rgba(0,0,0,0.8)] relative z-10 overflow-hidden"
      >
        {/* Subtle Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-500/30 mb-3">
            D
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Welcome Back</h1>
          <p className="text-slate-400 text-sm mt-1">Sign in to your DEVOS Cloud Environment</p>
        </div>

        {/* Success Alert */}
        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2.5 text-emerald-400 text-xs font-medium mb-6"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Authentication successful! Launching workspace...</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Alert */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2.5 text-red-400 text-xs font-medium mb-6"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="developer@devos.io"
                required
                className="w-full bg-slate-950/80 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Password
              </label>
              <button
                type="button"
                onClick={() => {
                  setForgotEmail(email);
                  setShowForgotModal(true);
                }}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full bg-slate-950/80 border border-white/10 rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-950 border-white/20 text-blue-600 focus:ring-blue-500/20"
              />
              <span className="text-xs text-slate-300 font-medium">Remember this device</span>
            </label>
          </div>

          <Button
            type="submit"
            variant="primary"
            disabled={loading || success}
            className="w-full h-11 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <span>Sign In to DEVOS</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/5 text-center text-xs text-slate-400">
          <span>Don't have an account? </span>
          <Link to="/signup" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">
            Create Account
          </Link>
        </div>
      </motion.div>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {showForgotModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl p-6 relative shadow-2xl"
            >
              <button
                onClick={() => setShowForgotModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
              <h3 className="text-lg font-bold text-white mb-1">Reset Password</h3>
              <p className="text-xs text-slate-400 mb-4">Enter your registered email address to receive recovery instructions.</p>

              {forgotMsg && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl mb-4">
                  {forgotMsg}
                </div>
              )}
              {forgotErr && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl mb-4">
                  {forgotErr}
                </div>
              )}

              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="email@example.com"
                  required
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                />
                <Button
                  type="submit"
                  variant="primary"
                  disabled={forgotLoading}
                  className="w-full h-10 rounded-xl bg-blue-600 text-xs font-semibold"
                >
                  {forgotLoading ? 'Sending Instructions...' : 'Send Reset Link'}
                </Button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
