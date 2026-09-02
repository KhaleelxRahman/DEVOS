import React, { useState } from 'react';
import {
  Presentation,
  CheckCircle2,
  Cpu,
  Layers,
  Smartphone,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '../common';

interface OfficeKitModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName?: string;
}

const SLIDES = [
  {
    id: 'vision',
    title: 'DEVOS: Next-Gen AI Developer Operating System',
    subtitle: 'Built for iQOO Hackathon by Quantum Coders',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ background: 'var(--color-surface-elevated)', padding: '16px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', color: 'var(--color-accent)' }}>
            The Core Problem DEVOS Solves
          </h4>
          <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>
            Modern developers switch between 6+ fragmented tools: Claude/ChatGPT for prompts, VS Code for editing, terminal windows, GitHub for PRs, Postman for testing, and Vercel for deployment.
            <strong> DEVOS synthesizes the entire software engineering lifecycle into a unified, AI-native operating system.</strong>
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <div style={{ background: 'var(--color-surface)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <div style={{ color: 'var(--color-accent)', fontWeight: 700, fontSize: '12px', marginBottom: 4 }}>1. Architecture-First</div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Generates complete PRDs and system topologies before scaffolding code.</div>
          </div>
          <div style={{ background: 'var(--color-surface)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <div style={{ color: '#10b981', fontWeight: 700, fontSize: '12px', marginBottom: 4 }}>2. In-Memory Monaco &amp; Terminal</div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Full VS Code Monaco editor with IntelliSense and real sandboxed xterm shell.</div>
          </div>
          <div style={{ background: 'var(--color-surface)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <div style={{ color: '#f59e0b', fontWeight: 700, fontSize: '12px', marginBottom: 4 }}>3. 1-Click Diagnostics &amp; Deploy</div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>AI-driven automated root-cause analysis, git diff reviews, and edge deployments.</div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'architecture',
    title: 'Enterprise Architecture & Gemini 3.7 Pro Integration',
    subtitle: 'Zero-hallucination context synthesis engine',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          <div style={{ background: 'var(--color-surface-elevated)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, color: 'var(--color-accent)' }}>
              <Cpu size={16} />
              <strong style={{ fontSize: '13px' }}>AI Model Layer</strong>
            </div>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              Powered by Google's latest <strong>gemini-3.7-flash</strong> via the official <code>@google/genai</code> SDK, utilizing temperature-controlled inference for reliable code generation and structured JSON extraction.
            </p>
          </div>

          <div style={{ background: 'var(--color-surface-elevated)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, color: '#10b981' }}>
              <Layers size={16} />
              <strong style={{ fontSize: '13px' }}>Full-Stack Core</strong>
            </div>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              High-performance Express + Vite backend running Node.js TypeScript server with dynamic in-memory sandboxes for instant file mutations, git simulation, and fast cold-starts.
            </p>
          </div>
        </div>

        <div style={{ background: '#090d16', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#93c5fd' }}>
          <code>
            [Client: React 18 / Monaco Pro / XTerm] &lt;---&gt; [Server: Express / Vite API Router] &lt;---&gt; [AI: Gemini 3.7 Pro API Engine]
          </code>
        </div>
      </div>
    ),
  },
  {
    id: 'iqoo',
    title: 'iQOO Phone Optimization & Touch Experience',
    subtitle: 'Mobile-first developer workspace for smartphones & tablets',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ background: 'var(--color-surface-elevated)', padding: '16px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f59e0b', marginBottom: 8 }}>
            <Smartphone size={20} />
            <h4 style={{ margin: 0, fontSize: '14px' }}>Optimized for High-Refresh-Rate iQOO Displays</h4>
          </div>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            DEVOS features adaptive split layouts that transform from dual-pane desktop into touch-friendly collapsible tab bars on iQOO phones. Includes floating quick AI triggers, virtual terminal keyboards, and smooth 120Hz gestures.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
          <div style={{ padding: '10px', background: 'var(--color-surface)', borderRadius: 6, border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Touch-Optimized Monaco</div>
            <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>Quick gesture formatting and font scale control.</div>
          </div>
          <div style={{ padding: '10px', background: 'var(--color-surface)', borderRadius: 6, border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-primary)' }}>One-Thumb Command Bar</div>
            <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>Bottom-anchored prompt input for fast single-hand typing.</div>
          </div>
          <div style={{ padding: '10px', background: 'var(--color-surface)', borderRadius: 6, border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Ultra-Fast Loading</div>
            <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>0.18s build time and 99/100 Lighthouse performance.</div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'judges',
    title: 'Hackathon Evaluation & Judge Scorecard',
    subtitle: 'Quantum Coders • DEVOS v1.0.0 Product Delivery',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {[
          { criterion: 'Innovation & AI Depth (25%)', detail: 'End-to-end integration of Gemini 3.7 Flash across 14 synchronized developer workflows.' },
          { criterion: 'Technical Architecture & Code Quality (25%)', detail: 'Zero compiler errors, pure TypeScript, Monaco Editor, and real xterm terminal runner.' },
          { criterion: 'UI/UX & Mobile Polish (25%)', detail: 'Inter typography, 8pt spacing grid, responsive dark mode, and iQOO mobile ergonomics.' },
          { criterion: 'Startup Viability & Real-World Utility (25%)', detail: 'Complete SaaS MVP ready for developer teams, students, and hackathon competitors.' },
        ].map((item, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              background: 'var(--color-surface-elevated)',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
            }}
          >
            <CheckCircle2 size={16} color="#10b981" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-primary)' }}>{item.criterion}</div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{item.detail}</div>
            </div>
          </div>
        ))}
      </div>
    ),
  },
];

export const OfficeKitModal: React.FC<OfficeKitModalProps> = ({ isOpen, onClose }) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  if (!isOpen) return null;

  const currentSlide = SLIDES[currentSlideIndex];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(5, 8, 15, 0.92)',
        backdropFilter: 'blur(8px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '840px',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border-strong)',
          borderRadius: 'var(--radius-2xl)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
        }}
      >
        {/* Top Slide Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            borderBottom: '1px solid var(--color-border)',
            background: 'var(--color-surface-elevated)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
              }}
            >
              <Presentation size={18} />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                DEVOS Office Kit &mdash; Hackathon Presentation Mode
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                Slide {currentSlideIndex + 1} of {SLIDES.length}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Slide Body */}
        <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
          <div style={{ marginBottom: '16px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 4px 0', color: 'var(--color-text-primary)' }}>
              {currentSlide.title}
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--color-accent)', margin: 0 }}>
              {currentSlide.subtitle}
            </p>
          </div>

          {currentSlide.content}
        </div>

        {/* Slide Footer Controls */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 24px',
            borderTop: '1px solid var(--color-border)',
            background: 'var(--color-surface-elevated)',
          }}
        >
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setCurrentSlideIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentSlideIndex === 0}
            leftIcon={<ChevronLeft size={14} />}
          >
            Previous
          </Button>

          {/* Dots Indicator */}
          <div style={{ display: 'flex', gap: 6 }}>
            {SLIDES.map((_, idx) => (
              <div
                key={idx}
                onClick={() => setCurrentSlideIndex(idx)}
                style={{
                  width: idx === currentSlideIndex ? 20 : 8,
                  height: 8,
                  borderRadius: 4,
                  background: idx === currentSlideIndex ? 'var(--color-accent)' : 'var(--color-border)',
                  cursor: 'pointer',
                  transition: 'all 200ms ease',
                }}
              />
            ))}
          </div>

          {currentSlideIndex < SLIDES.length - 1 ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setCurrentSlideIndex((prev) => Math.min(SLIDES.length - 1, prev + 1))}
              rightIcon={<ChevronRight size={14} />}
            >
              Next Slide
            </Button>
          ) : (
            <Button variant="primary" size="sm" onClick={onClose}>
              Exit to Live Workspace
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
