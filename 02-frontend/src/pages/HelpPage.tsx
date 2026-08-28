import React from 'react';
import { Link } from 'react-router-dom';

export const HelpPage: React.FC = () => (
  <div className="page-container">
    <h1>DEVOS Help Center</h1>
    <p className="page-subtitle">Quick guidance for using your developer workspace.</p>

    <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
      <section className="card">
        <h2>Getting Started</h2>
        <p>Create an account, open Projects, create a project and enter the Workspace.</p>
      </section>

      <section className="card">
        <h2>Workspace</h2>
        <p>Use File Explorer to inspect project files, Git for repository operations, Terminal for approved commands, Testing for supported jobs and AI for project-aware assistance.</p>
      </section>

      <section className="card">
        <h2>GitHub</h2>
        <p>GitHub connection and repository browsing are available through the GitHub integration and Settings area.</p>
      </section>

      <section className="card">
        <h2>Need more information?</h2>
        <p>
          Read the <Link to="/docs">Documentation</Link> or check the <Link to="/faq">FAQ</Link>.
        </p>
      </section>
    </div>
  </div>
);
