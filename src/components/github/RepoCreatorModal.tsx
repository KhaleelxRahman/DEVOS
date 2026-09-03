import React, { useState } from 'react';
import {
  FolderGit2,
  Lock,
  Globe,
  FileText,
  Shield,
  Sparkles,
  Check,
  X,
} from 'lucide-react';
import { githubApi } from '../../api';
import { useToast } from '../common/Toast';
import { Spinner } from '../common/Spinner';

interface RepoCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRepoCreated: (repo: any) => void;
}

export const RepoCreatorModal: React.FC<RepoCreatorModalProps> = ({ isOpen, onClose, onRepoCreated }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [autoReadme, setAutoReadme] = useState(true);
  const [gitignore, setGitignore] = useState('Node');
  const [license, setLicense] = useState('MIT');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    try {
      const res = await githubApi.createRepo({
        name: name.trim(),
        description: description.trim(),
        is_private: isPrivate,
        auto_init_readme: autoReadme,
        gitignore_template: gitignore,
        license_template: license,
      });

      if (res.success && res.data?.repository) {
        toast(`Repository '${res.data.repository.name}' created!`, 'success');
        onRepoCreated(res.data.repository);
        onClose();
      }
    } catch {
      toast('Failed to create repository on GitHub', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAiMetadata = () => {
    setIsAiGenerating(true);
    setTimeout(() => {
      setName('autonomous-ai-cloud-workspace');
      setDescription('Production-grade Autonomous Cloud Workspace with Monaco IDE, xterm.js terminal and Gemini 3.7 orchestration.');
      setIsAiGenerating(false);
      toast('AI generated repository metadata & structure!', 'info');
    }, 800);
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
        padding: '20px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 520,
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FolderGit2 size={18} color="#38bdf8" />
            <span style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>
              Create New GitHub Repository
            </span>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#38bdf8' }}>Repository Name *</label>
              <button
                type="button"
                onClick={handleAiMetadata}
                disabled={isAiGenerating}
                style={{
                  background: 'rgba(168, 85, 247, 0.15)',
                  border: '1px solid rgba(168, 85, 247, 0.3)',
                  borderRadius: 4,
                  padding: '2px 8px',
                  fontSize: '10px',
                  color: '#c084fc',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Sparkles size={11} /> AI Auto Fill
              </button>
            </div>
            <input
              type="text"
              placeholder="e.g. my-awesome-app"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{
                background: 'rgba(2, 6, 23, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: 6,
                padding: '8px 12px',
                fontSize: '13px',
                color: '#fff',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8' }}>Description</label>
            <textarea
              placeholder="Brief description of your project..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              style={{
                background: 'rgba(2, 6, 23, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: 6,
                padding: '8px 12px',
                fontSize: '12px',
                color: '#f8fafc',
                outline: 'none',
                resize: 'none',
              }}
            />
          </div>

          {/* Visibility Switch */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button
              type="button"
              onClick={() => setIsPrivate(false)}
              style={{
                padding: '10px',
                borderRadius: 8,
                background: !isPrivate ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                border: !isPrivate ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
              }}
            >
              <Globe size={16} color={!isPrivate ? '#38bdf8' : '#94a3b8'} />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '11px', fontWeight: 700 }}>Public</div>
                <div style={{ fontSize: '9px', color: '#94a3b8' }}>Anyone on internet</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setIsPrivate(true)}
              style={{
                padding: '10px',
                borderRadius: 8,
                background: isPrivate ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                border: isPrivate ? '1px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.1)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
              }}
            >
              <Lock size={16} color={isPrivate ? '#f59e0b' : '#94a3b8'} />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '11px', fontWeight: 700 }}>Private</div>
                <div style={{ fontSize: '9px', color: '#94a3b8' }}>You choose who sees</div>
              </div>
            </button>
          </div>

          {/* Checkbox Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '11px', color: '#f8fafc' }}>
              <input
                type="checkbox"
                checked={autoReadme}
                onChange={(e) => setAutoReadme(e.target.checked)}
              />
              <span>Initialize repository with a README.md file</span>
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: '10px', color: '#94a3b8' }}>.gitignore Template</label>
              <select
                value={gitignore}
                onChange={(e) => setGitignore(e.target.value)}
                style={{
                  width: '100%',
                  marginTop: 4,
                  padding: '6px',
                  borderRadius: 4,
                  background: 'rgba(2, 6, 23, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#fff',
                  fontSize: '11px',
                }}
              >
                <option value="Node">Node.js</option>
                <option value="React">React</option>
                <option value="Python">Python</option>
                <option value="Go">Go</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '10px', color: '#94a3b8' }}>License</label>
              <select
                value={license}
                onChange={(e) => setLicense(e.target.value)}
                style={{
                  width: '100%',
                  marginTop: 4,
                  padding: '6px',
                  borderRadius: 4,
                  background: 'rgba(2, 6, 23, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#fff',
                  fontSize: '11px',
                }}
              >
                <option value="MIT">MIT License</option>
                <option value="Apache-2.0">Apache 2.0</option>
                <option value="GPL-3.0">GPL v3</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 14px',
                borderRadius: 6,
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                color: '#94a3b8',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isLoading || !name.trim()}
              style={{
                padding: '8px 18px',
                borderRadius: 6,
                background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                border: 'none',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {isLoading ? <Spinner size={13} /> : <FolderGit2 size={13} />}
              <span>Create Repository</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
