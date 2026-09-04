import React, { useEffect, useState } from 'react';
import { Copy, Download, FileCode2, Trash2 } from 'lucide-react';
import { aiApi, Artifact } from '../../api';
import { Button, Spinner } from '../common';

interface ArtifactPanelProps {
  projectId: string;
}

export const ArtifactPanel: React.FC<ArtifactPanelProps> = ({ projectId }) => {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [selected, setSelected] = useState<Artifact | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  if (loading) return <div className="artifact-panel-loading"><Spinner size={14} /> Loading artifacts...</div>;
  return (
    <div className="artifact-panel">
      <div className="artifact-list" aria-label="Project artifacts">
        {artifacts.length === 0 && <span className="muted">Generated artifacts will appear here.</span>}
        {artifacts.map((artifact) => (
          <button type="button" key={artifact.id} className={selected?.id === artifact.id ? 'artifact-item active' : 'artifact-item'} onClick={() => setSelected(artifact)}>
            <FileCode2 size={14} />
            <span>{artifact.name}</span>
            <small>{artifact.kind}</small>
          </button>
        ))}
      </div>
      {error && <p className="error-text" role="alert">{error}</p>}
      {selected && (
        <div className="artifact-preview">
          <div className="artifact-toolbar">
            <strong>{selected.name}</strong>
            <div>
              <Button variant="secondary" size="sm" onClick={() => void navigator.clipboard.writeText(selected.content)} aria-label="Copy artifact"><Copy size={12} /></Button>
              <Button variant="secondary" size="sm" onClick={() => download(selected)} aria-label="Download artifact"><Download size={12} /></Button>
              <Button variant="secondary" size="sm" onClick={() => void remove(selected)} aria-label="Delete artifact"><Trash2 size={12} /></Button>
            </div>
          </div>
          <pre className="artifact-content">{selected.content}</pre>
        </div>
      )}
    </div>
  );
};
