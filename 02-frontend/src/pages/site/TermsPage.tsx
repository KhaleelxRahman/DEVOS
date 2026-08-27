import React from 'react';
import { useSeo } from '../../hooks/useSeo';

export const TermsPage: React.FC = () => {
  useSeo({
    title: 'Terms of Service',
    description: 'Terms of use for the DEVOS developer workspace.',
    canonicalPath: '/terms',
  });

  return (
    <div className="site-narrow">
      <h1>Terms of Service</h1>
      <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>Last updated: 2026-08-26</p>

      <div className="site-card" style={{ marginBottom: 'var(--space-4)' }}>
        <h3>The service</h3>
        <p>
          DEVOS provides a project-scoped developer workspace: file management, a sandboxed terminal,
          Git and GitHub integration, a testing center, and an AI assistant. It is an early-access product
          offered as-is; features may change as development continues.
        </p>
      </div>

      <div className="site-card" style={{ marginBottom: 'var(--space-4)' }}>
        <h3>Your account and content</h3>
        <p>
          You are responsible for the credentials to your account. You retain ownership of the code and files
          you create or upload. Do not upload content you have no right to share. Do not use DEVOS to attack
          systems, distribute malware, or violate applicable law.
        </p>
      </div>

      <div className="site-card" style={{ marginBottom: 'var(--space-4)' }}>
        <h3>Acceptable use of the terminal and AI</h3>
        <p>
          The terminal intentionally runs only an allowlist of development commands inside your project
          workspace. Attempts to bypass the sandbox, the command allowlist, or other users' data boundaries
          are prohibited and may result in account suspension.
        </p>
      </div>

      <div className="site-card" style={{ marginBottom: 'var(--space-4)' }}>
        <h3>AI output disclaimer</h3>
        <p>
          AI-generated responses may be wrong. When no provider key is configured, DEVOS runs in a clearly
          labelled Local/Mock mode whose responses are development placeholders. Always review code before
          running or shipping it.
        </p>
      </div>

      <div className="site-card">
        <h3>Liability</h3>
        <p>
          DEVOS is provided without warranty to the extent permitted by law. Keep backups of important work;
          the delete actions in the product are real and irreversible.
        </p>
      </div>
    </div>
  );
};
