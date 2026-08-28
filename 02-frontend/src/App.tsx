import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProjectProvider } from './context/ProjectContext';
import { ToastProvider } from './components/common/Toast';
import { AppShell } from './components/layout/AppShell';
import { SiteLayout } from './components/site/SiteLayout';
import { CookieConsentBanner } from './components/site/CookieConsentBanner';
import { DashboardPage } from './pages/DashboardPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { WorkspacePage } from './pages/WorkspacePage';
import { SettingsPage } from './pages/SettingsPage';

import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { HomePage } from './pages/site/HomePage';
import { AboutPage } from './pages/site/AboutPage';
import { ContactPage } from './pages/site/ContactPage';
import { FaqPage } from './pages/site/FaqPage';
import { WaitlistPage } from './pages/site/WaitlistPage';
import { ThankYouPage } from './pages/site/ThankYouPage';
import { PrivacyPage } from './pages/site/PrivacyPage';
import { TermsPage } from './pages/site/TermsPage';
import { DocumentationPage } from './pages/DocumentationPage';
import { HelpPage } from './pages/HelpPage';
import { useAuth } from './hooks/useAuth';
import { Spinner } from './components/common/Spinner';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          backgroundColor: 'var(--color-background)',
        }}
      >
        <Spinner size={32} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ProjectProvider>
          <ToastProvider>
            <Routes>
              {/* ===== Public website ===== */}
              <Route element={<SiteLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/faq" element={<FaqPage />} />
                <Route path="/docs" element={<DocumentationPage />} />
                <Route path="/help" element={<HelpPage />} />
                <Route path="/waitlist" element={<WaitlistPage />} />
                <Route path="/thank-you" element={<ThankYouPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>

              {/* ===== Auth pages (public but standalone layout) ===== */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* ===== Authenticated DEVOS v1.0.0 workspace ===== */}
              <Route
                path="/app"
                element={
                  <ProtectedRoute>
                    <AppShell />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/app/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="projects" element={<ProjectsPage />} />
                <Route path="workspace" element={<WorkspacePage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>

              {/* Legacy app paths redirect into /app/* */}
              <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />
              <Route path="/projects" element={<Navigate to="/app/projects" replace />} />
              <Route path="/workspace" element={<Navigate to="/app/workspace" replace />} />
              <Route path="/settings" element={<Navigate to="/app/settings" replace />} />
            </Routes>
            <CookieConsentBanner />
          </ToastProvider>
        </ProjectProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
