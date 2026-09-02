import React, { useState, useEffect } from 'react';
import {
  GitPullRequest,
  Sparkles,
  ArrowRight,
  Plus,
} from 'lucide-react';
import { gitApi } from '../../api';
import { useToast } from '../common/Toast';
import { Spinner } from '../common/Spinner';
import { PullRequestResult } from '../../types/git';

interface PullRequestWizardProps {
  projectId: string;
  currentBranch: string;
  branches: string[];
}

export const PullRequestWizard: React.FC<PullRequestWizardProps> = ({
  projectId,
  currentBranch,
  branches,
}) => {
  const [headBranch, setHeadBranch] = useState(currentBranch || 'feature/devos');
  const [baseBranch, setBaseBranch] = useState('main');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [testingNotes, setTestingNotes] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [prList, setPrList] = useState<PullRequestResult[]>([]);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const { toast } = useToast();

  const fetchPRs = async () => {
    try {
      const res = await gitApi.getPRs(projectId);
      if (res.success && res.data?.pull_requests) {
        setPrList(res.data.pull_requests);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    setHeadBranch(currentBranch);
    fetchPRs();
  }, [currentBranch, projectId]);

  const handleGenerateWithAI = async () => {
    setIsGenerating(true);
    try {
      const res = await gitApi.generatePR(projectId, {
        head_branch: headBranch,
        base_branch: baseBranch,
      });
      if (res.success && res.data) {
        setTitle(res.data.title);
        setSummary(res.data.summary);
        setTestingNotes(res.data.testing_notes);
        toast('PR description & testing notes synthesized!', 'success');
      }
    } catch (err: any) {
      toast(err.message || 'Failed to generate PR details', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmitPR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await gitApi.createPR(projectId, {
        title: title.trim(),
        head_branch: headBranch,
        base_branch: baseBranch,
        description: `${summary}\n\n### Testing Notes\n${testingNotes}`,
        summary,
        testing_notes: testingNotes,
      });
      if (res.success && res.data) {
        toast(`Pull Request #${res.data.number} created!`, 'success');
        setPrList([res.data, ...prList]);
        setIsCreatingNew(false);
        setTitle('');
        setSummary('');
        setTestingNotes('');
      }
    } catch (err: any) {
      toast(err.message || 'Failed to create PR', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="pull-request-center-panel"
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
          <GitPullRequest size={14} color="#10b981" />
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Pull Request Center ({prList.length})
          </span>
        </div>

        <button
          id="git-open-pr-toggle-btn"
          onClick={() => setIsCreatingNew(!isCreatingNew)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            background: isCreatingNew ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
            border: isCreatingNew ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 4,
            padding: '3px 8px',
            fontSize: '11px',
            color: isCreatingNew ? '#f87171' : '#34d399',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          {isCreatingNew ? 'Cancel' : <><Plus size={12} /> New PR</>}
        </button>
      </div>

      {/* Create PR Form */}
      {isCreatingNew && (
        <form
          onSubmit={handleSubmitPR}
          style={{
            background: 'rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 6,
            padding: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {/* Branch Target Flow */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '11px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-text-muted)' }}>
              <span>base:</span>
              <select
                value={baseBranch}
                onChange={(e) => setBaseBranch(e.target.value)}
                style={{
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 4,
                  padding: '2px 6px',
                  color: 'var(--color-text-primary)',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                }}
              >
                {branches.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <ArrowRight size={12} color="var(--color-text-muted)" />

            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-text-muted)' }}>
              <span>compare:</span>
              <select
                value={headBranch}
                onChange={(e) => setHeadBranch(e.target.value)}
                style={{
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 4,
                  padding: '2px 6px',
                  color: '#34d399',
                  fontSize: '11px',
                  fontWeight: 600,
                  fontFamily: 'monospace',
                }}
              >
                {branches.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* AI Auto-fill Button */}
          <button
            type="button"
            id="git-ai-pr-gen-btn"
            onClick={handleGenerateWithAI}
            disabled={isGenerating}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(56, 189, 248, 0.2))',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              borderRadius: 4,
              padding: '4px 8px',
              fontSize: '11px',
              fontWeight: 600,
              color: '#34d399',
              cursor: isGenerating ? 'wait' : 'pointer',
            }}
          >
            <Sparkles size={12} />
            <span>{isGenerating ? 'Synthesizing PR with Gemini...' : 'AI Auto-Fill PR Details'}</span>
          </button>

          {/* Title */}
          <input
            id="pr-title-input"
            type="text"
            placeholder="Pull Request Title (e.g. feat(auth): complete GitHub Pro workflow)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid var(--color-border)',
              borderRadius: 4,
              padding: '5px 8px',
              fontSize: '12px',
              color: 'var(--color-text-primary)',
              outline: 'none',
            }}
          />

          {/* Summary */}
          <textarea
            id="pr-summary-input"
            rows={2}
            placeholder="Summary of architectural enhancements..."
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            style={{
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid var(--color-border)',
              borderRadius: 4,
              padding: '5px 8px',
              fontSize: '11px',
              color: 'var(--color-text-secondary)',
              resize: 'vertical',
              outline: 'none',
            }}
          />

          {/* Testing Notes */}
          <textarea
            id="pr-testing-notes-input"
            rows={2}
            placeholder="Testing notes & verification checklist..."
            value={testingNotes}
            onChange={(e) => setTestingNotes(e.target.value)}
            style={{
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid var(--color-border)',
              borderRadius: 4,
              padding: '5px 8px',
              fontSize: '11px',
              color: 'var(--color-text-secondary)',
              resize: 'vertical',
              outline: 'none',
            }}
          />

          <button
            type="submit"
            id="pr-submit-create-btn"
            disabled={isSubmitting || !title.trim()}
            style={{
              background: 'var(--color-accent)',
              border: 'none',
              borderRadius: 4,
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#fff',
              cursor: isSubmitting || !title.trim() ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            {isSubmitting ? <Spinner size={12} /> : <GitPullRequest size={13} />}
            <span>Create Pull Request</span>
          </button>
        </form>
      )}

      {/* Existing PRs list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
        {prList.map((pr) => (
          <div
            key={pr.id || pr.number}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                <span style={{ color: '#10b981', fontWeight: 700 }}>#{pr.number}</span>
                <span style={{ fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {pr.title}
                </span>
              </div>

              <span
                style={{
                  fontSize: '9px',
                  fontWeight: 600,
                  color: pr.state === 'open' ? '#34d399' : '#818cf8',
                  background: pr.state === 'open' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                  padding: '1px 5px',
                  borderRadius: 3,
                  textTransform: 'uppercase',
                }}
              >
                {pr.state}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text-muted)', fontSize: '10px' }}>
              <span style={{ fontFamily: 'monospace' }}>{pr.head_branch} → {pr.base_branch}</span>
              <span>•</span>
              <span>by {pr.author}</span>
            </div>

            {pr.description && (
              <div style={{ color: 'var(--color-text-secondary)', fontSize: '10px', maxHeight: 36, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {pr.description}
              </div>
            )}
          </div>
        ))}

        {prList.length === 0 && !isCreatingNew && (
          <div style={{ color: 'var(--color-text-muted)', fontSize: '11px', textAlign: 'center', padding: '8px' }}>
            No open pull requests. Click "New PR" to create one.
          </div>
        )}
      </div>
    </div>
  );
};
