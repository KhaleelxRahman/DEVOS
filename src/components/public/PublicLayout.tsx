import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Code2, Github, LogIn } from 'lucide-react';
import { Button } from '../common';
import { useAuth } from '../../context/AuthContext';
import { AuthModal } from '../auth/AuthModal';

export const PublicLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { openAuthModal, user } = useAuth();
  const location = useLocation();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-bg)', color: 'var(--color-text-primary)', fontFamily: 'Inter, sans-serif' }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 1200, padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: '#fff' }}>
            <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Code2 size={20} color="#fff" />
            </div>
            <span style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.02em' }}>DEVOS</span>
          </Link>
          <nav style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <Link to="/about" style={{ textDecoration: 'none', color: location.pathname === '/about' ? '#fff' : 'var(--color-text-muted)', fontSize: '14px', fontWeight: 500 }}>About</Link>
            <Link to="/docs" style={{ textDecoration: 'none', color: location.pathname === '/docs' ? '#fff' : 'var(--color-text-muted)', fontSize: '14px', fontWeight: 500 }}>Help Center</Link>
            <Link to="/faq" style={{ textDecoration: 'none', color: location.pathname === '/faq' ? '#fff' : 'var(--color-text-muted)', fontSize: '14px', fontWeight: 500 }}>FAQ</Link>
            <Link to="/contact" style={{ textDecoration: 'none', color: location.pathname === '/contact' ? '#fff' : 'var(--color-text-muted)', fontSize: '14px', fontWeight: 500 }}>Contact</Link>
          </nav>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <a href="https://github.com/devos" target="_blank" rel="noreferrer" style={{ color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }}>
              <Github size={20} />
            </a>
            {user ? (
              <Link to="/app/dashboard" style={{ textDecoration: 'none' }}>
                <Button variant="primary">
                  Go to Dashboard
                </Button>
              </Link>
            ) : (
              <Link to="/login" style={{ textDecoration: 'none' }}>
                <Button variant="primary" leftIcon={<LogIn size={14} />}>
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {children}
      </main>

      <footer style={{ background: '#0f172a', padding: '64px 24px 32px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 1200, display: 'flex', flexDirection: 'column', gap: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 32 }}>
            <div style={{ flex: 1, minWidth: 250 }}>
              <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: '#fff', marginBottom: 16 }}>
                <div style={{ width: 28, height: 28, borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Code2 size={16} color="#fff" />
                </div>
                <span style={{ fontSize: '16px', fontWeight: 800 }}>DEVOS</span>
              </Link>
              <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                The Enterprise SaaS Cloud IDE.<br/>
                Build, collaborate, and deploy faster with repository-aware AI.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 64, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <h4 style={{ color: '#fff', fontSize: '14px', fontWeight: 600, margin: 0 }}>Product</h4>
                <Link to="/about" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '14px' }}>About</Link>
                <Link to="/docs" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '14px' }}>Help Center</Link>
                <Link to="/faq" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '14px' }}>FAQ</Link>
                <Link to="/contact" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '14px' }}>Contact</Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <h4 style={{ color: '#fff', fontSize: '14px', fontWeight: 600, margin: 0 }}>Legal</h4>
                <a href="#" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '14px' }}>Privacy Policy</a>
                <a href="#" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '14px' }}>Terms of Service</a>
                <a href="#" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '14px' }}>Security</a>
              </div>
            </div>
          </div>
          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
              &copy; {new Date().getFullYear()} DEVOS. All rights reserved.
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <a href="https://github.com/devos" style={{ color: 'var(--color-text-muted)' }}><Github size={20} /></a>
            </div>
          </div>
        </div>
      </footer>
      <AuthModal />
    </div>
  );
};
