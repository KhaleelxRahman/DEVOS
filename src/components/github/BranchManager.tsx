import React, { useState } from 'react';
import {
  GitBranch,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  ArrowRight,
  GitFork,
} from 'lucide-react';
import { gitApi } from '../../api';
import { useToast } from '../common/Toast';
import { Spinner } from '../common/Spinner';

interface BranchManagerProps {
  projectId: string;
  currentBranch: string;
  branches: string[];
  onBranchChanged: (newBranch: string) => void;
}

export const BranchManager: React.FC<BranchManagerProps> = ({
  projectId,
  currentBranch,
  branches,
  onBranchChanged,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [renamingBranch, setRenamingBranch] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newBranchName.trim().replace(/\s+/g, '-');
    if (!cleanName) return;

    setIsLoading(true);
    try {
      const res = await gitApi.checkout(projectId, cleanName, true);
      if (res.success) {
        toast(`Created and checked out '${cleanName}'`, 'success');
        onBranchChanged(cleanName);
        setNewBranchName('');
        setIsCreating(false);
      }
    } catch (err: any) {
      toast(err.message || 'Failed to create branch', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckoutBranch = async (branch: string) => {
    if (branch === currentBranch || isLoading) return;
    setIsLoading(true);
    try {
      const res = await gitApi.checkout(projectId, branch, false);
      if (res.success) {
        toast(`Switched to branch '${branch}'`, 'success');
        onBranchChanged(branch);
      }
    } catch (err: any) {
      toast(err.message || 'Failed to switch branch', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRenameBranch = async (oldName: string) => {
    const cleanNew = renameValue.trim().replace(/\s+/g, '-');
    if (!cleanNew || cleanNew === oldName) {
      setRenamingBranch(null);
      return;
    }
    setIsLoading(true);
    try {
      const res = await gitApi.branch(projectId, {
        action: 'rename',
        old_name: oldName,
        name: cleanNew,
      });
      if (res.success) {
        toast(`Renamed '${oldName}' to '${cleanNew}'`, 'success');
        if (currentBranch === oldName) onBranchChanged(cleanNew);
        setRenamingBranch(null);
      }
    } catch (err: any) {
      toast(err.message || 'Failed to rename branch', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteBranch = async (branch: string) => {
    if (branch === 'main' || branch === 'master') {
      toast('Cannot delete default branch', 'error');
      return;
    }
    if (branch === currentBranch) {
      toast('Switch to another branch before deleting current branch', 'error');
      return;
    }
    setIsLoading(true);
    try {
      const res = await gitApi.branch(projectId, {
        action: 'delete',
        name: branch,
      });
      if (res.success) {
        toast(`Deleted branch '${branch}'`, 'success');
        onBranchChanged(currentBranch);
      }
    } catch (err: any) {
      toast(err.message || 'Failed to delete branch', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredBranches = branches.filter((b) =>
    b.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      id="branch-manager-panel"
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
      {/* Header & New Branch Trigger */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <GitFork size={14} color="#f59e0b" />
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Branch Manager ({branches.length})
          </span>
        </div>

        <button
          id="git-new-branch-toggle-btn"
          onClick={() => setIsCreating(!isCreating)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            background: isCreating ? 'rgba(239, 68, 68, 0.15)' : 'rgba(56, 189, 248, 0.15)',
            border: isCreating ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: 4,
            padding: '3px 8px',
            fontSize: '11px',
            color: isCreating ? '#f87171' : '#38bdf8',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          {isCreating ? <X size={12} /> : <Plus size={12} />}
          <span>{isCreating ? 'Cancel' : 'New Branch'}</span>
        </button>
      </div>

      {/* Create Branch Form */}
      {isCreating && (
        <form
          onSubmit={handleCreateBranch}
          style={{
            background: 'rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            borderRadius: 6,
            padding: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#38bdf8' }}>
            Create Branch from <span style={{ fontFamily: 'monospace' }}>{currentBranch}</span>
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <input
              id="new-branch-name-input"
              type="text"
              placeholder="e.g. feature/checkout-flow or fix/nav"
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              autoFocus
              style={{
                flex: 1,
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid var(--color-border)',
                borderRadius: 4,
                padding: '5px 8px',
                fontSize: '12px',
                color: 'var(--color-text-primary)',
                fontFamily: 'monospace',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={isLoading || !newBranchName.trim()}
              style={{
                background: 'var(--color-accent)',
                border: 'none',
                borderRadius: 4,
                padding: '5px 12px',
                fontSize: '11px',
                fontWeight: 600,
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {isLoading ? <Spinner size={12} /> : <Check size={12} />}
              <span>Create</span>
            </button>
          </div>
        </form>
      )}

      {/* Filter / Search branches */}
      <input
        type="text"
        placeholder="Search branches..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        style={{
          background: 'rgba(0, 0, 0, 0.2)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 4,
          padding: '4px 8px',
          fontSize: '11px',
          color: 'var(--color-text-secondary)',
          outline: 'none',
        }}
      />

      {/* Branch List */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          maxHeight: 180,
          overflowY: 'auto',
        }}
      >
        {filteredBranches.map((branch) => {
          const isCurrent = branch === currentBranch;
          const isRenaming = renamingBranch === branch;

          return (
            <div
              key={branch}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '5px 8px',
                borderRadius: 4,
                background: isCurrent ? 'rgba(245, 158, 11, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                border: isCurrent
                  ? '1px solid rgba(245, 158, 11, 0.3)'
                  : '1px solid transparent',
                fontSize: '12px',
              }}
            >
              <div
                onClick={() => !isRenaming && handleCheckoutBranch(branch)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: isCurrent ? 'default' : 'pointer',
                  flex: 1,
                  overflow: 'hidden',
                }}
              >
                <GitBranch size={13} color={isCurrent ? '#f59e0b' : 'var(--color-text-muted)'} />
                {isRenaming ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
                    <input
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleRenameBranch(branch)}
                      autoFocus
                      style={{
                        background: 'rgba(0,0,0,0.5)',
                        border: '1px solid var(--color-accent)',
                        borderRadius: 3,
                        padding: '2px 6px',
                        fontSize: '11px',
                        color: '#fff',
                        fontFamily: 'monospace',
                        outline: 'none',
                        flex: 1,
                      }}
                    />
                    <button
                      onClick={() => handleRenameBranch(branch)}
                      style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer' }}
                    >
                      <Check size={13} />
                    </button>
                    <button
                      onClick={() => setRenamingBranch(null)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                    >
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontWeight: isCurrent ? 600 : 400,
                      color: isCurrent ? '#fbbf24' : 'var(--color-text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {branch}
                  </span>
                )}
              </div>

              {!isRenaming && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {isCurrent ? (
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 600,
                        color: '#f59e0b',
                        background: 'rgba(245, 158, 11, 0.15)',
                        padding: '1px 5px',
                        borderRadius: 4,
                      }}
                    >
                      current
                    </span>
                  ) : (
                    <>
                      <button
                        title="Checkout branch"
                        onClick={() => handleCheckoutBranch(branch)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-text-muted)',
                          cursor: 'pointer',
                          padding: '2px 4px',
                        }}
                      >
                        <ArrowRight size={12} />
                      </button>

                      <button
                        title="Rename branch"
                        onClick={() => {
                          setRenamingBranch(branch);
                          setRenameValue(branch);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-text-muted)',
                          cursor: 'pointer',
                          padding: '2px 4px',
                        }}
                      >
                        <Edit2 size={11} />
                      </button>

                      {branch !== 'main' && branch !== 'master' && (
                        <button
                          title="Delete branch"
                          onClick={() => handleDeleteBranch(branch)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--color-text-muted)',
                            cursor: 'pointer',
                            padding: '2px 4px',
                          }}
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
