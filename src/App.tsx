import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { ToastProvider } from './components/common/Toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProjectProvider } from './hooks/useProject';
import { DashboardPage } from './pages/DashboardPage';
import { WorkspacePage } from './pages/WorkspacePage';
import { AuthModal } from './components/auth/AuthModal';
import { OnboardingModal } from './components/onboarding/OnboardingModal';
import { UserProfileModal } from './components/auth/UserProfileModal';
import { Button } from './components/common/Button';
import {
  Sparkles,
  Code2,
  LogOut,
  HelpCircle,
  Settings,
  LogIn,
  UserPlus,
} from 'lucide-react';

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const {
    user,
    openAuthModal,
    openProfileModal,
    openOnboarding,
    logout,
  } = useAuth();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const navItems = [
    { label: 'Factory & Dashboard', path: '/app/dashboard', icon: <Sparkles size={16} /> },
    { label: 'Workspace IDE', path: '/app/workspace', icon: <Code2 size={16} /> },
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        background: 'var(--color-bg)',
        color: 'var(--color-text-primary)',
      }}
    >
      {/* Top Main Navigation Bar */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          height: '48px',
          background: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          {/* Logo & Brand */}
          <Link
            to="/app/dashboard"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: '6px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontWeight: 900,
                fontSize: '13px',
              }}
            >
              D
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontWeight: 800, fontSize: '15px', letterSpacing: '-0.02em' }}>DEVOS</span>
              <span
                style={{
                  fontSize: '10px',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  background: 'rgba(59, 130, 246, 0.15)',
                  color: 'var(--color-accent)',
                  fontWeight: 700,
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                }}
              >
                v1.0.0
              </span>
            </div>
          </Link>

          {/* Nav Links */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {navItems.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '12px',
                    fontWeight: 600,
                    textDecoration: 'none',
                    color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                    background: isActive ? 'var(--color-surface-elevated)' : 'transparent',
                    transition: 'all 150ms ease',
                  }}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Action Bar & Multi-User SaaS Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* AI Connection Status Indicator */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: '11px',
              color: 'var(--color-text-muted)',
              background: 'var(--color-surface-elevated)',
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--color-border)',
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: '#10b981',
                boxShadow: '0 0 6px #10b981',
              }}
            />
            <span style={{ display: 'inline-block' }}>Gemini 3.7 Pro</span>
          </div>

          {/* Multi-User Identity Button & Dropdown */}
          {user ? (
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '3px 8px 3px 4px',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface-elevated)',
                  cursor: 'pointer',
                  color: 'var(--color-text-primary)',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 800,
                  }}
                >
                  {user.name ? user.name.slice(0, 2).toUpperCase() : 'US'}
                </div>
                <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.name || user.email}
                </span>
              </button>

              {/* Dropdown Menu */}
              {userDropdownOpen && (
                <div
                  onClick={() => setUserDropdownOpen(false)}
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    right: 0,
                    width: '210px',
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                    padding: '6px',
                    zIndex: 200,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                  }}
                >
                  <div style={{ padding: '6px 10px', borderBottom: '1px solid var(--color-border)', marginBottom: 4 }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                      {user.name}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {user.email}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => openProfileModal()}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      width: '100%',
                      padding: '7px 10px',
                      background: 'none',
                      border: 'none',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '12px',
                      color: 'var(--color-text-primary)',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <Settings size={14} color="var(--color-accent)" />
                    <span>Account Profile</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openOnboarding()}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      width: '100%',
                      padding: '7px 10px',
                      background: 'none',
                      border: 'none',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '12px',
                      color: 'var(--color-text-primary)',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <HelpCircle size={14} color="#f59e0b" />
                    <span>Setup Guide &amp; Tour</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => logout()}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      width: '100%',
                      padding: '7px 10px',
                      background: 'none',
                      border: 'none',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '12px',
                      color: '#ef4444',
                      cursor: 'pointer',
                      textAlign: 'left',
                      borderTop: '1px solid var(--color-border)',
                      marginTop: 2,
                    }}
                  >
                    <LogOut size={14} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openAuthModal('login')}
                leftIcon={<LogIn size={14} />}
              >
                Sign In
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => openAuthModal('register')}
                leftIcon={<UserPlus size={14} />}
              >
                Sign Up
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Main Viewport */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px' }}>
        {children}
      </main>

      {/* SaaS Authentication & Onboarding Modals */}
      <AuthModal />
      <OnboardingModal />
      <UserProfileModal />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <ProjectProvider>
            <AppLayout>
              <Routes>
                <Route path="/" element={<Navigate to="/app/dashboard" replace />} />
                <Route path="/app/dashboard" element={<DashboardPage />} />
                <Route path="/app/workspace" element={<WorkspacePage />} />
                <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
              </Routes>
            </AppLayout>
          </ProjectProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
};

