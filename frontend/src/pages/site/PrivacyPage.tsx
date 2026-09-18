import React from 'react';
import { useSeo } from '../../hooks/useSeo';

export const PrivacyPage: React.FC = () => {
  useSeo({
    title: 'Privacy Policy',
    description: 'What data DEVOS v1.0.0 stores, how authentication works, and how optional analytics is handled.',
    canonicalPath: '/privacy',
  });

  return (
    <div className="site-narrow">
      <h1>Privacy Policy</h1>
      <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>Last updated: 2026-08-26</p>

      <div className="site-card" style={{ marginBottom: 'var(--space-4)' }}>
        <h3>Data we store</h3>
        <p>
          Account data: name, email address, and an Argon2-hashed password (plaintext passwords are never stored).
          Workspace data: projects, files you create or upload, Git metadata, AI conversations, terminal history,
          test runs, and activity records — all scoped to your account. Waitlist and contact submissions store the
          email/name/message you provide.
        </p>
      </div>

      <div className="site-card" style={{ marginBottom: 'var(--space-4)' }}>
        <h3>Cookies</h3>
        <p>
          DEVOS v1.0.0 sets no cookies. Authentication uses a bearer token kept in your browser's local storage.
          The optional analytics feature (only active when an administrator configures an analytics endpoint)
          uses anonymous page-view events and asks for consent before anything is sent.
        </p>
      </div>

      <div className="site-card" style={{ marginBottom: 'var(--space-4)' }}>
        <h3>What we never collect</h3>
        <p>
          DEVOS v1.0.0 never reads arbitrary files from your computer — only files you explicitly create, upload, or import
          into a project. Analytics (when enabled) never includes source code, file contents, terminal output,
          AI conversation content, passwords, tokens, or project data.
        </p>
      </div>

      <div className="site-card" style={{ marginBottom: 'var(--space-4)' }}>
        <h3>Third-party processing</h3>
        <p>
          If an AI provider (Gemini or OpenAI) is configured by the server administrator, prompts and sanitized
          project context are sent to that provider to generate answers; secret-like values are masked first.
          If you connect GitHub, your GitHub token is stored server-side and never returned by the API or shown
          in the UI. Without a configured provider or connection, nothing leaves the server.
        </p>
      </div>

      <div className="site-card">
        <h3>Your controls</h3>
        <p>
          You can delete projects (which removes their workspace data) from the Projects page and disconnect
          GitHub from Settings. For waitlist removal or account deletion requests, use the contact page.
        </p>
      </div>
    </div>
  );
};
