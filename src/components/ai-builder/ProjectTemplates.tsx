import React from 'react';
import {
  CheckSquare,
  Briefcase,
  LayoutDashboard,
  MessageSquare,
  Wallet,
  Rocket,
  ShoppingBag,
  Share2,
  Sparkles,
} from 'lucide-react';

export interface ProjectTemplate {
  id: string;
  title: string;
  category: string;
  description: string;
  prompt: string;
  techStack: string;
  icon: React.ReactNode;
  tags: string[];
}

export const TEMPLATES: ProjectTemplate[] = [
  {
    id: 'expense-tracker',
    title: 'Expense Tracker',
    category: 'Finance',
    description: 'Personal finance dashboard with income/expense logs, monthly budget caps, and category analytics.',
    prompt: 'Build an Expense Tracker with monthly budgeting, transaction categorization, visual analytics, and exportable CSV reports',
    techStack: 'React 18 + TypeScript + Recharts + Tailwind',
    icon: <Wallet size={18} className="text-emerald-400" />,
    tags: ['Recharts', 'Finance', 'Dashboard'],
  },
  {
    id: 'todo-app',
    title: 'Todo & Kanban App',
    category: 'Productivity',
    description: 'High-productivity task manager with offline state, tag filters, priority matrix, and keyboard shortcuts.',
    prompt: 'Build a Todo App with offline state, priority tags, markdown notes, drag-and-drop ordering, and keyboard navigation',
    techStack: 'React 18 + TypeScript + LocalStorage',
    icon: <CheckSquare size={18} className="text-blue-400" />,
    tags: ['Offline', 'Productivity', 'Keyboard Nav'],
  },
  {
    id: 'saas-dashboard',
    title: 'SaaS Analytics Dashboard',
    category: 'Enterprise',
    description: 'Multi-tenant admin panel with live MRR metrics, user conversion rates, and role-based permissions.',
    prompt: 'Build a SaaS Dashboard with real-time revenue analytics, user cohort tables, and role-based access control',
    techStack: 'React 18 + TypeScript + Express + Tailwind',
    icon: <LayoutDashboard size={18} className="text-purple-400" />,
    tags: ['SaaS', 'Metrics', 'RBAC'],
  },
  {
    id: 'ai-chat',
    title: 'AI Chat Assistant',
    category: 'AI / ML',
    description: 'Real-time conversational interface with Gemini streaming, syntax highlighted code blocks, and conversation history.',
    prompt: 'Build an AI Chat app with Gemini streaming responses, Monaco code previews, session history, and prompt templates',
    techStack: 'React 18 + TypeScript + Gemini API',
    icon: <MessageSquare size={18} className="text-cyan-400" />,
    tags: ['Gemini 3.7', 'Streaming', 'Monaco'],
  },
  {
    id: 'startup-mvp',
    title: 'Startup MVP Platform',
    category: 'Startup',
    description: 'Complete startup foundation with landing page, user authentication, billing checkout, and user settings.',
    prompt: 'Build a Startup MVP with high-converting landing page, user authentication flow, billing integration, and user dashboard',
    techStack: 'React 18 + TypeScript + Express REST',
    icon: <Rocket size={18} className="text-amber-400" />,
    tags: ['MVP', 'Auth', 'Stripe Ready'],
  },
  {
    id: 'portfolio',
    title: 'Developer Portfolio',
    category: 'Personal',
    description: 'Sleek dark-mode portfolio featuring interactive project case studies, skills matrix, and contact form.',
    prompt: 'Build a modern Developer Portfolio with dark mode, interactive project showcases, blog markdown reader, and contact form',
    techStack: 'React 18 + TypeScript + Tailwind CSS',
    icon: <Briefcase size={18} className="text-indigo-400" />,
    tags: ['Portfolio', 'Dark Mode', 'Blog'],
  },
  {
    id: 'ecommerce',
    title: 'E-Commerce Storefront',
    category: 'Commerce',
    description: 'Modern storefront with responsive product catalog, filtering by price/category, and cart persistence.',
    prompt: 'Build an E-Commerce store with product catalog filters, dynamic search, persistent shopping cart, and order summary',
    techStack: 'React 18 + TypeScript + LocalStorage',
    icon: <ShoppingBag size={18} className="text-rose-400" />,
    tags: ['Catalog', 'Cart', 'Commerce'],
  },
  {
    id: 'social-app',
    title: 'Social Community Feed',
    category: 'Community',
    description: 'Social networking timeline with post creation, reaction counters, comment threads, and user profiles.',
    prompt: 'Build a Social App with interactive feed, post reactions, comment threads, user profiles, and image attachments',
    techStack: 'React 18 + TypeScript + Tailwind',
    icon: <Share2 size={18} className="text-pink-400" />,
    tags: ['Feed', 'Social', 'Reactions'],
  },
];

interface ProjectTemplatesProps {
  onSelectTemplate: (template: ProjectTemplate) => void;
  selectedTemplateId?: string;
}

export const ProjectTemplates: React.FC<ProjectTemplatesProps> = ({
  onSelectTemplate,
  selectedTemplateId,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Sparkles size={14} className="text-blue-400" />
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Production Templates
          </span>
        </div>
        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
          Click to load full specification
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: 'var(--space-3)',
        }}
      >
        {TEMPLATES.map((tmpl) => {
          const isSelected = tmpl.id === selectedTemplateId;
          return (
            <div
              key={tmpl.id}
              onClick={() => onSelectTemplate(tmpl)}
              style={{
                background: isSelected ? 'rgba(59, 130, 246, 0.12)' : 'var(--color-surface)',
                border: isSelected ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-3)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = 'var(--color-border-strong)';
                  e.currentTarget.style.backgroundColor = 'var(--color-surface-elevated)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = 'var(--color-border)';
                  e.currentTarget.style.backgroundColor = 'var(--color-surface)';
                }
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div
                      style={{
                        padding: 6,
                        borderRadius: 'var(--radius-md)',
                        background: 'rgba(255, 255, 255, 0.04)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {tmpl.icon}
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      {tmpl.title}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: 10,
                      background: 'rgba(255, 255, 255, 0.06)',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    {tmpl.category}
                  </span>
                </div>
                <p
                  style={{
                    fontSize: '11px',
                    color: 'var(--color-text-secondary)',
                    margin: '0 0 8px 0',
                    lineHeight: 1.4,
                  }}
                >
                  {tmpl.description}
                </p>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                {tmpl.tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontSize: '9px',
                      padding: '1px 5px',
                      borderRadius: 4,
                      background: 'rgba(59, 130, 246, 0.1)',
                      color: '#93c5fd',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
