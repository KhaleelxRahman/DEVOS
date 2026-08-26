import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSeo } from '../../hooks/useSeo';
import { publicApi } from '../../api';
import { track } from '../../lib/analytics';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const WaitlistPage: React.FC = () => {
  useSeo({
    title: 'Waitlist',
    description: 'Join the DEVOS early-access waitlist. One email when meaningful updates ship — no spam.',
    canonicalPath: '/waitlist',
  });
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError('');
    setFormError('');
    if (!EMAIL_RE.test(email.trim())) {
      setFieldError('Enter a valid email address.');
      return;
    }
    setSubmitting(true);
    try {
      await publicApi.joinWaitlist(email.trim(), name.trim() || undefined);
      track('waitlist_submitted');
      navigate('/thank-you?from=waitlist');
    } catch (err: any) {
      setFormError(err?.status === 429
        ? 'Too many attempts. Please wait a minute and try again.'
        : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="site-narrow">
      <h1>Join the DEVOS early-access list</h1>
      <p style={{ color: 'var(--color-text-secondary)' }}>
        You will get a product update email when meaningful changes ship. No launch date is promised
        and no marketing drip — your address is used only for DEVOS updates. You can ask to be
        removed at any time via the <Link to="/contact" style={{ color: 'var(--color-accent)' }}>contact page</Link>.
      </p>
      <form className="site-form" onSubmit={onSubmit} noValidate>
        <div className="site-field">
          <label htmlFor="waitlist-email">Email address (required)</label>
          <input
            id="waitlist-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={Boolean(fieldError)}
            aria-describedby={fieldError ? 'waitlist-email-error' : undefined}
            required
          />
          {fieldError && <p className="field-error" id="waitlist-email-error" role="alert">{fieldError}</p>}
        </div>
        <div className="site-field">
          <label htmlFor="waitlist-name">Name (optional)</label>
          <input
            id="waitlist-name"
            type="text"
            autoComplete="name"
            maxLength={120}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        {formError && <p className="form-status-error" role="alert">{formError}</p>}
        <button type="submit" className="site-btn site-btn-primary" disabled={submitting}>
          {submitting ? 'Joining…' : 'Join the waitlist'}
        </button>
      </form>
      <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)', marginTop: 'var(--space-4)' }}>
        Submitting stores your email address (and optional name) in the DEVOS database. See the{' '}
        <Link to="/privacy" style={{ color: 'var(--color-accent)' }}>Privacy Policy</Link>.
      </p>
    </div>
  );
};
