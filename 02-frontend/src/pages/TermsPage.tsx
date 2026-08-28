import React from 'react';

export const TermsPage: React.FC = () => (
  <div className="page-container">
    <h1>Terms of Use</h1>
    <p className="page-subtitle">Basic rules for using the DEVOS application.</p>

    <section className="card">
      <h2>Acceptable use</h2>
      <p>Use DEVOS only for lawful development and legitimate software engineering activities.</p>

      <h2>Terminal</h2>
      <p>Terminal execution is restricted by DEVOS security controls. Attempts to execute prohibited commands may be rejected.</p>

      <h2>Integrations</h2>
      <p>Users are responsible for authorizing and using third-party integrations such as GitHub appropriately.</p>

      <h2>Availability</h2>
      <p>Features may depend on deployment configuration, external services and provider availability.</p>
    </section>
  </div>
);
