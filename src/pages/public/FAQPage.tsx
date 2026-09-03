import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    category: "General",
    items: [
      { q: "What is DEVOS?", a: "DEVOS is an enterprise SaaS cloud IDE that provides a full development environment entirely in your browser, featuring a native Monaco editor, real terminal, and AI pair programming." },
      { q: "Is it free?", a: "DEVOS offers a Free Plan for independent developers and students, as well as Pro and Enterprise plans for teams needing advanced collaboration and increased deployment limits." },
      { q: "How does AI work?", a: "We integrate Gemini 3.7 Pro directly into your workspace. The AI is repository-aware, meaning it understands your file tree, open files, terminal output, and Git history to provide highly accurate suggestions and fixes." },
      { q: "Does it support GitHub?", a: "Yes. DEVOS features native GitHub integration. Connect your account to clone private repositories, commit changes, create branches, and open pull requests directly from the IDE." },
      { q: "Can I deploy apps?", a: "Absolutely. DEVOS supports one-click deployments to Vercel, Netlify, and Google Cloud Run. You can view build logs and manage rollback history from the Deployment Center." }
    ]
  },
  {
    category: "Workspace",
    items: [
      { q: "What powers the editor?", a: "We use Monaco Editor, the same engine that powers VS Code. You get full language server support, IntelliSense, and minimap functionality." },
      { q: "Is the terminal real?", a: "Yes. DEVOS integrates xterm.js to provide a genuine shell experience for running builds, tests, and managing dependencies." },
    ]
  },
  {
    category: "Security",
    items: [
      { q: "How is my data isolated?", a: "DEVOS uses a robust multi-tenant architecture. Every user has an isolated workspace, private file system, and secure token storage that cannot be accessed by other users." },
    ]
  }
];

export const FAQPage: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', alignItems: 'center' }}>
      <section style={{ width: '100%', maxWidth: 800, padding: '100px 24px 60px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <h1 style={{ fontSize: 'clamp(40px, 6vw, 56px)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.03em', margin: '0 0 24px 0', color: '#fff' }}>
          Frequently Asked Questions
        </h1>
        <p style={{ fontSize: '18px', color: 'var(--color-text-muted)', lineHeight: 1.6, margin: 0 }}>
          Everything you need to know about the product and billing.
        </p>
      </section>

      <section style={{ width: '100%', maxWidth: 800, padding: '20px 24px 100px', display: 'flex', flexDirection: 'column', gap: 48 }}>
        {faqs.map(category => (
          <div key={category.category} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <h2 style={{ fontSize: '24px', fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>{category.category}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {category.items.map(item => (
                <Accordion key={item.q} title={item.q} content={item.a} />
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
};

const Accordion = ({ title, content }: { title: string, content: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div 
      style={{ 
        background: 'var(--color-surface)', 
        border: '1px solid var(--color-border)', 
        borderRadius: 'var(--radius-lg)', 
        overflow: 'hidden' 
      }}
    >
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          width: '100%', 
          padding: '20px 24px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          background: 'none', 
          border: 'none', 
          color: 'var(--color-text-primary)', 
          fontSize: '16px', 
          fontWeight: 600, 
          cursor: 'pointer',
          textAlign: 'left'
        }}
      >
        {title}
        <ChevronDown size={20} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: 'var(--color-text-muted)' }} />
      </button>
      {isOpen && (
        <div style={{ padding: '0 24px 20px', fontSize: '15px', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
          {content}
        </div>
      )}
    </div>
  );
};
