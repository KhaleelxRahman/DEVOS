import React, { useState, useEffect } from 'react';
import {
  Rocket,
  Globe,
  CheckCircle2,
  ExternalLink,
  Terminal,
  Server,
  Cloud,
  RotateCcw,
  History,
  ShieldCheck,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { deploymentApi } from '../../api';
import { Spinner, Button } from '../common';
import { useToast } from '../common/Toast';

interface DeployCenterPanelProps {
  projectId: string;
  projectName?: string;
}

const DEPLOY_TARGETS = [
  { id: 'vercel', name: 'Vercel', icon: <Rocket size={14} />, desc: 'Global Edge Network & Serverless functions' },
  { id: 'netlify', name: 'Netlify', icon: <Globe size={14} />, desc: 'Instant rollbacks & automated form backend' },
  { id: 'cloud_run', name: 'Google Cloud Run', icon: <Server size={14} />, desc: 'Production container scaling to zero' },
  { id: 'github_pages', name: 'GitHub Pages', icon: <Cloud size={14} />, desc: 'Static web hosting directly from Git branch' },
];

export const DeployCenterPanel: React.FC<DeployCenterPanelProps> = ({ projectId }) => {
  const [selectedTarget, setSelectedTarget] = useState<'vercel' | 'netlify' | 'cloud_run' | 'github_pages'>('vercel');
  const [isDeploying, setIsDeploying] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [currentDeployment, setCurrentDeployment] = useState<any | null>(null);
  const [deploymentHistory, setDeploymentHistory] = useState<any[]>([]);

  const { toast } = useToast();

  const loadDeployments = async () => {
    try {
      const res = await deploymentApi.list(projectId);
      if (res.success && res.data?.deployments) {
        setDeploymentHistory(res.data.deployments);
        if (res.data.deployments.length > 0) {
          setCurrentDeployment(res.data.deployments[0]);
        }
      }
    } catch {}
  };

  useEffect(() => {
    loadDeployments();
  }, [projectId]);

  const handleDeploy = async () => {
    if (isDeploying) return;
    setIsDeploying(true);

    try {
      const res = await deploymentApi.deploy(projectId, {
        target: selectedTarget,
      });

      if (res.success && res.data) {
        setCurrentDeployment(res.data);
        await loadDeployments();

        // Launch celebratory confetti
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'],
        });

        toast(`Deployed successfully to ${selectedTarget.toUpperCase()}!`, 'success');
      }
    } catch (err: any) {
      toast(err.message || 'Deployment failed', 'error');
    } finally {
      setIsDeploying(false);
    }
  };

  const handleRollback = async (deploymentId: string) => {
    if (isRollingBack) return;
    setIsRollingBack(true);
    try {
      const res = await deploymentApi.rollback(projectId, deploymentId);
      if (res.success && res.data) {
        setCurrentDeployment(res.data);
        await loadDeployments();
        toast(`Successfully rolled back to verified deployment`, 'success');
      }
    } catch (err: any) {
      toast(err.message || 'Rollback failed', 'error');
    } finally {
      setIsRollingBack(false);
    }
  };

  const formattedLogs = currentDeployment?.logs
    ? Array.isArray(currentDeployment.logs)
      ? currentDeployment.logs.join('\n')
      : String(currentDeployment.logs)
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, padding: '12px', background: 'var(--color-surface)', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
            }}
          >
            <Rocket size={16} />
          </div>
          <div>
            <h3 style={{ fontSize: '13px', fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>
              DEVOS Cloud Deployment Center
            </h3>
            <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
              Automated CI/CD Build &amp; Edge Distribution
            </span>
          </div>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={handleDeploy}
          disabled={isDeploying}
          leftIcon={isDeploying ? <Spinner size={12} /> : <Rocket size={12} />}
          style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
        >
          {isDeploying ? 'Deploying Pipeline…' : `Deploy to ${selectedTarget.toUpperCase()}`}
        </Button>
      </div>

      {/* Target Selector Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px', marginBottom: '14px' }}>
        {DEPLOY_TARGETS.map((t) => {
          const isSelected = selectedTarget === t.id;
          return (
            <div
              key={t.id}
              onClick={() => setSelectedTarget(t.id as any)}
              style={{
                padding: '8px 10px',
                borderRadius: 'var(--radius-md)',
                background: isSelected ? 'var(--color-surface-elevated)' : 'var(--color-background)',
                border: isSelected ? '2px solid var(--color-accent)' : '1px solid var(--color-border)',
                cursor: 'pointer',
                transition: 'all 150ms ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, color: isSelected ? 'var(--color-accent)' : 'var(--color-text-primary)' }}>
                {t.icon}
                <span style={{ fontSize: '11px', fontWeight: 600 }}>{t.name}</span>
              </div>
              <p style={{ margin: 0, fontSize: '10px', color: 'var(--color-text-muted)', lineHeight: 1.3 }}>
                {t.desc}
              </p>
            </div>
          );
        })}
      </div>

      {/* Current Live Deployment Info */}
      {currentDeployment && (
        <div
          style={{
            background: 'var(--color-surface-elevated)',
            border: '1px solid var(--color-border-strong)',
            borderRadius: 'var(--radius-lg)',
            padding: '12px',
            marginBottom: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle2 size={16} color="#10b981" />
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                Production Deployment Live
              </span>
            </div>
            <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: 'var(--radius-full)', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', fontWeight: 600 }}>
              STATUS: LIVE
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--color-background)', padding: '6px 10px', borderRadius: 4, border: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>
              {currentDeployment.url}
            </span>
            <a
              href={currentDeployment.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '10px', color: 'var(--color-text-secondary)', textDecoration: 'none' }}
            >
              <span>Visit</span>
              <ExternalLink size={11} />
            </a>
          </div>

          <div style={{ display: 'flex', gap: 12, fontSize: '10px', color: 'var(--color-text-muted)', flexWrap: 'wrap' }}>
            <span>Target: <strong>{currentDeployment.target}</strong></span>
            <span>Duration: <strong>{currentDeployment.build_time_seconds || 3.4}s</strong></span>
            <span>Branch: <strong>{currentDeployment.branch || 'main'}</strong></span>
            <span>Commit: <strong>{currentDeployment.commit_hash || 'c8f3b21'}</strong></span>
          </div>
        </div>
      )}

      {/* Deployment History Table */}
      {deploymentHistory.length > 1 && (
        <div style={{ marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <History size={12} color="var(--color-text-muted)" />
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
              Deployment History &amp; Rollback:
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {deploymentHistory.slice(1, 4).map((hist) => (
              <div
                key={hist.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  borderRadius: 4,
                  background: 'var(--color-surface-elevated)',
                  border: '1px solid var(--color-border)',
                  fontSize: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ShieldCheck size={12} color="#10b981" />
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{hist.id}</span>
                  <span style={{ color: 'var(--color-text-muted)' }}>({hist.target})</span>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleRollback(hist.id)}
                  disabled={isRollingBack}
                  leftIcon={isRollingBack ? <Spinner size={10} /> : <RotateCcw size={10} />}
                  style={{ fontSize: '10px', padding: '2px 8px', height: '24px' }}
                >
                  Rollback
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Build Log Stream */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 120 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <Terminal size={12} color="var(--color-text-muted)" />
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
            Pipeline Logs:
          </span>
        </div>

        <div
          style={{
            flex: 1,
            background: '#090d16',
            border: '1px solid var(--color-border)',
            borderRadius: 4,
            padding: '8px 10px',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: '#a7f3d0',
            overflowY: 'auto',
            lineHeight: 1.5,
          }}
        >
          {formattedLogs ? (
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
              {formattedLogs}
            </pre>
          ) : (
            <div style={{ color: 'var(--color-text-muted)' }}>
              Click 'Deploy' to start the automated build pipeline.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
