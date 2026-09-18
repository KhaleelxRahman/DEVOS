import React from 'react';
import { Link } from 'react-router-dom';
import { FolderTree, TerminalSquare, GitBranch, Bot, FlaskConical, ShieldCheck } from 'lucide-react';
import { useSeo } from '../../hooks/useSeo';
import { track } from '../../lib/analytics';

const FEATURES = [
  { icon: <FolderTree size={20} aria-hidden="true" />, title: 'Project Files', text: 'Browse, search, create, and edit files in a project-scoped workspace. Secrets and credentials files are never exposed.' },
  { icon: <TerminalSquare size={20} aria-hidden="true" />, title: 'Sandboxed Terminal', text: 'Run an allowlisted set of development commands — git, npm, python, pytest — inside your project workspace only.' },
  { icon: <GitBranch size={20} aria-hidden="true" />, title: 'Git Built In', text: 'Stage, commit, branch, view diffs, and pull/push from the workspace, with activity tracked per project.' },
  { icon: <Bot size={20} aria-hidden="true" />, title: 'Context-Aware AI', text: 'Ask questions with your README, file tree, and active file as context. Works with Gemini, OpenAI, or a clearly labelled local mock mode.' },
  { icon: <FlaskConical size={20} aria-hidden="true" />, title: 'Testing Center', text: 'Run pytest, type checks, and builds as tracked jobs with captured logs.' },
  { icon: <ShieldCheck size={20} aria-hidden="true" />, title: 'Owner-Scoped Data', text: 'Every project, file, conversation, and terminal run belongs to your account. Cross-account access is denied at the API level.' },
];

export const HomePage: React.FC = () => {
  useSeo({
    title: 'DEVOS v1.0.0 — AI Developer Workspace',
    description: 'DEVOS v1.0.0 is a project-aware AI developer workspace: files, terminal, Git, GitHub, testing, and a context-aware AI assistant in one interface.',
    canonicalPath: '/',
  });

  return (
    <>
      <section className="site-hero">
        <h1>One workspace for your whole development loop</h1>
        <p className="site-lede">
          DEVOS v1.0.0 unifies project files, a sandboxed terminal, Git, GitHub, a testing center,
          and a context-aware AI assistant — scoped to the project you're working on.
        </p>
        <div className="site-hero-actions">
          <Link to="/register" className="site-btn site-btn-primary site-btn-lg" onClick={() => track('cta_click', { cta: 'hero_get_started' })}>
            Get Started
          </Link>
          <Link to="/waitlist" className="site-btn site-btn-ghost site-btn-lg" onClick={() => track('cta_click', { cta: 'hero_waitlist' })}>
            Join the Waitlist
          </Link>
        </div>

        <div className="site-terminal-preview" role="img" aria-label="Illustration of the DEVOS v1.0.0 workspace terminal running a git status command and an AI chat exchange">
          <div className="tp-bar" aria-hidden="true">
            <span className="tp-dot" /><span className="tp-dot" /><span className="tp-dot" />
          </div>
          <pre aria-hidden="true">
<span className="tp-accent">$</span> git status
On branch main — 2 files staged
<span className="tp-accent">$</span> /explain src/api/client.ts
<span className="tp-ok">AI (Local/Mock):</span> This module wraps fetch with bearer-token auth…
          </pre>
        </div>
      </section>

      <section className="site-section" aria-labelledby="features-heading">
        <h2 id="features-heading">What DEVOS v1.0.0 actually does</h2>
        <div className="site-grid">
          {FEATURES.map((f) => (
            <div className="site-card" key={f.title}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <span style={{ color: 'var(--color-accent)' }}>{f.icon}</span> {f.title}
              </h3>
              <p>{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="site-section" aria-labelledby="honesty-heading">
        <h2 id="honesty-heading">Honest by default</h2>
        <div className="site-grid">
          <div className="site-card">
            <h3>Real status, not marketing</h3>
            <p>AI shows its actual provider (Gemini, OpenAI, or Local/Mock). GitHub shows "Not connected" until you connect it. The backend health is visible in Settings.</p>
          </div>
          <div className="site-card">
            <h3>Your laptop stays yours</h3>
            <p>DEVOS v1.0.0 only sees files you explicitly create, upload, or import into a project. It cannot browse arbitrary folders on your computer.</p>
          </div>
          <div className="site-card">
            <h3>Early-access product</h3>
            <p>DEVOS v1.0.0 is in active development. User feedback shapes the roadmap — no fake testimonials, no invented metrics.</p>
          </div>
        </div>
      </section>
    </>
  );
};
