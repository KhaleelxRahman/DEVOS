import React, { useEffect, useState } from 'react';
import { Copy, Download, FileCode2, Trash2, ExternalLink, Check, Braces, FileText, Globe } from 'lucide-react';
import { aiApi, Artifact } from '../../api';
import { Button, Spinner, MarkdownContent } from '../common';

interface ArtifactPanelProps {
  projectId: string;
  onOpenInMonaco?: (artifact: Artifact) => void;
}

const iconFor = (kind: Artifact['kind']) => kind === 'json' ? Braces : kind === 'markdown' ? FileText : kind === 'html' || kind === 'svg' ? Globe : FileCode2;

export const ArtifactPanel: React.FC<ArtifactPanelProps> = ({ projectId, onOpenInMonaco }) => {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [selected, setSelected] = useState<Artifact | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let mounted = true;
    aiApi.listArtifacts(projectId)
      .then((response) => {
        if (!mounted) return;
        const next = response.data?.artifacts || [];
        setArtifacts(next);
        setSelected(next[0] || null);
      })
      .catch((err) => mounted && setError(err.message || 'Unable to load artifacts'))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [projectId]);

  const remove = async (artifact: Artifact) => {
    await aiApi.deleteArtifact(projectId, artifact.id);
    const next = artifacts.filter((item) => item.id !== artifact.id);
    setArtifacts(next);
    setSelected(next[0] || null);
  };

  const download = (artifact: Artifact) => {
    const blob = new Blob([artifact.content], { type: artifact.mime_type || 'text/plain' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = artifact.name;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const copy = async (artifact: Artifact) => {
    await navigator.clipboard.writeText(artifact.content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };
  const preview = (artifact: Artifact) => {
    if (artifact.kind === 'markdown') return <MarkdownContent content={artifact.content} />;
    if (artifact.kind === 'json') {
      try { return <pre className="artifact-content">{JSON.stringify(JSON.parse(artifact.content), null, 2)}</pre>; }
      catch { return <pre className="artifact-content">{artifact.content}</pre>; }
    }
    if (artifact.kind === 'html') return <iframe className="artifact-html-preview" title={`${artifact.name} preview`} sandbox="" srcDoc={artifact.content} />;
    if (artifact.kind === 'svg') return <div className="artifact-svg-preview"><img src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(artifact.content)}`} alt={`${artifact.name} preview`} /></div>;
    return <pre className="artifact-content">{artifact.content}</pre>;
  };

  if (loading) return <div className="artifact-panel-loading"><Spinner size={14} /> Loading artifacts...</div>;
  return (
    <div className="artifact-panel">
      <div className="artifact-list" aria-label="Project artifacts">
        {artifacts.length === 0 && <span className="muted">Generated artifacts will appear here.</span>}
        {artifacts.map((artifact) => (
          <button type="button" key={artifact.id} className={selected?.id === artifact.id ? 'artifact-item active' : 'artifact-item'} onClick={() => setSelected(artifact)} aria-label={`Open artifact ${artifact.name}`}>
            {React.createElement(iconFor(artifact.kind), { size: 14 })}
            <span><b>{artifact.name}</b><small>{artifact.kind} · {new Date(artifact.created_at).toLocaleDateString()}</small></span>
            <small className="artifact-version">v{artifact.updated_at && artifact.updated_at !== artifact.created_at ? '2' : '1'}</small>
          </button>
        ))}
      </div>
      {error && <p className="error-text" role="alert">{error}</p>}
      {selected && (
        <div className="artifact-preview">
          <div className="artifact-toolbar">
            <strong>{selected.name}</strong>
            <div>
              <Button variant="secondary" size="sm" onClick={() => void copy(selected)} aria-label="Copy artifact">{copied ? <Check size={12} /> : <Copy size={12} />}</Button>
              <Button variant="secondary" size="sm" onClick={() => download(selected)} aria-label="Download artifact"><Download size={12} /></Button>
              {onOpenInMonaco && <Button variant="secondary" size="sm" onClick={() => onOpenInMonaco(selected)} aria-label="Open artifact in Monaco"><ExternalLink size={12} /></Button>}
              <Button variant="secondary" size="sm" onClick={() => void remove(selected)} aria-label="Delete artifact"><Trash2 size={12} /></Button>
            </div>
          </div>
          <div className="artifact-preview-body">{preview(selected)}</div>
        </div>
      )}
    </div>
  );
};
