import React from 'react';

export const AboutPage: React.FC = () => (
  <div className="page-container">
    <h1>About DEVOS</h1>
    <p className="page-subtitle">One intelligent workspace for modern developers.</p>

    <section className="card" style={{ marginBottom: 'var(--space-4)' }}>
      <h2>The idea</h2>
      <p>
        DEVOS is designed to reduce developer context switching by bringing project
        management, source files, Git, terminal, testing and AI assistance into one
        connected workspace.
      </p>
    </section>

    <section className="card" style={{ marginBottom: 'var(--space-4)' }}>
      <h2>Core workflow</h2>
      <p>CREATE → CONNECT → CONTEXTUALIZE → BUILD → APPROVE → CONTINUE</p>
    </section>

    <section className="card">
      <h2>Built for developers</h2>
      <p>
        DEVOS focuses on a clean workflow where project context stays close to the
        tools developers use every day.
      </p>
    </section>
  </div>
);
