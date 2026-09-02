import React, { useState, useEffect } from 'react';
import {
  Tag,
  Sparkles,
  Plus,
} from 'lucide-react';
import { gitApi } from '../../api';
import { useToast } from '../common/Toast';
import { Spinner } from '../common/Spinner';
import { ReleaseResult } from '../../types/git';

interface ReleaseManagerProps {
  projectId: string;
}

export const ReleaseManager: React.FC<ReleaseManagerProps> = ({ projectId }) => {
  const [tags, setTags] = useState<ReleaseResult[]>([]);
  const [tagName, setTagName] = useState('v1.0.1');
  const [releaseTitle, setReleaseTitle] = useState('Release v1.0.1');
  const [releaseNotes, setReleaseNotes] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [versionType, setVersionType] = useState<'patch' | 'minor' | 'major'>('patch');
  const { toast } = useToast();

  const fetchTags = async () => {
    try {
      const res = await gitApi.getTags(projectId);
      if (res.success && res.data?.tags) {
        setTags(res.data.tags);
        if (res.data.tags.length > 0) {
          const latest = res.data.tags[0].tag_name.replace(/^v/, '');
          const parts = latest.split('.').map(Number);
          if (parts.length === 3 && !isNaN(parts[0])) {
            setTagName(`v${parts[0]}.${parts[1]}.${parts[2] + 1}`);
            setReleaseTitle(`Release v${parts[0]}.${parts[1]}.${parts[2] + 1}`);
          }
        }
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchTags();
  }, [projectId]);

  const handleBumpVersion = (type: 'patch' | 'minor' | 'major') => {
    setVersionType(type);
    const latest = tags.length > 0 ? tags[0].tag_name.replace(/^v/, '') : '1.0.0';
    const parts = latest.split('.').map((p: string) => parseInt(p, 10) || 0);
    let [maj, min, pat] = [parts[0] || 1, parts[1] || 0, parts[2] || 0];

    if (type === 'patch') pat += 1;
    if (type === 'minor') {
      min += 1;
      pat = 0;
    }
    if (type === 'major') {
      maj += 1;
      min = 0;
      pat = 0;
    }

    const nextTag = `v${maj}.${min}.${pat}`;
    setTagName(nextTag);
    setReleaseTitle(`Release ${nextTag}`);
  };

  const handleGenerateReleaseNotes = async () => {
    setIsGenerating(true);
    try {
      const res = await gitApi.generateReleaseNotes(projectId, {
        tag_name: tagName,
        version_type: versionType,
      });
      if (res.success && res.data) {
        setReleaseTitle(res.data.title || `Release ${tagName}`);
        setReleaseNotes(res.data.notes);
        toast('Synthesized release notes with Gemini!', 'success');
      }
    } catch (err: any) {
      toast(err.message || 'Failed to generate release notes', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateRelease = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagName.trim() || isCreating) return;

    setIsCreating(true);
    try {
      const res = await gitApi.createTag(projectId, {
        tag_name: tagName.trim(),
        title: releaseTitle.trim(),
        notes: releaseNotes.trim(),
        version_type: versionType,
        update_changelog: true,
      });
      if (res.success && res.data) {
        toast(`Release tag '${tagName}' created and published!`, 'success');
        setTags([res.data.tag, ...tags]);
        setIsCreatingNew(false);
      }
    } catch (err: any) {
      toast(err.message || 'Failed to create release tag', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div
      id="release-manager-panel"
      style={{
        background: 'rgba(15, 23, 42, 0.65)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Tag size={14} color="#f59e0b" />
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Release & Tag Manager ({tags.length})
          </span>
        </div>

        <button
          id="git-new-release-toggle-btn"
          onClick={() => setIsCreatingNew(!isCreatingNew)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            background: isCreatingNew ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
            border: isCreatingNew ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 4,
            padding: '3px 8px',
            fontSize: '11px',
            color: isCreatingNew ? '#f87171' : '#fbbf24',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          {isCreatingNew ? 'Cancel' : <><Plus size={12} /> New Release</>}
        </button>
      </div>

      {/* New Release Form */}
      {isCreatingNew && (
        <form
          onSubmit={handleCreateRelease}
          style={{
            background: 'rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 6,
            padding: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {/* Version bump selectors */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Bump:</span>
            {(['patch', 'minor', 'major'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => handleBumpVersion(type)}
                style={{
                  background: versionType === type ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                  border: versionType === type ? '1px solid #f59e0b' : '1px solid transparent',
                  borderRadius: 4,
                  padding: '2px 6px',
                  fontSize: '10px',
                  fontWeight: 600,
                  color: versionType === type ? '#fbbf24' : 'var(--color-text-muted)',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                }}
              >
                {type}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <input
              id="release-tag-input"
              type="text"
              placeholder="Tag (e.g. v1.0.1)"
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
              style={{
                width: '100px',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid var(--color-border)',
                borderRadius: 4,
                padding: '4px 6px',
                fontSize: '11px',
                color: '#fbbf24',
                fontFamily: 'monospace',
                fontWeight: 600,
                outline: 'none',
              }}
            />
            <input
              id="release-title-input"
              type="text"
              placeholder="Release Title"
              value={releaseTitle}
              onChange={(e) => setReleaseTitle(e.target.value)}
              style={{
                flex: 1,
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid var(--color-border)',
                borderRadius: 4,
                padding: '4px 6px',
                fontSize: '11px',
                color: 'var(--color-text-primary)',
                outline: 'none',
              }}
            />
          </div>

          {/* AI Generate Release Notes */}
          <button
            type="button"
            id="git-ai-release-notes-btn"
            onClick={handleGenerateReleaseNotes}
            disabled={isGenerating}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(139, 92, 246, 0.2))',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              borderRadius: 4,
              padding: '4px 8px',
              fontSize: '11px',
              fontWeight: 600,
              color: '#fbbf24',
              cursor: isGenerating ? 'wait' : 'pointer',
            }}
          >
            <Sparkles size={12} />
            <span>{isGenerating ? 'Synthesizing with Gemini...' : 'AI Auto-Draft Release Notes'}</span>
          </button>

          {/* Notes textarea */}
          <textarea
            id="release-notes-input"
            rows={3}
            placeholder="Release notes & changelog highlights..."
            value={releaseNotes}
            onChange={(e) => setReleaseNotes(e.target.value)}
            style={{
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid var(--color-border)',
              borderRadius: 4,
              padding: '5px 8px',
              fontSize: '11px',
              color: 'var(--color-text-secondary)',
              fontFamily: 'monospace',
              resize: 'vertical',
              outline: 'none',
            }}
          />

          <button
            type="submit"
            id="publish-release-btn"
            disabled={isCreating || !tagName.trim()}
            style={{
              background: 'var(--color-accent)',
              border: 'none',
              borderRadius: 4,
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#fff',
              cursor: isCreating || !tagName.trim() ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            {isCreating ? <Spinner size={12} /> : <Tag size={13} />}
            <span>Publish Release Tag {tagName}</span>
          </button>
        </form>
      )}

      {/* Release List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
        {tags.map((t) => (
          <div
            key={t.id || t.tag_name}
            style={{
              background: 'rgba(0, 0, 0, 0.25)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: 6,
              padding: '8px 10px',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              fontSize: '11px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    color: '#fbbf24',
                    background: 'rgba(245, 158, 11, 0.15)',
                    padding: '2px 6px',
                    borderRadius: 4,
                  }}
                >
                  {t.tag_name}
                </span>
                <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {t.title || t.tag_name}
                </span>
              </div>

              <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
                {t.created_at ? new Date(t.created_at).toLocaleDateString() : 'recent'}
              </span>
            </div>

            {t.notes && (
              <div
                style={{
                  color: 'var(--color-text-secondary)',
                  fontSize: '10px',
                  lineHeight: 1.4,
                  maxHeight: 40,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {t.notes}
              </div>
            )}
          </div>
        ))}

        {tags.length === 0 && !isCreatingNew && (
          <div style={{ color: 'var(--color-text-muted)', fontSize: '11px', textAlign: 'center', padding: '8px' }}>
            No release tags published yet.
          </div>
        )}
      </div>
    </div>
  );
};
