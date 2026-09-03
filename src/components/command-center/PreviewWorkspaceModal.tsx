import React, { useState } from 'react';
import { Monitor, Tablet, Smartphone, RefreshCw, ExternalLink, X, Maximize2, Terminal, Eye, Search } from 'lucide-react';

interface PreviewWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName?: string;
}

export const PreviewWorkspaceModal: React.FC<PreviewWorkspaceModalProps> = ({
  isOpen,
  onClose,
  projectName = 'DEVOS App Workspace',
}) => {
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [iframeKey, setIframeKey] = useState(0);
  const [isInspectOpen, setIsInspectOpen] = useState(false);

  if (!isOpen) return null;

  const getViewportWidth = () => {
    switch (viewport) {
      case 'mobile':
        return 375;
      case 'tablet':
        return 768;
      default:
        return '100%';
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(2, 6, 23, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        style={{
          width: '95vw',
          height: '92vh',
          background: '#020617',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: 16,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        }}
      >
        {/* Header Bar */}
        <div
          style={{
            padding: '12px 16px',
            background: 'rgba(15, 23, 42, 0.95)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '14px', fontWeight: 800, color: '#f8fafc' }}>
              Live Responsive Preview — {projectName}
            </span>
            <span
              style={{
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: 9999,
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#34d399',
                fontWeight: 700,
              }}
            >
              Port 3000 Ingress Active
            </span>
          </div>

          {/* Viewport controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.06)', borderRadius: 8, padding: 3 }}>
              <button
                onClick={() => setViewport('desktop')}
                style={{
                  padding: '5px 10px',
                  borderRadius: 6,
                  background: viewport === 'desktop' ? '#2563eb' : 'transparent',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: '11px',
                  fontWeight: 600,
                }}
              >
                <Monitor size={13} /> Desktop
              </button>
              <button
                onClick={() => setViewport('tablet')}
                style={{
                  padding: '5px 10px',
                  borderRadius: 6,
                  background: viewport === 'tablet' ? '#2563eb' : 'transparent',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: '11px',
                  fontWeight: 600,
                }}
              >
                <Tablet size={13} /> Tablet (768px)
              </button>
              <button
                onClick={() => setViewport('mobile')}
                style={{
                  padding: '5px 10px',
                  borderRadius: 6,
                  background: viewport === 'mobile' ? '#2563eb' : 'transparent',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: '11px',
                  fontWeight: 600,
                }}
              >
                <Smartphone size={13} /> Mobile (375px)
              </button>
            </div>

            <button
              onClick={() => setIsInspectOpen(!isInspectOpen)}
              style={{
                padding: '6px 10px',
                borderRadius: 8,
                background: isInspectOpen ? 'rgba(37, 99, 235, 0.4)' : 'rgba(255, 255, 255, 0.08)',
                border: isInspectOpen ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.12)',
                color: isInspectOpen ? '#60a5fa' : '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: '11px',
              }}
              title="Toggle Inspector"
            >
              <Search size={13} /> Inspect
            </button>

            <button
              onClick={() => setIframeKey((prev) => prev + 1)}
              style={{
                padding: '6px 10px',
                borderRadius: 8,
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: '11px',
              }}
              title="Reload Frame"
            >
              <RefreshCw size={13} />
            </button>

            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              style={{
                padding: '6px 10px',
                borderRadius: 8,
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#fff',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: '11px',
              }}
            >
              <ExternalLink size={13} /> New Tab
            </a>

            <button
              onClick={onClose}
              style={{
                padding: '6px 10px',
                borderRadius: 8,
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#fca5a5',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <X size={14} /> Close
            </button>
          </div>
        </div>

        {/* Viewport Frame Container & Inspector */}
        <div
          style={{
            flex: 1,
            background: '#090d16',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            overflow: 'auto',
            gap: 20,
          }}
        >
          <div
            style={{
              width: getViewportWidth(),
              height: '100%',
              maxHeight: viewport === 'mobile' ? 800 : viewport === 'tablet' ? 900 : '100%',
              background: '#000',
              borderRadius: viewport === 'desktop' ? 8 : 16,
              border: viewport === 'desktop' ? '1px solid rgba(255,255,255,0.1)' : '8px solid #1e293b',
              overflow: 'hidden',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
              transition: 'all 300ms ease',
            }}
          >
            <iframe
              key={iframeKey}
              src="/"
              title="DEVOS Live Preview"
              style={{ width: '100%', height: '100%', border: 'none' }}
            />
          </div>

          {isInspectOpen && (
            <div
              style={{
                width: 320,
                height: '100%',
                background: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 12,
                padding: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                color: '#f8fafc',
                fontSize: '11px',
                fontFamily: 'monospace',
                overflowY: 'auto',
              }}
            >
              <div style={{ fontWeight: 800, color: '#60a5fa', fontSize: '12px' }}>🔍 DOM &amp; Style Inspector</div>
              <div>
                <span style={{ color: '#94a3b8' }}>Viewport Width:</span>{' '}
                <span style={{ color: '#34d399' }}>{getViewportWidth() === '100%' ? '1920px (Desktop)' : `${getViewportWidth()}px`}</span>
              </div>
              <div>
                <span style={{ color: '#94a3b8' }}>Target Route:</span> <span style={{ color: '#f8fafc' }}>/ (Landing Page)</span>
              </div>
              <div>
                <span style={{ color: '#94a3b8' }}>Ingress Port:</span> <span style={{ color: '#34d399' }}>3000 (Proxy Active)</span>
              </div>
              <hr style={{ borderColor: 'rgba(255, 255, 255, 0.1)', margin: '4px 0' }} />
              <div style={{ fontWeight: 700, color: '#cbd5e1' }}>Console Log Stream</div>
              <div style={{ background: '#020617', padding: 8, borderRadius: 6, color: '#38bdf8', fontSize: '10px' }}>
                [HMR] Dev server running on port 3000<br />
                [React] Root layout mounted cleanly<br />
                [DEVOS] Autonomous Agent listening
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
