import React, { useState } from 'react';

export const ContactPage: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="page-container">
      <h1>Contact DEVOS</h1>
      <p className="page-subtitle">Send us a product question, suggestion or feedback.</p>

      <form onSubmit={submit} className="card" style={{ maxWidth: 700, display: 'grid', gap: 'var(--space-4)' }}>
        <label>
          Name
          <input name="name" required placeholder="Your name" />
        </label>

        <label>
          Email
          <input name="email" type="email" required placeholder="you@example.com" />
        </label>

        <label>
          Message
          <textarea name="message" required rows={7} placeholder="How can we help?" />
        </label>

        <button type="submit" className="button button-primary">Send Message</button>

        {submitted && (
          <p style={{ color: 'var(--color-success)' }}>
            Thanks! Your message has been captured by the interface.
          </p>
        )}
      </form>
    </div>
  );
};
