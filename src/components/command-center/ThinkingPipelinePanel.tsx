import React, { useState } from 'react';
import {
  Sparkles,
  Layers,
  Database,
  Network,
  FolderTree,
  ShieldAlert,
  Clock,
  CheckCircle2,
  ChevronRight,
  Code2,
} from 'lucide-react';

interface ThinkingPipelinePanelProps {
  planData?: any;
}

export const ThinkingPipelinePanel: React.FC<ThinkingPipelinePanelProps> = ({ planData }) => {
  const [activeTab, setActiveTab] = useState<'requirements' | 'architecture' | 'components' | 'api' | 'schema' | 'risks' | 'strategy'>('requirements');

  // Default plan if none provided yet
  const plan = planData || {
    requirements: [
      { id: 'REQ-1', title: 'SPA + REST Architecture', desc: 'React 18 + Vite frontend with Express server.ts proxy' },
      { id: 'REQ-2', title: 'Interactive Code Editor & Web Shell', desc: 'Monaco Editor Pro with xterm.js live terminal execution' },
      { id: 'REQ-3', title: 'Autonomous Execution Pipeline', desc: 'One-command pipeline from requirements analysis to deployment' },
    ],
    architecture: {
      pattern: 'Modular Full Stack (React 18 + Express + Memory Store)',
      techStack: ['React 18', 'TypeScript', 'Tailwind CSS', 'Express.js', 'Vite', 'Gemini AI API'],
      dataFlow: 'Client Components -> REST API (/api/*) -> In-Memory Store / External SDK',
    },
    components: [
      { name: 'App.tsx', role: 'Main Router & Layout Wrapper', status: 'Implemented' },
      { name: 'WorkspacePage.tsx', role: 'IDE & Multi-Tool Panel Workspace', status: 'Implemented' },
      { name: 'MonacoEditorPro.tsx', role: 'Monaco Code Editor Container', status: 'Implemented' },
      { name: 'RealTerminal.tsx', role: 'xterm.js Web Shell Terminal', status: 'Implemented' },
      { name: 'EnterpriseAIPanel.tsx', role: 'Gemini Context Assistant', status: 'Implemented' },
    ],
    apiPlan: [
      { method: 'GET', endpoint: '/api/projects', desc: 'List active user projects' },
      { method: 'GET', endpoint: '/api/projects/:id/files', desc: 'Fetch project file tree' },
      { method: 'POST', endpoint: '/api/projects/:id/ai/chat', desc: 'Execute Gemini AI prompt' },
      { method: 'POST', endpoint: '/api/projects/:id/terminal/execute', desc: 'Execute shell command' },
    ],
    databaseSchema: [
      { table: 'UserRecord', fields: 'id, email, name, role, is_active, created_at' },
      { table: 'ProjectRecord', fields: 'id, user_id, name, description, repository_url' },
      { table: 'FileVersionRecord', fields: 'id, project_id, file_path, content, created_at' },
    ],
    risks: [
      { risk: 'Runtime Error: Undefined Array', mitigation: 'Safe fallback destructuring & defensive nullish checks' },
      { risk: 'Secret API Key Exposure', mitigation: 'Keep GEMINI_API_KEY strictly server-side in server.ts' },
      { risk: 'Infinite React Re-renders', mitigation: 'Avoid updating state directly in component render body' },
    ],
    buildStrategy: {
      steps: [
        '1. Static type verification & JSX syntax check',
        '2. Vite bundler compilation & asset optimizations',
        '3. Express route binding on Port 3000 Ingress',
        '4. Health check verification on /health & /api/health',
      ],
      targetMetrics: 'Bundle < 300KB • Cold Start < 50ms • Lighthouse 98+',
    },
  };

  return (
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: 12, height: '100%', overflowY: 'auto' }}>
      {/* Header */}
      <div
        style={{
          padding: '10px 12px',
          borderRadius: 10,
          background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.15), rgba(139, 92, 246, 0.15))',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <Sparkles size={16} color="#60a5fa" />
        <div>
          <div style={{ fontSize: '12px', fontWeight: 800, color: '#f8fafc' }}>
            Autonomous Thinking Pipeline
          </div>
          <div style={{ fontSize: '10px', color: '#94a3b8' }}>
            AI Architecture, Component Map, API Specs &amp; Schema generated before code writes
          </div>
        </div>
      </div>

      {/* Pill Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          background: 'rgba(2, 6, 23, 0.6)',
          padding: 3,
          borderRadius: 8,
          border: '1px solid rgba(255, 255, 255, 0.08)',
          overflowX: 'auto',
        }}
      >
        {[
          { key: 'requirements', label: 'Requirements', icon: <Sparkles size={11} /> },
          { key: 'architecture', label: 'Architecture', icon: <Layers size={11} /> },
          { key: 'components', label: 'Components', icon: <Code2 size={11} /> },
          { key: 'api', label: 'API Specs', icon: <Network size={11} /> },
          { key: 'schema', label: 'DB Schema', icon: <Database size={11} /> },
          { key: 'risks', label: 'Risk Analysis', icon: <ShieldAlert size={11} /> },
          { key: 'strategy', label: 'Build Strategy', icon: <Clock size={11} /> },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 8px',
                borderRadius: 6,
                fontSize: '11px',
                fontWeight: isActive ? 700 : 500,
                background: isActive ? 'rgba(37, 99, 235, 0.8)' : 'transparent',
                color: isActive ? '#fff' : '#94a3b8',
                border: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {activeTab === 'requirements' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {plan.requirements?.map((req: any, idx: number) => (
              <div
                key={idx}
                style={{
                  padding: '8px 10px',
                  borderRadius: 6,
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#38bdf8' }}>{req.id} — {req.title}</div>
                <div style={{ fontSize: '10px', color: '#cbd5e1', marginTop: 4 }}>{req.desc}</div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'architecture' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ padding: '10px', borderRadius: 8, background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#60a5fa' }}>Architecture Pattern</div>
              <div style={{ fontSize: '12px', color: '#f8fafc', marginTop: 2 }}>{plan.architecture.pattern}</div>
            </div>

            <div style={{ padding: '10px', borderRadius: 8, background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#60a5fa' }}>Tech Stack Dependencies</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                {plan.architecture.techStack.map((tech: string, i: number) => (
                  <span key={i} style={{ padding: '2px 8px', borderRadius: 4, background: 'rgba(59, 130, 246, 0.15)', color: '#93c5fd', fontSize: '10px', fontWeight: 600 }}>
                    {tech}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ padding: '10px', borderRadius: 8, background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#60a5fa' }}>Data Flow Protocol</div>
              <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: 4, fontFamily: 'monospace' }}>
                {plan.architecture.dataFlow}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'components' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {plan.components.map((comp: any, idx: number) => (
              <div
                key={idx}
                style={{
                  padding: '8px 10px',
                  borderRadius: 6,
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#f8fafc' }}>{comp.name}</div>
                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>{comp.role}</div>
                </div>
                <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: 4, background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontWeight: 600 }}>
                  {comp.status}
                </span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'api' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {plan.apiPlan.map((api: any, idx: number) => (
              <div
                key={idx}
                style={{
                  padding: '8px 10px',
                  borderRadius: 6,
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span
                    style={{
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: api.method === 'GET' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                      color: api.method === 'GET' ? '#34d399' : '#60a5fa',
                      fontSize: '10px',
                      fontWeight: 800,
                      fontFamily: 'monospace',
                    }}
                  >
                    {api.method}
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#f8fafc', fontFamily: 'monospace' }}>
                    {api.endpoint}
                  </span>
                </div>
                <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: 4 }}>{api.desc}</div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'schema' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {plan.databaseSchema.map((sch: any, idx: number) => (
              <div
                key={idx}
                style={{
                  padding: '8px 10px',
                  borderRadius: 6,
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Database size={12} color="#8b5cf6" />
                  <span>{sch.table}</span>
                </div>
                <div style={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace', marginTop: 4 }}>
                  Fields: {sch.fields}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'risks' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {plan.risks.map((risk: any, idx: number) => (
              <div
                key={idx}
                style={{
                  padding: '8px 10px',
                  borderRadius: 6,
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#fca5a5' }}>⚠️ Risk: {risk.risk}</div>
                <div style={{ fontSize: '10px', color: '#34d399', marginTop: 4 }}>
                  ✓ Mitigation: {risk.mitigation}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'strategy' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ padding: '10px', borderRadius: 8, background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#3b82f6', marginBottom: 6 }}>Automated Build Pipeline Steps</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {plan.buildStrategy?.steps.map((s: string, i: number) => (
                  <div key={i} style={{ fontSize: '11px', color: '#cbd5e1', fontFamily: 'monospace' }}>
                    {s}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ padding: '8px 10px', borderRadius: 6, background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              <div style={{ fontSize: '10px', color: '#34d399', fontWeight: 700 }}>Target Performance &amp; Quality Metrics</div>
              <div style={{ fontSize: '11px', color: '#f8fafc', marginTop: 2 }}>{plan.buildStrategy?.targetMetrics}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
