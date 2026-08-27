import React from 'react';
import { Link } from 'react-router-dom';
import { Terminal } from 'lucide-react';

export const SiteFooter: React.FC = () => {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', fontWeight: 700 }}>
            <Terminal size={16} color="var(--color-accent)" aria-hidden="true" /> DEVOS
          </span>
          <p>AI developer workspace for projects, files, Git, terminal, and testing.</p>
        </div>
        <nav className="site-footer-col" aria-label="Product">
          <strong>Product</strong>
          <Link to="/">Overview</Link>
          <Link to="/about">About</Link>
          <Link to="/faq">FAQ</Link>
        </nav>
        <nav className="site-footer-col" aria-label="Company">
          <strong>Company</strong>
          <Link to="/contact">Contact</Link>
          <Link to="/waitlist">Waitlist</Link>
        </nav>
        <nav className="site-footer-col" aria-label="Legal">
          <strong>Legal</strong>
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/terms">Terms of Service</Link>
        </nav>
      </div>
      <p className="site-footer-note">© {new Date().getFullYear()} DEVOS. Early-access product.</p>
    </footer>
  );
};
