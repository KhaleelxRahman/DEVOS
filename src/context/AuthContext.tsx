import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  User,
  LoginPayload,
  RegisterPayload,
  UpdateProfilePayload,
  ForgotPasswordPayload,
  ResetPasswordPayload,
} from '../types/auth';
import { authApi, profileApi } from '../api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  showAuthModal: boolean;
  authModalMode: 'login' | 'register' | 'forgot' | 'reset';
  showOnboarding: boolean;
  showProfileModal: boolean;
  login: (payload: LoginPayload) => Promise<{ success: boolean; error?: string }>;
  register: (payload: RegisterPayload) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (payload: UpdateProfilePayload) => Promise<{ success: boolean; error?: string }>;
  forgotPassword: (payload: ForgotPasswordPayload) => Promise<{ success: boolean; error?: string; message?: string }>;
  resetPassword: (payload: ResetPasswordPayload) => Promise<{ success: boolean; error?: string; message?: string }>;
  openAuthModal: (mode?: 'login' | 'register' | 'forgot' | 'reset') => void;
  closeAuthModal: () => void;
  openOnboarding: () => void;
  closeOnboarding: () => void;
  openProfileModal: () => void;
  closeProfileModal: () => void;
  completeOnboarding: (interests?: string[], githubUsername?: string) => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'devos_token';
const REFRESH_TOKEN_KEY = 'devos_refresh_token';
const USER_KEY = 'devos_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(USER_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register' | 'forgot' | 'reset'>('login');
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);

  // Initialize and verify authentication state
  const refreshSession = useCallback(async () => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    if (!savedToken) {
      setUser(null);
      setToken(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await authApi.me();
      if (res.success && res.data?.user) {
        setUser(res.data.user);
        localStorage.setItem(USER_KEY, JSON.stringify(res.data.user));
        if (res.data.user.onboarding_completed === false) {
          setShowOnboarding(true);
        }
      } else {
        // Clear invalid session
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setUser(null);
        setToken(null);
      }
    } catch {
      // If token expired, try refresh token
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      if (refreshToken) {
        try {
          const refRes = await authApi.refresh(refreshToken);
          if (refRes.success && refRes.data?.token) {
            localStorage.setItem(TOKEN_KEY, refRes.data.token);
            setToken(refRes.data.token);
            if (refRes.data.user) {
              setUser(refRes.data.user);
              localStorage.setItem(USER_KEY, JSON.stringify(refRes.data.user));
            }
            return;
          }
        } catch {
          // Clear on failure
        }
      }
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const login = async (payload: LoginPayload) => {
    try {
      const res = await authApi.login(payload);
      if (res.success && res.data) {
        const { user: authUser, token: authToken, refresh_token: refToken } = res.data as any;
        setUser(authUser);
        setToken(authToken);
        localStorage.setItem(TOKEN_KEY, authToken);
        if (refToken) {
          localStorage.setItem(REFRESH_TOKEN_KEY, refToken);
        }
        localStorage.setItem(USER_KEY, JSON.stringify(authUser));
        setShowAuthModal(false);

        // Check if onboarding is needed
        if (authUser.onboarding_completed === false) {
          setShowOnboarding(true);
        }
        return { success: true };
      }
      return { success: false, error: (res as any).error?.message || 'Login failed' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Login failed' };
    }
  };

  const register = async (payload: RegisterPayload) => {
    try {
      const res = await authApi.register(payload);
      if (res.success && res.data) {
        const { user: authUser, token: authToken, refresh_token: refToken } = res.data as any;
        setUser(authUser);
        setToken(authToken);
        localStorage.setItem(TOKEN_KEY, authToken);
        if (refToken) {
          localStorage.setItem(REFRESH_TOKEN_KEY, refToken);
        }
        localStorage.setItem(USER_KEY, JSON.stringify(authUser));
        setShowAuthModal(false);
        // Show first-time onboarding for freshly registered users
        setShowOnboarding(true);
        return { success: true };
      }
      return { success: false, error: (res as any).error?.message || 'Registration failed' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Registration failed' };
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore network errors during logout
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem('devos_active_project_id');
      setUser(null);
      setToken(null);
      setShowOnboarding(false);
      setShowProfileModal(false);
    }
  };

  const updateProfile = async (payload: UpdateProfilePayload) => {
    try {
      const res = await profileApi.update(payload);
      if (res.success && res.data?.user) {
        setUser(res.data.user);
        localStorage.setItem(USER_KEY, JSON.stringify(res.data.user));
        return { success: true };
      }
      return { success: false, error: (res as any).error?.message || 'Update failed' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Update failed' };
    }
  };

  const forgotPassword = async (payload: ForgotPasswordPayload) => {
    try {
      const res = await authApi.forgotPassword(payload);
      if (res.success) {
        return { success: true, message: (res.data as any)?.message || 'Reset link sent to your email' };
      }
      return { success: false, error: (res as any).error?.message || 'Failed to process password request' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to process request' };
    }
  };

  const resetPassword = async (payload: ResetPasswordPayload) => {
    try {
      const res = await authApi.resetPassword(payload);
      if (res.success) {
        return { success: true, message: (res.data as any)?.message || 'Password reset successfully. Please log in.' };
      }
      return { success: false, error: (res as any).error?.message || 'Failed to reset password' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to reset password' };
    }
  };

  const completeOnboarding = async (interests?: string[], githubUsername?: string) => {
    if (!user) return;
    try {
      const payload: UpdateProfilePayload = {
        onboarding_completed: true,
        interests: interests || user.interests || [],
        github_username: githubUsername !== undefined ? githubUsername : user.github_username,
      };
      await updateProfile(payload);
    } catch (err) {
      console.warn('Failed to save onboarding completion:', err);
    } finally {
      setShowOnboarding(false);
    }
  };

  const openAuthModal = (mode: 'login' | 'register' | 'forgot' | 'reset' = 'login') => {
    setAuthModalMode(mode);
    setShowAuthModal(true);
  };

  const closeAuthModal = () => setShowAuthModal(false);
  const openOnboarding = () => setShowOnboarding(true);
  const closeOnboarding = () => setShowOnboarding(false);
  const openProfileModal = () => setShowProfileModal(true);
  const closeProfileModal = () => setShowProfileModal(false);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        showAuthModal,
        authModalMode,
        showOnboarding,
        showProfileModal,
        login,
        register,
        logout,
        updateProfile,
        forgotPassword,
        resetPassword,
        openAuthModal,
        closeAuthModal,
        openOnboarding,
        closeOnboarding,
        openProfileModal,
        closeProfileModal,
        completeOnboarding,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
