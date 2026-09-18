import React from 'react';

const sections = [
  ['Projects', 'Create, view, update and delete projects. Each project provides its own workspace context.'],
  ['Files', 'Browse the project file tree, read files and search project files.'],
  ['Git', 'Inspect status and diffs, stage or unstage files, create commits, manage branches and synchronize with remote repositories when configured.'],
  ['Terminal', 'Execute approved commands inside the project environment. Commands are validated against DEVOS security restrictions before execution.'],
  ['AI', 'Create project-scoped conversations, send messages and run supported AI actions.'],
  ['Testing', 'View available testing jobs and execute supported jobs such as pytest, type checking and production builds.'],
  ['Activity', 'Project activity records help track workspace operations such as terminal execution.'],
  ['GitHub', 'Connect GitHub and browse repositories when GitHub OAuth configuration is available.'],
];

export const DocumentationPage: React.FC = () => (
  <div className="page-container">
    <h1>DEVOS Documentation</h1>
    <p className="page-subtitle">Product documentation and feature reference.</p>

    <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
      {sections.map(([title, description]) => (
        <section key={title} className="card">
          <h2>{title}</h2>
          <p>{description}</p>
        </section>
      ))}
    </div>
  </div>
);
