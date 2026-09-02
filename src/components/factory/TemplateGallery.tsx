import React, { useState } from 'react';
import {
  MessageSquare,
  CheckSquare,
  Briefcase,
  Wallet,
  GraduationCap,
  LayoutDashboard,
  ShoppingBag,
  FileText,
  Sparkles,
  ArrowRight,
  Code2,
} from 'lucide-react';

export interface StarterTemplate {
  id: string;
  title: string;
  category: 'AI / ML' | 'Productivity' | 'Personal' | 'Finance' | 'Education' | 'Enterprise' | 'Commerce';
  description: string;
  prompt: string;
  techStack: string;
  icon: React.ReactNode;
  tags: string[];
  gradient: string;
}

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: 'ai-chat',
    title: 'AI Chat App',
    category: 'AI / ML',
    description: 'Conversational assistant with Gemini 3.7 streaming responses, Monaco syntax highlight, and prompt presets.',
    prompt: 'Build an AI Chat App with Gemini streaming responses, Monaco code previews, session history, and customizable prompt templates',
    techStack: 'React 18 + TypeScript + Gemini API',
    icon: <MessageSquare size={18} color="#06b6d4" />,
    tags: ['Gemini 3.7', 'Streaming', 'Monaco'],
    gradient: 'linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%)',
  },
  {
    id: 'todo-app',
    title: 'Todo App',
    category: 'Productivity',
    description: 'High-speed task manager with offline state, priority tags, markdown checklists, and drag-and-drop ordering.',
    prompt: 'Build a Todo App with offline state, priority tags, markdown notes, drag-and-drop ordering, and keyboard navigation',
    techStack: 'React 18 + TypeScript + LocalStorage',
    icon: <CheckSquare size={18} color="#3b82f6" />,
    tags: ['Offline', 'Productivity', 'Keyboard Nav'],
    gradient: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(99, 102, 241, 0.15) 100%)',
  },
  {
    id: 'portfolio',
    title: 'Portfolio',
    category: 'Personal',
    description: 'Sleek dark-mode portfolio featuring interactive project case studies, skills matrix, and contact form.',
    prompt: 'Build a modern Developer Portfolio with dark mode, interactive project showcases, blog markdown reader, and contact form',
    techStack: 'React 18 + TypeScript + Tailwind CSS',
    icon: <Briefcase size={18} color="#8b5cf6" />,
    tags: ['Portfolio', 'Dark Mode', 'Blog'],
    gradient: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%)',
  },
  {
    id: 'expense-tracker',
    title: 'Expense Tracker',
    category: 'Finance',
    description: 'Personal finance dashboard with income/expense logs, monthly budget caps, category analytics, and CSV export.',
    prompt: 'Build an Expense Tracker with monthly budgeting, transaction categorization, visual analytics, and exportable CSV reports',
    techStack: 'React 18 + TypeScript + Recharts + Tailwind',
    icon: <Wallet size={18} color="#10b981" />,
    tags: ['Recharts', 'Finance', 'Dashboard'],
    gradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(20, 184, 166, 0.15) 100%)',
  },
  {
    id: 'college-erp',
    title: 'College ERP',
    category: 'Education',
    description: 'Comprehensive campus management system with student enrollments, attendance records, course rosters, and grade books.',
    prompt: 'Build a College ERP system with student registration, course scheduling, attendance tracking, fee payments, and grade management',
    techStack: 'React 18 + TypeScript + Express + PostgreSQL Schema',
    icon: <GraduationCap size={18} color="#f59e0b" />,
    tags: ['Campus ERP', 'RBAC', 'Database'],
    gradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(217, 119, 6, 0.15) 100%)',
  },
  {
    id: 'startup-saas',
    title: 'Startup SaaS',
    category: 'Enterprise',
    description: 'Multi-tenant admin dashboard with live MRR metrics, user conversion funnels, and role-based access control.',
    prompt: 'Build a SaaS Dashboard with real-time revenue analytics, user cohort tables, and role-based access control',
    techStack: 'React 18 + TypeScript + Express + Tailwind',
    icon: <LayoutDashboard size={18} color="#ec4899" />,
    tags: ['SaaS', 'Metrics', 'RBAC'],
    gradient: 'linear-gradient(135deg, rgba(236, 72, 153, 0.15) 0%, rgba(244, 63, 94, 0.15) 100%)',
  },
  {
    id: 'ecommerce',
    title: 'E-commerce',
    category: 'Commerce',
    description: 'Modern storefront with dynamic search filters, persistent shopping cart, checkout summary, and product catalog.',
    prompt: 'Build an E-Commerce store with product catalog filters, dynamic search, persistent shopping cart, and order summary',
    techStack: 'React 18 + TypeScript + LocalStorage',
    icon: <ShoppingBag size={18} color="#f43f5e" />,
    tags: ['Catalog', 'Cart', 'Commerce'],
    gradient: 'linear-gradient(135deg, rgba(244, 63, 94, 0.15) 0%, rgba(239, 68, 68, 0.15) 100%)',
  },
  {
    id: 'notes-app',
    title: 'Notes App',
    category: 'Productivity',
    description: 'Rich markdown note-taking workspace with instant full-text search, folder categorization, tag filtering, and export.',
    prompt: 'Build a rich markdown Notes App with instant full-text search, folder categorization, tag filtering, and local export',
    techStack: 'React 18 + TypeScript + LocalStorage',
    icon: <FileText size={18} color="#eab308" />,
    tags: ['Markdown', 'Search', 'Notes'],
    gradient: 'linear-gradient(135deg, rgba(234, 179, 8, 0.15) 0%, rgba(202, 138, 4, 0.15) 100%)',
  },
];

interface TemplateGalleryProps {
  selectedTemplateId?: string;
  onSelectTemplate: (template: StarterTemplate) => void;
}

export const TemplateGallery: React.FC<TemplateGalleryProps> = ({
  selectedTemplateId,
  onSelectTemplate,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = ['All', 'AI / ML', 'Productivity', 'Finance', 'Enterprise', 'Education', 'Commerce', 'Personal'];

  const filteredTemplates =
    selectedCategory === 'All'
      ? STARTER_TEMPLATES
      : STARTER_TEMPLATES.filter((t) => t.category === selectedCategory);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {/* Category Pills Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Sparkles size={14} color="var(--color-accent)" />
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            Starter Templates
          </span>
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
            ({STARTER_TEMPLATES.length} pre-configured archetypes)
          </span>
        </div>

        <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 2 }}>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              style={{
                fontSize: '11px',
                padding: '3px 10px',
                borderRadius: 'var(--radius-full)',
                border: selectedCategory === cat
                  ? '1px solid var(--color-accent)'
                  : '1px solid var(--color-border)',
                background: selectedCategory === cat
                  ? 'var(--color-accent)'
                  : 'var(--color-surface)',
                color: selectedCategory === cat ? '#ffffff' : 'var(--color-text-secondary)',
                cursor: 'pointer',
                transition: 'all 150ms ease',
                whiteSpace: 'nowrap',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Templates */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 'var(--space-3)',
        }}
      >
        {filteredTemplates.map((template) => {
          const isSelected = selectedTemplateId === template.id;
          return (
            <div
              key={template.id}
              id={`factory-template-${template.id}`}
              onClick={() => onSelectTemplate(template)}
              style={{
                background: isSelected
                  ? 'var(--color-surface-elevated)'
                  : 'var(--color-surface)',
                border: isSelected
                  ? '1.5px solid var(--color-accent)'
                  : '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-3)',
                cursor: 'pointer',
                transition: 'all 180ms ease',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: isSelected ? '0 0 16px rgba(59, 130, 246, 0.2)' : 'none',
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = 'var(--color-border-strong)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = 'var(--color-border)';
                  e.currentTarget.style.transform = 'none';
                }
              }}
            >
              {/* Subtle Ambient Background Highlight */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: 90,
                  height: 90,
                  background: template.gradient,
                  filter: 'blur(24px)',
                  opacity: 0.6,
                  pointerEvents: 'none',
                }}
              />

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--color-surface-elevated)',
                        border: '1px solid var(--color-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {template.icon}
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                      {template.title}
                    </span>
                  </div>

                  <span
                    style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: 'var(--color-surface-elevated)',
                      color: 'var(--color-text-muted)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    {template.category}
                  </span>
                </div>

                <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: '0 0 10px 0', lineHeight: 1.45 }}>
                  {template.description}
                </p>
              </div>

              <div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                  {template.tags.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        fontSize: '9px',
                        padding: '1px 5px',
                        borderRadius: 3,
                        background: 'rgba(255, 255, 255, 0.04)',
                        color: 'var(--color-text-secondary)',
                        border: '1px solid var(--color-border)',
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '10px',
                    color: isSelected ? 'var(--color-accent)' : 'var(--color-text-muted)',
                    fontWeight: 600,
                    paddingTop: 4,
                    borderTop: '1px solid var(--color-border)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Code2 size={11} />
                    <span>{template.techStack.split('+')[0]}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <span>{isSelected ? 'Selected' : 'Use Template'}</span>
                    <ArrowRight size={10} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
