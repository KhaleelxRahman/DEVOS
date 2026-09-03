import React from 'react';
import { ArrowRight, Code2, Shield, Users, Sparkles, Cpu, Globe } from 'lucide-react';
import { Button } from '../../components/common';

export const AboutPage: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', alignItems: 'center', background: '#020617', color: '#f8fafc', minHeight: '100vh', paddingBottom: 100 }}>
      {/* Background Aurora */}
      <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '100vw', height: '70vh', background: 'radial-gradient(ellipse at top, rgba(37, 99, 235, 0.15), rgba(15, 23, 42, 0) 70%)', zIndex: 0, pointerEvents: 'none' }} />

      <section style={{ width: '100%', maxWidth: 900, padding: '140px 24px 60px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'rgba(37, 99, 235, 0.12)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: 9999, color: '#60a5fa', fontSize: '13px', fontWeight: 600, marginBottom: 24, boxShadow: '0 0 20px rgba(37, 99, 235, 0.15)' }}>
          <Sparkles size={14} /> The Enterprise AI Operating System
        </div>
        <h1 style={{ fontSize: 'clamp(44px, 7vw, 72px)', fontWeight: 800, lineHeight: 1.08, letterSpacing: '-0.035em', margin: '0 0 24px 0', color: '#fff' }}>
          Empowering Engineering Teams Worldwide
        </h1>
        <p style={{ fontSize: '20px', color: '#cbd5e1', lineHeight: 1.6, maxWidth: 760, margin: 0 }}>
          DEVOS is an enterprise SaaS cloud development platform. We bridge the gap between local IDEs and cloud infrastructure, providing a lightning-fast, repository-aware workspace powered by advanced AI.
        </p>
      </section>

      <section style={{ width: '100%', maxWidth: 1200, padding: '40px 24px 80px', display: 'flex', flexDirection: 'column', gap: 40, position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 28 }}>
          <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 24, padding: 36, backdropFilter: 'blur(12px)', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(37, 99, 235, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa' }}>
              <Code2 size={26} />
            </div>
            <h3 style={{ fontSize: '22px', fontWeight: 700, margin: 0, color: '#fff' }}>Our Mission</h3>
            <p style={{ fontSize: '15px', color: '#94a3b8', lineHeight: 1.7, margin: 0 }}>
              To eradicate environmental drift, hardware limitations, and setup friction. DEVOS delivers instant containerized development environments backed by real-time repository intelligence.
            </p>
          </div>

          <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 24, padding: 36, backdropFilter: 'blur(12px)', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(139, 92, 246, 0.15)', border: '1px solid rgba(139, 92, 246, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a78bfa' }}>
              <Cpu size={26} />
            </div>
            <h3 style={{ fontSize: '22px', fontWeight: 700, margin: 0, color: '#fff' }}>AI-First Architecture</h3>
            <p style={{ fontSize: '15px', color: '#94a3b8', lineHeight: 1.7, margin: 0 }}>
              Unlike generic chatbots, our AI engine indexes your entire workspace repository, dependencies, and architecture patterns to deliver precise, context-aware code generation and debugging.
            </p>
          </div>

          <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 24, padding: 36, backdropFilter: 'blur(12px)', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34d399' }}>
              <Shield size={26} />
            </div>
            <h3 style={{ fontSize: '22px', fontWeight: 700, margin: 0, color: '#fff' }}>Enterprise Security</h3>
            <p style={{ fontSize: '15px', color: '#94a3b8', lineHeight: 1.7, margin: 0 }}>
              Built for stringent compliance standards. Every tenant is strictly isolated with encrypted JWT sessions, automated secret scanning, and rigorous RBAC role management.
            </p>
          </div>
        </div>
      </section>

      <section style={{ width: '100%', maxWidth: 1100, padding: '40px 24px', position: 'relative', zIndex: 1 }}>
        <div style={{ background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.2), rgba(139, 92, 246, 0.15))', border: '1px solid rgba(59, 130, 246, 0.4)', borderRadius: 32, padding: '64px 40px', textAlign: 'center', backdropFilter: 'blur(20px)', boxShadow: '0 30px 90px rgba(37, 99, 235, 0.2)' }}>
          <h2 style={{ fontSize: 'clamp(32px, 5vw, 44px)', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', margin: '0 0 16px 0' }}>Ready to transform your workflow?</h2>
          <p style={{ fontSize: '18px', color: '#cbd5e1', maxWidth: 640, margin: '0 auto 36px', lineHeight: 1.6 }}>Join elite engineering teams building faster and more securely with DEVOS.</p>
          <Button variant="primary" size="lg" style={{ padding: '0 36px', height: 52, borderRadius: 14, background: '#2563eb' }} onClick={() => window.location.href = '/app/dashboard'} rightIcon={<ArrowRight size={18} />}>
            Launch DEVOS Workspace
          </Button>
        </div>
      </section>
    </div>
  );
};

