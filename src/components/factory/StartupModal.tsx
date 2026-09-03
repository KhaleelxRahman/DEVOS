import React, { useState } from 'react';
import {
  X,
  Presentation,
  Award,
  Play,
  TrendingUp,
  ShieldCheck,
  Copy,
  Check,
} from 'lucide-react';
import { Button, Badge } from '../common';
import { useToast } from '../common/Toast';

interface StartupModalProps {
  isOpen: boolean;
  onClose: () => void;
  appName: string;
  prompt?: string;
  startupData: {
    pitch_deck?: Array<{ slide: number; title: string; content: string; key_metric: string }>;
    demo_script?: Array<{ step: number; time: string; action: string; talking_point: string; wow_factor: string }>;
    presentation_summary?: {
      innovation_score: string;
      technical_depth: string;
      market_viability: string;
      key_highlights: string[];
    };
    investor_memo?: string;
    technical_whitepaper?: string;
  } | null;
}

export const StartupModal: React.FC<StartupModalProps> = ({
  isOpen,
  onClose,
  appName,
  startupData,
}) => {
  const [activeTab, setActiveTab] = useState<'pitch' | 'demo' | 'presentation' | 'memo'>('pitch');
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  if (!isOpen || !startupData) return null;

  const handleCopyMemo = () => {
    const text = startupData.investor_memo || '';
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast('Copied investor memo to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '900px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          overflow: 'hidden',
          color: '#f8fafc',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '16px 20px',
            background: '#1e293b',
            borderBottom: '1px solid #334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
              }}
            >
              <Award size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>Startup Presentation Hub</h3>
                <Badge variant="accent">Production Edition</Badge>
              </div>
              <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>
                Assets generated for <strong>{appName}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: 6,
              borderRadius: 6,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Subnav */}
        <div
          style={{
            display: 'flex',
            gap: 6,
            padding: '10px 20px',
            background: '#0f172a',
            borderBottom: '1px solid #1e293b',
          }}
        >
          {[
            { id: 'pitch', label: 'Pitch Deck (5 Slides)', icon: <Presentation size={14} /> },
            { id: 'demo', label: 'Live Demo Script', icon: <Play size={14} /> },
            { id: 'presentation', label: 'Evaluation Scorecard', icon: <Award size={14} /> },
            { id: 'memo', label: 'Investor Memo & Specs', icon: <TrendingUp size={14} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 8,
                border: 'none',
                background: activeTab === tab.id ? '#3b82f6' : '#1e293b',
                color: activeTab === tab.id ? '#ffffff' : '#94a3b8',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Pitch Deck Tab */}
          {activeTab === 'pitch' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
              {(startupData.pitch_deck || []).map((slide) => (
                <div
                  key={slide.slide}
                  style={{
                    background: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: 12,
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 10,
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 800 }}>SLIDE 0{slide.slide}</span>
                      <span style={{ fontSize: '10px', color: '#64748b' }}>Pitch Deck</span>
                    </div>
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
                      {slide.title}
                    </h4>
                    <p style={{ margin: 0, fontSize: '12px', color: '#cbd5e1', lineHeight: 1.5 }}>
                      {slide.content}
                    </p>
                  </div>
                  <div
                    style={{
                      background: 'rgba(59, 130, 246, 0.1)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      padding: '6px 10px',
                      borderRadius: 6,
                      fontSize: '11px',
                      color: '#60a5fa',
                      fontWeight: 600,
                    }}
                  >
                    ★ Key Metric: {slide.key_metric}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Demo Script Tab */}
          {activeTab === 'demo' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(startupData.demo_script || []).map((item) => (
                <div
                  key={item.step}
                  style={{
                    background: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: 10,
                    padding: '12px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          background: '#3b82f6',
                          color: '#ffffff',
                          fontSize: '10px',
                          fontWeight: 800,
                          padding: '2px 6px',
                          borderRadius: 4,
                        }}
                      >
                        STEP {item.step}
                      </span>
                      <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>{item.time}</span>
                    </div>
                    <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 700 }}>
                      ⚡ Wow: {item.wow_factor}
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
                    Action: {item.action}
                  </div>
                  <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', lineHeight: 1.4 }}>
                    <strong>Talking Point:</strong> &ldquo;{item.talking_point}&rdquo;
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Presentation Scorecard Tab */}
          {activeTab === 'presentation' && startupData.presentation_summary && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(217, 119, 6, 0.15) 100%)',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  borderRadius: 12,
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 700 }}>ESTIMATED SCORE</div>
                  <div style={{ fontSize: '28px', fontWeight: 900, color: '#ffffff', marginTop: 2 }}>
                    {startupData.presentation_summary.innovation_score}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>Category Dominance</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#10b981' }}>Top 1% Finalist Grade</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ background: '#1e293b', padding: '14px', borderRadius: 10, border: '1px solid #334155' }}>
                  <div style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 700, marginBottom: 4 }}>TECHNICAL DEPTH</div>
                  <p style={{ margin: 0, fontSize: '12px', color: '#cbd5e1', lineHeight: 1.5 }}>
                    {startupData.presentation_summary.technical_depth}
                  </p>
                </div>
                <div style={{ background: '#1e293b', padding: '14px', borderRadius: 10, border: '1px solid #334155' }}>
                  <div style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 700, marginBottom: 4 }}>MARKET VIABILITY</div>
                  <p style={{ margin: 0, fontSize: '12px', color: '#cbd5e1', lineHeight: 1.5 }}>
                    {startupData.presentation_summary.market_viability}
                  </p>
                </div>
              </div>

              <div style={{ background: '#1e293b', padding: '14px', borderRadius: 10, border: '1px solid #334155' }}>
                <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 700, marginBottom: 8 }}>KEY HIGHLIGHTS</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {startupData.presentation_summary.key_highlights.map((h, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '12px', color: '#cbd5e1' }}>
                      <ShieldCheck size={14} color="#10b981" />
                      <span>{h}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Investor Memo Tab */}
          {activeTab === 'memo' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>Executive Brief &amp; Investment Summary</span>
                <Button variant="secondary" size="sm" onClick={handleCopyMemo} leftIcon={copied ? <Check size={12} /> : <Copy size={12} />}>
                  {copied ? 'Copied' : 'Copy Memo'}
                </Button>
              </div>
              <div
                style={{
                  background: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: 10,
                  padding: '16px',
                  fontSize: '13px',
                  color: '#cbd5e1',
                  lineHeight: 1.6,
                }}
              >
                {startupData.investor_memo}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '12px 20px',
            background: '#1e293b',
            borderTop: '1px solid #334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
            Ready for presentation to evaluators &amp; investors
          </span>
          <Button variant="primary" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
};
