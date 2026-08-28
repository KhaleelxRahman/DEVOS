import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types/auth';
import { authApi } from '../api';

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

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
        } else {
          localStorage.removeItem('devos_token');
        }
      })
      .catch(() => {
        localStorage.removeItem('devos_token');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const login = (token: string, loggedInUser: User) => {
    localStorage.setItem('devos_token', token);
    setUser(loggedInUser);
  };

  const logout = () => {
    void authApi.logout()
      .catch(() => undefined)
      .finally(() => {
        localStorage.removeItem('devos_token');
        setUser(null);
      });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
