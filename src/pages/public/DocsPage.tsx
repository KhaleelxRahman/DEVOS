import React, { useState } from 'react';
import { Search, ChevronRight, BookOpen, Terminal, Code2, Cloud, Shield } from 'lucide-react';

const docsCategories = [
  {
    id: 'getting-started',
    icon: <BookOpen size={20} color="#60a5fa" />,
    title: 'Getting Started',
    links: ['Introduction to DEVOS', 'Creating your first project', 'Connecting GitHub', 'Understanding the Workspace']
  },
  {
    id: 'workspace',
    icon: <Code2 size={20} color="#a78bfa" />,
    title: 'Monaco Workspace',
    links: ['Keyboard Shortcuts', 'IntelliSense & Language Servers', 'File Explorer Management', 'AI Pair Programmer']
  },
  {
    id: 'terminal',
    icon: <Terminal size={20} color="#34d399" />,
    title: 'Terminal & CLI',
    links: ['Using the xterm.js terminal', 'Environment variables', 'Running background processes']
  },
  {
    id: 'deployment',
    icon: <Cloud size={20} color="#fbbf24" />,
    title: 'Deployment & CI/CD',
    links: ['Deploy to Vercel', 'Deploy to Cloud Run', 'GitHub Actions integration', 'Managing Rollbacks']
  },
  {
    id: 'security',
    icon: <Shield size={20} color="#f87171" />,
    title: 'Enterprise Security',
    links: ['Multi-tenant isolation', 'Managing API keys', 'Dependency auditing', 'OAuth permissions']
  }
];

export const DocsPage: React.FC = () => {
  const [search, setSearch] = useState('');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', alignItems: 'center' }}>
      <section style={{ width: '100%', maxWidth: 800, padding: '100px 24px 60px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <h1 style={{ fontSize: 'clamp(40px, 6vw, 56px)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.03em', margin: '0 0 24px 0', color: '#fff' }}>
          Help Center
        </h1>
        <div style={{ position: 'relative', width: '100%', maxWidth: 500, marginTop: 24 }}>
          <Search size={20} color="var(--color-text-muted)" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="text" 
            placeholder="Search documentation..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '16px 16px 16px 48px', 
              fontSize: '16px', 
              borderRadius: 'var(--radius-full)', 
              border: '1px solid var(--color-border)', 
              background: 'var(--color-surface)', 
              color: '#fff' 
            }} 
          />
        </div>
      </section>

      <section style={{ width: '100%', maxWidth: 1000, padding: '20px 24px 100px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 32 }}>
        {docsCategories.map(cat => (
          <div key={cat.id} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-lg)', background: 'var(--color-surface-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {cat.icon}
              </div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#fff' }}>{cat.title}</h3>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {cat.links.map(link => (
                <li key={link}>
                  <a href="#" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '15px' }}>
                    <span style={{ cursor: 'pointer', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-muted)'}>
                      {link}
                    </span>
                    <ChevronRight size={16} />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
};
