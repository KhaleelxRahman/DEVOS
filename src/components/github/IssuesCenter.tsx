import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Plus,
  Search,
  ExternalLink,
  Tag,
  User,
  X,
  MessageSquare,
  RefreshCw,
} from 'lucide-react';
import { githubApi } from '../../api';
import { useToast } from '../common/Toast';
import { Spinner } from '../common/Spinner';

interface IssuesCenterProps {
  projectId: string;
}

export const IssuesCenter: React.FC<IssuesCenterProps> = () => {
  const [issues, setIssues] = useState<any[]>([]);
  const [filter, setFilter] = useState<'open' | 'closed' | 'all'>('open');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const { toast } = useToast();

  const loadIssues = async () => {
    setIsLoading(true);
    try {
      const res = await githubApi.getIssues();
      if (res.success && res.data?.issues) {
        setIssues(res.data.issues);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadIssues();
  }, []);

  const handleCreateIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsLoading(true);
    try {
      const res = await githubApi.createIssue({
        title: newTitle.trim(),
        body: newBody.trim(),
      });
      if (res.success && res.data) {
        toast(`Filed issue #${res.data.issue.number}`, 'success');
        setNewTitle('');
        setNewBody('');
        setIsCreating(false);
        loadIssues();
      }
    } catch {
      toast('Failed to create issue', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseIssue = async (id: number, number: number) => {
    try {
      const res = await githubApi.closeIssue(id);
      if (res.success) {
        toast(`Closed issue #${number}`, 'success');
        loadIssues();
      }
    } catch {
      toast('Failed to close issue', 'error');
    }
  };

  const filteredIssues = issues.filter((i) => {
    if (filter === 'open' && i.state !== 'open') return false;
    if (filter === 'closed' && i.state !== 'closed') return false;
    if (searchQuery) {
      return (
        i.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.body.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return true;
  });

  return (
    <div
      id="issues-center-panel"
      style={{
        background: 'rgba(15, 23, 42, 0.65)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: '14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <AlertCircle size={15} color="#f59e0b" />
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            GitHub Issues Center ({issues.length})
          </span>
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => setIsCreating(!isCreating)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              background: isCreating ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              border: isCreating ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: 4,
              padding: '3px 8px',
              fontSize: '11px',
              color: isCreating ? '#f87171' : '#34d399',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            {isCreating ? <X size={12} /> : <Plus size={12} />}
            <span>{isCreating ? 'Cancel' : 'New Issue'}</span>
          </button>

          <button
            onClick={loadIssues}
            style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', padding: 0 }}
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* New Issue Form */}
      {isCreating && (
        <form
          onSubmit={handleCreateIssue}
          style={{
            background: 'rgba(2, 6, 23, 0.8)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 8,
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#34d399' }}>Create GitHub Issue</div>
          <input
            type="text"
            placeholder="Issue title..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            required
            style={{
              background: 'rgba(15, 23, 42, 0.9)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: 4,
              padding: '6px 10px',
              fontSize: '12px',
              color: '#fff',
              outline: 'none',
            }}
          />
          <textarea
            placeholder="Detailed description or reproduction steps..."
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            rows={2}
            style={{
              background: 'rgba(15, 23, 42, 0.9)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: 4,
              padding: '6px 10px',
              fontSize: '11px',
              color: '#f8fafc',
              outline: 'none',
              resize: 'none',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              disabled={isLoading || !newTitle.trim()}
              style={{
                background: 'linear-gradient(135deg, #10b981, #059669)',
                border: 'none',
                borderRadius: 4,
                padding: '5px 12px',
                fontSize: '11px',
                fontWeight: 700,
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              Submit Issue
            </button>
          </div>
        </form>
      )}

      {/* Filter Tabs & Search */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 4, background: 'rgba(0,0,0,0.3)', padding: 2, borderRadius: 6 }}>
          {(['open', 'closed', 'all'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              style={{
                background: filter === st ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                border: 'none',
                borderRadius: 4,
                padding: '3px 8px',
                fontSize: '10px',
                fontWeight: filter === st ? 700 : 400,
                color: filter === st ? '#38bdf8' : '#94a3b8',
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {st}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, position: 'relative' }}>
          <input
            type="text"
            placeholder="Search issues..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              background: 'rgba(0, 0, 0, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 4,
              padding: '4px 8px',
              fontSize: '11px',
              color: '#fff',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Issue Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 260, overflowY: 'auto' }}>
        {filteredIssues.map((issue) => (
          <div
            key={issue.id}
            style={{
              padding: '10px 12px',
              borderRadius: 8,
              background: 'rgba(2, 6, 23, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {issue.state === 'open' ? (
                  <AlertCircle size={14} color="#34d399" />
                ) : (
                  <CheckCircle2 size={14} color="#a855f7" />
                )}
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#f8fafc' }}>
                  #{issue.number} {issue.title}
                </span>
              </div>

              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {issue.state === 'open' && (
                  <button
                    onClick={() => handleCloseIssue(issue.id, issue.number)}
                    style={{
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: 4,
                      padding: '2px 6px',
                      fontSize: '10px',
                      color: '#f87171',
                      cursor: 'pointer',
                    }}
                  >
                    Close Issue
                  </button>
                )}

                <a
                  href={issue.html_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: '#94a3b8' }}
                  title="Open on GitHub"
                >
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>

            <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>{issue.body}</p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {issue.labels?.map((lbl: any) => (
                  <span
                    key={lbl.name}
                    style={{
                      fontSize: '9px',
                      padding: '1px 5px',
                      borderRadius: 4,
                      background: 'rgba(255,255,255,0.08)',
                      color: '#38bdf8',
                      border: '1px solid rgba(56, 189, 248, 0.2)',
                    }}
                  >
                    {lbl.name}
                  </span>
                ))}
              </div>

              <div style={{ fontSize: '10px', color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                <User size={10} /> {issue.author}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
