import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, X, Terminal } from 'lucide-react';
import { track } from '../../lib/analytics';
import { useAuth } from '../../hooks/useAuth';

const NAV_LINKS = [
  { to: '/', label: 'Product', end: true },
  { to: '/about', label: 'About' },
  { to: '/faq', label: 'FAQ' },
  { to: '/contact', label: 'Contact' },
];

export const SiteNavbar: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { isAuthenticated } = useAuth();

  const linkStyle = ({ isActive }: { isActive: boolean }): React.CSSProperties => ({
    color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
    textDecoration: 'none',
    fontSize: 'var(--font-size-sm)',
    fontWeight: isActive ? 600 : 500,
  });

  return (
    <header className="site-nav">
      <Link to="/" className="site-nav-brand" aria-label="DEVOS home">
        <Terminal size={20} color="var(--color-accent)" aria-hidden="true" />
        <span>DEVOS</span>
      </Link>

      <nav className="site-nav-links" aria-label="Primary">
        {NAV_LINKS.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.end as any} style={linkStyle}>
            {l.label}
          </NavLink>
        ))}
      </nav>

      <div className="site-nav-cta">
        {isAuthenticated ? (
          <Link to="/dashboard" className="site-btn site-btn-primary">Open Workspace</Link>
        ) : (
          <>
            <Link to="/login" className="site-btn site-btn-ghost" onClick={() => track('signin_navigate')}>
              Sign In
            </Link>
            <Link to="/register" className="site-btn site-btn-primary" onClick={() => track('register_navigate')}>
              Get Started
            </Link>
          </>
        )}
      </div>

      <button
        className="site-nav-toggle"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
      </button>

      {open && (
        <nav className="site-nav-mobile" aria-label="Mobile">
          {NAV_LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end as any} style={linkStyle} onClick={() => setOpen(false)}>
              {l.label}
            </NavLink>
          ))}
          <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', width: '100%' }} />
          {isAuthenticated ? (
            <Link to="/dashboard" className="site-btn site-btn-primary" onClick={() => setOpen(false)}>
              Open Workspace
            </Link>
          ) : (
            <>
              <Link to="/login" className="site-btn site-btn-ghost" onClick={() => setOpen(false)}>Sign In</Link>
              <Link to="/register" className="site-btn site-btn-primary" onClick={() => setOpen(false)}>Get Started</Link>
            </>
          )}
        </nav>
      )}
    </header>
  );
};
