import React, { useState } from 'react';
import { Sparkles, FileText, UploadCloud, Check, Edit3, Eye, RefreshCw } from 'lucide-react';
import { githubApi } from '../../api';
import { useToast } from '../common/Toast';
import { Spinner } from '../common/Spinner';

interface AIReadmeGeneratorProps {
  projectId: string;
}

export const AIReadmeGenerator: React.FC<AIReadmeGeneratorProps> = ({ projectId }) => {
  const [markdown, setMarkdown] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [mode, setMode] = useState<'preview' | 'edit'>('preview');
  const [customTitle, setCustomTitle] = useState('');
  const { toast } = useToast();

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await githubApi.generateReadme(projectId, customTitle.trim());
      if (res.success && res.data?.content) {
        setMarkdown(res.data.content);
        toast('AI generated production README.md for current repository!', 'success');
      }
    } catch {
      toast('Failed to generate README with AI', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePushToGithub = async () => {
    if (!markdown) return;
    setIsPushing(true);
    try {
      const res = await githubApi.runGitOp(projectId, 'commit', 'docs: update AI-generated README.md');
      if (res.success) {
        await githubApi.runGitOp(projectId, 'push');
        toast('Pushed updated README.md to GitHub repository!', 'success');
      }
    } catch {
      toast('Failed to push README to GitHub', 'error');
    } finally {
      setIsPushing(false);
    }
  };

  return (
    <div
      id="ai-readme-generator-panel"
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
          <Sparkles size={16} color="#c084fc" />
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            AI Intelligence README Generator
          </span>
        </div>

        {markdown && (
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => setMode(mode === 'preview' ? 'edit' : 'preview')}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: 4,
                padding: '3px 8px',
                fontSize: '11px',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {mode === 'preview' ? <Edit3 size={11} /> : <Eye size={11} />}
              <span>{mode === 'preview' ? 'Edit Raw' : 'Preview'}</span>
            </button>

            <button
              onClick={handlePushToGithub}
              disabled={isPushing}
              style={{
                background: 'linear-gradient(135deg, #10b981, #059669)',
                border: 'none',
                borderRadius: 4,
                padding: '3px 10px',
                fontSize: '11px',
                fontWeight: 700,
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {isPushing ? <Spinner size={11} /> : <UploadCloud size={11} />}
              <span>Push to GitHub</span>
            </button>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          placeholder="Custom project title override (optional)..."
          value={customTitle}
          onChange={(e) => setCustomTitle(e.target.value)}
          style={{
            flex: 1,
            background: 'rgba(2, 6, 23, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 6,
            padding: '6px 10px',
            fontSize: '12px',
            color: '#fff',
            outline: 'none',
          }}
        />

        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          style={{
            background: 'linear-gradient(135deg, #9333ea, #a855f7)',
            border: 'none',
            borderRadius: 6,
            padding: '6px 14px',
            fontSize: '12px',
            fontWeight: 700,
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {isGenerating ? <Spinner size={13} /> : <Sparkles size={13} />}
          <span>{markdown ? 'Regenerate' : 'Generate README'}</span>
        </button>
      </div>

      {/* Render or Edit Area */}
      {markdown ? (
        mode === 'edit' ? (
          <textarea
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            rows={12}
            style={{
              width: '100%',
              background: 'rgba(2, 6, 23, 0.9)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: 6,
              padding: '10px',
              fontFamily: 'monospace',
              fontSize: '11px',
              color: '#f8fafc',
              outline: 'none',
              resize: 'vertical',
            }}
          />
        ) : (
          <div
            style={{
              background: 'rgba(2, 6, 23, 0.9)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: 6,
              padding: '12px',
              maxHeight: 280,
              overflowY: 'auto',
              fontFamily: 'sans-serif',
              fontSize: '12px',
              color: '#e2e8f0',
              whiteSpace: 'pre-wrap',
              lineHeight: '1.6',
            }}
          >
            {markdown}
          </div>
        )
      ) : (
        <div
          style={{
            padding: '24px',
            borderRadius: 8,
            border: '1px dashed rgba(255, 255, 255, 0.15)',
            textAlign: 'center',
            color: '#94a3b8',
            fontSize: '12px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <FileText size={24} color="#a855f7" />
          <span>Click "Generate README" to automatically analyze your repository architecture, dependencies, installation steps and folder hierarchy.</span>
        </div>
      )}
    </div>
  );
};
