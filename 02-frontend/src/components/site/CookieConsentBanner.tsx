import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { getConsent, isConsentRequired, setConsent } from '../../lib/consent';
import { Button } from '../common/Button';

// Renders only when optional analytics is configured (see lib/consent.ts).
// DEVOS sets no cookies of its own.
export const CookieConsentBanner: React.FC = () => {
  const [choice, setChoice] = useState(getConsent());
  if (!isConsentRequired() || choice) return null;

  const decide = (accepted: boolean) => {
    setConsent(accepted ? 'accepted' : 'rejected');
    setChoice(accepted ? 'accepted' : 'rejected');
  };

  return (
    <div
      role="dialog"
      aria-label="Privacy preferences"
      style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9998,
        backgroundColor: 'var(--color-surface)', borderTop: '1px solid var(--color-border)',
        padding: 'var(--space-4)', display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)',
        alignItems: 'center', justifyContent: 'center', fontSize: 'var(--font-size-sm)',
      }}
    >
      <p style={{ margin: 0, maxWidth: 560, color: 'var(--color-text-secondary)' }}>
        DEVOS uses no cookies of its own. An optional analytics endpoint is configured; if you accept,
        anonymous page-view events are sent. If you reject, nothing is tracked. See the{' '}
        <Link to="/privacy" style={{ color: 'var(--color-accent)' }}>Privacy Policy</Link>.
      </p>
      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <Button variant="secondary" size="sm" onClick={() => decide(false)}>Reject</Button>
        <Button variant="primary" size="sm" onClick={() => decide(true)}>Accept</Button>
      </div>
    </div>
  );
};
