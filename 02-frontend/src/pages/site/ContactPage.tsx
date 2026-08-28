import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSeo } from '../../hooks/useSeo';
import { publicApi } from '../../api';
import { track } from '../../lib/analytics';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const ContactPage: React.FC = () => {
  useSeo({
    title: 'Contact',
    description: 'Contact the DEVOS team: questions, feedback, and early-access conversations.',
    canonicalPath: '/contact',
  });
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '', website: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = 'Name is required.';
    if (!EMAIL_RE.test(form.email.trim())) next.email = 'Enter a valid email address.';
    if (!form.subject.trim()) next.subject = 'Subject is required.';
    if (form.subject.length > 200) next.subject = 'Subject is too long (max 200 characters).';
    if (!form.message.trim()) next.message = 'Message is required.';
    if (form.message.length > 4000) next.message = 'Message is too long (max 4000 characters).';
    setErrors(next);
    setFormError('');
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      await publicApi.submitContact({
        name: form.name.trim(),
        email: form.email.trim(),
        subject: form.subject.trim(),
        message: form.message,
        website: form.website,
      });
      track('contact_submitted');
      navigate('/thank-you?from=contact');
    } catch (err: any) {
      setFormError(err?.status === 429
        ? 'Too many messages. Please wait a minute and try again.'
        : 'Message could not be sent. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="site-narrow">
      <h1>Contact DEVOS</h1>
      <p style={{ color: 'var(--color-text-secondary)' }}>
        Questions, feedback, or early-access conversations. Messages are stored privately and read
        by the team — nothing is published.
      </p>
      <div className="contact-options">
        <a href="mailto:mdkhaleelurrahman51@gmail.com?subject=DEVOS%20Support">Email mdkhaleelurrahman51@gmail.com</a>
        <a href="tel:+917842835936">Call +91 78428 35936</a>
      </div>
      <form className="site-form" onSubmit={onSubmit} noValidate>
        <div className="site-field">
          <label htmlFor="contact-name">Name</label>
          <input id="contact-name" type="text" autoComplete="name" maxLength={120} value={form.name} onChange={set('name')} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'contact-name-error' : undefined} required />
          {errors.name && <p className="field-error" id="contact-name-error" role="alert">{errors.name}</p>}
        </div>
        <div className="site-field">
          <label htmlFor="contact-email">Email</label>
          <input id="contact-email" type="email" autoComplete="email" value={form.email} onChange={set('email')} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'contact-email-error' : undefined} required />
          {errors.email && <p className="field-error" id="contact-email-error" role="alert">{errors.email}</p>}
        </div>
        <div className="site-field">
          <label htmlFor="contact-subject">Subject</label>
          <input id="contact-subject" type="text" maxLength={200} value={form.subject} onChange={set('subject')} aria-invalid={Boolean(errors.subject)} aria-describedby={errors.subject ? 'contact-subject-error' : undefined} required />
          {errors.subject && <p className="field-error" id="contact-subject-error" role="alert">{errors.subject}</p>}
        </div>
        <div className="site-field">
          <label htmlFor="contact-message">Message</label>
          <textarea id="contact-message" rows={6} maxLength={4000} value={form.message} onChange={set('message')} aria-invalid={Boolean(errors.message)} aria-describedby={errors.message ? 'contact-message-error' : undefined} required />
          {errors.message && <p className="field-error" id="contact-message-error" role="alert">{errors.message}</p>}
        </div>
        {/* Honeypot: hidden from humans; bots that fill it are silently discarded. */}
        <div className="hp-field" aria-hidden="true">
          <label htmlFor="contact-website">Website</label>
          <input id="contact-website" type="text" tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} />
        </div>
        {formError && <p className="form-status-error" role="alert">{formError}</p>}
        <button type="submit" className="site-btn site-btn-primary" disabled={submitting}>
          {submitting ? 'Sending…' : 'Send message'}
        </button>
      </form>
    </div>
  );
};
