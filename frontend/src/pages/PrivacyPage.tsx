import React from 'react';

export const PrivacyPage: React.FC = () => (
  <div className="page-container">
    <h1>Privacy</h1>
    <p className="page-subtitle">How DEVOS is intended to handle account and workspace information.</p>

    <section className="card">
      <h2>Account information</h2>
      <p>DEVOS uses account information required to authenticate users and provide workspace functionality.</p>

      <h2>Project information</h2>
      <p>Project data is used to provide project-scoped features such as files, Git, terminal, testing and AI context.</p>

      <h2>Integrations</h2>
      <p>Optional integrations such as GitHub may process information required for the requested integration functionality.</p>

      <h2>Security</h2>
      <p>Project-scoped operations require authenticated access and terminal commands are subject to safety validation.</p>
    </section>
  </div>
);
