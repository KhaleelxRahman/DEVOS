import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSeo } from '../../hooks/useSeo';
import { CheckCircle2 } from 'lucide-react';

export const ThankYouPage: React.FC = () => {
  const [params] = useSearchParams();
  const from = params.get('from');
  const isWaitlist = from === 'waitlist';

  useSeo({
    title: 'Thank You',
    description: 'Your submission was received.',
    noindex: true,
  });

  return (
    <div className="site-narrow" style={{ textAlign: 'center', paddingTop: 'var(--space-12, 96px)' }}>
      <CheckCircle2 size={48} color="var(--color-success)" aria-hidden="true" />
      <h1>{isWaitlist ? "You're on the list." : 'Message received.'}</h1>
      <p style={{ color: 'var(--color-text-secondary)', maxWidth: 480, margin: '0 auto var(--space-6)' }}>
        {isWaitlist
          ? 'Your email is saved. When meaningful DEVOS updates ship, you will hear about them — no launch date is promised yet.'
          : 'Thanks for reaching out. Your message was stored and will be read by the team. Replies go to the email address you provided.'}
      </p>
      <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link to="/" className="site-btn site-btn-primary">Back to Home</Link>
        <Link to="/register" className="site-btn site-btn-ghost">Create an Account</Link>
      </div>
    </div>
  );
};
