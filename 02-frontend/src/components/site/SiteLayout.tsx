import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { SiteNavbar } from './SiteNavbar';
import { SiteFooter } from './SiteFooter';
import { track } from '../../lib/analytics';

const PUBLIC_TRACKABLE = ['/', '/about', '/faq', '/contact', '/waitlist'];

export const SiteLayout: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    if (PUBLIC_TRACKABLE.includes(location.pathname)) {
      track('page_view');
    }
  }, [location.pathname]);

  return (
    <div className="site-root">
      <a href="#site-main" className="skip-link">Skip to content</a>
      <SiteNavbar />
      <main id="site-main">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
};
