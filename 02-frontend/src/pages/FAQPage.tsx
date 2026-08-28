import React from 'react';

const faqs = [
  ['What is DEVOS?', 'DEVOS is an AI-powered developer workspace that brings projects, files, Git, terminal, testing, AI assistance and developer activity into one interface.'],
  ['Do I need GitHub to use DEVOS?', 'No. GitHub integration is optional. You can use the core workspace without connecting GitHub.'],
  ['Can DEVOS execute terminal commands?', 'Yes. DEVOS provides a controlled terminal environment with an allowlist of permitted commands and safety restrictions.'],
  ['Can I manage Git repositories?', 'Yes. The workspace provides Git status, diff, staging, commits, branches, checkout, pull and push operations where the connected environment supports them.'],
  ['Does DEVOS support AI conversations?', 'Yes. DEVOS provides project-scoped AI conversations, messages and AI actions.'],
  ['What happens if an AI provider is not configured?', 'DEVOS can use its configured local/mock provider instead of requiring an external AI API key.'],
  ['Can I run tests from DEVOS?', 'Yes. DEVOS exposes available testing jobs such as pytest, TypeScript type checking and frontend production builds.'],
  ['Is my project isolated?', 'Project operations are scoped to the authenticated user and selected project.'],
  ['How do I connect GitHub?', 'GitHub integration is managed from Settings when the required OAuth configuration is available.'],
  ['Where can I get help?', 'Use the Help and Documentation pages inside DEVOS. For product questions, use the Contact page.'],
];

export const FAQPage: React.FC = () => (
  <div className="page-container">
    <h1>Frequently Asked Questions</h1>
    <p className="page-subtitle">Everything you need to know about DEVOS.</p>

    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {faqs.map(([question, answer]) => (
        <details
          key={question}
          style={{
            padding: 'var(--space-4)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--color-surface)',
          }}
        >
          <summary style={{ cursor: 'pointer', fontWeight: 600 }}>{question}</summary>
          <p style={{ marginTop: 'var(--space-3)', color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>{answer}</p>
        </details>
      ))}
    </div>
  </div>
);
