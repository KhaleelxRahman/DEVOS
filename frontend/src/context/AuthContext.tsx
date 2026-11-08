import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types/auth';
import { authApi } from '../api';
import {
  ApiError,
  CACHED_USER_KEY,
  clearApiCache,
  resetAuthRecovery,
  setUnauthorizedHandler,
} from '../api/client';

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (user: User) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

function readCachedUser(): User | null {
  try {
    const token = localStorage.getItem('devos_token');
    const raw = localStorage.getItem(CACHED_USER_KEY);
    if (!token || !raw) return null;
    const parsed = JSON.parse(raw) as User;
    if (parsed && typeof parsed.id === 'string' && typeof parsed.email === 'string') {
      return parsed;
    }
  } catch {
    // Ignore corrupted storage
  }
  return null;
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => readCachedUser());
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    const token = localStorage.getItem('devos_token');
    if (!token) return false;
    return readCachedUser() === null;
  });

  useEffect(() => {
    const token = localStorage.getItem('devos_token');
    if (!token) {
      setIsLoading(false);
      return;
    }

    authApi.me()
      .then((res) => {
        if (res.success && res.data?.user) {
          setUser(res.data.user);
          try {
            localStorage.setItem(CACHED_USER_KEY, JSON.stringify(res.data.user));
          } catch {
            // Ignore storage quota errors
          }
        } else {
          localStorage.removeItem('devos_token');
          localStorage.removeItem(CACHED_USER_KEY);
          setUser(null);
        }
      })
      .catch((err: unknown) => {
        // Preserve valid tokens during transient network or 5xx server failures;
        // only erase credentials on explicit 401/403 authentication rejections.
        const isTransient =
          err instanceof ApiError && (err.status === 0 || err.status >= 500);
        if (!isTransient) {
          localStorage.removeItem('devos_token');
          localStorage.removeItem(CACHED_USER_KEY);
          setUser(null);
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  // Phase 10 A2: the API client clears the token when a request 401s, but only
  // React knows the current user. Clearing it here makes `ProtectedRoute`
  // navigate to /login exactly as it does for a visitor with no token - the
  // dead-end workspace can no longer be reached with a dead token.
  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
    return () => setUnauthorizedHandler(null);
  }, []);

  const login = (token: string, loggedInUser: User) => {
    localStorage.setItem('devos_token', token);
    try {
      localStorage.setItem(CACHED_USER_KEY, JSON.stringify(loggedInUser));
    } catch {
      // Ignore storage errors
    }
    // A successful sign-in must re-arm recovery for the next genuine expiry.
    resetAuthRecovery();
    setUser(loggedInUser);
  };

  const logout = () => {
    // Initiate the logout request while the token is still in localStorage so
    // ApiClient.getHeaders() synchronously attaches the Authorization header,
    // then immediately clear local session state without blocking navigation.
    void authApi.logout()
      .catch((error: unknown) => {
        if (import.meta.env.DEV) console.warn('Logout request failed', error);
      });
    clearApiCache();
    localStorage.removeItem('devos_token');
    localStorage.removeItem(CACHED_USER_KEY);
    setUser(null);
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    try {
      localStorage.setItem(CACHED_USER_KEY, JSON.stringify(updatedUser));
    } catch {
      // Ignore storage errors
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
