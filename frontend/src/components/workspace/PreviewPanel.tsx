import React, { useCallback, useEffect, useState } from 'react';
import { Eye, ExternalLink, Play, Square } from 'lucide-react';
import { previewApi, PreviewInfo } from '../../api';
import { Spinner, Badge } from '../common';

interface PreviewPanelProps {
  projectId: string;
}

const authedFrameSrc = (url: string | null): string | null => {
  if (!url) return null;
  // The iframe cannot set an Authorization header, so the session JWT rides
  // in the URL (short-lived, validated server-side against the execution's
  // owner). This mirrors the backend's preview_token contract.
  const token = localStorage.getItem('devos_token');
  return token ? `${url}?preview_token=${encodeURIComponent(token)}` : url;
};

export const PreviewPanel: React.FC<PreviewPanelProps> = ({ projectId }) => {
  const [preview, setPreview] = useState<PreviewInfo | null>(null);
  const [busy, setBusy] = useState<'start' | 'stop' | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await previewApi.status(projectId);
      setPreview(res.data ?? null);
    } catch (err: any) {
      setError(err.message || 'Failed to load preview status');
    }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const start = async () => {
    setBusy('start');
    setError('');
    try {
      const res = await previewApi.start(projectId);
      setPreview(res.data!);
    } catch (err: any) {
      setError(err.message || 'Failed to start preview');
    } finally {
      setBusy(null);
    }
  };

  const stop = async () => {
    setBusy('stop');
    setError('');
    try {
      const res = await previewApi.stop(projectId);
      setPreview(res.data!);
    } catch (err: any) {
      setError(err.message || 'Failed to stop preview');
    } finally {
      setBusy(null);
    }
  };

  const ready = preview?.status === 'READY' && !!preview.url;
  const frameSrc = authedFrameSrc(
    preview?.url ?? null,
    preview?.preview_token ?? null,
  );

  return (
    <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-text-muted)' }}>
        <Eye size={12} /> Preview
        {preview && preview.status !== 'STOPPED' && (
          <Badge variant={ready ? 'success' : 'warning'}>
            {preview.status}{preview.port ? ` · :${preview.port}` : ''}
          </Badge>
        )}
      </div>
      {error && <p style={{ color: 'var(--color-error)', margin: 0 }} role="alert">{error}</p>}
      {preview?.failure_reason && (
        <p style={{ color: 'var(--color-warning)', margin: 0 }}>{preview.failure_reason}</p>
      )}
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          className="btn btn-primary btn-sm"
          disabled={busy !== null}
          onClick={start}
          aria-label="Start dev server preview"
        >
          {busy === 'start' ? <Spinner size={10} /> : <Play size={12} />} Start
        </button>
        {ready && (
          <button
            className="btn btn-sm"
            disabled={busy !== null}
            onClick={stop}
            aria-label="Stop dev server preview"
          >
            {busy === 'stop' ? <Spinner size={10} /> : <Square size={12} />} Stop
          </button>
        )}
        {ready && frameSrc && (
          <a
            className="btn btn-sm"
            href={frameSrc}
            target="_blank"
            rel="noreferrer"
            aria-label="Open preview in a new tab"
          >
            <ExternalLink size={12} /> Open
          </a>
        )}
      </div>
      {ready && frameSrc && (
        <iframe
          src={frameSrc}
          title="Project preview"
          style={{
            width: '100%',
            height: 260,
            border: '1px solid var(--color-border)',
            borderRadius: 6,
            background: '#fff',
          }}
        />
      )}
    </div>
  );
};