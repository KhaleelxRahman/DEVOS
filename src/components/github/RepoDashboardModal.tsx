import React, { useState, useEffect } from 'react';
import {
  Github,
  Star,
  GitFork,
  Search,
  Lock,
  Globe,
  Plus,
  ExternalLink,
  Folder,
  RefreshCw,
  X,
} from 'lucide-react';
import { githubApi } from '../../api';
import { useToast } from '../common/Toast';
import { Spinner } from '../common/Spinner';

interface RepoDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRepo: (repo: any) => void;
  onCreateNewRepo: () => void;
}

export const RepoDashboardModal: React.FC<RepoDashboardModalProps> = ({
  isOpen,
  onClose,
  onSelectRepo,
  onCreateNewRepo,
}) => {
  const [repos, setRepos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'public' | 'private'>('all');
  const { toast } = useToast();

  const loadRepos = async () => {
    setIsLoading(true);
    try {
      const res = await githubApi.getRepos();
      if (res.success && res.data?.repositories) {
        setRepos(res.data.repositories);
      }
    } catch {
      // fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadRepos();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredRepos = repos.filter((r) => {
    if (typeFilter === 'public' && r.private) return false;
    if (typeFilter === 'private' && !r.private) return false;
    if (searchQuery) {
      return (
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.description && r.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    return true;
  });

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
        padding: '20px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 680,
          maxHeight: '85vh',
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          borderRadius: 12,
          padding: '20px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}
            >
              <Github size={20} />
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>
                GitHub Live Repositories
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                Select a repository to mount in DEVOS Cloud Workspace
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={onCreateNewRepo}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                background: 'linear-gradient(135deg, #10b981, #059669)',
                border: 'none',
                color: '#fff',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Plus size={12} /> New Repository
            </button>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              type="text"
              placeholder="Search repositories by name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(2, 6, 23, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: 6,
                padding: '7px 12px',
                fontSize: '12px',
                color: '#fff',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 4, background: 'rgba(0,0,0,0.3)', padding: 3, borderRadius: 6 }}>
            {(['all', 'public', 'private'] as const).map((tp) => (
              <button
                key={tp}
                onClick={() => setTypeFilter(tp)}
                style={{
                  background: typeFilter === tp ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                  border: 'none',
                  borderRadius: 4,
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: typeFilter === tp ? 700 : 400,
                  color: typeFilter === tp ? '#38bdf8' : '#94a3b8',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {tp}
              </button>
            ))}
          </div>

          <button
            onClick={loadRepos}
            style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer' }}
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Repositories Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 10,
            maxHeight: 380,
            overflowY: 'auto',
          }}
        >
          {filteredRepos.map((repo) => (
            <div
              key={repo.id}
              style={{
                padding: '12px',
                borderRadius: 8,
                background: 'rgba(2, 6, 23, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 10,
                transition: 'border 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                    <Folder size={14} color="#38bdf8" />
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: '#f8fafc',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {repo.name}
                    </span>
                  </div>

                  <span
                    style={{
                      fontSize: '9px',
                      padding: '1px 6px',
                      borderRadius: 4,
                      background: repo.private ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                      color: repo.private ? '#fbbf24' : '#34d399',
                      border: repo.private ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 3,
                    }}
                  >
                    {repo.private ? <Lock size={9} /> : <Globe size={9} />}
                    {repo.private ? 'Private' : 'Public'}
                  </span>
                </div>

                <p
                  style={{
                    fontSize: '11px',
                    color: '#94a3b8',
                    margin: 0,
                    lineHeight: '1.4',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {repo.description || 'No description provided.'}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', gap: 10, fontSize: '10px', color: '#64748b' }}>
                  <span style={{ color: '#38bdf8', fontWeight: 600 }}>{repo.language || 'TypeScript'}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Star size={10} color="#eab308" /> {repo.stars || 0}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <GitFork size={10} color="#94a3b8" /> {repo.forks || 0}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <a
                    href={repo.html_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: '#94a3b8', padding: '2px 4px' }}
                    title="View on GitHub"
                  >
                    <ExternalLink size={12} />
                  </a>

                  <button
                    onClick={() => {
                      onSelectRepo(repo);
                      toast(`Mounted repository '${repo.name}' into DEVOS Workspace`, 'success');
                      onClose();
                    }}
                    style={{
                      padding: '4px 8px',
                      borderRadius: 4,
                      background: 'rgba(56, 189, 248, 0.15)',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      color: '#38bdf8',
                      fontSize: '10px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Open Workspace
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
