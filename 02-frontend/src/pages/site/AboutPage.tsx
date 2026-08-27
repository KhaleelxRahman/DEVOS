import React from 'react';
import { Link } from 'react-router-dom';
import { useSeo } from '../../hooks/useSeo';

export const AboutPage: React.FC = () => {
  useSeo({
    title: 'About',
    description: 'What DEVOS is, the developer workflow problem it solves, and the product philosophy behind it.',
    canonicalPath: '/about',
  });

  return (
    <div className="site-narrow">
      <h1>About DEVOS</h1>

      <div className="site-card" style={{ marginBottom: 'var(--space-4)' }}>
        <h3>What DEVOS is</h3>
        <p>
          DEVOS (Developer Environment Operating System) is a project-aware AI developer workspace.
          It brings the everyday loop of a developer — browsing files, editing code, running commands,
          committing with Git, running tests, and asking an AI assistant for help — into a single
          web application where everything is scoped to the active project.
        </p>
      </div>

      <div className="site-card" style={{ marginBottom: 'var(--space-4)' }}>
        <h3>The problem it solves</h3>
        <p>
          Developer context is scattered: a file tree in one window, a terminal in another, Git state
          in a third, and an AI chat that knows nothing about any of it. Copying context into a chat
          box is tedious and error-prone, and secrets can leak into prompts by accident. DEVOS keeps
          context attached to the project, sanitizes it, and feeds it to the assistant automatically.
        </p>
      </div>

      <div className="site-card" style={{ marginBottom: 'var(--space-4)' }}>
        <h3>The developer workflow</h3>
        <p>
          Create a project, and DEVOS provisions an isolated workspace directory with Git initialized.
          Create or upload files, or import an existing Git repository. Open files in the tabbed viewer,
          run allowlisted commands in the sandboxed terminal, stage and commit changes, run test jobs,
          and ask the AI assistant questions that automatically include your README, file tree, and
          active file — with secret-like values masked before they leave the server.
        </p>
      </div>

      <div className="site-card" style={{ marginBottom: 'var(--space-4)' }}>
        <h3>Product philosophy</h3>
        <p>
          Tell the truth in the UI. If no AI key is configured, the assistant says it is running in
          Local/Mock mode. If GitHub is not connected, the integration says so. Empty states explain
          the next action. Errors name the real cause. No fabricated data anywhere in the product.
        </p>
      </div>

      <div className="site-card">
        <h3>Current product stage</h3>
        <p>
          DEVOS is an early-access product under active development. The core workspace —
          projects, files, terminal, Git, GitHub connection, AI assistant, and testing — is
          implemented and covered by an automated test suite. There is no company history to tell
          yet; this page will grow with the project.
        </p>
        <p style={{ marginTop: 'var(--space-3)' }}>
          <Link to="/waitlist" style={{ color: 'var(--color-accent)' }}>Join the waitlist</Link> to follow along.
        </p>
      </div>
    </div>
  );
};
